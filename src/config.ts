import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "token-holders",
  slug: "token-holders",
  description: "Token holder distribution -- top holders, concentration %, whale count. On-chain due diligence for agents.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/holders",
      price: "$0.005",
      description: "Get token holder analysis with concentration metrics",
      toolName: "token_get_holder_analysis",
      toolDescription: `Use this when you need to analyze token holder distribution and concentration risk. Returns holder metrics in JSON.

1. topHolders: array of top 10 holders with address, balance, percentage of supply
2. top10Concentration: percentage of total supply held by top 10 wallets
3. whaleCount: number of wallets holding >1% of supply
4. totalHolders: total unique holder count
5. isConcentrated: boolean flag if top 10 hold >50% supply (centralization risk)

Example output: {"topHolders":[{"address":"0xab...cd","balance":"1250000","percent":12.5}],"top10Concentration":45.2,"whaleCount":7,"totalHolders":15420,"isConcentrated":false}

Use this BEFORE buying a token to assess centralization and whale dump risk. Essential for on-chain due diligence and token research.

Do NOT use for token price data -- use token_get_ohlcv_history instead. Do NOT use for token safety -- use token_check_safety instead. Do NOT use for liquidity depth -- use dex_analyze_orderbook_depth instead.`,
      inputSchema: {
        type: "object",
        properties: {
          address: { type: "string", description: "Token contract address (0x...)" },
          chain: { type: "string", description: "Chain: base, ethereum (default: base)" },
        },
        required: ["address"],
      },
    },
  ],
};
