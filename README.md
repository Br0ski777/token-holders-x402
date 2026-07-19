# Token Holders API

[![MCP Server](https://img.shields.io/badge/MCP-server-blue)](https://token-holders.api.klymax402.com/mcp)
[![x402](https://img.shields.io/badge/payments-x402-6E56CF)](https://x402.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Token holder distribution -- top holders, concentration %, whale count. On-chain due diligence for agents. Pay-per-call via [x402](https://x402.org) (USDC on Base L2) -- no API key, no signup, no rate-limit wall.

Part of the [klymax402](https://klymax402.com) marketplace -- 100 x402 micropayment APIs for AI agents, one wallet, USDC on Base.

## Quickstart -- MCP

Add to your MCP client config (Claude Desktop, Cursor, ElizaOS, etc.):

```json
{
  "mcpServers": {
    "token-holders": {
      "url": "https://token-holders.api.klymax402.com/mcp"
    }
  }
}
```

## Quickstart -- HTTP (x402)

```bash
curl "https://token-holders.api.klymax402.com/api/holders?address=0x0000000000000000000000000000000000dEaD"
# -> 402 Payment Required, with an x402 payment challenge in the response body
```

Any x402-aware client ([`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch), [`x402-agent-tools`](https://www.npmjs.com/package/x402-agent-tools), ATXP) handles the 402 -> sign -> retry cycle automatically.

## Tools

| Tool | Method | Path | Price | Description |
|---|---|---|---|---|
| `token_get_holder_analysis` | GET | `/api/holders` | $0.012 | Get token holder analysis with concentration metrics |
| `token_get_holder_analysis` | POST | `/api/holders` | $0.012 | Get token holder analysis with concentration metrics (POST variant) |

### `token_get_holder_analysis`

Use this when you need to analyze token holder distribution and concentration risk. Returns holder metrics in JSON.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `address` | string | yes | Token contract address (0x...) |
| `chain` | string | no | Chain: base, ethereum (default: ethereum) |

**Returns**

- `topHolders` -- array of top 10 holders with address, balance, percentage of supply
- `top10Concentration` -- percentage of total supply held by top 10 wallets
- `whaleCount` -- number of wallets holding >1% of supply
- `totalHolders` -- total unique holder count
- `isConcentrated` -- boolean flag if top 10 hold >50% supply (centralization risk)

Example response:

```json
{"topHolders":[{"address":"0xab...cd","balance":"1250000","percent":12.5}],"top10Concentration":45.2,"whaleCount":7,"totalHolders":15420,"isConcentrated":false}
```

**When to use**: buying a token to assess centralization and whale dump risk. Essential for on-chain due diligence and token research.

**Not for**: token price data (use `token_get_ohlcv_history`), token safety (use `token_check_safety`), liquidity depth (use `dex_analyze_orderbook_depth`).

### `token_get_holder_analysis`

Use this when you need to analyze token holder distribution and concentration risk. Returns holder metrics in JSON. POST variant of token_get_holder_analysis -- same params passed as JSON body instead of query string.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `address` | string | yes | Token contract address (0x...) |
| `chain` | string | no | Chain: base, ethereum (default: ethereum) |

**Returns**

- `topHolders` -- array of top 10 holders with address, balance, percentage of supply
- `top10Concentration` -- percentage of total supply held by top 10 wallets
- `whaleCount` -- number of wallets holding >1% of supply
- `totalHolders` -- total unique holder count
- `isConcentrated` -- boolean flag if top 10 hold >50% supply (centralization risk)

Example response:

```json
{"topHolders":[{"address":"0xab...cd","balance":"1250000","percent":12.5}],"top10Concentration":45.2,"whaleCount":7,"totalHolders":15420,"isConcentrated":false}
```

**When to use**: buying a token to assess centralization and whale dump risk. Essential for on-chain due diligence and token research.

**Not for**: token price data (use `token_get_ohlcv_history`), token safety (use `token_check_safety`), liquidity depth (use `dex_analyze_orderbook_depth`).

## Example agent prompts

- "Analyze token holder distribution and concentration risk"
- "Analyze token holder distribution and concentration risk"

## Payment

- Protocol: [x402](https://x402.org) -- HTTP-native pay-per-call, no signup, no API key
- Network: Base L2 (`eip155:8453`)
- Asset: USDC
- Facilitator: Coinbase CDP (primary), PayAI (fallback)

## Part of klymax402

100 x402 micropayment APIs for AI agents -- one wallet, USDC on Base, zero signup.

- Catalog: https://klymax402.com/llms.txt
- Full API reference: https://klymax402.com/llms-full.txt
- Live stats: https://klymax402.com/stats

## License

MIT
