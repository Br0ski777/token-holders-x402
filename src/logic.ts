import type { Hono } from "hono";

const API_URLS: Record<string, string> = {
  base: "https://api.basescan.org/api",
  ethereum: "https://api.etherscan.io/api",
};

const API_KEYS: Record<string, string> = {
  base: process.env.BASESCAN_API_KEY || "",
  ethereum: process.env.ETHERSCAN_API_KEY || "",
};

interface HolderInfo {
  rank: number;
  address: string;
  balance: string;
  percentage: number;
  percentageFormatted: string;
  isWhale: boolean;
}

export function registerRoutes(app: Hono) {
  app.get("/api/holders", async (c) => {
    const address = c.req.query("address");
    const chain = (c.req.query("chain") || "base").toLowerCase();

    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return c.json({ error: "Missing or invalid token address (0x...)" }, 400);
    }

    const apiUrl = API_URLS[chain];
    if (!apiUrl) {
      return c.json({ error: `Unsupported chain: ${chain}. Supported: base, ethereum` }, 400);
    }

    const apiKey = API_KEYS[chain];

    try {
      // Fetch top token holders
      const url = `${apiUrl}?module=token&action=tokenholderlist&contractaddress=${address}&page=1&offset=50${apiKey ? `&apikey=${apiKey}` : ""}`;
      const resp = await fetch(url);

      if (!resp.ok) {
        return c.json({ error: "Failed to fetch holder data from explorer" }, 502);
      }

      const data = await resp.json() as any;

      if (data.status !== "1" || !Array.isArray(data.result)) {
        // Fallback: try token info endpoint
        return c.json({
          address,
          chain,
          error: "Token holder data not available. The explorer API may not support this token or rate limit reached.",
          suggestion: "Try again later or use a different chain parameter.",
        }, 404);
      }

      const holders = data.result as Array<{ TokenHolderAddress: string; TokenHolderQuantity: string }>;

      // Calculate total supply from top holders (approximation)
      const totalFromHolders = holders.reduce((sum, h) => sum + BigInt(h.TokenHolderQuantity), BigInt(0));

      // Build holder analysis
      const topHolders: HolderInfo[] = holders.slice(0, 10).map((h, i) => {
        const balance = BigInt(h.TokenHolderQuantity);
        const pct = totalFromHolders > BigInt(0) ? Number(balance * BigInt(10000) / totalFromHolders) / 100 : 0;
        return {
          rank: i + 1,
          address: h.TokenHolderAddress,
          balance: h.TokenHolderQuantity,
          percentage: Math.round(pct * 100) / 100,
          percentageFormatted: `${pct.toFixed(2)}%`,
          isWhale: pct > 1,
        };
      });

      // Concentration metrics
      const top10Pct = topHolders.reduce((sum, h) => sum + h.percentage, 0);
      const top5Pct = topHolders.slice(0, 5).reduce((sum, h) => sum + h.percentage, 0);
      const whaleCount = holders.filter((h) => {
        const pct = Number(BigInt(h.TokenHolderQuantity) * BigInt(10000) / totalFromHolders) / 100;
        return pct > 1;
      }).length;

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
        totalHolders: holders.length,
        topHolders,
        concentration: {
          top5Percentage: Math.round(top5Pct * 100) / 100,
          top10Percentage: Math.round(top10Pct * 100) / 100,
          top5Formatted: `${top5Pct.toFixed(2)}%`,
          top10Formatted: `${top10Pct.toFixed(2)}%`,
        },
        whaleCount,
        decentralizationScore,
        analyzedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      return c.json({ error: "Failed to analyze token holders", details: err.message }, 502);
    }
  });
}
