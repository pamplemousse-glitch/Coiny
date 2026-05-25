# Source: https://developers.zerion.io/llms.txt

# Zerion API

> Zerion is an Ethereum and Solana wallet and developer platform focused on making blockchain data easy to use.

## Docs

- [Get chain by ID](https://developers.zerion.io/api-reference/chains/get-chain-by-id.md): This endpoint returns chain by unique chain identifier.
- [Get list of all chains](https://developers.zerion.io/api-reference/chains/get-list-of-all-chains.md): This endpoint returns list of all chains supported by Zerion.
- [Get DApp by ID](https://developers.zerion.io/api-reference/dapps/get-dapp-by-id.md): This endpoint returns single DApp by its unique identifier.
- [Get list of DApps](https://developers.zerion.io/api-reference/dapps/get-list-of-dapps.md): This endpoint returns list of DApps by using different parameters.
- [Get a chart for a fungible asset](https://developers.zerion.io/api-reference/fungibles/get-a-chart-for-a-fungible-asset.md): This endpoint returns the chart for the fungible asset for a selected period
- [Get a chart for a fungible asset by implementation](https://developers.zerion.io/api-reference/fungibles/get-a-chart-for-a-fungible-asset-by-implementation.md): This endpoint returns the chart for a fungible asset for a selected period, identified by its implementation. The implementation is a chain:address pair (e.g., "ethereum:0xa5a4214bb5f00c86b7969b7dc007302e4f6f05d6").
- [Get fungible asset by ID](https://developers.zerion.io/api-reference/fungibles/get-fungible-asset-by-id.md): This endpoint returns a fungible asset by unique identifier
- [Get fungible asset by implementation](https://developers.zerion.io/api-reference/fungibles/get-fungible-asset-by-implementation.md): This endpoint returns a fungible asset by its implementation. The implementation is a `chain` (for base asset) or `chain:address` pair (e.g., "ethereum", ethereum:0xa5a4214bb5f00c86b7969b7dc007302e4f6f05d6").
- [Get list of fungible assets](https://developers.zerion.io/api-reference/fungibles/get-list-of-fungible-assets.md): This endpoint returns a paginated list of fungible assets supported by Zerion. It also provides the ability to search for fungibles. If no fungible assets are found for given filters, the empty list with 200 status is returned.
- [Get list of all available gas prices](https://developers.zerion.io/api-reference/gas/get-list-of-all-available-gas-prices.md): This endpoint provides real-time information on the current gas prices across all supported blockchain networks. Gas prices play a crucial role in the speed and cost of executing transactions on a blockchain, and fluctuate frequently based on network demand and usage. By using this endpoint, develop…
- [Get list of NFTs](https://developers.zerion.io/api-reference/nfts/get-list-of-nfts.md): This endpoint returns list of NFTs by using different parameters.
- [Get single NFT by ID](https://developers.zerion.io/api-reference/nfts/get-single-nft-by-id.md): This endpoint returns single NFT by its unique identifier.
- [Count wallets within subscription](https://developers.zerion.io/api-reference/subscriptions-to-transactions/count-wallets-within-subscription.md): This endpoint returns the count of wallets within a specific subscription by subscription ID.
- [Create subscription](https://developers.zerion.io/api-reference/subscriptions-to-transactions/create-subscription.md): This endpoint subscribes to new transactions associated with the wallets.
- [Delete subscription by ID](https://developers.zerion.io/api-reference/subscriptions-to-transactions/delete-subscription-by-id.md): This endpoint deletes existing subscription
- [Disable a specific subscription](https://developers.zerion.io/api-reference/subscriptions-to-transactions/disable-a-specific-subscription.md): This endpoint sets the status of a specific subscription to "disabled".
- [Enable a specific subscription](https://developers.zerion.io/api-reference/subscriptions-to-transactions/enable-a-specific-subscription.md): This endpoint sets the status of a specific subscription to "enabled".
- [Find subscription by ID](https://developers.zerion.io/api-reference/subscriptions-to-transactions/find-subscription-by-id.md): This endpoint by ID returns subscription to new transactions associated with the wallets and chains.
- [Find subscriptions](https://developers.zerion.io/api-reference/subscriptions-to-transactions/find-subscriptions.md): This endpoint finds subscriptions to new transactions associated with the wallets and chains. Currently response is limited to 1000 subscriptions in the response.
- [Find wallets within subscription](https://developers.zerion.io/api-reference/subscriptions-to-transactions/find-wallets-within-subscription.md): This endpoint by ID returns wallets within specific subscription.
- [Patch wallets within subscription](https://developers.zerion.io/api-reference/subscriptions-to-transactions/patch-wallets-within-subscription.md): This endpoint works by subscription ID. It patches wallets list within specific subscription.
- [Replace wallets within subscription](https://developers.zerion.io/api-reference/subscriptions-to-transactions/replace-wallets-within-subscription.md): This endpoint works by subscription ID. It replaces wallets list within specific subscription.
- [Update callback URL within subscription](https://developers.zerion.io/api-reference/subscriptions-to-transactions/update-callback-url-within-subscription.md): This endpoint updates the callback URL for a specific subscription.
- [Update chain IDs within subscription](https://developers.zerion.io/api-reference/subscriptions-to-transactions/update-chain-ids-within-subscription.md): This endpoint updates the list of chain IDs associated with a specific subscription.
- [Get swap and bridge quotes](https://developers.zerion.io/api-reference/swap/get-swap-and-bridge-quotes.md): Returns quotes from multiple liquidity sources for a same-chain swap or a cross-chain bridge between two fungible assets. Supports EVM chains and Solana, including EVM ↔ Solana bridges.
- [List fungibles available for bridging](https://developers.zerion.io/api-reference/swap/list-fungibles-available-for-bridging.md): Returns the list of tokens available for bridging between two chains. Use this to populate a token picker UI. Only relevant for cross-chain swaps, same-chain swaps don't require this step.
- [Get wallet set balance chart](https://developers.zerion.io/api-reference/wallet-sets/get-wallet-set-balance-chart.md): This endpoint returns a portfolio balance chart for a wallet set. A wallet set is represented by an EVM address, a Solana address, or both. At least one address must be provided. This is over a specified time period, based on the provided start and end timestamps. Results can be filtered by blockcha…
- [Get wallet set fungible positions](https://developers.zerion.io/api-reference/wallet-sets/get-wallet-set-fungible-positions.md): This endpoint returns a list of wallet set positions. A wallet set is represented by an EVM address, a Solana address, or both. At least one address must be provided.
- [Get wallet set PnL](https://developers.zerion.io/api-reference/wallet-sets/get-wallet-set-pnl.md): This endpoint returns the Profit and Loss (PnL) details of a wallet set. A wallet set is represented by an EVM address, a Solana address, or both. At least one address must be provided. This includes Unrealized PnL, Realized PnL, Net Invested amounts and filters for asset categories like Non Fungibl…
- [Get wallet set portfolio](https://developers.zerion.io/api-reference/wallet-sets/get-wallet-set-portfolio.md): This endpoint returns a wallet set's portfolio overview. A wallet set is represented by an EVM address, a Solana address, or both. At least one address must be provided.
- [Get wallet set transactions](https://developers.zerion.io/api-reference/wallet-sets/get-wallet-set-transactions.md): This endpoint returns a list of transactions associated with the wallet set. A wallet set is represented by an EVM address, a Solana address, or both. At least one address must be provided.
- [Get wallet balance chart](https://developers.zerion.io/api-reference/wallets/get-wallet-balance-chart.md): This endpoint returns a portfolio balance chart for a wallet. This is over a specified time period, based on the provided start and end timestamps. Results can be filtered by blockchain and asset type, offering flexible and detailed visualizations of wallet performance, similar to what you see in th…
- [Get wallet fungible positions](https://developers.zerion.io/api-reference/wallets/get-wallet-fungible-positions.md): This endpoint returns a list of wallet positions.
- [Get wallet NFT collections](https://developers.zerion.io/api-reference/wallets/get-wallet-nft-collections.md): This endpoint returns a list of the NFT collections held by a specific wallet.
- [Get wallet NFT portfolio](https://developers.zerion.io/api-reference/wallets/get-wallet-nft-portfolio.md): This endpoint returns the NFT portfolio overview of a web3 wallet.
- [Get wallet NFT positions](https://developers.zerion.io/api-reference/wallets/get-wallet-nft-positions.md): This endpoint returns a list of the NFT positions held by a specific wallet.
- [Get wallet PnL](https://developers.zerion.io/api-reference/wallets/get-wallet-pnl.md): This endpoint returns the Profit and Loss (PnL) details of a web3 wallet. This includes Unrealized PnL, Realized PnL, Net Invested amounts and filters for asset categories like Non Fungible Tokens (NFTs). It uses the FIFO (First In, First Out) standard for calculations, providing accurate insights i…
- [Get wallet portfolio](https://developers.zerion.io/api-reference/wallets/get-wallet-portfolio.md): This endpoint returns the portfolio overview of a web3 wallet.
- [Get wallet transactions](https://developers.zerion.io/api-reference/wallets/get-wallet-transactions.md): This endpoint returns a list of transactions associated with the wallet.
- [Authentication](https://developers.zerion.io/authentication.md): How to authenticate with the Zerion API
- [MCP](https://developers.zerion.io/build-with-ai/mcp.md): Connect your AI tools to the Zerion API docs via Model Context Protocol.
- [MPP Payments](https://developers.zerion.io/build-with-ai/mpp.md): Access the Zerion API per-request using USDC on Tempo — no API key required.
- [Overview](https://developers.zerion.io/build-with-ai/overview.md): Connect AI agents and assistants to onchain data through the Zerion API.
- [x402 Payments](https://developers.zerion.io/build-with-ai/x402.md): Access the Zerion API per-request using USDC on Base or Solana — no API key required.
- [Skill + CLI](https://developers.zerion.io/build-with-ai/zerion-cli.md): CLI for Zerion Wallet — analyze wallets, sign, swap, and bridge on-chain with agent-managed wallets across EVM chains and Solana, all from the command line. Plus agent skills that ship across every major AI coding agent.
- [Changelogs](https://developers.zerion.io/changelog.md): Latest updates, new features, and improvements to the Zerion API.
- [Endpoints & Schema](https://developers.zerion.io/endpoints-and-schema.md): Overview of all Zerion API endpoint categories and response structure.
- [Error Handling](https://developers.zerion.io/error-handling.md): Understand Zerion API error responses, HTTP status codes, rate limits, and best practices for retry logic.
- [Introduction](https://developers.zerion.io/introduction.md): Getting started with Zerion API
- [From OneBalance](https://developers.zerion.io/migrate-from-onebalance.md): A 1:1 mapping from OneBalance backend endpoints to Zerion API for wallet data, covering aggregated balances, transaction history, and asset list, with side-by-side code samples.
- [From Dune SIM](https://developers.zerion.io/migrate-from-sim.md): A 1:1 mapping from Dune SIM endpoints to Zerion API, covering Balances, Activity, and DeFi Positions, with side-by-side code samples.
- [Pagination & Filtering](https://developers.zerion.io/pagination-and-filtering.md): How to paginate through results, filter data, sort responses, and set currency across Zerion API endpoints.
- [Pricing](https://developers.zerion.io/pricing.md): Monthly subscription plans and pricing for the Zerion API
- [Quickstart](https://developers.zerion.io/quickstart.md): Get your API key and make your first request in under 5 minutes.
- [Rate Limits](https://developers.zerion.io/rate-limits.md): Understand rate limits and handle throttled requests.
- [Recipes](https://developers.zerion.io/recipes.md): Task-focused guides for common use cases with the Zerion API.
- [Build an AI Agent with Onchain Data](https://developers.zerion.io/recipes/ai-agent-integration.md): Give your AI agent access to wallet portfolios, token prices, and transaction history using the Zerion API.
- [Get a Wallet's DeFi Positions](https://developers.zerion.io/recipes/defi-positions.md): Retrieve lending, staking, and liquidity positions across DeFi protocols for any wallet.
- [Build a Portfolio Tracker](https://developers.zerion.io/recipes/multi-chain-portfolio.md): Fetch a wallet's total value and holdings, aggregate multiple wallets, compare across chains, and chart performance over time.
- [Build an NFT Portfolio Viewer](https://developers.zerion.io/recipes/nft-portfolio.md): Fetch a wallet's NFT holdings grouped by collection, with floor prices and chain breakdown.
- [Swap Tokens & Bridge Assets](https://developers.zerion.io/recipes/swap-tokens.md): Get quotes and ready-to-sign transactions for same-chain swaps and cross-chain bridges using the Zerion API.
- [Get a Wallet's Transaction History](https://developers.zerion.io/recipes/transaction-history.md): Fetch and interpret a wallet's transactions with human-readable types and transfer details.
- [Set Up Wallet Activity Alerts](https://developers.zerion.io/recipes/wallet-activity-alerts.md): Use transaction subscriptions (webhooks) to get notified when a wallet sends or receives tokens.
- [Build a Wallet PnL Tracker](https://developers.zerion.io/recipes/wallet-pnl-tracker.md): Track realized gains, unrealized gains, cost basis, and per-token performance for any wallet using the Zerion API.
- [Spam Filtering](https://developers.zerion.io/spam-filtering.md): How Zerion detects and filters spam tokens across positions and transactions.
- [Supported Blockchains](https://developers.zerion.io/supported-blockchains.md): List of blockchains supported by the Zerion API
- [Webhooks](https://developers.zerion.io/webhooks.md): Receive real-time notifications when watched wallets send or receive transactions.

## OpenAPI Specs

- [openapi-v1](https://developers.zerion.io/openapi-v1.yaml)

## Optional

- [Dashboard](https://dashboard.zerion.io)
- [Case Studies](https://zerion.io/blog/tag/zerion-api/)
