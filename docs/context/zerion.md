# Source: https://developers.zerion.io/llms-full.txt
# Vendored 2026-08-17. Full documentation, replacing the index stub.

# Get chain by ID
Source: https://developers.zerion.io/api-reference/chains/get-chain-by-id

/openapi-v1.yaml get /v1/chains/{chain_id}
This endpoint returns chain by unique chain identifier.

This endpoint supports testnets. To get data for testnets use `X-Env` header.




# Get list of all chains
Source: https://developers.zerion.io/api-reference/chains/get-list-of-all-chains

/openapi-v1.yaml get /v1/chains/
This endpoint returns list of all chains supported by Zerion.

This endpoint supports testnets. To get data for testnets use `X-Env` header.




# Get DApp by ID
Source: https://developers.zerion.io/api-reference/dapps/get-dapp-by-id

/openapi-v1.yaml get /v1/dapps/{dapp_id}
This endpoint returns single DApp by its unique identifier.




# Get list of DApps
Source: https://developers.zerion.io/api-reference/dapps/get-list-of-dapps

/openapi-v1.yaml get /v1/dapps
This endpoint returns list of DApps by using different parameters.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Get a chart for a fungible asset
Source: https://developers.zerion.io/api-reference/fungibles/get-a-chart-for-a-fungible-asset

/openapi-v1.yaml get /v1/fungibles/{fungible_id}/charts/{chart_period}
This endpoint returns the chart for the fungible asset for a selected period



# Get a chart for a fungible asset by implementation
Source: https://developers.zerion.io/api-reference/fungibles/get-a-chart-for-a-fungible-asset-by-implementation

/openapi-v1.yaml get /v1/fungibles/by-implementation/charts/{chart_period}
This endpoint returns the chart for a fungible asset for a selected period, identified by its implementation.
The implementation is a chain:address pair (e.g., "ethereum:0xa5a4214bb5f00c86b7969b7dc007302e4f6f05d6").




# Get fungible asset by ID
Source: https://developers.zerion.io/api-reference/fungibles/get-fungible-asset-by-id

/openapi-v1.yaml get /v1/fungibles/{fungible_id}
This endpoint returns a fungible asset by unique identifier



# Get fungible asset by implementation
Source: https://developers.zerion.io/api-reference/fungibles/get-fungible-asset-by-implementation

/openapi-v1.yaml get /v1/fungibles/by-implementation
This endpoint returns a fungible asset by its implementation.
The implementation is a `chain` (for base asset) or `chain:address` pair (e.g., "ethereum", ethereum:0xa5a4214bb5f00c86b7969b7dc007302e4f6f05d6").




# Get list of fungible assets
Source: https://developers.zerion.io/api-reference/fungibles/get-list-of-fungible-assets

/openapi-v1.yaml get /v1/fungibles/
This endpoint returns a paginated list of fungible assets supported by Zerion. It also provides the ability to search for fungibles.
If no fungible assets are found for given filters, the empty list with 200 status is returned.

> NOTE: This endpoint supports a lot of filters, sorting, and pagination parameters. Ensure your request URL length is within a safe range for your platform. Usually, 2000 characters are the safe limit in virtually any combination of client and server software.

> NOTE: The `filter[implementation_address]` parameter ignores `filter[search_query]`. It may be changed in the future.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Get list of all available gas prices
Source: https://developers.zerion.io/api-reference/gas/get-list-of-all-available-gas-prices

/openapi-v1.yaml get /v1/gas-prices/
This endpoint provides real-time information on the current gas prices across all supported blockchain networks. Gas prices play a crucial role in the speed and cost of executing transactions on a blockchain, and fluctuate frequently based on network demand and usage. By using this endpoint, developers can stay up-to-date with the latest gas prices and adjust their application's transaction parameters accordingly to ensure optimal speed and cost efficiency.



# Get list of NFTs
Source: https://developers.zerion.io/api-reference/nfts/get-list-of-nfts

/openapi-v1.yaml get /v1/nfts/
This endpoint returns list of NFTs by using different parameters.

It returns NFTs of both types - ERC721 and ERC1155.

This endpoint supports testnets. To get data for testnets use `X-Env` header.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Get single NFT by ID
Source: https://developers.zerion.io/api-reference/nfts/get-single-nft-by-id

/openapi-v1.yaml get /v1/nfts/{nft_id}
This endpoint returns single NFT by its unique identifier.

This endpoint supports testnets. To get data for testnets use `X-Env` header.




# Count wallets within subscription
Source: https://developers.zerion.io/api-reference/subscriptions-to-transactions/count-wallets-within-subscription

/openapi-v1.yaml get /v1/tx-subscriptions/{subscription_id}/wallets/count
This endpoint returns the count of wallets within a specific subscription by subscription ID.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Create subscription
Source: https://developers.zerion.io/api-reference/subscriptions-to-transactions/create-subscription

/openapi-v1.yaml post /v1/tx-subscriptions/
This endpoint subscribes to new transactions associated with the wallets.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.

### Use Case
The main use case for the webhooks system is to send notifications, similar to push notifications in the Zerion App.

### Setup Callback URL
If you want to use this endpoint to test how it works, you might use your dev key to start. It has limits: one subscription & maximum 5 wallets per subscription.
You may use callback URL from webhook.site to start from. If want use your custom - contact us at api@zerion.io, and we will whitelist your URL.

If you want to use this endpoint in your production environment, you should contact us and provide the following details:
- Your email associated with the API key
- The URL that you prefer using as the callback (or host).

After we've whitelisted your callback URL (or host), you may start using this endpoint.

### Note
- **Subscription Validity**: Every subscription is valid for unlimited amount of time for production key, and one week for `dev` keys.
- **Transaction Prices**: Prices are not attached to webhook notifications and will always be `null`. Prices are added to transactions in the backend after some time. To get prices, query the transactions endpoint by hash.
- **Delivery Guarantees**: Webhook delivery is not guaranteed. If delivery fails three times, no further attempts will be made.
- **Order of Dispatch**: The order of webhook dispatch is not guaranteed and may not correspond to the order of transactions occurring on the blockchain.

### Callback Format and Signature Verification
Approved clients will receive notifications via POST requests to their provided URL. These notifications will include a signed notification object in the body (specified below in the `Callback` section) and a signature in the headers.

Clients should verify the signature provided in the headers of the webhook request to ensure the authenticity of the data. The following headers will be included:
- `X-Signature`: The signature of the request.
- `X-Timestamp`: The timestamp of the request.
- `X-Certificate-URL`: The URL to download the public certificate used to verify the signature.

**To verify the signature:**
1. Concatenate the `X-Timestamp` header value, the request body, and a newline character: `$timestamp + "\n" + $request.body + "\n"`
2. Use the public certificate downloaded from the `X-Certificate-URL` header to verify the signature in the `X-Signature` header.

Example code in go for message verification:

```go
package signature

import (
  "crypto"
  "crypto/rsa"
  "crypto/sha256"
  "crypto/x509"
  "encoding/base64"
  "encoding/pem"
  "errors"
  "github.com/stretchr/testify/assert"
  "testing"
)

// FetchCertificate fetches the certificate from the given URL
func FetchCertificate() (*x509.Certificate, error) {
  certBytes := certificate()
  block, _ := pem.Decode(certBytes)
  if block == nil || block.Type != "CERTIFICATE" {
    return nil, errors.New("failed to decode PEM block containing the certificate")
  }

  return x509.ParseCertificate(block.Bytes)
}

func certificate() []byte {
  return []byte(`-----BEGIN CERTIFICATE-----
MIIDMTCCAhmgAwIBAgIUDd3dFMswamyJ5A1bqF0nzS8v2wgwDQYJKoZIhvcNAQEL
BQAwQTELMAkGA1UEBhMCVVMxFDASBgNVBAoMC1plcmlvbiBJbmMuMRwwGgYJKoZI
hvcNAQkBFg1hcGlAemVyaW9uLmlvMB4XDTI0MDYyNzE1MzUzM1oXDTI1MDYyNzE1
MzUzM1owQTELMAkGA1UEBhMCVVMxFDASBgNVBAoMC1plcmlvbiBJbmMuMRwwGgYJ
KoZIhvcNAQkBFg1hcGlAemVyaW9uLmlvMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A
MIIBCgKCAQEAwcPVCPLDhS9dLA8s5J6GJ3t0+jWuUCFwI+q6c03xZnhCaz45FepN
MTiApbvPw1Zm8F8JQB4BRp/F5anokNcDSl/qmNtj3M/z/FrsVvGnSH2FOkZu9TLU
LTW5i8Q0LAYrpgiBHrTa2qrRXd2DiMrEs3QZVoylFYc9QIGet3SULPrlSsYEKxfB
iBZDoFw619NnV6/kBO8FS34Lc+WH5SNNHNnItRrxMv4DMAFyFajSn1IwV6LSWSNK
aPJHCzP/Omu95550HQKcXaJYNE/d99NrcLaFI2fCuEVd00nApFo5knKs0FiXpGca
l3cLOQG5SCOzUOjQb6X5CynEV+0QiyYxDwIDAQABoyEwHzAdBgNVHQ4EFgQUVL4m
u0PcI4nJGUS8syLi5DNL44YwDQYJKoZIhvcNAQELBQADggEBAKaA1oqW0D6KxvIp
IZxWf02XK/YFYwxKV55Vas0VWlzNemE2IjlIj0tknZt0EiM9um2FC27U9n3u0ApS
UDrk96dQ+/RY3T3fiuXysa3ZL05OpreRk0aPuFU9rB4iLTgFiv1G/X5XXJ8O7OQb
48u0vQnYXjT/nt72TMUoakjZ68QsP64FkG8mcK62Tg+FVWB9YWTFc0wOjsOt9RzJ
muKCQ7qx7L1GhkxKX4ZhrYItsH1DzXjeP5aniZgLBSPbxt01tUrSjOGN5CLOpdG8
iOnAFP+Nz8S0h2C7hppOHgC+uxY285UrzAZQoMbCREMV+0Mq/aqdF1B6qoKGNGqL
kFbUhvo=
-----END CERTIFICATE-----
`)
}

func VerifySignature(cert *x509.Certificate, message, signature string) error {
  pubKey := cert.PublicKey.(*rsa.PublicKey)

  hashed := sha256.Sum256([]byte(message))
  sigBytes, err := base64.StdEncoding.DecodeString(signature)
  if err != nil {
    return err
  }

  return rsa.VerifyPKCS1v15(pubKey, crypto.SHA256, hashed[:], sigBytes)
}

func TestVerifySignature(t *testing.T) {
  // Example usage
  x509Cert, err := FetchCertificate()
  assert.NoError(t, err)

  xTimestamp := "2024-07-31T00:17:36Z"
  xSignature := "t65gdR8z3NGh/OQRPzGMFmw36JhDNvOe6LxL6K2hCd3SdYQoTGr76dAy1CpsX2G8XVOIYUIctUQvgICQvtDctVjkRZmXuQDvXHOmiJE0ZknORgjVLFoo5JRYKvwt3EPp6SMN7RtedIX17rH1s2Vp3GRQWSjzN7C/cNgInhCQOP0UDjYlaeNT/yW4B2Qt4uY01yK0YhvQJaFHN+NNr7DZAt4FJuDppItqjaYbHTaFNqLlpI1IX7YvQWVhEYTJY6M4T9IdcGYPJKDljckjvmj9mDHZeh/Y6w8eXjLziMSFvlhJeSn1kBIR3nS7lTcwFNv1CPxD3MM7VB++te3mBbFubg=="
  messageBody := `{"data":{"attributes":{"timestamp":"2024-07-31T00:17:36.661896043Z"},"id":"15daee90-5028-4b4c-bd49-b4d43fa1a89e","type":"callback"},"included":[{"attributes":{"application_metadata":{"contract_address":"0x8286d601a0ed6cf75e067e0614f73a5b9f024151","method":{"id":"0x7859bb8d","name":""}},"approvals":[],"fee":{"fungible_info":{"flags":{"verified":true},"icon":{"url":"https://cdn.zerion.io/eth.png"},"implementations":[{"address":"","chain_id":"redstone","decimals":18},{"address":"","chain_id":"polygon-zkevm","decimals":18},{"address":"","chain_id":"optimism","decimals":18},{"address":"","chain_id":"zksync-era","decimals":18},{"address":"","chain_id":"mode","decimals":18},{"address":"","chain_id":"base","decimals":18},{"address":"","chain_id":"ethereum","decimals":18},{"address":"","chain_id":"aurora","decimals":18},{"address":"","chain_id":"scroll","decimals":18},{"address":"","chain_id":"rari","decimals":18},{"address":"","chain_id":"astar-zkevm","decimals":18},{"address":"","chain_id":"arbitrum","decimals":18},{"address":"","chain_id":"zora","decimals":18},{"address":"","chain_id":"blast","decimals":18},{"address":"","chain_id":"linea","decimals":18},{"address":"","chain_id":"manta-pacific","decimals":18}],"name":"Ethereum","symbol":"ETH"},"price":null,"quantity":{"decimals":18,"float":0.0000016785001958,"int":"1678500195825","numeric":"0.000001678500195825"},"value":null},"flags":{"is_trash":false},"hash":"0xbbcfb0ac5e466ded168794a162da334634fee3f95adfdb55392999f91b4c6d41","mined_at":"2024-07-31T00:17:35Z","mined_at_block":7490818,"nonce":250,"operation_type":"execute","sent_from":"0xfc0f1b3fb88c5ab19e77a6f7d4d637272e71e684","sent_to":"0x8286d601a0ed6cf75e067e0614f73a5b9f024151","status":"confirmed","transfers":[]},"id":"a65b2541c58a5908a7333480f0ac6792","relationships":{"chain":{"id":"linea","type":"chains"},"dapp":{"id":"","type":"dapps"}},"type":"transactions"}]}`

  message := xTimestamp + "\n" + messageBody + "\n"

  err = VerifySignature(x509Cert, message, xSignature)
  assert.NoError(t, err)
}
```




# Delete subscription by ID
Source: https://developers.zerion.io/api-reference/subscriptions-to-transactions/delete-subscription-by-id

/openapi-v1.yaml delete /v1/tx-subscriptions/{subscription_id}
This endpoint deletes existing subscription

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Disable a specific subscription
Source: https://developers.zerion.io/api-reference/subscriptions-to-transactions/disable-a-specific-subscription

/openapi-v1.yaml patch /v1/tx-subscriptions/{subscription_id}/disable
This endpoint sets the status of a specific subscription to "disabled".

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. This ensures flexibility and future-proofing against ID format changes.




# Enable a specific subscription
Source: https://developers.zerion.io/api-reference/subscriptions-to-transactions/enable-a-specific-subscription

/openapi-v1.yaml patch /v1/tx-subscriptions/{subscription_id}/enable
This endpoint sets the status of a specific subscription to "enabled".

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. This ensures flexibility and future-proofing against ID format changes.




# Find subscription by ID
Source: https://developers.zerion.io/api-reference/subscriptions-to-transactions/find-subscription-by-id

/openapi-v1.yaml get /v1/tx-subscriptions/{subscription_id}
This endpoint by ID returns subscription to new transactions associated with the wallets and chains.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Find subscriptions
Source: https://developers.zerion.io/api-reference/subscriptions-to-transactions/find-subscriptions

/openapi-v1.yaml get /v1/tx-subscriptions/
This endpoint finds subscriptions to new transactions associated with the wallets and chains. Currently response is limited to 1000 subscriptions in the response.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Find wallets within subscription
Source: https://developers.zerion.io/api-reference/subscriptions-to-transactions/find-wallets-within-subscription

/openapi-v1.yaml get /v1/tx-subscriptions/{subscription_id}/wallets
This endpoint by subscription ID returns wallets within specific subscription.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Patch wallets within subscription
Source: https://developers.zerion.io/api-reference/subscriptions-to-transactions/patch-wallets-within-subscription

/openapi-v1.yaml patch /v1/tx-subscriptions/{subscription_id}/wallets
This endpoint works by subscription ID. It patches wallets list within specific subscription.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Replace wallets within subscription
Source: https://developers.zerion.io/api-reference/subscriptions-to-transactions/replace-wallets-within-subscription

/openapi-v1.yaml put /v1/tx-subscriptions/{subscription_id}/wallets
This endpoint works by subscription ID. It replaces wallets list within specific subscription.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Update callback URL within subscription
Source: https://developers.zerion.io/api-reference/subscriptions-to-transactions/update-callback-url-within-subscription

/openapi-v1.yaml patch /v1/tx-subscriptions/{subscription_id}/callback_url
This endpoint updates the callback URL for a specific subscription.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Update chain IDs within subscription
Source: https://developers.zerion.io/api-reference/subscriptions-to-transactions/update-chain-ids-within-subscription

/openapi-v1.yaml patch /v1/tx-subscriptions/{subscription_id}/chain_ids
This endpoint updates the list of chain IDs associated with a specific subscription.

> NOTE:
> - Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions.
> - The chain IDs provided will replace the existing chain IDs associated with the subscription.




# Get swap and bridge quotes
Source: https://developers.zerion.io/api-reference/swap/get-swap-and-bridge-quotes

/openapi-v1.yaml get /v1/swap/quotes/
Returns quotes from multiple liquidity sources for a same-chain swap or a cross-chain bridge between two fungible assets. Supports EVM chains and Solana, including EVM ↔ Solana bridges.

**Liquidity sources.** Each quote comes from one DEX, aggregator, or bridge, identified by `liquidity_source` in the response. Supported sources include 0x Exchange, 1inch, Bungee, Jupiter, KyberSwap, LI.FI, Relay, Uniswap, and Velora. The set evolves over time, so read `liquidity_source.id` from the response instead of hardcoding source names.

Quotes are returned best-first: sorted in descending order by the fiat value of `output_amount_after_fees` (output amount minus network, protocol and bridge fees that are not already included in the rate). Quotes with the same score are tied-broken alphabetically by `liquidity_source.id`, so identical requests always return quotes in the same order.

The `input` and `output` parameters are objects encoded with bracket notation in the URL — the request is sent as a flat query string. For example:

```
GET /v1/swap/quotes/?currency=usd&input[chain_id]=base&input[fungible_id]=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2&input[amount]=0.001&output[fungible_id]=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&from=0xd8da6bf26964af9d7eed9e03e53415d37aa96045&to=0xd8da6bf26964af9d7eed9e03e53415d37aa96045
```




# List fungibles available for bridging
Source: https://developers.zerion.io/api-reference/swap/list-fungibles-available-for-bridging

/openapi-v1.yaml get /v1/swap/fungibles/
Returns the list of tokens available for bridging between two chains. Use this to populate a token picker UI. Only relevant for cross-chain swaps, same-chain swaps don't require this step.



# Get wallet set balance chart
Source: https://developers.zerion.io/api-reference/wallet-sets/get-wallet-set-balance-chart

/openapi-v1.yaml get /v1/wallet-sets/charts/{chart_period}
This endpoint returns a portfolio balance chart for a wallet set.
A wallet set is represented by an EVM address, a Solana address, or both. At least one address must be provided.
This is over a specified time period, based on the provided start and end timestamps.
Results can be filtered by blockchain and asset type, offering flexible and detailed visualizations of wallet set performance, similar to what you see in the Zerion interface.

**Complex positions.** By default the chart counts only simple positions: token and native-coin balances held directly in the wallet. Set `filter[positions]` to `only_complex` or `no_filter` to also include complex DeFi protocol positions. Uniswap V2 LP and Morpho vault positions are supported today, and support for more protocols is rolling out over time. Positions from protocols that aren't yet supported are omitted from the chart.




# Get wallet set fungible positions
Source: https://developers.zerion.io/api-reference/wallet-sets/get-wallet-set-fungible-positions

/openapi-v1.yaml get /v1/wallet-sets/positions/
This endpoint returns a list of wallet set positions.
A wallet set is represented by an EVM address, a Solana address, or both. At least one address must be provided.

This endpoint supports testnets. To get data for testnets use `X-Env` header.

**Understanding Liquidity Pool Positions:**

Liquidity pools (Uniswap, Curve, Balancer, etc.) return **multiple positions** - one for each token in the pool. Positions belonging to the same pool share the same `group_id` value in attributes.

For example, a Uniswap V2 USDC/WETH pool returns two positions:
- Position 1: WETH token, `group_id="820ee2f1ca8ccb716f6beb5e450908a028be890ec44aba87c739b416ef41e197"`, `fungible_info.symbol="WETH"`
- Position 2: USDC token, `group_id="820ee2f1ca8ccb716f6beb5e450908a028be890ec44aba87c739b416ef41e197"`, `fungible_info.symbol="USDC"`

To display all tokens in a liquidity pool together, group positions by their `group_id` attribute.

**Temporary limitations for Solana addresses:**
- Doesn't support protocol positions

> NOTE: Don't forget to stop retries after some reasonable period of time. If the `200` status is not returned within 2 minutes it most probably means that some unexpected error occurred and the client should stop the polling.

> NOTE: This endpoint is not paginated and returns all matching positions in a single response. It supports a lot of filters and sorting parameters, so make sure that a request URL length is in a safe range for your platform. Usually, 2000 characters are the safe limit in virtually any combination of client and server software.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Get wallet set PnL
Source: https://developers.zerion.io/api-reference/wallet-sets/get-wallet-set-pnl

/openapi-v1.yaml get /v1/wallet-sets/pnl
This endpoint returns the Profit and Loss (PnL) details of a wallet set.
A wallet set is represented by an EVM address, a Solana address, or both. At least one address must be provided.
This includes Unrealized PnL, Realized PnL, Net Invested amounts and filters for asset categories like Non Fungible Tokens (NFTs).
It uses the FIFO (First In, First Out) standard for calculations, providing accurate insights into wallet set performance.
Ideal for tracking and analyzing financial outcomes of wallet activity across multiple addresses.

The very first request for a wallet set might result in a 503 which should be retried later.

The 1 million action limit applies per address: if any address in the set is over it, the
request returns a 422 once the limit is detected. Only the 503 carries a `Retry-After` header.

Addresses Zerion does not track return a 400. This covers contract addresses that are not
smart-contract wallets; Safe and ERC-4337 accounts work as normal.




# Get wallet set portfolio
Source: https://developers.zerion.io/api-reference/wallet-sets/get-wallet-set-portfolio

/openapi-v1.yaml get /v1/wallet-sets/portfolio
This endpoint returns a wallet set's portfolio overview.
A wallet set is represented by an EVM address, a Solana address, or both. At least one address must be provided.

**Temporary limitations for Solana addresses:**
- Doesn't support protocol positions

> NOTE: Don't forget to stop retries after some reasonable period of time. If the `200` status is not returned within 2 minutes it most probably means that some unexpected error occurred and the client should stop the polling.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Get wallet set transactions
Source: https://developers.zerion.io/api-reference/wallet-sets/get-wallet-set-transactions

/openapi-v1.yaml get /v1/wallet-sets/transactions/
This endpoint returns a list of transactions associated with the wallet set.
A wallet set is represented by an EVM address, a Solana address, or both. At least one address must be provided.

This endpoint supports testnets. To get data for testnets use `X-Env` header.

**Temporary limitations for Solana addresses:**
- Doesn't support NFT transactions

> NOTE: This endpoint supports a lot of filters, sorting, and pagination parameters. Make sure that your request URL length is safe for your platform. Usually, 2000 characters are the safe limit in virtually any combination of client and server software.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Get wallet balance chart
Source: https://developers.zerion.io/api-reference/wallets/get-wallet-balance-chart

/openapi-v1.yaml get /v1/wallets/{address}/charts/{chart_period}
This endpoint returns a portfolio balance chart for a wallet.
This is over a specified time period, based on the provided start and end timestamps.
Results can be filtered by blockchain and asset type, offering flexible and detailed visualizations of wallet performance, similar to what you see in the Zerion interface.

**Complex positions.** By default the chart counts only simple positions: token and native-coin balances held directly in the wallet. Set `filter[positions]` to `only_complex` or `no_filter` to also include complex DeFi protocol positions. Uniswap V2 LP and Morpho vault positions are supported today, and support for more protocols is rolling out over time. Positions from protocols that aren't yet supported are omitted from the chart.




# Get wallet fungible positions
Source: https://developers.zerion.io/api-reference/wallets/get-wallet-fungible-positions

/openapi-v1.yaml get /v1/wallets/{address}/positions/
This endpoint returns a list of wallet positions.

This endpoint supports testnets. To get data for testnets use `X-Env` header.

**Understanding Liquidity Pool Positions:**

Liquidity pools (Uniswap, Curve, Balancer, etc.) return **multiple positions** - one for each token in the pool. Positions belonging to the same pool share the same `group_id` value in attributes.

For example, a Uniswap V2 USDC/WETH pool returns two positions:
- Position 1: WETH token, `group_id="820ee2f1ca8ccb716f6beb5e450908a028be890ec44aba87c739b416ef41e197"`, `fungible_info.symbol="WETH"`
- Position 2: USDC token, `group_id="820ee2f1ca8ccb716f6beb5e450908a028be890ec44aba87c739b416ef41e197"`, `fungible_info.symbol="USDC"`

To display all tokens in a liquidity pool together, group positions by their `group_id` attribute.

**Temporary limitations for Solana addresses:**
- Doesn't support protocol positions

> NOTE: Don't forget to stop retries after some reasonable period of time. If the `200` status is not returned within 2 minutes it most probably means that some unexpected error occurred and the client should stop the polling.

> NOTE: This endpoint is not paginated and returns all matching positions in a single response. It supports a lot of filters and sorting parameters, so make sure that a request URL length is in a safe range for your platform. Usually, 2000 characters are the safe limit in virtually any combination of client and server software.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Get wallet NFT collections
Source: https://developers.zerion.io/api-reference/wallets/get-wallet-nft-collections

/openapi-v1.yaml get /v1/wallets/{address}/nft-collections/
This endpoint returns a list of the NFT collections held by a specific wallet.

This endpoint supports testnets. To get data for testnets use `X-Env` header.

If the wallet address has not been previously added, this endpoint may return a `202` status code. This indicates that the wallet's collections are not yet available, but will be in the near future. In this case, the client should periodically request this endpoint until a `200` status code is returned.

> NOTE: It is important to stop retrying after a reasonable period of time. If a `200` status code is not returned within 2 minutes, it is likely that an unexpected error has occurred, and the client should stop polling.

> NOTE: This endpoint provides support for filters, sorting. Ensure that the length of the request URL falls within a safe range for your platform. Typically, a length of 2000 characters is a safe limit for most combinations of client and server software.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Get wallet NFT portfolio
Source: https://developers.zerion.io/api-reference/wallets/get-wallet-nft-portfolio

/openapi-v1.yaml get /v1/wallets/{address}/nft-portfolio
This endpoint returns the NFT portfolio overview of a web3 wallet.

This endpoint supports testnets. To get data for testnets use `X-Env` header.

If the address was not added before it is possible that this endpoint will return `202` status. It means that portfolio for the wallet is not prepared yet, but will be available soon. In that case the client have to request this endpoint periodically, while `200` status wasn't returned.

> NOTE: Don't forget to stop retries after some reasonable period of time. If the `200` status is not returned within 2 minutes it most probably means that some unexpected error occurred and the client should stop the polling.




# Get wallet NFT positions
Source: https://developers.zerion.io/api-reference/wallets/get-wallet-nft-positions

/openapi-v1.yaml get /v1/wallets/{address}/nft-positions/
This endpoint returns a list of the NFT positions held by a specific wallet.

This endpoint supports testnets. To get data for testnets use `X-Env` header.

If the wallet address has not been previously added, this endpoint may return a `202` status code. This indicates that the wallet's positions are not yet available, but will be in the near future. In this case, the client should periodically request this endpoint until a `200` status code is returned.

> NOTE: It is important to stop retrying after a reasonable period of time. If a `200` status code is not returned within 2 minutes, it is likely that an unexpected error has occurred and the client should stop polling.

> NOTE: This endpoint provides support for filters, sorting, and pagination parameters. Ensure that the length of the request URL falls within a safe range for your platform. Typically, a length of 2000 characters is a safe limit for most combinations of client and server software.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Get wallet PnL
Source: https://developers.zerion.io/api-reference/wallets/get-wallet-pnl

/openapi-v1.yaml get /v1/wallets/{address}/pnl
This endpoint returns the Profit and Loss (PnL) details of a web3 wallet.
This includes Unrealized PnL, Realized PnL, Net Invested amounts and filters for asset categories like Non Fungible Tokens (NFTs).
It uses the FIFO (First In, First Out) standard for calculations, providing accurate insights into wallet performance.
Ideal for tracking and analyzing financial outcomes of wallet activity.

The very first request for a wallet might result in a 503 which should be retried later.

Wallets with over 1 million actions cannot be served and return a 422 once the limit is
detected. Only the 503 carries a `Retry-After` header.

Addresses Zerion does not track return a 400. This covers contract addresses that are not
smart-contract wallets; Safe and ERC-4337 accounts work as normal.




# Get wallet portfolio
Source: https://developers.zerion.io/api-reference/wallets/get-wallet-portfolio

/openapi-v1.yaml get /v1/wallets/{address}/portfolio
This endpoint returns the portfolio overview of a web3 wallet.

**Temporary limitations for Solana addresses:**
- Doesn't support protocol positions

> NOTE: Don't forget to stop retries after some reasonable period of time. If the `200` status is not returned within 2 minutes it most probably means that some unexpected error occurred and the client should stop the polling.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Get wallet transactions
Source: https://developers.zerion.io/api-reference/wallets/get-wallet-transactions

/openapi-v1.yaml get /v1/wallets/{address}/transactions/
This endpoint returns a list of transactions associated with the wallet.

This endpoint supports testnets. To get data for testnets use `X-Env` header.

**Temporary limitations for Solana addresses:**
- Doesn't support NFT transactions

> NOTE: This endpoint supports a lot of filters, sorting, and pagination parameters. Make sure that your request URL length is safe for your platform. Usually, 2000 characters are the safe limit in virtually any combination of client and server software.

> NOTE: Consider all IDs as abstract strings, without making any assumptions about their format or relying on such assumptions. There is a non-zero probability that IDs may change in the future, and this should not result in any breaking changes.




# Authentication
Source: https://developers.zerion.io/authentication

Authenticate Zerion API requests with an API key using HTTP Basic Auth, including header format, environments, and code samples in curl, JavaScript, and Python.

The Zerion API supports three ways to authenticate a request:

| Method                          | Best for                              | How it works                                                                                          |
| ------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **API key**                     | Apps and services with steady traffic | HTTP Basic Auth with a key from the [Dashboard](https://dashboard.zerion.io). Subject to rate limits. |
| **[x402](/build-with-ai/x402)** | AI agents and per-call workloads      | Pay USDC on Base or Solana per request. No API key, no rate limits.                                   |
| **[MPP](/build-with-ai/mpp)**   | AI agents and per-call workloads      | Pay USDC on Tempo per request. No API key, no rate limits.                                            |

The rest of this page covers the API key flow. For pay-per-request flows, see the dedicated [x402](/build-with-ai/x402) and [MPP](/build-with-ai/mpp) pages.

## API key

The Zerion API uses [HTTP Basic Authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#basic_authentication_scheme). You can get your API key from the [Dashboard](https://dashboard.zerion.io).

### Try it from the docs

Every API reference page has an interactive playground. Click **Try it**, paste your API key in the **Username** field, leave **Password** empty, and hit **Send** to make a live request.

### Using the API from your code

When calling the API from code, append a colon to your API key (`your_api_key:`), Base64-encode it, and pass it in the `Authorization` header:

```
Authorization: Basic BASE64_ENCODED_KEY
```

<Tip>
  Go to the [Dashboard](https://dashboard.zerion.io) Get Started section for ready-to-use code snippets with your API key pre-filled.
</Tip>

<CodeGroup>
  ```bash cURL theme={null}
  # Transform your API key for Basic Auth
  API_KEY_TRANSFORMED=$(echo -n "YOUR_API_KEY:" | base64)

  # Make the request
  curl -X GET "https://api.zerion.io/v1/wallets/0x42b9df65b219b3dd36ff330a4dd8f327a6ada990/portfolio" \
    -H "Authorization: Basic $API_KEY_TRANSFORMED" \
    -H "accept: application/json"
  ```

  ```javascript JavaScript theme={null}
  // Transform your API key for Basic Auth
  const apiKey = 'YOUR_API_KEY';
  const apiKeyTransformed = btoa(apiKey + ':');

  // Make the request
  const response = await fetch(
    'https://api.zerion.io/v1/wallets/0x42b9df65b219b3dd36ff330a4dd8f327a6ada990/portfolio',
    {
      headers: {
        'Authorization': `Basic ${apiKeyTransformed}`,
        'accept': 'application/json'
      }
    }
  );
  const data = await response.json();
  console.log(data);
  ```

  ```python Python theme={null}
  import requests
  import base64

  # Transform your API key for Basic Auth
  api_key = 'YOUR_API_KEY'
  api_key_transformed = base64.b64encode(f'{api_key}:'.encode()).decode()

  # Make the request
  response = requests.get(
      'https://api.zerion.io/v1/wallets/0x42b9df65b219b3dd36ff330a4dd8f327a6ada990/portfolio',
      headers={
          'Authorization': f'Basic {api_key_transformed}',
          'accept': 'application/json'
      }
  )
  data = response.json()
  print(data)
  ```

  ```go Go theme={null}
  import (
      "encoding/base64"
      "net/http"
  )

  // Transform your API key for Basic Auth
  apiKey := "YOUR_API_KEY"
  apiKeyTransformed := base64.StdEncoding.EncodeToString([]byte(apiKey + ":"))

  // Make the request
  client := &http.Client{}
  req, _ := http.NewRequest("GET", "https://api.zerion.io/v1/wallets/0x42b9df65b219b3dd36ff330a4dd8f327a6ada990/portfolio", nil)
  req.Header.Set("Authorization", "Basic " + apiKeyTransformed)
  req.Header.Set("accept", "application/json")

  resp, _ := client.Do(req)
  defer resp.Body.Close()
  ```
</CodeGroup>

### Security best practices

<Warning>
  Never expose your API key in client-side code or public repositories.
</Warning>

* Store your API key in environment variables
* Make API requests from server-side code
* Rotate your key immediately if it's ever compromised
* Use separate keys for development and production

## Pay-per-request: x402 and MPP

Both x402 and MPP let you call the Zerion API by paying a small USDC fee per request instead of presenting an API key. They're a better fit than API keys when:

* You're building an AI agent or automated pipeline that shouldn't manage long-lived credentials
* Traffic is bursty or unpredictable and you don't want to size a rate-limited plan
* You want usage-based cost accounting at the request level

The two protocols differ only in which chain they settle on:

* **[x402](/build-with-ai/x402)** ([Coinbase's open protocol](https://github.com/coinbase/x402)) - settles in USDC on **Base** or **Solana**. Uses the `PAYMENT-SIGNATURE` request header.
* **[MPP](/build-with-ai/mpp)** ([Machine Payments Protocol](https://mpp.dev)) - settles in USDC on **Tempo**. Uses the `Authorization: Payment` request header.

Both cover the same set of endpoints as API-key auth and accept the same parameters. Pick whichever chain your wallet already holds USDC on. The [Zerion CLI](/build-with-ai/zerion-cli) supports both via `--x402` / `--mpp` flags.


# Model Context Protocol (MCP) server
Source: https://developers.zerion.io/build-with-ai/mcp

Connect Claude, Cursor, and other AI coding tools to the Zerion API docs through the Model Context Protocol server for in-editor answers and code generation.

The Zerion API docs are available as a Model Context Protocol (MCP) server. Once connected, your AI tool can search our full documentation and OpenAPI spec while generating code - no copy-pasting needed.

## Connect via MCP

<Tabs>
  <Tab title="Claude Code">
    Run this in your terminal:

    ```bash theme={null}
    claude mcp add --transport http zerion-api https://developers.zerion.io/mcp
    ```

    The Zerion docs will be available as a tool in all Claude Code sessions.
  </Tab>

  <Tab title="Cursor">
    Open the command palette (`Cmd+Shift+P`) → "MCP: Edit Config", then add:

    ```json theme={null}
    {
      "mcpServers": {
        "zerion-api": {
          "url": "https://developers.zerion.io/mcp"
        }
      }
    }
    ```
  </Tab>

  <Tab title="VS Code">
    Create `.vscode/mcp.json` in your project:

    ```json theme={null}
    {
      "servers": {
        "zerion-api": {
          "type": "http",
          "url": "https://developers.zerion.io/mcp"
        }
      }
    }
    ```
  </Tab>

  <Tab title="Claude Web">
    1. Go to Claude settings → **Connectors**
    2. Select **Add custom connector**
    3. Name: `Zerion API`, URL: `https://developers.zerion.io/mcp`
    4. Use the attachments button (+) in any chat to access it
  </Tab>
</Tabs>

## What you can ask

Once connected, you can ask your AI assistant things like:

* *"How do I get a wallet's token positions on Ethereum?"*
* *"Write a Python script that fetches transaction history and filters for trades"*
* *"What filters are available on the positions endpoint?"*

The AI will search the Zerion docs in real-time to give you accurate, up-to-date answers.

## Open in AI assistants

You can also open any documentation page directly in an AI chat for quick questions:

<CardGroup>
  <Card title="Claude" icon="message" href="https://claude.ai">
    Paste any docs page URL into Claude for API questions and code generation.
  </Card>

  <Card title="ChatGPT" icon="message" href="https://chat.openai.com">
    Use ChatGPT to explore endpoints and generate integration code.
  </Card>
</CardGroup>

<Tip>
  For the best experience, use the MCP integration instead of copy-pasting. It gives the AI access to the full docs and API spec, not just one page at a time.
</Tip>


# MPP payments: pay-per-request Zerion API access
Source: https://developers.zerion.io/build-with-ai/mpp

Call the Zerion API without an API key by paying per request in USDC on Tempo with the Machine Payments Protocol. No signup, rate limits, or monthly plan.

MPP ([Machine Payments Protocol](https://mpp.dev)) is an open protocol for pay-per-request HTTP access. Instead of an API key, you pay a small amount of USDC on Tempo for each request - ideal for AI agents that need onchain data without managing subscriptions or key rotation.

This is an alternative authorization method for the same Zerion API. Endpoints, JSON:API responses, query parameters, and filters all behave exactly as in the rest of the docs - only the way you prove access changes.

Zerion also supports [x402](./x402), a sibling protocol that settles on Base or Solana. See [Authentication](/authentication) for an overview of all access methods.

## Quickstart with the Zerion CLI

The easiest way to use MPP is with the [Zerion CLI](./zerion-cli), which handles the payment handshake, wallet signing, and retries automatically.

Set an EVM private key for a wallet that holds USDC on Tempo, then make a request with `--mpp`:

```bash theme={null}
export WALLET_PRIVATE_KEY="0x..."
zerion-cli wallet portfolio 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --mpp
```

<Tip>
  Set `ZERION_MPP=true` to enable MPP globally for analytics commands instead of passing `--mpp` on every call. If you already use `WALLET_PRIVATE_KEY` for x402, the same key works for MPP - or set `TEMPO_PRIVATE_KEY` to use a different wallet for Tempo.
</Tip>

## Direct integration

If you're not using the CLI, use one of the [official MPP SDKs](https://mpp.dev/sdk) (TypeScript, Python, Go, Rust) to handle payment construction and retries. You'll need a wallet with USDC on Tempo and its EVM private key.

## Example

```ts theme={null}
import { privateKeyToAccount } from 'viem/accounts'
import { Mppx, tempo } from 'mppx/client'

Mppx.create({
  methods: [tempo({ account: privateKeyToAccount(process.env.WALLET_PRIVATE_KEY) })],
})

// Global fetch now handles 402 automatically
const res = await fetch(
  'https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/portfolio'
)
const data = await res.json()
```

## How it works

```
  Client                     Zerion API
    |                             |
    |  1. GET /v1/wallets/...     |
    | --------------------------> |
    |                             |
    |  2. 402 Payment Required    |
    | <-------------------------- |
    |     WWW-Authenticate:       |
    |     Payment <challenge>     |
    |                             |
    |  3. GET /v1/wallets/...     |
    |     Authorization:          |
    |     Payment <credential>    |
    | --------------------------> |
    |                             |
    |  4. 200 OK                  |
    |     Payment-Receipt: ...    |
    | <-------------------------- |
    |                             |
```

1. Client sends a request to an API endpoint
2. Server returns `402` with a `WWW-Authenticate: Payment` challenge describing where and how much to pay
3. Client signs a USDC transfer on Tempo and retries with an `Authorization: Payment` header
4. Zerion verifies the credential with the MPP facilitator and returns the response

## Rate limits

None - pay per request, no per-second or monthly quota.

## Error handling

* `402 Payment required` - no or invalid payment credential. Inspect the `WWW-Authenticate: Payment` response header for a fresh challenge and retry.
* `402 MPP payment rejected` - the facilitator rejected the credential. The `detail` field contains the reason (e.g. insufficient funds, expired authorization).


# Build AI agents with onchain data
Source: https://developers.zerion.io/build-with-ai/overview

Connect AI agents and assistants to wallet portfolios, DeFi positions, transactions, and token prices with the Zerion API, MCP server, x402, and MPP payments.

Give your AI agents access to wallet portfolios, token data, transactions, and DeFi positions across all supported chains. Zerion provides multiple ways to integrate depending on your setup.

<CardGroup>
  <Card title="Zerion CLI" icon="terminal" href="/build-with-ai/zerion-cli">
    Give AI agents access to onchain data via shell commands - no API integration needed.
  </Card>

  <Card title="x402" icon="coins" href="/build-with-ai/x402">
    Let AI agents pay for API access per-request using stablecoins - no API keys needed.
  </Card>

  <Card title="MCP Server" icon="plug" href="/build-with-ai/mcp">
    Connect AI tools like Claude Code, Cursor, and VS Code to the Zerion docs and OpenAPI spec via Model Context Protocol.
  </Card>
</CardGroup>


# x402 payments: pay-per-request Zerion API access
Source: https://developers.zerion.io/build-with-ai/x402

Call the Zerion API without an API key by paying per request in USDC on Base or Solana with the x402 protocol. No signup, rate limits, or monthly plan needed.

x402 is [Coinbase's open protocol](https://github.com/coinbase/x402) for pay-per-request HTTP access. Instead of an API key, you pay a small amount of USDC on Base or Solana for each request - ideal for AI agents that need onchain data without managing subscriptions or key rotation.

This is an alternative authorization method for the same Zerion API. Endpoints, JSON:API responses, query parameters, and filters all behave exactly as in the rest of the docs - only the way you prove access changes.

Zerion also supports [MPP](./mpp), a sibling protocol that settles on Tempo. See [Authentication](/authentication) for an overview of all access methods.

## Quickstart with the Zerion CLI

The easiest way to use x402 is with the [Zerion CLI](./zerion-cli), which handles the payment handshake, wallet signing, and retries automatically.

Set the private key of the wallet that holds USDC, then make a request with `--x402`:

<Tabs>
  <Tab title="Base (EVM)">
    ```bash theme={null}
    export WALLET_PRIVATE_KEY="0x..."
    zerion-cli wallet portfolio 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --x402
    ```
  </Tab>

  <Tab title="Solana">
    ```bash theme={null}
    export SOLANA_PRIVATE_KEY="<base58-encoded-keypair>"
    export ZERION_X402_PREFER_SOLANA=true
    zerion-cli wallet portfolio 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --x402
    ```
  </Tab>
</Tabs>

<Tip>
  Set `ZERION_X402=true` to enable x402 globally for analytics commands instead of passing `--x402` on every call.
</Tip>

## Direct integration

If you're not using the CLI, use the [Coinbase x402 SDK](https://github.com/coinbase/x402) (Go, TypeScript, Python) to handle payment construction and retries. You'll need a wallet with USDC on Base or Solana and its private key.

## Example

```ts theme={null}
import { wrapFetchWithPayment, x402Client } from '@x402/fetch'
import { registerExactEvmScheme } from '@x402/evm/exact/client'
import { privateKeyToAccount } from 'viem/accounts'

const client = new x402Client()
registerExactEvmScheme(client, {
  signer: privateKeyToAccount(process.env.WALLET_PRIVATE_KEY),
})

const fetchWithPayment = wrapFetchWithPayment(fetch, client)

const res = await fetchWithPayment(
  'https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/portfolio'
)
const data = await res.json()
```

## How it works

```
  Client                     Zerion API
    |                             |
    |  1. GET /v1/wallets/...     |
    | --------------------------> |
    |                             |
    |  2. 402 Payment Required    |
    | <-------------------------- |
    |     PAYMENT-REQUIRED:       |
    |     <challenge>             |
    |                             |
    |  3. GET /v1/wallets/...     |
    |     PAYMENT-SIGNATURE:      |
    |     <signed payment>        |
    | --------------------------> |
    |                             |
    |  4. 200 OK                  |
    | <-------------------------- |
    |                             |
```

1. Client sends a request to an API endpoint
2. Server returns `402` with a `PAYMENT-REQUIRED` header describing where and how much to pay
3. Client signs a USDC transfer and retries with a `PAYMENT-SIGNATURE` header
4. Zerion settles the payment via the Coinbase Developer Platform and returns the response

## Rate limits

None - pay per request, no per-second or monthly quota.

## Error handling

* `402 Payment required` - no or invalid payment signature. Inspect the `PAYMENT-REQUIRED` response header for a fresh challenge and retry.
* `402 x402 payment rejected` - the facilitator rejected the signature. The `detail` field contains the reason.
* `402 x402 payment settlement failed` - the signature was valid but on-chain settlement failed.

See the [Coinbase x402 troubleshooting docs](https://docs.cdp.coinbase.com/x402/support/troubleshooting#common-errors) for more.


# Zerion CLI and agent skills for AI coding tools
Source: https://developers.zerion.io/build-with-ai/zerion-cli

Analyze wallets, sign, swap, and bridge across EVM chains and Solana from the command line, plus agent skills that ship across every major AI coding agent.

The Zerion CLI is an open-source tool that wraps the Zerion API and a local encrypted wallet vault. The same binary powers both humans and AI agents - any agent that can run shell commands can analyze wallets, sign messages, and execute swaps without writing API integration code. Wallet management is built on the [Open Wallet Standard](https://github.com/open-wallet-standard/core).

Six agent skills ship alongside the CLI for AI coding agents (Claude Code, Cursor, Windsurf, Codex, Gemini, OpenCode, and any [agentskills.io](https://agentskills.io) host).

**Repository:** [github.com/zeriontech/zerion-ai](https://github.com/zeriontech/zerion-ai) - CLI and skills ship from the same repo.

<Note>
  **Alpha Preview** - The CLI is under active development. Commands, flags, and output formats may change between releases. Don't depend on current behavior in production workflows.
</Note>

## Installation

One-shot setup - installs the CLI globally, configures your API key, and adds skills across all detected coding agents:

```bash theme={null}
npx -y zerion-cli init -y --browser
```

* `-y` runs setup non-interactively
* `--browser` opens [dashboard.zerion.io](https://dashboard.zerion.io) so you can grab an API key and paste it back
* Skills install globally to every detected AI coding agent

Or install the CLI binary on its own:

```bash theme={null}
npm install -g zerion-cli
```

Requires Node.js 20 or later.

## Authentication

Three options. The CLI auto-detects which is active.

### API key (recommended)

Get a free key at [dashboard.zerion.io](https://dashboard.zerion.io). Keys begin with `zk_`.

```bash theme={null}
export ZERION_API_KEY="zk_..."
```

Or persist it via config:

```bash theme={null}
zerion config set apiKey zk_...
```

Required for analysis and trading. Analysis can also use x402 / MPP pay-per-call.

### x402 pay-per-call

No API key needed. Pays \$0.01 USDC per request via the [x402 protocol](https://www.x402.org/). Supports EVM (Base) and Solana.

```bash theme={null}
export WALLET_PRIVATE_KEY="0x..."     # EVM (Base) - 0x-prefixed hex
export WALLET_PRIVATE_KEY="5C1y..."   # Solana - base58 keypair

zerion analyze 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --x402
```

Enable globally:

```bash theme={null}
export ZERION_X402=true
```

Both chains simultaneously:

```bash theme={null}
export EVM_PRIVATE_KEY="0x..."
export SOLANA_PRIVATE_KEY="5C1y..."
export ZERION_X402_PREFER_SOLANA=true
```

<Note>
  Pay-per-call applies to analytics commands only (`portfolio`, `positions`, `history`, `pnl`, `analyze`). Trading commands always use an API key.
</Note>

### MPP pay-per-call

No API key needed. Pays \$0.01 USDC per request via the [MPP protocol](https://mpp.dev) on [Tempo](https://tempo.xyz). EVM only.

```bash theme={null}
export WALLET_PRIVATE_KEY="0x..."     # or a dedicated key:
export TEMPO_PRIVATE_KEY="0x..."

zerion portfolio 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --mpp
```

Enable globally:

```bash theme={null}
export ZERION_MPP=true
```

## Skills

The CLI ships with six agent skills that install into AI coding agents. Each skill is self-contained - your agent loads the relevant one based on the user's intent.

| Skill                     | What it does                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `zerion`                  | Umbrella entry - install, authentication, routing to capability skills, chains reference       |
| `zerion-analyze`          | Read-only wallet insights: portfolio, positions, history, PnL, watchlist (supports x402 / MPP) |
| `zerion-trading`          | Swap, bridge, send tokens (on-chain actions; needs API key + agent token)                      |
| `zerion-sign`             | Off-chain signing - sign-message (EIP-191 / raw), sign-typed-data (EIP-712)                    |
| `zerion-wallet`           | Wallet management - create, import, list, fund, backup, delete, sync                           |
| `zerion-agent-management` | Agent tokens + policies (the autonomous-trading primitives)                                    |

Install or reinstall skills:

```bash theme={null}
zerion setup skills                          # all detected agents (default: global)
zerion setup skills --agent claude-code      # scope to one agent
zerion setup skills -g                       # force global install
```

Per-host plugin installs (alternative to `setup skills`):

```bash theme={null}
# Claude Code
/plugin marketplace add zeriontech/zerion-ai
/plugin install zerion-agent@zerion

# OpenAI Codex CLI
codex plugin marketplace add zeriontech/zerion-ai
# then run /plugins, choose the zerion marketplace, install zerion-agent

# Cursor
npx skills add zeriontech/zerion-ai --agent cursor

# OpenCode
npx skills add zeriontech/zerion-ai --agent opencode

# Gemini CLI
gemini extensions install https://github.com/zeriontech/zerion-ai

# Any agentskills.io host
npx skills add zeriontech/zerion-ai
```

## Manual setup, agent execution

The CLI splits cleanly into two surfaces, by design.

* **Wallet management and agent token setup are manual.** `wallet create`, `import`, `backup`, and `delete` prompt for a passphrase. `wallet sync` emits a QR code you scan with the Zerion app. `agent create-token` mints a scoped trading credential bound to a specific wallet, and `agent create-policy` attaches the rules it must obey - allowed chains, expiry, transfer/approval gates, contract allowlists. No key material moves and no spending credential widens without you in the loop.
* **Analysis, signing, trading, and discovery are for agents.** `analyze`, `portfolio`, `positions`, `history`, `pnl`, `sign-message`, `sign-typed-data`, `swap`, `bridge`, `send`, `search`, `chains`, and read-only listings emit JSON to stdout, structured errors to stderr, and skip confirmation dialogs. Once an agent token is configured, signing and trading fire immediately.

You stage by hand once - create or import a wallet, set a passphrase, mint an agent token, attach a policy - then hand the agent token to an automation that can only do what the policy allows. Treat agent tokens like API keys with spending power.

## Commands

Every command supports `--help` for full flag documentation. Run `zerion --help` for the top-level command list.

### Analyze

Read-only wallet insights. Supports `--x402` and `--mpp` for pay-per-call.

```bash theme={null}
# Full analysis - portfolio, positions, transactions, PnL in parallel
zerion analyze vitalik.eth

# Targeted reads
zerion portfolio 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
zerion positions vitalik.eth --defi                 # grouped by protocol, loans netted
zerion positions vitalik.eth --positions defi       # flat list of DeFi positions
zerion history vitalik.eth --limit 10 --chain ethereum
zerion pnl vitalik.eth
```

#### Analyze options

| Command                           | Description                                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `zerion analyze <address\|ens>`   | Full analysis - portfolio, positions, transactions, PnL in parallel                                |
| `zerion portfolio <address\|ens>` | Portfolio value and top positions                                                                  |
| `zerion positions <address\|ens>` | Token + DeFi positions (`--positions all\|simple\|defi`, or `--defi` for grouped-by-protocol view) |
| `zerion history <address\|ens>`   | Transaction history (`--limit`, `--chain`)                                                         |
| `zerion pnl <address\|ens>`       | Profit & loss (realized, unrealized, fees)                                                         |
| `zerion search <query>`           | Search tokens by name or symbol                                                                    |
| `zerion chains`                   | List supported chains                                                                              |

### Trade

Requires an API key plus an agent token for unattended use. Chain is the first positional argument.

```bash theme={null}
# Same-chain swap - zerion swap <chain> <amount> <from> <to>
zerion swap base 1 USDC ETH
zerion swap ethereum 0.1 ETH USDC
zerion swap solana 0.1 SOL USDC
zerion swap monad 1 USDC MON

# List tokens available for swap on a chain
zerion swap tokens base
zerion swap tokens solana

# Bridge - zerion bridge <from-chain> <from-token> <amount> <to-chain> <to-token>
# Default: list all provider offers (no transaction signed)
zerion bridge base USDC 5 arbitrum USDC

# Execute the highest-output offer
zerion bridge base USDC 5 arbitrum USDC --cheapest

# Execute the fastest offer
zerion bridge base USDC 5 arbitrum USDC --fast

# Bridge + swap on destination
zerion bridge base USDC 5 arbitrum ETH --cheapest

# Cross-format bridge (EVM ↔ Solana) - destination wallet required if source is EVM-only or Solana-only
zerion bridge ethereum USDC 50 solana USDC --to-wallet sol-bot --cheapest
zerion bridge ethereum USDC 50 solana USDC --to-address 8xLdox... --cheapest

# Send - chain auto-detected from recipient format
zerion send USDC 50 --to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --chain base
zerion send SOL 0.1 --to 2Nsnn...
```

#### Trade options

| Command                                                                  | Description                                                                |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `zerion swap <chain> <amount> <from-token> <to-token>`                   | Same-chain swap                                                            |
| `zerion swap tokens [chain]`                                             | List tokens available for swap                                             |
| `zerion bridge <from-chain> <from-token> <amount> <to-chain> <to-token>` | List all bridge providers (multi-offer mode; no execute)                   |
| `zerion bridge ... --cheapest`                                           | Execute the highest-output offer                                           |
| `zerion bridge ... --fast`                                               | Execute the lowest-time offer (falls back to `--cheapest` if no time data) |
| `zerion bridge ... --to-wallet <name>`                                   | Destination wallet for cross-format bridges (Solana ↔ EVM)                 |
| `zerion bridge ... --to-address <addr>`                                  | Raw destination address (must match destination-chain format)              |
| `zerion send <token> <amount> --to <address>`                            | Send tokens (chain auto-inferred from address format)                      |
| `zerion send SOL <amount> --to <solana-pubkey>`                          | Send native SOL on Solana                                                  |

<Note>
  `--fast` and `--cheapest` are mutually exclusive. When used, the strategy flag must come last on the command line so flag parsing doesn't consume the next positional as its value. Single-offer routes auto-execute even without a strategy flag.
</Note>

### Sign

Off-chain signatures (EIP-191, EIP-712, Solana raw) - no broadcast. Requires an agent token.

```bash theme={null}
# EIP-191 (EVM) or raw (Solana)
zerion sign-message "Login to dApp" --chain ethereum

# Hex bytes
zerion sign-message 0xdeadbeef --encoding hex --chain ethereum

# EIP-712 typed data
zerion sign-typed-data --data "$(cat permit.json)"
zerion sign-typed-data --file permit.json
cat permit.json | zerion sign-typed-data
```

#### Sign options

| Command                                         | Description                                |
| ----------------------------------------------- | ------------------------------------------ |
| `zerion sign-message <message> --chain <chain>` | Sign EIP-191 (EVM) or raw (Solana) message |
| `zerion sign-message <message> --encoding hex`  | Treat message as hex bytes                 |
| `zerion sign-typed-data --data '<json>'`        | Sign EIP-712 typed data (EVM only)         |
| `zerion sign-typed-data --file <path>`          | Read EIP-712 typed data from file          |

### Wallet

Encrypted local wallets. EVM + Solana supported. Passphrase required for destructive ops.

```bash theme={null}
zerion wallet create --name trading-bot
zerion wallet import --name old-wallet --evm-key
zerion wallet list
zerion wallet fund --wallet trading-bot
zerion wallet backup --wallet trading-bot
zerion wallet sync --wallet trading-bot
```

#### Wallet options

| Command                                         | Description                                  |
| ----------------------------------------------- | -------------------------------------------- |
| `zerion wallet create --name <name>`            | Create encrypted wallet (EVM + Solana)       |
| `zerion wallet import --name <name> --evm-key`  | Import from EVM private key (interactive)    |
| `zerion wallet import --name <name> --sol-key`  | Import from Solana private key (interactive) |
| `zerion wallet import --name <name> --mnemonic` | Import from seed phrase (all chains)         |
| `zerion wallet list`                            | List all wallets                             |
| `zerion wallet fund`                            | Show deposit addresses for funding           |
| `zerion wallet backup --wallet <name>`          | Export recovery phrase                       |
| `zerion wallet delete <name>`                   | Permanently delete a wallet                  |
| `zerion wallet sync --wallet <name>`            | Sync wallet to Zerion app via QR code        |
| `zerion wallet sync --all`                      | Sync all wallets                             |

### Agent

Scoped API tokens for unattended trading. Tokens auto-save to config and are required for `swap`, `bridge`, `send`.

```bash theme={null}
# Create a tight policy first
zerion agent create-policy --name safe-base \
  --chains base \
  --expires 24h \
  --deny-transfers

# Mint a token bound to that policy
zerion agent create-token --name dca-bot \
  --wallet trading-bot \
  --policy safe-base
```

#### Agent token options

| Command                                                    | Description                   |
| ---------------------------------------------------------- | ----------------------------- |
| `zerion agent create-token --name <bot> --wallet <wallet>` | Create scoped token           |
| `zerion agent list-tokens`                                 | List active agent tokens      |
| `zerion agent use-token --wallet <wallet>`                 | Switch active token by wallet |
| `zerion agent revoke-token --name <bot>`                   | Revoke a token                |

#### Agent policy options

| Command                                      | Description                          |
| -------------------------------------------- | ------------------------------------ |
| `zerion agent create-policy --name <policy>` | Create security policy (flags below) |
| `zerion agent list-policies`                 | List all policies                    |
| `zerion agent show-policy <id>`              | Show policy details                  |
| `zerion agent delete-policy <id>`            | Delete a policy                      |

#### Policy flags

| Flag                      | Description                                   |
| ------------------------- | --------------------------------------------- |
| `--chains <list>`         | Restrict to specific chains (comma-separated) |
| `--expires <duration>`    | Token expiry (e.g. `24h`, `7d`)               |
| `--deny-transfers`        | Block raw ETH/native transfers                |
| `--deny-approvals`        | Block ERC-20 approval calls                   |
| `--allowlist <addresses>` | Only allow listed contract/wallet addresses   |

### Watch

Track wallets by name without exposing addresses in commands.

```bash theme={null}
zerion watch 0xFe89Cc7Abb2C4183683Ab71653c4cCd1b9cC194e --name ens-dao
zerion analyze ens-dao
```

#### Watch options

| Command                                 | Description             |
| --------------------------------------- | ----------------------- |
| `zerion watch <address> --name <label>` | Add wallet to watchlist |
| `zerion watch list`                     | List watched wallets    |
| `zerion watch remove <name>`            | Remove from watchlist   |

### Setup

| Command                                   | Description                                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `zerion init`                             | One-shot onboarding - install CLI globally, configure API key, install agent skills |
| `zerion init -y --browser`                | Non-interactive init that opens dashboard.zerion.io for the API key                 |
| `zerion setup skills`                     | Install Zerion agent skills into detected coding agents                             |
| `zerion setup skills --agent claude-code` | Install into a specific agent                                                       |

### Config

| Command                           | Description                                                        |
| --------------------------------- | ------------------------------------------------------------------ |
| `zerion config set <key> <value>` | Set config (`apiKey`, `defaultWallet`, `defaultChain`, `slippage`) |
| `zerion config unset <key>`       | Remove a config value (resets to default)                          |
| `zerion config list`              | Show current configuration                                         |

## Global options

| Flag                            | Description                                                                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `--wallet <name>`               | Source wallet (default: from config)                                                                                                           |
| `--address <addr\|ens>`         | Use raw address or ENS name                                                                                                                    |
| `--watch <name>`                | Use watched wallet by name                                                                                                                     |
| `--chain <chain>`               | Chain for analysis commands (default: `ethereum`)                                                                                              |
| `--to-wallet <name>`            | Destination wallet for cross-format `bridge` (Solana ↔ EVM)                                                                                    |
| `--to-address <addr>`           | Raw destination address for `bridge` (must match destination-chain format)                                                                     |
| `--positions all\|simple\|defi` | Filter positions type                                                                                                                          |
| `--defi`                        | On `positions`: shorthand for `--positions defi` with output grouped by protocol - LP tokens pooled by `group_id`, loans netted in `net_value` |
| `--limit <n>`                   | Limit results (default: 20)                                                                                                                    |
| `--offset <n>`                  | Skip first N results                                                                                                                           |
| `--search <query>`              | Filter wallets by name or address                                                                                                              |
| `--slippage <percent>`          | Slippage tolerance (default: 2%, max: 3%)                                                                                                      |
| `--timeout <sec>`               | Confirmation timeout for trades (default: 120s)                                                                                                |
| `--cheapest`                    | For `bridge`: execute the highest-output offer                                                                                                 |
| `--fast`                        | For `bridge`: execute the lowest-time offer                                                                                                    |
| `--x402`                        | Pay-per-call on Base or Solana (analytics only)                                                                                                |
| `--mpp`                         | Pay-per-call on Tempo (analytics only)                                                                                                         |
| `--json`                        | JSON output (default)                                                                                                                          |
| `--pretty`                      | Human-readable output                                                                                                                          |
| `--quiet`                       | Minimal output                                                                                                                                 |

## Environment variables

| Variable                    | Description                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| `ZERION_API_KEY`            | API key (get at [dashboard.zerion.io](https://dashboard.zerion.io))                             |
| `WALLET_PRIVATE_KEY`        | Pay-per-call key. `0x...` → x402 on Base; `base58` → x402 on Solana; `0x...` also works for MPP |
| `EVM_PRIVATE_KEY`           | EVM key for x402 on Base (overrides `WALLET_PRIVATE_KEY` for EVM)                               |
| `SOLANA_PRIVATE_KEY`        | Solana key for x402 on Solana (overrides `WALLET_PRIVATE_KEY` for Solana)                       |
| `TEMPO_PRIVATE_KEY`         | EVM key for MPP on Tempo (overrides `WALLET_PRIVATE_KEY` for MPP)                               |
| `ZERION_X402`               | `true` enables x402 globally (analytics only)                                                   |
| `ZERION_X402_PREFER_SOLANA` | `true` prefers Solana over Base when both keys set                                              |
| `ZERION_MPP`                | `true` enables MPP globally (analytics only)                                                    |
| `SOLANA_RPC_URL`            | Custom Solana RPC endpoint                                                                      |
| `ETH_RPC_URL`               | Custom Ethereum RPC endpoint (used for ENS resolution)                                          |

## Supported chains

`ethereum`, `base`, `arbitrum`, `optimism`, `polygon`, `binance-smart-chain`, `avalanche`, `gnosis`, `scroll`, `linea`, `zksync-era`, `zora`, `blast`, `monad`, `solana`.

Solana supports same-chain swaps and bidirectional bridging to/from EVM chains. Cross-format bridges (Solana ↔ EVM) require an explicit destination via `--to-wallet <name>` or `--to-address <addr>` matching the target chain's format, unless the source wallet is mnemonic-derived and already has an account on the destination chain.

Run `zerion chains` for the live catalog with metadata.

## Output handling

All commands emit JSON to stdout (default) for agent compatibility. Errors emit JSON to stderr with a `code` field for programmatic handling.

```bash theme={null}
zerion portfolio vitalik.eth                 # JSON (default)
zerion portfolio vitalik.eth --pretty        # human-readable
zerion portfolio vitalik.eth --quiet         # minimal output
```

The CLI surfaces structured error codes for: missing or invalid API key, invalid address or ENS resolution failure, unsupported chain, empty wallets, rate limits (HTTP 429), upstream timeouts, slippage exceeded, and bridge route unavailable.

## Examples

### Quick wallet check

```bash theme={null}
zerion analyze vitalik.eth
```

### DeFi-only positions on a single chain

```bash theme={null}
zerion positions vitalik.eth --positions defi --chain ethereum
```

### Stage an autonomous trading bot

```bash theme={null}
# 1. Create wallet
zerion wallet create --name trading-bot

# 2. Tight policy (Base only, 7-day expiry, no transfers)
zerion agent create-policy --name swap-only \
  --chains base \
  --expires 7d \
  --deny-transfers

# 3. Mint a scoped agent token
zerion agent create-token --name dca-bot \
  --wallet trading-bot \
  --policy swap-only

# 4. Agent can now swap on Base autonomously
zerion swap base 100 USDC ETH
```

### Cross-chain bridge with provider choice

```bash theme={null}
# 1. See every available route
zerion bridge base USDC 5 arbitrum USDC

# 2. Pick the fastest
zerion bridge base USDC 5 arbitrum USDC --fast

# 3. Or pick the highest output
zerion bridge base USDC 5 arbitrum USDC --cheapest
```

### SIWE login for a dapp

```bash theme={null}
zerion sign-message "Sign in to dApp" --chain ethereum
```

### Pay-per-call without an API key

```bash theme={null}
export WALLET_PRIVATE_KEY="0x..."
zerion portfolio vitalik.eth --x402
```

### Compose with `jq`

```bash theme={null}
zerion portfolio vitalik.eth | jq '.totals.positions'
zerion history vitalik.eth --limit 50 | jq '.transactions[] | select(.type == "trade")'
```

## Open source

The CLI and skills are MIT-licensed and open to contribution.

* **CLI + skills:** [github.com/zeriontech/zerion-ai](https://github.com/zeriontech/zerion-ai)
* **API docs:** [developers.zerion.io](https://developers.zerion.io)
* **Get an API key:** [dashboard.zerion.io](https://dashboard.zerion.io)


# Zerion API changelog
Source: https://developers.zerion.io/changelog

Release notes for the Zerion API, including new endpoints, response format changes, error code updates, bug fixes, and breaking change notices.

<Update label="August 14, 2026" description="Truthful PnL error responses">
  ## PnL endpoints no longer ask you to retry requests that cannot succeed

  Requests that can never be served now return a status code that says so, instead of one that invites a pointless retry loop.

  * **Wallets with over 1 million actions** previously returned `503` with a `Retry-After` header, even though retrying could never succeed. They now return `422` with no `Retry-After` header.
  * **Addresses Zerion does not track** previously surfaced as a `500 Internal Server Error`. They now return `400` naming the address. This covers contract addresses that are not recognized smart-contract wallets, burn addresses, and high-volume addresses such as exchange hot wallets. Smart-contract wallets like Safe and ERC-4337 accounts are tracked as normal.

  Genuinely transient conditions are unchanged: a cold wallet still returns `503` with `Retry-After`, and retrying still works. If you already retry on `503`, that logic keeps working — but a `503` now means the retry will actually help.

  **Affected endpoints:**

  * `GET /v1/wallets/{address}/pnl`
  * `GET /v1/wallet-sets/pnl`
</Update>

<Update label="August 13, 2026" description="Documentation">
  ## `rwa_class` documentation clarified

  Two wording changes to the `rwa_class` field, both documentation-only — its values and availability are unchanged.

  * The description previously said the field was returned "for callers with access to this field", which didn't say how that access is obtained. It now states that the field is a paid add-on enabled per organization.
  * The `unknown` value no longer carries a "safe to block by default" recommendation. Whether an unclassified-but-likely RWA should be blocked, flagged, or simply labelled depends on what you are building, so the documentation now describes what the value means and leaves the handling to you.

  **Affected endpoints:**

  * `GET /v1/fungibles/`
  * `GET /v1/fungibles/{fungible_id}`
  * `GET /v1/fungibles/by-implementation?implementation={chain}:{address}`
</Update>

<Update label="August 6, 2026" description="Documentation">
  ## Wallet NFT endpoints now correctly document EVM-only addresses

  The wallet NFT endpoints previously documented the shared `address` parameter as accepting either an EVM or Solana address. Zerion's NFT data does not support Solana wallets, so these endpoints now document an EVM-only address parameter. This is a documentation-only clarification — the endpoints have always rejected Solana addresses with a `400`; the parameter description simply didn't reflect that.

  **Affected endpoints:**

  * `GET /v1/wallets/{address}/nft-positions/`
  * `GET /v1/wallets/{address}/nft-collections/`
  * `GET /v1/wallets/{address}/nft-portfolio`
</Update>

<Update label="August 3, 2026" description="Fungible real-world asset classification">
  ## Real-world asset classification for fungibles

  API customers with the `rwa` role can receive an optional `rwa_class` in fungible attributes: `commodity`, `tokenized_stock`, `tokenized_treasury`, `stablecoin`, `other_financial`, `other_non_financial`, or `unknown`. These values distinguish tokenized commodities, equities and ETFs, treasury and government-debt products, fiat-pegged stablecoins, other classified financial instruments, non-financial real-world assets, and likely RWAs awaiting classification. The field is omitted when an asset is unclassified or its classification has been cleared.

  **Affected endpoints:**

  * `GET /v1/fungibles/`
  * `GET /v1/fungibles/{fungible_id}`
  * `GET /v1/fungibles/by-implementation?implementation={chain}:{address}`
</Update>

<Update label="July 17, 2026" description="Pool filtering for balance charts">
  ## Filter wallet balance charts by liquidity-pool / vault position

  New `filter[pool_addresses]` and `filter[exclude_pool_addresses]` query parameters on the wallet and wallet-set balance chart endpoints scope the chart to specific liquidity-pool / vault positions by contract address — the Uniswap V2 LP-token or ERC-4626 vault (e.g. Morpho) address. Pass up to 25 addresses. `filter[pool_addresses]` charts only the matching protocol positions; `filter[exclude_pool_addresses]` removes them while keeping the rest of the portfolio. The two are mutually exclusive — combining them returns `400`. These filters select complex (protocol) positions, so combining either with `filter[positions]=only_simple` also returns `400`.

  **Affected endpoints:**

  * `GET /v1/wallets/{address}/charts/{chart_period}`
  * `GET /v1/wallet-sets/charts/{chart_period}`
</Update>

<Update label="July 17, 2026" description="DeFi position receipt tokens">
  ## Receipt tokens for DeFi positions

  Wallet and wallet-set position responses now include an optional receipt for a token representing a DeFi position.

  **Affected endpoints:**

  * `GET /v1/wallets/{address}/positions/`
  * `GET /v1/wallet-sets/positions/`
</Update>

<Update label="June 8, 2026" description="Documentation">
  ## Chart point granularity documented for balance & price charts

  Documented the sampling interval (spacing between `points`) for each `chart_period` on the chart endpoints. This is a documentation-only clarification — the cadence has always been emitted by these endpoints; it simply wasn't described in the reference.

  Each period samples its time window at a fixed interval: `hour` → 10s, `day` → 5m, `week` → 30m, `month` → 2h, `3months` → 6h, `6months` → 12h, `year` → 1d, `5years` → 4d. For `max`, the interval is derived from available history (so it varies by wallet or asset).

  **Affected endpoints:**

  * `GET /v1/wallets/{address}/charts/{chart_period}`
  * `GET /v1/wallet-sets/charts/{chart_period}`
  * `GET /v1/fungibles/{fungible_id}/charts/{chart_period}`
  * `GET /v1/fungibles/by-implementation/charts/{chart_period}`
</Update>

<Update label="June 4, 2026" description="New feature">
  ## Wallet balance charts — include DeFi protocol positions

  Added `filter[positions]` to the wallet and wallet-sets balance chart endpoints, letting you include complex DeFi protocol positions (liquidity pools, vaults) alongside plain token balances:

  * `only_simple` (default) — token and native-coin balances held directly in the wallet. Matches previous behavior, so existing integrations are unaffected.
  * `only_complex` — complex DeFi protocol positions only.
  * `no_filter` — both.

  **Uniswap V2 LP positions are supported today**, and support for more protocols is rolling out over time. Positions from protocols that aren't yet supported are omitted from the chart.

  **Affected endpoints:**

  * `GET /v1/wallets/{address}/charts/{chart_period}`
  * `GET /v1/wallet-sets/charts/{chart_period}`

  ```bash theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8da6bf26964af9d7eed9e03e53415d37aa96045/charts/day?filter[positions]=no_filter"
  ```
</Update>

<Update label="June 1, 2026" description="Solana raw amounts">
  ## Raw on-chain amounts for Token-2022 ScaledUiAmount assets

  For Token-2022 ScaledUiAmount (rebasing) assets such as SPYx, `quantity.int` is now the objective on-chain **raw** amount in base units. Use this value to build correct on-chain transactions, including max-balance (send-max) transfers, which fail on-chain when built from the scaled display amount.

  * `quantity.int` — objective on-chain raw amount in base units.
  * `quantity.float` / `quantity.numeric` — ready-to-display value = `int / 10^decimals`. For ScaledUiAmount assets, the display value is `int × multiplier / 10^decimals`.

  Non-ScaledUiAmount assets are unaffected: their `int` already equals the on-chain amount.

  **Affected endpoints:**

  * `GET /v1/wallets/{address}/positions/`
  * `GET /v1/wallet-sets/positions/`

  **Breaking change:** For ScaledUiAmount assets, `quantity.int` previously carried the scaled display amount and now carries the raw on-chain amount. Read the display value from `quantity.float` or `quantity.numeric`.
</Update>

<Update label="May 29, 2026" description="Limit increase">
  ## Wallet NFT positions — page size cap raised to 500

  `GET /v1/wallets/{address}/nft-positions/` now accepts `page[size]` values up to **500** (previously capped at 100). This lets you fetch large NFT wallets in significantly fewer requests. Existing requests are unaffected — this only raises the maximum; the default page size is **50**.

  **Affected endpoint:**

  * `GET /v1/wallets/{address}/nft-positions/`

  ```bash theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0x.../nft-positions/?page[size]=500"
  ```

  **Migration:** No client changes required. To reduce round-trips on large wallets, raise `page[size]` up to 500 and keep following the `links.next` cursor to paginate.
</Update>

<Update label="May 19, 2026" description="Limit increase">
  ## Find wallets within subscription — page size cap raised to 2000

  `GET /v1/tx-subscriptions/{subscription_id}/wallets` now accepts `page[size]` values up to **2000** (previously capped at 100). The default page size remains 100, so existing clients are unaffected.

  **Affected endpoint:**

  * `GET /v1/tx-subscriptions/{subscription_id}/wallets`

  ```bash theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/tx-subscriptions/77e77447-1586-40e8-a75b-467ef939a0b1/wallets?page[size]=2000"
  ```
</Update>

<Update label="May 13, 2026" description="New feature">
  ## Wallet balance charts — exclude fungibles

  Added `filter[exclude_fungible_ids]` to the wallet and wallet-sets balance chart endpoints — drop a small set of tokens from the chart instead of enumerating everything you want to keep. Same shape as `filter[fungible_ids]`: comma-separated, capped at 25 ids. Combining it with `filter[fungible_ids]` returns `400` — pick one.

  **Affected endpoints:**

  * `GET /v1/wallets/{address}/charts/{chart_period}`
  * `GET /v1/wallet-sets/charts/{chart_period}`

  ```bash theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8da6bf26964af9d7eed9e03e53415d37aa96045/charts/day?filter[exclude_fungible_ids]=eth,usd-coin"
  ```
</Update>

<Update label="May 13, 2026" description="Endpoint deprecation">
  ## Swap Offers API — deprecated

  `GET /v1/swap/offers/` is now deprecated and has been hidden from the API reference. Use `GET /v1/swap/quotes/` instead, which covers the same use cases and adds native support for Solana and EVM ↔ Solana bridges.

  **Sunset date:** the endpoint will be permanently disabled on **July 1, 2026**. Requests after that date will fail.

  **Migration:**

  * Switch calls from `GET /v1/swap/offers/` to `GET /v1/swap/quotes/`.
  * The response body shape differs: transactions are wrapped in chain-agnostic `evm` / `solana` envelopes, and fees are split into separate `protocol_fee` / `bridge_fee` / `network_fee` blocks. See the Swap Quotes reference for the full schema.
  * Quotes are returned best-first (sorted by `output_amount_after_fees`), matching the ordering you already get from `/v1/swap/offers/`.
</Update>

<Update label="May 8, 2026" description="Documentation clarifications">
  ## Reference docs — clarifications across PnL, swap, and wallet endpoints

  Refreshed several reference-doc descriptions to better match how the API actually behaves. **No behavior changes** — every update describes behavior that's already live in production.

  **Clarifications:**

  * **PnL `since` / `till` is a hard limit, not a guideline** (`GET /wallets/{address}/pnl`, `GET /wallet-sets/pnl`). PnL is pre-computed at standard marks (`now`, `1 day ago`, `1 week ago`, `1 month ago`, `1 year ago`, `beginning of the year`); other timestamps are accepted only when fewer than 3,000 transactions sit between your timestamp and the nearest mark, otherwise the request errors out.
  * **Swap endpoints rewritten** (`GET /v1/swap/offers/`, `GET /v1/swap/fungibles/`). `/v1/swap/offers/` returns ready-to-sign transaction data in a single call (0.8% Zerion fee included in the quoted amounts) — not a multi-step quote-then-execute flow as previously documented. `/v1/swap/fungibles/` is a token-picker helper for cross-chain swaps only.
  * **Swap section reordered** to `quotes` → `offers` → `fungibles`, surfacing `/v1/swap/quotes/` as the modern primary endpoint.
  * **Wallet address validation documented** (`WalletAddress` parameter, `GET /wallets/{address}/transactions/`). Addresses must be valid EVM or Solana; untracked addresses return `400` (API-1903).
  * **`filter[operation_types]` duplicated enum removed** (`GET /wallets/{address}/transactions/`, `GET /wallets/transactions/`, `GET /wallet-sets/transactions/`). The bulleted list was rendered twice and the inline copy was stale (missing `bid`); the schema `$ref` is now the single source of truth.
  * **`PATCH /v1/tx-subscriptions/{id}/wallets` 100-address batch cap documented**. The `add` and `remove` arrays accept at most 100 addresses per request; `maxItems: 100` is now in the schema.

  **Migration:** No client changes required. API responses and error behavior are unchanged — these updates only correct the reference documentation to match the limits the API has already been enforcing.
</Update>

<Update label="May 6, 2026" description="Documentation fix">
  ## Webhooks — payload example fix

  Fixed two errors in the example payloads on the [Webhooks](/webhooks) page. **No breaking changes** — the production webhook payload format is unchanged; only the documentation examples were wrong.

  **Corrections:**

  * `data.type` is `"callback"` (the docs incorrectly showed `"transaction_notification"`).
  * The rollback indicator `deleted: true` is on the transaction resource at `included[0].attributes.deleted` (the docs incorrectly showed it on `data.attributes.deleted`).

  **Migration:** No client changes required. Verify your webhook handler reads the rollback flag from the transaction resource inside `included`, not from `data.attributes`.
</Update>

<Update label="May 5, 2026" description="New feature">
  ## Swap Quotes API — new endpoint

  Added `GET /v1/swap/quotes/` — returns swap quotes from multiple liquidity sources for both same-chain swaps and cross-chain bridges. Supports EVM chains and Solana, including EVM ↔ Solana bridges.

  ```bash theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/swap/quotes/?input[chain_id]=base&input[fungible_id]=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2&input[amount]=0.001&output[fungible_id]=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&from=0xd8da6bf26964af9d7eed9e03e53415d37aa96045&to=0xd8da6bf26964af9d7eed9e03e53415d37aa96045"
  ```

  **Differences from `/v1/swap/offers/`:**

  * Native support for Solana wallets and bridges between EVM and Solana chains.
  * The response body has been restructured: transactions are wrapped in chain-agnostic `evm`/`solana` envelopes, fees are split into separate `protocol_fee` / `bridge_fee` / `network_fee` blocks.

  The legacy `/v1/swap/offers/` endpoint remains for backward compatibility.
</Update>

<Update label="April 21, 2026" description="New feature">
  ## Transactions API — fee acts

  Transactions and acts may now carry the type `fee`, and a new `fee_kind` field on `Act` classifies fee acts. **No breaking changes** — this is an additive change.

  **New `fee` type value:**
  Both the transaction-level `type` enum and the per-act `type` (`ActType`) enum now include `fee`. A `fee`-typed act represents a fee charge that appears alongside existing acts in the transaction's `acts` array; a transaction whose primary operation is a fee charge will surface `type: fee` at the top level.

  **New `fee_kind` field on `Act`:**
  Optional string that classifies a fee act. Only present on acts of type `fee`.

  * **`ui`** — fee charged by the UI / client application (e.g., a wallet or dApp frontend)
  * **`jito`** — Jito tip paid on Solana for priority inclusion

  **Affected endpoints:**

  * `GET /wallets/{address}/transactions/`
  * `GET /wallet-sets/transactions/`

  **Migration:** No client changes required. Clients that enumerate transaction or act types should be prepared to receive `fee` in addition to the previously documented values; unknown types should be handled gracefully. To surface fee acts to end users, render acts with `type: fee` and optionally distinguish them by `fee_kind`.
</Update>

<Update label="March 30, 2026" description="New feature">
  ## Wallet Sets API — new endpoints

  Added five new endpoints for wallet sets — aggregated portfolio data across up to one EVM and one Solana address simultaneously.

  Pass one or two addresses via the `addresses` query parameter (at most one EVM and one Solana address):

  ```bash theme={null}
  curl -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallet-sets/portfolio?addresses=0x42b9df65b219b3dd36ff330a4dd8f327a6ada990,8BH9pjtgyZDC4iAQH5ZiYDZ1MDWC98xki2V8NzqqKW3K"
  ```

  **New endpoints:**

  * `GET /wallet-sets/portfolio`
  * `GET /wallet-sets/positions/`
  * `GET /wallet-sets/transactions/`
  * `GET /wallet-sets/charts/{chart_period}`
  * `GET /wallet-sets/pnl`
</Update>

<Update label="March 20, 2026" description="New feature">
  ## Fungibles API — sort by trading volume

  Added 24-hour trading volume as a new sort option for `GET /fungibles/`.

  * **`-market_data.trading_volumes.volume_1d`** — highest volume first
  * **`market_data.trading_volumes.volume_1d`** — lowest volume first

  ```bash theme={null}
  curl -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/fungibles/?sort=-market_data.trading_volumes.volume_1d"
  ```
</Update>

<Update label="March 11, 2026" description="New feature">
  ## Fungibles API — new fields

  Added trading volume and deployment date fields to fungible data. **No breaking changes.**

  **New fields in `FungibleAttributes.market_data`:**

  * `trading_volumes.volume_1d` — total 24-hour trading volume across all chains

  **New fields in `AttributesImplementation`** (new dedicated type for `implementations` array, backward compatible with all existing fields):

  * `market_data.trading_volumes.volume_1d` — 24-hour trading volume on this chain
  * `deployment_date` — ISO 8601 datetime when the token contract was deployed
</Update>

<Update label="February 9, 2026" description="Documentation fix">
  ## Transactions API — OpenAPI documentation fix

  Fixed OpenAPI schema inconsistencies between documentation and implementation for the `/transactions` endpoints. **No breaking changes** — API responses remain unchanged, only the OpenAPI spec was corrected.

  **Nullable fields corrected:**

  * **Fee**: `fungible_info`, `price`, `value` marked as nullable
  * **Refund**: `fungible_info`, `price`, `value` marked as nullable
  * **Transfer**: `price`, `value` marked as nullable
  * **Fungible Info**: `icon` marked as nullable

  **Missing fields documented:**

  * Transaction attributes: `address`, `refund`, `delegations`
  * Fungible Info: `id`

  **Migration:** No client changes required. Clients using generated models should ensure they handle `null` values, as these were already nullable in practice.
</Update>

<Update label="February 4, 2026" description="New feature">
  ## Chart periods — new time values

  Added two new time period values to the `chart_period` parameter:

  * **`6months`** — 6-month chart period
  * **`5years`** — 5-year chart period

  These complement the existing options: `hour`, `day`, `week`, `month`, `3months`, `year`, and `max`.

  **Affected endpoints:**

  * `GET /wallets/{address}/charts/{chart_period}`
  * `GET /fungibles/{fungible_id}/charts/{chart_period}`
  * `GET /fungibles/by-implementation/charts/{chart_period}`

  ```bash theme={null}
  curl -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA.../charts/6months"
  ```
</Update>

<Update label="January 7, 2026" description="New feature">
  ## Portfolio API — sync parameter

  Added new `sync` query parameter to the `/wallets/{address}/portfolio` endpoint.

  * **`true`**: Triggers a position sync and waits up to 30 seconds for fresh portfolio data before responding.
  * **`false`** (default): Returns immediately with cached data.

  ```bash theme={null}
  curl -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA.../portfolio?sync=true"
  ```

  Clients should configure appropriate timeout settings when using `sync=true`.
</Update>

<Update label="November 19, 2025" description="New feature">
  ## Positions API — sync parameter

  Added new `sync` query parameter to the `/wallets/{address}/positions` endpoint.

  * **`true`**: Waits up to 30 seconds for protocol positions to be updated and returns fresh data.
  * **`false`** (default): Returns immediately with available position data.

  ```bash theme={null}
  curl -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA.../positions?sync=true"
  ```

  Clients should configure appropriate timeout settings when using `sync=true`.
</Update>


# Endpoints and response schema
Source: https://developers.zerion.io/endpoints-and-schema

Overview of Zerion API endpoint categories for wallets, chains, fungibles, NFTs, and swaps, plus the JSON:API response envelope and resource object structure.

The Zerion API provides real-time, normalized access to onchain data through RESTful endpoints. All requests go to `https://api.zerion.io` and require [authentication](/authentication) via HTTP Basic Auth. Responses follow the [JSON:API](https://jsonapi.org/) specification.

## Endpoint categories

### [Wallets](/api-reference/wallets/get-wallet-portfolio)

Portfolio, positions, transactions, PnL, and NFTs - all scoped to a wallet address. This is the core of the API. Positions include both fungible tokens and DeFi protocol positions. NFT data is split into individual holdings, collections, and a portfolio summary.

All positions and transactions come with icons, labels, links, metadata, and relationships. Everything is ready to be immediately used in interfaces without additional interpretation or enrichment.

### [Fungibles](/api-reference/fungibles/get-list-of-fungible-assets)

Token metadata, pricing, and market data. Search and filter across all supported tokens, look up by Zerion ID or by chain and contract address, and fetch historical price charts.

### [Chains](/api-reference/chains/get-list-of-all-chains)

The full list of supported blockchains with metadata. Useful for populating chain selectors or validating chain IDs before making other calls.

### [NFTs](/api-reference/nfts/get-list-of-nfts)

Look up individual NFTs by reference or unique ID, with support for batch fetching.

### [Swap & Bridge](/api-reference/swap/get-swap-and-bridge-quotes)

Quotes for token swaps and cross-chain bridges, routed across DEXs and bridge protocols. First check which tokens are available for a route, then request offers.

### [Gas Prices](/api-reference/gas/get-list-of-all-available-gas-prices)

Current gas price estimates across all supported chains. Useful for displaying fee estimates or optimizing transaction timing.

### [DApps](/api-reference/dapps/get-list-of-dapps)

Metadata for decentralized applications - names, icons, and categories. DApp info is also embedded in position and transaction responses to provide context.

### [Subscriptions (Webhooks)](/api-reference/subscriptions-to-transactions/create-subscription)

Push-based notifications for wallet activity - no polling required. Create subscriptions, manage which wallets and chains to monitor, and update webhook URLs.

## Response structure

Every response follows a consistent [JSON:API](https://jsonapi.org/) format:

```json theme={null}
{
  "links": {
    "self": "https://api.zerion.io/v1/...",
    "next": "https://api.zerion.io/v1/...?page[after]=..."
  },
  "data": {
    "type": "positions",
    "id": "unique-id",
    "attributes": { ... },
    "relationships": { ... }
  }
}
```

| Field           | Description                                                        |
| --------------- | ------------------------------------------------------------------ |
| `links`         | Pagination - `self` for the current page, `next` for the next page |
| `data`          | A single resource object or an array of them                       |
| `type`          | Resource type (e.g., `positions`, `transactions`, `fungibles`)     |
| `id`            | Unique identifier for the resource                                 |
| `attributes`    | The resource's data fields                                         |
| `relationships` | Links to related resources                                         |

## Next steps

<CardGroup>
  <Card title="Pagination & Filtering" icon="filter" href="/pagination-and-filtering">
    Paginate results and apply filters.
  </Card>

  <Card title="Error Handling" icon="circle-exclamation" href="/error-handling">
    Error codes and how to handle them.
  </Card>

  <Card title="Rate Limits" icon="gauge" href="/rate-limits">
    Request limits and how to stay within them.
  </Card>
</CardGroup>


# Error handling and status codes
Source: https://developers.zerion.io/error-handling

Understand Zerion API error responses, HTTP status codes, rate-limit errors, and best practices for retry logic and exponential backoff in production apps.

The Zerion API uses standard HTTP status codes and returns structured error responses. This page covers what to expect and how to handle errors gracefully.

## Error response format

All errors return a JSON object with an `errors` array:

```json theme={null}
{
  "errors": [
    {
      "title": "Short error description",
      "detail": "A longer explanation of what went wrong"
    }
  ]
}
```

## HTTP status codes

| Status | Meaning              | When it happens                                                                         |
| ------ | -------------------- | --------------------------------------------------------------------------------------- |
| `200`  | Success              | Request completed successfully                                                          |
| `400`  | Bad Request          | Malformed parameters - check filter values, missing required fields, or invalid formats |
| `401`  | Unauthorized         | Missing or invalid API key                                                              |
| `404`  | Not Found            | The requested resource doesn't exist (single-resource endpoints only)                   |
| `422`  | Unprocessable Entity | The request cannot be served, and retrying will not change that                         |
| `429`  | Too Many Requests    | Rate limit exceeded                                                                     |
| `500`  | Server Error         | Unexpected error on Zerion's side - safe to retry with backoff                          |
| `503`  | Service Unavailable  | Data is still being prepared - retry after the delay in the `Retry-After` header        |

### 400 - Bad Request

Returned when query parameters are malformed or invalid. Check the `detail` field for specifics.

```json theme={null}
{
  "errors": [
    {
      "title": "Malformed parameter was sent",
      "detail": "chain {invalidchain} is not supported"
    }
  ]
}
```

**Common causes:**

* Invalid `filter[chain_ids]` value (e.g., a chain ID that doesn't exist)
* `page[size]` outside the allowed range (the maximum varies by endpoint)
* Missing required parameters (e.g., `filter[references]` on the NFTs endpoint)
* Malformed `filter[min_mined_at]` timestamp (must be exactly 13 digits, in milliseconds)
* An address Zerion doesn't track (see below)

#### Untracked addresses

The PnL, transactions and NFT endpoints only accept addresses that behave like user wallets, and reject anything else before doing any work:

```json theme={null}
{
  "errors": [
    {
      "title": "Malformed parameter was sent",
      "detail": "address 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 is not trackable"
    }
  ]
}
```

Rejected: contracts that aren't recognized smart-contract wallets (token contracts, routers, vaults), burn and reserved addresses, and high-volume addresses such as exchange hot wallets and mining pools. Smart-contract wallets are fine: Safe, Coinbase Smart Wallet, ERC-4337 accounts and EIP-7702 delegated EOAs all work.

Recognition works by wallet implementation, so a newly deployed Safe is tracked immediately with no setup. Trackability is decided per address, not per chain. If you need a specific address, or a wallet implementation we don't recognize yet, contact support.

### 401 - Unauthorized

Returned when the API key is missing, invalid, or incorrectly encoded.

```json theme={null}
{
  "errors": [
    {
      "title": "Unauthorized Error",
      "detail": "The API key is invalid, please, make sure that you are using a valid key"
    }
  ]
}
```

**Common causes:**

* Missing `Authorization` header
* API key not Base64-encoded correctly - remember to append a colon: `base64("your_key:")`
* Expired or revoked API key

<Tip>
  Test your encoding: `echo -n "your_api_key:" | base64` should produce the value you pass after `Basic `.
</Tip>

### 404 - Not Found

Returned on single-resource endpoints when the ID doesn't match any record.

```json theme={null}
{
  "errors": [
    {
      "title": "Requested fungible was not found",
      "detail": "You have requested fungible which does not exist"
    }
  ]
}
```

This only applies to endpoints like `/v1/fungibles/{fungible_id}` or `/v1/nfts/{nft_id}`. List endpoints return an empty `data` array instead of a 404.

### 422 - Unprocessable Entity

Returned when a request cannot be served and retrying will not change that. Unlike a `503`, it carries no `Retry-After` header.

```json theme={null}
{
  "errors": [
    {
      "title": "This request is not supported",
      "detail": "This request cannot be processed, and retrying will not help. Please contact support if you need it enabled."
    }
  ]
}
```

The PnL endpoints (`/v1/wallets/{address}/pnl` and `/v1/wallet-sets/pnl`) return it for wallets with more than 1 million actions, which are too large for PnL to be calculated. The limit is counted per address, so a wallet set fails if any one of its addresses is over it.

Don't retry, and don't cache the result against the address: the same address can return a different status later.

### 429 - Too Many Requests

Returned when you exceed your plan's rate limit.

```json theme={null}
{
  "errors": [
    {
      "title": "Too many requests",
      "detail": "Your request had been throttled"
    }
  ]
}
```

Implement exponential backoff when retrying. For header details and retry guidance, see [Rate Limits](/rate-limits). If you're hitting limits consistently, upgrade your plan in the [Dashboard](https://dashboard.zerion.io).

### 500 - Server Error

Returned when something unexpected goes wrong on Zerion's side.

```json theme={null}
{
  "errors": [
    {
      "title": "Internal Server Error",
      "detail": "An unexpected error occurred"
    }
  ]
}
```

These errors are safe to retry. Use exponential backoff (e.g., 1s, 2s, 4s) and cap your retries. If the error persists, reach out to support.

### 503 - Service Unavailable

Returned when the data you asked for is still being prepared. The PnL, wallet positions and fungible chart endpoints compute a wallet's state on the first request, and answer with a `503` while that runs.

```json theme={null}
{
  "errors": [
    {
      "title": "Service is temporarily unavailable",
      "detail": "Please, retry later (check the Retry-After header)"
    }
  ]
}
```

This always includes a `Retry-After` header, typically 10 seconds. Wait for it rather than retrying immediately, and cap your attempts.

## Best practices

* **Retry on `429`, `500` and `503`.** Do not retry `400`, `401` or `422` - these return the same result however many times you send them.
* **Respect `Retry-After`.** On a `503` it tells you how long the data needs; retrying sooner just burns your rate limit.
* **Use exponential backoff.** When retrying, increase the delay between attempts exponentially (e.g., 1s, 2s, 4s) to avoid overwhelming the API.
* **Validate parameters before sending.** Check that `page[size]` is within the endpoint's allowed range, timestamps are 13-digit milliseconds, and chain IDs match the [supported chains](/supported-blockchains). This avoids unnecessary `400` errors.
* **Use webhooks instead of polling.** If you need to monitor wallet activity, use [transaction subscriptions](/api-reference/subscriptions-to-transactions/create-subscription) instead of polling. This reduces API usage and gives you faster notifications.


# Introduction to the Zerion API
Source: https://developers.zerion.io/introduction

Zerion API is a REST API for onchain wallet data: portfolios, DeFi positions, NFTs, transactions, PnL, prices, and swaps across EVM chains and Solana.

## Get started

<CardGroup>
  <Card title="Get your API key" icon="key" href="https://dashboard.zerion.io">
    Generate a free key from the dashboard.
  </Card>

  <Card title="API Reference" icon="code" href="/api-reference/wallets/get-wallet-portfolio">
    Explore all API endpoints.
  </Card>
</CardGroup>

### Use Zerion API with agents

The [Zerion CLI](/build-with-ai/zerion-cli) is the fastest way for agents to query onchain data. Any assistant that can run shell commands can read wallets, tokens, and positions without writing API integration code.

One-shot setup - installs the CLI globally, configures your API key, and adds skills across all detected coding agents:

```bash theme={null}
npx -y zerion-cli init -y --browser
```

<Info>`--browser` opens [dashboard.zerion.io](https://dashboard.zerion.io) so you can grab an API key and paste it back. See [Zerion CLI](/build-with-ai/zerion-cli) for manual install and authentication options.</Info>

Or use the [MCP Server](/build-with-ai/mcp) to connect Zerion directly to Claude, Cursor, Windsurf, VS Code, and other AI tools. For agents that need to pay per-request without managing API keys, see [x402](/build-with-ai/x402) or [MPP](/build-with-ai/mpp) payments.

### Build onchain apps

<Tabs>
  <Tab title="Portfolio">
    <div>
      <div>
        <p>Fetch a wallet's total portfolio value and break it down by individual token positions across all supported chains.</p>
        <a href="/recipes/multi-chain-portfolio">View recipe →</a>
      </div>

      <img alt="Zerion wallet portfolio view" />
    </div>
  </Tab>

  <Tab title="DeFi Positions">
    <div>
      <div>
        <p>Fetch active DeFi positions across protocols - lending, staking, and liquidity, all in a single schema.</p>
        <a href="/recipes/defi-positions">View recipe →</a>
      </div>

      <img alt="Zerion DeFi positions view" />
    </div>
  </Tab>

  <Tab title="Transaction History">
    <div>
      <div>
        <p>Every transaction decoded into human-readable actions - trades, transfers, approvals, and more. Filter by type, chain, or date range.</p>
        <a href="/recipes/transaction-history">View recipe →</a>
      </div>

      <img alt="Zerion transaction history view" />
    </div>
  </Tab>

  <Tab title="PnL">
    <div>
      <div>
        <p>Track PnL at the wallet level and drill down into performance per token. Normalized to USD or any currency.</p>
        <a href="/recipes/wallet-pnl-tracker">View recipe →</a>
      </div>

      <img alt="Zerion PnL view" />
    </div>
  </Tab>

  <Tab title="NFTs">
    <div>
      <div>
        <p>Fetch NFT collections and individual tokens held by any wallet. Includes metadata, floor prices, and media across all supported chains.</p>
        <a href="/recipes/nft-portfolio">View recipe →</a>
      </div>

      <img alt="Zerion NFT positions view" />
    </div>
  </Tab>

  <Tab title="Notifications">
    <div>
      <div>
        <p>Subscribe to wallet activity via webhooks and get instant notifications when transactions happen - no polling needed.</p>
        <a href="/recipes/wallet-activity-alerts">View recipe →</a>
      </div>

      <img alt="Zerion real-time alerts view" />
    </div>
  </Tab>
</Tabs>

## Why Zerion API

Zerion API provides endpoints for wallet data, token analytics, DeFi positions, and real-time webhooks across [EVM chains and Solana](/supported-blockchains). These endpoints abstract away multi-chain complexity and deliver clean, normalized data ready to power your application.

<br />

<div>
  <div>
    <div>
      <img />
    </div>

    <p>Always fresh</p>
    <p>Data updates within milliseconds of new blocks. No stale reads, no polling delays.</p>
  </div>

  <div>
    <div>
      <img />
    </div>

    <p>Battle-tested</p>
    <p>Powers the Zerion app used by millions. The same infrastructure backs your project.</p>
  </div>

  <div>
    <div>
      <img />
    </div>

    <p>Unified schema</p>
    <p>Normalized responses across all chains. No per-chain parsing or custom logic needed.</p>
  </div>
</div>

## Resources

<CardGroup>
  <Card title="Quickstart" icon="bolt" href="/quickstart">
    Make your first request in under 5 minutes.
  </Card>

  <Card title="Supported Blockchains" icon="link" href="/supported-blockchains">
    See every chain the API covers.
  </Card>

  <Card title="Recipes" icon="book" href="/recipes">
    Step-by-step guides for common use cases.
  </Card>

  <Card title="Changelogs" icon="clock" href="/changelog">
    Latest updates and new features.
  </Card>
</CardGroup>


# From Allium
Source: https://developers.zerion.io/migrate-from-allium

Map Allium Realtime Developer APIs to Zerion API endpoints for token balances, transactions, DeFi positions, PnL, and prices, with code samples.

If you've been calling Allium's [Realtime APIs](https://docs.allium.so/api/developer/overview) for wallet balances, transactions, DeFi positions, PnL, or token prices, the same data is available on Zerion API across [60+ EVM chains and Solana](/supported-blockchains), usually in a single call and with USD values precomputed.

This guide shows the direct mapping for the main Allium Realtime endpoints, with copy-pasteable code for each.

What you get with Zerion:

* **One address, all chains:** Allium takes a `{chain, address}` pair per wallet, so a multi-chain balance read means one entry per chain. Zerion returns every supported chain for an address in one call to `/wallets/{address}/positions/`, filterable with `filter[chain_ids]`.
* **One call for tokens + DeFi:** Collapse Allium's `wallet/balances` and `wallet/positions` into a single `/positions/?filter[positions]=no_filter` response.
* **Values precomputed:** Allium balances return `raw_balance` (and a `token.price` you multiply yourself). Zerion returns `quantity.float` and `value` (USD) per position, plus a portfolio breakdown by chain and type.

## Endpoint parity

| Use case                     | Allium Realtime API                                   | Zerion API                                                                                                                              |
| ---------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens + DeFi (one call)     | Two requests (`wallet/balances` + `wallet/positions`) | [`GET /v1/wallets/{address}/positions/?filter[positions]=no_filter`](/api-reference/wallets/get-wallet-fungible-positions)              |
| Token balances               | `POST /api/v1/developer/wallet/balances`              | [`GET /v1/wallets/{address}/positions/?filter[positions]=only_simple`](/api-reference/wallets/get-wallet-fungible-positions)            |
| DeFi positions               | `POST /api/v1/developer/wallet/positions`             | [`GET /v1/wallets/{address}/positions/?filter[positions]=only_complex`](/api-reference/wallets/get-wallet-fungible-positions)           |
| Transactions / activity      | `POST /api/v1/developer/wallet/transactions`          | [`GET /v1/wallets/{address}/transactions/`](/api-reference/wallets/get-wallet-transactions)                                             |
| Holdings PnL                 | `POST /api/v1/developer/wallet/pnl`                   | [`GET /v1/wallets/{address}/pnl`](/api-reference/wallets/get-wallet-pnl)                                                                |
| Net worth + 24h change       | (compute from holdings)                               | [`GET /v1/wallets/{address}/portfolio`](/api-reference/wallets/get-wallet-portfolio)                                                    |
| Net worth over time          | `wallet/balances/history` (per-token snapshots)       | [`GET /v1/wallets/{address}/charts/{period}`](/api-reference/wallets/get-wallet-balance-chart)                                          |
| Token price                  | `POST /api/v1/developer/prices`                       | [`GET /v1/fungibles/by-implementation?implementation={chain}:{address}`](/api-reference/fungibles/get-fungible-asset-by-implementation) |
| Token metadata / search      | `tokens/list`, `tokens/search`                        | [`GET /v1/fungibles/`](/api-reference/fungibles/get-list-of-fungible-assets)                                                            |
| NFTs                         | (historical NFT trades)                               | [`GET /v1/wallets/{address}/nft-positions/`](/api-reference/wallets/get-wallet-nft-positions)                                           |
| Multiple wallets in one call | Array body (1-100 wallets)                            | [Wallet sets](/api-reference/wallet-sets/get-wallet-set-fungible-positions) (`/v1/wallet-sets/...`)                                     |
| Realtime updates             | Streaming                                             | [Transaction webhooks](/webhooks)                                                                                                       |

<Tip>
  Prefer not to write code? The [Zerion CLI](/build-with-ai/zerion-cli) wraps the same endpoints with a one-shot `npx @zerion/cli init` flow, useful for quick experiments and AI agents.
</Tip>

## A note on request shape

The biggest structural change is how you address a wallet:

* **Allium:** `POST` an array of `{chain, address}` objects. You pick the chain per wallet, and you can batch up to 100 wallets in one request.
* **Zerion:** `GET /v1/wallets/{address}/...` with the address in the path. One address per call, all supported chains by default, narrowed with `filter[chain_ids]`. To read many wallets in one request, use the [wallet sets](/api-reference/wallet-sets/get-wallet-set-fungible-positions) endpoints.

So a single Allium call that fans out across `[{ethereum, 0x…}, {polygon, 0x…}]` for one wallet becomes a single Zerion call to that address (both chains already included), and a single Allium call across several different wallets becomes either N Zerion calls or one wallet-set call.

## Token balances

Allium's `wallet/balances` returns one item per token with `raw_balance` (an integer) and a `token` object that carries `price` but no precomputed USD value. Zerion returns a [JSON:API](https://jsonapi.org/) collection where each token is one entry under `data[]`, with `attributes.fungible_info` for metadata, `attributes.quantity.float` for the decimal-adjusted amount, and `attributes.value` for the USD value already computed. The same endpoint accepts both EVM and Solana addresses.

<CodeGroup>
  ```javascript JavaScript (EVM) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[positions]=only_simple&filter[trash]=only_non_trash&sort=value`,
    {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(API_KEY + ":")}`,
      },
    }
  );
  const { data } = await res.json();

  for (const pos of data) {
    const { fungible_info, quantity, price, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`${fungible_info.symbol} on ${chain}: ${quantity.float} @ $${price} = $${value?.toFixed(2) ?? "N/A"}`);
  }
  ```

  ```javascript JavaScript (Solana) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[chain_ids]=solana&filter[trash]=only_non_trash&sort=value`,
    {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(API_KEY + ":")}`,
      },
    }
  );
  const { data } = await res.json();

  for (const pos of data) {
    const { fungible_info, quantity, price, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`${fungible_info.symbol} on ${chain}: ${quantity.float} @ $${price} = $${value?.toFixed(2) ?? "N/A"}`);
  }
  ```

  ```python Python (EVM) theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/positions/",
      params={
          "currency": "usd",
          "filter[positions]": "only_simple",
          "filter[trash]": "only_non_trash",
          "sort": "-value",
      },
      auth=(api_key, ""),
  )
  res.raise_for_status()

  for pos in res.json()["data"]:
      info = pos["attributes"]["fungible_info"]
      qty = pos["attributes"]["quantity"]["float"]
      value = pos["attributes"]["value"]
      chain = pos["relationships"]["chain"]["data"]["id"]
      print(f"{info['symbol']} on {chain}: {qty} = ${value:.2f}" if value else f"{info['symbol']} on {chain}: {qty}")
  ```

  ```bash cURL (EVM) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?currency=usd&filter[positions]=only_simple&filter[trash]=only_non_trash&sort=value"
  ```

  ```bash cURL (Solana) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH/positions/?currency=usd&filter[chain_ids]=solana&filter[trash]=only_non_trash&sort=value"
  ```
</CodeGroup>

### Field mapping

| Allium (`items[].…`)                                                     | Zerion (`data[].attributes.…`)                                                                                                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `token.info.symbol`, `token.info.name`                                   | `fungible_info.symbol`, `fungible_info.name`                                                                                                                        |
| `token.decimals`                                                         | `fungible_info.implementations[].decimals`                                                                                                                          |
| `token.address` (`native` type for gas tokens)                           | `fungible_info.implementations[].address` (`null` for native)                                                                                                       |
| `chain`                                                                  | `relationships.chain.data.id`                                                                                                                                       |
| `raw_balance` / `raw_balance_str` (integer, not decimal-adjusted)        | `quantity.int` (raw integer string). Also `quantity.float` (decimal number) and `quantity.numeric` (decimal string), so you don't divide by `10^decimals` yourself. |
| `token.price`                                                            | `price`                                                                                                                                                             |
| `raw_balance / 10^decimals × token.price` (compute client-side)          | `value` (USD, precomputed)                                                                                                                                          |
| `token.attributes.total_liquidity_usd` (with `with_liquidity_info=true`) | No direct equivalent. Use `filter[trash]` for spam, and `fungible_info.flags.verified` for the curation signal.                                                     |
| `token.attributes.price_diff_pct_1d`                                     | Available per asset via [`/v1/fungibles/{id}`](/api-reference/fungibles/get-fungible-asset-by-id) → `market_data.changes.percent_1d`                                |
| `block_timestamp`                                                        | `updated_at` (ISO 8601, last balance update)                                                                                                                        |
| (no equivalent)                                                          | `fungible_info.icon.url` (token logo, returned by default)                                                                                                          |

<Note>
  `price` and `value` are `null` for tokens without a reliable price. Guard for `null` before summing or formatting.
</Note>

## Transactions

Allium's `wallet/transactions` returns transactions with `asset_transfers[]` (each tagged `sent`/`received`), a `labels[]` array, and an `activities[]` array describing what the transaction did (`dex_trade`, `nft_trade`, `asset_approval`, and so on). Zerion's [`/transactions/`](/api-reference/wallets/get-wallet-transactions) returns enriched, human-readable transactions with a single decoded `operation_type`, inlined transfer metadata, fees, and the dApp when Zerion recognizes it. The same endpoint accepts both EVM and Solana addresses.

<CodeGroup>
  ```javascript JavaScript (EVM) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/transactions/?currency=usd&page[size]=20`,
    { headers }
  );
  const { data } = await res.json();

  for (const tx of data) {
    const { operation_type, mined_at, transfers, fee } = tx.attributes;
    const chain = tx.relationships.chain.data.id;
    const dappId = tx.relationships.dapp?.data?.id;

    console.log(`[${mined_at}] ${operation_type} on ${chain}`);
    if (dappId) console.log(`  via ${dappId}`);
    for (const t of transfers) {
      const sign = t.direction === "out" ? "-" : "+";
      const symbol = t.fungible_info?.symbol ?? "NFT";
      console.log(`  ${sign}${t.quantity.float} ${symbol} ($${t.value?.toFixed(2) ?? "?"})`);
    }
    console.log(`  Fee: $${fee.value?.toFixed(2) ?? "?"}`);
  }
  ```

  ```python Python (EVM) theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/transactions/",
      params={"currency": "usd", "page[size]": 20},
      auth=(api_key, ""),
  )
  for tx in res.json()["data"]:
      attrs = tx["attributes"]
      chain = tx["relationships"]["chain"]["data"]["id"]
      dapp_id = (tx["relationships"].get("dapp") or {}).get("data", {}).get("id")
      print(f"[{attrs['mined_at']}] {attrs['operation_type']} on {chain}")
      if dapp_id:
          print(f"  via {dapp_id}")
      for t in attrs["transfers"]:
          sign = "-" if t["direction"] == "out" else "+"
          symbol = (t.get("fungible_info") or {}).get("symbol", "NFT")
          val = t.get("value")
          print(f"  {sign}{t['quantity']['float']} {symbol} (${val:.2f})" if val else f"  {sign}{t['quantity']['float']} {symbol}")
  ```

  ```bash cURL (EVM) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/transactions/?currency=usd&page[size]=20"
  ```

  ```bash cURL (Solana) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH/transactions/?currency=usd&filter[chain_ids]=solana&page[size]=20"
  ```
</CodeGroup>

### Field mapping

| Allium (`items[].…`)                                                                                                                                 | Zerion (`data[].attributes.…`)                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hash`                                                                                                                                               | `hash`                                                                                                                                                                                                                                                                                                                       |
| `block_timestamp`                                                                                                                                    | `mined_at` (ISO 8601) / `mined_at_block`                                                                                                                                                                                                                                                                                     |
| `chain`                                                                                                                                              | `relationships.chain.data.id`                                                                                                                                                                                                                                                                                                |
| `labels[]` (coarse tags, e.g. `transfer`) + `activities[].type` (richer DeFi actions: `dex_trade`, `nft_trade`, `asset_approval`, `asset_bridge`, …) | `operation_type` (`trade`, `send`, `receive`, `approve`, `revoke`, `deposit`, `withdraw`, `mint`, `burn`, `claim`, `bid`, `delegate`, `revoke_delegation`, `execute`, `deploy`). Zerion folds Allium's classification into one decoded field; `activities[]` is empty for plain transfers, where the tag sits in `labels[]`. |
| `type` (numeric EVM envelope type, e.g. `2` for EIP-1559)                                                                                            | No equivalent. This is the raw transaction type, not a semantic category; Zerion does not expose it.                                                                                                                                                                                                                         |
| `asset_transfers[].transfer_type` (`sent` / `received`)                                                                                              | `transfers[].direction` (`out` / `in`)                                                                                                                                                                                                                                                                                       |
| `asset_transfers[].asset.type` (`native`, `evm_erc20`, `evm_erc721`, `evm_erc1155`)                                                                  | `transfers[].fungible_info` vs `transfers[].nft_info`                                                                                                                                                                                                                                                                        |
| `asset_transfers[].asset.symbol`, `.decimals`                                                                                                        | `transfers[].fungible_info.symbol`, `.implementations[].decimals`                                                                                                                                                                                                                                                            |
| `asset_transfers[].amount.raw_amount` / `.amount`                                                                                                    | `transfers[].quantity.int` (raw) / `.float` (decimal). USD in `transfers[].value`.                                                                                                                                                                                                                                           |
| `asset_transfers[].from_address` / `.to_address`                                                                                                     | `transfers[].sender` / `transfers[].recipient`                                                                                                                                                                                                                                                                               |
| `from_address` / `to_address` (transaction-level)                                                                                                    | `sent_from` / `sent_to`                                                                                                                                                                                                                                                                                                      |
| `fee.amount` / `fee.raw_amount`                                                                                                                      | `fee.value` (USD) / `fee.quantity.float`                                                                                                                                                                                                                                                                                     |
| (no equivalent)                                                                                                                                      | `relationships.dapp.data.id` (dApp slug, e.g. `uniswap-v3`, present when Zerion identifies it)                                                                                                                                                                                                                               |

### Filter mapping

| Allium param                       | Zerion equivalent                                              |
| ---------------------------------- | -------------------------------------------------------------- |
| `activity_type=dex_trade`          | `filter[operation_types]=trade` (comma-separated for multiple) |
| `transaction_hash=0x…`             | `filter[search_query]=0x…`                                     |
| `limit=100`                        | `page[size]=100`                                               |
| `cursor=<cursor>`                  | Follow `links.next` from the response                          |
| (chain set per wallet in the body) | `filter[chain_ids]=ethereum,base`                              |

## DeFi positions

Allium's `wallet/positions` returns typed positions, where the field set depends on `position_type` (`LP`, `lending`, `staked`, `regular`, `perp`, `vault`). Lending positions nest `supplies[]`, `borrows[]`, and `collateral[]`; LP positions carry `token0`/`token1`; staked positions carry `staked_token` and `rewards_token`. Zerion flattens all of this: each position is one row under `/positions/?filter[positions]=only_complex`, tagged with `protocol`, `protocol_module`, and `position_type` (including `loan` for borrowed assets).

<CodeGroup>
  ```javascript JavaScript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[positions]=only_complex&sort=value`,
    { headers: { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` } }
  );
  const { data } = await res.json();

  for (const pos of data) {
    const { name, protocol, protocol_module, position_type, quantity, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`[${position_type}] ${name} | ${protocol} (${protocol_module}) on ${chain}: ${quantity.float} = $${value?.toFixed(2) ?? "N/A"}`);
  }
  ```

  ```python Python theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/positions/",
      params={"currency": "usd", "filter[positions]": "only_complex", "sort": "-value"},
      auth=(api_key, ""),
  )
  for pos in res.json()["data"]:
      a = pos["attributes"]
      chain = pos["relationships"]["chain"]["data"]["id"]
      print(f"[{a.get('position_type')}] {a['name']} | {a.get('protocol')} ({a.get('protocol_module')}) on {chain}: {a['quantity']['float']} = ${a['value'] or 0:.2f}")
  ```

  ```bash cURL theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?currency=usd&filter[positions]=only_complex&sort=value"
  ```
</CodeGroup>

### Field mapping

| Allium (`items[].…`)                                         | Zerion (`data[].attributes.…`)                                                                                                                                                                  |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protocol`                                                   | `protocol` (plus `relationships.dapp.data.id` for the slug)                                                                                                                                     |
| `position_type` (`LP`, `lending`, `staked`, `perp`, `vault`) | `protocol_module` (`lending`, `staked`, `liquidity_pool`, `locked`, `rewards`, `vesting`, `deposit`, `investment`, `yield`) + `position_type` (`deposit`, `loan`, `staked`, `reward`, `locked`) |
| `total_value_usd`                                            | `value` (per row). Wallet-level totals are in [`/portfolio`](/api-reference/wallets/get-wallet-portfolio) → `positions_distribution_by_type`.                                                   |
| `supplies[]` / `collateral[]`                                | rows with `position_type: deposit` / `staked`                                                                                                                                                   |
| `borrows[]`                                                  | rows with `position_type: loan`                                                                                                                                                                 |
| `staked_amount`, `unclaimed_rewards`                         | rows with `position_type: staked` / `reward`                                                                                                                                                    |
| `token0` / `token1` (LP pair)                                | one row per pool token, grouped by `group_id` (see [positions](/api-reference/wallets/get-wallet-fungible-positions))                                                                           |
| `health_factor`                                              | No direct equivalent. Derive from supplied vs borrowed `value`.                                                                                                                                 |
| `apy`, `fee_tier`, `in_range`, `unclaimed_fees_*`            | No direct equivalent. Zerion surfaces the position's underlying token, USD value, and protocol module.                                                                                          |
| `chain`                                                      | `relationships.chain.data.id`                                                                                                                                                                   |
| (no equivalent)                                              | `application_metadata.name` / `application_metadata.icon.url` (protocol display name + logo)                                                                                                    |

<Note>
  Allium returns dedicated `perp` positions (size, entry/mark price, leverage, liquidation price, unrealized PnL). Zerion's positions model is spot and DeFi-protocol oriented and does not return perpetuals as positions. If perps matter for your migration, [let us know](#get-in-touch).
</Note>

## Holdings PnL

Allium's `wallet/pnl` returns per-token PnL (`realized_pnl`, `unrealized_pnl`, `average_cost`) plus wallet totals. Zerion's [`/pnl`](/api-reference/wallets/get-wallet-pnl) returns wallet-level PnL computed with FIFO: realized and unrealized gain, net invested, total fees, and external in/out flows.

<CodeGroup>
  ```javascript JavaScript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/pnl?currency=usd`,
    { headers: { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` } }
  );
  const { data } = await res.json();
  const a = data.attributes;

  console.log(`Realized gain:   $${a.realized_gain?.toFixed(2)}`);
  console.log(`Unrealized gain: $${a.unrealized_gain?.toFixed(2)}`);
  console.log(`Net invested:    $${a.net_invested?.toFixed(2)}`);
  console.log(`Total fees:      $${a.total_fee?.toFixed(2)}`);
  ```

  ```python Python theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/pnl",
      params={"currency": "usd"},
      auth=(api_key, ""),
  )
  a = res.json()["data"]["attributes"]
  print(f"Realized gain:   ${a['realized_gain']:.2f}")
  print(f"Unrealized gain: ${a['unrealized_gain']:.2f}")
  print(f"Net invested:    ${a['net_invested']:.2f}")
  print(f"Total fees:      ${a['total_fee']:.2f}")
  ```

  ```bash cURL theme={null}
  curl -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/pnl?currency=usd"
  ```
</CodeGroup>

### Field mapping

| Allium (`items[].…`)                                    | Zerion (`data.attributes.…`)                                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `total_realized_pnl.amount`                             | `realized_gain`                                                                                                                                        |
| `total_unrealized_pnl.amount`                           | `unrealized_gain`                                                                                                                                      |
| `total_balance.amount`                                  | Current value via [`/portfolio`](/api-reference/wallets/get-wallet-portfolio) → `total.positions`                                                      |
| `tokens[].average_cost`                                 | No wallet-summary equivalent. Per-token cost basis is reflected in `net_invested` / `realized_cost_basis`.                                             |
| `tokens[].realized_pnl` / `.unrealized_pnl` (per token) | Wallet-level `realized_gain` / `unrealized_gain`. For a per-token breakdown, filter with `filter[fungible_ids]` or `filter[fungible_implementations]`. |
| `min_liquidity` (query)                                 | No direct equivalent. Assets without prices are excluded automatically and reported in `meta`.                                                         |
| (no equivalent)                                         | `net_invested`, `total_fee`, `received_external`, `sent_external`                                                                                      |

<Tip>
  Allium's `wallet/pnl` accepts a batch of wallets and returns per-token rows. To replicate a per-token breakdown on Zerion, call `/pnl` with `filter[fungible_ids]=…`. See the [wallet PnL tracker recipe](/recipes/wallet-pnl-tracker) for a worked example.
</Tip>

## Token prices

Allium's `prices` endpoint takes a batch of `{token_address, chain}` objects and returns the latest price with OHLC. Zerion resolves a token by its implementation and returns full asset metadata including `market_data.price` and recent changes.

<CodeGroup>
  ```javascript JavaScript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const implementation = "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"; // USDC

  const res = await fetch(
    `https://api.zerion.io/v1/fungibles/by-implementation?implementation=${implementation}&currency=usd`,
    { headers: { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` } }
  );
  const { data } = await res.json();
  const m = data.attributes.market_data;

  console.log(`${data.attributes.symbol}: $${m.price}`);
  console.log(`24h change: ${m.changes?.percent_1d?.toFixed(2)}%`);
  ```

  ```python Python theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  implementation = "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"  # USDC

  res = requests.get(
      "https://api.zerion.io/v1/fungibles/by-implementation",
      params={"implementation": implementation, "currency": "usd"},
      auth=(api_key, ""),
  )
  a = res.json()["data"]["attributes"]
  m = a["market_data"]
  print(f"{a['symbol']}: ${m['price']}")
  print(f"24h change: {m['changes']['percent_1d']}%")
  ```

  ```bash cURL theme={null}
  curl -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/fungibles/by-implementation?implementation=ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&currency=usd"
  ```
</CodeGroup>

### Field mapping

| Allium (`items[].…`)              | Zerion (`data.attributes.…`)                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `price`                           | `market_data.price`                                                                                                                                           |
| `open` / `high` / `low` / `close` | No direct equivalent for the latest interval. Use the [fungible chart](/api-reference/fungibles/get-a-chart-for-a-fungible-asset) for a price timeseries.     |
| `timestamp`                       | `market_data.price` is the live value; chart points carry timestamps.                                                                                         |
| `decimals`                        | `implementations[].decimals`                                                                                                                                  |
| (one request per implementation)  | One implementation per call. For a list, page [`/v1/fungibles/`](/api-reference/fungibles/get-list-of-fungible-assets) with `filter[implementation_address]`. |

<Note>
  Allium's `prices` endpoint batches up to 200 tokens per request. Zerion's `by-implementation` resolves one token per call. For a batch, query [`/v1/fungibles/`](/api-reference/fungibles/get-list-of-fungible-assets) and read `market_data.price` from each result, or cache the Zerion `fungible_id` per token and reuse it.
</Note>

## Pagination

Replace Allium's `cursor` query parameter with Zerion's `links.next` URL. Each Zerion response includes a fully-formed next-page link you can fetch as-is.

```javascript theme={null}
async function getAll(url) {
  const all = [];
  const headers = { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` };

  while (url) {
    const res = await fetch(url, { headers });
    const { data, links } = await res.json();
    all.push(...data);
    url = links?.next ?? null;
  }
  return all;
}
```

## Realtime updates

Allium offers a streaming product for low-latency blockchain data. Zerion offers [transaction webhooks](/webhooks): subscribe a callback URL to one or more wallets and receive a POST when any of them transact.

See the [wallet activity alerts recipe](/recipes/wallet-activity-alerts) for a working example.

## Differences from Allium

Most Allium Realtime use cases have a direct Zerion equivalent. A few aren't covered, and others behave differently. Worth a scan before you cut over.

**Not supported today:**

* **Non-EVM, non-Solana chains:** Allium Realtime covers chains like Bitcoin, Stellar, NEAR, and Sui. Zerion covers EVM chains and Solana. Check the [supported chains list](/supported-blockchains) for the ones you rely on.
* **Perpetuals:** Allium returns `perp` positions with leverage, mark price, and liquidation price. Zerion's positions model does not return perpetuals.
* **Per-token historical balance snapshots:** Allium's `wallet/balances/history` returns point-in-time token balances. Zerion exposes wallet value over time via [`/charts/{period}`](/api-reference/wallets/get-wallet-balance-chart) and asset price history via the [fungible chart](/api-reference/fungibles/get-a-chart-for-a-fungible-asset), but not a per-token balance-at-timestamp endpoint.
* **OHLC price candles:** Allium's `prices` endpoint returns open/high/low/close per interval. Zerion returns live price plus a chart timeseries, not OHLC candles.
* **Liquidity and holder analytics:** Allium exposes `total_liquidity_usd` and `holders_count` on tokens. Zerion does not return pool liquidity or holder counts.

If any of these matter for your migration, [let us know](#get-in-touch). Your feedback helps shape our roadmap.

**Worth knowing:**

* **Authentication:** Allium uses an `X-API-KEY` header. Zerion uses [HTTP Basic Auth](/authentication). Get a key at [dashboard.zerion.io](https://dashboard.zerion.io).
* **Request shape:** Allium endpoints are `POST` with a JSON array of `{chain, address}` objects. Zerion endpoints are `GET /v1/wallets/{address}/...` with the address in the path. See [the note above](#a-note-on-request-shape).
* **One address spans all chains:** Allium pairs each address with one chain. Zerion returns every supported chain for an address by default, narrowed with `filter[chain_ids]`.
* **Multiple wallets:** Allium batches up to 100 wallets per call. Zerion reads one address per `/wallets/` call; for batches use the [wallet sets](/api-reference/wallet-sets/get-wallet-set-fungible-positions) endpoints.
* **Values precomputed:** Allium balances return `raw_balance` and a `token.price`; you divide by `10^decimals` and multiply. Zerion returns `quantity.float` and `value` (USD) per position.
* **One endpoint for tokens and DeFi:** Zerion serves both wallet tokens and DeFi positions from `/positions/`. Switch via `filter[positions]=only_simple` (wallet only), `only_complex` (DeFi only), or `no_filter` (both).
* **Flattened DeFi:** Allium returns typed positions with nested `supplies`/`borrows`/`collateral`. Zerion returns one row per position tagged with `protocol_module` and `position_type` (including `loan` for debt). Group by `relationships.dapp.data.id` to reconstruct protocols, and by `group_id` to reconstruct LP pairs.
* **Chain IDs:** Allium and Zerion both use lowercase string chain IDs (e.g. `ethereum`, `solana`), so most map 1:1. Confirm the longer-tail names against the [full list](/supported-blockchains).
* **Response shape:** Zerion uses [JSON:API](https://jsonapi.org/). Payloads live under `data[].attributes` with related entities under `data[].relationships`.
* **Spam filtering:** Allium gates dust with `min_liquidity` / `with_liquidity_info`. Zerion uses `filter[trash]=only_non_trash`. See [spam filtering](/spam-filtering) for the full taxonomy.
* **Pagination:** Allium pages with a `cursor` query parameter; Zerion returns a fully-formed `links.next` URL you can fetch as-is. See [pagination](/pagination-and-filtering).

## Get in touch

Have a use case we don't cover or need assistance with the migration? Our team is happy to help! Reach out via the chat widget on [dashboard.zerion.io](https://dashboard.zerion.io), or [email us](mailto:api@zerion.io).


# From DeBank
Source: https://developers.zerion.io/migrate-from-debank

A 1:1 mapping from the DeBank Cloud API to the Zerion API, covering token balances, net worth, DeFi positions, wallet history, and NFTs with side-by-side code.

If you've been calling DeBank's Cloud API for token balances, net worth, DeFi portfolios, or wallet history, the same data is available on Zerion API across [60+ EVM chains and Solana](/supported-blockchains), often in a single call and with USD values precomputed.

This guide shows the direct mapping for the main DeBank user endpoints, with copy-pasteable code for each.

What you get with Zerion:

* **One call for tokens + DeFi:** Collapse DeBank's `all_token_list` and `all_complex_protocol_list` into a single `/positions/?filter[positions]=no_filter` response.
* **Solana on the same endpoints:** DeBank is EVM-only. Pass any EVM or Solana address to `/wallets/{address}/...` and get back the same enriched shape.
* **Values precomputed:** Zerion returns `value` (USD) per position and a portfolio breakdown by chain and by type (wallet, deposited, borrowed, locked, staked), so you don't multiply `amount` by `price` yourself.

## Endpoint parity

| Use case                 | DeBank Cloud API                                              | Zerion API                                                                                                                    |
| ------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Tokens + DeFi (one call) | Two requests (`all_token_list` + `all_complex_protocol_list`) | [`GET /v1/wallets/{address}/positions/?filter[positions]=no_filter`](/api-reference/wallets/get-wallet-fungible-positions)    |
| Net worth + 24h change   | `GET /v1/user/total_balance`                                  | [`GET /v1/wallets/{address}/portfolio`](/api-reference/wallets/get-wallet-portfolio)                                          |
| Net worth over time      | `GET /v1/user/total_net_curve`                                | [`GET /v1/wallets/{address}/charts/{period}`](/api-reference/wallets/get-wallet-balance-chart)                                |
| Token balances           | `GET /v1/user/all_token_list` (or `token_list` per chain)     | [`GET /v1/wallets/{address}/positions/?filter[positions]=only_simple`](/api-reference/wallets/get-wallet-fungible-positions)  |
| DeFi positions           | `GET /v1/user/all_complex_protocol_list`                      | [`GET /v1/wallets/{address}/positions/?filter[positions]=only_complex`](/api-reference/wallets/get-wallet-fungible-positions) |
| Wallet history           | `GET /v1/user/all_history_list` (or `history_list` per chain) | [`GET /v1/wallets/{address}/transactions/`](/api-reference/wallets/get-wallet-transactions)                                   |
| NFTs                     | `GET /v1/user/all_nft_list`                                   | [`GET /v1/wallets/{address}/nft-positions/`](/api-reference/wallets/get-wallet-nft-positions)                                 |
| Chains used by a wallet  | `GET /v1/user/used_chain_list`                                | Derive from `positions_distribution_by_chain` on [`/portfolio`](/api-reference/wallets/get-wallet-portfolio)                  |
| Realtime updates         | (polling)                                                     | [Transaction webhooks](/webhooks)                                                                                             |

<Tip>
  Prefer not to write code? The [Zerion CLI](/build-with-ai/zerion-cli) wraps the same endpoints with a one-shot `npx @zerion/cli init` flow, useful for quick experiments and AI agents.
</Tip>

## Token balances

DeBank returns a flat array of token objects, where each token carries `amount` and `price` but no precomputed USD value (you multiply the two yourself). Zerion returns a JSON:API collection where each token is one entry under `data[]`, with `attributes.fungible_info` for metadata and `attributes.value` for the USD value already computed. The same endpoint accepts both EVM and Solana addresses.

<CodeGroup>
  ```javascript JavaScript (EVM) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[positions]=only_simple&filter[trash]=only_non_trash&sort=value`,
    {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(API_KEY + ":")}`,
      },
    }
  );
  const { data } = await res.json();

  for (const pos of data) {
    const { fungible_info, quantity, price, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`${fungible_info.symbol} on ${chain}: ${quantity.float} @ $${price} = $${value?.toFixed(2) ?? "N/A"}`);
  }
  ```

  ```javascript JavaScript (Solana) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[chain_ids]=solana&filter[trash]=only_non_trash&sort=value`,
    {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(API_KEY + ":")}`,
      },
    }
  );
  const { data } = await res.json();

  for (const pos of data) {
    const { fungible_info, quantity, price, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`${fungible_info.symbol} on ${chain}: ${quantity.float} @ $${price} = $${value?.toFixed(2) ?? "N/A"}`);
  }
  ```

  ```python Python (EVM) theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/positions/",
      params={
          "currency": "usd",
          "filter[positions]": "only_simple",
          "filter[trash]": "only_non_trash",
          "sort": "-value",
      },
      auth=(api_key, ""),
  )
  res.raise_for_status()

  for pos in res.json()["data"]:
      info = pos["attributes"]["fungible_info"]
      qty = pos["attributes"]["quantity"]["float"]
      value = pos["attributes"]["value"]
      chain = pos["relationships"]["chain"]["data"]["id"]
      print(f"{info['symbol']} on {chain}: {qty} = ${value:.2f}" if value else f"{info['symbol']} on {chain}: {qty}")
  ```

  ```python Python (Solana) theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/positions/",
      params={
          "currency": "usd",
          "filter[chain_ids]": "solana",
          "filter[trash]": "only_non_trash",
          "sort": "-value",
      },
      auth=(api_key, ""),
  )
  res.raise_for_status()

  for pos in res.json()["data"]:
      info = pos["attributes"]["fungible_info"]
      qty = pos["attributes"]["quantity"]["float"]
      value = pos["attributes"]["value"]
      chain = pos["relationships"]["chain"]["data"]["id"]
      print(f"{info['symbol']} on {chain}: {qty} = ${value:.2f}" if value else f"{info['symbol']} on {chain}: {qty}")
  ```

  ```bash cURL (EVM) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?currency=usd&filter[positions]=only_simple&filter[trash]=only_non_trash&sort=value"
  ```

  ```bash cURL (Solana) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH/positions/?currency=usd&filter[chain_ids]=solana&filter[trash]=only_non_trash&sort=value"
  ```
</CodeGroup>

### Field mapping

| DeBank (token object)                                                         | Zerion (`data[].attributes.…`)                                                                                       |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `symbol`, `display_symbol`, `optimized_symbol`                                | `fungible_info.symbol`                                                                                               |
| `name`                                                                        | `fungible_info.name`                                                                                                 |
| `decimals`                                                                    | `fungible_info.implementations[].decimals`                                                                           |
| `id` (contract address, or chain short name for native)                       | `fungible_info.implementations[].address` (`null` for native)                                                        |
| `chain` (short name, e.g. `eth`)                                              | `relationships.chain.data.id` (full ID, e.g. `ethereum`)                                                             |
| `amount` (decimal)                                                            | `quantity.float` (decimal number). Also `quantity.int` (raw integer string) and `quantity.numeric` (decimal string). |
| `raw_amount` (raw integer)                                                    | `quantity.int`                                                                                                       |
| `price`                                                                       | `price`                                                                                                              |
| `amount` × `price` (compute client-side)                                      | `value` (USD, precomputed)                                                                                           |
| `logo_url`                                                                    | `fungible_info.icon.url`                                                                                             |
| `is_verified`                                                                 | `fungible_info.flags.verified`                                                                                       |
| `is_core`, `is_suspicious`, `credit_score`, `is_all=false` (curation signals) | `filter[trash]=only_non_trash` (request param)                                                                       |
| `time_at` (first seen, unix)                                                  | No direct equivalent. `updated_at` (ISO 8601) reflects last balance update.                                          |

<Note>
  `price` and `value` are `null` for tokens without a reliable price. Guard for `null` before summing or formatting.
</Note>

<Note>
  DeBank's token id for native gas tokens is the chain short name (for example `eth`, `matic`), not a contract address. Zerion returns `null` for the native token's implementation address. If you key tokens by their DeBank id, remap native tokens before comparing.
</Note>

## Net worth

DeBank's `total_balance` returns `total_usd_value` plus a per-chain breakdown. Zerion's [`/portfolio`](/api-reference/wallets/get-wallet-portfolio) returns the total, the 24h change, a breakdown by chain, and a breakdown by position type (wallet, deposited, borrowed, locked, staked) in one response.

<CodeGroup>
  ```javascript JavaScript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/portfolio?currency=usd`,
    { headers: { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` } }
  );
  const { data } = await res.json();
  const a = data.attributes;

  console.log(`Net worth: $${a.total.positions.toFixed(2)}`);
  console.log(`24h change: $${a.changes.absolute_1d?.toFixed(2)} (${a.changes.percent_1d?.toFixed(2)}%)`);
  console.log("By chain:", a.positions_distribution_by_chain);
  console.log("By type:", a.positions_distribution_by_type);
  ```

  ```python Python theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/portfolio",
      params={"currency": "usd"},
      auth=(api_key, ""),
  )
  a = res.json()["data"]["attributes"]
  print(f"Net worth: ${a['total']['positions']:.2f}")
  print(f"24h change: {a['changes']['percent_1d']}%")
  print("By chain:", a["positions_distribution_by_chain"])
  print("By type:", a["positions_distribution_by_type"])
  ```

  ```bash cURL theme={null}
  curl -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/portfolio?currency=usd"
  ```
</CodeGroup>

### Field mapping

| DeBank (`total_balance`)               | Zerion (`/portfolio` → `data.attributes.…`)                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| `total_usd_value`                      | `total.positions`                                                                        |
| `chain_list[].usd_value`               | `positions_distribution_by_chain` (keyed by chain ID)                                    |
| (compute from token + protocol values) | `positions_distribution_by_type` (`wallet`, `deposited`, `borrowed`, `locked`, `staked`) |
| (no equivalent)                        | `changes.absolute_1d`, `changes.percent_1d` (24h change)                                 |
| `total_net_curve` (separate endpoint)  | [`/wallets/{address}/charts/{period}`](/api-reference/wallets/get-wallet-balance-chart)  |

## DeFi positions

DeBank's `all_complex_protocol_list` returns protocols, each with a nested `portfolio_item_list[]` of positions split into `supply_token_list`, `borrow_token_list`, and `reward_token_list`. Zerion flattens this: each position is one row under `/positions/?filter[positions]=only_complex`, tagged with `protocol`, `protocol_module`, and `position_type` (including `loan` for borrowed assets).

<CodeGroup>
  ```javascript JavaScript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[positions]=only_complex&sort=value`,
    { headers: { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` } }
  );
  const { data } = await res.json();

  for (const pos of data) {
    const { name, protocol, protocol_module, position_type, quantity, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`[${position_type}] ${name} | ${protocol} (${protocol_module}) on ${chain}: ${quantity.float} = $${value?.toFixed(2) ?? "N/A"}`);
  }
  ```

  ```python Python theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/positions/",
      params={"currency": "usd", "filter[positions]": "only_complex", "sort": "-value"},
      auth=(api_key, ""),
  )
  for pos in res.json()["data"]:
      a = pos["attributes"]
      chain = pos["relationships"]["chain"]["data"]["id"]
      print(f"[{a.get('position_type')}] {a['name']} | {a.get('protocol')} ({a.get('protocol_module')}) on {chain}: {a['quantity']['float']} = ${a['value'] or 0:.2f}")
  ```

  ```bash cURL theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?currency=usd&filter[positions]=only_complex&sort=value"
  ```
</CodeGroup>

### Field mapping

| DeBank (protocol / `portfolio_item_list[]`)                                           | Zerion (`data[].attributes.…`)                                                                                              |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| protocol `name`, `id`                                                                 | `protocol`, `relationships.dapp.data.id`                                                                                    |
| protocol `logo_url`                                                                   | `application_metadata.icon.url`                                                                                             |
| `portfolio_item_list[].name` (human label, e.g. `Lending`, `Liquidity Pool`)          | `protocol_module` (`lending`, `staked`, `liquidity_pool`, `locked`, `rewards`, `vesting`, `deposit`, `investment`, `yield`) |
| `portfolio_item_list[].detail_types` (machine list, e.g. `["lending"]`, `["common"]`) | `position_type` (`deposit`, `loan`, `locked`, `staked`, `reward`, `investment`)                                             |
| `detail.supply_token_list[]`                                                          | rows with `position_type: deposit` / `staked`                                                                               |
| `detail.borrow_token_list[]` (present when the position has debt)                     | rows with `position_type: loan`                                                                                             |
| `detail.reward_token_list[]`                                                          | rows with `position_type: reward`                                                                                           |
| `detail.health_rate` (lending health factor)                                          | No direct equivalent. Derive from supplied vs borrowed `value`.                                                             |
| token `amount`                                                                        | `quantity.float`                                                                                                            |
| token `price`, `amount` × `price`                                                     | `price`, `value`                                                                                                            |
| `stats.asset_usd_value`, `stats.debt_usd_value`, `stats.net_usd_value`                | Sum `value` per `position_type`; net worth split is in `/portfolio` → `positions_distribution_by_type`                      |
| `chain`                                                                               | `relationships.chain.data.id`                                                                                               |

<Tip>
  **Borrowed-position exposure:** DeBank surfaces debt via `borrow_token_list` and `stats.debt_usd_value`. In Zerion, borrowed assets come back as positions with `position_type: loan`, and the wallet-level debt total is `positions_distribution_by_type.borrowed` on [`/portfolio`](/api-reference/wallets/get-wallet-portfolio).
</Tip>

## Wallet history

DeBank's `history_list` (per chain) and `all_history_list` (across chains) return transactions with `sends[]`, `receives[]`, and a `token_approve` block, where token references point into a separate `token_dict`. Zerion's [`/transactions/`](/api-reference/wallets/get-wallet-transactions) returns enriched, human-readable transactions with the token metadata inlined in each transfer, plus the dApp when Zerion recognizes it. The same endpoint accepts both EVM and Solana addresses.

<CodeGroup>
  ```javascript JavaScript (EVM) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/transactions/?currency=usd&page[size]=20`,
    { headers }
  );
  const { data } = await res.json();

  for (const tx of data) {
    const { operation_type, mined_at, transfers, fee } = tx.attributes;
    const chain = tx.relationships.chain.data.id;
    const dappId = tx.relationships.dapp?.data?.id;

    console.log(`[${mined_at}] ${operation_type} on ${chain}`);
    if (dappId) console.log(`  via ${dappId}`);
    for (const t of transfers) {
      const sign = t.direction === "out" ? "-" : "+";
      const symbol = t.fungible_info?.symbol ?? "NFT";
      console.log(`  ${sign}${t.quantity.float} ${symbol} ($${t.value?.toFixed(2) ?? "?"})`);
    }
    console.log(`  Fee: $${fee.value?.toFixed(2) ?? "?"}`);
  }
  ```

  ```python Python (EVM) theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/transactions/",
      params={"currency": "usd", "page[size]": 20},
      auth=(api_key, ""),
  )
  for tx in res.json()["data"]:
      attrs = tx["attributes"]
      chain = tx["relationships"]["chain"]["data"]["id"]
      dapp_id = (tx["relationships"].get("dapp") or {}).get("data", {}).get("id")
      print(f"[{attrs['mined_at']}] {attrs['operation_type']} on {chain}")
      if dapp_id:
          print(f"  via {dapp_id}")
      for t in attrs["transfers"]:
          sign = "-" if t["direction"] == "out" else "+"
          symbol = (t.get("fungible_info") or {}).get("symbol", "NFT")
          val = t.get("value")
          print(f"  {sign}{t['quantity']['float']} {symbol} (${val:.2f})" if val else f"  {sign}{t['quantity']['float']} {symbol}")
  ```

  ```bash cURL (EVM) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/transactions/?currency=usd&page[size]=20"
  ```

  ```bash cURL (Solana) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH/transactions/?currency=usd&filter[chain_ids]=solana&page[size]=20"
  ```
</CodeGroup>

### Field mapping

| DeBank (`history_list[].…`)                                                                       | Zerion (`data[].attributes.…`)                                                                                                            |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `id` (tx hash)                                                                                    | `hash`                                                                                                                                    |
| `time_at` (unix)                                                                                  | `mined_at` (ISO 8601) / `mined_at_block`                                                                                                  |
| `chain` (short name)                                                                              | `relationships.chain.data.id` (full ID)                                                                                                   |
| `cate_id` (coarse: `send`, `receive`, `approve`, or `null`) + `tx.name` (method name)             | `operation_type` (always set: `send`, `receive`, `trade`, `approve`, `deposit`, `withdraw`, `mint`, `burn`, `claim`, `execute`, `deploy`) |
| `sends[]` / `receives[]`                                                                          | `transfers[]` with `direction` (`out` / `in`)                                                                                             |
| `sends[].amount` / `receives[].amount`                                                            | `transfers[].quantity.float` (also `.int`, `.numeric`)                                                                                    |
| `sends[].to_addr` / `receives[].from_addr`                                                        | `transfers[].recipient` / `transfers[].sender`                                                                                            |
| `token_id` → look up in `token_dict` (an address, `eth` for native, or a non-address id for NFTs) | `transfers[].fungible_info` (inlined, no dictionary lookup)                                                                               |
| `token_approve.spender`, `.value`                                                                 | `operation_type: approve` with `acts[]` / `approvals` detail                                                                              |
| `tx.from_addr` / `tx.to_addr`                                                                     | `sent_from` / `sent_to`                                                                                                                   |
| `tx.usd_gas_fee` / `tx.eth_gas_fee` (present on wallet-initiated txs, not on incoming transfers)  | `fee.value` / `fee.quantity.float`                                                                                                        |
| `is_scam` (per-transaction flag)                                                                  | `flags.is_trash`                                                                                                                          |
| `project_id` → `project_dict`                                                                     | `relationships.dapp.data.id` (dApp slug, e.g. `uniswap-v3`)                                                                               |
| `cex_id` → `cex_dict`                                                                             | No direct equivalent (Zerion does not label CEX deposit addresses)                                                                        |

### Filter mapping

| DeBank param                          | Zerion equivalent                                                                                                                                                                                                                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chain_id=eth` (single chain)         | `filter[chain_ids]=ethereum` (comma-separated for multiple)                                                                                                                                                                                                                                                                     |
| `token_id=0xa0b8…` (contract address) | `filter[fungible_ids]=<zerion-fungible-id>`. Zerion uses its own fungible IDs, not contract addresses. Look one up via [`/v1/fungibles?filter[search_query]=…`](/api-reference/fungibles/get-list-of-fungible-assets) or [`/v1/fungibles/{chain_id}:{address}`](/api-reference/fungibles/get-fungible-asset-by-implementation). |
| `start_time` (unix)                   | `filter[min_mined_at]` (and `filter[max_mined_at]`, ms epoch)                                                                                                                                                                                                                                                                   |
| `page_count` (max 20)                 | `page[size]`                                                                                                                                                                                                                                                                                                                    |
| (paging cursor)                       | Follow `links.next` from the response                                                                                                                                                                                                                                                                                           |

## NFTs

DeBank's `all_nft_list` returns NFTs across chains. The Zerion equivalent is [`/v1/wallets/{address}/nft-positions/`](/api-reference/wallets/get-wallet-nft-positions), which returns each holding with collection metadata and floor-price-based valuation.

```bash cURL theme={null}
curl -g -u "YOUR_API_KEY:" \
  "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/nft-positions/?currency=usd&page[size]=20"
```

| DeBank (`nft_list[].…`)                 | Zerion (`data[].attributes.…`)                                  |
| --------------------------------------- | --------------------------------------------------------------- |
| `contract_id`                           | `nft_info.contract_address`                                     |
| `inner_id`                              | `nft_info.token_id`                                             |
| `name`                                  | `nft_info.name`                                                 |
| `collection_name` (flat string)         | `collection_info.name`                                          |
| `content` / `thumbnail_url`             | `nft_info.content`                                              |
| `attributes[]` (`trait_type` / `value`) | No direct equivalent (Zerion does not return a flat trait list) |
| `usd_price` (floor-based)               | `value` (floor value); `price` is the floor price               |
| `amount` (quantity held, for ERC-1155)  | `amount`                                                        |
| `chain`                                 | `relationships.chain.data.id`                                   |

## Pagination

Replace DeBank's `start_time` cursor with Zerion's `links.next` URL. Each Zerion response includes a fully-formed next-page link you can fetch as-is.

```javascript theme={null}
async function getAll(url) {
  const all = [];
  const headers = { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` };

  while (url) {
    const res = await fetch(url, { headers });
    const { data, links } = await res.json();
    all.push(...data);
    url = links?.next ?? null;
  }
  return all;
}
```

## Realtime updates

DeBank's Cloud API is request/response, so keeping a wallet fresh means polling. Zerion offers [transaction webhooks](/webhooks): subscribe a callback URL to one or more wallets and receive a POST when any of them transact.

See the [wallet activity alerts recipe](/recipes/wallet-activity-alerts) for a working example.

## Differences from DeBank

Most DeBank use cases have a direct Zerion equivalent. A few aren't covered, and others behave differently. Worth a scan before you cut over.

**Not supported today:**

* **Protocol- and pool-level data:** DeBank exposes protocol TVL, pool stats, and token-level analytics through its `/v1/protocol`, `/v1/pool`, and `/v1/token` endpoints. Zerion is wallet-centric and does not expose protocol or pool aggregates.
* **Long-tail chains:** DeBank indexes some chains Zerion doesn't yet cover. Check the [supported chains list](/supported-blockchains) for the ones you rely on before migrating.
* **CEX labeling in history:** DeBank tags known centralized-exchange deposit addresses via `cex_dict`. Zerion does not label CEX addresses.
* **Token first-seen timestamp:** DeBank's `time_at` (when a token first appeared) has no per-position equivalent; Zerion's `updated_at` reflects the last balance change, not first acquisition.

If any of these matter for your migration, [let us know](#get-in-touch). Your feedback helps shape our roadmap.

**Worth knowing:**

* **Authentication:** DeBank uses an `AccessKey` header. Zerion uses [HTTP Basic Auth](/authentication). Get a key at [dashboard.zerion.io](https://dashboard.zerion.io).
* **Solana:** DeBank is EVM-only. Zerion accepts Solana addresses on the same `/wallets/{address}/...` endpoints used for EVM, and returns the same enriched shape. DeFi positions are not yet supported for Solana.
* **Chain IDs:** DeBank uses lowercase short names (`eth`, `bsc`, `matic`, `arb`, `op`, `avax`). Zerion uses full string IDs (`ethereum`, `binance-smart-chain`, `polygon`, `arbitrum`, `optimism`, `avalanche`). See the [full list](/supported-blockchains).
* **Token IDs:** DeBank keys tokens by contract address (and the chain short name for native tokens). Zerion uses its own fungible IDs. Resolve one via [`/v1/fungibles/{chain_id}:{address}`](/api-reference/fungibles/get-fungible-asset-by-implementation).
* **Values precomputed:** DeBank token objects return `amount` and `price` but not a USD value; you multiply them. Zerion returns `value` per position.
* **One endpoint for tokens and DeFi:** Zerion serves both wallet tokens and DeFi positions from `/positions/`. Switch via `filter[positions]=only_simple` (wallet only), `only_complex` (DeFi only), or `no_filter` (both).
* **Flattened DeFi:** DeBank nests positions under protocol objects with `supply`/`borrow`/`reward` token lists. Zerion returns one row per position tagged with `protocol_module` and `position_type` (including `loan` for debt). Reconstruct protocol grouping client-side via `relationships.dapp.data.id`.
* **No token dictionary:** DeBank history references tokens by id into a separate `token_dict`. Zerion inlines `fungible_info` in each transfer.
* **Transaction categorization:** DeBank's `cate_id` is coarse (`send`, `receive`, `approve`, or `null`), so most contract interactions arrive uncategorized and you infer intent from `tx.name` and `project_id`. Zerion always sets a decoded `operation_type` (`trade`, `deposit`, `withdraw`, `mint`, and so on).
* **Response shape:** Zerion uses [JSON:API](https://jsonapi.org/). Payloads live under `data[].attributes` with related entities under `data[].relationships`.
* **Spam filtering:** DeBank curates via `is_core`, `is_verified`, `is_suspicious`, `is_scam`, and `credit_score` signals (plus the `is_all` flag). Zerion uses `filter[trash]=only_non_trash`. See [spam filtering](/spam-filtering) for the full taxonomy.
* **Pagination:** DeBank pages history with `start_time`; Zerion returns a fully-formed `links.next` URL you can fetch as-is. See [pagination](/pagination-and-filtering).

## Get in touch

Have a use case we don't cover or need assistance with the migration? Our team is happy to help! Reach out via the chat widget on [dashboard.zerion.io](https://dashboard.zerion.io), or [email us](mailto:api@zerion.io).


# From GoldRush
Source: https://developers.zerion.io/migrate-from-goldrush

Migrate from GoldRush (Covalent) to Zerion API with endpoint mappings for token balances, transactions, prices, NFTs, DeFi positions, and PnL.

If you've been calling Covalent's [GoldRush API](https://goldrush.dev/docs/) (formerly the Covalent Unified API) for wallet balances, transactions, portfolio history, prices, or NFTs, the same data is available on Zerion API across [60+ EVM chains and Solana](/supported-blockchains), usually in a single call, plus two things GoldRush doesn't offer: DeFi protocol positions and wallet PnL.

This guide shows the direct mapping for the main GoldRush endpoints, with copy-pasteable code for each.

What you get with Zerion:

* **DeFi positions and PnL:** GoldRush returns token balances and raw transactions but no DeFi protocol positions (staking, lending, LPs) and no wallet PnL. Zerion returns both, from [`/positions/`](/api-reference/wallets/get-wallet-fungible-positions) and [`/pnl`](/api-reference/wallets/get-wallet-pnl).
* **One address, all chains:** GoldRush's core endpoints take a `chainName` in the path, one chain per call. Zerion returns every supported chain for an address in one call, filterable with `filter[chain_ids]`.
* **Decoded, not raw:** GoldRush transactions return `log_events[]` you interpret yourself. Zerion returns a decoded `operation_type` and a unified `transfers[]` array with token metadata and USD values inlined.
* **Decimal-adjusted amounts:** GoldRush balances are raw integer strings you divide by `10^contract_decimals`. Zerion returns `quantity.float` alongside the raw value.

## Endpoint parity

| Use case                | GoldRush API                                                                        | Zerion API                                                                                                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token balances          | `GET /v1/{chainName}/address/{address}/balances_v2/`                                | [`GET /v1/wallets/{address}/positions/?filter[positions]=only_simple`](/api-reference/wallets/get-wallet-fungible-positions)                                                                                          |
| Multichain balances     | `GET /v1/allchains/address/{address}/balances/`                                     | Same call (all chains by default)                                                                                                                                                                                     |
| DeFi positions          | (not available)                                                                     | [`GET /v1/wallets/{address}/positions/?filter[positions]=only_complex`](/api-reference/wallets/get-wallet-fungible-positions)                                                                                         |
| Net worth + 24h change  | (sum `quote` across balance items)                                                  | [`GET /v1/wallets/{address}/portfolio`](/api-reference/wallets/get-wallet-portfolio)                                                                                                                                  |
| Net worth over time     | `GET /v1/{chainName}/address/{address}/portfolio_v2/`                               | [`GET /v1/wallets/{address}/charts/{period}`](/api-reference/wallets/get-wallet-balance-chart)                                                                                                                        |
| Transactions            | `GET /v1/{chainName}/address/{address}/transactions_v3/page/{page}/`                | [`GET /v1/wallets/{address}/transactions/`](/api-reference/wallets/get-wallet-transactions)                                                                                                                           |
| Multichain transactions | `GET /v1/allchains/transactions/`                                                   | Same call (all chains by default)                                                                                                                                                                                     |
| Single transaction      | `GET /v1/{chainName}/transaction_v2/{txHash}/`                                      | [`GET /v1/wallets/{address}/transactions/?filter[search_query]=…`](/api-reference/wallets/get-wallet-transactions)                                                                                                    |
| Wallet PnL              | (not available)                                                                     | [`GET /v1/wallets/{address}/pnl`](/api-reference/wallets/get-wallet-pnl)                                                                                                                                              |
| Token prices            | `GET /v1/pricing/historical_by_addresses_v2/{chainName}/{quoteCurrency}/{address}/` | [`GET /v1/fungibles/by-implementation?implementation={chain}:{address}`](/api-reference/fungibles/get-fungible-asset-by-implementation) + [fungible chart](/api-reference/fungibles/get-a-chart-for-a-fungible-asset) |
| NFTs                    | `GET /v1/{chainName}/address/{address}/balances_nft/`                               | [`GET /v1/wallets/{address}/nft-positions/`](/api-reference/wallets/get-wallet-nft-positions)                                                                                                                         |
| Chains used by a wallet | `GET /v1/address/{address}/activity/`                                               | Derive from `positions_distribution_by_chain` on [`/portfolio`](/api-reference/wallets/get-wallet-portfolio)                                                                                                          |
| Realtime updates        | (pipeline delivery to your warehouse)                                               | [Transaction webhooks](/webhooks)                                                                                                                                                                                     |

<Tip>
  Prefer not to write code? The [Zerion CLI](/build-with-ai/zerion-cli) wraps the same endpoints with a one-shot `npx @zerion/cli init` flow, useful for quick experiments and AI agents.
</Tip>

## A note on chains

The biggest structural change is how you address chains:

* **GoldRush:** the chain is a path segment (`eth-mainnet`, `matic-mainnet`, `base-mainnet`), one chain per call, with separate `allchains` endpoints for cross-chain reads.
* **Zerion:** `GET /v1/wallets/{address}/...` returns every supported chain for the address by default, narrowed with `filter[chain_ids]=ethereum,base`. Chain IDs are plain lowercase names without the `-mainnet` suffix (`ethereum`, `polygon`, `base`, `solana`); see the [full list](/supported-blockchains).

So a per-chain loop over `eth-mainnet`, `matic-mainnet`, `base-mainnet` becomes a single Zerion call, with the chain of each row in `relationships.chain.data.id`.

## Token balances

GoldRush's `balances_v2` returns one item per token with `balance` (a raw integer string you divide by `10^contract_decimals`) and precomputed `quote_rate` / `quote`. Zerion returns a [JSON:API](https://jsonapi.org/) collection covering all chains at once, with `attributes.fungible_info` for metadata, `attributes.quantity.float` for the decimal-adjusted amount, and `attributes.value` for the USD value. The same endpoint accepts both EVM and Solana addresses.

<CodeGroup>
  ```javascript JavaScript (EVM) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[positions]=only_simple&filter[trash]=only_non_trash&sort=value`,
    {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(API_KEY + ":")}`,
      },
    }
  );
  const { data } = await res.json();

  for (const pos of data) {
    const { fungible_info, quantity, price, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`${fungible_info.symbol} on ${chain}: ${quantity.float} @ $${price} = $${value?.toFixed(2) ?? "N/A"}`);
  }
  ```

  ```javascript JavaScript (Solana) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[chain_ids]=solana&filter[trash]=only_non_trash&sort=value`,
    {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(API_KEY + ":")}`,
      },
    }
  );
  const { data } = await res.json();

  for (const pos of data) {
    const { fungible_info, quantity, price, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`${fungible_info.symbol} on ${chain}: ${quantity.float} @ $${price} = $${value?.toFixed(2) ?? "N/A"}`);
  }
  ```

  ```python Python (EVM) theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/positions/",
      params={
          "currency": "usd",
          "filter[positions]": "only_simple",
          "filter[trash]": "only_non_trash",
          "sort": "-value",
      },
      auth=(api_key, ""),
  )
  res.raise_for_status()

  for pos in res.json()["data"]:
      info = pos["attributes"]["fungible_info"]
      qty = pos["attributes"]["quantity"]["float"]
      value = pos["attributes"]["value"]
      chain = pos["relationships"]["chain"]["data"]["id"]
      print(f"{info['symbol']} on {chain}: {qty} = ${value:.2f}" if value else f"{info['symbol']} on {chain}: {qty}")
  ```

  ```bash cURL (EVM) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?currency=usd&filter[positions]=only_simple&filter[trash]=only_non_trash&sort=value"
  ```

  ```bash cURL (Solana) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH/positions/?currency=usd&filter[chain_ids]=solana&filter[trash]=only_non_trash&sort=value"
  ```
</CodeGroup>

### Field mapping

| GoldRush (`items[].…`)                                                      | Zerion (`data[].attributes.…`)                                                                                                                                               |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contract_ticker_symbol`, `contract_name`                                   | `fungible_info.symbol`, `fungible_info.name`                                                                                                                                 |
| `contract_address` (`is_native_token: true` for gas tokens)                 | `fungible_info.implementations[].address` (`null` for native)                                                                                                                |
| `contract_decimals`                                                         | `fungible_info.implementations[].decimals`                                                                                                                                   |
| `logo_urls.token_logo_url`                                                  | `fungible_info.icon.url`                                                                                                                                                     |
| `balance` (raw integer string)                                              | `quantity.int` (raw integer string). Also `quantity.float` (decimal number) and `quantity.numeric` (decimal string), so you don't divide by `10^contract_decimals` yourself. |
| `quote_rate`                                                                | `price`                                                                                                                                                                      |
| `quote` / `pretty_quote`                                                    | `value` (USD number; format client-side)                                                                                                                                     |
| `quote_24h`, `quote_rate_24h` (values as of 24h ago; you compute the delta) | `changes.absolute_1d`, `changes.percent_1d` (the 24h change, precomputed)                                                                                                    |
| `last_transferred_at` / `block_height`                                      | `updated_at` / `updated_at_block`                                                                                                                                            |
| `is_spam`, `no-spam` (query)                                                | `flags.is_trash`, or filter server-side with `filter[trash]=only_non_trash`                                                                                                  |
| `type` (`cryptocurrency` / `dust`)                                          | No dust class. `filter[trash]` covers spam and dust-like junk.                                                                                                               |
| `chain_name` (top-level, one chain per call)                                | `relationships.chain.data.id` (per row, all chains in one call)                                                                                                              |

<Note>
  `price` and `value` are `null` for tokens without a reliable price. Guard for `null` before summing or formatting.
</Note>

## Net worth

GoldRush has no net-worth endpoint; you sum `quote` across balance items, chain by chain. Zerion's [`/portfolio`](/api-reference/wallets/get-wallet-portfolio) returns the total, the 24h change, a breakdown by chain, and a breakdown by position type (wallet, deposited, borrowed, locked, staked) in one response.

<CodeGroup>
  ```javascript JavaScript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/portfolio?currency=usd`,
    { headers: { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` } }
  );
  const { data } = await res.json();
  const a = data.attributes;

  console.log(`Net worth: $${a.total.positions.toFixed(2)}`);
  console.log(`24h change: $${a.changes.absolute_1d?.toFixed(2)} (${a.changes.percent_1d?.toFixed(2)}%)`);
  console.log("By chain:", a.positions_distribution_by_chain);
  console.log("By type:", a.positions_distribution_by_type);
  ```

  ```python Python theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/portfolio",
      params={"currency": "usd"},
      auth=(api_key, ""),
  )
  a = res.json()["data"]["attributes"]
  print(f"Net worth: ${a['total']['positions']:.2f}")
  print(f"24h change: {a['changes']['percent_1d']}%")
  print("By chain:", a["positions_distribution_by_chain"])
  print("By type:", a["positions_distribution_by_type"])
  ```

  ```bash cURL theme={null}
  curl -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/portfolio?currency=usd"
  ```
</CodeGroup>

The per-chain breakdown replaces GoldRush's address activity endpoint (`/v1/address/{address}/activity/`) for the common "which chains does this wallet use" case: any chain with a non-zero entry in `positions_distribution_by_chain` is in use.

## Net worth over time

GoldRush's `portfolio_v2` returns per-token holdings over time, one chain per call, with OHLC buckets per day. Zerion's [`/charts/{period}`](/api-reference/wallets/get-wallet-balance-chart) returns the wallet's total value timeseries across all chains in one call, for periods from `hour` to `max` (full history).

```bash cURL theme={null}
curl -u "YOUR_API_KEY:" \
  "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/charts/month?currency=usd"
```

| GoldRush (`portfolio_v2`)                                   | Zerion (`/charts/{period}`)                                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `holdings[].timestamp` + `close.quote` (per token, per day) | `points[]` of `[timestamp, value]` (wallet total)                                                       |
| `days=30` (query)                                           | `{period}` path segment (`hour`, `day`, `week`, `month`, `3months`, `6months`, `year`, `5years`, `max`) |
| One chain per call                                          | All chains; narrow with `filter[chain_ids]`                                                             |

<Note>
  GoldRush's series is per token; Zerion's is the wallet total (scopeable by chain and by fungible via filters). For a single asset's price history, use the [fungible chart](/api-reference/fungibles/get-a-chart-for-a-fungible-asset).
</Note>

## Transactions

GoldRush's `transactions_v3` returns raw transactions with `log_events[]` (decoded event logs you interpret yourself) and native-value fields. Zerion's [`/transactions/`](/api-reference/wallets/get-wallet-transactions) returns enriched, human-readable transactions with a single decoded `operation_type`, a unified `transfers[]` array with token metadata and USD values inlined, fees, and the dApp when Zerion recognizes it. The same endpoint accepts both EVM and Solana addresses.

<CodeGroup>
  ```javascript JavaScript (EVM) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/transactions/?currency=usd&page[size]=20`,
    { headers }
  );
  const { data } = await res.json();

  for (const tx of data) {
    const { operation_type, mined_at, transfers, fee } = tx.attributes;
    const chain = tx.relationships.chain.data.id;
    const dappId = tx.relationships.dapp?.data?.id;

    console.log(`[${mined_at}] ${operation_type} on ${chain}`);
    if (dappId) console.log(`  via ${dappId}`);
    for (const t of transfers) {
      const sign = t.direction === "out" ? "-" : "+";
      const symbol = t.fungible_info?.symbol ?? "NFT";
      console.log(`  ${sign}${t.quantity.float} ${symbol} ($${t.value?.toFixed(2) ?? "?"})`);
    }
    console.log(`  Fee: $${fee.value?.toFixed(2) ?? "?"}`);
  }
  ```

  ```python Python (EVM) theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/transactions/",
      params={"currency": "usd", "page[size]": 20},
      auth=(api_key, ""),
  )
  for tx in res.json()["data"]:
      attrs = tx["attributes"]
      chain = tx["relationships"]["chain"]["data"]["id"]
      dapp_id = (tx["relationships"].get("dapp") or {}).get("data", {}).get("id")
      print(f"[{attrs['mined_at']}] {attrs['operation_type']} on {chain}")
      if dapp_id:
          print(f"  via {dapp_id}")
      for t in attrs["transfers"]:
          sign = "-" if t["direction"] == "out" else "+"
          symbol = (t.get("fungible_info") or {}).get("symbol", "NFT")
          val = t.get("value")
          print(f"  {sign}{t['quantity']['float']} {symbol} (${val:.2f})" if val else f"  {sign}{t['quantity']['float']} {symbol}")
  ```

  ```bash cURL (EVM) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/transactions/?currency=usd&page[size]=20"
  ```

  ```bash cURL (Solana) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH/transactions/?currency=usd&filter[chain_ids]=solana&page[size]=20"
  ```
</CodeGroup>

### Field mapping

| GoldRush (`items[].…`)                                                                  | Zerion (`data[].attributes.…`)                                                                                                                                 |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tx_hash`                                                                               | `hash`                                                                                                                                                         |
| `block_signed_at` / `block_height`                                                      | `mined_at` (ISO 8601) / `mined_at_block`                                                                                                                       |
| `successful`                                                                            | `status` (`confirmed` / `failed`, plus `pending` before mining)                                                                                                |
| `from_address` / `to_address`                                                           | `sent_from` / `sent_to`                                                                                                                                        |
| (no category; infer from `log_events`)                                                  | `operation_type` (always set: `trade`, `send`, `receive`, `approve`, `revoke`, `deposit`, `withdraw`, `mint`, `burn`, `claim`, `execute`, `deploy`, and so on) |
| `value` (native, raw) / `value_quote`                                                   | A `transfers[]` entry with `direction`, `quantity` and `value` (USD)                                                                                           |
| `log_events[]` (`decoded.name`, `decoded.params[]`, `sender_contract_ticker_symbol`, …) | `transfers[]` and `approvals` with `fungible_info` / `nft_info` inlined. Zerion decodes token movements for you; raw event logs are not returned.              |
| `internal_transfers` (`with-internal=true`)                                             | Internal value movements already appear in `transfers[]`                                                                                                       |
| `fees_paid` / `gas_quote` / `pretty_gas_quote`                                          | `fee.quantity.float` (native) / `fee.value` (USD)                                                                                                              |
| `gas_spent`, `gas_price`, `gas_offered`                                                 | No direct equivalent. Zerion returns the fee as quantity and value, not gas mechanics.                                                                         |
| (no equivalent)                                                                         | `relationships.dapp.data.id` (dApp slug, e.g. `uniswap-v3`, present when Zerion identifies it)                                                                 |

### Filter mapping

| GoldRush param                                                | Zerion equivalent                                                                                                 |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `{chainName}` path segment (one chain per call)               | `filter[chain_ids]=ethereum,base` (omit for all chains)                                                           |
| `/page/{page}/` path + `links.prev` / `links.next`            | Follow `links.next` from the response                                                                             |
| `before` / `after` cursors (`allchains/transactions`)         | Follow `links.next` from the response                                                                             |
| `addresses=0x…,0x…` (`allchains/transactions`, multi-address) | One address per call; for batches use [wallet sets](/api-reference/wallet-sets/get-wallet-set-fungible-positions) |
| `block-signed-at-asc=true`                                    | Not supported; newest first                                                                                       |
| `transaction_v2/{txHash}` (single tx)                         | `filter[search_query]=0x…` (matches the hash; the wallet address is still required in the path)                   |
| `quote-currency=USD`                                          | `currency=usd` (fiat and crypto units)                                                                            |

## DeFi positions

GoldRush has no DeFi positions product; reconstructing staking, lending, or LP exposure means decoding protocol events yourself. On Zerion, they're one call: each position is a row under `/positions/?filter[positions]=only_complex`, tagged with `protocol`, `protocol_module` (`lending`, `staked`, `liquidity_pool`, `locked`, `rewards`, `vesting`, and so on), and `position_type` (including `loan` for borrowed assets).

<CodeGroup>
  ```javascript JavaScript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[positions]=only_complex&sort=value`,
    { headers: { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` } }
  );
  const { data } = await res.json();

  for (const pos of data) {
    const { name, protocol, protocol_module, position_type, quantity, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`[${position_type}] ${name} | ${protocol} (${protocol_module}) on ${chain}: ${quantity.float} = $${value?.toFixed(2) ?? "N/A"}`);
  }
  ```

  ```python Python theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/positions/",
      params={"currency": "usd", "filter[positions]": "only_complex", "sort": "-value"},
      auth=(api_key, ""),
  )
  for pos in res.json()["data"]:
      a = pos["attributes"]
      chain = pos["relationships"]["chain"]["data"]["id"]
      print(f"[{a.get('position_type')}] {a['name']} | {a.get('protocol')} ({a.get('protocol_module')}) on {chain}: {a['quantity']['float']} = ${a['value'] or 0:.2f}")
  ```

  ```bash cURL theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?currency=usd&filter[positions]=only_complex&sort=value"
  ```
</CodeGroup>

Group rows by `relationships.dapp.data.id` to reconstruct protocols, and by `group_id` to reconstruct LP pairs. Wallet-level totals per type (deposited, borrowed, staked, locked) are in [`/portfolio`](/api-reference/wallets/get-wallet-portfolio) → `positions_distribution_by_type`.

## Wallet PnL

GoldRush has no wallet PnL endpoint. Zerion's [`/pnl`](/api-reference/wallets/get-wallet-pnl) returns wallet-level PnL computed with FIFO: realized and unrealized gain, net invested, total fees, and external in/out flows. Scope it per token with `filter[fungible_ids]`, per chain with `filter[chain_ids]`, or per time window with `since` / `till`.

<CodeGroup>
  ```javascript JavaScript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/pnl?currency=usd`,
    { headers: { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` } }
  );
  const { data } = await res.json();
  const a = data.attributes;

  console.log(`Realized gain:   $${a.realized_gain?.toFixed(2)}`);
  console.log(`Unrealized gain: $${a.unrealized_gain?.toFixed(2)}`);
  console.log(`Net invested:    $${a.net_invested?.toFixed(2)}`);
  console.log(`Total fees:      $${a.total_fee?.toFixed(2)}`);
  ```

  ```python Python theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/pnl",
      params={"currency": "usd"},
      auth=(api_key, ""),
  )
  a = res.json()["data"]["attributes"]
  print(f"Realized gain:   ${a['realized_gain']:.2f}")
  print(f"Unrealized gain: ${a['unrealized_gain']:.2f}")
  print(f"Net invested:    ${a['net_invested']:.2f}")
  print(f"Total fees:      ${a['total_fee']:.2f}")
  ```

  ```bash cURL theme={null}
  curl -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/pnl?currency=usd"
  ```
</CodeGroup>

See the [wallet PnL tracker recipe](/recipes/wallet-pnl-tracker) for a worked example.

## Token prices

GoldRush's pricing endpoint returns a daily price series per contract address, with the quote currency in the path. Zerion splits this into two calls: [`/fungibles/by-implementation`](/api-reference/fungibles/get-fungible-asset-by-implementation) for the live price with full asset metadata, and the [fungible chart](/api-reference/fungibles/get-a-chart-for-a-fungible-asset) for a timeseries.

<CodeGroup>
  ```javascript JavaScript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const implementation = "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"; // USDC

  const res = await fetch(
    `https://api.zerion.io/v1/fungibles/by-implementation?implementation=${implementation}&currency=usd`,
    { headers: { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` } }
  );
  const { data } = await res.json();
  const m = data.attributes.market_data;

  console.log(`${data.attributes.symbol}: $${m.price}`);
  console.log(`24h change: ${m.changes?.percent_1d?.toFixed(2)}%`);
  ```

  ```python Python theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  implementation = "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"  # USDC

  res = requests.get(
      "https://api.zerion.io/v1/fungibles/by-implementation",
      params={"implementation": implementation, "currency": "usd"},
      auth=(api_key, ""),
  )
  a = res.json()["data"]["attributes"]
  m = a["market_data"]
  print(f"{a['symbol']}: ${m['price']}")
  print(f"24h change: {m['changes']['percent_1d']}%")
  ```

  ```bash cURL theme={null}
  curl -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/fungibles/by-implementation?implementation=ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&currency=usd"
  ```
</CodeGroup>

### Field mapping

| GoldRush (pricing response)                                    | Zerion (`data.attributes.…`)                                                                                                                                           |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items[].price` / `pretty_price` (daily points)                | Live price in `market_data.price`; timeseries via the [fungible chart](/api-reference/fungibles/get-a-chart-for-a-fungible-asset)                                      |
| `from` / `to` (date range)                                     | Chart `{period}` (`hour`, `day`, `week`, `month`, `3months`, `6months`, `year`, `5years`, `max`)                                                                       |
| `{quoteCurrency}` path segment (fiat list)                     | `currency` query param (fiat and crypto units)                                                                                                                         |
| `contract_ticker_symbol`, `contract_name`, `contract_decimals` | `symbol`, `name`, `implementations[].decimals`                                                                                                                         |
| Multiple contract addresses per call (comma-separated)         | One implementation per call. For a batch, page [`/v1/fungibles/`](/api-reference/fungibles/get-list-of-fungible-assets) and read `market_data.price` from each result. |
| (no equivalent)                                                | `market_data.changes` (5m to 1y percent changes), `market_data.market_cap`, `market_data.total_supply`, `market_data.circulating_supply`                               |

## NFTs

GoldRush's `balances_nft` returns NFT holdings with tokenURI-derived `external_data`, one chain per call. The Zerion equivalent is [`/v1/wallets/{address}/nft-positions/`](/api-reference/wallets/get-wallet-nft-positions), which returns each holding with collection metadata and floor-price-based valuation across chains.

```bash cURL theme={null}
curl -g -u "YOUR_API_KEY:" \
  "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/nft-positions/?currency=usd&page[size]=20"
```

| GoldRush (`items[].…`)                           | Zerion (`data[].attributes.…`)                         |
| ------------------------------------------------ | ------------------------------------------------------ |
| `contract_address`                               | `nft_info.contract_address`                            |
| `nft_data[].token_id`                            | `nft_info.token_id`                                    |
| `supports_erc` (list, e.g. `["erc20","erc721"]`) | `nft_info.interface` (`erc721` / `erc1155`)            |
| `nft_data[].external_data` (`name`, `image`, …)  | `nft_info.name`, `nft_info.content`                    |
| `contract_name`                                  | `collection_info.name`                                 |
| `balance` (quantity held)                        | `amount`                                               |
| `floor_price_quote`                              | `value` (floor value); `price` is the floor price      |
| `last_transfered_at`                             | `changed_at`                                           |
| `is_spam`                                        | `nft_info.flags.is_spam`                               |
| `{chainName}` (one chain per call)               | `relationships.chain.data.id` (all chains in one call) |

## Pagination

Replace GoldRush's page-number paths and `before`/`after` cursors with Zerion's `links.next` URL. Each Zerion response includes a fully-formed next-page link you can fetch as-is.

```javascript theme={null}
async function getAll(url) {
  const all = [];
  const headers = { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` };

  while (url) {
    const res = await fetch(url, { headers });
    const { data, links } = await res.json();
    all.push(...data);
    url = links?.next ?? null;
  }
  return all;
}
```

## Realtime updates

GoldRush's realtime offering centers on pipeline delivery of decoded chain data into your own infrastructure. If what you actually need is "tell me when this wallet transacts", Zerion offers [transaction webhooks](/webhooks): subscribe a callback URL to one or more wallets and receive a POST when any of them transact.

See the [wallet activity alerts recipe](/recipes/wallet-activity-alerts) for a working example.

## Differences from GoldRush

Most GoldRush wallet use cases have a direct Zerion equivalent, and DeFi positions and PnL are additions. A few things aren't covered, and others behave differently. Worth a scan before you cut over.

**Not supported today:**

* **Historical balance snapshots:** GoldRush returns balances at any block height (`block-height`, `cutoff-timestamp`) and per-token holdings over time (`portfolio_v2`). Zerion exposes wallet value over time via [`/charts/{period}`](/api-reference/wallets/get-wallet-balance-chart) and asset price history via the [fungible chart](/api-reference/fungibles/get-a-chart-for-a-fungible-asset), but not balance-at-block.
* **Token holders:** GoldRush's `token_holders_v2` lists a token's holders at any height. Zerion is wallet-centric and does not return holder lists.
* **Token approvals state:** GoldRush's approvals endpoint returns current allowances with value-at-risk scoring. Zerion surfaces `approve` / `revoke` transactions in wallet history, but has no current-allowance endpoint.
* **Raw log events:** GoldRush returns decoded event logs (`log_events[].decoded`) for arbitrary contracts. Zerion returns enriched transfers and approvals, not raw logs.
* **Gas analytics:** `transactions_summary` aggregates (total fees paid, average gas per transaction) have no Zerion equivalent.
* **Bitcoin and long-tail chains:** GoldRush covers 100+ chains including `btc-mainnet` and appchains. Zerion covers EVM chains and Solana; check the [supported chains list](/supported-blockchains) for the ones you rely on.

If any of these matter for your migration, [let us know](#get-in-touch). Your feedback helps shape our roadmap.

**Worth knowing:**

* **Authentication:** GoldRush uses `Authorization: Bearer <key>`. Zerion uses [HTTP Basic Auth](/authentication) with the API key as username and an empty password. Get a key at [dashboard.zerion.io](https://dashboard.zerion.io).
* **Chains:** GoldRush puts a `chainName` slug in the path (`eth-mainnet`), one chain per call. Zerion returns all supported chains by default and filters with plain names: `filter[chain_ids]=ethereum,base`. See [the note above](#a-note-on-chains).
* **Address input:** GoldRush resolves ENS and other name services in the path. Zerion expects the wallet address itself; resolve names before calling.
* **Response shape:** GoldRush wraps everything in `{data, error, error_message, error_code}` with `items[]` inside. Zerion uses [JSON:API](https://jsonapi.org/): payloads live under `data[].attributes` with related entities under `data[].relationships`, and errors use HTTP status codes (see [error handling](/error-handling)).
* **Amounts decimal-adjusted:** GoldRush balances are raw integer strings. Zerion returns `quantity.float` (decimal), `quantity.int` (raw), and `quantity.numeric` (decimal string) on every position and transfer.
* **No pretty-formatted strings:** GoldRush pairs each value with a `pretty_*` display string. Zerion returns numbers; format client-side.
* **One endpoint for tokens and DeFi:** Zerion serves both wallet tokens and DeFi positions from `/positions/`. Switch via `filter[positions]=only_simple` (wallet only), `only_complex` (DeFi only), or `no_filter` (both).
* **Decoded transactions:** GoldRush gives you raw `log_events` to interpret. Zerion always sets a decoded `operation_type` and inlines transfer metadata, so most client-side decoding code goes away.
* **Multiple wallets:** GoldRush's `allchains/transactions` accepts multiple addresses per call. Zerion reads one address per `/wallets/` call; for batches use the [wallet sets](/api-reference/wallet-sets/get-wallet-set-fungible-positions) endpoints.
* **Spam filtering:** GoldRush flags `is_spam` and gates with `no-spam`. Zerion uses `filter[trash]=only_non_trash`. See [spam filtering](/spam-filtering) for the full taxonomy.
* **Pagination:** GoldRush pages by page number in the path (with `links.prev`/`links.next`) or cursors on `allchains` endpoints. Zerion returns a fully-formed `links.next` URL you can fetch as-is. See [pagination](/pagination-and-filtering).

## Get in touch

Have a use case we don't cover or need assistance with the migration? Our team is happy to help! Reach out via the chat widget on [dashboard.zerion.io](https://dashboard.zerion.io), or [email us](mailto:api@zerion.io).


# From Moralis
Source: https://developers.zerion.io/migrate-from-moralis

Map Moralis Web3 Data API endpoints to Zerion API equivalents for token balances, net worth, wallet history, PnL, DeFi positions, and prices, with code samples.

If you've been calling the Moralis Web3 Data API for wallet balances, net worth, transaction history, PnL, DeFi positions, or token prices, the same data is available on Zerion API across [60+ EVM chains and Solana](/supported-blockchains), usually in a single call.

This guide shows the direct mapping for the main Moralis wallet endpoints, with copy-pasteable code for each.

What you get with Zerion:

* **One address, all chains:** Most Moralis endpoints take a single `chain` parameter per call, so a multi-chain read means one request per chain. Zerion returns every supported chain for an address in one call, filterable with `filter[chain_ids]`.
* **One API for EVM and Solana:** Moralis serves Solana from a separate base URL (`solana-gateway.moralis.io`) with a different response schema. Zerion accepts Solana addresses on the same `/wallets/{address}/...` endpoints used for EVM.
* **One call for tokens + DeFi:** Moralis splits wallet tokens (`/wallets/{address}/tokens`) and DeFi positions (a separate API) into different products. Zerion serves both from `/positions/?filter[positions]=no_filter`.

## Endpoint parity

Moralis paths below are relative to `https://deep-index.moralis.io/api/v2.2` unless noted.

| Use case                         | Moralis Web3 Data API                                             | Zerion API                                                                                                                              |
| -------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens + DeFi (one call)         | Two products (`/wallets/{address}/tokens` + DeFi positions)       | [`GET /v1/wallets/{address}/positions/?filter[positions]=no_filter`](/api-reference/wallets/get-wallet-fungible-positions)              |
| Token balances (with prices)     | `GET /wallets/{address}/tokens`                                   | [`GET /v1/wallets/{address}/positions/?filter[positions]=only_simple`](/api-reference/wallets/get-wallet-fungible-positions)            |
| ERC-20 + native balance (legacy) | `GET /{address}/erc20` + `GET /{address}/balance`                 | Same `/positions/` call (native tokens included)                                                                                        |
| Net worth                        | `GET /wallets/{address}/net-worth`                                | [`GET /v1/wallets/{address}/portfolio`](/api-reference/wallets/get-wallet-portfolio)                                                    |
| Net worth over time              | (not available)                                                   | [`GET /v1/wallets/{address}/charts/{period}`](/api-reference/wallets/get-wallet-balance-chart)                                          |
| Wallet history                   | `GET /wallets/{address}/history`                                  | [`GET /v1/wallets/{address}/transactions/`](/api-reference/wallets/get-wallet-transactions)                                             |
| Swaps only                       | `GET /wallets/{address}/swaps`                                    | [`GET /v1/wallets/{address}/transactions/?filter[operation_types]=trade`](/api-reference/wallets/get-wallet-transactions)               |
| Wallet PnL                       | `GET /wallets/{address}/profitability` (+ `/summary`)             | [`GET /v1/wallets/{address}/pnl`](/api-reference/wallets/get-wallet-pnl)                                                                |
| DeFi positions                   | `GET https://api.moralis.com/v1/wallets/{address}/defi/positions` | [`GET /v1/wallets/{address}/positions/?filter[positions]=only_complex`](/api-reference/wallets/get-wallet-fungible-positions)           |
| Token price                      | `GET /erc20/{address}/price`                                      | [`GET /v1/fungibles/by-implementation?implementation={chain}:{address}`](/api-reference/fungibles/get-fungible-asset-by-implementation) |
| Token metadata                   | `GET /erc20/metadata`                                             | [`GET /v1/fungibles/`](/api-reference/fungibles/get-list-of-fungible-assets)                                                            |
| NFTs                             | `GET /{address}/nft`                                              | [`GET /v1/wallets/{address}/nft-positions/`](/api-reference/wallets/get-wallet-nft-positions)                                           |
| Solana wallet data               | Separate Solana API (`solana-gateway.moralis.io`)                 | Same `/wallets/{address}/...` endpoints                                                                                                 |
| Realtime updates                 | Moralis Streams                                                   | [Transaction webhooks](/webhooks)                                                                                                       |

<Tip>
  Prefer not to write code? The [Zerion CLI](/build-with-ai/zerion-cli) wraps the same endpoints with a one-shot `npx @zerion/cli init` flow, useful for quick experiments and AI agents.
</Tip>

## A note on chains

The biggest structural change is how you address chains:

* **Moralis:** Most endpoints take one `chain` query parameter per call (`chain=eth`, `chain=0x1`), so covering a wallet across five chains means five requests. Only net worth (and the newer Universal API endpoints) accept multiple chains at once.
* **Zerion:** `GET /v1/wallets/{address}/...` returns every supported chain for the address by default, narrowed with `filter[chain_ids]=ethereum,base`. Chain IDs are full lowercase names (`ethereum`, not `eth` or `0x1`); see the [full list](/supported-blockchains).

So a per-chain fan-out loop over `chain=eth`, `chain=polygon`, `chain=base` becomes a single Zerion call, with the chain of each row in `relationships.chain.data.id`.

## Token balances

Moralis's `/wallets/{address}/tokens` returns `result[]` with `balance` (raw integer), `balance_formatted`, `usd_price`, and `usd_value` per token, for one chain per call. Zerion returns a [JSON:API](https://jsonapi.org/) collection covering all chains at once, with `attributes.fungible_info` for metadata, `attributes.quantity` for amounts, and `attributes.value` for USD values. The same endpoint accepts both EVM and Solana addresses.

<CodeGroup>
  ```javascript JavaScript (EVM) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[positions]=only_simple&filter[trash]=only_non_trash&sort=value`,
    {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(API_KEY + ":")}`,
      },
    }
  );
  const { data } = await res.json();

  for (const pos of data) {
    const { fungible_info, quantity, price, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`${fungible_info.symbol} on ${chain}: ${quantity.float} @ $${price} = $${value?.toFixed(2) ?? "N/A"}`);
  }
  ```

  ```javascript JavaScript (Solana) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[chain_ids]=solana&filter[trash]=only_non_trash&sort=value`,
    {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(API_KEY + ":")}`,
      },
    }
  );
  const { data } = await res.json();

  for (const pos of data) {
    const { fungible_info, quantity, price, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`${fungible_info.symbol} on ${chain}: ${quantity.float} @ $${price} = $${value?.toFixed(2) ?? "N/A"}`);
  }
  ```

  ```python Python (EVM) theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/positions/",
      params={
          "currency": "usd",
          "filter[positions]": "only_simple",
          "filter[trash]": "only_non_trash",
          "sort": "-value",
      },
      auth=(api_key, ""),
  )
  res.raise_for_status()

  for pos in res.json()["data"]:
      info = pos["attributes"]["fungible_info"]
      qty = pos["attributes"]["quantity"]["float"]
      value = pos["attributes"]["value"]
      chain = pos["relationships"]["chain"]["data"]["id"]
      print(f"{info['symbol']} on {chain}: {qty} = ${value:.2f}" if value else f"{info['symbol']} on {chain}: {qty}")
  ```

  ```bash cURL (EVM) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?currency=usd&filter[positions]=only_simple&filter[trash]=only_non_trash&sort=value"
  ```

  ```bash cURL (Solana) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH/positions/?currency=usd&filter[chain_ids]=solana&filter[trash]=only_non_trash&sort=value"
  ```
</CodeGroup>

### Field mapping

| Moralis (`result[].…`)                                 | Zerion (`data[].attributes.…`)                                                                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `token_address` (`native_token: true` for gas tokens)  | `fungible_info.implementations[].address` (`null` for native)                                                                                                            |
| `symbol`, `name`                                       | `fungible_info.symbol`, `fungible_info.name`                                                                                                                             |
| `decimals`                                             | `fungible_info.implementations[].decimals`                                                                                                                               |
| `logo`, `thumbnail`                                    | `fungible_info.icon.url`                                                                                                                                                 |
| `balance` (raw integer string)                         | `quantity.int`                                                                                                                                                           |
| `balance_formatted`                                    | `quantity.float` (decimal number). Also `quantity.numeric` (decimal string).                                                                                             |
| `usd_price`                                            | `price`                                                                                                                                                                  |
| `usd_price_24hr_percent_change`                        | `changes.percent_1d`                                                                                                                                                     |
| `usd_value`                                            | `value` (USD, precomputed)                                                                                                                                               |
| `usd_value_24hr_usd_change`                            | `changes.absolute_1d`                                                                                                                                                    |
| `portfolio_percentage`                                 | Compute from `value` / [`/portfolio`](/api-reference/wallets/get-wallet-portfolio) → `total.positions`                                                                   |
| `possible_spam`                                        | `flags.is_trash`, or filter server-side with `filter[trash]=only_non_trash`                                                                                              |
| `verified_contract`                                    | `fungible_info.flags.verified`                                                                                                                                           |
| `exclude_spam`, `exclude_unverified_contracts` (query) | `filter[trash]=only_non_trash` (query)                                                                                                                                   |
| `total_supply`, `percentage_relative_to_total_supply`  | Supply data lives on the asset: [`/v1/fungibles/{id}`](/api-reference/fungibles/get-fungible-asset-by-id) → `market_data.total_supply`, `market_data.circulating_supply` |

<Note>
  `price` and `value` are `null` for tokens without a reliable price. Guard for `null` before summing or formatting.
</Note>

<Note>
  If you're on the legacy `GET /{address}/erc20` + `GET /{address}/balance` pair, the same `/positions/` call replaces both: native tokens come back as regular rows (implementation `address: null`), already decimal-adjusted and priced.
</Note>

## Net worth

Moralis's `net-worth` returns `total_networth_usd` with a per-chain breakdown of native vs token value. Zerion's [`/portfolio`](/api-reference/wallets/get-wallet-portfolio) returns the total, the 24h change, a breakdown by chain, and a breakdown by position type (wallet, deposited, borrowed, locked, staked) in one response.

<CodeGroup>
  ```javascript JavaScript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/portfolio?currency=usd`,
    { headers: { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` } }
  );
  const { data } = await res.json();
  const a = data.attributes;

  console.log(`Net worth: $${a.total.positions.toFixed(2)}`);
  console.log(`24h change: $${a.changes.absolute_1d?.toFixed(2)} (${a.changes.percent_1d?.toFixed(2)}%)`);
  console.log("By chain:", a.positions_distribution_by_chain);
  console.log("By type:", a.positions_distribution_by_type);
  ```

  ```python Python theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/portfolio",
      params={"currency": "usd"},
      auth=(api_key, ""),
  )
  a = res.json()["data"]["attributes"]
  print(f"Net worth: ${a['total']['positions']:.2f}")
  print(f"24h change: {a['changes']['percent_1d']}%")
  print("By chain:", a["positions_distribution_by_chain"])
  print("By type:", a["positions_distribution_by_type"])
  ```

  ```bash cURL theme={null}
  curl -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/portfolio?currency=usd"
  ```
</CodeGroup>

### Field mapping

| Moralis (`net-worth`)                                        | Zerion (`/portfolio` → `data.attributes.…`)                                                                                                                    |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `total_networth_usd`                                         | `total.positions`                                                                                                                                              |
| `chains[].networth_usd`                                      | `positions_distribution_by_chain` (keyed by chain ID)                                                                                                          |
| `chains[].native_balance_usd` / `chains[].token_balance_usd` | No native-vs-token split. The breakdown is by position type instead: `positions_distribution_by_type` (`wallet`, `deposited`, `borrowed`, `locked`, `staked`). |
| (no equivalent)                                              | `changes.absolute_1d`, `changes.percent_1d` (24h change)                                                                                                       |
| (no equivalent on Moralis)                                   | Net worth over time: [`/wallets/{address}/charts/{period}`](/api-reference/wallets/get-wallet-balance-chart) (periods from `hour` to `max`)                    |

## Wallet history

Moralis's `/wallets/{address}/history` returns decoded transactions for one chain per call, with a `category` label, a `summary` sentence, and transfers split into `erc20_transfers[]`, `native_transfers[]`, and `nft_transfers[]`. Zerion's [`/transactions/`](/api-reference/wallets/get-wallet-transactions) returns enriched transactions across all chains at once, with a single decoded `operation_type`, one unified `transfers[]` array, fees, and the dApp when Zerion recognizes it. The same endpoint accepts both EVM and Solana addresses.

<CodeGroup>
  ```javascript JavaScript (EVM) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/transactions/?currency=usd&page[size]=20`,
    { headers }
  );
  const { data } = await res.json();

  for (const tx of data) {
    const { operation_type, mined_at, transfers, fee } = tx.attributes;
    const chain = tx.relationships.chain.data.id;
    const dappId = tx.relationships.dapp?.data?.id;

    console.log(`[${mined_at}] ${operation_type} on ${chain}`);
    if (dappId) console.log(`  via ${dappId}`);
    for (const t of transfers) {
      const sign = t.direction === "out" ? "-" : "+";
      const symbol = t.fungible_info?.symbol ?? "NFT";
      console.log(`  ${sign}${t.quantity.float} ${symbol} ($${t.value?.toFixed(2) ?? "?"})`);
    }
    console.log(`  Fee: $${fee.value?.toFixed(2) ?? "?"}`);
  }
  ```

  ```python Python (EVM) theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/transactions/",
      params={"currency": "usd", "page[size]": 20},
      auth=(api_key, ""),
  )
  for tx in res.json()["data"]:
      attrs = tx["attributes"]
      chain = tx["relationships"]["chain"]["data"]["id"]
      dapp_id = (tx["relationships"].get("dapp") or {}).get("data", {}).get("id")
      print(f"[{attrs['mined_at']}] {attrs['operation_type']} on {chain}")
      if dapp_id:
          print(f"  via {dapp_id}")
      for t in attrs["transfers"]:
          sign = "-" if t["direction"] == "out" else "+"
          symbol = (t.get("fungible_info") or {}).get("symbol", "NFT")
          val = t.get("value")
          print(f"  {sign}{t['quantity']['float']} {symbol} (${val:.2f})" if val else f"  {sign}{t['quantity']['float']} {symbol}")
  ```

  ```bash cURL (EVM) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/transactions/?currency=usd&page[size]=20"
  ```

  ```bash cURL (Solana) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH/transactions/?currency=usd&filter[chain_ids]=solana&page[size]=20"
  ```
</CodeGroup>

### Field mapping

| Moralis (`result[].…`)                                                                                                                                                                                                 | Zerion (`data[].attributes.…`)                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hash`                                                                                                                                                                                                                 | `hash`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `block_timestamp` / `block_number`                                                                                                                                                                                     | `mined_at` (ISO 8601) / `mined_at_block`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `chain` (query param)                                                                                                                                                                                                  | `relationships.chain.data.id` (per transaction)                                                                                                                                                                                                                                                                                                                                                                                                            |
| `category` (`send`, `receive`, `token send`, `token receive`, `nft send`, `nft receive`, `airdrop`, `token swap`, `nft purchase`, `nft sale`, `deposit`, `withdraw`, `mint`, `burn`, `borrow`, `contract interaction`) | `operation_type` (`send`, `receive`, `trade`, `approve`, `revoke`, `deposit`, `withdraw`, `mint`, `burn`, `claim`, `bid`, `delegate`, `revoke_delegation`, `execute`, `deploy`). The send/receive variants collapse into `send` / `receive`; `token swap`, `nft purchase`, and `nft sale` become `trade`; `contract interaction` becomes `execute`. Approvals, which Moralis files under `contract interaction`, get their own `approve` / `revoke` types. |
| `summary` (human-readable sentence)                                                                                                                                                                                    | No direct equivalent. Compose from `operation_type` + `transfers[]`.                                                                                                                                                                                                                                                                                                                                                                                       |
| `erc20_transfers[]` / `native_transfers[]` / `nft_transfers[]` (three arrays)                                                                                                                                          | One `transfers[]` array; each entry carries `fungible_info` or `nft_info`                                                                                                                                                                                                                                                                                                                                                                                  |
| transfer `value` / `value_formatted`                                                                                                                                                                                   | `transfers[].quantity.int` (raw) / `.float` (decimal). USD in `transfers[].value` (Moralis history has no USD values).                                                                                                                                                                                                                                                                                                                                     |
| transfer `direction` (`send` / `receive`)                                                                                                                                                                              | `transfers[].direction` (`out` / `in`)                                                                                                                                                                                                                                                                                                                                                                                                                     |
| transfer `from_address` / `to_address`                                                                                                                                                                                 | `transfers[].sender` / `transfers[].recipient`                                                                                                                                                                                                                                                                                                                                                                                                             |
| `from_address` / `to_address` (transaction-level)                                                                                                                                                                      | `sent_from` / `sent_to`                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `from_address_label` / `to_address_label`                                                                                                                                                                              | No direct equivalent. `relationships.dapp.data.id` names the dApp when Zerion recognizes the contract.                                                                                                                                                                                                                                                                                                                                                     |
| `method_label`                                                                                                                                                                                                         | `application_metadata.method.name`                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `transaction_fee` (native units)                                                                                                                                                                                       | `fee.quantity.float` (native) / `fee.value` (USD)                                                                                                                                                                                                                                                                                                                                                                                                          |
| `receipt_status`                                                                                                                                                                                                       | `status` (`confirmed` / `failed`, plus `pending` before mining)                                                                                                                                                                                                                                                                                                                                                                                            |
| `possible_spam`                                                                                                                                                                                                        | `flags.is_trash`                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `include_internal_transactions=true` + `internal_transaction` flag                                                                                                                                                     | Internal value movements already appear in `transfers[]`                                                                                                                                                                                                                                                                                                                                                                                                   |

### Filter mapping

| Moralis param                                           | Zerion equivalent                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `chain=eth` (one chain per call)                        | `filter[chain_ids]=ethereum` (comma-separated for multiple; omit for all chains)           |
| `from_date` / `to_date`                                 | `filter[min_mined_at]` / `filter[max_mined_at]` (ms epoch)                                 |
| `limit=100`                                             | `page[size]=100`                                                                           |
| `cursor=<cursor>`                                       | Follow `links.next` from the response                                                      |
| `order=DESC`                                            | Default (newest first); ascending order is not supported                                   |
| `/wallets/{address}/swaps`, `transactionTypes=buy,sell` | `filter[operation_types]=trade`, then read `transfers[].direction` to tell buys from sells |

## Wallet PnL

Moralis's `profitability` endpoints return realized PnL only, per token (`/profitability`) or as totals (`/profitability/summary`), for one chain per call. Zerion's [`/pnl`](/api-reference/wallets/get-wallet-pnl) returns wallet-level PnL computed with FIFO across all chains: realized and unrealized gain, net invested, total fees, and external in/out flows.

<CodeGroup>
  ```javascript JavaScript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/pnl?currency=usd`,
    { headers: { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` } }
  );
  const { data } = await res.json();
  const a = data.attributes;

  console.log(`Realized gain:   $${a.realized_gain?.toFixed(2)}`);
  console.log(`Unrealized gain: $${a.unrealized_gain?.toFixed(2)}`);
  console.log(`Net invested:    $${a.net_invested?.toFixed(2)}`);
  console.log(`Total fees:      $${a.total_fee?.toFixed(2)}`);
  ```

  ```python Python theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/pnl",
      params={"currency": "usd"},
      auth=(api_key, ""),
  )
  a = res.json()["data"]["attributes"]
  print(f"Realized gain:   ${a['realized_gain']:.2f}")
  print(f"Unrealized gain: ${a['unrealized_gain']:.2f}")
  print(f"Net invested:    ${a['net_invested']:.2f}")
  print(f"Total fees:      ${a['total_fee']:.2f}")
  ```

  ```bash cURL theme={null}
  curl -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/pnl?currency=usd"
  ```
</CodeGroup>

### Field mapping

| Moralis (`profitability` / `summary`)                                                                           | Zerion (`data.attributes.…`)                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `total_realized_profit_usd`                                                                                     | `realized_gain`                                                                                                                                                          |
| (not returned; realized only)                                                                                   | `unrealized_gain`                                                                                                                                                        |
| `total_realized_profit_percentage`                                                                              | `relative_realized_gain_percentage`                                                                                                                                      |
| `total_usd_invested` (per token)                                                                                | `net_invested` (wallet-level)                                                                                                                                            |
| `result[]` per-token rows (`avg_buy_price_usd`, `avg_sell_price_usd`, `realized_profit_usd`, `count_of_trades`) | Wallet-level totals. For a per-token breakdown, call `/pnl` with `filter[fungible_ids]` or `filter[fungible_implementations]`; average buy/sell prices are not returned. |
| `days=7/30/60/90/all`                                                                                           | `since` / `till` (ms epoch; pre-computed marks at 1 day, 1 week, 1 month, 1 year, year-to-date)                                                                          |
| `chain=eth` (one chain; summary only on Ethereum, Base, Polygon)                                                | All chains by default; narrow with `filter[chain_ids]`                                                                                                                   |
| (no equivalent)                                                                                                 | `total_fee`, `received_external`, `sent_external`                                                                                                                        |

<Tip>
  See the [wallet PnL tracker recipe](/recipes/wallet-pnl-tracker) for a worked example including per-token filtering.
</Tip>

## DeFi positions

Moralis serves DeFi positions from its newer Universal API (`api.moralis.com/v1`), where each position nests a `tokens[]` array typed as `supplied`, `borrowed`, `reward`, or `lp`. Zerion flattens this: each position is one row under `/positions/?filter[positions]=only_complex`, tagged with `protocol`, `protocol_module`, and `position_type` (including `loan` for borrowed assets).

<CodeGroup>
  ```javascript JavaScript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[positions]=only_complex&sort=value`,
    { headers: { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` } }
  );
  const { data } = await res.json();

  for (const pos of data) {
    const { name, protocol, protocol_module, position_type, quantity, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`[${position_type}] ${name} | ${protocol} (${protocol_module}) on ${chain}: ${quantity.float} = $${value?.toFixed(2) ?? "N/A"}`);
  }
  ```

  ```python Python theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/positions/",
      params={"currency": "usd", "filter[positions]": "only_complex", "sort": "-value"},
      auth=(api_key, ""),
  )
  for pos in res.json()["data"]:
      a = pos["attributes"]
      chain = pos["relationships"]["chain"]["data"]["id"]
      print(f"[{a.get('position_type')}] {a['name']} | {a.get('protocol')} ({a.get('protocol_module')}) on {chain}: {a['quantity']['float']} = ${a['value'] or 0:.2f}")
  ```

  ```bash cURL theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?currency=usd&filter[positions]=only_complex&sort=value"
  ```
</CodeGroup>

### Field mapping

| Moralis (Universal API, `result[].…`)                                                                          | Zerion (`data[].attributes.…`)                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protocolName` / `protocolId`                                                                                  | `protocol` / `relationships.dapp.data.id`                                                                                                                 |
| `protocolLogo`                                                                                                 | `application_metadata.icon.url`                                                                                                                           |
| `chainId`                                                                                                      | `relationships.chain.data.id`                                                                                                                             |
| `position.label` (`lending`, `liquidity`, `staking`, `farming`, `vault`, `yield`, `vesting`, `perps`, `other`) | `protocol_module` (`lending`, `liquidity_pool`, `staked`, `locked`, `rewards`, `vesting`, `deposit`, `investment`, `yield`)                               |
| `position.tokens[].tokenType` (`supplied` / `borrowed` / `reward` / `lp`)                                      | `position_type` (`deposit`, `loan`, `reward`, `staked`, `locked`)                                                                                         |
| `position.tokens[].balanceFormatted`, `.usdPrice`, `.usdValue`                                                 | `quantity.float`, `price`, `value` (one row per token leg)                                                                                                |
| `position.balanceUsd`                                                                                          | Sum `value` over the position's rows; wallet totals are in [`/portfolio`](/api-reference/wallets/get-wallet-portfolio) → `positions_distribution_by_type` |
| `position.unclaimedUsd`                                                                                        | Rows with `position_type: reward`                                                                                                                         |
| `tokenType: lp` legs                                                                                           | One row per pool token, grouped by `group_id`                                                                                                             |
| `positionDetails` (APY, health factor, shares)                                                                 | No direct equivalent. Zerion surfaces the underlying token, USD value, and protocol module; derive health from supplied vs borrowed `value`.              |
| `defi/summary` (`activeProtocols`, `totalUsd` per protocol)                                                    | Group rows by `relationships.dapp.data.id` and sum `value`                                                                                                |

<Note>
  Moralis returns positions labeled `perps`. Zerion's positions model is spot and DeFi-protocol oriented and does not return perpetuals as positions. If perps matter for your migration, [let us know](#get-in-touch).
</Note>

## Token prices

Moralis's `/erc20/{address}/price` returns a DEX-pair-derived price with exchange metadata, one token and one chain per call. Zerion resolves a token by its implementation and returns full asset metadata including `market_data.price` and recent changes.

<CodeGroup>
  ```javascript JavaScript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const implementation = "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"; // USDC

  const res = await fetch(
    `https://api.zerion.io/v1/fungibles/by-implementation?implementation=${implementation}&currency=usd`,
    { headers: { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` } }
  );
  const { data } = await res.json();
  const m = data.attributes.market_data;

  console.log(`${data.attributes.symbol}: $${m.price}`);
  console.log(`24h change: ${m.changes?.percent_1d?.toFixed(2)}%`);
  ```

  ```python Python theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  implementation = "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"  # USDC

  res = requests.get(
      "https://api.zerion.io/v1/fungibles/by-implementation",
      params={"implementation": implementation, "currency": "usd"},
      auth=(api_key, ""),
  )
  a = res.json()["data"]["attributes"]
  m = a["market_data"]
  print(f"{a['symbol']}: ${m['price']}")
  print(f"24h change: {m['changes']['percent_1d']}%")
  ```

  ```bash cURL theme={null}
  curl -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/fungibles/by-implementation?implementation=ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&currency=usd"
  ```
</CodeGroup>

### Field mapping

| Moralis (price response)                                 | Zerion (`data.attributes.…`)                                                                                                                                           |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `usdPrice` / `usdPriceFormatted`                         | `market_data.price`                                                                                                                                                    |
| `usdPrice24hrPercentChange`                              | `market_data.changes.percent_1d`                                                                                                                                       |
| `nativePrice` (price in the chain's gas token)           | Request with `currency=eth` (the `currency` param accepts fiat and crypto units)                                                                                       |
| `tokenName`, `tokenSymbol`, `tokenLogo`, `tokenDecimals` | `name`, `symbol`, `icon.url`, `implementations[].decimals`                                                                                                             |
| `exchangeName`, `pairAddress`, `pairTotalLiquidityUsd`   | No direct equivalent. Zerion prices are aggregated, not tied to a single DEX pair.                                                                                     |
| `securityScore`, `possibleSpam`, `verifiedContract`      | `flags.verified`                                                                                                                                                       |
| `to_block` (price at a block)                            | No direct equivalent. Use the [fungible chart](/api-reference/fungibles/get-a-chart-for-a-fungible-asset) for a price timeseries.                                      |
| `POST /erc20/prices` (batch, max 30)                     | One implementation per call. For a batch, page [`/v1/fungibles/`](/api-reference/fungibles/get-list-of-fungible-assets) and read `market_data.price` from each result. |

<Note>
  If you also call `GET /erc20/metadata`, the same fungible objects carry the metadata: `market_data.total_supply`, `market_data.circulating_supply`, `market_data.market_cap`, and `market_data.fully_diluted_valuation` map to Moralis's `total_supply`, `circulating_supply`, `market_cap`, and `fully_diluted_valuation`.
</Note>

## NFTs

Moralis's `GET /{address}/nft` returns raw NFT holdings with tokenURI-based metadata for one chain per call. The Zerion equivalent is [`/v1/wallets/{address}/nft-positions/`](/api-reference/wallets/get-wallet-nft-positions), which returns each holding with collection metadata and floor-price-based valuation across chains.

```bash cURL theme={null}
curl -g -u "YOUR_API_KEY:" \
  "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/nft-positions/?currency=usd&page[size]=20"
```

| Moralis (`result[].…`)                                         | Zerion (`data[].attributes.…`)                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------ |
| `token_address`                                                | `nft_info.contract_address`                                        |
| `token_id`                                                     | `nft_info.token_id`                                                |
| `contract_type` (`ERC721` / `ERC1155`)                         | `nft_info.interface`                                               |
| `name` / `metadata` / `normalized_metadata`                    | `nft_info.name`, `nft_info.content`                                |
| `amount` (quantity held)                                       | `amount`                                                           |
| `floor_price` / `floor_price_usd` (with `include_prices=true`) | `price` (floor price) / `value` (floor value), returned by default |
| `possible_spam`                                                | `nft_info.flags.is_spam`                                           |
| `verified_collection`                                          | No direct equivalent                                               |
| `chain` (query param)                                          | `relationships.chain.data.id`                                      |

## Solana

Moralis serves Solana from a separate API (`https://solana-gateway.moralis.io`) with camelCase responses that don't match the EVM schema. On Zerion, Solana addresses go through the same wallet endpoints as EVM and return the same shape:

| Moralis Solana API                         | Zerion API                                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /account/mainnet/{address}/portfolio` | [`GET /v1/wallets/{address}/portfolio`](/api-reference/wallets/get-wallet-portfolio) + [`/positions/`](/api-reference/wallets/get-wallet-fungible-positions) |
| `GET /account/mainnet/{address}/balance`   | `/positions/` (native SOL comes back as a regular row)                                                                                                       |
| `GET /account/mainnet/{address}/tokens`    | [`GET /v1/wallets/{address}/positions/?filter[chain_ids]=solana`](/api-reference/wallets/get-wallet-fungible-positions)                                      |
| `GET /token/mainnet/{mint}/price`          | [`GET /v1/fungibles/by-implementation?implementation=solana:{mint}`](/api-reference/fungibles/get-fungible-asset-by-implementation)                          |
| `GET /account/mainnet/{address}/nft`       | [`GET /v1/wallets/{address}/nft-positions/?filter[chain_ids]=solana`](/api-reference/wallets/get-wallet-nft-positions)                                       |

Transaction history for Solana addresses works on the same [`/transactions/`](/api-reference/wallets/get-wallet-transactions) endpoint. DeFi positions are not yet supported for Solana.

## Pagination

Replace Moralis's `cursor` query parameter with Zerion's `links.next` URL. Each Zerion response includes a fully-formed next-page link you can fetch as-is.

```javascript theme={null}
async function getAll(url) {
  const all = [];
  const headers = { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` };

  while (url) {
    const res = await fetch(url, { headers });
    const { data, links } = await res.json();
    all.push(...data);
    url = links?.next ?? null;
  }
  return all;
}
```

## Realtime updates

Moralis Streams pushes on-chain events to your backend via webhooks. Zerion's equivalent is [transaction webhooks](/webhooks): subscribe a callback URL to one or more wallets and receive a POST when any of them transact.

See the [wallet activity alerts recipe](/recipes/wallet-activity-alerts) for a working example.

## Differences from Moralis

Most Moralis wallet use cases have a direct Zerion equivalent. A few aren't covered, and others behave differently. Worth a scan before you cut over.

**Not supported today:**

* **Price at a block and DEX-pair detail:** Moralis prices accept `to_block` and return the source exchange, pair address, and pair liquidity. Zerion returns an aggregated live price plus a chart timeseries.
* **Per-token trade analytics:** Moralis's per-token PnL rows include average buy/sell prices and trade counts, and `/swaps` classifies each swap as a buy or sell. Zerion's PnL is wallet-level (scopeable per token with `filter[fungible_ids]`), and trades are `operation_type: trade` transactions you classify from transfer directions.
* **Address labels:** Moralis annotates transactions with `from_address_label` / `to_address_label` (exchanges, known entities). Zerion identifies dApps (`relationships.dapp`) but does not label counterparty addresses.
* **Token analytics signals:** `securityScore`, pair liquidity, and holder data have no Zerion equivalent. Use `filter[trash]` and `fungible_info.flags.verified` for curation.
* **Perpetuals:** Moralis DeFi positions include a `perps` label. Zerion does not return perpetuals as positions.
* **Bitcoin:** Moralis Streams can watch Bitcoin addresses. Zerion covers EVM chains and Solana; check the [supported chains list](/supported-blockchains) for the ones you rely on.

If any of these matter for your migration, [let us know](#get-in-touch). Your feedback helps shape our roadmap.

**Worth knowing:**

* **Authentication:** Moralis uses an `X-API-Key` header. Zerion uses [HTTP Basic Auth](/authentication). Get a key at [dashboard.zerion.io](https://dashboard.zerion.io).
* **Chains:** Moralis takes one `chain` per call (`eth`, `0x1`). Zerion returns all supported chains by default and filters with full names: `filter[chain_ids]=ethereum,base`. See [the note above](#a-note-on-chains).
* **One base URL:** Moralis splits EVM (`deep-index.moralis.io`), Solana (`solana-gateway.moralis.io`), and the Universal API (`api.moralis.com`) across different hosts and schemas. Zerion serves everything from `api.zerion.io/v1` with one response shape.
* **Consistent casing:** Moralis mixes snake\_case (wallet endpoints) and camelCase (prices, swaps, Solana, Universal API) across endpoint families. Zerion responses are uniformly snake\_case [JSON:API](https://jsonapi.org/): payloads live under `data[].attributes` with related entities under `data[].relationships`.
* **One endpoint for tokens and DeFi:** Zerion serves both wallet tokens and DeFi positions from `/positions/`. Switch via `filter[positions]=only_simple` (wallet only), `only_complex` (DeFi only), or `no_filter` (both).
* **Flattened DeFi:** Moralis nests typed `tokens[]` inside each position. Zerion returns one row per position leg tagged with `protocol_module` and `position_type` (including `loan` for debt). Group by `relationships.dapp.data.id` to reconstruct protocols, and by `group_id` to reconstruct LP pairs.
* **USD values in history:** Moralis history returns transfer amounts without USD values. Zerion returns `value` (USD at execution time) on each transfer and fee.
* **Wallet value over time:** Moralis has no net-worth-history endpoint. Zerion's [`/charts/{period}`](/api-reference/wallets/get-wallet-balance-chart) returns the wallet's value timeseries directly.
* **Spam filtering:** Moralis flags `possible_spam` and gates with `exclude_spam` / liquidity thresholds. Zerion uses `filter[trash]=only_non_trash`. See [spam filtering](/spam-filtering).
* **Pagination:** Moralis pages with a `cursor` parameter; Zerion returns a fully-formed `links.next` URL you can fetch as-is. See [pagination](/pagination-and-filtering).

## Get in touch

Have a use case we don't cover or need assistance with the migration? Our team is happy to help! Reach out via the chat widget on [dashboard.zerion.io](https://dashboard.zerion.io), or [email us](mailto:api@zerion.io).


# From OneBalance
Source: https://developers.zerion.io/migrate-from-onebalance

Map OneBalance backend endpoints to the Zerion API for wallet data, covering aggregated balances, transaction history, and asset list, with side-by-side code.

OneBalance's [backend services were deprecated on May 18, 2026](https://zerion.io/blog/migrating-from-onebalance-to-zerion-api/). If you've been calling OneBalance for aggregated balances, transaction history, or the asset list, Zerion API replaces the wallet data layer with normalized responses across [60+ EVM chains and Solana](/supported-blockchains).

This guide shows the direct mapping for the main OneBalance data endpoints, with copy-pasteable code for each.

What you get with Zerion:

* **Full wallet portfolio in one call:** OneBalance's `aggregated-balance` requires one request per asset (you specify `aggregatedAssetId=ob:usdc` etc.). Zerion's `/positions/` returns every token a wallet holds in a single call.
* **More chains, same shape:** Zerion covers 60+ EVM chains plus Solana versus OneBalance's 11. Solana addresses use the same `/wallets/{address}/...` paths as EVM, with the same enriched response shape.
* **Enriched transaction history and DeFi positions:** Zerion's `/transactions/` returns decoded `operation_type`, `transfers[]`, fees, and dApp metadata. DeFi positions (lending, staking, LPs) are exposed alongside wallet balances via `filter[positions]=only_complex`.

<Note>
  Zerion API is the data-layer replacement for OneBalance. For multichain execution (swaps, contract calls), pair Zerion with [Relay](https://relay.link/). For embedded wallets and smart account management, pair with [Privy](https://privy.io/) or [Turnkey](https://turnkey.com/).
</Note>

## Endpoint parity

| Use case                 | OneBalance                                                        | Zerion API                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Wallet portfolio total   | `GET /api/v3/balances/aggregated-balance` (one call per asset)    | [`GET /v1/wallets/{address}/portfolio`](/api-reference/wallets/get-wallet-portfolio) (one call, every asset)                  |
| Token balances           | `GET /api/v3/balances/aggregated-balance` per `aggregatedAssetId` | [`GET /v1/wallets/{address}/positions/?filter[positions]=only_simple`](/api-reference/wallets/get-wallet-fungible-positions)  |
| DeFi positions           | (not covered)                                                     | [`GET /v1/wallets/{address}/positions/?filter[positions]=only_complex`](/api-reference/wallets/get-wallet-fungible-positions) |
| Wallet + DeFi (one call) | (not covered)                                                     | [`GET /v1/wallets/{address}/positions/?filter[positions]=no_filter`](/api-reference/wallets/get-wallet-fungible-positions)    |
| Transaction history      | `GET /api/v3/status/get-tx-history`                               | [`GET /v1/wallets/{address}/transactions/`](/api-reference/wallets/get-wallet-transactions)                                   |
| Asset list               | `GET /api/assets/list`                                            | [`GET /v1/fungibles/`](/api-reference/fungibles/get-list-of-fungible-assets)                                                  |
| Realtime updates         | (polling `quote/status`)                                          | [Transaction webhooks](/webhooks)                                                                                             |

<Tip>
  Prefer not to write code? The [Zerion CLI](/build-with-ai/zerion-cli) wraps the same endpoints with a one-shot `npx @zerion/cli init` flow, useful for quick experiments and AI agents.
</Tip>

## Wallet portfolio

OneBalance returns the aggregated value of one asset across chains per request. To know a wallet's total USD value, you call `aggregated-balance` for each asset and sum the `fiatValue`. Zerion's `/portfolio` endpoint returns the total, 24h change, and breakdowns by chain and position type in one call.

<CodeGroup>
  ```javascript JavaScript (EVM) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/portfolio?currency=usd`,
    {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(API_KEY + ":")}`,
      },
    }
  );
  const { data } = await res.json();
  const attrs = data.attributes;

  console.log(`Total: $${attrs.total.positions.toFixed(2)}`);
  console.log(`24h change: ${(attrs.changes.percent_1d * 100).toFixed(2)}%`);
  console.log(`By chain:`, attrs.positions_distribution_by_chain);
  ```

  ```javascript JavaScript (Solana) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/portfolio?currency=usd`,
    {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(API_KEY + ":")}`,
      },
    }
  );
  const { data } = await res.json();
  const attrs = data.attributes;

  console.log(`Total: $${attrs.total.positions.toFixed(2)}`);
  console.log(`24h change: ${(attrs.changes.percent_1d * 100).toFixed(2)}%`);
  console.log(`By chain:`, attrs.positions_distribution_by_chain);
  ```

  ```python Python (EVM) theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/portfolio",
      params={"currency": "usd"},
      auth=(api_key, ""),
  )
  res.raise_for_status()
  attrs = res.json()["data"]["attributes"]
  print(f"Total: ${attrs['total']['positions']:.2f}")
  print(f"24h change: {attrs['changes']['percent_1d'] * 100:.2f}%")
  print(f"By chain: {attrs['positions_distribution_by_chain']}")
  ```

  ```python Python (Solana) theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/portfolio",
      params={"currency": "usd"},
      auth=(api_key, ""),
  )
  res.raise_for_status()
  attrs = res.json()["data"]["attributes"]
  print(f"Total: ${attrs['total']['positions']:.2f}")
  print(f"24h change: {attrs['changes']['percent_1d'] * 100:.2f}%")
  print(f"By chain: {attrs['positions_distribution_by_chain']}")
  ```

  ```bash cURL (EVM) theme={null}
  curl -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/portfolio?currency=usd"
  ```

  ```bash cURL (Solana) theme={null}
  curl -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH/portfolio?currency=usd"
  ```
</CodeGroup>

### Field mapping

| OneBalance (`aggregated-balance`)                                                         | Zerion (`/portfolio` → `data.attributes.…`)                                                 |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `totalBalance.fiatValue` (per-asset, summed client-side)                                  | `total.positions` (whole wallet, one number)                                                |
| `balanceByAggregatedAsset[].fiatValue`                                                    | Sum positions client-side from `/positions/`, or use `total.positions` for the wallet total |
| `balanceByAggregatedAsset[].individualAssetBalances[]` (per-chain breakdown of one asset) | `positions_distribution_by_chain` (per-chain breakdown of the whole wallet)                 |
| (no equivalent)                                                                           | `changes.percent_1d`, `changes.absolute_1d` (24h change)                                    |
| (no equivalent)                                                                           | `positions_distribution_by_type` (wallet vs deposited vs staked vs locked)                  |

## Token balances

OneBalance returns balances grouped by aggregated asset (e.g., "USDC across all chains"). Zerion returns one entry per token per chain via `/positions/`, with `relationships.chain.data.id` on each entry. To replicate OneBalance's per-asset aggregation, group Zerion positions client-side by `fungible_info.id` and sum `value`.

<CodeGroup>
  ```javascript JavaScript (EVM) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[positions]=only_simple&filter[trash]=only_non_trash&sort=value`,
    {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(API_KEY + ":")}`,
      },
    }
  );
  const { data } = await res.json();

  // Per-position view (one entry per token per chain)
  for (const pos of data) {
    const { fungible_info, quantity, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`${fungible_info.symbol} on ${chain}: ${quantity.float} = $${value?.toFixed(2) ?? "N/A"}`);
  }

  // OneBalance-style aggregated view: sum by fungible id
  const byAsset = {};
  for (const pos of data) {
    const id = pos.attributes.fungible_info.id;
    const symbol = pos.attributes.fungible_info.symbol;
    byAsset[id] = byAsset[id] ?? { symbol, total: 0, chains: [] };
    byAsset[id].total += pos.attributes.value ?? 0;
    byAsset[id].chains.push(pos.relationships.chain.data.id);
  }
  ```

  ```javascript JavaScript (Solana) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[chain_ids]=solana&filter[trash]=only_non_trash&sort=value`,
    {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(API_KEY + ":")}`,
      },
    }
  );
  const { data } = await res.json();

  for (const pos of data) {
    const { fungible_info, quantity, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`${fungible_info.symbol} on ${chain}: ${quantity.float} = $${value?.toFixed(2) ?? "N/A"}`);
  }
  ```

  ```python Python (EVM) theme={null}
  import os, requests
  from collections import defaultdict

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/positions/",
      params={
          "currency": "usd",
          "filter[positions]": "only_simple",
          "filter[trash]": "only_non_trash",
          "sort": "-value",
      },
      auth=(api_key, ""),
  )
  res.raise_for_status()

  # Per-position view
  for pos in res.json()["data"]:
      info = pos["attributes"]["fungible_info"]
      qty = pos["attributes"]["quantity"]["float"]
      value = pos["attributes"]["value"]
      chain = pos["relationships"]["chain"]["data"]["id"]
      print(f"{info['symbol']} on {chain}: {qty} = ${value:.2f}" if value else f"{info['symbol']} on {chain}: {qty}")

  # OneBalance-style aggregated view: sum by fungible id
  by_asset = defaultdict(lambda: {"symbol": None, "total": 0.0, "chains": []})
  for pos in res.json()["data"]:
      info = pos["attributes"]["fungible_info"]
      by_asset[info["id"]]["symbol"] = info["symbol"]
      by_asset[info["id"]]["total"] += pos["attributes"]["value"] or 0
      by_asset[info["id"]]["chains"].append(pos["relationships"]["chain"]["data"]["id"])
  ```

  ```python Python (Solana) theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/positions/",
      params={
          "currency": "usd",
          "filter[chain_ids]": "solana",
          "filter[trash]": "only_non_trash",
          "sort": "-value",
      },
      auth=(api_key, ""),
  )
  res.raise_for_status()

  for pos in res.json()["data"]:
      info = pos["attributes"]["fungible_info"]
      qty = pos["attributes"]["quantity"]["float"]
      value = pos["attributes"]["value"]
      chain = pos["relationships"]["chain"]["data"]["id"]
      print(f"{info['symbol']} on {chain}: {qty} = ${value:.2f}" if value else f"{info['symbol']} on {chain}: {qty}")
  ```

  ```bash cURL (EVM) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?currency=usd&filter[positions]=only_simple&filter[trash]=only_non_trash&sort=value"
  ```

  ```bash cURL (Solana) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH/positions/?currency=usd&filter[chain_ids]=solana&filter[trash]=only_non_trash&sort=value"
  ```
</CodeGroup>

### Field mapping

| OneBalance (`balanceByAggregatedAsset[].…`)                                 | Zerion (`data[].attributes.…`)                                                                |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `aggregatedAssetId` (`"ob:usdc"`)                                           | `fungible_info.id` (Zerion-specific fungible ID; one per token across chains)                 |
| `balance` (raw, summed across chains)                                       | Sum `quantity.int` across positions with the same `fungible_info.id`                          |
| `fiatValue` (USD value, summed)                                             | Sum `value` across positions with the same `fungible_info.id`                                 |
| `individualAssetBalances[].assetType` (CAIP, e.g. `eip155:1/erc20:0xa0b8…`) | `relationships.chain.data.id` + `fungible_info.implementations[].address`                     |
| `individualAssetBalances[].balance` (per chain, raw)                        | `quantity.int` on the matching position                                                       |
| `individualAssetBalances[].fiatValue` (per chain, USD)                      | `value` on the matching position                                                              |
| `accounts.evm` / `accounts.solana` (CAIP account format)                    | Zerion takes plain addresses (`0x…` or base58 Solana) on the same `/wallets/{address}/…` path |

<Note>
  `price` and `value` are `null` for tokens without a reliable price. Guard for `null` before summing or formatting.
</Note>

## Transaction history

OneBalance's `get-tx-history` returns transactions performed through the OneBalance system (smart-account operations). Zerion's `/transactions/` returns enriched, decoded wallet history with `operation_type`, `transfers[]`, fees, and dApp metadata for any address, on every supported chain.

<CodeGroup>
  ```javascript JavaScript (EVM) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/transactions/?currency=usd&page[size]=20`,
    { headers }
  );
  const { data } = await res.json();

  for (const tx of data) {
    const { operation_type, mined_at, transfers, fee } = tx.attributes;
    const chain = tx.relationships.chain.data.id;
    const dappId = tx.relationships.dapp?.data?.id;

    console.log(`[${mined_at}] ${operation_type} on ${chain}`);
    if (dappId) console.log(`  via ${dappId}`);
    for (const t of transfers) {
      const sign = t.direction === "out" ? "-" : "+";
      const symbol = t.fungible_info?.symbol ?? "NFT";
      console.log(`  ${sign}${t.quantity.float} ${symbol} ($${t.value?.toFixed(2) ?? "?"})`);
    }
    console.log(`  Fee: $${fee.value?.toFixed(2) ?? "?"}`);
  }
  ```

  ```javascript JavaScript (Solana) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/transactions/?currency=usd&filter[chain_ids]=solana&page[size]=20`,
    { headers }
  );
  const { data } = await res.json();

  for (const tx of data) {
    const { operation_type, mined_at, transfers, fee } = tx.attributes;
    const chain = tx.relationships.chain.data.id;
    const dappId = tx.relationships.dapp?.data?.id;

    console.log(`[${mined_at}] ${operation_type} on ${chain}`);
    if (dappId) console.log(`  via ${dappId}`);
    for (const t of transfers) {
      const sign = t.direction === "out" ? "-" : "+";
      const symbol = t.fungible_info?.symbol ?? "NFT";
      console.log(`  ${sign}${t.quantity.float} ${symbol} ($${t.value?.toFixed(2) ?? "?"})`);
    }
    console.log(`  Fee: $${fee.value?.toFixed(2) ?? "?"}`);
  }
  ```

  ```python Python (EVM) theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/transactions/",
      params={"currency": "usd", "page[size]": 20},
      auth=(api_key, ""),
  )
  for tx in res.json()["data"]:
      attrs = tx["attributes"]
      chain = tx["relationships"]["chain"]["data"]["id"]
      dapp_id = (tx["relationships"].get("dapp") or {}).get("data", {}).get("id")
      print(f"[{attrs['mined_at']}] {attrs['operation_type']} on {chain}")
      if dapp_id:
          print(f"  via {dapp_id}")
      for t in attrs["transfers"]:
          sign = "-" if t["direction"] == "out" else "+"
          symbol = (t.get("fungible_info") or {}).get("symbol", "NFT")
          val = t.get("value")
          print(f"  {sign}{t['quantity']['float']} {symbol} (${val:.2f})" if val else f"  {sign}{t['quantity']['float']} {symbol}")
  ```

  ```python Python (Solana) theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/transactions/",
      params={"currency": "usd", "filter[chain_ids]": "solana", "page[size]": 20},
      auth=(api_key, ""),
  )
  for tx in res.json()["data"]:
      attrs = tx["attributes"]
      chain = tx["relationships"]["chain"]["data"]["id"]
      dapp_id = (tx["relationships"].get("dapp") or {}).get("data", {}).get("id")
      print(f"[{attrs['mined_at']}] {attrs['operation_type']} on {chain}")
      if dapp_id:
          print(f"  via {dapp_id}")
      for t in attrs["transfers"]:
          sign = "-" if t["direction"] == "out" else "+"
          symbol = (t.get("fungible_info") or {}).get("symbol", "NFT")
          val = t.get("value")
          print(f"  {sign}{t['quantity']['float']} {symbol} (${val:.2f})" if val else f"  {sign}{t['quantity']['float']} {symbol}")
  ```

  ```bash cURL (EVM) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/transactions/?currency=usd&page[size]=20"
  ```

  ```bash cURL (Solana) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH/transactions/?currency=usd&filter[chain_ids]=solana&page[size]=20"
  ```
</CodeGroup>

### Field mapping

OneBalance's `get-tx-history` is scoped to OneBalance-system operations and surfaces quote-level metadata. Zerion's `/transactions/` is a wallet-level, decoded activity feed. The shape differs more than for balances; map at the concept level.

| OneBalance concept                       | Zerion (`data[].attributes.…`)                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Transaction id / hash                    | `hash`                                                                                                                        |
| Block timestamp                          | `mined_at` (ISO 8601) / `mined_at_block`                                                                                      |
| Originating chain                        | `relationships.chain.data.id` (string IDs, e.g. `"ethereum"`)                                                                 |
| Operation kind (transfer / swap / call)  | `operation_type` (`send`, `receive`, `trade`, `approve`, `deposit`, `withdraw`, `mint`, `burn`, `claim`, `execute`, `deploy`) |
| Token movements (per-leg amount + USD)   | `transfers[]` with `direction`, `quantity.int`, `value`, `fungible_info`, `sender`, `recipient`                               |
| Gas / fee paid                           | `fee.value` (USD), `fee.fungible_info`                                                                                        |
| (no OneBalance equivalent)               | `relationships.dapp.data.id` (dApp slug when Zerion recognizes the protocol)                                                  |
| Quote status (`PENDING`, `CONFIRMED`, …) | `status` (`confirmed`, `pending`, `failed`)                                                                                   |

## Asset list

OneBalance's `/api/assets/list` returns its catalog of aggregated assets (each `ob:*` ID groups one logical token across chains). Zerion's `/v1/fungibles/` is the equivalent token catalog, with each fungible exposing `implementations[]` per chain.

<CodeGroup>
  ```javascript JavaScript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  const res = await fetch(
    `https://api.zerion.io/v1/fungibles/?filter[search_query]=usdc&page[size]=5`,
    { headers }
  );
  const { data } = await res.json();

  for (const f of data) {
    const a = f.attributes;
    console.log(`${a.symbol} (${a.name}): ${a.implementations.length} chain implementations`);
    for (const impl of a.implementations.slice(0, 3)) {
      console.log(`  ${impl.chain_id}: ${impl.address || "native"} (${impl.decimals} decimals)`);
    }
  }
  ```

  ```python Python theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]

  res = requests.get(
      "https://api.zerion.io/v1/fungibles/",
      params={"filter[search_query]": "usdc", "page[size]": 5},
      auth=(api_key, ""),
  )
  for f in res.json()["data"]:
      a = f["attributes"]
      print(f"{a['symbol']} ({a['name']}): {len(a['implementations'])} chain implementations")
      for impl in a["implementations"][:3]:
          print(f"  {impl['chain_id']}: {impl.get('address') or 'native'} ({impl['decimals']} decimals)")
  ```

  ```bash cURL theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/fungibles/?filter[search_query]=usdc&page[size]=5"
  ```
</CodeGroup>

### Field mapping

| OneBalance (`/api/assets/list` items)                         | Zerion (`/v1/fungibles/` → `data[].attributes.…`)                            |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `aggregatedAssetId` (`"ob:usdc"`)                             | `id` on the response item; pass to `filter[fungible_ids]` on other endpoints |
| `symbol`, `name`, `decimals`                                  | `symbol`, `name`, `implementations[].decimals`                               |
| `aggregatedEntities[].assetType` (CAIP, `eip155:1/erc20:0x…`) | `implementations[].chain_id` + `implementations[].address`                   |
| `aggregatedEntities[].decimals`                               | `implementations[].decimals`                                                 |

## Pagination

OneBalance's `get-tx-history` accepts `offset` and `limit`. Zerion returns a fully-formed `links.next` URL on every paginated response. Fetch it as-is.

```javascript theme={null}
async function getAll(url) {
  const all = [];
  const headers = { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` };

  while (url) {
    const res = await fetch(url, { headers });
    const { data, links } = await res.json();
    all.push(...data);
    url = links?.next ?? null;
  }
  return all;
}
```

## Differences from OneBalance

Most OneBalance data-layer use cases have a direct Zerion equivalent. A few aren't covered yet, and others behave differently. Worth a scan before you cut over.

**Not supported today:**

* **Multichain execution (swap, transfer, contract call):** OneBalance's `quote` / `prepare-call-quote` / `execute-quote` flow lets you spend an aggregated balance and bridge in one operation. Zerion is data-only. Pair Zerion with [Relay](https://relay.link/) for execution.
* **Smart account management:** `predict-address`, account deployment, and signing flows have no Zerion equivalent. Pair with [Privy](https://privy.io/) or [Turnkey](https://turnkey.com/) for embedded wallets and key management.
* **Resource locks / EIP-7702 helpers:** OneBalance-specific primitives for spending aggregated balances. No Zerion equivalent; tied to OneBalance's execution layer.

If any of these matter for your migration, [let us know](#get-in-touch). Your feedback helps shape our roadmap.

**Worth knowing:**

* **Authentication:** OneBalance uses an `x-api-key` header. Zerion uses [HTTP Basic Auth](/authentication). Get a key at [dashboard.zerion.io](https://dashboard.zerion.io).
* **Chain coverage:** OneBalance supports 11 chains. Zerion supports 60+ EVM chains and Solana, with NFTs on EVM. See the [full list](/supported-blockchains).
* **Address format:** OneBalance accepts CAIP-style accounts (`eip155:1:0x…`, `solana:5eyk…:…`). Zerion takes plain `0x…` EVM or base58 Solana addresses on the same `/wallets/{address}/…` path.
* **Aggregation model:** OneBalance groups balances by `aggregatedAssetId` (one entry per logical token); per-chain detail is nested in `individualAssetBalances`. Zerion returns one entry per token per chain; group client-side by `fungible_info.id` if you need OneBalance-style aggregation.
* **Pagination:** OneBalance uses `offset` + `limit`. Zerion returns `links.next` as a fully-formed URL you can fetch as-is. See [pagination](/pagination-and-filtering).
* **Response shape:** Zerion uses [JSON:API](https://jsonapi.org/). Payloads live under `data[].attributes` with related entities under `data[].relationships`.
* **DeFi positions:** Zerion exposes lending, staking, and LP positions via `filter[positions]=only_complex` on the same `/positions/` endpoint. OneBalance does not surface DeFi positions in its data API.
* **Realtime updates:** OneBalance offers polling (`get-quote-status`). Zerion offers [transaction webhooks](/webhooks) for push notifications on wallet activity.

## Get in touch

Have a use case we don't cover or need assistance with the migration? Our team is happy to help! Reach out via the chat widget on [dashboard.zerion.io](https://dashboard.zerion.io), or [email us](mailto:api@zerion.io).


# Migrate from Dune SIM to Zerion API
Source: https://developers.zerion.io/migrate-from-sim

A 1:1 mapping from Dune SIM endpoints to Zerion API, covering Balances, Activity, and DeFi Positions, with side-by-side code samples.

<Note>
  Zerion is offering discounts for teams migrating from SIM. To claim yours, reach out via the chat widget on [dashboard.zerion.io](https://dashboard.zerion.io) or email [api@zerion.io](mailto:api@zerion.io).
</Note>

Dune is [sunsetting the SIM API](https://dune.com/blog/sunsetting-sim) on August 1, 2026. If you've been calling SIM's endpoints for token balances, wallet activity, or DeFi positions, the same data is available on Zerion API across [60+ EVM chains and Solana](/supported-blockchains), often in a single call.

This guide shows the direct mapping for the main SIM endpoints, with copy-pasteable code for each.

What you get with Zerion:

* **One call for wallet + DeFi:** Collapse two SIM requests (`balances` + `defi/positions`) into a single `/positions/?filter[positions]=no_filter` response.
* **Portfolio in one shot:** Total value, 24h change, and chain breakdown without computing from balances.
* **Solana on the same endpoints:** Pass any EVM or Solana address to `/wallets/{address}/...` and get back the same enriched shape.

## Endpoint parity

| Use case                       | Dune SIM                                     | Zerion API                                                                                                                    |
| ------------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Tokens + DeFi (one call)       | Two requests (`balances` + `defi/positions`) | [`GET /v1/wallets/{address}/positions/?filter[positions]=no_filter`](/api-reference/wallets/get-wallet-fungible-positions)    |
| Portfolio total + 24h change   | Compute client-side from `balances`          | [`GET /v1/wallets/{address}/portfolio`](/api-reference/wallets/get-wallet-portfolio)                                          |
| Token balances                 | `GET /v1/evm/balances/{address}`             | [`GET /v1/wallets/{address}/positions/?filter[positions]=only_simple`](/api-reference/wallets/get-wallet-fungible-positions)  |
| DeFi positions                 | `GET /v1/evm/defi/positions/{address}`       | [`GET /v1/wallets/{address}/positions/?filter[positions]=only_complex`](/api-reference/wallets/get-wallet-fungible-positions) |
| Wallet activity / transactions | `GET /v1/evm/activity/{address}`             | [`GET /v1/wallets/{address}/transactions/`](/api-reference/wallets/get-wallet-transactions)                                   |
| NFTs                           | `GET /v1/evm/collectibles/{address}`         | [`GET /v1/wallets/{address}/nft-positions/`](/api-reference/wallets/get-wallet-nft-positions)                                 |
| Realtime updates               | Subscriptions API (webhooks)                 | [Transaction webhooks](/webhooks)                                                                                             |

<Tip>
  Prefer not to write code? The [Zerion CLI](/build-with-ai/zerion-cli) wraps the same endpoints with a one-shot `npx @zerion/cli init` flow, useful for quick experiments and AI agents.
</Tip>

## Token balances

SIM returns a flat `balances[]` array. Zerion returns a JSON:API collection where each token is one entry under `data[]`, with `attributes.fungible_info` for metadata and `attributes.value` for the USD value. The same endpoint accepts both EVM and Solana addresses.

<CodeGroup>
  ```javascript JavaScript (EVM) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[positions]=only_simple&filter[trash]=only_non_trash&sort=value`,
    {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(API_KEY + ":")}`,
      },
    }
  );
  const { data } = await res.json();

  for (const pos of data) {
    const { fungible_info, quantity, price, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`${fungible_info.symbol} on ${chain}: ${quantity.float} @ $${price} = $${value?.toFixed(2) ?? "N/A"}`);
  }
  ```

  ```javascript JavaScript (Solana) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[chain_ids]=solana&filter[trash]=only_non_trash&sort=value`,
    {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(API_KEY + ":")}`,
      },
    }
  );
  const { data } = await res.json();

  for (const pos of data) {
    const { fungible_info, quantity, price, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`${fungible_info.symbol} on ${chain}: ${quantity.float} @ $${price} = $${value?.toFixed(2) ?? "N/A"}`);
  }
  ```

  ```python Python (EVM) theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/positions/",
      params={
          "currency": "usd",
          "filter[positions]": "only_simple",
          "filter[trash]": "only_non_trash",
          "sort": "-value",
      },
      auth=(api_key, ""),
  )
  res.raise_for_status()

  for pos in res.json()["data"]:
      info = pos["attributes"]["fungible_info"]
      qty = pos["attributes"]["quantity"]["float"]
      value = pos["attributes"]["value"]
      chain = pos["relationships"]["chain"]["data"]["id"]
      print(f"{info['symbol']} on {chain}: {qty} = ${value:.2f}" if value else f"{info['symbol']} on {chain}: {qty}")
  ```

  ```python Python (Solana) theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/positions/",
      params={
          "currency": "usd",
          "filter[chain_ids]": "solana",
          "filter[trash]": "only_non_trash",
          "sort": "-value",
      },
      auth=(api_key, ""),
  )
  res.raise_for_status()

  for pos in res.json()["data"]:
      info = pos["attributes"]["fungible_info"]
      qty = pos["attributes"]["quantity"]["float"]
      value = pos["attributes"]["value"]
      chain = pos["relationships"]["chain"]["data"]["id"]
      print(f"{info['symbol']} on {chain}: {qty} = ${value:.2f}" if value else f"{info['symbol']} on {chain}: {qty}")
  ```

  ```bash cURL (EVM) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?currency=usd&filter[positions]=only_simple&filter[trash]=only_non_trash&sort=value"
  ```

  ```bash cURL (Solana) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH/positions/?currency=usd&filter[chain_ids]=solana&filter[trash]=only_non_trash&sort=value"
  ```
</CodeGroup>

### Field mapping

| Dune SIM (`balances[].…`)                                      | Zerion (`data[].attributes.…`)                                                                                                                                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `symbol`, `decimals` (always); `name` (for ERC20s, not native) | `fungible_info.symbol`, `fungible_info.name`, `fungible_info.implementations[].decimals` (all returned by default)                                                                                            |
| `address` (`"native"` for gas tokens)                          | `fungible_info.implementations[].address` (`null` for native)                                                                                                                                                 |
| `chain` / `chain_id`                                           | `relationships.chain.data.id` (string IDs, e.g. `"ethereum"`)                                                                                                                                                 |
| `amount` (raw integer string)                                  | `quantity.int` (1:1, raw integer string). Also exposed as `quantity.float` (decimal number) and `quantity.numeric` (decimal string) if you want pre-formatted values.                                         |
| `price_usd`                                                    | `price`                                                                                                                                                                                                       |
| `value_usd`                                                    | `value`                                                                                                                                                                                                       |
| `token_metadata.logo` (requires `?metadata=logo`)              | `fungible_info.icon.url` (returned by default)                                                                                                                                                                |
| `exclude_spam_tokens=true` (request param)                     | `filter[trash]=only_non_trash` (request param)                                                                                                                                                                |
| `low_liquidity` (per-token flag)                               | No direct equivalent. Zerion exposes `fungible_info.flags.verified` and the wider spam classifier behind `filter[trash]`; filter client-side on `price`/`value` thresholds if you need a hard liquidity gate. |
| `historical_prices`                                            | Use [`/v1/fungibles/{id}/charts/{period}`](/api-reference/fungibles/get-a-chart-for-a-fungible-asset) instead                                                                                                 |

<Note>
  `price` and `value` are `null` for tokens without a reliable price. Guard for `null` before summing or formatting.
</Note>

<Tip>
  **Want stablecoins only?** SIM exposes `asset_class=stablecoin`. Zerion doesn't ship a one-shot stablecoin filter. You have to pass `filter[fungible_ids]=<id1>,<id2>,…` where each value is a **Zerion-specific fungible ID** (not a symbol like `USDC` and not a contract address). Look up the IDs once via [`/v1/fungibles?filter[search_query]=usdc`](/api-reference/fungibles/get-list-of-fungible-assets); the `id` on each result is what goes into `filter[fungible_ids]`. Cache the list of IDs for the stablecoins you care about and reuse it across requests.
</Tip>

## Wallet activity (transactions)

SIM's `/v1/evm/activity/{address}` returns chronologically-ordered, decoded transactions (sends, swaps, approvals, and so on). The direct Zerion equivalent is [`/v1/wallets/{address}/transactions/`](/api-reference/wallets/get-wallet-transactions), which returns enriched, human-readable transactions with transfers, fees, and the dApp (when Zerion recognizes it). The same endpoint accepts both EVM and Solana addresses.

<CodeGroup>
  ```javascript JavaScript (EVM) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/transactions/?currency=usd&page[size]=20`,
    { headers }
  );
  const { data } = await res.json();

  for (const tx of data) {
    const { operation_type, mined_at, transfers, fee } = tx.attributes;
    const chain = tx.relationships.chain.data.id;
    const dappId = tx.relationships.dapp?.data?.id;

    console.log(`[${mined_at}] ${operation_type} on ${chain}`);
    if (dappId) console.log(`  via ${dappId}`);
    for (const t of transfers) {
      const sign = t.direction === "out" ? "-" : "+";
      const symbol = t.fungible_info?.symbol ?? "NFT";
      console.log(`  ${sign}${t.quantity.float} ${symbol} ($${t.value?.toFixed(2) ?? "?"})`);
    }
    console.log(`  Fee: $${fee.value?.toFixed(2) ?? "?"}`);
  }
  ```

  ```javascript JavaScript (Solana) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/transactions/?currency=usd&filter[chain_ids]=solana&page[size]=20`,
    { headers }
  );
  const { data } = await res.json();

  for (const tx of data) {
    const { operation_type, mined_at, transfers, fee } = tx.attributes;
    const chain = tx.relationships.chain.data.id;
    const dappId = tx.relationships.dapp?.data?.id;

    console.log(`[${mined_at}] ${operation_type} on ${chain}`);
    if (dappId) console.log(`  via ${dappId}`);
    for (const t of transfers) {
      const sign = t.direction === "out" ? "-" : "+";
      const symbol = t.fungible_info?.symbol ?? "NFT";
      console.log(`  ${sign}${t.quantity.float} ${symbol} ($${t.value?.toFixed(2) ?? "?"})`);
    }
    console.log(`  Fee: $${fee.value?.toFixed(2) ?? "?"}`);
  }
  ```

  ```python Python (EVM) theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/transactions/",
      params={"currency": "usd", "page[size]": 20},
      auth=(api_key, ""),
  )
  for tx in res.json()["data"]:
      attrs = tx["attributes"]
      chain = tx["relationships"]["chain"]["data"]["id"]
      dapp_id = (tx["relationships"].get("dapp") or {}).get("data", {}).get("id")
      print(f"[{attrs['mined_at']}] {attrs['operation_type']} on {chain}")
      if dapp_id:
          print(f"  via {dapp_id}")
      for t in attrs["transfers"]:
          sign = "-" if t["direction"] == "out" else "+"
          symbol = (t.get("fungible_info") or {}).get("symbol", "NFT")
          val = t.get("value")
          print(f"  {sign}{t['quantity']['float']} {symbol} (${val:.2f})" if val else f"  {sign}{t['quantity']['float']} {symbol}")
  ```

  ```python Python (Solana) theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/transactions/",
      params={"currency": "usd", "filter[chain_ids]": "solana", "page[size]": 20},
      auth=(api_key, ""),
  )
  for tx in res.json()["data"]:
      attrs = tx["attributes"]
      chain = tx["relationships"]["chain"]["data"]["id"]
      dapp_id = (tx["relationships"].get("dapp") or {}).get("data", {}).get("id")
      print(f"[{attrs['mined_at']}] {attrs['operation_type']} on {chain}")
      if dapp_id:
          print(f"  via {dapp_id}")
      for t in attrs["transfers"]:
          sign = "-" if t["direction"] == "out" else "+"
          symbol = (t.get("fungible_info") or {}).get("symbol", "NFT")
          val = t.get("value")
          print(f"  {sign}{t['quantity']['float']} {symbol} (${val:.2f})" if val else f"  {sign}{t['quantity']['float']} {symbol}")
  ```

  ```bash cURL (EVM) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/transactions/?currency=usd&page[size]=20"
  ```

  ```bash cURL (Solana) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH/transactions/?currency=usd&filter[chain_ids]=solana&page[size]=20"
  ```
</CodeGroup>

### Field mapping

| Dune SIM (`activity[].…`)                             | Zerion (`data[].attributes.…`)                                                                                                               |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `tx_hash`                                             | `hash`                                                                                                                                       |
| `block_time`                                          | `mined_at` (ISO 8601) / `mined_at_block`                                                                                                     |
| `chain_id` (numeric)                                  | `relationships.chain.data.id` (string)                                                                                                       |
| `type` (`send`, `receive`, `swap`, `approve`, …)      | `operation_type` (`send`, `receive`, `trade`, `approve`, `deposit`, `withdraw`, `mint`, `burn`, `claim`, `execute`, `deploy`)                |
| `asset_type` (`native`, `erc20`, `erc721`, `erc1155`) | `transfers[].fungible_info` vs `transfers[].nft_info`                                                                                        |
| `tx_from` / `tx_to` (transaction signer / recipient)  | `sent_from` / `sent_to`                                                                                                                      |
| `from` / `to` (per-asset-event party)                 | `transfers[].sender` / `transfers[].recipient`                                                                                               |
| `value` (raw integer string), `value_usd`             | `transfers[].quantity.int` (raw integer string, 1:1), `transfers[].value` (USD). `.float` and `.numeric` are decimal forms if you need them. |
| `token_metadata.symbol`, `.decimals`, `.price_usd`    | `transfers[].fungible_info.symbol`, `.implementations[].decimals`, `.price`                                                                  |
| (no SIM equivalent)                                   | `relationships.dapp.data.id` (dApp slug, e.g. `"uniswap-v3"`, `"aave-v3"`, present when Zerion identifies the dApp)                          |
| (no SIM equivalent)                                   | `acts[].application_metadata.method.name` (decoded method name, e.g. `"Multicall"`)                                                          |
| (no SIM equivalent)                                   | `fee.value`, `fee.fungible_info`                                                                                                             |

### Filter mapping

| Dune SIM param                             | Zerion equivalent                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activity_type=swap,send`                  | `filter[operation_types]=trade,send`                                                                                                                                                                                                                                                                                            |
| `asset_type=erc20`                         | `filter[asset_types]=fungible`                                                                                                                                                                                                                                                                                                  |
| `chain_ids=1,8453`                         | `filter[chain_ids]=ethereum,base`                                                                                                                                                                                                                                                                                               |
| `token_address=0xa0b8…` (contract address) | `filter[fungible_ids]=<zerion-fungible-id>`. Zerion uses its own fungible IDs, not contract addresses. Look one up via [`/v1/fungibles?filter[search_query]=…`](/api-reference/fungibles/get-list-of-fungible-assets) or [`/v1/fungibles/{chain_id}:{address}`](/api-reference/fungibles/get-fungible-asset-by-implementation). |
| `limit=100`                                | `page[size]=100`                                                                                                                                                                                                                                                                                                                |
| `offset=<cursor>`                          | Follow `links.next` from the response                                                                                                                                                                                                                                                                                           |

## DeFi positions

SIM's `/v1/evm/defi/positions/{address}` returns lending, staking, and LP positions. The Zerion equivalent reuses the `/positions/` endpoint with `filter[positions]=only_complex` to return DeFi positions only. EVM only today; Solana DeFi positions are on the roadmap.

<CodeGroup>
  ```javascript JavaScript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[positions]=only_complex&sort=value`,
    { headers: { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` } }
  );
  const { data } = await res.json();

  for (const pos of data) {
    const { name, protocol, protocol_module, position_type, quantity, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`[${position_type}] ${name} | ${protocol} (${protocol_module}) on ${chain}: ${quantity.float} = $${value?.toFixed(2) ?? "N/A"}`);
  }
  ```

  ```python Python theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/positions/",
      params={"currency": "usd", "filter[positions]": "only_complex", "sort": "-value"},
      auth=(api_key, ""),
  )
  for pos in res.json()["data"]:
      a = pos["attributes"]
      chain = pos["relationships"]["chain"]["data"]["id"]
      print(f"[{a.get('position_type')}] {a['name']} | {a.get('protocol')} ({a.get('protocol_module')}) on {chain}: {a['quantity']['float']} = ${a['value'] or 0:.2f}")
  ```

  ```bash cURL theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?currency=usd&filter[positions]=only_complex&sort=value"
  ```
</CodeGroup>

### Field mapping

| Dune SIM (`positions[].…`)     | Zerion (`data[].attributes.…`)                                                                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protocol`                     | `protocol`                                                                                                                                                                              |
| `type` (`Erc4626`, `Aave`, …)  | `protocol_module` (`lending`, `staked`, `liquidity_pool`, `locked`, `rewards`, `vesting`, `deposit`, `investment`, `yield`) + `position_type` (`deposit`, `staked`, `reward`, `locked`) |
| `token` / `underlying_token`   | `fungible_info`                                                                                                                                                                         |
| `balance`                      | `quantity.float`                                                                                                                                                                        |
| `price_usd`, `value_usd`       | `price`, `value`                                                                                                                                                                        |
| `chain` / `chain_id`           | `relationships.chain.data.id`                                                                                                                                                           |
| `aggregations.total_value_usd` | `/wallets/{address}/portfolio` → `data.attributes.total.positions`                                                                                                                      |
| `aggregations.total_by_chain`  | `/wallets/{address}/portfolio` → `data.attributes.positions_distribution_by_chain`                                                                                                      |
| (no SIM equivalent)            | `application_metadata.name` / `application_metadata.icon.url` (protocol display name + logo)                                                                                            |
| (no SIM equivalent)            | `relationships.dapp.data.id` to look up the dApp via [`/v1/dapps/{id}`](/api-reference/dapps/get-dapp-by-id)                                                                            |

## Pagination

Replace SIM's `offset` cursor with Zerion's `links.next` URL. Each Zerion response includes a fully-formed next-page link you can fetch as-is.

```javascript theme={null}
async function getAll(url) {
  const all = [];
  const headers = { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` };

  while (url) {
    const res = await fetch(url, { headers });
    const { data, links } = await res.json();
    all.push(...data);
    url = links?.next ?? null;
  }
  return all;
}
```

## Webhooks (realtime updates)

SIM's Subscriptions API pushes balance/activity events to a callback URL. Zerion offers [transaction webhooks](/webhooks): subscribe a callback URL to one or more wallets and receive a POST when any of them transact.

See the [wallet activity alerts recipe](/recipes/wallet-activity-alerts) for a working example.

## Differences from SIM

Most SIM use cases have a direct Zerion equivalent. A few aren't covered yet, and others behave differently. Worth a scan before you cut over.

**Not supported today:**

* **Token holders:** SIM ranks ERC20 holders by balance via `/v1/evm/token-holders`. Not on Zerion today; pair with a separate data source if you need holder rankings.
* **Raw RPC-style transactions:** SIM's `/v1/evm/transactions` returns raw block data (gas, calldata, logs). Zerion's `/transactions/` is enriched and decoded, not raw. For raw fields, use `mined_at_block` + `hash` from Zerion to look the transaction up via a node provider (Alchemy, Infura).
* **Eclipse chain:** Zerion supports Solana but not Eclipse SVM. Check the [supported chains list](/supported-blockchains) before migrating Eclipse-dependent code.
* **SVM-specific token-mint fields:** SIM's `/beta/svm/balances/` returns Solana-specific fields like `program_id` (SPL token program), `total_supply`, and `uri` (token metadata URI). Zerion abstracts these away. Query a Solana RPC directly if you depend on them.

If any of these matter for your migration, [let us know](#get-in-touch). Your feedback helps shape our roadmap.

**Worth knowing:**

* **Authentication:** SIM uses an `X-Sim-Api-Key` header. Zerion uses [HTTP Basic Auth](/authentication). Get a key at [dashboard.zerion.io](https://dashboard.zerion.io).
* **Chain IDs:** SIM filters chains via numeric `chain_ids` (e.g. `1,8453`). Zerion uses string chain IDs (e.g. `ethereum,base`). See the [full list](/supported-blockchains).
* **Solana:** SIM splits EVM and Solana into separate endpoint families (Solana lives at `/beta/svm/...` with a different schema) and only exposes raw RPC-style Solana transactions, no enriched activity. Zerion accepts Solana addresses on the same `/wallets/{address}/...` endpoints used for EVM, and returns the same enriched activity shape (`operation_type`, `transfers[]`, `fee`) for both chains. DeFi positions are not yet supported for Solana.
* **Pagination:** SIM returns `next_offset`; Zerion returns a fully-formed `links.next` URL you can fetch as-is. See [pagination](/pagination-and-filtering).
* **Response shape:** Zerion uses [JSON:API](https://jsonapi.org/). Payloads live under `data[].attributes` with related entities under `data[].relationships`.
* **Spam filtering:** SIM has `exclude_spam_tokens`; Zerion uses `filter[trash]=only_non_trash`. See [spam filtering](/spam-filtering) for the full taxonomy.
* **One endpoint for wallet and DeFi:** Zerion serves both wallet tokens and DeFi positions from `/positions/`. Switch via `filter[positions]=only_simple` (wallet only) or `only_complex` (DeFi only).
* **Stablecoin filter:** SIM has `asset_class=stablecoin`. Zerion requires a comma-separated `filter[fungible_ids]=…` list. See the [stablecoins note](#token-balances) above.
* **Supply / borrow split:** Some SIM DeFi positions split a single lending position into separate supply and borrow rows. Zerion returns one row per position with `position_type` and the underlying token; reconstruct directions from `quantity` sign or `position_type` semantics.
* **LP tick ranges and VeNFT lock metadata:** SIM exposes raw LP tick ranges and vote-escrow lock dates. Zerion abstracts these away and surfaces the position's USD value, underlying token, and protocol module.
* **Pool size / low liquidity flags:** SIM provides per-token `pool_size` and `low_liquidity` flags. Zerion's spam classifier filters dust via `filter[trash]`, but does not expose a numeric pool size.

## Get in touch

Have a use case we don't cover or need assistance with the migration? Our team is happy to help! Reach out via the chat widget on [dashboard.zerion.io](https://dashboard.zerion.io), or [email us](mailto:api@zerion.io).


# Migrate from Zapper to Zerion API
Source: https://developers.zerion.io/migrate-from-zapper

A 1:1 mapping from Zapper's GraphQL API to Zerion API, covering portfolio balances, DeFi positions, transaction history, NFTs, and token prices.

<Note>
  Zerion is offering discounts for teams migrating from Zapper. To claim yours, reach out via the chat widget on [dashboard.zerion.io](https://dashboard.zerion.io) or email [api@zerion.io](mailto:api@zerion.io).
</Note>

Zapper is [winding down all of its services](https://x.com/sebaudet26/status/2074918469376856150) on August 3, 2026, including the GraphQL API at build.zapper.xyz. If you've been querying `portfolioV2` for token, app, and NFT balances, or `transactionHistoryV2` for wallet activity, the same data is available on Zerion API across [60+ EVM chains and Solana](/supported-blockchains).

This guide shows the direct mapping for the main Zapper queries, with copy-pasteable code for each.

What you get with Zerion:

* **Plain REST:** Each use case is a single GET request with query-string filters. No GraphQL documents to maintain, no `edges`/`node` wrappers to unwrap.
* **One endpoint for tokens + DeFi:** Wallet tokens and DeFi positions both come from `/positions/`, switchable with `filter[positions]`. USD values are precomputed on every row.
* **Deeper Solana coverage:** Zapper covers token balances only on Solana ([no transaction history or price data](https://build.zapper.xyz/docs/api/supported-chains)). Zerion returns Solana balances, enriched transaction history, and price charts from the same endpoints as EVM.
* **Realtime webhooks:** Subscribe wallets once and receive a POST when they transact, instead of polling transaction history.

## Endpoint parity

| Use case                     | Zapper GraphQL                          | Zerion API                                                                                                                                                            |
| ---------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token balances               | `portfolioV2.tokenBalances`             | [`GET /v1/wallets/{address}/positions/?filter[positions]=only_simple`](/api-reference/wallets/get-wallet-fungible-positions)                                          |
| DeFi positions               | `portfolioV2.appBalances`               | [`GET /v1/wallets/{address}/positions/?filter[positions]=only_complex`](/api-reference/wallets/get-wallet-fungible-positions)                                         |
| Tokens + DeFi (one call)     | `portfolioV2` with both sub-fields      | [`GET /v1/wallets/{address}/positions/?filter[positions]=no_filter`](/api-reference/wallets/get-wallet-fungible-positions)                                            |
| Portfolio total + 24h change | `totalBalanceUSD` per section           | [`GET /v1/wallets/{address}/portfolio`](/api-reference/wallets/get-wallet-portfolio)                                                                                  |
| Portfolio value over time    | Portfolio charts                        | [`GET /v1/wallets/{address}/charts/{period}`](/api-reference/wallets/get-wallet-balance-chart)                                                                        |
| Transaction history          | `transactionHistoryV2`                  | [`GET /v1/wallets/{address}/transactions/`](/api-reference/wallets/get-wallet-transactions)                                                                           |
| NFT holdings                 | `portfolioV2.nftBalances` + NFT queries | [`GET /v1/wallets/{address}/nft-positions/`](/api-reference/wallets/get-wallet-nft-positions) and [`/nft-portfolio`](/api-reference/wallets/get-wallet-nft-portfolio) |
| Token price + market data    | `fungibleTokenV2.priceData`             | [`GET /v1/fungibles/by-implementation`](/api-reference/fungibles/get-fungible-asset-by-implementation)                                                                |
| Price charts                 | `priceData.priceTicks`                  | [`GET /v1/fungibles/{id}/charts/{period}`](/api-reference/fungibles/get-a-chart-for-a-fungible-asset)                                                                 |
| Token search                 | `search`                                | [`GET /v1/fungibles/?filter[search_query]=…`](/api-reference/fungibles/get-list-of-fungible-assets)                                                                   |
| Realtime updates             | (polling)                               | [Transaction webhooks](/webhooks)                                                                                                                                     |

## Token balances

Zapper's `portfolioV2.tokenBalances.byToken` returns a Relay-style connection of token nodes. Zerion returns a flat JSON:API collection where each token is one entry under `data[]`, with `attributes.fungible_info` for metadata and `attributes.value` for the USD value. The same endpoint accepts both EVM and Solana addresses.

<CodeGroup>
  ```javascript JavaScript (EVM) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[positions]=only_simple&filter[trash]=only_non_trash&sort=value`,
    {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(API_KEY + ":")}`,
      },
    }
  );
  const { data } = await res.json();

  for (const pos of data) {
    const { fungible_info, quantity, price, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`${fungible_info.symbol} on ${chain}: ${quantity.float} @ $${price} = $${value?.toFixed(2) ?? "N/A"}`);
  }
  ```

  ```javascript JavaScript (Solana) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[chain_ids]=solana&filter[trash]=only_non_trash&sort=value`,
    {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(API_KEY + ":")}`,
      },
    }
  );
  const { data } = await res.json();

  for (const pos of data) {
    const { fungible_info, quantity, price, value } = pos.attributes;
    const chain = pos.relationships.chain.data.id;
    console.log(`${fungible_info.symbol} on ${chain}: ${quantity.float} @ $${price} = $${value?.toFixed(2) ?? "N/A"}`);
  }
  ```

  ```python Python theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/positions/",
      params={
          "currency": "usd",
          "filter[positions]": "only_simple",
          "filter[trash]": "only_non_trash",
          "sort": "-value",
      },
      auth=(api_key, ""),
  )
  res.raise_for_status()

  for pos in res.json()["data"]:
      info = pos["attributes"]["fungible_info"]
      qty = pos["attributes"]["quantity"]["float"]
      value = pos["attributes"]["value"]
      chain = pos["relationships"]["chain"]["data"]["id"]
      print(f"{info['symbol']} on {chain}: {qty} = ${value:.2f}" if value else f"{info['symbol']} on {chain}: {qty}")
  ```

  ```bash cURL theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?currency=usd&filter[positions]=only_simple&filter[trash]=only_non_trash&sort=value"
  ```
</CodeGroup>

### Field mapping

| Zapper (`byToken.edges[].node.…`)         | Zerion (`data[].attributes.…`)                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `symbol`, `name`                          | `fungible_info.symbol`, `fungible_info.name`                                                          |
| `tokenAddress` (`0x0000…0000` for native) | `fungible_info.implementations[].address` (`null` for native)                                         |
| `decimals`                                | `fungible_info.implementations[].decimals`                                                            |
| `balance` (decimal number)                | `quantity.float` (also `quantity.numeric` as decimal string)                                          |
| `balanceRaw` (raw integer string)         | `quantity.int` (1:1, raw integer string)                                                              |
| `balanceUSD`                              | `value`                                                                                               |
| `price`                                   | `price`                                                                                               |
| `imgUrlV2`                                | `fungible_info.icon.url`                                                                              |
| `network` (object with `name`, `chainId`) | `relationships.chain.data.id` (string ID, e.g. `"ethereum"`)                                          |
| `byToken(first: 25)` + cursor paging      | Not needed; `/positions/` returns all positions in one response                                       |
| `tokenBalances.totalBalanceUSD`           | [`/portfolio`](/api-reference/wallets/get-wallet-portfolio) → `positions_distribution_by_type.wallet` |

<Note>
  `price` and `value` are `null` for tokens without a reliable price. Guard for `null` before summing or formatting.
</Note>

<Note>
  Zapper's `byToken` accepts a `minBalanceUSD` argument to cut dust by value. Zerion's lever is a spam classifier instead: pass `filter[trash]=only_non_trash` to hide spam tokens, and filter client-side on `value` if you also want a hard USD threshold. See [spam filtering](/spam-filtering).
</Note>

## Portfolio value

Zapper reports `totalBalanceUSD` separately on `tokenBalances`, `appBalances`, and `nftBalances`. Zerion's [`/portfolio`](/api-reference/wallets/get-wallet-portfolio) returns the fungible total with a 24h change, a breakdown by chain, and a breakdown by position type (wallet, deposited, borrowed, locked, staked) in one response. The NFT total lives on [`/nft-portfolio`](/api-reference/wallets/get-wallet-nft-portfolio).

```bash cURL theme={null}
curl -u "YOUR_API_KEY:" \
  "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/portfolio?currency=usd"
```

For a portfolio-value chart over time (Zapper's portfolio charts), use [`/wallets/{address}/charts/{period}`](/api-reference/wallets/get-wallet-balance-chart) with `hour`, `day`, `week`, `month`, `3months`, `6months`, `year`, `5years`, or `max`.

<Note>
  `/portfolio` totals count only positions with `flags.displayable: true`. Zerion marks some wallet-held DeFi derivative tokens (LP tokens, vault shares, index tokens) as non-displayable, so the `wallet` bucket can be lower than a raw sum over `/positions/`. If you want a Zapper-style total that counts every priced token, sum `value` over the `/positions/` rows instead.
</Note>

## DeFi positions

Zapper's `portfolioV2.appBalances` groups positions by app, with nested `positionBalances` that are either app tokens (LP tokens, vault shares) or contract positions with underlying `tokens[]`. Zerion returns one flat row per position from the same `/positions/` endpoint with `filter[positions]=only_complex`; group by `relationships.dapp.data.id` client-side if you want the per-app view back.

<CodeGroup>
  ```javascript JavaScript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[positions]=only_complex&sort=value`,
    { headers: { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` } }
  );
  const { data } = await res.json();

  // Rebuild Zapper's by-app grouping
  const byApp = {};
  for (const pos of data) {
    const app = pos.relationships.dapp?.data?.id ?? pos.attributes.protocol ?? "unknown";
    (byApp[app] ??= []).push(pos);
  }

  for (const [app, positions] of Object.entries(byApp)) {
    const total = positions.reduce((s, p) => s + (p.attributes.value ?? 0), 0);
    console.log(`${app}: $${total.toFixed(2)}`);
    for (const p of positions) {
      const { name, position_type, quantity, value } = p.attributes;
      console.log(`  [${position_type}] ${name}: ${quantity.float} = $${value?.toFixed(2) ?? "N/A"}`);
    }
  }
  ```

  ```python Python theme={null}
  import os, requests
  from collections import defaultdict

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/positions/",
      params={"currency": "usd", "filter[positions]": "only_complex", "sort": "-value"},
      auth=(api_key, ""),
  )

  by_app = defaultdict(list)
  for pos in res.json()["data"]:
      dapp = (pos["relationships"].get("dapp") or {}).get("data", {}).get("id")
      by_app[dapp or pos["attributes"].get("protocol") or "unknown"].append(pos)

  for app, positions in by_app.items():
      total = sum(p["attributes"]["value"] or 0 for p in positions)
      print(f"{app}: ${total:.2f}")
      for p in positions:
          a = p["attributes"]
          print(f"  [{a.get('position_type')}] {a['name']}: {a['quantity']['float']} = ${a['value'] or 0:.2f}")
  ```

  ```bash cURL theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?currency=usd&filter[positions]=only_complex&sort=value"
  ```
</CodeGroup>

### Field mapping

| Zapper (`appBalances.byApp.edges[].node.…`)                                    | Zerion (`data[].attributes.…`)                                                                                              |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `app.displayName`, `app.imgUrl`                                                | `application_metadata.name`, `application_metadata.icon.url`                                                                |
| `app.slug`                                                                     | `relationships.dapp.data.id` (look up details via [`/v1/dapps/{id}`](/api-reference/dapps/get-dapp-by-id))                  |
| `network`                                                                      | `relationships.chain.data.id`                                                                                               |
| `balanceUSD` (per app)                                                         | Sum `value` over rows grouped by `relationships.dapp.data.id` (see code above)                                              |
| `positionBalances[].groupLabel`                                                | `protocol_module` (`lending`, `staked`, `liquidity_pool`, `locked`, `rewards`, `vesting`, `deposit`, `investment`, `yield`) |
| App token node (`symbol`, `balance`, `balanceUSD`, `price`)                    | `fungible_info`, `quantity`, `value`, `price`                                                                               |
| `tokens[].metaType` (`SUPPLIED`, `CLAIMABLE`, `BORROWED`, `LOCKED`, `VESTING`) | `position_type` (`deposit`, `reward`, `loan`, `locked`, `staked`)                                                           |
| `displayProps.label`                                                           | `name`                                                                                                                      |
| `appBalances.totalBalanceUSD`                                                  | [`/portfolio`](/api-reference/wallets/get-wallet-portfolio) → `positions_distribution_by_type` (sum the non-wallet buckets) |

<Note>
  Zapper nests every underlying token of a contract position under `tokens[]`. Zerion returns one row per position with a single `fungible_info`; a two-sided LP shows up as its pool position with the position's total USD `value`.
</Note>

## Transaction history

Zapper's `transactionHistoryV2` returns timeline events with a natural-language `interpretation.processedDescription` and per-account `deltas`. Zerion's [`/transactions/`](/api-reference/wallets/get-wallet-transactions) returns structured, enriched transactions instead: an `operation_type`, typed `transfers[]` with direction and USD values, the fee, and the dApp when Zerion recognizes it. Compose display strings from those fields.

The same endpoint accepts both EVM and Solana addresses. Unlike Zapper's `transactionHistoryV2`, which returns no Solana activity, Zerion returns the same enriched shape (trades, sends, USD values, fees) for Solana wallets.

<CodeGroup>
  ```javascript JavaScript (EVM) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/transactions/?currency=usd&page[size]=20`,
    { headers }
  );
  const { data } = await res.json();

  for (const tx of data) {
    const { operation_type, mined_at, transfers, fee } = tx.attributes;
    const chain = tx.relationships.chain.data.id;
    const dappId = tx.relationships.dapp?.data?.id;

    // Equivalent of Zapper's processedDescription, composed from structured fields
    const parts = transfers.map((t) => {
      const sign = t.direction === "out" ? "-" : "+";
      const symbol = t.fungible_info?.symbol ?? "NFT";
      return `${sign}${t.quantity.float} ${symbol}`;
    });
    console.log(`[${mined_at}] ${operation_type} on ${chain}${dappId ? ` via ${dappId}` : ""}: ${parts.join(", ")}`);
    console.log(`  Fee: $${fee.value?.toFixed(2) ?? "?"}`);
  }
  ```

  ```javascript JavaScript (Solana) theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const address = "6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  const res = await fetch(
    `https://api.zerion.io/v1/wallets/${address}/transactions/?currency=usd&filter[chain_ids]=solana&page[size]=20`,
    { headers }
  );
  const { data } = await res.json();

  for (const tx of data) {
    const { operation_type, mined_at, transfers, fee } = tx.attributes;
    const parts = transfers.map((t) => {
      const sign = t.direction === "out" ? "-" : "+";
      const symbol = t.fungible_info?.symbol ?? "NFT";
      return `${sign}${t.quantity.float} ${symbol}`;
    });
    console.log(`[${mined_at}] ${operation_type}: ${parts.join(", ")}`);
    console.log(`  Fee: $${fee.value?.toFixed(4) ?? "?"}`);
  }
  ```

  ```python Python theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

  res = requests.get(
      f"https://api.zerion.io/v1/wallets/{address}/transactions/",
      params={"currency": "usd", "page[size]": 20},
      auth=(api_key, ""),
  )
  for tx in res.json()["data"]:
      attrs = tx["attributes"]
      chain = tx["relationships"]["chain"]["data"]["id"]
      dapp_id = (tx["relationships"].get("dapp") or {}).get("data", {}).get("id")
      parts = []
      for t in attrs["transfers"]:
          sign = "-" if t["direction"] == "out" else "+"
          symbol = (t.get("fungible_info") or {}).get("symbol", "NFT")
          parts.append(f"{sign}{t['quantity']['float']} {symbol}")
      via = f" via {dapp_id}" if dapp_id else ""
      print(f"[{attrs['mined_at']}] {attrs['operation_type']} on {chain}{via}: {', '.join(parts)}")
  ```

  ```bash cURL (EVM) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/transactions/?currency=usd&page[size]=20"
  ```

  ```bash cURL (Solana) theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/6sEk1enayZBGFyNvvJMTP7qs5S3uC7KLrQWaEk38hSHH/transactions/?currency=usd&filter[chain_ids]=solana&page[size]=20"
  ```
</CodeGroup>

### Field mapping

| Zapper (`transactionHistoryV2.edges[].node.…`)        | Zerion (`data[].attributes.…`)                                                                                                                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transaction.hash`                                    | `hash`                                                                                                                                                                                           |
| `transaction.timestamp` (milliseconds)                | `mined_at` (ISO 8601) / `mined_at_block`                                                                                                                                                         |
| `transaction.network` (enum, e.g. `ETHEREUM_MAINNET`) | `relationships.chain.data.id` (string, e.g. `"ethereum"`)                                                                                                                                        |
| `interpretation.processedDescription`                 | No prose equivalent. Compose from `operation_type` (`send`, `receive`, `trade`, `approve`, `deposit`, `withdraw`, `mint`, `burn`, `claim`, `execute`, `deploy`) + `transfers[]` (see code above) |
| `interpretation.descriptionDisplayItems`              | `transfers[].fungible_info` / `transfers[].nft_info`                                                                                                                                             |
| `deltas` → `tokenDeltasV2` `amount` sign              | `transfers[].direction` (`in`/`out`) + `transfers[].quantity`                                                                                                                                    |
| `token.symbol`, `token.decimals`                      | `transfers[].fungible_info.symbol`, `.implementations[].decimals`                                                                                                                                |
| `methodSignature`                                     | `acts[].application_metadata.method.name` (decoded method name, when available)                                                                                                                  |
| (no Zapper equivalent)                                | `transfers[].value` (USD value per transfer)                                                                                                                                                     |
| (no Zapper equivalent)                                | `fee.value`, `fee.fungible_info`                                                                                                                                                                 |
| (no Zapper equivalent)                                | `relationships.dapp.data.id` (dApp slug, e.g. `"uniswap-v3"`)                                                                                                                                    |

### Filter mapping

| Zapper argument                        | Zerion equivalent                                                                                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `first: 20`                            | `page[size]=20`                                                                                                                                            |
| `after: <cursor>`                      | Follow `links.next` from the response                                                                                                                      |
| `filters: { chainIds: [1, 8453] }`     | `filter[chain_ids]=ethereum,base` (string IDs, see the [full list](/supported-blockchains))                                                                |
| `perspective: Signer / Receiver / All` | No direct parameter. Zerion returns all transactions involving the wallet; filter client-side on `sent_from` / `sent_to` if you need the signer-only view. |
| (no Zapper equivalent)                 | `filter[operation_types]=trade,send`, `filter[asset_types]=fungible,nft`, `filter[min_mined_at]` / `filter[max_mined_at]`                                  |

## Token prices and charts

Zapper's `fungibleTokenV2(address, chainId)` returns market data and OHLC `priceTicks`. On Zerion, look the asset up by implementation (`chain:address`), read `market_data` for the price and stats, and call the [charts endpoint](/api-reference/fungibles/get-a-chart-for-a-fungible-asset) for history.

<CodeGroup>
  ```javascript JavaScript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  // USDC on Ethereum
  const impl = "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

  const res = await fetch(
    `https://api.zerion.io/v1/fungibles/by-implementation?implementation=${impl}&currency=usd`,
    { headers }
  );
  const { data } = await res.json();
  const { symbol, market_data } = data.attributes;
  console.log(`${symbol}: $${market_data.price} (24h: ${market_data.changes.percent_1d}%)`);

  // Historical chart (like priceTicks with timeFrame: DAY)
  const chartRes = await fetch(
    `https://api.zerion.io/v1/fungibles/${data.id}/charts/day?currency=usd`,
    { headers }
  );
  const { points } = (await chartRes.json()).data.attributes;
  // Each point is [unix_seconds, price]
  console.log(`${points.length} points, latest: $${points.at(-1)[1]}`);
  ```

  ```python Python theme={null}
  import os, requests

  api_key = os.environ["ZERION_API_KEY"]
  auth = (api_key, "")

  impl = "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"  # USDC

  res = requests.get(
      "https://api.zerion.io/v1/fungibles/by-implementation",
      params={"implementation": impl, "currency": "usd"},
      auth=auth,
  )
  data = res.json()["data"]
  md = data["attributes"]["market_data"]
  print(f"{data['attributes']['symbol']}: ${md['price']} (24h: {md['changes']['percent_1d']}%)")

  chart = requests.get(
      f"https://api.zerion.io/v1/fungibles/{data['id']}/charts/day",
      params={"currency": "usd"},
      auth=auth,
  ).json()["data"]["attributes"]
  print(f"{len(chart['points'])} points, latest: ${chart['points'][-1][1]}")
  ```

  ```bash cURL theme={null}
  curl -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/fungibles/by-implementation?implementation=ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&currency=usd"
  ```
</CodeGroup>

### Field mapping

| Zapper (`fungibleTokenV2.…`)               | Zerion (`data.attributes.…`)                                                                                                                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `address` + `chainId` (query args)         | `implementation=<chain>:<address>` (string chain ID)                                                                                                                                          |
| `symbol`, `name`, `decimals`, `imageUrlV2` | `symbol`, `name`, `implementations[].decimals`, `icon.url`                                                                                                                                    |
| `priceData.price`                          | `market_data.price`                                                                                                                                                                           |
| `priceData.priceChange24h`                 | `market_data.changes.percent_1d` (also `percent_30d`, `percent_90d`, `percent_365d`)                                                                                                          |
| `priceData.marketCap`                      | `market_data.market_cap`                                                                                                                                                                      |
| `priceData.volume24h`                      | `market_data.trading_volumes.volume_1d`                                                                                                                                                       |
| `priceData.priceTicks(timeFrame: DAY)`     | [`/charts/day`](/api-reference/fungibles/get-a-chart-for-a-fungible-asset) → `points` as `[unix_seconds, price]` pairs, plus `stats` (`first`, `min`, `avg`, `max`, `last`)                   |
| `fungibleTokenBatchV2` (multiple tokens)   | [`/v1/fungibles/?filter[fungible_implementations]=ethereum:0xa0b8…,ethereum:0xdac1…`](/api-reference/fungibles/get-list-of-fungible-assets) (one call, comma-separated `chain:address` pairs) |
| `priceChange5m`, `priceChange1h`           | Not available; shortest change window is 1 day. Compute from `/charts/hour` points if you need finer granularity.                                                                             |
| `totalLiquidity`, `totalGasTokenLiquidity` | No equivalent                                                                                                                                                                                 |

<Note>
  Zapper chart timestamps are in milliseconds; Zerion chart points use Unix seconds. Chart periods map as HOUR → `hour`, DAY → `day`, WEEK → `week`, MONTH → `month`, YEAR → `year`, plus `3months`, `6months`, `5years`, and `max`.
</Note>

## NFTs

Zapper's `nftBalances` totals map to [`/wallets/{address}/nft-portfolio`](/api-reference/wallets/get-wallet-nft-portfolio), and per-item holdings map to [`/wallets/{address}/nft-positions/`](/api-reference/wallets/get-wallet-nft-positions), which returns each NFT with collection metadata, media URLs, and a floor-price-based `value`. For a collection-level rollup like Zapper's NFT collection queries, use [`/wallets/{address}/nft-collections/`](/api-reference/wallets/get-wallet-nft-collections).

```bash cURL theme={null}
curl -g -u "YOUR_API_KEY:" \
  "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/nft-positions/?currency=usd&sort=-floor_price&page[size]=20"
```

Key fields per position: `nft_info.contract_address`, `nft_info.token_id`, `nft_info.name`, `nft_info.content.preview.url` for media, and `price`/`value` for the floor-based valuation. `value` is `null` when Zerion has no floor data for the collection, so handle missing values when totaling (Zapper's `nftBalances.totalBalanceUSD` includes estimates for more collections, so totals can differ). The NFT endpoints accept EVM addresses only.

## Pagination

Replace Zapper's Relay cursors (`first`/`after` + `pageInfo.endCursor`) with Zerion's `links.next` URL. Paginated endpoints (transactions, NFT positions, fungibles) include a fully-formed next-page link you can fetch as-is. `/positions/` is not paginated and returns the full set in one response.

```javascript theme={null}
async function getAll(url) {
  const all = [];
  const headers = { accept: "application/json", authorization: `Basic ${btoa(API_KEY + ":")}` };

  while (url) {
    const res = await fetch(url, { headers });
    const { data, links } = await res.json();
    all.push(...data);
    url = links?.next ?? null;
  }
  return all;
}
```

## Webhooks (realtime updates)

Zapper's API has no push mechanism, so most integrations poll `transactionHistoryV2`. Zerion offers [transaction webhooks](/webhooks): subscribe a callback URL to one or more wallets and receive a POST when any of them transact.

See the [wallet activity alerts recipe](/recipes/wallet-activity-alerts) for a working example.

## Differences from Zapper

Most Zapper use cases have a direct Zerion equivalent. A few aren't covered, and others behave differently. Worth a scan before you cut over.

**Not supported today:**

* **Onchain identity:** Zapper resolves ENS, Basenames, Farcaster, and Lens profiles. Zerion doesn't; resolve names to addresses with an ENS library or a provider like Neynar before calling Zerion.
* **Farcaster portfolios:** Zapper accepts Farcaster usernames/FIDs as portfolio subjects. On Zerion, resolve the user's verified addresses first, then pass those.
* **Natural-language descriptions:** Zapper's `processedDescription` returns prose like "Swapped 400 USDC for 0.2 ETH". Zerion returns structured fields (`operation_type`, `transfers[]`, `fee`); compose your own template (see the [transaction history](#transaction-history) section).
* **Token holders and rankings:** Zapper exposes holder lists and trending-token rankings. Not on Zerion today; pair with a separate data source if you need them.
* **Cross-entity search:** Zapper's `search` spans tokens, NFTs, apps, and accounts. Zerion's search covers fungible tokens only, via [`/v1/fungibles/?filter[search_query]=…`](/api-reference/fungibles/get-list-of-fungible-assets).
* **Bitcoin and other non-EVM chains:** Zapper lists Bitcoin and a few other non-EVM networks. Zerion covers 60+ EVM chains and Solana; check the [supported chains list](/supported-blockchains) before migrating.

If any of these matter for your migration, [let us know](#get-in-touch). Your feedback helps shape our roadmap.

**Worth knowing:**

* **Authentication:** Zapper uses an `x-zapper-api-key` header on a GraphQL POST. Zerion uses [HTTP Basic Auth](/authentication) on REST GETs. Get a key at [dashboard.zerion.io](https://dashboard.zerion.io).
* **Solana:** Zapper supports Solana for token balances only. Zerion additionally returns enriched transaction history and price charts for Solana, on the same endpoints as EVM. Solana DeFi positions and NFTs are not yet supported (the NFT endpoints accept EVM addresses only).
* **Chain identifiers:** Zapper uses numeric `chainId` values (and legacy network enums like `ETHEREUM_MAINNET`). Zerion uses string chain IDs (e.g. `ethereum`, `base`, `solana`). The [`/v1/chains/`](/api-reference/chains/get-list-of-all-chains) endpoint lists them all with their numeric counterparts.
* **Timestamps:** Zapper returns millisecond epochs. Zerion returns ISO 8601 strings on transactions (`mined_at`) and Unix seconds in chart points.
* **Response shape:** Zerion uses [JSON:API](https://jsonapi.org/). Payloads live under `data[].attributes` with related entities under `data[].relationships`, no GraphQL field selection.
* **Per-app grouping:** Zapper groups DeFi by app with nested position balances. Zerion returns one flat row per position; group by `relationships.dapp.data.id` client-side (see the [DeFi positions](#defi-positions) section).
* **Token identifiers:** Zapper keys tokens by `chainId` + contract address. Zerion uses its own chain-agnostic fungible IDs; resolve one via [`/v1/fungibles/by-implementation`](/api-reference/fungibles/get-fungible-asset-by-implementation).
* **Currencies:** Zapper's `currency` argument on price ticks maps to Zerion's `currency` query parameter, which also applies to positions, portfolio, and transactions.

## Get in touch

Have a use case we don't cover or need assistance with the migration? Our team is happy to help! Reach out via the chat widget on [dashboard.zerion.io](https://dashboard.zerion.io), or [email us](mailto:api@zerion.io).


# Migrate to Zerion API
Source: https://developers.zerion.io/migrate-to-zerion

Move your wallet data integration to Zerion API with 1:1 endpoint mappings and copy-pasteable code for Zapper, Dune, DeBank, Allium, GoldRush, and Moralis.

## Migrate with AI

<Steps>
  <Step title="Install the skill" icon="terminal">
    ```bash theme={null}
    npx skills add zeriontech/zerion-api-migration
    ```
  </Step>

  <Step title="Tell your agent" icon="wand-magic-sparkles">
    **"Migrate this codebase to the Zerion API."**
  </Step>
</Steps>

The [skill](https://github.com/zeriontech/zerion-api-migration) works with Claude Code, Cursor, Codex, and [20+ other agents](https://agentskills.io/clients). Your agent follows the guides below and asks for a free [API key](https://dashboard.zerion.io) when it needs one.

## Migration guides

Each guide maps the provider's endpoints to their Zerion equivalents, with side-by-side code you can copy and notes on the differences to be aware of.

<CardGroup>
  <Card title="From Zapper" icon={<img src="https://mintcdn.com/zerion-f99485ad/Swl5SsX6BrOlR7mZ/images/providers/zapper.png?fit=max&auto=format&n=Swl5SsX6BrOlR7mZ&q=85&s=21a00ea779b40748b36601f781f3f49a" alt="Zapper" />} href="/migrate-from-zapper">
    GraphQL API, balances, DeFi, NFTs, prices.

    <span>Shuts down August 3, 2026</span>
  </Card>

  <Card title="From Dune SIM" icon={<img src="https://mintcdn.com/zerion-f99485ad/Swl5SsX6BrOlR7mZ/images/providers/dune.png?fit=max&auto=format&n=Swl5SsX6BrOlR7mZ&q=85&s=7822f8142cf9da783922536fb7330edc" alt="Dune SIM" />} href="/migrate-from-sim">
    Balances, Activity, DeFi Positions.

    <span>Shuts down August 1, 2026</span>
  </Card>

  <Card title="From DeBank" icon={<img src="https://mintcdn.com/zerion-f99485ad/Swl5SsX6BrOlR7mZ/images/providers/debank.png?fit=max&auto=format&n=Swl5SsX6BrOlR7mZ&q=85&s=9c5f7a9530345f8f245729f51e9ec10c" alt="DeBank" />} href="/migrate-from-debank">
    Cloud API, net worth, DeFi, history, NFTs.
  </Card>

  <Card title="From Allium" icon={<img src="https://mintcdn.com/zerion-f99485ad/Swl5SsX6BrOlR7mZ/images/providers/allium.png?fit=max&auto=format&n=Swl5SsX6BrOlR7mZ&q=85&s=7257a5166d065f666f072842c5c8bcdc" alt="Allium" />} href="/migrate-from-allium">
    Realtime APIs, balances, PnL, prices.
  </Card>

  <Card title="From OneBalance" icon={<img src="https://mintcdn.com/zerion-f99485ad/Swl5SsX6BrOlR7mZ/images/providers/onebalance.png?fit=max&auto=format&n=Swl5SsX6BrOlR7mZ&q=85&s=388273efddc3c164734f624512c07d46" alt="OneBalance" />} href="/migrate-from-onebalance">
    Aggregated balances, history, assets.
  </Card>

  <Card title="From GoldRush" icon={<img src="https://mintcdn.com/zerion-f99485ad/AebfaJF49uxSfFzx/images/providers/goldrush.png?fit=max&auto=format&n=AebfaJF49uxSfFzx&q=85&s=3f9401253774ebd76d2a596e21f7c75b" alt="GoldRush" />} href="/migrate-from-goldrush">
    Covalent's API. Balances, transactions, prices, NFTs.
  </Card>

  <Card title="From Moralis" icon={<img src="https://mintcdn.com/zerion-f99485ad/AebfaJF49uxSfFzx/images/providers/moralis.png?fit=max&auto=format&n=AebfaJF49uxSfFzx&q=85&s=05a93893ebf1fd0cb0e32e81f6fa50ec" alt="Moralis" />} href="/migrate-from-moralis">
    Balances, history, PnL, DeFi, prices.
  </Card>
</CardGroup>

If you need a hand with the switch, don't see your provider, or find something missing from our API, reach out via the chat widget on [dashboard.zerion.io](https://dashboard.zerion.io) or email [api@zerion.io](mailto:api@zerion.io).


# Pagination, filtering, sorting, and currency
Source: https://developers.zerion.io/pagination-and-filtering

Paginate through results with cursors, filter by chain, position type, or asset, sort responses, and switch currencies across Zerion API endpoints.

Most Zerion API list endpoints return paginated results and support filtering. This page covers the patterns you'll use across the API.

## Pagination

List endpoints use **cursor-based pagination**. Each response includes a `links` object with URLs for navigating between pages.

### How it works

1. Make your initial request without any page parameter
2. Check `links.next` in the response - if present, there are more results
3. Follow the `links.next` URL directly to get the next page
4. Repeat until `links.next` is absent

```json Response with pagination theme={null}
{
  "links": {
    "self": "https://api.zerion.io/v1/wallets/0x.../positions/?page[size]=10",
    "next": "https://api.zerion.io/v1/wallets/0x.../positions/?page[size]=10&page[after]=eyJhZnR..."
  },
  "data": [...]
}
```

Control the number of results per page with `page[size]`:

| Parameter    | Type    | Default | Min | Max   |
| ------------ | ------- | ------- | --- | ----- |
| `page[size]` | integer | `100`   | `1` | `100` |

<Warning>
  Do not construct `page[after]` cursor values manually. Always use the full URL from `links.next` - cursor tokens are opaque and may change format without notice.
</Warning>

### Iterating through all pages

<CodeGroup>
  ```javascript JavaScript theme={null}
  async function fetchAll(url, apiKey) {
    const results = [];

    while (url) {
      const response = await fetch(url, {
        headers: { Authorization: `Basic ${btoa(`${apiKey}:`)}` }
      });
      const json = await response.json();
      results.push(...json.data);
      url = json.links.next || null;
    }

    return results;
  }

  const positions = await fetchAll(
    "https://api.zerion.io/v1/wallets/0x.../positions/?page[size]=100",
    "YOUR_API_KEY"
  );
  ```

  ```python Python theme={null}
  import requests

  def fetch_all(url, api_key):
      results = []

      while url:
          response = requests.get(url, auth=(api_key, ""))
          data = response.json()
          results.extend(data["data"])
          url = data["links"].get("next")

      return results

  positions = fetch_all(
      "https://api.zerion.io/v1/wallets/0x.../positions/?page[size]=100",
      "YOUR_API_KEY"
  )
  ```
</CodeGroup>

## Filtering

Filter parameters use the `filter[field]` syntax. Pass multiple values as comma-separated:

```
?filter[chain_ids]=ethereum,base&filter[position_types]=deposit,staked
```

Common filters include `chain_ids`, `position_types`, `operation_types`, `trash`, `search_query`, and `fungible_ids`. Each endpoint documents its available filters and accepted values in the relevant API reference page, such as [wallet positions](/api-reference/wallets/get-wallet-fungible-positions), [wallet transactions](/api-reference/wallets/get-wallet-transactions), or [fungibles search](/api-reference/fungibles/get-list-of-fungible-assets). For spam filtering behavior, see the [spam filtering guide](/spam-filtering).

## Sorting

Some endpoints support a `sort` parameter. Prefix with `-` for descending order:

```
?sort=-market_data.market_cap
```

Available sort fields vary by endpoint - check the relevant list endpoint in the API reference, such as [wallet positions](/api-reference/wallets/get-wallet-fungible-positions) or [wallet transactions](/api-reference/wallets/get-wallet-transactions), for supported options.

<Note>
  On [wallet positions](/api-reference/wallets/get-wallet-fungible-positions), use `sort=value` (the default) to get the most valuable positions first. Positions without a reliable price have `value: null` and sort last.
</Note>

## Currency

Most endpoints that return monetary values accept a `currency` parameter. Default is `usd`.

```
?currency=eur
```

Supports major fiat currencies and `eth`/`btc`. See any currency-aware endpoint, such as [wallet positions](/api-reference/wallets/get-wallet-fungible-positions), for the full list.


# Quickstart
Source: https://developers.zerion.io/quickstart

Get a Zerion API key from the Dashboard and make your first authenticated request for wallet portfolio data in under 5 minutes with curl, JavaScript, or Python.

## Popular quickstarts

<Tabs>
  <Tab title="Wallet Data">
    <CardGroup>
      <Card title="Get a wallet portfolio" icon="chart-pie" href="/api-reference/wallets/get-wallet-portfolio">
        Total value, position breakdown, and daily changes for any address.
      </Card>

      <Card title="List fungible positions" icon="coins" href="/api-reference/wallets/get-wallet-fungible-positions">
        Every token a wallet holds with quantities and USD values.
      </Card>

      <Card title="View DeFi positions" icon="layer-group" href="/recipes/defi-positions">
        Lending, staking, and liquidity positions across protocols.
      </Card>

      <Card title="NFT positions" icon="image" href="/api-reference/wallets/get-wallet-nft-positions">
        NFT holdings with metadata, floor prices, and collection info.
      </Card>
    </CardGroup>
  </Tab>

  <Tab title="Transactions">
    <CardGroup>
      <Card title="Get parsed transactions" icon="clock-rotate-left" href="/api-reference/wallets/get-wallet-transactions">
        Human-readable transaction history with filters by type, chain, and date.
      </Card>

      <Card title="Subscribe to webhooks" icon="bell" href="/api-reference/subscriptions-to-transactions/create-subscription">
        Instant notifications when wallet transactions occur - no polling.
      </Card>
    </CardGroup>
  </Tab>

  <Tab title="Market Data">
    <CardGroup>
      <Card title="Search fungible tokens" icon="magnifying-glass" href="/api-reference/fungibles/get-list-of-fungible-assets">
        Look up any token by name, get prices, charts, and market data.
      </Card>

      <Card title="Token charts" icon="chart-line" href="/api-reference/fungibles/get-a-chart-for-a-fungible-asset">
        Historical price and market cap charts for any token.
      </Card>
    </CardGroup>
  </Tab>

  <Tab title="Trading">
    <CardGroup>
      <Card title="Get swap quotes" icon="arrow-right-arrow-left" href="/api-reference/swap/get-swap-and-bridge-quotes">
        Fetch the best swap and bridge offers across chains.
      </Card>

      <Card title="Check gas prices" icon="gas-pump" href="/api-reference/gas/get-list-of-all-available-gas-prices">
        Current gas prices across all supported chains.
      </Card>
    </CardGroup>
  </Tab>
</Tabs>

***

## Make your first request

<Steps>
  <Step title="Get your API key">
    Sign up at [dashboard.zerion.io](https://dashboard.zerion.io) and create an API key from the dashboard. It's free to start.
  </Step>

  <Step title="Try it from the docs">
    The fastest way to test the API is right here in the docs. Open any [API reference](/api-reference/wallets/get-wallet-portfolio) page, click **Try it**, enter your API key in the **Username** field, leave **Password** empty, and hit **Send**.
  </Step>

  <Step title="Make a request from your code">
    The API uses [HTTP Basic Auth](/authentication) - your API key is the username, password is empty. Let's fetch a wallet portfolio:

    <CodeGroup>
      ```bash cURL theme={null}
      # Transform your API key for Basic Auth
      API_KEY_TRANSFORMED=$(echo -n "YOUR_API_KEY:" | base64)

      # Make the request
      curl -X GET "https://api.zerion.io/v1/wallets/0x42b9df65b219b3dd36ff330a4dd8f327a6ada990/portfolio" \
        -H "Authorization: Basic $API_KEY_TRANSFORMED" \
        -H "accept: application/json"
      ```

      ```javascript JavaScript theme={null}
      // Transform your API key for Basic Auth
      const apiKey = 'YOUR_API_KEY';
      const apiKeyTransformed = btoa(apiKey + ':');

      // Make the request
      const response = await fetch(
        'https://api.zerion.io/v1/wallets/0x42b9df65b219b3dd36ff330a4dd8f327a6ada990/portfolio',
        {
          headers: {
            'Authorization': `Basic ${apiKeyTransformed}`,
            'accept': 'application/json'
          }
        }
      );
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      console.log(data);
      ```

      ```python Python theme={null}
      import requests
      import base64

      # Transform your API key for Basic Auth
      api_key = 'YOUR_API_KEY'
      api_key_transformed = base64.b64encode(f'{api_key}:'.encode()).decode()

      # Make the request
      response = requests.get(
          'https://api.zerion.io/v1/wallets/0x42b9df65b219b3dd36ff330a4dd8f327a6ada990/portfolio',
          headers={
              'Authorization': f'Basic {api_key_transformed}',
              'accept': 'application/json'
          }
      )
      response.raise_for_status()
      data = response.json()
      print(data)
      ```

      ```go Go theme={null}
      import (
          "encoding/base64"
          "log"
          "net/http"
      )

      // Transform your API key for Basic Auth
      apiKey := "YOUR_API_KEY"
      apiKeyTransformed := base64.StdEncoding.EncodeToString([]byte(apiKey + ":"))

      // Make the request
      client := &http.Client{}
      req, err := http.NewRequest("GET", "https://api.zerion.io/v1/wallets/0x42b9df65b219b3dd36ff330a4dd8f327a6ada990/portfolio", nil)
      if err != nil {
          log.Fatal(err)
      }
      req.Header.Set("Authorization", "Basic " + apiKeyTransformed)
      req.Header.Set("accept", "application/json")

      resp, err := client.Do(req)
      if err != nil {
          log.Fatal(err)
      }
      defer resp.Body.Close()
      ```
    </CodeGroup>
  </Step>

  <Step title="Understand the response">
    The API returns data in [JSON:API](https://jsonapi.org/) format. Every response has a `data` object with `type`, `id`, and `attributes`:

    ```json theme={null}
    {
      "data": {
        "type": "portfolios",
        "id": "0x42b9df65b219b3dd36ff330a4dd8f327a6ada990",
        "attributes": {
          "positions_distribution_by_type": {
            "wallet": 0.85,
            "deposited": 0.10,
            "staked": 0.04,
            "locked": 0.01
          },
          "total": { "positions": 142 },
          "changes": {
            "absolute_1d": 1250.50,
            "percent_1d": 0.02
          }
        }
      }
    }
    ```

    List endpoints return a `data` array and support [pagination](/pagination-and-filtering).
  </Step>
</Steps>

## Next steps

<CardGroup>
  <Card title="Authentication" icon="lock" href="/authentication">
    API key encoding and security best practices.
  </Card>

  <Card title="Pagination & Filtering" icon="filter" href="/pagination-and-filtering">
    Cursor pagination, filters, sorting, and currency options.
  </Card>

  <Card title="Recipes" icon="book" href="/recipes">
    Step-by-step guides for common use cases.
  </Card>

  <Card title="Rate Limits" icon="gauge" href="/rate-limits">
    Plan quotas, retry guidance, and usage headers.
  </Card>

  <Card title="Supported Blockchains" icon="link" href="/supported-blockchains">
    Full list of supported chains and feature coverage.
  </Card>
</CardGroup>


# Rate limits and throttling
Source: https://developers.zerion.io/rate-limits

How Zerion API rate limits work, which response headers to inspect, how to detect 429 responses, and best practices for retries with exponential backoff.

Rate limits depend on your plan. Visit the [Dashboard](https://dashboard.zerion.io) to view your current limits and usage.

## Monitoring usage

Every API response includes rate limit headers with your current limits and remaining quota. For a full usage breakdown, visit the [Dashboard](https://dashboard.zerion.io) and click **Open Analytics Dashboard**.

| Header                           | Description                               |
| -------------------------------- | ----------------------------------------- |
| `RateLimit-Org-Second-Limit`     | Maximum requests allowed per second       |
| `RateLimit-Org-Second-Remaining` | Requests remaining in the current second  |
| `RateLimit-Org-Second-Reset`     | Seconds until the per-second limit resets |
| `RateLimit-Org-Day-Limit`        | Maximum requests allowed per day          |
| `RateLimit-Org-Day-Remaining`    | Requests remaining today                  |
| `RateLimit-Org-Day-Reset`        | Seconds until the daily limit resets      |
| `RateLimit-Org-Month-Limit`      | Maximum requests allowed per month        |
| `RateLimit-Org-Month-Remaining`  | Requests remaining this month             |
| `RateLimit-Org-Month-Reset`      | Seconds until the monthly limit resets    |
| `RateLimit-Org-Tier`             | Your organization's plan tier name        |

## When you hit the limit

The API returns a `429 Too Many Requests` response:

```json theme={null}
{
  "errors": [
    {
      "title": "Too many requests",
      "detail": "Your request had been throttled"
    }
  ]
}
```

## Handling rate limits

Use the `RateLimit-Org-Second-Reset` header to wait the exact time needed before retrying a `429` response. If your day or month quota is exhausted, retrying won't help - check `RateLimit-Org-Day-Remaining` and `RateLimit-Org-Month-Remaining` first.

## Tips to stay under the limit

* **Use webhooks instead of polling** - [transaction subscriptions](/api-reference/subscriptions-to-transactions/create-subscription) give you real-time updates without repeated requests
* **Cache responses** where data doesn't change frequently (e.g., chain lists, token metadata)
* **Use filters and pagination** to fetch only the data you need - smaller requests, fewer calls


# Recipes
Source: https://developers.zerion.io/recipes

Task-focused guides for building portfolio trackers, NFT viewers, PnL dashboards, transaction feeds, swap flows, and wallet alerts with the Zerion API.

Practical, step-by-step guides to accomplish specific tasks with the Zerion API. Each recipe combines multiple endpoints to solve a real-world problem.

<CardGroup>
  <Card title="Build a Portfolio Tracker" icon="chart-pie" href="/recipes/multi-chain-portfolio">
    Fetch wallet value, list token holdings, aggregate multiple wallets, and chart performance over time.
  </Card>

  <Card title="Get a Wallet's Transaction History" icon="clock-rotate-left" href="/recipes/transaction-history">
    Fetch and interpret a wallet's transactions with human-readable types and transfer details.
  </Card>

  <Card title="Set Up Wallet Activity Alerts" icon="bell" href="/recipes/wallet-activity-alerts">
    Use webhooks to get notified in real time when a wallet sends or receives tokens.
  </Card>

  <Card title="Build a Wallet PnL Tracker" icon="chart-line" href="/recipes/wallet-pnl-tracker">
    Track realized gains, unrealized gains, cost basis, and per-token performance.
  </Card>

  <Card title="Get a Wallet's DeFi Positions" icon="layer-group" href="/recipes/defi-positions">
    Retrieve lending, staking, and liquidity positions across DeFi protocols.
  </Card>

  <Card title="Swap Tokens & Bridge Assets" icon="arrows-rotate" href="/recipes/swap-tokens">
    Get quotes and ready-to-sign transactions for same-chain swaps and cross-chain bridges.
  </Card>

  <Card title="Build an NFT Portfolio Viewer" icon="image" href="/recipes/nft-portfolio">
    Fetch a wallet's NFT holdings grouped by collection, with floor prices and chain breakdown.
  </Card>

  <Card title="Build an AI Agent with Onchain Data" icon="robot" href="/recipes/ai-agent-integration">
    Give your AI agent access to wallet portfolios, token prices, and transaction history.
  </Card>
</CardGroup>


# Build an AI agent with onchain data
Source: https://developers.zerion.io/recipes/ai-agent-integration

Give your AI agent access to wallet portfolios, token prices, and transaction history through Zerion API tool calls with a step-by-step OpenAI-style example.

**What you'll build:**

* Tool functions for portfolio lookup, token search, and transaction history
* A working agent using the OpenAI SDK that answers wallet questions
* Patterns for connecting Zerion data to any AI framework

**Time:** \~15 minutes

## Prerequisites

* A Zerion API key ([get one here](https://dashboard.zerion.io))
* Node.js 18+
* An OpenAI API key (for the agent example - you can adapt to any LLM)

## Steps

<Steps>
  ### Define the Zerion tool functions

  Create reusable functions that your agent can call. Each function maps to a Zerion API endpoint: [wallet portfolio](/api-reference/wallets/get-wallet-portfolio), [wallet positions](/api-reference/wallets/get-wallet-fungible-positions), [fungible assets search](/api-reference/fungibles/get-list-of-fungible-assets), and [wallet transactions](/api-reference/wallets/get-wallet-transactions).

  ```javascript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const BASE_URL = "https://api.zerion.io/v1";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  // Tool 1: Get wallet portfolio summary
  async function getWalletPortfolio(address) {
    const res = await fetch(
      `${BASE_URL}/wallets/${address}/portfolio?currency=usd`,
      { headers }
    );
    const { data } = await res.json();
    const attrs = data.attributes;
    return {
      total_value: attrs.total.positions,
      change_24h_percent: attrs.changes.percent_1d,
      change_24h_usd: attrs.changes.absolute_1d,
      chains: attrs.positions_distribution_by_chain,
    };
  }

  // Tool 2: Get top token positions
  async function getWalletPositions(address, limit = 10) {
    const res = await fetch(
      `${BASE_URL}/wallets/${address}/positions/?currency=usd&sort=value&filter[positions]=only_simple`,
      { headers }
    );
    const { data } = await res.json();
    return data.slice(0, limit).map((pos) => ({
      symbol: pos.attributes.fungible_info.symbol,
      name: pos.attributes.fungible_info.name,
      chain: pos.relationships.chain.data.id,
      quantity: pos.attributes.quantity.float,
      value_usd: pos.attributes.value,
      price: pos.attributes.price,
    }));
  }

  // Tool 3: Search for a token by name
  async function searchToken(query) {
    const res = await fetch(
      `${BASE_URL}/fungibles/?currency=usd&filter[search_query]=${encodeURIComponent(query)}&sort=-market_data.market_cap&page[size]=5`,
      { headers }
    );
    const { data } = await res.json();
    return data.map((token) => ({
      id: token.id,
      symbol: token.attributes.symbol,
      name: token.attributes.name,
      price: token.attributes.market_data?.price,
      market_cap: token.attributes.market_data?.market_cap,
    }));
  }

  // Tool 4: Get recent transactions
  async function getRecentTransactions(address, limit = 5) {
    const res = await fetch(
      `${BASE_URL}/wallets/${address}/transactions/?currency=usd&page[size]=${limit}`,
      { headers }
    );
    const { data } = await res.json();
    return data.map((tx) => ({
      type: tx.attributes.operation_type,
      timestamp: tx.attributes.mined_at,
      chain: tx.relationships.chain.data.id,
      transfers: tx.attributes.transfers?.map((t) => ({
        direction: t.direction,
        symbol: t.fungible_info?.symbol || "NFT",
        quantity: t.quantity?.float,
        value_usd: t.value,
      })),
    }));
  }
  ```

  ### Wire up the agent with tool definitions

  Define the tools schema so the LLM knows what functions are available and what parameters they accept.

  ```javascript theme={null}
  import OpenAI from "openai";

  const openai = new OpenAI();

  const tools = [
    {
      type: "function",
      function: {
        name: "getWalletPortfolio",
        description: "Get total portfolio value, 24h change, and chain breakdown for a wallet address",
        parameters: {
          type: "object",
          properties: {
            address: { type: "string", description: "Wallet address (0x... or ENS)" },
          },
          required: ["address"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "getWalletPositions",
        description: "Get the top token holdings for a wallet, sorted by USD value",
        parameters: {
          type: "object",
          properties: {
            address: { type: "string", description: "Wallet address" },
            limit: { type: "number", description: "Max tokens to return (default 10)" },
          },
          required: ["address"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "searchToken",
        description: "Search for a token by name or symbol and get its price and market cap",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Token name or symbol to search for" },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "getRecentTransactions",
        description: "Get recent transactions for a wallet with transfer details",
        parameters: {
          type: "object",
          properties: {
            address: { type: "string", description: "Wallet address" },
            limit: { type: "number", description: "Max transactions to return (default 5)" },
          },
          required: ["address"],
        },
      },
    },
  ];

  // Map function names to implementations
  const toolFunctions = {
    getWalletPortfolio,
    getWalletPositions,
    searchToken,
    getRecentTransactions,
  };
  ```

  ### Run the agent loop

  Process user messages, call tools when the LLM requests them, and return the results.

  ```javascript theme={null}
  async function chat(userMessage) {
    const messages = [
      {
        role: "system",
        content: "You are a helpful onchain assistant. Use the available tools to look up wallet data, token prices, and transactions. Always cite specific numbers from the API.",
      },
      { role: "user", content: userMessage },
    ];

    while (true) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // or any model that supports tool calling
        messages,
        tools,
      });

      const message = response.choices[0].message;
      messages.push(message);

      // If no tool calls, return the final answer
      if (!message.tool_calls?.length) {
        return message.content;
      }

      // Execute each tool call and append results
      for (const toolCall of message.tool_calls) {
        const fn = toolFunctions[toolCall.function.name];
        const args = JSON.parse(toolCall.function.arguments);
        const result = await fn(...Object.values(args));

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }
  }

  // Try it
  const answer = await chat("What tokens does vitalik.eth hold? What's the total value?");
  console.log(answer);
  ```

  ### Full working example

  Save as `agent.mjs` and run with `node agent.mjs`:

  ```javascript theme={null}
  import OpenAI from "openai";

  const ZERION_API_KEY = process.env.ZERION_API_KEY;
  const BASE_URL = "https://api.zerion.io/v1";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(ZERION_API_KEY + ":")}`,
  };

  async function getWalletPortfolio(address) {
    const res = await fetch(`${BASE_URL}/wallets/${address}/portfolio?currency=usd`, { headers });
    const { data } = await res.json();
    const a = data.attributes;
    return { total_value: a.total.positions, change_24h_percent: a.changes.percent_1d, chains: a.positions_distribution_by_chain };
  }

  async function getWalletPositions(address, limit = 10) {
    const res = await fetch(`${BASE_URL}/wallets/${address}/positions/?currency=usd&sort=value&filter[positions]=only_simple`, { headers });
    const { data } = await res.json();
    return data.slice(0, limit).map((p) => ({
      symbol: p.attributes.fungible_info.symbol, chain: p.relationships.chain.data.id,
      quantity: p.attributes.quantity.float, value_usd: p.attributes.value,
    }));
  }

  async function searchToken(query) {
    const res = await fetch(`${BASE_URL}/fungibles/?currency=usd&filter[search_query]=${encodeURIComponent(query)}&sort=-market_data.market_cap&page[size]=5`, { headers });
    const { data } = await res.json();
    return data.map((t) => ({ symbol: t.attributes.symbol, name: t.attributes.name, price: t.attributes.market_data?.price }));
  }

  async function getRecentTransactions(address, limit = 5) {
    const res = await fetch(`${BASE_URL}/wallets/${address}/transactions/?currency=usd&page[size]=${limit}`, { headers });
    const { data } = await res.json();
    return data.map((tx) => ({
      type: tx.attributes.operation_type, timestamp: tx.attributes.mined_at,
      chain: tx.relationships.chain.data.id,
      transfers: tx.attributes.transfers?.map((t) => ({ direction: t.direction, symbol: t.fungible_info?.symbol || "NFT", quantity: t.quantity?.float })),
    }));
  }

  const toolFunctions = { getWalletPortfolio, getWalletPositions, searchToken, getRecentTransactions };

  const tools = [
    { type: "function", function: { name: "getWalletPortfolio", description: "Get portfolio value and chain breakdown", parameters: { type: "object", properties: { address: { type: "string" } }, required: ["address"] } } },
    { type: "function", function: { name: "getWalletPositions", description: "Get top token holdings by value", parameters: { type: "object", properties: { address: { type: "string" }, limit: { type: "number" } }, required: ["address"] } } },
    { type: "function", function: { name: "searchToken", description: "Search tokens by name/symbol", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
    { type: "function", function: { name: "getRecentTransactions", description: "Get recent wallet transactions", parameters: { type: "object", properties: { address: { type: "string" }, limit: { type: "number" } }, required: ["address"] } } },
  ];

  const openai = new OpenAI();

  async function chat(userMessage) {
    const messages = [
      { role: "system", content: "You are a helpful onchain data assistant. Use tools to answer questions about wallets, tokens, and transactions." },
      { role: "user", content: userMessage },
    ];

    while (true) {
      const res = await openai.chat.completions.create({ model: "gpt-4o", messages, tools });
      const msg = res.choices[0].message;
      messages.push(msg);

      if (!msg.tool_calls?.length) return msg.content;

      for (const tc of msg.tool_calls) {
        const fn = toolFunctions[tc.function.name];
        const args = JSON.parse(tc.function.arguments);
        const result = await fn(...Object.values(args));
        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
    }
  }

  const answer = await chat("What's in vitalik.eth's wallet? Give me a summary.");
  console.log(answer);
  ```
</Steps>

## Adapting to other frameworks

The tool functions work with any AI framework. Here's how to connect them:

**Anthropic Claude (tool\_use)**

```javascript theme={null}
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  messages: [{ role: "user", content: userMessage }],
  tools: tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  })),
});
```

**LangChain**

```javascript theme={null}
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const portfolioTool = tool(
  async ({ address }) => JSON.stringify(await getWalletPortfolio(address)),
  {
    name: "getWalletPortfolio",
    description: "Get portfolio value and chain breakdown",
    schema: z.object({ address: z.string() }),
  }
);
```

**Vercel AI SDK**

```javascript theme={null}
import { tool } from "ai";
import { z } from "zod";

const walletTool = tool({
  description: "Get portfolio value and chain breakdown",
  parameters: z.object({ address: z.string() }),
  execute: async ({ address }) => getWalletPortfolio(address),
});
```

## Next steps

* Connect via [MCP](/build-with-ai/mcp) to give AI tools access to the full Zerion docs and API spec
* Add [PnL tracking](/recipes/wallet-pnl-tracker) tools for cost basis and gain/loss analysis
* Use [webhooks](/recipes/wallet-activity-alerts) to push new transactions to your agent in real time
* Explore [x402](/build-with-ai/x402) for per-request stablecoin payments (no API keys needed)


# Get a wallet's DeFi positions
Source: https://developers.zerion.io/recipes/defi-positions

Retrieve lending, staking, liquidity, and farming positions across DeFi protocols for any wallet, grouped by protocol and chain, using the Zerion API.

**What you'll build:**

* Fetch all DeFi positions (staked, deposited, LP, locked, rewards)
* Filter by position type and chain
* Group positions by protocol and calculate per-protocol totals
* Build a complete runnable DeFi dashboard

```
Position                  | Protocol     | Module         | Amount    | Value
Supplied USDC             | Aave V3      | lending        | 5,000.00  | $5,000.00
Staked ETH                | Lido         | staked         | 1.20      | $2,543.88
ETH/USDC LP              | Uniswap V3   | liquidity_pool | 0.85      | $1,801.15
Locked CRV                | Curve        | locked         | 10,000.00 | $450.00
Unclaimed ARB             | Arbitrum     | rewards        | 200.00    | $230.00
```

**Time:** \~10 minutes

## Prerequisites

* A Zerion API key ([get one here](https://dashboard.zerion.io))
* A wallet address to query

## Steps

<Steps>
  ### Fetch DeFi positions

  Call the [positions endpoint](/api-reference/wallets/get-wallet-fungible-positions) with `filter[positions]=only_complex` to get only DeFi protocol positions, excluding regular wallet tokens.

  <CodeGroup>
    ```javascript JavaScript theme={null}
    const API_KEY = process.env.ZERION_API_KEY;
    const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
    const headers = {
      accept: "application/json",
      authorization: `Basic ${btoa(API_KEY + ":")}`,
    };

    const response = await fetch(
      `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[positions]=only_complex&sort=value`,
      { headers }
    );
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const { data } = await response.json();

    for (const position of data) {
      const { name, protocol, protocol_module, quantity, value } = position.attributes;
      console.log(
        `${name} | ${protocol} (${protocol_module}) | ${quantity?.float} | ${value != null ? `$${value.toFixed(2)}` : "N/A"}`
      );
    }
    ```

    ```python Python theme={null}
    import os, requests

    api_key = os.environ["ZERION_API_KEY"]
    address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

    response = requests.get(
        f"https://api.zerion.io/v1/wallets/{address}/positions/",
        params={
            "currency": "usd",
            "filter[positions]": "only_complex",
            "sort": "-value",
        },
        auth=(api_key, ""),
    )

    for position in response.json()["data"]:
        attrs = position["attributes"]
        print(
            f"{attrs['name']} | "
            f"{attrs.get('protocol', 'N/A')} ({attrs.get('protocol_module', 'N/A')}) | "
            f"{attrs['quantity']['float']} | "
            f"{'${:.2f}'.format(attrs['value']) if attrs.get('value') is not None else 'N/A'}"
        )
    ```

    ```bash cURL theme={null}
    curl -g -u "YOUR_API_KEY:" \
      "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?currency=usd&filter[positions]=only_complex&sort=value"
    ```
  </CodeGroup>

  <Tip>
    **Key parameters:** `filter[positions]=only_complex` (DeFi positions only), `sort=value` (highest value first), `currency=usd` (also supports `eur`, `gbp`, etc.)
  </Tip>

  ### Filter by position type (optional)

  Use `filter[position_types]` to narrow results to specific DeFi categories.

  <CodeGroup>
    ```javascript JavaScript theme={null}
    const response = await fetch(
      `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&filter[positions]=only_complex&filter[position_types]=deposit,staked`,
      { headers }
    );

    const { data } = await response.json();
    ```

    ```python Python theme={null}
    response = requests.get(
        f"https://api.zerion.io/v1/wallets/{address}/positions/",
        params={
            "currency": "usd",
            "filter[positions]": "only_complex",
            "filter[position_types]": "deposit,staked",
        },
        auth=(api_key, ""),
    )
    ```

    ```bash cURL theme={null}
    curl -g -u "YOUR_API_KEY:" \
      "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?currency=usd&filter[positions]=only_complex&filter[position_types]=deposit,staked"
    ```
  </CodeGroup>

  Available position types:

  | Type      | Description                                                     |
  | --------- | --------------------------------------------------------------- |
  | `deposit` | Assets deposited into lending pools, vaults, or liquidity pools |
  | `staked`  | Assets staked for rewards, governance, or consensus             |
  | `reward`  | Unclaimed rewards earned from protocols                         |
  | `locked`  | Vote-escrowed or time-locked positions                          |
  | `wallet`  | Regular wallet assets (excluded by `only_complex`)              |

  ### Filter by chain (optional)

  To get DeFi positions on specific chains only, add `filter[chain_ids]`.

  ```bash theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?currency=usd&filter[positions]=only_complex&filter[chain_ids]=ethereum,arbitrum"
  ```

  ### Full working example

  Save as `defi-dashboard.mjs` and run with `node defi-dashboard.mjs`:

  ```javascript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const BASE_URL = "https://api.zerion.io/v1";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  async function getAllDeFiPositions(address) {
    const allPositions = [];
    let url = `${BASE_URL}/wallets/${address}/positions/?currency=usd&filter[positions]=only_complex&sort=value`;

    while (url) {
      const res = await fetch(url, { headers });
      const { data, links } = await res.json();
      allPositions.push(...data);
      url = links.next || null;
    }

    return allPositions;
  }

  async function displayDeFiDashboard(address) {
    const positions = await getAllDeFiPositions(address);

    // Group by protocol
    const byProtocol = {};
    for (const pos of positions) {
      const protocol = pos.attributes.protocol || "Unknown";
      if (!byProtocol[protocol]) byProtocol[protocol] = { total: 0, positions: [] };
      byProtocol[protocol].total += pos.attributes.value || 0;
      byProtocol[protocol].positions.push(pos);
    }

    // Sort protocols by total value
    const sorted = Object.entries(byProtocol).sort((a, b) => b[1].total - a[1].total);

    const grandTotal = positions.reduce((sum, p) => sum + (p.attributes.value || 0), 0);
    console.log(`=== DeFi OVERVIEW ===`);
    console.log(`Total DeFi value: $${grandTotal.toFixed(2)}`);
    console.log(`Protocols: ${sorted.length}`);
    console.log(`Positions: ${positions.length}\n`);

    for (const [protocol, data] of sorted) {
      console.log(`--- ${protocol} ($${data.total.toFixed(2)}) ---`);
      for (const pos of data.positions) {
        const { name, position_type, value, quantity } = pos.attributes;
        const chain = pos.relationships.chain.data.id;
        console.log(
          `  [${position_type}] ${name} on ${chain}: ${quantity.float} (${value != null ? `$${value.toFixed(2)}` : "N/A"})`
        );
      }
      console.log();
    }
  }

  displayDeFiDashboard("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
  ```
</Steps>

## Response fields reference

Each DeFi position includes:

| Field                 | Description                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `name`                | Human-readable position name                                                                                          |
| `protocol`            | Protocol name (e.g., "Aave V3", "Lido")                                                                               |
| `protocol_module`     | Type of DeFi interaction: `lending`, `staked`, `liquidity_pool`, `locked`, `rewards`, `farming`, `vesting`, `deposit` |
| `position_type`       | Position category (`deposit`, `staked`, `reward`, `locked`)                                                           |
| `quantity.float`      | Token amount                                                                                                          |
| `value`               | USD value of the position                                                                                             |
| `group_id`            | ID to group related positions (e.g., both sides of an LP)                                                             |
| `relationships.chain` | Which blockchain the position is on                                                                                   |

## Next steps

* Use `filter[positions]=no_filter` to get both DeFi and wallet positions in a single call
* Combine with the [portfolio endpoint](/api-reference/wallets/get-wallet-portfolio) to see total value distribution by type
* Implement [pagination](/pagination-and-filtering) to handle wallets with many DeFi positions


# Build a multi-chain portfolio tracker
Source: https://developers.zerion.io/recipes/multi-chain-portfolio

Fetch a wallet's total value and token holdings, aggregate multiple wallets, compare across chains, and chart performance over time with the Zerion API.

**What you'll build:**

* Fetch a wallet's total value, 24h change, and chain breakdown
* List token holdings with prices and handle pagination
* Aggregate portfolio value across multiple wallets
* Fetch balance charts to visualize value over time

```
=== WALLETS ===
Main (0xd8dA6B...): $12,017.49 (+2.33% 24h)
Trading (0x42b9df...): $3,450.21 (-0.85% 24h)

Combined total: $15,467.70

=== BY CHAIN ===
  ethereum: $9,214.01 (59.6%)
  base:     $3,573.03 (23.1%)
  arbitrum: $2,680.66 (17.3%)

=== TOP HOLDINGS (ALL WALLETS) ===
  ETH on ethereum (Main): 2.52 ($8,102.45)
  USDC on base (Trading): 2573.03 ($2,573.03)
  ARB on arbitrum (Main): 1450.00 ($1,230.45)
  ETH on base (Trading): 0.25 ($804.15)
  USDC on arbitrum (Main): 458.35 ($458.36)

=== MAIN - 1 MONTH CHART ===
  2/11/2026: $10,245.30
  2/18/2026: $11,102.88
  2/25/2026: $10,875.41
  3/4/2026:  $11,893.22
  3/11/2026: $12,017.49
```

**Time:** \~15 minutes

## Prerequisites

* A Zerion API key ([get one here](https://dashboard.zerion.io))
* One or more wallet addresses to track
* Node.js 18+ (for native `fetch`)

## Steps

<Steps>
  ### Get a wallet's portfolio summary

  A single call to the [portfolio endpoint](/api-reference/wallets/get-wallet-portfolio) returns the wallet's total value, chain distribution, and 24h change.

  <CodeGroup>
    ```javascript JavaScript theme={null}
    const API_KEY = process.env.ZERION_API_KEY;
    const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
    const headers = {
      accept: "application/json",
      authorization: `Basic ${btoa(API_KEY + ":")}`,
    };

    const response = await fetch(
      `https://api.zerion.io/v1/wallets/${address}/portfolio?currency=usd`,
      { headers }
    );
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const { data } = await response.json();
    const attrs = data.attributes;

    console.log(`Total Value:  $${attrs.total.positions.toFixed(2)}`);
    console.log(`24h Change:   ${(attrs.changes.percent_1d * 100).toFixed(2)}%`);
    console.log(`Chains:`, attrs.positions_distribution_by_chain);
    ```

    ```python Python theme={null}
    import os, requests

    api_key = os.environ["ZERION_API_KEY"]
    address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

    response = requests.get(
        f"https://api.zerion.io/v1/wallets/{address}/portfolio",
        params={"currency": "usd"},
        auth=(api_key, ""),
    )
    response.raise_for_status()

    data = response.json()["data"]["attributes"]
    print(f"Total Value:  ${data['total']['positions']:.2f}")
    print(f"24h Change:   {data['changes']['percent_1d'] * 100:.2f}%")
    print(f"Chains:       {data['positions_distribution_by_chain']}")
    ```

    ```bash cURL theme={null}
    curl -s -u "YOUR_API_KEY:" \
      "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/portfolio?currency=usd" \
      | jq '.data.attributes | {total: .total.positions, change_24h: .changes.percent_1d, chains: .positions_distribution_by_chain}'
    ```
  </CodeGroup>

  The response includes:

  | Field                             | Description                                                              |
  | --------------------------------- | ------------------------------------------------------------------------ |
  | `total.positions`                 | Total USD value of all holdings                                          |
  | `changes.absolute_1d`             | Dollar change in the last 24 hours                                       |
  | `changes.percent_1d`              | Percentage change in the last 24 hours                                   |
  | `positions_distribution_by_chain` | Value breakdown by chain (`ethereum`, `base`, etc.)                      |
  | `positions_distribution_by_type`  | Value split by position type (`wallet`, `staked`, `deposited`, `locked`) |

  ### List token holdings

  Fetch individual [positions](/api-reference/wallets/get-wallet-fungible-positions) sorted by value. Use `filter[trash]=only_non_trash` to exclude spam tokens.

  <CodeGroup>
    ```javascript JavaScript theme={null}
    const positionsRes = await fetch(
      `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&sort=value&filter[trash]=only_non_trash`,
      { headers }
    );
    if (!positionsRes.ok) throw new Error(`API error: ${positionsRes.status}`);

    const { data: positions, links } = await positionsRes.json();

    for (const pos of positions) {
      const { fungible_info, value, quantity, price, changes } = pos.attributes;
      const chain = pos.relationships.chain.data.id;
      console.log(
        `${fungible_info.symbol} on ${chain}: ${quantity.float} (${value != null ? `$${value.toFixed(2)}` : "N/A"})`
      );
    }
    ```

    ```python Python theme={null}
    positions_response = requests.get(
        f"https://api.zerion.io/v1/wallets/{address}/positions/",
        params={
            "currency": "usd",
            "sort": "-value",
            "filter[trash]": "only_non_trash",
        },
        auth=(api_key, ""),
    )
    positions_response.raise_for_status()

    for pos in positions_response.json()["data"]:
        info = pos["attributes"]["fungible_info"]
        value = pos["attributes"]["value"]
        qty = pos["attributes"]["quantity"]["float"]
        chain = pos["relationships"]["chain"]["data"]["id"]
        print(f"{info['symbol']} on {chain}: {qty} ({f'${value:.2f}' if value is not None else 'N/A'})")
    ```

    ```bash cURL theme={null}
    curl -g -s -u "YOUR_API_KEY:" \
      "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?currency=usd&sort=value&filter[trash]=only_non_trash" \
      | jq '.data[] | "\(.attributes.fungible_info.symbol) on \(.relationships.chain.data.id): \(.attributes.quantity.float) ($\(.attributes.value))"'
    ```
  </CodeGroup>

  <Tip>
    **Key parameters:** `sort=value` (highest value first), `filter[positions]=only_simple` (wallet tokens only, excludes DeFi), `filter[trash]=only_non_trash` (excludes spam). Use `filter[fungible_ids]=eth,0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48` to query specific tokens only.
  </Tip>

  **Handling pagination** - if a wallet holds many tokens, use `links.next` to fetch all pages:

  ```javascript theme={null}
  async function getAllPositions(address) {
    const allPositions = [];
    let url = `https://api.zerion.io/v1/wallets/${address}/positions/?currency=usd&sort=value&filter[trash]=only_non_trash`;

    while (url) {
      const response = await fetch(url, { headers });
      const { data, links } = await response.json();
      allPositions.push(...data);
      url = links.next || null;
    }

    return allPositions;
  }
  ```

  ### Aggregate multiple wallets

  Fetch portfolio summaries for each wallet and combine them into a single view.

  ```javascript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const BASE_URL = "https://api.zerion.io/v1";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  const wallets = [
    { label: "Main", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
    { label: "Trading", address: "0x42b9df65b219b3dd36ff330a4dd8f327a6ada990" },
  ];

  async function getPortfolio(address) {
    const res = await fetch(
      `${BASE_URL}/wallets/${address}/portfolio?currency=usd`,
      { headers }
    );
    return res.json();
  }

  // Fetch all wallets in parallel
  const results = await Promise.all(
    wallets.map(async (w) => {
      const { data } = await getPortfolio(w.address);
      return { ...w, portfolio: data.attributes };
    })
  );

  let grandTotal = 0;
  for (const w of results) {
    const total = w.portfolio.total.positions;
    grandTotal += total;
    console.log(`${w.label}: $${total.toFixed(2)}`);
  }
  console.log(`\nCombined: $${grandTotal.toFixed(2)}`);
  ```

  The full working example below also merges the per-chain breakdowns from each wallet to compare value across chains.

  ### Fetch balance charts

  Use the [balance chart endpoint](/api-reference/wallets/get-wallet-balance-chart) to visualize how portfolio value has changed over time. The period is part of the URL path. Supported periods: `day`, `week`, `month`, `3months`, `6months`, `year`, `5years`, `max`.

  <CodeGroup>
    ```javascript JavaScript theme={null}
    async function getBalanceChart(address, period = "month") {
      const res = await fetch(
        `${BASE_URL}/wallets/${address}/charts/${period}?currency=usd`,
        { headers }
      );
      return res.json();
    }

    const chart = await getBalanceChart(wallets[0].address, "month");
    const points = chart.data.attributes.points;

    for (const [timestamp, value] of points) {
      const date = new Date(timestamp * 1000).toLocaleDateString();
      console.log(`  ${date}: $${value.toFixed(2)}`);
    }
    ```

    ```python Python theme={null}
    chart_response = requests.get(
        f"https://api.zerion.io/v1/wallets/{address}/charts/month",
        params={"currency": "usd"},
        auth=(api_key, ""),
    )

    for timestamp, value in chart_response.json()["data"]["attributes"]["points"]:
        from datetime import datetime
        date = datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")
        print(f"  {date}: ${value:.2f}")
    ```

    ```bash cURL theme={null}
    curl -u "YOUR_API_KEY:" \
      "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/charts/month?currency=usd"
    ```
  </CodeGroup>

  The response contains `data.attributes.points` - an array of `[timestamp, value]` pairs where:

  * `timestamp` - Unix timestamp (seconds)
  * `value` - portfolio value at that point in USD

  ### Full working example

  Save as `multi-wallet-tracker.mjs` and run with `node multi-wallet-tracker.mjs`:

  ```javascript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const BASE_URL = "https://api.zerion.io/v1";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  const wallets = [
    { label: "Main", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
    { label: "Trading", address: "0x42b9df65b219b3dd36ff330a4dd8f327a6ada990" },
  ];

  async function getPortfolio(address) {
    const res = await fetch(`${BASE_URL}/wallets/${address}/portfolio?currency=usd`, { headers });
    return res.json();
  }

  async function getPositions(address) {
    const res = await fetch(
      `${BASE_URL}/wallets/${address}/positions/?currency=usd&sort=value&filter[positions]=only_simple`,
      { headers }
    );
    return res.json();
  }

  async function getBalanceChart(address, period = "month") {
    const res = await fetch(
      `${BASE_URL}/wallets/${address}/charts/${period}?currency=usd`,
      { headers }
    );
    return res.json();
  }

  async function buildDashboard() {
    // 1. Aggregate portfolios
    const results = await Promise.all(
      wallets.map(async (w) => {
        const [portfolio, positions] = await Promise.all([
          getPortfolio(w.address),
          getPositions(w.address),
        ]);
        return { ...w, portfolio: portfolio.data.attributes, positions: positions.data };
      })
    );

    let grandTotal = 0;
    const chainTotals = {};

    console.log("=== WALLETS ===");
    for (const w of results) {
      const total = w.portfolio.total.positions;
      const change = (w.portfolio.changes.percent_1d * 100).toFixed(2);
      grandTotal += total;
      console.log(`${w.label} (${w.address.slice(0, 8)}...): $${total.toFixed(2)} (${change}% 24h)`);

      for (const [chain, value] of Object.entries(w.portfolio.positions_distribution_by_chain)) {
        chainTotals[chain] = (chainTotals[chain] || 0) + value;
      }
    }
    console.log(`\nCombined total: $${grandTotal.toFixed(2)}`);

    // 2. Chain breakdown
    console.log("\n=== BY CHAIN ===");
    const sortedChains = Object.entries(chainTotals).sort((a, b) => b[1] - a[1]);
    for (const [chain, value] of sortedChains) {
      const pct = ((value / grandTotal) * 100).toFixed(1);
      console.log(`  ${chain}: $${value.toFixed(2)} (${pct}%)`);
    }

    // 3. Top holdings across all wallets
    const allPositions = results.flatMap((w) =>
      w.positions.map((p) => ({ ...p, wallet: w.label }))
    );
    allPositions.sort((a, b) => (b.attributes.value || 0) - (a.attributes.value || 0));

    console.log("\n=== TOP HOLDINGS (ALL WALLETS) ===");
    for (const pos of allPositions.slice(0, 10)) {
      const { fungible_info, value, quantity } = pos.attributes;
      const chain = pos.relationships.chain.data.id;
      console.log(
        `  ${fungible_info.symbol} on ${chain} (${pos.wallet}): ${quantity.float} (${value != null ? `$${value.toFixed(2)}` : "N/A"})`
      );
    }

    // 4. Balance chart for first wallet
    const chart = await getBalanceChart(wallets[0].address, "month");
    console.log(`\n=== ${wallets[0].label.toUpperCase()} - 1 MONTH CHART ===`);
    // Sample 5 evenly-spaced points for a quick overview
    const points = chart.data.attributes.points;
    const step = Math.max(1, Math.floor(points.length / 5));
    for (let i = 0; i < points.length; i += step) {
      const date = new Date(points[i][0] * 1000).toLocaleDateString();
      console.log(`  ${date}: $${points[i][1].toFixed(2)}`);
    }
  }

  buildDashboard();
  ```
</Steps>

## Next steps

* Add [DeFi positions](/recipes/defi-positions) to include staked and deposited assets in the totals
* Track [PnL and cost basis](/recipes/wallet-pnl-tracker) per wallet for tax reporting
* Set up [webhooks](/recipes/wallet-activity-alerts) to update the dashboard in real time when any tracked wallet transacts


# Build an NFT portfolio viewer
Source: https://developers.zerion.io/recipes/nft-portfolio

Fetch a wallet's NFT holdings across chains, group them by collection, and display floor prices, total value, and per-chain breakdowns with the Zerion API.

**What you'll build:**

* Fetch a wallet's total NFT value broken down by chain
* List NFT collections sorted by floor value
* Drill into individual NFT positions with metadata
* Filter by specific collections

```
NFT value by chain:
  ethereum: $1,820.50
  polygon:  $37.56

Collections:
  Bored Ape Yacht Club:  1 NFT(s) - floor value $1,802.40
  Art Blocks Curated:    2 NFT(s) - floor value $55.11
  Polygon Apes:          3 NFT(s) - floor value $37.56

Individual NFTs:
  Bored Ape #7495 (Bored Ape Yacht Club)  - $1,802.40
  Chromie Squiggle #4821 (Art Blocks)     - $37.55
  Fidenza #479 (Art Blocks)               - $17.56
  Polygon Ape #102 (Polygon Apes)         - $12.52
```

**Time:** \~10 minutes

## Prerequisites

* A Zerion API key ([get one here](https://dashboard.zerion.io))
* A wallet address to query

## Steps

<Steps>
  ### Get the NFT portfolio overview

  Start by fetching the wallet's [NFT portfolio](/api-reference/wallets/get-wallet-nft-portfolio) to get total NFT value broken down by chain.

  <CodeGroup>
    ```javascript JavaScript theme={null}
    const API_KEY = process.env.ZERION_API_KEY;
    const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
    const headers = {
      accept: "application/json",
      authorization: `Basic ${btoa(API_KEY + ":")}`,
    };

    const response = await fetch(
      `https://api.zerion.io/v1/wallets/${address}/nft-portfolio?currency=usd`,
      { headers }
    );

    const { data } = await response.json();
    const byChain = data.attributes.positions_distribution_by_chain;
    console.log("NFT value by chain:", byChain);
    ```

    ```python Python theme={null}
    import os, requests

    api_key = os.environ["ZERION_API_KEY"]
    address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

    response = requests.get(
        f"https://api.zerion.io/v1/wallets/{address}/nft-portfolio",
        params={"currency": "usd"},
        auth=(api_key, ""),
    )

    data = response.json()["data"]
    by_chain = data["attributes"]["positions_distribution_by_chain"]
    print("NFT value by chain:", by_chain)
    ```

    ```bash cURL theme={null}
    curl -u "YOUR_API_KEY:" \
      "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/nft-portfolio?currency=usd"
    ```
  </CodeGroup>

  The response includes `positions_distribution_by_chain` - a map of chain IDs to their total NFT floor value (e.g., `ethereum: 1820.50`, `polygon: 37.56`).

  <Note>
    The API may return a `202` status if the wallet's NFT data is still being indexed. Poll the endpoint until you receive a `200` response.
  </Note>

  ### Fetch NFT collections

  Get the wallet's [NFT collections](/api-reference/wallets/get-wallet-nft-collections) grouped by collection, sorted by total floor price.

  <CodeGroup>
    ```javascript JavaScript theme={null}
    const collectionsRes = await fetch(
      `https://api.zerion.io/v1/wallets/${address}/nft-collections/?currency=usd&sort=-total_floor_price`,
      { headers }
    );

    const collections = await collectionsRes.json();

    for (const collection of collections.data) {
      const { collection_info, nfts_count, total_floor_price } = collection.attributes;
      console.log(
        `${collection_info.name}: ${nfts_count} NFT(s) - floor value ${total_floor_price != null ? `$${total_floor_price.toFixed(2)}` : "N/A"}`
      );
    }
    ```

    ```python Python theme={null}
    collections_response = requests.get(
        f"https://api.zerion.io/v1/wallets/{address}/nft-collections/",
        params={"currency": "usd", "sort": "-total_floor_price"},
        auth=(api_key, ""),
    )

    for collection in collections_response.json()["data"]:
        attrs = collection["attributes"]
        name = attrs.get("collection_info", {}).get("name", "Unknown")
        count = attrs["nfts_count"]
        floor = attrs.get("total_floor_price")
        print(f"{name}: {count} NFT(s) - floor value {f'${floor:.2f}' if floor is not None else 'N/A'}")
    ```

    ```bash cURL theme={null}
    curl -u "YOUR_API_KEY:" \
      "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/nft-collections/?currency=usd&sort=-total_floor_price"
    ```
  </CodeGroup>

  Each collection entry includes:

  * `collection_info.name` - the collection name
  * `nfts_count` - how many NFTs from this collection the wallet holds
  * `total_floor_price` - combined floor value of the wallet's positions in this collection
  * `min_changed_at` / `max_changed_at` - acquisition timestamps

  ### Fetch individual NFT positions

  Drill into the specific [NFT positions](/api-reference/wallets/get-wallet-nft-positions) held by the wallet, sorted by floor price.

  <CodeGroup>
    ```javascript JavaScript theme={null}
    const positionsRes = await fetch(
      `https://api.zerion.io/v1/wallets/${address}/nft-positions/?currency=usd&sort=-floor_price`,
      { headers }
    );

    const positions = await positionsRes.json();

    for (const position of positions.data) {
      const { nft_info, collection_info, value } = position.attributes;
      console.log(
        `${nft_info?.name} (${collection_info?.name}) - ${value != null ? `$${value.toFixed(2)}` : "N/A"}`
      );
    }
    ```

    ```python Python theme={null}
    positions_response = requests.get(
        f"https://api.zerion.io/v1/wallets/{address}/nft-positions/",
        params={"currency": "usd", "sort": "-floor_price"},
        auth=(api_key, ""),
    )

    for position in positions_response.json()["data"]:
        attrs = position["attributes"]
        nft_name = attrs.get("nft_info", {}).get("name", "Unknown")
        collection_name = attrs.get("collection_info", {}).get("name", "Unknown")
        value = attrs.get("value")
        print(f"{nft_name} ({collection_name}) - {f'${value:.2f}' if value is not None else 'N/A'}")
    ```

    ```bash cURL theme={null}
    curl -u "YOUR_API_KEY:" \
      "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/nft-positions/?currency=usd&sort=-floor_price"
    ```
  </CodeGroup>

  Using `sort=-floor_price` orders NFTs by their floor price (highest first). Each position includes:

  * `nft_info.name` - the NFT's name or token ID
  * `collection_info.name` - the collection it belongs to
  * `value` - estimated USD value based on the collection's floor price

  ### Filter by collection (optional)

  To show NFTs from a specific collection, use the `filter[collection_ids]` parameter. Collection IDs are UUIDs found in the `relationships.collection.data.id` field of each NFT position returned by the endpoints above.

  ```bash theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/nft-positions/?currency=usd&filter[collection_ids]=bc31571c-d2a8-45e4-8012-37dbbf8b7038"
  ```

  ### Full working example

  Save as `nft-portfolio.mjs` and run with `node nft-portfolio.mjs`:

  ```javascript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const BASE_URL = "https://api.zerion.io/v1";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  async function fetchWithRetry(url, maxRetries = 10) {
    for (let i = 0; i < maxRetries; i++) {
      const res = await fetch(url, { headers });
      if (res.status === 202) {
        const retryAfter = res.headers.get("Retry-After") || "3";
        console.log(`NFT data still indexing, retrying in ${retryAfter}s... (${i + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, parseInt(retryAfter) * 1000));
        continue;
      }
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    }
    throw new Error("Timed out waiting for NFT data after " + maxRetries + " retries");
  }

  async function displayNFTPortfolio(address) {
    // 1. Portfolio overview
    const portfolio = await fetchWithRetry(
      `${BASE_URL}/wallets/${address}/nft-portfolio?currency=usd`
    );
    const byChain = portfolio.data.attributes.positions_distribution_by_chain;

    console.log("=== NFT VALUE BY CHAIN ===");
    for (const [chain, value] of Object.entries(byChain).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${chain}: $${value.toFixed(2)}`);
    }

    // 2. Collections
    const collections = await fetchWithRetry(
      `${BASE_URL}/wallets/${address}/nft-collections/?currency=usd&sort=-total_floor_price`
    );

    console.log("\n=== COLLECTIONS ===");
    for (const c of collections.data) {
      const { collection_info, nfts_count, total_floor_price } = c.attributes;
      console.log(`  ${collection_info.name}: ${nfts_count} NFT(s) - ${total_floor_price != null ? `$${total_floor_price.toFixed(2)}` : "N/A"}`);
    }

    // 3. Individual NFTs
    const positions = await fetchWithRetry(
      `${BASE_URL}/wallets/${address}/nft-positions/?currency=usd&sort=-floor_price`
    );

    console.log("\n=== INDIVIDUAL NFTs ===");
    for (const pos of positions.data) {
      const { nft_info, collection_info, value } = pos.attributes;
      console.log(`  ${nft_info?.name} (${collection_info?.name}) - ${value != null ? `$${value.toFixed(2)}` : "N/A"}`);
    }
  }

  displayNFTPortfolio("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
  ```
</Steps>

## Next steps

* Use [pagination](/pagination-and-filtering) to handle wallets with large NFT collections
* Include the `nft_collections` relationship in the `include` parameter to get full collection metadata in one request
* Combine with the [transactions endpoint](/api-reference/wallets/get-wallet-transactions) to track NFT purchase and sale history


# Swap tokens and bridge assets
Source: https://developers.zerion.io/recipes/swap-tokens

Get quotes and ready-to-sign transactions for same-chain swaps and cross-chain bridges across EVM chains and Solana with the Zerion API swap endpoints.

**What you'll build:**

* Get swap quotes from multiple liquidity sources in a single call
* Receive ready-to-sign approve and swap transactions - no separate quote/execute steps
* Bridge assets across chains (EVM ↔ EVM, EVM ↔ Solana)

```
Swap 0.05 ETH → DAI on Ethereum

  Quote 1 (Relay):
    Output:           128.45 DAI
    Min after slip:   125.88 DAI
    Net of fees:      $128.10
    ✅ Transaction ready to sign

  Quote 2 (LI.FI):
    Output:           128.12 DAI
    Min after slip:   125.56 DAI
    Net of fees:      $127.78
    ✅ Transaction ready to sign
```

**Time:** \~15 minutes

## Prerequisites

* A Zerion API key ([get one here](https://dashboard.zerion.io))
* A wallet address with tokens to swap

## How it works

Unlike most swap APIs that require separate quote and execute endpoints, the Zerion API combines both into a **single call**:

1. Call `GET /v1/swap/quotes/` with the sender, recipient, input asset, output asset, and amount
2. Receive multiple quotes - each includes the expected output, fees, and (when executable) ready-to-sign `transaction_approve` and `transaction_swap` payloads
3. Pick a quote and sign the transactions with your wallet

Quotes are returned best-first, sorted by the fiat value of `output_amount_after_fees`.

<Steps>
  ### Get swap quotes

  Use the [swap and bridge quotes](/api-reference/swap/get-swap-and-bridge-quotes) endpoint.

  <CodeGroup>
    ```javascript JavaScript theme={null}
    const API_KEY = process.env.ZERION_API_KEY;
    const headers = {
      accept: "application/json",
      authorization: `Basic ${btoa(API_KEY + ":")}`,
    };

    // Swap 0.05 ETH → DAI on Ethereum
    const wallet = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";
    const params = new URLSearchParams({
      from: wallet,
      to: wallet,
      "input[chain_id]": "ethereum",
      "input[fungible_id]": "eth",
      "input[amount]": "0.05", // human-readable decimal, not wei
      "output[fungible_id]": "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
    });

    const response = await fetch(
      `https://api.zerion.io/v1/swap/quotes/?${params}`,
      { headers }
    );
    const { data } = await response.json();

    for (const quote of data) {
      const {
        liquidity_source,
        output_amount,
        minimum_output_amount,
        output_amount_after_fees,
        network_fee,
        error,
      } = quote.attributes;
      console.log(`\nQuote from ${liquidity_source.name}:`);
      console.log(`  Output:         ${output_amount.quantity}`);
      console.log(`  Min after slip: ${minimum_output_amount.quantity}`);
      console.log(`  Net of fees:    ${output_amount_after_fees.value} ${output_amount_after_fees.currency ?? ""}`);
      console.log(`  Network fee:    ${network_fee?.amount?.value ?? "n/a"}`);
      if (error) console.log(`  ⚠️  ${error.code}: ${error.message ?? error.hint}`);
    }
    ```

    ```python Python theme={null}
    import os, requests

    api_key = os.environ["ZERION_API_KEY"]
    wallet = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"

    # Swap 0.05 ETH → DAI on Ethereum
    response = requests.get(
        "https://api.zerion.io/v1/swap/quotes/",
        params={
            "from": wallet,
            "to": wallet,
            "input[chain_id]": "ethereum",
            "input[fungible_id]": "eth",
            "input[amount]": "0.05",  # human-readable decimal, not wei
            "output[fungible_id]": "0x6B175474E89094C44Da98b954EedeAC495271d0F",  # DAI
        },
        auth=(api_key, ""),
    )

    for quote in response.json()["data"]:
        attrs = quote["attributes"]
        print(f"\nQuote from {attrs['liquidity_source']['name']}:")
        print(f"  Output:         {attrs['output_amount']['quantity']}")
        print(f"  Min after slip: {attrs['minimum_output_amount']['quantity']}")
        after_fees = attrs["output_amount_after_fees"]
        print(f"  Net of fees:    {after_fees.get('value')} {after_fees.get('currency', '')}")
        if "error" in attrs:
            err = attrs["error"]
            print(f"  Note: {err['code']} - {err.get('message') or err['hint']}")
    ```

    ```bash cURL theme={null}
    curl -g -u "YOUR_API_KEY:" \
      "https://api.zerion.io/v1/swap/quotes/?from=0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B&to=0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B&input[chain_id]=ethereum&input[fungible_id]=eth&input[amount]=0.05&output[fungible_id]=0x6B175474E89094C44Da98b954EedeAC495271d0F"
    ```
  </CodeGroup>

  Each quote includes:

  * `liquidity_source` - provider id, display name, and icon
  * `input_amount` / `output_amount` - what you're sending and the estimated amount you'll receive before slippage (`quantity` is the human-readable decimal; `value` / `usd_value` are fiat conversions when available)
  * `minimum_output_amount` - guaranteed output after slippage
  * `output_amount_after_fees` - net output once protocol, bridge, and network fees are subtracted; this is the field quotes are ranked by
  * `slippage_percent` - actual slippage applied (the `slippage_percent` query parameter when provided, otherwise auto-chosen)
  * `protocol_fee` / `bridge_fee` / `network_fee` - fee breakdown; each carries `amount` and an `included_in_rate` flag (whether already deducted from the rate)
  * `transaction_approve` - ERC-20 approve transaction to sign first. Absent when not needed (Solana, EVM native-asset input, or sufficient allowance already granted)
  * `transaction_swap` - swap transaction to sign. Absent when the quote is informational only (e.g. `error` is set)
  * `error` - present when the quote can't be executed as-is (e.g. `not_enough_input_asset_balance`)
  * `estimated_time_seconds` - typically present on bridge routes

  ### Pick a quote and check for errors

  Quotes are returned best-first. Before signing, check whether the chosen quote has an `error` and a `transaction_swap`.

  ```javascript theme={null}
  const quote = data[0]; // best by output_amount_after_fees
  const { error, transaction_approve, transaction_swap } = quote.attributes;

  if (error) {
    console.log(`Cannot execute: ${error.code} (hint: ${error.hint})`);
    process.exit(1);
  }
  if (!transaction_swap) {
    console.log("No transaction payload - informational quote only");
    process.exit(1);
  }
  ```

  <Note>
    `error.hint` is a machine-readable next step (`topup`, `increase_input_amount`, `unspecified`) you can surface in your UI to guide the user.
  </Note>

  ### Sign the approve transaction (if present)

  If `transaction_approve` is present, sign and confirm it before submitting the swap. It's a complete EVM transaction - no manual `approve(spender, amount)` call needed.

  ```javascript theme={null}
  import { ethers } from "ethers";

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  async function sendEVM(payload) {
    // EVM numeric fields are hex strings - ethers accepts them directly
    const tx = await signer.sendTransaction({
      type: parseInt(payload.type, 16),
      to: payload.to,
      data: payload.data,
      value: payload.value,
      gasLimit: payload.gas,
      nonce: parseInt(payload.nonce, 16),
      chainId: parseInt(payload.chain_id, 16),
      ...(payload.max_fee
        ? { maxFeePerGas: payload.max_fee, maxPriorityFeePerGas: payload.max_priority_fee }
        : { gasPrice: payload.gas_price }),
    });
    return tx.wait();
  }

  if (transaction_approve?.evm) {
    console.log("Sending approval...");
    await sendEVM(transaction_approve.evm);
    console.log("Approval confirmed");
  }
  ```

  <Note>
    `transaction_approve` is omitted for Solana, for EVM swaps where the input is the chain's native asset (ETH, MATIC, etc.), and when the wallet already has sufficient allowance.
  </Note>

  ### Sign and send the swap transaction

  ```javascript theme={null}
  const receipt = await sendEVM(transaction_swap.evm);
  console.log(`Confirmed in block ${receipt.blockNumber}`);
  ```

  For Solana quotes, `transaction_swap.solana.raw` is a base64-encoded raw transaction that you decode and sign with the Solana wallet of your choice (e.g. `@solana/web3.js`).

  ### Bridge assets across chains

  To bridge tokens between chains, set a different `output[chain_id]`. The `to` parameter is the recipient on the destination chain - set it to your wallet on that chain (use a base58 Solana address when bridging to Solana).

  ```bash theme={null}
  # Bridge 1 USDC from Ethereum to Polygon
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/swap/quotes/?from=YOUR_WALLET&to=YOUR_WALLET&input[chain_id]=ethereum&input[fungible_id]=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&input[amount]=1&output[chain_id]=polygon&output[fungible_id]=0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
  ```

  <Tip>
    Use the [List fungibles available for bridging](/api-reference/swap/list-fungibles-available-for-bridging) endpoint to discover which tokens can be bridged between two specific chains before requesting quotes.
  </Tip>
</Steps>

## Key parameters

| Parameter             | Description                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `from`                | Wallet performing the swap. Must match the chain type of `input[chain_id]` (EVM hex or Solana base58). Required.                                         |
| `to`                  | Recipient of the output asset. Must match the chain type of `output[chain_id]`. For a same-chain swap to the same wallet, set equal to `from`. Required. |
| `input[chain_id]`     | Source chain (e.g., `ethereum`, `polygon`, `solana`). Required.                                                                                          |
| `input[fungible_id]`  | Input asset's fungible ID - either a Zerion fungible ID (e.g., `eth`) or the token contract address. Required.                                           |
| `input[amount]`       | Human-readable input amount as a decimal string (e.g., `"0.05"`), not the smallest unit. Required.                                                       |
| `output[chain_id]`    | Destination chain. Defaults to `input[chain_id]` (same-chain swap).                                                                                      |
| `output[fungible_id]` | Output asset's fungible ID or token contract address. Required.                                                                                          |
| `slippage_percent`    | Maximum acceptable slippage in percent. Auto-chosen when omitted.                                                                                        |
| `currency`            | Currency for fiat values in the response (e.g., `usd`). Defaults to `usd`.                                                                               |


# Get a wallet's transaction history
Source: https://developers.zerion.io/recipes/transaction-history

Fetch and interpret a wallet's onchain transactions across chains with human-readable types, transfer details, and fee breakdowns using the Zerion API.

**What you'll build:**

* Fetch and display a wallet's transaction history with human-readable labels
* Filter transactions by type, chain, and date range
* Paginate through the full history

```
[2024-03-15T14:22:31+00:00] trade on ethereum
  via Uniswap
  -0.5 ETH ($1,060.00)
  +1200.0 USDC ($1,200.00)
  Fee: $12.45

[2024-03-14T09:10:05+00:00] receive on optimism
  +500.0 OP ($680.00)
  Fee: $0.02

[2024-03-13T18:45:12+00:00] deposit on ethereum
  via Aave
  -1000.0 USDC ($1,000.00)
  Fee: $8.33
```

**Time:** \~10 minutes

## Prerequisites

* A Zerion API key ([get one here](https://dashboard.zerion.io))
* A wallet address to query

## Steps

<Steps>
  ### Fetch recent transactions

  Use the [wallet transactions](/api-reference/wallets/get-wallet-transactions) endpoint to get a wallet's history.

  <CodeGroup>
    ```javascript JavaScript theme={null}
    const API_KEY = process.env.ZERION_API_KEY;
    const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
    const headers = {
      accept: "application/json",
      authorization: `Basic ${btoa(API_KEY + ":")}`,
    };

    const response = await fetch(
      `https://api.zerion.io/v1/wallets/${address}/transactions/?currency=usd&page[size]=10`,
      { headers }
    );
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const { data } = await response.json();

    for (const tx of data) {
      const { operation_type, mined_at, transfers, fee, application_metadata } =
        tx.attributes;
      const chain = tx.relationships.chain.data.id;

      console.log(`[${mined_at}] ${operation_type} on ${chain}`);
      if (application_metadata?.name) {
        console.log(`  via ${application_metadata.name}`);
      }
      for (const transfer of transfers) {
        const symbol = transfer.fungible_info?.symbol || "NFT";
        console.log(
          `  ${transfer.direction === "out" ? "-" : "+"}${transfer.quantity.float} ${symbol} (${transfer.value != null ? `$${transfer.value.toFixed(2)}` : "N/A"})`
        );
      }
      console.log(`  Fee: ${fee.value != null ? `$${fee.value.toFixed(2)}` : "N/A"}`);
    }
    ```

    ```python Python theme={null}
    import os, requests

    api_key = os.environ["ZERION_API_KEY"]
    address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

    response = requests.get(
        f"https://api.zerion.io/v1/wallets/{address}/transactions/",
        params={"currency": "usd", "page[size]": 10},
        auth=(api_key, ""),
    )

    for tx in response.json()["data"]:
        attrs = tx["attributes"]
        chain = tx["relationships"]["chain"]["data"]["id"]
        app = attrs.get("application_metadata", {})

        print(f"[{attrs['mined_at']}] {attrs['operation_type']} on {chain}")
        if app.get("name"):
            print(f"  via {app['name']}")
        for transfer in attrs["transfers"]:
            symbol = transfer.get("fungible_info", {}).get("symbol", "NFT")
            direction = "-" if transfer["direction"] == "out" else "+"
            val = transfer.get("value")
            print(f"  {direction}{transfer['quantity']['float']} {symbol} ({f'${val:.2f}' if val is not None else 'N/A'})")
        fee_val = attrs["fee"].get("value")
        print(f"  Fee: {f'${fee_val:.2f}' if fee_val is not None else 'N/A'}")
    ```

    ```bash cURL theme={null}
    curl -g -u "YOUR_API_KEY:" \
      "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/transactions/?currency=usd&page[size]=10"
    ```
  </CodeGroup>

  Each transaction includes:

  * `operation_type` - the high-level action (trade, send, receive, deposit, etc.)
  * `transfers[]` - individual token movements with direction (`in`/`out`/`self`)
  * `fee` - gas fee paid, with USD value
  * `application_metadata` - the DApp involved (e.g., "Uniswap", "Aave")

  ### Filter by operation type

  To show only specific transaction types, use `filter[operation_types]`.

  ```bash theme={null}
  # Show only trades (swaps)
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/transactions/?currency=usd&filter[operation_types]=trade"
  ```

  Available operation types:

  | Type       | Description                          |
  | ---------- | ------------------------------------ |
  | `send`     | Sent tokens to another address       |
  | `receive`  | Received tokens from another address |
  | `trade`    | Swapped tokens (e.g., on a DEX)      |
  | `deposit`  | Deposited into a DeFi protocol       |
  | `withdraw` | Withdrew from a DeFi protocol        |
  | `mint`     | Minted new tokens                    |
  | `burn`     | Burned tokens                        |
  | `approve`  | Approved token spending              |
  | `claim`    | Claimed rewards or airdrops          |
  | `execute`  | Generic smart contract interaction   |
  | `deploy`   | Deployed a smart contract            |

  ### Filter by chain and date range

  Narrow results to specific chains or time windows. The `filter[min_mined_at]` value is a **Unix timestamp in milliseconds**.

  ```bash theme={null}
  # Ethereum transactions since Feb 26, 2024 (1708905600000 ms)
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/transactions/?currency=usd&filter[chain_ids]=ethereum&filter[min_mined_at]=1708905600000"
  ```

  ### Paginate through full history

  Use `links.next` from each response to fetch the next page.

  <CodeGroup>
    ```javascript JavaScript theme={null}
    async function getFullHistory(address) {
      const allTxs = [];
      let url = `https://api.zerion.io/v1/wallets/${address}/transactions/?currency=usd&page[size]=100`;

      while (url) {
        const response = await fetch(url, {
          headers,
        });
        const result = await response.json();
        allTxs.push(...result.data);
        url = result.links.next || null;
      }

      return allTxs;
    }
    ```

    ```python Python theme={null}
    def get_full_history(address):
        all_txs = []
        url = f"https://api.zerion.io/v1/wallets/{address}/transactions/"
        params = {"currency": "usd", "page[size]": 100}

        while url:
            response = requests.get(url, params=params, auth=(api_key, ""))
            result = response.json()
            all_txs.extend(result["data"])
            url = result["links"].get("next")
            params = {}  # params are included in the next URL

        return all_txs
    ```
  </CodeGroup>

  ### Full working example

  Save as `tx-history.mjs` and run with `node tx-history.mjs`:

  ```javascript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const BASE_URL = "https://api.zerion.io/v1";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  async function getTransactions(address, { types, chains, limit } = {}) {
    const params = new URLSearchParams({ currency: "usd", "page[size]": limit || 20 });
    if (types) params.set("filter[operation_types]", types);
    if (chains) params.set("filter[chain_ids]", chains);

    const res = await fetch(
      `${BASE_URL}/wallets/${address}/transactions/?${params}`,
      { headers }
    );
    return res.json();
  }

  async function displayHistory(address) {
    const { data } = await getTransactions(address, { limit: 10 });

    for (const tx of data) {
      const { operation_type, mined_at, transfers, fee, application_metadata } = tx.attributes;
      const chain = tx.relationships.chain.data.id;

      console.log(`[${mined_at}] ${operation_type} on ${chain}`);
      if (application_metadata?.name) {
        console.log(`  via ${application_metadata.name}`);
      }
      for (const transfer of transfers) {
        const symbol = transfer.fungible_info?.symbol || "NFT";
        const dir = transfer.direction === "out" ? "-" : "+";
        console.log(`  ${dir}${transfer.quantity.float} ${symbol} (${transfer.value != null ? `$${transfer.value.toFixed(2)}` : "N/A"})`);
      }
      console.log(`  Fee: ${fee.value != null ? `$${fee.value.toFixed(2)}` : "N/A"}\n`);
    }
  }

  displayHistory("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
  ```
</Steps>

## Next steps

* Use `filter[asset_types]=nft` to show NFT transfers
* Combine with the [DApps endpoint](/api-reference/dapps/get-list-of-dapps) to enrich `application_metadata`
* Build real-time alerts using the [webhook recipe](/recipes/wallet-activity-alerts) instead of polling


# Set up wallet activity alerts
Source: https://developers.zerion.io/recipes/wallet-activity-alerts

Use Zerion API transaction subscriptions and webhooks to get real-time notifications when a watched wallet sends or receives tokens across supported chains.

**What you'll build:**

* Create a transaction subscription for one or more wallets
* Handle and parse incoming webhook payloads
* Verify webhook signatures for security
* Manage (list, update, delete) your subscriptions

**Time:** \~15 minutes

## Prerequisites

* A Zerion API key ([get one here](https://dashboard.zerion.io))
* A publicly accessible callback URL to receive webhook notifications (you can use [webhook.site](https://webhook.site) for testing)

<Note>
  For production use, contact [api@zerion.io](mailto:api@zerion.io) to whitelist your callback URL. See [Webhooks](/webhooks#subscription-limits) for plan limits and delivery guarantees.
</Note>

## Steps

<Steps>
  ### Create a subscription

  Subscribe to transactions for one or more wallet addresses using the [create subscription](/api-reference/subscriptions-to-transactions/create-subscription) endpoint.

  <CodeGroup>
    ```javascript JavaScript theme={null}
    const API_KEY = process.env.ZERION_API_KEY;

    const response = await fetch("https://api.zerion.io/v1/tx-subscriptions", {
      method: "POST",
      headers: {
        authorization: `Basic ${btoa(API_KEY + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        callback_url: "https://webhook.site/your-unique-id",
        addresses: ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"],
        chain_ids: ["ethereum", "optimism", "base"],
      }),
    });

    const { data } = await response.json();
    console.log("Subscription ID:", data.id);
    ```

    ```python Python theme={null}
    import os, requests

    api_key = os.environ["ZERION_API_KEY"]

    response = requests.post(
        "https://api.zerion.io/v1/tx-subscriptions",
        json={
            "callback_url": "https://webhook.site/your-unique-id",
            "addresses": ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"],
            "chain_ids": ["ethereum", "optimism", "base"],
        },
        auth=(api_key, ""),
    )

    data = response.json()["data"]
    print("Subscription ID:", data["id"])
    ```

    ```bash cURL theme={null}
    curl -u "YOUR_API_KEY:" \
      -X POST "https://api.zerion.io/v1/tx-subscriptions" \
      -H "Content-Type: application/json" \
      -d '{
        "callback_url": "https://webhook.site/your-unique-id",
        "addresses": [
          "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
        ],
        "chain_ids": ["ethereum", "optimism", "base"]
      }'
    ```
  </CodeGroup>

  * `chain_ids` is optional - omit it to subscribe to all supported chains
  * Save the subscription `id` from the response for management later

  ### Handle incoming webhooks

  When a transaction occurs, Zerion sends a POST request to your callback URL. Here's what the payload looks like and how to process it.

  ```javascript Express.js theme={null}
  const express = require("express");
  const crypto = require("crypto");
  const app = express();

  // Capture the exact raw body so signature verification uses the original bytes.
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf.toString("utf8");
      },
    })
  );

  // Cache fetched certificates to avoid re-downloading on every request
  const certCache = new Map();

  async function fetchCertificate(certUrl) {
    if (certCache.has(certUrl)) return certCache.get(certUrl);

    // Validate the certificate URL domain to prevent SSRF attacks
    const url = new URL(certUrl);
    if (!url.hostname.endsWith(".zerion.io")) {
      throw new Error(`Untrusted certificate domain: ${url.hostname}`);
    }

    const res = await fetch(certUrl);
    if (!res.ok) throw new Error(`Failed to fetch certificate: ${res.status}`);
    const pem = await res.text();
    certCache.set(certUrl, pem);
    return pem;
  }

  async function verifyWebhook(req) {
    const timestamp = req.headers["x-timestamp"];
    const signature = req.headers["x-signature"];
    const certUrl = req.headers["x-certificate-url"];

    const pem = await fetchCertificate(certUrl);
    const message = `${timestamp}\n${req.rawBody}\n`;

    const verifier = crypto.createVerify("SHA256");
    verifier.update(message);
    return verifier.verify(pem, signature, "base64");
  }

  app.post("/webhook", async (req, res) => {
    try {
      if (!(await verifyWebhook(req))) {
        return res.sendStatus(403);
      }

      const { data, included } = req.body;

      // data contains the notification metadata
      console.log("Notification ID:", data.id);
      console.log("Wallet:", data.attributes.address);
      console.log("Timestamp:", data.attributes.timestamp);

      // included contains the full transaction object(s)
      for (const tx of included) {
        const { operation_type, transfers, fee, mined_at } = tx.attributes;
        const chain = tx.relationships.chain.data.id;

        console.log(`${operation_type} on ${chain} at ${mined_at}`);
        for (const transfer of transfers) {
          const symbol = transfer.fungible_info?.symbol || "NFT";
          const direction = transfer.direction === "out" ? "Sent" : "Received";
          console.log(`  ${direction} ${transfer.quantity.float} ${symbol}`);
        }
      }

      res.sendStatus(200);
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.sendStatus(400);
    }
  });

  app.listen(3000);
  ```

  <Warning>
    Transaction prices in webhook notifications are always `null`. To get USD values, fetch the full transaction using the [wallet transactions](/api-reference/wallets/get-wallet-transactions) endpoint after receiving the notification:

    ```bash theme={null}
    curl -g -u "YOUR_API_KEY:" \
      "https://api.zerion.io/v1/wallets/0xADDRESS/transactions/?currency=usd&filter[hash]=TX_HASH"
    ```
  </Warning>

  ### Verify webhook signatures

  The Express handler above already includes full signature verification. The key points:

  * Each webhook includes three headers: `x-timestamp`, `x-signature`, and `x-certificate-url`
  * Build the signed message as `` `${timestamp}\n${rawBody}\n` `` - use the raw request body, not `JSON.stringify(req.body)`
  * Verify using `crypto.createVerify("SHA256")` with the certificate's public key
  * Cache fetched certificates to avoid re-downloading on every request

  <Warning>
    Always validate the `x-certificate-url` domain before fetching - ensure it points to a trusted Zerion domain to prevent SSRF attacks.
  </Warning>

  ### Manage your subscription

  List, update, or delete subscriptions as needed: [list subscriptions](/api-reference/subscriptions-to-transactions/find-subscriptions), [update wallets](/api-reference/subscriptions-to-transactions/patch-wallets-within-subscription), or [delete a subscription](/api-reference/subscriptions-to-transactions/delete-subscription-by-id).

  ```bash theme={null}
  # List all subscriptions
  curl -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/tx-subscriptions"

  # Add or remove wallets from a subscription
  curl -u "YOUR_API_KEY:" \
    -X PATCH "https://api.zerion.io/v1/tx-subscriptions/SUBSCRIPTION_ID/wallets" \
    -H "Content-Type: application/json" \
    -d '{
      "addresses": ["0xNEW_ADDRESS_TO_ADD"]
    }'

  # Delete a subscription
  curl -u "YOUR_API_KEY:" \
    -X DELETE "https://api.zerion.io/v1/tx-subscriptions/SUBSCRIPTION_ID"
  ```
</Steps>

## Important notes

See [Delivery guarantees](/webhooks#delivery-guarantees) and [Subscription limits](/webhooks#subscription-limits) on the Webhooks reference page.

## Next steps

* Combine with the [transaction history recipe](/recipes/transaction-history) to fetch full details (including prices) for flagged transactions
* Use `chain_ids` to focus on specific chains and reduce noise
* Build a notification service that forwards alerts to Slack, Discord, email, or push notifications


# Build a wallet PnL tracker
Source: https://developers.zerion.io/recipes/wallet-pnl-tracker

Track realized and unrealized gains, cost basis, ROI, and per-token performance for any wallet across EVM chains and Solana with the Zerion API PnL endpoints.

**What you'll build:**

* Fetch a wallet's total PnL (realized, unrealized, fees, external flows)
* Batch-query PnL for up to 100 tokens in one call, with per-token breakdowns
* Compare the same token's performance across different chains
* Use time-range filters for period-specific PnL
* Handle edge cases (503 bootstrap, airdrops)

```
=== PORTFOLIO SUMMARY ===
Realized Gain:     $1,245.67
Unrealized Gain:   $3,891.02
Net Invested:      $12,500.00
Fees:              $342.18
Received External: $500.00
Sent External:     $150.00

=== TOKEN BREAKDOWN ===
ETH
  Buy avg: $2450.85  ->  Sell avg: $3527.83
  Realized: $1076.98 (43.9%)
  Unrealized: $3214.50
  Invested: $7353.00  |  Fees: $245.12
UNI
  Buy avg: $6.42  ->  Sell avg: $8.15
  Realized: $168.69 (26.3%)
  Unrealized: $676.52
  Invested: $642.00  |  Fees: $84.56
```

**Time:** \~10 minutes

## Prerequisites

* A Zerion API key ([get one here](https://dashboard.zerion.io))
* Node.js 18+ (for native `fetch`) or any HTTP client

## How PnL is calculated

Zerion uses **FIFO** (First In, First Out) - earliest purchases are matched against earliest sales. This is the most common standard for tax reporting.

### Response fields

| Field               | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| `realized_gain`     | Profit/loss from sold tokens                                  |
| `unrealized_gain`   | Paper gains on tokens you still hold                          |
| `total_fee`         | Cumulative transaction fees paid                              |
| `net_invested`      | Total buys minus sale proceeds                                |
| `received_external` | Value of tokens received from external sources (transfers in) |
| `sent_external`     | Value of tokens sent externally (transfers out)               |
| `sent_for_nfts`     | Value spent purchasing NFTs                                   |
| `received_for_nfts` | Value received from selling NFTs                              |

When you add token filters (`fungible_ids` or `fungible_implementations`), the response also includes a `breakdown` object with per-token stats like `average_buy_price`, `average_sell_price`, and gain percentages.

<Note>
  The resource type in the response is `wallet_pnl` (not `pnl`).
</Note>

## Steps

<Steps>
  ### Portfolio-level PnL

  Fetch overall PnL for a wallet across all tokens and chains.

  [`GET /v1/wallets/{address}/pnl`](/api-reference/wallets/get-wallet-pnl)`?currency=usd`

  ```javascript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const BASE_URL = "https://api.zerion.io/v1";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  async function getPortfolioPnL(address, currency = "usd") {
    const response = await fetch(
      `${BASE_URL}/wallets/${address}/pnl?currency=${currency}`,
      { headers }
    );
    const { data } = await response.json();
    return data.attributes;
  }

  const pnl = await getPortfolioPnL("0x42b9df65b219b3dd36ff330a4dd8f327a6ada990");
  console.log(`Realized Gain:     $${pnl.realized_gain.toFixed(2)}`);
  console.log(`Unrealized Gain:   $${pnl.unrealized_gain.toFixed(2)}`);
  console.log(`Net Invested:      $${pnl.net_invested.toFixed(2)}`);
  console.log(`Total Fees:        $${pnl.total_fee.toFixed(2)}`);
  console.log(`Received External: $${pnl.received_external.toFixed(2)}`);
  console.log(`Sent External:     $${pnl.sent_external.toFixed(2)}`);
  ```

  ### Batch PnL for specific tokens

  Pass up to **100 tokens** in a single request to get a per-token breakdown. There are two filtering modes:

  | Filter                     | Use case                                                      | Format                          | Breakdown key                 |
  | -------------------------- | ------------------------------------------------------------- | ------------------------------- | ----------------------------- |
  | `fungible_ids`             | Cross-chain aggregate - PnL for a token across **all** chains | Zerion token ID (`eth`, `usdc`) | `breakdown.by_id`             |
  | `fungible_implementations` | Chain-specific - PnL for a token on a **specific** chain      | `chain:contract_address` pair   | `breakdown.by_implementation` |

  **Option A: `fungible_ids` (cross-chain)**

  Aggregates PnL for a token across all chains. Best for portfolio-level token views where you don't care which chain the activity happened on.

  ```javascript theme={null}
  const params = new URLSearchParams({
    currency: "usd",
    "filter[fungible_ids]": "eth,uni,wbtc",
  });

  const response = await fetch(
    `${BASE_URL}/wallets/${address}/pnl?${params}`,
    { headers }
  );
  const { data } = await response.json();
  const breakdown = data.attributes.breakdown?.by_id;

  for (const [tokenId, stats] of Object.entries(breakdown)) {
    console.log(`${tokenId}: $${stats.total_gain?.toFixed(2)} gain (${stats.relative_total_gain_percentage?.toFixed(1)}%)`);
  }
  ```

  **Example response (`breakdown.by_id`):**

  ```json theme={null}
  {
    "breakdown": {
      "by_id": {
        "eth": {
          "average_buy_price": 3450.85,
          "average_sell_price": 3527.83,
          "realized_gain": -5.48,
          "unrealized_gain": -1.97,
          "total_fee": 1.88,
          "net_invested": 38.24,
          "received_external": 52.18,
          "sent_external": 0.13,
          "sent_for_nfts": 5.00,
          "received_for_nfts": 0
        }
      }
    }
  }
  ```

  <Warning>
    When you filter by token, the top-level fields (`realized_gain`, `net_invested`, etc.) reflect **only the filtered tokens**, not your entire wallet.
  </Warning>

  **Option B: `fungible_implementations` (chain-specific)**

  Tracks PnL per chain deployment. Use `chain:contract_address` pairs. Best for comparing the same token across L1s and L2s, or when you need chain-level precision.

  ```javascript theme={null}
  const params = new URLSearchParams({
    currency: "usd",
    "filter[fungible_implementations]": [
      "ethereum:",                                             // ETH on Ethereum (native asset)
      "base:",                                                 // ETH on Base (native asset)
      "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",  // USDC on Ethereum
      "base:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",      // USDC on Base
    ].join(","),
  });

  const response = await fetch(
    `${BASE_URL}/wallets/${address}/pnl?${params}`,
    { headers }
  );
  const { data } = await response.json();
  const breakdown = data.attributes.breakdown?.by_implementation;

  for (const [impl, stats] of Object.entries(breakdown)) {
    const [chain, addr] = impl.split(":");
    const label = addr ? `${chain}:${addr.slice(0, 10)}…` : `${chain} (native)`;
    console.log(`${label}: gain $${stats.realized_gain?.toFixed(2)}, unrealized $${stats.unrealized_gain?.toFixed(2)}`);
  }
  ```

  <Note>
    Native chain tokens use `chain:` with an empty address after the colon: `ethereum:` for ETH, `base:` for Base ETH, `polygon:` for MATIC, `solana:` for SOL.
  </Note>

  **Per-token breakdown fields:**

  Each entry in the breakdown object (whether `by_id` or `by_implementation`) contains:

  | Field                                 | Description                                   |
  | ------------------------------------- | --------------------------------------------- |
  | `average_buy_price`                   | Weighted average purchase price               |
  | `average_sell_price`                  | Weighted average sale price                   |
  | `realized_gain`                       | Profit/loss from closed positions             |
  | `unrealized_gain`                     | Paper gain on current holdings                |
  | `relative_total_gain_percentage`      | Total gain as % of invested                   |
  | `relative_realized_gain_percentage`   | Realized gain as % of cost basis              |
  | `relative_unrealized_gain_percentage` | Unrealized gain as % of current holdings cost |
  | `total_invested`                      | Sum of buys for this token                    |
  | `net_invested`                        | Buys minus sells                              |
  | `total_fee`                           | Fees paid on this token's transactions        |
  | `received_external`                   | Value received from external transfers        |
  | `sent_external`                       | Value sent externally                         |
  | `sent_for_nfts`                       | Value spent on NFTs (for this token)          |
  | `received_for_nfts`                   | Value received from NFT sales                 |

  ### Time-range PnL

  Scope PnL calculations to a specific time window using the `since` and `till` parameters. Values are **Unix timestamps in milliseconds**.

  ```javascript theme={null}
  // PnL for calendar year 2025
  const since = new Date("2025-01-01T00:00:00Z").getTime(); // 1735689600000
  const till = new Date("2026-01-01T00:00:00Z").getTime();  // 1767225600000

  const params = new URLSearchParams({
    currency: "usd",
    since: since.toString(),
    till: till.toString(),
  });

  const response = await fetch(
    `${BASE_URL}/wallets/${address}/pnl?${params}`,
    { headers }
  );
  ```

  ```bash theme={null}
  # PnL for calendar year 2025 (annual recap)
  curl -u YOUR_API_KEY: \
    -H "accept: application/json" \
    "https://api.zerion.io/v1/wallets/{address}/pnl?currency=usd&since=1735689600000&till=1767225600000"
  ```

  Standard time ranges (1 day, 1 week, 1 month, 1 year, and annual recap from the beginning of the current year) benefit from pre-computed snapshots and return in **under 200 ms at p99**. Custom ranges may take longer depending on wallet history size.

  You can combine `since`/`till` with token filters.

  <Warning>
    Unrealized gains are always calculated using **current market prices**, regardless of the `till` parameter. If you set `till` to a past date, realized gains reflect that period, but unrealized gains use today's prices.
  </Warning>

  ### Filter by chain

  Scope PnL to specific chains using `filter[chain_ids]`.

  [`GET /v1/wallets/{address}/pnl`](/api-reference/wallets/get-wallet-pnl)`?currency=usd&filter[chain_ids]=ethereum,base`

  ```bash theme={null}
  curl -g -u "YOUR_API_KEY:" \
    "https://api.zerion.io/v1/wallets/0x42b9df65b219b3dd36ff330a4dd8f327a6ada990/pnl?currency=usd&filter[chain_ids]=ethereum,base"
  ```

  Useful when your app is chain-specific (e.g., a Base-only wallet) or you want to compare PnL across different L2s.

  <Note>
    `filter[chain_ids]` is ignored when you use `fungible_implementations` - the chain is already embedded in each implementation string.
  </Note>

  ### Full working example

  Save as `pnl-dashboard.mjs` and run with `node pnl-dashboard.mjs`:

  ```javascript theme={null}
  const API_KEY = process.env.ZERION_API_KEY;
  const BASE_URL = "https://api.zerion.io/v1";
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(API_KEY + ":")}`,
  };

  async function fetchPnL(address, params = {}, retries = 3) {
    const query = new URLSearchParams({ currency: "usd", ...params });
    const res = await fetch(`${BASE_URL}/wallets/${address}/pnl?${query}`, { headers });

    // Handle bootstrap: new/cold wallets may return 503 with Retry-After
    if (res.status === 503) {
      if (retries <= 0) throw new Error("Wallet PnL bootstrap timed out after retries");
      const retryAfter = res.headers.get("Retry-After") || "5";
      console.log(`Wallet bootstrapping... retrying in ${retryAfter}s (${retries} retries left)`);
      await new Promise((r) => setTimeout(r, parseInt(retryAfter) * 1000));
      return fetchPnL(address, params, retries - 1);
    }

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  async function buildDashboard(address, tokenIds) {
    // 1. Portfolio-level PnL
    const overall = await fetchPnL(address);
    const pnl = overall.data.attributes;

    console.log("=== PORTFOLIO SUMMARY ===");
    console.log(`Realized Gain:     $${pnl.realized_gain.toFixed(2)}`);
    console.log(`Unrealized Gain:   $${pnl.unrealized_gain.toFixed(2)}`);
    console.log(`Net Invested:      $${pnl.net_invested.toFixed(2)}`);
    console.log(`Fees:              $${pnl.total_fee.toFixed(2)}`);
    console.log(`Received External: $${pnl.received_external.toFixed(2)}`);
    console.log(`Sent External:     $${pnl.sent_external.toFixed(2)}`);

    // 2. Per-token breakdown
    if (tokenIds?.length) {
      const batch = await fetchPnL(address, {
        "filter[fungible_ids]": tokenIds.join(","),
      });
      const breakdown = batch.data.attributes.breakdown?.by_id || {};

      console.log("\n=== TOKEN BREAKDOWN ===");
      for (const [id, s] of Object.entries(breakdown)) {
        console.log(`${id.toUpperCase()}`);
        console.log(`  Buy avg: $${s.average_buy_price?.toFixed(2)}  ->  Sell avg: $${s.average_sell_price?.toFixed(2)}`);
        console.log(`  Realized: $${s.realized_gain?.toFixed(2)} (${s.relative_realized_gain_percentage?.toFixed(1)}%)`);
        console.log(`  Unrealized: $${s.unrealized_gain?.toFixed(2)}`);
        console.log(`  Invested: $${s.total_invested?.toFixed(2)}  |  Fees: $${s.total_fee?.toFixed(2)}`);
      }
    }
  }

  buildDashboard("0x42b9df65b219b3dd36ff330a4dd8f327a6ada990", [
    "eth", "uni", "wbtc",
  ]);
  ```
</Steps>

## Edge cases & operational notes

<AccordionGroup>
  <Accordion title="503 + Retry-After (cold wallets)">
    For wallets that haven't been queried before, or wallets with long transaction histories, the first request may return a `503` with a `Retry-After` header while PnL is being bootstrapped. This is non-billable. Retry after the indicated delay (usually a few seconds). Once bootstrapped, subsequent requests are fast (under 200 ms for basic PnL queries without a breakdown; building a breakdown adds 150–300 ms depending on the number of tokens). Snapshots are retained for \~1 month; after that, a re-bootstrap may be triggered.

    A `503` always carries a `Retry-After` header. If you get an error without one, retrying is not the answer. See the next two entries.
  </Accordion>

  <Accordion title="422 (wallets too large to calculate)">
    Wallets with more than 1 million actions are too large for PnL to be calculated, and return `422` with no `Retry-After` header:

    ```json theme={null}
    {
      "errors": [
        {
          "title": "This request is not supported",
          "detail": "This request cannot be processed, and retrying will not help. Please contact support if you need it enabled."
        }
      ]
    }
    ```

    Don't fold this into your `503` retry loop. The helper above only recurses on `503`, so a `422` surfaces to the caller instead. Don't cache it against the address either: the same wallet can return `503` again later if its cached state is rebuilt.
  </Accordion>

  <Accordion title="400 (addresses Zerion doesn't track)">
    PnL is only calculated for addresses that behave like user wallets. Contract addresses that aren't recognized smart-contract wallets, burn addresses, and high-volume addresses such as exchange hot wallets are rejected before any work is done:

    ```json theme={null}
    {
      "errors": [
        {
          "title": "Malformed parameter was sent",
          "detail": "address 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 is not trackable"
        }
      ]
    }
    ```

    Smart-contract wallets are fine: Safe, Coinbase Smart Wallet and ERC-4337 accounts all work. See [Error handling](/error-handling) for the full rule.
  </Accordion>

  <Accordion title="Excluded tokens">
    Tokens without reliable price data are omitted from breakdown calculations rather than erroring. They simply won't appear in the `breakdown` object.
  </Accordion>

  <Accordion title="Airdrop cost basis">
    Tokens received as "pure mints" (from the zero address or a token contract with no payment beyond gas) are assigned zero cost basis. However, many airdrops are actually distributed from a non-zero address, which causes them to be misclassified as purchases at the market price at the time of receipt. Keep this in mind when reviewing cost basis data for airdropped tokens.
  </Accordion>

  <Accordion title="Base asset format">
    Native chain tokens use `chain:` with an empty address after the colon: `ethereum:` for ETH, `base:` for Base ETH, `polygon:` for MATIC, `solana:` for SOL.
  </Accordion>

  <Accordion title="Supported currencies">
    16 options via the `currency` param: `usd`, `eur`, `gbp`, `btc`, `eth`, `krw`, `jpy`, `aud`, `cad`, `inr`, `nzd`, `try`, `zar`, `cny`, `chf`, `rub`.
  </Accordion>

  <Accordion title="Batch limits">
    Max 100 tokens per request for either `fungible_ids` or `fungible_implementations`. For larger portfolios, paginate with multiple calls.
  </Accordion>
</AccordionGroup>

## Next steps

* Combine with [wallet positions](/recipes/multi-chain-portfolio) to fetch current holdings, then batch those token IDs into PnL for a complete dashboard
* Add [balance charts](/recipes/multi-chain-portfolio) to visualize portfolio value over time alongside PnL
* Set up [webhooks](/recipes/wallet-activity-alerts) to trigger PnL recalculations when new transactions land


# Real-world asset (RWA) classification
Source: https://developers.zerion.io/rwa-classification

Identify tokenized stocks, treasuries, commodities, and stablecoins with Zerion's rwa_class attribute on the fungibles API endpoints.

Tokenized real-world assets look like any other token on-chain: nothing in a contract tells you it represents a share of Apple stock, a T-bill, or a gram of gold. If your product has to treat regulated instruments differently, you end up maintaining address lists by hand and hoping you catch new listings.

Zerion classifies these assets for you, so you can recognize a tokenized asset and what kind it is directly from the API response.

<Note>
  RWA classification is a paid add-on, enabled per organization. It is not part of the self-serve plans, and without it `rwa_class` is absent from responses. See [Access](#access) below.
</Note>

## What gets classified

Fungibles carry an optional `rwa_class` attribute naming the kind of real-world value the asset represents:

| Value                 | Covers                                                        |
| --------------------- | ------------------------------------------------------------- |
| `tokenized_stock`     | Tokenized equities, including tokenized ETFs                  |
| `tokenized_treasury`  | Tokenized treasury and government-debt products               |
| `commodity`           | Tokenized commodities (e.g. gold)                             |
| `stablecoin`          | Fiat-pegged stablecoins                                       |
| `other_financial`     | Other financial instruments: funds, bonds, private credit     |
| `other_non_financial` | Non-financial RWAs: real estate, carbon credits, collectibles |
| `unknown`             | A likely RWA, with the specific class still pending           |

The attribute is returned on the fungibles endpoints:

* `GET /v1/fungibles/`
* `GET /v1/fungibles/{fungible_id}`
* `GET /v1/fungibles/by-implementation?implementation={chain}:{address}`

```json theme={null}
{
  "type": "fungibles",
  "id": "7c07212f-12ae-49ef-b891-4b3df86aeefe",
  "attributes": {
    "name": "PAX Gold",
    "symbol": "PAXG",
    "rwa_class": "commodity"
  }
}
```

## Reading the field

Two behaviors matter if you build product logic on this attribute:

* **Absence is not a negative signal:** the attribute is omitted when an asset is unclassified or its classification has been cleared. It does not assert that the asset is not an RWA. Treat a missing `rwa_class` as "no information".
* **`unknown` is a positive classification:** the asset was identified as a likely RWA with the specific class still pending. It is meaningfully different from the attribute being absent. Whether to block, flag, or simply label those assets depends on what you are building.

## How assets are classified

Classification is issuer-driven rather than heuristic. Zerion tracks known real-world-asset issuers and the contracts they deploy, so an asset from a recognized issuer carries the same classification on every chain it appears on. Classifications set manually by Zerion's asset team always take precedence over an inferred one.

Coverage is strongest on the major issuers, which account for the large majority of tokenized-asset value, and expands as new issuers are onboarded. It is not exhaustive across the long tail of small tokenized assets.

## What teams use it for

* **Product gating:** restrict or hide regulated instruments for users in jurisdictions where you are not licensed to offer them.
* **Swap and trading guardrails:** block quotes or routing on tokenized securities while leaving the rest of the token universe untouched.
* **Portfolio breakdowns:** group holdings into stocks, treasuries, commodities, and stablecoins in your UI or reporting.
* **RWA discovery:** surface tokenized-asset markets as a distinct category for users.

## Access

RWA classification is a paid add-on to the Zerion API, enabled per organization. Until it's enabled, `rwa_class` is absent from your responses.

To request access, log in to the [dashboard](https://dashboard.zerion.io) and message us through the support widget, or email us at [api@zerion.io](mailto:api@zerion.io). If you already have a shared Slack or Telegram channel with us, reach out there.


# Spam token filtering
Source: https://developers.zerion.io/spam-filtering

How Zerion detects and filters spam and scam tokens across wallet positions, transactions, and NFTs, and how to opt in or out of trust filtering per request.

Zerion's API includes a built-in spam detection system that flags low-quality or deceptive assets. Each asset and transaction includes an `is_trash` boolean in the response, which you can use to filter out spam without building your own detection logic.

How `is_trash` is determined depends on the data type: for positions, it's a per-asset classification that applies the same way for every wallet. For transactions, it's computed dynamically based on the querying wallet's history - the same transaction can be spam for one wallet and not for another.

## How it works

### Positions: per-asset classification

For positions, `is_trash` is a property of the asset itself. The same token is classified the same way for every wallet. The classification is based on multiple signals:

* **Heuristics** - Analysis of on-chain behaviors including mass airdrops, impersonation of popular assets (e.g., mimicking name/symbol), and suspicious transfer patterns.
* **External intelligence** - Multiple third-party data providers to assess token quality.
* **Community feedback** - Users and partners can report false positives or unflagged spam for review.
* **Internal rules** - Proprietary logic applied across the system to ensure consistent filtering across APIs and frontend views.

```json theme={null}
{
  "type": "positions",
  "attributes": {
    "fungible_info": {
      "name": "Fake USDC",
      "symbol": "USDC"
    },
    "is_trash": true,
    "quantity": { "float": 1000.0 }
  }
}
```

### Transactions: context-aware classification

For transactions, `is_trash` is computed dynamically per request based on the querying wallet's history. The same transaction can be `is_trash: true` for one wallet and `is_trash: false` for another. The evaluation runs through multiple layers:

1. **User-initiated check** - If the wallet owner sent the transaction themselves, it's never flagged as spam.
2. **Interaction history** - Even if a transaction looks spammy (e.g., a low-value airdrop of an unverified asset), it's overridden to non-spam if the wallet has previously interacted with that asset.
3. **Address poisoning detection** - Incoming transfers are checked against the wallet's known legitimate recipients. If the sender address visually resembles a real address the user has sent to (matching first and last few characters), it's flagged as a poisoning attempt - a scam where attackers send tiny transfers from look-alike addresses to trick users into copying the wrong recipient.
4. **Rule-based checks** - Spam scores, mass transfer detection, blacklisted contracts, and spam NFT mint patterns.

<Info>
  Because transaction spam classification depends on the querying wallet's context, the same airdrop transaction might be hidden for a wallet that has never interacted with the token, but visible for a wallet that has traded it before.
</Info>

### NFT collections

Spam NFT collections are filtered out by default - no spam collections are returned in API responses. Unlike fungible positions, there is no `filter[trash]` toggle for NFT collections.

## Using the `filter[trash]` parameter

The `filter[trash]` parameter controls spam filtering on supported endpoints:

| Value            | Behavior                                 |
| ---------------- | ---------------------------------------- |
| `only_non_trash` | Only return non-spam assets (hides spam) |
| `only_trash`     | Only return spam assets                  |
| `no_filter`      | Return everything, spam included         |

### Default behavior

<Note>
  Defaults differ by endpoint:

  * **Positions**: defaults to `only_non_trash` (spam hidden)
  * **Transactions**: defaults to `no_filter` (spam included) - because transaction spam is context-aware, returning everything by default lets you apply your own filtering logic on top
</Note>

### Examples

```bash theme={null}
# Get positions with spam hidden (default)
curl -g -u "YOUR_API_KEY:" \
  "https://api.zerion.io/v1/wallets/0xd8dA.../positions/?filter[trash]=only_non_trash"

# Get only spam tokens
curl -g -u "YOUR_API_KEY:" \
  "https://api.zerion.io/v1/wallets/0xd8dA.../positions/?filter[trash]=only_trash"

# Get everything including spam
curl -g -u "YOUR_API_KEY:" \
  "https://api.zerion.io/v1/wallets/0xd8dA.../positions/?filter[trash]=no_filter"
```

## Reporting misclassifications

If you notice an asset that's incorrectly flagged or missing a flag, report it by clicking **Support** in the [Zerion dashboard](https://dashboard.zerion.io).


# Kafka streaming for onchain events
Source: https://developers.zerion.io/streaming

Subscribe to real-time onchain event streams from the Zerion API over Kafka for high-throughput data pipelines, indexers, and internal analytics workloads.

Zerion Streams delivers interpreted onchain events as a continuous Kafka feed, so you ingest data as it happens instead of polling. It's built for teams moving high volumes of trade and price data into their own pipelines for indexing, analytics, token discovery, and real-time monitoring.

<Note>
  Streaming is an Enterprise offering, provisioned per customer. It isn't self-serve: connection details, topics, and schemas are shared during onboarding.
</Note>

## REST vs webhooks vs streams

Zerion offers three ways to get data, each suited to a different access pattern:

|              | Best for                                                          | Shape                                                       |
| ------------ | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| **REST**     | On-demand queries for wallets, portfolios, and history            | Request/response, in reaction to a user action              |
| **Webhooks** | Per-address, user-facing real-time updates                        | Push notifications for specific watched addresses           |
| **Streams**  | Indexing, discovery, analytics, and monitoring at high throughput | A continuous feed of events across chains into your backend |

If you only need updates for a known set of wallets, [Webhooks](/webhooks) are simpler. Streams are for ingesting the full firehose of activity across chains into your own backend.

## What's available

* **EVM trade actions** across [supported EVM chains](/supported-blockchains)
* **Solana trade actions**
* **Token price events**

Streams carry the same interpreted, bot-filtered data that powers our transactions and webhooks products, not raw RPC logs.

## How it works

Zerion runs a managed Apache Kafka cluster on AWS with protobuf-encoded messages. Consumers connect from their own AWS account over private networking with IAM authentication, so data never traverses the public internet. Onboarding, access provisioning, and topic and schema details are handled by our team.

## Who it's for

Enterprise teams running high-throughput ingestion (indexers, token discovery, analytics, and real-time monitoring), typically already operating on AWS.

## Access

Streaming is provisioned per customer as part of an Enterprise plan. To request access, log in to the [dashboard](https://dashboard.zerion.io) and message us through the support widget, email us at [api@zerion.io](mailto:api@zerion.io), or reach out in your shared Slack or Telegram channel if you already have one with us.


# Supported blockchains and chain IDs for the Zerion API
Source: https://developers.zerion.io/supported-blockchains

Reference list of mainnet and testnet blockchains supported by the Zerion API, with chain IDs and coverage for tokens, transactions, and NFTs.

## Mainnets

Use the chain ID in filter parameters such as `filter[chain_ids]`.

<div>
  | Chain         | Chain ID              | Tokens | Txns | DeFi | NFTs |
  | ------------- | --------------------- | :----: | :--: | :--: | :--: |
  | 0G            | `0g`                  |    ✅   |   ✅  |   -  |   -  |
  | Abstract      | `abstract`            |    ✅   |   ✅  |   -  |   ✅  |
  | Apechain      | `ape`                 |    ✅   |   ✅  |   -  |   ✅  |
  | Arbitrum      | `arbitrum`            |    ✅   |   ✅  |   ✅  |   ✅  |
  | Aurora        | `aurora`              |    ✅   |   ✅  |   -  |   -  |
  | Avalanche     | `avalanche`           |    ✅   |   ✅  |   ✅  |   ✅  |
  | Base          | `base`                |    ✅   |   ✅  |   ✅  |   ✅  |
  | Berachain     | `berachain`           |    ✅   |   ✅  |   ✅  |   -  |
  | Blast         | `blast`               |    ✅   |   ✅  |   ✅  |   ✅  |
  | BNB Chain     | `binance-smart-chain` |    ✅   |   ✅  |   ✅  |   ✅  |
  | Celo          | `celo`                |    ✅   |   ✅  |   ✅  |   ✅  |
  | Ethereum      | `ethereum`            |    ✅   |   ✅  |   ✅  |   ✅  |
  | Fantom        | `fantom`              |    ✅   |   ✅  |   ✅  |   ✅  |
  | Gnosis        | `xdai`                |    ✅   |   ✅  |   ✅  |   ✅  |
  | Gravity       | `gravity-alpha`       |    ✅   |   ✅  |   -  |   -  |
  | HyperEVM      | `hyperevm`            |    ✅   |   ✅  |   ✅  |   -  |
  | Ink           | `ink`                 |    ✅   |   ✅  |  🔜  |   ✅  |
  | Katana        | `katana`              |    ✅   |   ✅  |   ✅  |   -  |
  | Lens Chain    | `lens`                |    ✅   |   ✅  |   -  |   ✅  |
  | Linea         | `linea`               |    ✅   |   ✅  |   ✅  |   ✅  |
  | Mantle        | `mantle`              |    ✅   |   ✅  |   ✅  |   ✅  |
  | MegaETH       | `megaeth`             |    ✅   |   ✅  |   ✅  |   -  |
  | Monad         | `monad`               |    ✅   |   ✅  |   ✅  |   ✅  |
  | Optimism      | `optimism`            |    ✅   |   ✅  |   ✅  |   ✅  |
  | Plasma        | `plasma`              |    ✅   |   ✅  |   -  |   -  |
  | Polygon       | `polygon`             |    ✅   |   ✅  |   ✅  |   ✅  |
  | Polygon zkEVM | `polygon-zkevm`       |    ✅   |   ✅  |   ✅  |   ✅  |
  | Robinhood     | `robinhood`           |    ✅   |   ✅  |   -  |   -  |
  | Scroll        | `scroll`              |    ✅   |   ✅  |   ✅  |   ✅  |
  | Solana        | `solana`              |    ✅   |   ✅  |  🔜  |  🔜  |
  | Somnia        | `somnia`              |    ✅   |   ✅  |  🔜  |  🔜  |
  | Soneium       | `soneium`             |    ✅   |   ✅  |   ✅  |   ✅  |
  | Sonic         | `sonic`               |    ✅   |   ✅  |   -  |   -  |
  | Tempo         | `tempo`               |    ✅   |   ✅  |   -  |   -  |
  | Unichain      | `unichain`            |    ✅   |   ✅  |   ✅  |   ✅  |
  | World         | `world`               |    ✅   |   ✅  |   ✅  |   ✅  |
  | zkSync Era    | `zksync-era`          |    ✅   |   ✅  |   ✅  |   ✅  |
  | Zora          | `zora`                |    ✅   |   ✅  |   -  |   ✅  |
</div>

✅ Supported · 🔜 Coming soon · - Not available

## Testnets

Testnet data is served from a separate environment. Pass the `X-Env: testnet` header with your request to query these chains.

| Chain            | Chain ID            |
| ---------------- | ------------------- |
| Base Sepolia     | `base-sepolia-test` |
| Ethereum Sepolia | `ethereum-sepolia`  |
| Monad Testnet    | `monad-test-v2`     |
| Unichain Sepolia | `unichain-sepolia`  |


# Webhooks for real-time wallet transaction notifications
Source: https://developers.zerion.io/webhooks

Subscribe to wallet activity and receive real-time webhook callbacks the moment a watched wallet sends or receives a transaction on EVM chains or Solana.

Zerion webhooks push transaction data to your server the moment activity is detected on a watched wallet, with no polling required. You create a **subscription**, add wallet addresses, and Zerion sends a POST request to your callback URL for every new transaction.

<Info>
  Webhooks are part of the [Subscriptions to Transactions](/api-reference/subscriptions-to-transactions/create-subscription) API. This page explains how the system works. For a hands-on walkthrough, see the [Wallet Activity Alerts](/recipes/wallet-activity-alerts) recipe.
</Info>

## How it works

<Steps>
  <Step title="Create a subscription">
    Call [Create Subscription](/api-reference/subscriptions-to-transactions/create-subscription) with a `callback_url` and a list of wallet `addresses`. Optionally filter by `chain_ids` to limit which chains you monitor.
  </Step>

  <Step title="Zerion monitors the wallets">
    Zerion watches all specified wallets across the selected chains (or all supported chains if none are specified).
  </Step>

  <Step title="Your server receives notifications">
    When a watched wallet sends or receives a transaction, Zerion sends a POST request to your callback URL with the full transaction payload.
  </Step>
</Steps>

## Payload format

Every webhook notification is a POST request with a JSON body following the [JSON:API](https://jsonapi.org/) structure. The top-level `data` object describes the notification, while the `included` array contains the full transaction details.

```json theme={null}
{
  "data": {
    "id": "notification-id",
    "type": "callback",
    "attributes": {
      "timestamp": "2024-07-31T00:17:36Z",
      "callback_url": "https://example.com/callback",
      "address": "0x42b9df65b219b3dd36ff330a4dd8f327a6ada990"
    },
    "relationships": {
      "subscription": {
        "type": "tx-subscriptions",
        "id": "87db77a6-17eb-4ca8-af0e-e43cbe9c83c6"
      }
    }
  },
  "included": [
    {
      "type": "transactions",
      "id": "52d994a173d755e99845e861d534a419",
      "attributes": {
        "operation_type": "send",
        "hash": "0xabc123...",
        "mined_at": "2024-07-31T00:17:35Z",
        "mined_at_block": 7490818,
        "sent_from": "0x42b9df65b219b3dd36ff330a4dd8f327a6ada990",
        "sent_to": "0x1234567890abcdef1234567890abcdef12345678",
        "status": "confirmed",
        "nonce": 250,
        "fee": {
          "fungible_info": { "symbol": "ETH", "name": "Ethereum" },
          "quantity": { "float": 0.00042, "int": "420000000000000", "decimals": 18 }
        },
        "transfers": [
          {
            "direction": "out",
            "quantity": { "float": 0.5, "int": "500000000000000000", "decimals": 18 },
            "fungible_info": { "symbol": "ETH", "name": "Ethereum" }
          }
        ],
        "approvals": [],
        "flags": { "is_trash": false }
      },
      "relationships": {
        "chain": { "type": "chains", "id": "ethereum" },
        "dapp": { "type": "dapps", "id": "" }
      }
    }
  ]
}
```

### Key fields

| Field                                        | Description                                                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `data.attributes.address`                    | The watched wallet that triggered this notification                                                                                        |
| `data.relationships.subscription.id`         | The subscription this notification belongs to                                                                                              |
| `included[].attributes.operation_type`       | Transaction type: `send`, `receive`, `trade`, `execute`, etc.                                                                              |
| `included[].attributes.status`               | `confirmed` or `failed`                                                                                                                    |
| `included[].attributes.transfers`            | Array of token movements with direction, amount, and token info                                                                            |
| `included[].attributes.application_metadata` | Present only for recognized contract interactions; carries the dapp `name`, `contract_address`, and `method`. Omitted for plain transfers. |
| `included[].attributes.flags.is_trash`       | Whether Zerion classifies the transaction as spam. See note below.                                                                         |
| `included[].relationships.chain.id`          | The chain where the transaction occurred                                                                                                   |

<Info>
  The webhook **labels** every transaction with `flags.is_trash`; it does not drop spam from the stream. To suppress spam notifications, filter on this field in your handler (skip transactions where `is_trash` is `true`). This also lets you apply your own threshold. See the [Spam Filtering](/spam-filtering) guide for how the classification works.
</Info>

<Warning>
  Token prices are always `null` in webhook payloads. Prices are calculated asynchronously and are not available at the time of delivery. If you need prices, fetch them separately using the [Fungibles API](/api-reference/fungibles/get-fungible-asset-by-id).
</Warning>

### Contract interactions

When a transaction is a recognized contract interaction, the transaction object includes an `application_metadata` object:

```json theme={null}
"application_metadata": {
  "name": "Uniswap",
  "contract_address": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
  "method": { "id": "0x18cbafe5", "name": "swapExactTokensForETH" }
}
```

It is **omitted** when the transaction is a plain transfer with no recognized contract interaction (as in the example above). Only contract and method metadata that Zerion already decodes is surfaced. Custom events emitted by your own contracts are not parsed into the payload. To read a custom event, fetch the transaction logs from your own node or a block explorer using the transaction `hash`.

## Signature verification

Every webhook request includes headers for verifying authenticity. Always verify signatures in production to ensure requests originate from Zerion.

| Header              | Description                            |
| ------------------- | -------------------------------------- |
| `X-Timestamp`       | ISO 8601 timestamp of the request      |
| `X-Signature`       | Base64-encoded RSA-SHA256 signature    |
| `X-Certificate-URL` | URL to download the public certificate |

### Verification steps

1. Concatenate the signing string: `${X-Timestamp}\n${request_body}\n`
2. Fetch the public certificate from the `X-Certificate-URL` header
3. Verify the `X-Signature` against the signing string using RSA-PKCS1v15 with SHA-256

<CodeGroup>
  ```python Python theme={null}
  import base64
  import requests
  from cryptography.x509 import load_pem_x509_certificate
  from cryptography.hazmat.primitives import hashes
  from cryptography.hazmat.primitives.asymmetric import padding

  def verify_webhook(timestamp, body, signature_b64, certificate_url):
      # Build the signing string
      signing_string = f"{timestamp}\n{body}\n"

      # Fetch and parse the certificate
      cert_pem = requests.get(certificate_url).content
      cert = load_pem_x509_certificate(cert_pem)
      public_key = cert.public_key()

      # Verify the signature
      signature = base64.b64decode(signature_b64)
      public_key.verify(
          signature,
          signing_string.encode(),
          padding.PKCS1v15(),
          hashes.SHA256()
      )
  ```

  ```javascript JavaScript theme={null}
  const crypto = require("crypto");

  async function verifyWebhook(timestamp, body, signatureB64, certificateUrl) {
    // Build the signing string
    const signingString = `${timestamp}\n${body}\n`;

    // Fetch the certificate
    const certResponse = await fetch(certificateUrl);
    const certPem = await certResponse.text();

    // Verify the signature
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(signingString);
    const isValid = verifier.verify(certPem, signatureB64, "base64");

    if (!isValid) {
      throw new Error("Invalid webhook signature");
    }
  }
  ```
</CodeGroup>

<Tip>
  Cache the certificate after the first fetch to avoid an extra HTTP call on every webhook. If signature verification fails, re-fetch the certificate in case it has rotated.
</Tip>

## Retry behavior

If your server returns a `5xx` error or the request times out, Zerion retries delivery up to **3 times**, spaced about **20 seconds apart** (roughly a 60-second window). After the final failed attempt, the notification is dropped permanently.

A `4xx` response is treated as acknowledged and is **not** retried.

To minimize missed notifications:

* Return a `200` response as quickly as possible, and process the payload asynchronously
* Keep your endpoint available with high uptime
* Monitor your endpoint for errors and slow responses

## Rollbacks

If a transaction is removed from the canonical chain (e.g., due to a chain reorganization), Zerion sends a second webhook for the same transaction with `deleted: true` set on the transaction resource inside `included`:

```json theme={null}
{
  "data": {
    "id": "notification-id",
    "type": "callback",
    "attributes": {
      "timestamp": "2024-07-31T00:18:12Z",
      "callback_url": "https://example.com/callback",
      "address": "0x42b9df65b219b3dd36ff330a4dd8f327a6ada990"
    }
  },
  "included": [
    {
      "type": "transactions",
      "id": "52d994a173d755e99845e861d534a419",
      "attributes": {
        "hash": "0xabc123...",
        "deleted": true
      }
    }
  ]
}
```

When `included[0].attributes.deleted` is `true`, the transaction has been rolled back and is no longer part of the canonical chain. Use the transaction `hash` to match it against the original notification and remove or mark it accordingly in your system.

<Warning>
  A single transaction can trigger two webhooks: one on initial confirmation and one on rollback. Make sure your handler accounts for this rather than assuming one webhook per transaction.
</Warning>

## Delivery guarantees

Zerion webhooks are **best-effort**:

* **Not guaranteed**: if all 3 delivery attempts fail, the notification is dropped
* **Order is not guaranteed**: notifications may arrive out of order relative to on-chain transaction ordering
* **Duplicates are possible**: your server should handle the same notification arriving more than once

Design your webhook handler to be **idempotent**: use the transaction `hash` and `chain` to deduplicate, and don't assume notifications arrive in chronological order.

## Subscription limits

|                          | Free plan | Paid plan |
| ------------------------ | --------- | --------- |
| Wallets per subscription | 5         | Unlimited |

On the free plan, each subscription can monitor up to **5 wallets**. On a paid plan, there is no limit, so you can add as many wallets as you need. The API accepts up to **100 wallets per request**, so for larger lists, batch your additions across multiple calls.

## Testing webhooks

Use [webhook.site](https://webhook.site) to get a temporary callback URL for testing:

1. Go to [webhook.site](https://webhook.site) and copy your unique URL
2. Create a subscription with that URL as the `callback_url`
3. Trigger a transaction on a watched wallet
4. Inspect the payload and headers on webhook.site

If you want to test with your own URL or move to production, go to the [Dashboard](https://dashboard.zerion.io) and click **Support** to request whitelisting for your callback URL.


