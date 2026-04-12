import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "token-holders",
  slug: "token-holders",
  description: "Token holder analysis — top holders, concentration metrics, whale detection.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/holders",
      price: "$0.005",
      description: "Get token holder analysis with concentration metrics",
      toolName: "token_get_holder_analysis",
      toolDescription: "Use this when you need to analyze token holder distribution. Returns top 10 holders with percentages, concentration metrics (top 10 hold X%), whale count (holders with >1% supply), and total holder count. Supports Base and Ethereum via Etherscan/Basescan. Do NOT use for token price data — use token_get_ohlcv. Do NOT use for token safety — use token_check_safety. Do NOT use for liquidity depth — use dex_analyze_orderbook_depth.",
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
