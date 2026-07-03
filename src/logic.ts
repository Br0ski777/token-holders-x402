import type { Hono } from "hono";


// ATXP: requirePayment only fires inside an ATXP context (set by atxpHono middleware).
// For raw x402 requests, the existing @x402/hono middleware handles the gate.
// If neither protocol is active (ATXP_CONNECTION unset), tryRequirePayment is a no-op.
async function tryRequirePayment(price: number): Promise<void> {
  if (!process.env.ATXP_CONNECTION) return;
  try {
    const { requirePayment } = await import("@atxp/server");
    const BigNumber = (await import("bignumber.js")).default;
    await requirePayment({ price: BigNumber(price) });
  } catch (e: any) {
    if (e?.code === -30402) throw e;
  }
}

// Migrated to Moralis 2026-07-04: Etherscan's V2 API locks tokenholderlist
// behind API Pro ($399/mo), on EVERY chain (not just Base -- confirmed via a
// direct call on Ethereum too: "trying to access an API Pro endpoint").
// Moralis's Token Owners + Token Holder Stats endpoints cover both chains on
// the free tier (40K CU/month) with real totalHolders counts and precomputed
// concentration percentages -- richer than the original Reservoir-era design.
const CHAIN_IDS: Record<string, string> = {
  ethereum: "eth",
  base: "base",
};

function getMoralisKey(): string {
  const key = process.env.MORALIS_API_KEY;
  if (!key) throw new Error("MORALIS_API_KEY not configured");
  return key;
}

interface HolderInfo {
  rank: number;
  address: string;
  balance: string;
  percentage: number;
  percentageFormatted: string;
  isWhale: boolean;
}

export function registerRoutes(app: Hono) {
  async function handleHolders(c: any, params: { address?: string; chain?: string }) {
    await tryRequirePayment(0.005);
    const address = params.address;
    const chain = (params.chain || "ethereum").toLowerCase();

    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return c.json({ error: "Missing or invalid token address (0x...)" }, 400);
    }

    const moralisChain = CHAIN_IDS[chain];
    if (!moralisChain) {
      return c.json({ error: `Unsupported chain: ${chain}. Supported: ethereum, base` }, 400);
    }

    try {
      const key = getMoralisKey();
      const headers = { "X-API-Key": key, accept: "application/json" };
      const [ownersResp, statsResp] = await Promise.all([
        fetch(`https://deep-index.moralis.io/api/v2.2/erc20/${address}/owners?chain=${moralisChain}&order=DESC&limit=10`, { headers }),
        fetch(`https://deep-index.moralis.io/api/v2.2/erc20/${address}/holders?chain=${moralisChain}`, { headers }),
      ]);

      if (!ownersResp.ok) {
        return c.json({
          address,
          chain,
          error: "Token holder data not available. Moralis may not support this token or rate limit reached.",
          suggestion: "Verify the contract address, or try again later.",
        }, 404);
      }

      const ownersData = await ownersResp.json() as {
        totalSupply: string;
        result: Array<{ owner_address: string; balance_formatted: string; percentage_relative_to_total_supply: number; is_contract: boolean }>;
      };
      const statsData = statsResp.ok ? await statsResp.json() as any : null;

      const topHolders: HolderInfo[] = ownersData.result.map((h, i) => ({
        rank: i + 1,
        address: h.owner_address,
        balance: h.balance_formatted,
        percentage: Math.round(h.percentage_relative_to_total_supply * 100) / 100,
        percentageFormatted: `${h.percentage_relative_to_total_supply.toFixed(2)}%`,
        isWhale: h.percentage_relative_to_total_supply > 1,
      }));

      const top5Pct = topHolders.slice(0, 5).reduce((sum, h) => sum + h.percentage, 0);
      const top10Pct = statsData?.holderSupply?.top10?.supplyPercent ?? topHolders.reduce((sum, h) => sum + h.percentage, 0);
      const whaleCount = topHolders.filter((h) => h.isWhale).length;

      // Decentralization score (0-100, 100 = most decentralized)
      let decentralizationScore: number;
      if (top10Pct > 90) decentralizationScore = 10;
      else if (top10Pct > 70) decentralizationScore = 30;
      else if (top10Pct > 50) decentralizationScore = 50;
      else if (top10Pct > 30) decentralizationScore = 70;
      else decentralizationScore = 90;

      return c.json({
        address,
        chain,
        totalHolders: statsData?.totalHolders ?? null,
        totalSupply: ownersData.totalSupply,
        topHolders,
        concentration: {
          top5Percentage: Math.round(top5Pct * 100) / 100,
          top10Percentage: top10Pct,
          top5Formatted: `${top5Pct.toFixed(2)}%`,
          top10Formatted: `${top10Pct.toFixed(2)}%`,
        },
        whaleCount,
        holderDistribution: statsData?.holderDistribution ?? null,
        holderChange24h: statsData?.holderChange?.["24h"] ?? null,
        decentralizationScore,
        source: "moralis",
        analyzedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      return c.json({ error: "Failed to analyze token holders", details: err.message }, 502);
    }
  }

  app.get("/api/holders", async (c) => {
    return handleHolders(c, {
      address: c.req.query("address"),
      chain: c.req.query("chain"),
    });
  });

  // POST mirror of the GET route above -- Bazaar (CDP) only reliably indexes
  // POST payments with valid payloads (~82% conversion vs ~14% for GET-only
  // resources, confirmed empirically). Same params, same logic, just body
  // instead of query string.
  app.post("/api/holders", async (c) => {
    const body = await c.req.json().catch(() => ({}) as any);
    return handleHolders(c, {
      address: body.address,
      chain: body.chain,
    });
  });
}
