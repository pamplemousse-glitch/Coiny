# Source: https://docs.kraken.com/llms-full.txt
# Vendored 2026-08-17. Full documentation, replacing the index stub.

# Delete Export Report
Source: https://docs.kraken.com/api-reference/account-data/delete-export-report

/openapi/spot-rest.yaml post /private/RemoveExport
Delete exported trades/ledgers report

**API Key Permissions Required:** `Data - Export data`




# Get Account Balance
Source: https://docs.kraken.com/api-reference/account-data/get-account-balance

/openapi/spot-rest.yaml post /private/Balance
Retrieve all cash balances, net of pending withdrawals.

**Note on Staking/Earn assets:** We have begun to migrate assets from our legacy Staking system over to a new Earn system. As such, the following assets may appear in your balances and ledger. Please see our [Support article](https://support.kraken.com/hc/en-us/articles/360039879471-What-is-Asset-S-and-Asset-M-) for more details. Note that these assets are "read-only", to interact with your balances in them please use the base asset (e.g. `USDT` to transact with your `USDT` and `USDT.F` balances).

**Symbol Extensions**:
* `.B`: balances in new yield-bearing products, similar to `.S` (staked) and `.M` (opt-in rewards) balances
* `.F`: balances earning automatically in Kraken Rewards
* `.T`: tokenized assets.

**API Key Permissions Required:** `Funds permissions - Query`




# Get API Key Info
Source: https://docs.kraken.com/api-reference/account-data/get-api-key-info

/openapi/spot-rest.yaml post /private/GetApiKeyInfo
Retrieve information about the API key that is used to make the request, including its name, permissions, restrictions, and usage timestamps.

**API Key Permissions Required:** `None`




# Get Closed Orders
Source: https://docs.kraken.com/api-reference/account-data/get-closed-orders

/openapi/spot-rest.yaml post /private/ClosedOrders
Retrieve information about orders that have been closed (filled or cancelled). 50 results are returned at a time, the most recent by default.

**Note:** If an order's tx ID is given for `start` or `end` time, the order's opening time (`opentm`) is used

**API Key Permissions Required:** `Orders and trades - Query closed orders & trades`




# Get Credit Lines
Source: https://docs.kraken.com/api-reference/account-data/get-credit-lines

/openapi/spot-rest.yaml post /private/CreditLines
Retrieve all credit line details for VIPs with this functionality.

**API Key Permissions Required:** `Funds permissions - Query`




# Get Export Report Status
Source: https://docs.kraken.com/api-reference/account-data/get-export-report-status

/openapi/spot-rest.yaml post /private/ExportStatus
Get status of requested data exports.

**API Key Permissions Required:** `Data - Export data`




# Get Extended Balance
Source: https://docs.kraken.com/api-reference/account-data/get-extended-balance

/openapi/spot-rest.yaml post /private/BalanceEx
Retrieve all extended account balances, including credits and held amounts. Balance available for trading is calculated as: `available balance = balance + credit - credit_used - hold_trade`

Note that held amounts only include spot non margin orders.

**Note on Staking/Earn assets:** We have begun to migrate assets from our legacy Staking system over to a new Earn system. As such, the following assets may appear in your balances and ledger. Please see our [Support article](https://support.kraken.com/hc/en-us/articles/360039879471-What-is-Asset-S-and-Asset-M-) for more details. Note that these assets are "read-only", to interact with your balances in them please use the base asset (e.g. `USDT` to transact with your `USDT` and `USDT.F` balances).

**Symbol Extensions**:
* `.B`: balances in new yield-bearing products, similar to `.S` (staked) and `.M` (opt-in rewards) balances
* `.F`: balances earning automatically in Kraken Rewards
* `.T`: tokenized assets.

**API Key Permissions Required:** `Funds permissions - Query`




# Get Ledgers Info
Source: https://docs.kraken.com/api-reference/account-data/get-ledgers-info

/openapi/spot-rest.yaml post /private/Ledgers
Retrieve information about ledger entries. 50 results are returned at a time, the most recent by default.

> **Note on Staking/Earn assets:** We have begun to migrate assets from our legacy Staking system over to a new Earn system. As such, the following assets may appear in your balances and ledger. Please see our [Support article](https://support.kraken.com/hc/en-us/articles/360039879471-What-is-Asset-S-and-Asset-M-) for more details. Note that these assets are "read-only", to interact with your balances in them please use the base asset (e.g. `USDT` to transact with your `USDT` and `USDT.F` balances).
> * `.B`, which represents balances in new yield-bearing products, similar to `.S` (staked) and `.M` (opt-in rewards) balances
> * `.F`, which represents balances earning automatically in Kraken Rewards

**API Key Permissions Required:** `Data - Query ledger entries`




# Get Open Orders
Source: https://docs.kraken.com/api-reference/account-data/get-open-orders

/openapi/spot-rest.yaml post /private/OpenOrders
Retrieve information about currently open orders.

**API Key Permissions Required:** `Orders and trades - Query open orders & trades`




# Get Open Positions
Source: https://docs.kraken.com/api-reference/account-data/get-open-positions

/openapi/spot-rest.yaml post /private/OpenPositions
Get information about open margin positions.

**API Key Permissions Required:** `Orders and trades - Query open orders & trades`




# Get Order Amends
Source: https://docs.kraken.com/api-reference/account-data/get-order-amends

/openapi/spot-rest.yaml post /private/OrderAmends
Retrieves an audit trail of amend transactions on the specified order. The list is ordered by ascending amend timestamp.

**API Key Permissions Required:** `Orders and trades - Query open orders & trades` or `Orders and trades - Query closed orders & trades`, depending on status of order.




# Get Trade Balance
Source: https://docs.kraken.com/api-reference/account-data/get-trade-balance

/openapi/spot-rest.yaml post /private/TradeBalance
Retrieve a summary of collateral balances, margin position valuations, equity and margin level.

**API Key Permissions Required:** `Orders and trades - Query open orders & trades`




# Get Trade Volume
Source: https://docs.kraken.com/api-reference/account-data/get-trade-volume

/openapi/spot-rest.yaml post /private/TradeVolume
Returns 30 day USD trading volume and resulting fee schedule for any asset pair(s) provided. Fees will not be included if `pair` is not specified as Kraken fees differ by asset pair.
Note: If an asset pair is on a maker/taker fee schedule, the taker side is given in `fees` and maker side in `fees_maker`. For pairs not on maker/taker, they will only be given in `fees`.

`pair` accepts either a comma-delimited list of pair names or a list of `{ asset, aclass }` objects (the latter is required for non-forex classes such as `derivatives` or `equity_pair`). Set `fee_schedule` to `true` to additionally receive the full fee schedule per trading pair in the `schedules` field.

**API Key Permissions Required:** `Funds permissions - Query`




# Get Trades History
Source: https://docs.kraken.com/api-reference/account-data/get-trades-history

/openapi/spot-rest.yaml post /private/TradesHistory
Retrieve information about trades/fills. By default, the most recent trades are returned.
* Unless otherwise stated, costs, fees, prices, and volumes are specified with the precision for the asset pair (`pair_decimals` and `lot_decimals`), not the individual assets' precision (`decimals`).

**API Key Permissions Required:** `Orders and trades - Query closed orders & trades`




# Query Ledgers
Source: https://docs.kraken.com/api-reference/account-data/query-ledgers

/openapi/spot-rest.yaml post /private/QueryLedgers
Retrieve information about specific ledger entries. 

> **Note on Staking/Earn assets:** We have begun to migrate assets from our legacy Staking system over to a new Earn system. As such, the following assets may appear in your balances and ledger. Please see our [Support article](https://support.kraken.com/hc/en-us/articles/360039879471-What-is-Asset-S-and-Asset-M-) for more details. Note that these assets are "read-only", to interact with your balances in them please use the base asset (e.g. `USDT` to transact with your `USDT` and `USDT.F` balances).
> * `.B`, which represents balances in new yield-bearing products, similar to `.S` (staked) and `.M` (opt-in rewards) balances
> * `.F`, which represents balances earning automatically in Kraken Rewards

**API Key Permissions Required:** `Data - Query ledger entries`




# Query Orders Info
Source: https://docs.kraken.com/api-reference/account-data/query-orders-info

/openapi/spot-rest.yaml post /private/QueryOrders
Retrieve information about specific orders.

**API Key Permissions Required:** `Orders and trades - Query open orders & trades` or `Orders and trades - Query closed orders & trades`, depending on status of order




# Query Trades Info
Source: https://docs.kraken.com/api-reference/account-data/query-trades-info

/openapi/spot-rest.yaml post /private/QueryTrades
Retrieve information about specific trades/fills.

**API Key Permissions Required:** `Orders and trades - Query closed orders & trades`




# Request Export Report
Source: https://docs.kraken.com/api-reference/account-data/request-export-report

/openapi/spot-rest.yaml post /private/AddExport
Request export of trades or ledgers.

**API Key Permissions Required:** `Data - Export data`




# Retrieve Data Export
Source: https://docs.kraken.com/api-reference/account-data/retrieve-data-export

/openapi/spot-rest.yaml post /private/RetrieveExport
Retrieve a processed data export 

**API Key Permissions Required:** `Data - Export data`




# Account log (CSV)
Source: https://docs.kraken.com/api-reference/account-history/account-log-csv

/openapi/futures-history-rest.yaml get /accountlogcsv
Lists recent account log entries in CSV format.




# Get account log
Source: https://docs.kraken.com/api-reference/account-history/get-account-log

/openapi/futures-history-rest.yaml get /account-log
Lists account log entries, paged by timestamp or by ID.

To request entries by time range, use the `since` and `before` parameters.
To request entries by ID range, use the `from` and `to` parameters.
Any combination of `since`, `before`, `from` and `to` can be used to restrict the requested range of entries.




# Get execution events
Source: https://docs.kraken.com/api-reference/account-history/get-execution-events

/openapi/futures-history-rest.yaml get /executions
Lists executions/trades for authenticated account.




# Get order events
Source: https://docs.kraken.com/api-reference/account-history/get-order-events

/openapi/futures-history-rest.yaml get /orders
Lists order events for authenticated account.




# Get position update events
Source: https://docs.kraken.com/api-reference/account-history/get-position-update-events

/openapi/futures-history-rest.yaml get /positions
Lists position events for authenticated account.



# Get trigger events
Source: https://docs.kraken.com/api-reference/account-history/get-trigger-events

/openapi/futures-history-rest.yaml get /triggers
Lists trigger events for authenticated account.




# Calculate portfolio margin, pnl and greeks
Source: https://docs.kraken.com/api-reference/account-information/calculate-portfolio-margin-pnl-and-greeks

/openapi/futures-rest.yaml post /portfolio-margining/simulate
For a given portfolio of balances and positions (futures and options), calculate the
margin requirements, pnl and option greeks.

Note: This is currently available exclusively in the Kraken pre-prod environments.



# Get open positions
Source: https://docs.kraken.com/api-reference/account-information/get-open-positions

/openapi/futures-rest.yaml get /openpositions
This endpoint returns the size and average entry price of all open positions in Futures
contracts. This includes Futures contracts that have matured but have not yet been settled.



# Get portfolio margin parameters
Source: https://docs.kraken.com/api-reference/account-information/get-portfolio-margin-parameters

/openapi/futures-rest.yaml get /portfolio-margining/parameters
Retrieve current portfolio margin calculation parameters.

Also includes user specific limits related to options trading.

Note: This is currently available exclusively in the Kraken pre-prod environments.



# Get position percentile of unwind queue
Source: https://docs.kraken.com/api-reference/account-information/get-position-percentile-of-unwind-queue

/openapi/futures-rest.yaml get /unwindqueue
This endpoint returns the percentile of the open position in case of unwinding.



# Get wallets
Source: https://docs.kraken.com/api-reference/account-information/get-wallets

/openapi/futures-rest.yaml get /accounts
This endpoint returns key information relating to all your accounts which may either be
cash accounts or margin accounts. This includes digital asset balances, instrument balances,
margin requirements, margin trigger estimates and auxiliary information such as available
funds, PnL of open positions and portfolio value.



# Get liquidity pool statistic
Source: https://docs.kraken.com/api-reference/analytics/get-liquidity-pool-statistic

/openapi/futures-charts-rest.yaml get /analytics/liquidity-pool
Get liquidity pool statistic including usd value



# Market Analytics
Source: https://docs.kraken.com/api-reference/analytics/market-analytics

/openapi/futures-charts-rest.yaml get /analytics/{symbol}/{analytics_type}
Analytics data divided into time buckets



# Check v3 API key
Source: https://docs.kraken.com/api-reference/api-keys/check-v3-api-key

/openapi/futures-auth-rest.yaml get /api-keys/v3/check
Verify API key access and return the authenticated key's details.



# Create Prime API User Key
Source: https://docs.kraken.com/api-reference/api-user-keys/create-prime-api-user-key

/openapi/prime-rest.yaml post /0/private/CreatePrimeApiUserKey
Creates a new API key for a Prime API user. The API secret is only returned in this response and cannot be retrieved later.




# Delete Prime API User Key
Source: https://docs.kraken.com/api-reference/api-user-keys/delete-prime-api-user-key

/openapi/prime-rest.yaml post /0/private/DeletePrimeApiUserKey
Permanently deletes an API key for a Prime API user. This action cannot be undone.




# List Prime API User Keys
Source: https://docs.kraken.com/api-reference/api-user-keys/list-prime-api-user-keys

/openapi/prime-rest.yaml post /0/private/ListPrimeApiUserKeys
Retrieves all API keys for a specific Prime API user. The API secret is not included in the response.




# Update Prime API User Key
Source: https://docs.kraken.com/api-reference/api-user-keys/update-prime-api-user-key

/openapi/prime-rest.yaml post /0/private/UpdatePrimeApiUserKey
Updates the whitelisted IPs for a Prime API user key.




# Create Prime API User
Source: https://docs.kraken.com/api-reference/api-users/create-prime-api-user

/openapi/prime-rest.yaml post /0/private/CreatePrimeApiUser
Creates a new Prime API user with the specified role. Valid roles are `Viewer` and `Trader`.




# Get Prime API User
Source: https://docs.kraken.com/api-reference/api-users/get-prime-api-user

/openapi/prime-rest.yaml post /0/private/GetPrimeApiUser
Retrieves details of a specific Prime API user by ID.




# List Prime API Users
Source: https://docs.kraken.com/api-reference/api-users/list-prime-api-users

/openapi/prime-rest.yaml post /0/private/ListPrimeApiUsers
Retrieves a list of all Prime API users for the account.




# Update Prime API User
Source: https://docs.kraken.com/api-reference/api-users/update-prime-api-user

/openapi/prime-rest.yaml post /0/private/UpdatePrimeApiUser
Updates the name or status of a Prime API user.




# Update Prime API User Roles
Source: https://docs.kraken.com/api-reference/api-users/update-prime-api-user-roles

/openapi/prime-rest.yaml post /0/private/UpdatePrimeApiUserRoles
Updates the role assigned to a Prime API user. Valid roles are `Viewer` and `Trader`.




# Add assignment preference
Source: https://docs.kraken.com/api-reference/assignment-program/add-assignment-preference

/openapi/futures-rest.yaml post /assignmentprogram/add
This endpoint adds an assignment program preference



# Deletes assignment preference
Source: https://docs.kraken.com/api-reference/assignment-program/deletes-assignment-preference

/openapi/futures-rest.yaml post /assignmentprogram/delete
This endpoint deletes an assignment program preference



# List assignment preferences history
Source: https://docs.kraken.com/api-reference/assignment-program/list-assignment-preferences-history

/openapi/futures-rest.yaml get /assignmentprogram/history
This endpoint returns information on assignment program preferences change history



# List assignment programs
Source: https://docs.kraken.com/api-reference/assignment-program/list-assignment-programs

/openapi/futures-rest.yaml get /assignmentprogram/current
This endpoint returns information on currently active assignment programs



# Market Candles
Source: https://docs.kraken.com/api-reference/candles/market-candles

/openapi/futures-charts-rest.yaml get /{tick_type}/{symbol}/{resolution}
Candles for specified tick type, market, and resolution.

List of available tick types can be fetched from the [tick types](#operation/tickTypes)
endpoint. List of available markets can be fetched from the [markets](#operation/symbols)
endpoint. List of available resolutions can be fetched from the
[resolutions](#operation/resolutions) endpoint.



# Markets
Source: https://docs.kraken.com/api-reference/candles/markets

/openapi/futures-charts-rest.yaml get /{tick_type}
Markets available for specified tick type.

List of available tick types can be fetched from the [tick types](#operation/tickTypes)
endpoint.



# Resolutions
Source: https://docs.kraken.com/api-reference/candles/resolutions

/openapi/futures-charts-rest.yaml get /{tick_type}/{symbol}
Candle resolutions available for specified tick type and market.

List of available tick types can be fetched from the [tick types](#operation/tickTypes)
endpoint. List of available markets can be fetched from the [markets](#operation/symbols)
endpoint.



# Tick Types
Source: https://docs.kraken.com/api-reference/candles/tick-types

/openapi/futures-charts-rest.yaml get /
Returns all available tick types to use with the [markets](#operation/symbols) endpoint.



# Create address
Source: https://docs.kraken.com/api-reference/custody-external-api/create-address

/openapi/insto-custody-rest.yaml post /v0/insto/custody/vaults/{vault_id}/deposit-methods/{method_id}/addresses
Generates a new deposit address for the vault and deposit method. The response carries the new address along with deposit fee, minimum and maximum amounts, expiration time (RFC 3339 UTC), and the asset and asset class the method belongs to. The request fails with `TooManyAddresses` when the maximum number of addresses for the method has been reached.

**Rate limit:** 200 requests per 30 seconds per IP.



# Create task
Source: https://docs.kraken.com/api-reference/custody-external-api/create-task

/openapi/insto-custody-rest.yaml post /v0/insto/custody/tasks
Creates an approval task from one or more instructions. Each instruction describes a single change, such as a withdrawal, a sub-quorum update, or a user removal. The task is created in a pending state and its instructions take effect asynchronously once the task is approved. The response returns the task identifier and the identifier of the associated approval flow.

**Rate limit:** 200 requests per 30 seconds per IP.



# Create withdrawal fee quote
Source: https://docs.kraken.com/api-reference/custody-external-api/create-withdrawal-fee-quote

/openapi/insto-custody-rest.yaml post /v0/insto/custody/vaults/{vault_id}/withdrawals/fee-quotes
Generates a fee quote for a hypothetical withdrawal from the specified vault. Callers supply the asset and amount they intend to withdraw and receive back a `fee_quote_id` along with a set of fee tiers, each describing the fee charged at a given priority level. The returned `fee_quote_id` can then be passed as `fee_quote_id` on a `request_withdrawal` instruction to `POST /v0/insto/custody/tasks` to submit the actual withdrawal. Quotes are advisory and expire after a short window.

**Rate limit:** 200 requests per 30 seconds per IP.



# Get deposit info
Source: https://docs.kraken.com/api-reference/custody-external-api/get-deposit-info

/openapi/insto-custody-rest.yaml get /v0/insto/custody/vaults/{vault_id}/deposits/info
Returns the deposit methods available for a specific asset in a vault. Each entry carries the funding method identifier, fees, minimums, and the underlying network metadata needed to display a deposit screen.

**Rate limit:** 200 requests per 30 seconds per IP.



# Get task by id
Source: https://docs.kraken.com/api-reference/custody-external-api/get-task-by-id

/openapi/insto-custody-rest.yaml get /v0/insto/custody/tasks/{task_id}
Returns the full details of a single task, including its instructions, the activity timeline, and reviewer/quorum state. Available only to callers in the task's owning organization. Each task is exposed as a list of atomic instructions, where every entry describes a single change.

**Rate limit:** 200 requests per 30 seconds per IP.



# Get transaction
Source: https://docs.kraken.com/api-reference/custody-external-api/get-transaction

/openapi/insto-custody-rest.yaml get /v0/insto/custody/vaults/{vault_id}/transactions/{transaction_id}
Returns a single transaction for the given vault. Available only to callers with access to the vault.

**Rate limit:** 200 requests per 30 seconds per IP.



# Get vault
Source: https://docs.kraken.com/api-reference/custody-external-api/get-vault

/openapi/insto-custody-rest.yaml get /v0/insto/custody/vaults/{vault_id}
Returns metadata for a single vault the authenticated user can access. Initiator and Reviewer API users must be a member of the vault.

**Rate limit:** 200 requests per 30 seconds per IP.



# Get vault balance
Source: https://docs.kraken.com/api-reference/custody-external-api/get-vault-balance

/openapi/insto-custody-rest.yaml get /v0/insto/custody/vaults/{vault_id}/balances
Returns the total balance for a vault valued in the requested quote currency. The response includes the 24-hour balance change and any assets for which a quote rate was unavailable.

**Rate limit:** 200 requests per 30 seconds per IP.



# Get withdrawal info
Source: https://docs.kraken.com/api-reference/custody-external-api/get-withdrawal-info

/openapi/insto-custody-rest.yaml get /v0/insto/custody/vaults/{vault_id}/withdrawals/info
Returns withdrawal methods, fees, limits, and network metadata for a specific asset in a vault. Each entry carries the method identifier, fee structure, minimum and maximum amounts, and validation rules needed to display a withdrawal screen.

**Rate limit:** 200 requests per 30 seconds per IP.



# List assets
Source: https://docs.kraken.com/api-reference/custody-external-api/list-assets

/openapi/insto-custody-rest.yaml get /v0/insto/custody/assets
Lists custody assets that support inbound funding via on-chain deposit or spot-to-vault transfer. Withdraw-only assets are omitted.

Each entry includes the currency code, display metadata, network, and supported actions (`deposit`, `withdraw`, `transfer_to_spot`, `transfer_to_vault`, `stake`).

No authentication is required.

**Rate limit:** 200 requests per 30 seconds per IP.



# List balances
Source: https://docs.kraken.com/api-reference/custody-external-api/list-balances

/openapi/insto-custody-rest.yaml get /v0/insto/custody/organizations/{org_iiban}/balances
Returns the aggregated balance for an organization across all of its vaults, valued in the requested quote currency. The response breaks the total down into spot, staked, and pledged components.

**Rate limit:** 200 requests per 30 seconds per IP.



# List deposit addresses
Source: https://docs.kraken.com/api-reference/custody-external-api/list-deposit-addresses

/openapi/insto-custody-rest.yaml get /v0/insto/custody/vaults/{vault_id}/deposit-methods/{method_id}/addresses
Returns existing deposit addresses for the vault and deposit method. Each entry carries the address, optional routing fields like `tag` and `memo`, deposit fee, minimum and maximum amounts, expiration time (RFC 3339 UTC), and a flag indicating whether the caller may generate another address. The list is empty when no address has been generated yet.

**Rate limit:** 200 requests per 30 seconds per IP.



# List deposit methods
Source: https://docs.kraken.com/api-reference/custody-external-api/list-deposit-methods

/openapi/insto-custody-rest.yaml get /v0/insto/custody/vaults/{vault_id}/deposit-methods
Returns the deposit methods available for the vault. Each entry carries the method identifier, fee, minimum, disabled flag, and the network metadata for the underlying chain. Filter by `asset` and `asset_class` together to limit results to a single asset.

**Rate limit:** 200 requests per 30 seconds per IP.



# List organizations
Source: https://docs.kraken.com/api-reference/custody-external-api/list-organizations

/openapi/insto-custody-rest.yaml get /v0/insto/custody/organizations
Returns the organizations the authenticated user belongs to. Each entry carries the organization identifier, display name, and lifecycle status.

**Rate limit:** 200 requests per 30 seconds per IP.



# List tasks
Source: https://docs.kraken.com/api-reference/custody-external-api/list-tasks

/openapi/insto-custody-rest.yaml get /v0/insto/custody/tasks
Returns a paginated list of custody tasks (approval requests) visible to the authenticated user, filtered by the supplied query parameters and ordered by the requested column. Multi-valued filters are OR-ed within a field and AND-ed across fields.

**Rate limit:** 200 requests per 30 seconds per IP.



# List transactions
Source: https://docs.kraken.com/api-reference/custody-external-api/list-transactions

/openapi/insto-custody-rest.yaml get /v0/insto/custody/vaults/{vault_id}/transactions
Returns a paginated list of transactions for the given vault. Filter by transaction type, asset, and sort order. Use `cursor` from a prior response to fetch subsequent pages.

**Rate limit:** 200 requests per 30 seconds per IP.



# List vault asset balances
Source: https://docs.kraken.com/api-reference/custody-external-api/list-vault-asset-balances

/openapi/insto-custody-rest.yaml get /v0/insto/custody/vaults/{vault_id}/assets/balances
Returns per-asset balances for a vault, including spot, hold, available, staked, and pledged components for each asset. Each row includes asset metadata and optional quote-currency valuations. Use `quote_asset` to select the valuation currency (defaults to USD). Numeric strings are always returned at full upstream precision.

**Rate limit:** 200 requests per 30 seconds per IP.



# List vault policies
Source: https://docs.kraken.com/api-reference/custody-external-api/list-vault-policies

/openapi/insto-custody-rest.yaml get /v0/insto/custody/vaults/{vault_id}/policies
Returns the vault's policy settings as a list of typed items: the approval quorum, the withdrawal and OTC limits, the OTC flag, the staking limit and, when configured, the subquorum approval groups. Items are identified by their `type` field; item order is not significant.

**Rate limit:** 200 requests per 30 seconds per IP.



# List vaults
Source: https://docs.kraken.com/api-reference/custody-external-api/list-vaults

/openapi/insto-custody-rest.yaml get /v0/insto/custody/vaults
Returns the vaults the authenticated user can access within an organization, each valued in the quote asset. Initiator and Reviewer API users see only the vaults they are a member of.

**Rate limit:** 200 requests per 30 seconds per IP.



# List whitelist addresses
Source: https://docs.kraken.com/api-reference/custody-external-api/list-whitelist-addresses

/openapi/insto-custody-rest.yaml get /v0/insto/custody/vaults/{vault_id}/whitelist/addresses
Returns the whitelisted withdrawal addresses for a vault, optionally filtered by asset.

**Rate limit:** 200 requests per 30 seconds per IP.



# List withdrawal methods
Source: https://docs.kraken.com/api-reference/custody-external-api/list-withdrawal-methods

/openapi/insto-custody-rest.yaml get /v0/insto/custody/vaults/{vault_id}/withdrawal-methods
Returns the withdrawal methods available for the vault. Each entry carries the method identifier, fee and fee asset, minimum withdrawal amount, disabled flag, and the network metadata for the underlying chain. Filter by `asset` and `asset_class` together to limit results to a single asset.

**Rate limit:** 200 requests per 30 seconds per IP.



# Review task
Source: https://docs.kraken.com/api-reference/custody-external-api/review-task

/openapi/insto-custody-rest.yaml post /v0/insto/custody/tasks/{task_id}/review
Records the authenticated user's review decision on a task. The decision is `approve` or `deny`, with an optional comment. The caller must be an assigned reviewer and must not already have voted; if either condition fails the request is rejected with a `403`. The response returns the task's new lifecycle state after the decision is applied.

**Rate limit:** 200 requests per 30 seconds per IP.



# Allocate Earn Funds
Source: https://docs.kraken.com/api-reference/earn/allocate-earn-funds

/openapi/spot-rest.yaml post /private/Earn/Allocate
Allocate funds to the Strategy.

Requires the `Earn Funds` API key permission.
The amount must always be defined.

This method is asynchronous. A couple of preflight checks are
performed synchronously on behalf of the method before it is dispatched
further. The client is required to poll
the result using the `/0/private/Earn/AllocateStatus` endpoint.

There can be only one (de)allocation request in progress for given user and
strategy at any time. While the operation is in progress:

1. `pending` attribute in `/Earn/Allocations` response for the strategy
  indicates that funds are being allocated,
2. `pending` attribute in `/Earn/AllocateStatus` response will be true.

Following specific errors within `Earnings` class can be returned by this
method:
- Minimum allocation: `EEarnings:Below min:(De)allocation operation amount less than minimum`
- Allocation in progress: `EEarnings:Busy:Another (de)allocation for the same strategy is in progress`
- Service temporarily unavailable: `EEarnings:Busy`. Try again in a few minutes.
- User tier verification: `EEarnings:Permission denied:The user's tier is not high enough`
- Strategy not found: `EGeneral:Invalid arguments:Invalid strategy ID`



# Deallocate Earn Funds
Source: https://docs.kraken.com/api-reference/earn/deallocate-earn-funds

/openapi/spot-rest.yaml post /private/Earn/Deallocate
Deallocate funds from a strategy.

Requires the `Earn Funds` API key permission.
The amount must always be defined.

This method is asynchronous. A couple of preflight checks are
performed synchronously on behalf of the method before it is dispatched
further. If the method returns HTTP 202 code, the client is required to poll
the result using the `/Earn/DeallocateStatus` endpoint.

There can be only one (de)allocation request in progress for given user and
strategy.  While the operation is in progress:

1. `pending` attribute in `Allocations` response for the strategy will hold
   the amount that is being deallocated (negative amount)
2. `pending` attribute in `DeallocateStatus` response will be true.

Following specific errors within `Earnings` class can be returned by this
method:
- Minimum allocation: `EEarnings:Below min:(De)allocation operation amount less than minimum`
  allowed
- Allocation in progress: `EEarnings:Busy:Another (de)allocation for the same strategy is in progress`
- Strategy not found: `EGeneral:Invalid arguments:Invalid strategy ID`



# Get Allocation Status
Source: https://docs.kraken.com/api-reference/earn/get-allocation-status

/openapi/spot-rest.yaml post /private/Earn/AllocateStatus
Get the status of the last allocation request.

Requires either the `Earn Funds` or `Query Funds` API key permission.

(De)allocation operations are asynchronous and this endpoint allows client
to retrieve the status of the last dispatched operation. There can be only
one (de)allocation request in progress for given user and strategy.

The `pending` attribute in the response indicates if the previously
dispatched operation is still in progress (true) or has successfully
completed (false).  If the dispatched request failed with an error, then
HTTP error is returned to the client as if it belonged to the original
request.

Following specific errors within `Earnings` class can be returned by this
method:
- Insufficient funds: `EEarnings:Insufficient funds:Insufficient funds to complete the (de)allocation request`
- User cap exceeded: `EEarnings:Above max:The allocation exceeds user limit for the strategy`
- Total cap exceeded: `EEarnings:Above max:The allocation exceeds the total strategy limit`
- Minimum allocation: `EEarnings:Below min:(De)allocation operation amount less than minimum`



# Get Deallocation Status
Source: https://docs.kraken.com/api-reference/earn/get-deallocation-status

/openapi/spot-rest.yaml post /private/Earn/DeallocateStatus
Get the status of the last deallocation request.

Requires either the `Earn Funds` or `Query Funds` API key permission.

(De)allocation operations are asynchronous and this endpoint allows client
to retrieve the status of the last dispatched operation. There can be only
one (de)allocation request in progress for given user and strategy.

The `pending` attribute in the response indicates if the previously
dispatched operation is still in progress (true) or has successfully
completed (false).  If the dispatched request failed with an error, then
HTTP error is returned to the client as if it belonged to the original
request.

Following specific errors within `Earnings` class can be returned by this
method:
- Insufficient funds: `EEarnings:Insufficient funds:Insufficient funds to complete the (de)allocation request`
- Minimum allocation: `EEarnings:Below min:(De)allocation operation amount less than minimum`



# List Earn Allocations
Source: https://docs.kraken.com/api-reference/earn/list-earn-allocations

/openapi/spot-rest.yaml post /private/Earn/Allocations
List all allocations for the user.

Requires the `Query Funds` API key permission.

By default all allocations are returned, even for strategies that have been
used in the past and have zero balance now. That is so that the user can see
how much was earned with given strategy in the past.
`hide_zero_allocations` parameter can be used to remove zero balance entries
from the output.  Paging hasn't been implemented for this method as we don't
expect the result for a particular user to be overwhelmingly large.

All amounts in the output can be denominated in a currency of user's choice
(the `converted_asset` parameter).

Information about when the next reward will be paid to the client is also
provided in the output.

Allocated funds can be in up to 4 states:
- bonding
- allocated
- exit_queue (ETH only)
- unbonding

Any funds in `total` not in `bonding`/`unbonding` are simply allocated and
earning rewards. Depending on the strategy funds in the other 3 states can
also be earning rewards. Consult the output of `/Earn/Strategies` to know
whether `bonding`/`unbonding` earn rewards. `ETH` in `exit_queue` still
earns rewards.

Note that for `ETH`, when the funds are in the `exit_queue` state, the
`expires` time given is the time when the funds will have finished
unbonding, not when they go from exit queue to unbonding.

(Un)bonding time estimate can be inaccurate right after having (de)allocated the
funds. Wait 1-2 minutes after (de)allocating to get an accurate result.



# List Earn Strategies
Source: https://docs.kraken.com/api-reference/earn/list-earn-strategies

/openapi/spot-rest.yaml post /private/Earn/Strategies
List earn strategies along with their parameters.

Requires a valid API key but not specific permission is required.

Returns only strategies that are available to the user
based on geographic region.

When the user does not meet the tier restriction, `can_allocate` will be
false and `allocation_restriction_info` indicates `Tier` as the restriction
reason. Earn products generally require Intermediate tier. Get your account verified
to access earn.

A note about `lock_type`:
- `instant`: can be deallocated without an unbonding period. This is called flexible in the UI.
- `bonded`: has an unbonding period. Deallocation will not happen until this period has passed.
- `flex`: "Kraken rewards". This is earning on your spot balances where eligible. It's turned on account wide
  from the UI and you cannot manually allocate to these strategies.

Paging isn't yet implemented, so the endpoint always returns all
data in the first page.



# Get fee schedule volumes
Source: https://docs.kraken.com/api-reference/fee-schedules/get-fee-schedule-volumes

/openapi/futures-rest.yaml get /feeschedules/volumes
**DEPRECATED** — Effective 2026-06-22, the volumes and fee schedule
associations returned by this endpoint no longer reflect the fees
actually charged on Futures trades. Futures fee calculation has been
migrated to a centralised Kraken fee service.

To determine the fee rate applied to your trades, use the Spot
[`GetTradeVolume`](https://docs.kraken.com/api/docs/rest-api/get-trade-volume)
endpoint authenticated with a Spot API key.

---

Returns your fee schedule volumes for each fee schedule.



# Get fee schedules
Source: https://docs.kraken.com/api-reference/fee-schedules/get-fee-schedules

/openapi/futures-rest.yaml get /feeschedules
**DEPRECATED** — Effective 2026-06-22, the fee values returned by this
endpoint no longer reflect the fees actually charged on Futures trades.
Futures fee calculation has been migrated to a centralised Kraken fee
service.

To determine the fee rate applied to your trades, use the Spot
[`GetTradeVolume`](https://docs.kraken.com/api/docs/rest-api/get-trade-volume)
endpoint authenticated with a Spot API key.

---

This endpoint lists all fee schedules.



# Calculate Funding Fees
Source: https://docs.kraken.com/api-reference/funding-beta/calculate-funding-fees

/openapi/funding-beta.yaml get /funding/v1/fees/{method_id}
Calculate the fee for a funding method and amount. For withdrawals, the response also includes a unique
`withdrawal_fee_token` that pins the quoted fee rate for later use with
[Create Funding Withdrawal](/api-reference/funding-beta/create-funding-withdrawal). The token expires after
5 minutes and can be used on multiple withdrawals.

**API Key Permissions Required:** `Funds permissions - Query`



# Claim Funding Deposit Address
Source: https://docs.kraken.com/api-reference/funding-beta/claim-funding-deposit-address

/openapi/funding-beta.yaml put /funding/v1/deposit/address
Claim a deposit address for a funding method. This generates an address for receiving funds.

**API Key Permissions Required:** `Funds permissions - Deposit`



# Create Funding Address
Source: https://docs.kraken.com/api-reference/funding-beta/create-funding-address

/openapi/funding-beta.yaml post /funding/v1/addresses
Save a withdrawal address to the account for a funding method, network, or network group. See
[Adding a withdrawal address](/exchange/guides/rest/funding#section-1-adding-a-withdrawal-address) for how
those scopes work.

**API Key Permissions Required:** `Funds permissions - Add withdrawal addresses`



# Create Funding Withdrawal
Source: https://docs.kraken.com/api-reference/funding-beta/create-funding-withdrawal

/openapi/funding-beta.yaml post /funding/v1/withdrawals
Create a withdrawal to a saved address. Pass a `withdrawal_fee_token` from
[Calculate Funding Fees](/api-reference/funding-beta/calculate-funding-fees) to pin the quoted fee rate, or
omit it to use the current fee.

**API Key Permissions Required:** `Funds permissions - Withdraw`



# Delete Funding Address
Source: https://docs.kraken.com/api-reference/funding-beta/delete-funding-address

/openapi/funding-beta.yaml delete /funding/v1/addresses/{id}
Delete a saved withdrawal address.

**API Key Permissions Required:** `Funds permissions - Add withdrawal addresses`



# List Funding Addresses
Source: https://docs.kraken.com/api-reference/funding-beta/list-funding-addresses

/openapi/funding-beta.yaml get /funding/v1/addresses
Retrieve saved withdrawal addresses for your account. Results are paginated; use the `cursor` parameter to iterate through the list of addresses (page size equal to the value of `limit`).

**API Key Permissions Required:** `Funds permissions - Query`



# List Funding Assets
Source: https://docs.kraken.com/api-reference/funding-beta/list-funding-assets

/openapi/funding-beta.yaml get /funding/v1/assets/{direction}
Retrieve assets available for the requested direction (deposit or withdraw).

**API Key Permissions Required:** `Funds permissions - Query`



# List Funding Claimed Addresses (v2)
Source: https://docs.kraken.com/api-reference/funding-beta/list-funding-claimed-addresses-v2

/openapi/funding-beta.yaml get /funding/v2/deposit/addresses
Retrieve claimed deposit addresses. Results are paginated; use the `cursor` parameter to iterate through the list of addresses (page size equal to the value of `limit`).

**API Key Permissions Required:** `Funds permissions - Query`



# List Funding Deposit Limits
Source: https://docs.kraken.com/api-reference/funding-beta/list-funding-deposit-limits

/openapi/funding-beta.yaml get /funding/v1/limits/deposit/{asset_class}/{asset}
Retrieve deposit limits for an asset, including remaining and maximum amounts where applicable.

**API Key Permissions Required:** `Funds permissions - Query`



# List Funding Deposits
Source: https://docs.kraken.com/api-reference/funding-beta/list-funding-deposits

/openapi/funding-beta.yaml get /funding/v1/deposits
Retrieve information about deposits. Results are sorted by recency; use the `cursor` parameter to iterate through the list of deposits (page size equal to the value of `limit`) from newest to oldest.

**API Key Permissions Required:** `Funds permissions - Query`



# List Funding Methods
Source: https://docs.kraken.com/api-reference/funding-beta/list-funding-methods

/openapi/funding-beta.yaml get /funding/v1/methods/{direction}
Retrieve funding methods for the requested direction (deposit or withdraw). Results are paginated; use the `cursor` parameter to iterate through the list of methods (page size equal to the value of `limit`).

**API Key Permissions Required:** `Funds permissions - Query`



# List Funding Networks
Source: https://docs.kraken.com/api-reference/funding-beta/list-funding-networks

/openapi/funding-beta.yaml get /funding/v1/networks
Retrieve networks and network groups available for funding, including which networks share an address
format.

**API Key Permissions Required:** `Funds permissions - Query`



# List Funding Withdrawal Limits
Source: https://docs.kraken.com/api-reference/funding-beta/list-funding-withdrawal-limits

/openapi/funding-beta.yaml get /funding/v1/limits/withdrawal/{asset_class}/{asset}
Retrieve withdrawal limits for an asset, including remaining and maximum amounts where applicable.

**API Key Permissions Required:** `Funds permissions - Query`



# List Funding Withdrawals
Source: https://docs.kraken.com/api-reference/funding-beta/list-funding-withdrawals

/openapi/funding-beta.yaml get /funding/v1/withdrawals
Retrieve information about withdrawals. Results are sorted by recency; use the `cursor` parameter to iterate through the list of withdrawals (page size equal to the value of `limit`) from newest to oldest.

**API Key Permissions Required:** `Funds permissions - Query`



# Update Funding Address
Source: https://docs.kraken.com/api-reference/funding-beta/update-funding-address

/openapi/funding-beta.yaml put /funding/v1/addresses/{id}
Update the name and/or description of a saved withdrawal address.

**API Key Permissions Required:** `Funds permissions - Add withdrawal addresses`



# Get Deposit Addresses
Source: https://docs.kraken.com/api-reference/funding/get-deposit-addresses

/openapi/spot-rest.yaml post /private/DepositAddresses
This endpoint will remain active but will no longer receive updates. It's highly recommended to migrate to the Funding (Beta) API — see the [Funding guide](/exchange/guides/rest/funding) and [API reference](/api-reference/funding-beta/list-funding-methods).

Retrieve (or generate a new) deposit addresses for a particular asset and method.

**API Key Permissions Required:** `Funds permissions - Query`




# Get Deposit Methods
Source: https://docs.kraken.com/api-reference/funding/get-deposit-methods

/openapi/spot-rest.yaml post /private/DepositMethods
This endpoint will remain active but will no longer receive updates. It's highly recommended to migrate to the Funding (Beta) API — see the [Funding guide](/exchange/guides/rest/funding) and [API reference](/api-reference/funding-beta/list-funding-methods).

Retrieve methods available for depositing a particular asset.

**API Key Permissions Required:** `Funds permissions - Query` and `Funds permissions - Deposit`




# Get Status of Recent Deposits
Source: https://docs.kraken.com/api-reference/funding/get-status-of-recent-deposits

/openapi/spot-rest.yaml post /private/DepositStatus
This endpoint will remain active but will no longer receive updates. It's highly recommended to migrate to the Funding (Beta) API — see the [Funding guide](/exchange/guides/rest/funding) and [API reference](/api-reference/funding-beta/list-funding-methods).

Retrieve information about recent deposits. Results are sorted by recency, use the `cursor` parameter to iterate through list of deposits (page size equal to value of `limit`) from newest to oldest.
**API Key Permissions Required:** `Funds permissions - Query`




# Get Status of Recent Withdrawals
Source: https://docs.kraken.com/api-reference/funding/get-status-of-recent-withdrawals

/openapi/spot-rest.yaml post /private/WithdrawStatus
This endpoint will remain active but will no longer receive updates. It's highly recommended to migrate to the Funding (Beta) API — see the [Funding guide](/exchange/guides/rest/funding) and [API reference](/api-reference/funding-beta/list-funding-methods).

Retrieve information about recent withdrawals. Results are sorted by recency, use the `cursor` parameter to iterate through list of withdrawals (page size equal to value of `limit`) from newest to oldest.

**API Key Permissions Required:** `Funds permissions - Withdraw` or `Data - Query ledger entries`




# Get Withdrawal Addresses
Source: https://docs.kraken.com/api-reference/funding/get-withdrawal-addresses

/openapi/spot-rest.yaml post /private/WithdrawAddresses
This endpoint will remain active but will no longer receive updates. It's highly recommended to migrate to the Funding (Beta) API — see the [Funding guide](/exchange/guides/rest/funding) and [API reference](/api-reference/funding-beta/list-funding-methods).

Retrieve a list of withdrawal addresses available for the user.

**API Key Permissions Required:** `Funds permissions - Query` and `Funds permissions - Withdraw`




# Get Withdrawal Information
Source: https://docs.kraken.com/api-reference/funding/get-withdrawal-information

/openapi/spot-rest.yaml post /private/WithdrawInfo
This endpoint will remain active but will no longer receive updates. It's highly recommended to migrate to the Funding (Beta) API — see the [Funding guide](/exchange/guides/rest/funding) and [API reference](/api-reference/funding-beta/list-funding-methods).

Retrieve fee information about potential withdrawals for a particular asset, key and amount.

**API Key Permissions Required:** `Funds permissions - Query` and `Funds permissions - Withdraw`




# Get Withdrawal Methods
Source: https://docs.kraken.com/api-reference/funding/get-withdrawal-methods

/openapi/spot-rest.yaml post /private/WithdrawMethods
This endpoint will remain active but will no longer receive updates. It's highly recommended to migrate to the Funding (Beta) API — see the [Funding guide](/exchange/guides/rest/funding) and [API reference](/api-reference/funding-beta/list-funding-methods).

Retrieve a list of withdrawal methods available for the user.

**API Key Permissions Required:** `Funds permissions - Query` and `Funds permissions - Withdraw`




# Request Wallet Transfer
Source: https://docs.kraken.com/api-reference/funding/request-wallet-transfer

/openapi/spot-rest.yaml post /private/WalletTransfer
This endpoint will remain active but will no longer receive updates. It's highly recommended to migrate to the Funding (Beta) API — see the [Funding guide](/exchange/guides/rest/funding) and [API reference](/api-reference/funding-beta/list-funding-methods).

Transfer from a Kraken spot wallet to a Kraken Futures wallet. Note that a transfer in the other direction must be requested via the Kraken Futures API endpoint for [withdrawals to Spot wallets](../futures-api/trading/withdrawal).

**API Key Permissions Required:** `Funds permissions - Query`




# Request Withdrawal Cancellation
Source: https://docs.kraken.com/api-reference/funding/request-withdrawal-cancellation

/openapi/spot-rest.yaml post /private/WithdrawCancel
This endpoint will remain active but will no longer receive updates. It's highly recommended to migrate to the Funding (Beta) API — see the [Funding guide](/exchange/guides/rest/funding) and [API reference](/api-reference/funding-beta/list-funding-methods).

Cancel a recently requested withdrawal, if it has not already been successfully processed.

**API Key Permissions Required:** `Funds permissions - Withdraw`, unless withdrawal is a `WalletTransfer`, then no permissions are required.




# Withdraw Funds
Source: https://docs.kraken.com/api-reference/funding/withdraw-funds

/openapi/spot-rest.yaml post /private/Withdraw
This endpoint will remain active but will no longer receive updates. It's highly recommended to migrate to the Funding (Beta) API — see the [Funding guide](/exchange/guides/rest/funding) and [API reference](/api-reference/funding-beta/list-funding-methods).

Make a withdrawal request.    

**API Key Permissions Required:** `Funds permissions - Withdraw`




# Get notifications
Source: https://docs.kraken.com/api-reference/general/get-notifications

/openapi/futures-rest.yaml get /notifications
This endpoint provides the platform's notifications.



# Get your fills
Source: https://docs.kraken.com/api-reference/historical-data/get-your-fills

/openapi/futures-rest.yaml get /fills
This endpoint returns information on your filled orders for all futures contracts.



# Historical funding rates
Source: https://docs.kraken.com/api-reference/historical-funding-rates/historical-funding-rates

/openapi/futures-rest.yaml get /historical-funding-rates
Returns list of historical funding rates for given market.



# Get instrument status
Source: https://docs.kraken.com/api-reference/instrument-details/get-instrument-status

/openapi/futures-rest.yaml get /instruments/{symbol}/status
Returns price dislocation and volatility details for given market.



# Get instrument status list
Source: https://docs.kraken.com/api-reference/instrument-details/get-instrument-status-list

/openapi/futures-rest.yaml get /instruments/status
Returns price dislocation and volatility details for all markets.



# Get instruments
Source: https://docs.kraken.com/api-reference/instrument-details/get-instruments

/openapi/futures-rest.yaml get /instruments
Returns specifications for all currently listed markets and indices.



# Get trading instruments
Source: https://docs.kraken.com/api-reference/instrument-details/get-trading-instruments

/openapi/futures-rest.yaml get /trading/instruments
Returns specifications for all currently accessible markets and indices.



# Get Asset Info
Source: https://docs.kraken.com/api-reference/market-data/get-asset-info

/openapi/spot-rest.yaml get /public/Assets
Get information about the assets that are available for deposit, withdrawal, trading and earn.




# Get Grouped Order Book
Source: https://docs.kraken.com/api-reference/market-data/get-grouped-order-book

/openapi/spot-rest.yaml get /public/GroupedBook
The GroupedBook endpoint aggregates the volume in the order book over a specified tick range. 
It provides a summary of liquidity deep into the book, useful for user interface display.

Bids and asks between grouped price levels are accumulated to the nearest passive level (asks rounded up, bids down).




# Get OHLC Data
Source: https://docs.kraken.com/api-reference/market-data/get-ohlc-data

/openapi/spot-rest.yaml get /public/OHLC
Retrieve OHLC market data.
The last entry in the OHLC array is for the current, not-yet-committed timeframe, and will always be present, regardless of the value of `since`.
Returns up to 720 of the most recent entries (older data cannot be retrieved, regardless of the value of `since`).




# Get Order Book
Source: https://docs.kraken.com/api-reference/market-data/get-order-book

/openapi/spot-rest.yaml get /public/Depth
Returns level 2 (L2) order book, which describes the individual price levels in the book with aggregated order quantities at each level.




# Get orderbook
Source: https://docs.kraken.com/api-reference/market-data/get-orderbook

/openapi/futures-rest.yaml get /orderbook
This endpoint returns the entire non-cumulative order book of currently listed Futures
contracts.



# Get Recent Spreads
Source: https://docs.kraken.com/api-reference/market-data/get-recent-spreads

/openapi/spot-rest.yaml get /public/Spread
Returns the last ~200 top-of-book spreads for a given pair




# Get Recent Trades
Source: https://docs.kraken.com/api-reference/market-data/get-recent-trades

/openapi/spot-rest.yaml get /public/Trades
Returns the last 1000 trades by default




# Get Server Time
Source: https://docs.kraken.com/api-reference/market-data/get-server-time

/openapi/spot-rest.yaml get /public/Time
Get the server's time.




# Get System Status
Source: https://docs.kraken.com/api-reference/market-data/get-system-status

/openapi/spot-rest.yaml get /public/SystemStatus
Get the current system status or trading mode.




# Get ticker by symbol
Source: https://docs.kraken.com/api-reference/market-data/get-ticker-by-symbol

/openapi/futures-rest.yaml get /tickers/{symbol}
Get market data for contract or index by symbol



# Get Ticker Information
Source: https://docs.kraken.com/api-reference/market-data/get-ticker-information

/openapi/spot-rest.yaml get /public/Ticker
Get ticker information for all or requested markets. To clarify usage, note that 
* Today's prices start at midnight UTC
* Leaving the pair parameter blank will return tickers for all tradeable assets on Kraken




# Get tickers
Source: https://docs.kraken.com/api-reference/market-data/get-tickers

/openapi/futures-rest.yaml get /tickers
This endpoint returns current market data for all currently listed Futures contracts and
indices.



# Get Tradable Asset Pairs
Source: https://docs.kraken.com/api-reference/market-data/get-tradable-asset-pairs

/openapi/spot-rest.yaml get /public/AssetPairs
Get tradable asset pairs




# Get trade history
Source: https://docs.kraken.com/api-reference/market-data/get-trade-history

/openapi/futures-rest.yaml get /history
This endpoint returns the most recent 100 trades prior to the specified `lastTime` value up
to past 7 days or recent trading engine restart (whichever is sooner).

If no `lastTime` specified, it will return 100 most recent trades.



# Query L3 Order Book
Source: https://docs.kraken.com/api-reference/market-data/query-l3-order-book

/openapi/spot-rest.yaml post /private/Level3
Retrieve Level3 order book data, which provides individual order information at each price level.
This includes order IDs and timestamps for each order in the book. 

The Level3 endpoint requires authentication.

**API Key Permissions Required:** `Orders and trades - Query open orders & trades`




# Get public execution events
Source: https://docs.kraken.com/api-reference/market-history/get-public-execution-events

/openapi/futures-history-rest.yaml get /market/{tradeable}/executions
Lists trades for a market.




# Get public mark price events
Source: https://docs.kraken.com/api-reference/market-history/get-public-mark-price-events

/openapi/futures-history-rest.yaml get /market/{tradeable}/price
Lists price events for a market.




# Get public order events
Source: https://docs.kraken.com/api-reference/market-history/get-public-order-events

/openapi/futures-history-rest.yaml get /market/{tradeable}/orders
Lists order events for a market.




# Get leverage settings
Source: https://docs.kraken.com/api-reference/multi-collateral/get-leverage-settings

/openapi/futures-rest.yaml get /leveragepreferences
Returns list of configured leverage preferences.



# Get PNL currency preferences
Source: https://docs.kraken.com/api-reference/multi-collateral/get-pnl-currency-preferences

/openapi/futures-rest.yaml get /pnlpreferences
The PNL currency preference is used to determine which currency to pay out when realizing
PNL gains.



# Set leverage settings
Source: https://docs.kraken.com/api-reference/multi-collateral/set-leverage-settings

/openapi/futures-rest.yaml put /leveragepreferences
Sets a contract's margin mode, either "isolated" or "cross" margin.

When specifying a max leverage, the contract's margin mode will be isolated.

Calling this endpoint can result in the following error codes:
- 87: Contract does not exist
- 88: Contract not a multi-collateral futures contract
- 41: Would cause liquidation



# Set PNL currency preference
Source: https://docs.kraken.com/api-reference/multi-collateral/set-pnl-currency-preference

/openapi/futures-rest.yaml put /pnlpreferences
The PNL currency preference is used to determine which currency to pay out when realizing
PNL gains. Calling this API can result in the following error codes:


  87: Contract does not exist

  88: Contract not a multi-collateral futures contract

  89: Currency does not exist

  90: Currency is not enabled for multi-collateral futures

  41: Would cause liquidation



# Batch order management
Source: https://docs.kraken.com/api-reference/order-management/batch-order-management

/openapi/futures-rest.yaml post /batchorder
This endpoint allows sending limit or stop order(s) and/or cancelling open order(s) and/or
editing open order(s) for a currently listed Futures contract in batch.

When editing an order, if the `trailingStopMaxDeviation` and `trailingStopDeviationUnit`
parameters are sent unchanged, the system will recalculate a new stop price upon successful
order modification.



# Cancel all orders
Source: https://docs.kraken.com/api-reference/order-management/cancel-all-orders

/openapi/futures-rest.yaml post /cancelallorders
This endpoint allows cancelling orders which are associated with a future's contract or a
margin account. If no arguments are specified all open orders will be cancelled.



# Cancel order
Source: https://docs.kraken.com/api-reference/order-management/cancel-order

/openapi/futures-rest.yaml post /cancelorder
This endpoint allows cancelling an open order for a Futures contract.



# Dead man's switch
Source: https://docs.kraken.com/api-reference/order-management/dead-mans-switch

/openapi/futures-rest.yaml post /cancelallordersafter
This endpoint provides a Dead Man's Switch mechanism to protect the user from network malfunctions. The user can send a request with a timeout in seconds which will trigger a countdown timer that will cancel all user orders when timeout expires. The user has to keep sending request to push back the timeout expiration or they can deactivate the mechanism by specifying a timeout of zero (0).

The recommended mechanism usage is making a call every 15 to 20 seconds and provide a timeout of 60 seconds. This allows the user to keep the orders in place on a brief network failure, while keeping them safe in case of a network breakdown.



# Edit order
Source: https://docs.kraken.com/api-reference/order-management/edit-order

/openapi/futures-rest.yaml post /editorder
This endpoint allows editing an existing order for a currently listed Futures contract.

When editing an order, if the `trailingStopMaxDeviation` and `trailingStopDeviationUnit`
parameters are sent unchanged, the system will recalculate a new stop price upon successful
order modification.



# Get open orders
Source: https://docs.kraken.com/api-reference/order-management/get-open-orders

/openapi/futures-rest.yaml get /openorders
This endpoint returns information on all open orders for all Futures contracts.



# Get Specific Orders' Status
Source: https://docs.kraken.com/api-reference/order-management/get-specific-orders-status

/openapi/futures-rest.yaml post /orders/status
Returns information on specified orders which are open or were filled/cancelled in the last
5 seconds.



# Send order
Source: https://docs.kraken.com/api-reference/order-management/send-order

/openapi/futures-rest.yaml post /sendorder
This endpoint allows sending a limit, stop, take profit or immediate-or-cancel order for a
currently listed Futures contract.



# Create a paylink code
Source: https://docs.kraken.com/api-reference/paylink/create-a-paylink-code

/openapi/pay-rest.yaml post /private/Pay/paylink/create
This method is asynchronous, it will not return the generated code. After calling, the `external_id` must then be used to query the code using `getPaylinkCode`.

**API Key Permissions Required:** `Funds permissions - Query` and `Funds permissions - Withdraw`




# Get paylink configuration
Source: https://docs.kraken.com/api-reference/paylink/get-paylink-configuration

/openapi/pay-rest.yaml post /private/Pay/paylink/config
Get paylink configuration

**API Key Permissions Required:** `Funds permissions - Query`




# Get the generated paylink code
Source: https://docs.kraken.com/api-reference/paylink/get-the-generated-paylink-code

/openapi/pay-rest.yaml post /private/Pay/paylink/get
If the code has not been generated yet, this method will return an error indicating this.

**API Key Permissions Required:** `Funds permissions - Query`




# Check OTC Eligibility
Source: https://docs.kraken.com/api-reference/quotes/check-otc-eligibility

/openapi/otc-rest.yaml post /private/CheckOtcClient
Retrieves the client permissions for the OTC Portal.

**API Key Permissions Required:** `Funds permissions - Query` and `Funds permissions - Deposit`




# Create OTC Quote
Source: https://docs.kraken.com/api-reference/quotes/create-otc-quote

/openapi/otc-rest.yaml post /private/CreateOtcQuoteRequest
Creates a new OTC request for quote.

**API Key Permissions Required:** `Orders and trades - Create & modify orders`




# Get OTC Active Quotes
Source: https://docs.kraken.com/api-reference/quotes/get-otc-active-quotes

/openapi/otc-rest.yaml post /private/GetOtcActiveQuotes
Retrieves a list of active OTC quotes.

**API Key Permissions Required:** `Orders and trades - Query open orders & trades`




# Get OTC Exposures
Source: https://docs.kraken.com/api-reference/quotes/get-otc-exposures

/openapi/otc-rest.yaml post /private/GetOtcExposures
Retrieves the max and used OTC exposures.

**API Key Permissions Required:** `Orders and trades - Query open orders & trades`




# Get OTC Historical Quotes
Source: https://docs.kraken.com/api-reference/quotes/get-otc-historical-quotes

/openapi/otc-rest.yaml post /private/GetOtcHistoricalQuotes
Retrieves OTC quotes history.

**API Key Permissions Required:** `Orders and trades - Query open orders & trades`




# Get OTC Pairs
Source: https://docs.kraken.com/api-reference/quotes/get-otc-pairs

/openapi/otc-rest.yaml post /private/GetOtcPairs
Retrieves the list of OTC trading pairs.

**API Key Permissions Required:** `Funds permissions - Query` and `Funds permissions - Deposit`




# Update OTC Quote
Source: https://docs.kraken.com/api-reference/quotes/update-otc-quote

/openapi/otc-rest.yaml post /private/UpdateOtcQuote
Accepts or rejects an OTC quote.

**API Key Permissions Required:** `Orders and trades - Create & modify orders`




# Cancel a payment request
Source: https://docs.kraken.com/api-reference/request/cancel-a-payment-request

/openapi/pay-rest.yaml post /private/Pay/request/cancel
Cancel a payment request

**API Key Permissions Required:** `Funds permissions - Query`




# Create a payment request
Source: https://docs.kraken.com/api-reference/request/create-a-payment-request

/openapi/pay-rest.yaml post /private/Pay/request/create
Create a payment request

**API Key Permissions Required:** `Funds permissions - Deposit`




# Accept an offer on an open RFQ
Source: https://docs.kraken.com/api-reference/rfqs/accept-an-offer-on-an-open-rfq

/openapi/futures-rest.yaml post /rfqs/open-rfqs/accept-offer/{rfqUid}
Accept an offer on a specific open RFQ created by the authenticated account.
Exactly one of `bidAccepted` or `askAccepted` must be provided.

Note: This is currently available exclusively in the Kraken pre-prod environments.



# Cancel an open RFQ
Source: https://docs.kraken.com/api-reference/rfqs/cancel-an-open-rfq

/openapi/futures-rest.yaml delete /rfqs/open-rfqs/{rfqUid}
Cancel a specific open RFQ created by the authenticated account.

Note: This is currently available exclusively in the Kraken pre-prod environments.



# Cancel open offer on open RFQ
Source: https://docs.kraken.com/api-reference/rfqs/cancel-open-offer-on-open-rfq

/openapi/futures-rest.yaml delete /rfqs/cancel-offer/{rfqUid}
Cancel the current open offer on the specified open RFQ.

Note: This is currently available exclusively in the Kraken pre-prod environments.



# Create a new RFQ
Source: https://docs.kraken.com/api-reference/rfqs/create-a-new-rfq

/openapi/futures-rest.yaml post /rfqs/open-rfqs
Create a new RFQ for the authenticated account.

Note: This is currently available exclusively in the Kraken pre-prod environments.



# List all open RFQs
Source: https://docs.kraken.com/api-reference/rfqs/list-all-open-rfqs

/openapi/futures-rest.yaml get /rfqs
Retrieve all currently open RFQs

Note: This is currently available exclusively in the Kraken pre-prod environments.



# List offers placed by the account on closed RFQs
Source: https://docs.kraken.com/api-reference/rfqs/list-offers-placed-by-the-account-on-closed-rfqs

/openapi/futures-rest.yaml get /rfqs/closed-offers
Retrieve all offers the account placed on RFQs that have since closed. The `status` field
on each offer indicates how the parent RFQ closed (`expired`, `cancelled`,
`filled_bid_side`, or `filled_ask_side`).

Closed RFQs are tracked in an in-memory cache only and are not persisted; offers may be
evicted by the cache eviction policy or wiped on service restart.

Note: This is currently available exclusively in the Kraken pre-prod environments.



# List open offers on open RFQs
Source: https://docs.kraken.com/api-reference/rfqs/list-open-offers-on-open-rfqs

/openapi/futures-rest.yaml get /rfqs/open-offers
Retrieve all open offers for the account on currently open RFQs

Note: This is currently available exclusively in the Kraken pre-prod environments.



# List open RFQs for account
Source: https://docs.kraken.com/api-reference/rfqs/list-open-rfqs-for-account

/openapi/futures-rest.yaml get /rfqs/open-rfqs
Retrieve all currently open RFQs created by the authenticated account.

Note: This is currently available exclusively in the Kraken pre-prod environments.



# Place new offer on an open RFQ
Source: https://docs.kraken.com/api-reference/rfqs/place-new-offer-on-an-open-rfq

/openapi/futures-rest.yaml post /rfqs/place-offer/{rfqUid}
Place a new offer on the specified open RFQ. At least one of bid or ask must be provided.

Note: This is currently available exclusively in the Kraken pre-prod environments.



# Retrieve a single RFQ (open or recently closed)
Source: https://docs.kraken.com/api-reference/rfqs/retrieve-a-single-rfq-open-or-recently-closed

/openapi/futures-rest.yaml get /rfqs/{rfqUid}
Retrieve a specific RFQ by its unique identifier. Returns currently open RFQs as well as
recently closed RFQs that are still held in the in-memory closed-RFQ cache. The `status`
field on the response distinguishes the lifecycle state (`open`, `expired`, `cancelled`,
`filled_bid_side`, or `filled_ask_side`).

Closed RFQs are kept in memory only and are not persisted; entries may be evicted by the
cache eviction policy or wiped on service restart.

Note: This is currently available exclusively in the Kraken pre-prod environments.



# Create Prime Settlement Batch
Source: https://docs.kraken.com/api-reference/settlement/create-prime-settlement-batch

/openapi/prime-rest.yaml post /0/private/CreatePrimeSettlementBatch
Creates a new Prime settlement batch from pending unsettled trades. Only one active batch per `asset_kind` can exist at a time.

Optionally pass `asset_kind` in the request body to select which trades to include: `currency` (fiat and cryptocurrency positions; default) or `tokenized_equity` (tokenized equity positions).

The response includes `trade_ids` — the trade IDs captured in the batch.

**API Key Permissions Required:** `Orders and trades - Create & modify orders`




# Get Prime Settlement Batch
Source: https://docs.kraken.com/api-reference/settlement/get-prime-settlement-batch

/openapi/prime-rest.yaml post /0/private/GetPrimeSettlementBatch
Retrieves a specific Prime settlement batch by its ID, including all legs, their current settlement status,
external transfers that have settled each leg, and the trade IDs in the batch.

**API Key Permissions Required:** `Orders and trades - Query open orders & trades`




# List Prime Settlement Batches
Source: https://docs.kraken.com/api-reference/settlement/list-prime-settlement-batches

/openapi/prime-rest.yaml post /0/private/ListPrimeSettlementBatches
Retrieves a list of Prime settlement batches, optionally filtered by status and time range. Results are sorted by creation time, most recent first.

**API Key Permissions Required:** `Orders and trades - Query open orders & trades`




# Settle Prime Settlement Batch Asset
Source: https://docs.kraken.com/api-reference/settlement/settle-prime-settlement-batch-asset

/openapi/prime-rest.yaml post /0/private/SettlePrimeSettlementBatchAsset
Initiates settlement of a specific asset leg within a Prime settlement batch. The batch must be confirmed and the leg must be eligible for settlement (check `can_settle` on the leg).

**API Key Permissions Required:** `Orders and trades - Create & modify orders`




# Account Transfer
Source: https://docs.kraken.com/api-reference/subaccounts/account-transfer

/openapi/spot-rest.yaml post /private/AccountTransfer
Transfer funds to and from master and subaccounts. **Note:** `AccountTransfer` must be called using an API key from the master account.

**API Key Permissions Required:** `Funds permissions - Withdraw`




# Check subaccount trading status
Source: https://docs.kraken.com/api-reference/subaccounts/check-subaccount-trading-status

/openapi/futures-rest.yaml get /subaccount/{subaccountUid}/trading-enabled
Returns trading capability info for given subaccount.



# Create Subaccount
Source: https://docs.kraken.com/api-reference/subaccounts/create-subaccount

/openapi/spot-rest.yaml post /private/CreateSubaccount
Create a trading subaccount. **Note:** `CreateSubaccount` must be called using an API key from the master account.

**API Key Permissions Required:** `Funds permissions - Withdraw`




# Get subaccounts
Source: https://docs.kraken.com/api-reference/subaccounts/get-subaccounts

/openapi/futures-rest.yaml get /subaccounts
Return information about subaccounts, including balances and UIDs.



# Update subaccount trading status
Source: https://docs.kraken.com/api-reference/subaccounts/update-subaccount-trading-status

/openapi/futures-rest.yaml put /subaccount/{subaccountUid}/trading-enabled
Updates trading capabilities for given subaccount.



# Get self trade strategy
Source: https://docs.kraken.com/api-reference/trading-settings/get-self-trade-strategy

/openapi/futures-rest.yaml get /self-trade-strategy
Returns account-wide self-trade matching strategy.



# Update self trade strategy
Source: https://docs.kraken.com/api-reference/trading-settings/update-self-trade-strategy

/openapi/futures-rest.yaml put /self-trade-strategy
Updates account-wide self-trade matching behavior to given strategy.



# Add Order
Source: https://docs.kraken.com/api-reference/trading/add-order

/openapi/spot-rest.yaml post /private/AddOrder
Place a new order.

**Note**: See the [AssetPairs](/docs/rest-api/get-tradable-asset-pairs) endpoint for details on the available trading pairs, their price and quantity precisions, order minimums, available leverage, etc.

**API Key Permissions Required:** `Orders and trades - Create & modify orders`




# Add Order Batch
Source: https://docs.kraken.com/api-reference/trading/add-order-batch

/openapi/spot-rest.yaml post /private/AddOrderBatch
Sends a collection of orders (minimum of 2 and maximum 15): 
* Validation is performed on the whole batch prior to submission to the engine. If an order fails validation, the whole batch will be rejected.
* On submission to the engine, if an order fails pre-match checks (i.e. funding), then the individual order will be rejected and remainder of the batch will be processed. 
* All orders in batch are limited to a single pair.

**Note**: See the [AssetPairs](/docs/rest-api/get-tradable-asset-pairs) endpoint for details on the available trading pairs, their price and quantity precisions, order minimums, available leverage, etc.

**API Key Permissions Required:** `Orders and trades - Create & modify orders` and `Orders and trades - Cancel & close orders`




# Amend Order
Source: https://docs.kraken.com/api-reference/trading/amend-order

/openapi/spot-rest.yaml post /private/AmendOrder
The amend request enables clients to modify the order parameters in-place without the need to cancel the existing order and create a new one.

* The order identifiers assigned by Kraken and/or client will stay the same.
* Queue priority in the order book will be maintained where possible. 
* If an amend request will reduce the order quantity below the existing filled quantity, the remaining quantity will be cancelled.

For more detail, see [amend transaction guide](/docs/guides/spot-amends).

**API Key Permissions Required:** `Orders and trades - Create & modify orders` or `Orders and trades - Cancel & close orders`




# Cancel All Orders
Source: https://docs.kraken.com/api-reference/trading/cancel-all-orders

/openapi/spot-rest.yaml post /private/CancelAll
Cancel all open orders

**API Key Permissions Required:** `Orders and trades - Create & modify orders` or `Orders and trades - Cancel & close orders`




# Cancel All Orders After X
Source: https://docs.kraken.com/api-reference/trading/cancel-all-orders-after-x

/openapi/spot-rest.yaml post /private/CancelAllOrdersAfter
CancelAllOrdersAfter provides a "Dead Man's Switch" mechanism to protect the client from network malfunction, extreme latency or unexpected matching engine downtime. The client can send a request with a timeout (in seconds), that will start a countdown timer which will cancel *all* client orders when the timer expires. The client has to keep sending new requests to push back the trigger time, or deactivate the mechanism by specifying a timeout of 0. If the timer expires, all orders are cancelled and then the timer remains disabled until the client provides a new (non-zero) timeout.

The recommended use is to make a call every 15 to 30 seconds, providing a timeout of 60 seconds. This allows the client to keep the orders in place in case of a brief disconnection or transient delay, while keeping them safe in case of a network breakdown. It is also recommended to disable the timer ahead of regularly scheduled trading engine maintenance (if the timer is enabled, all orders will be cancelled when the trading engine comes back from downtime - planned or otherwise).

**API Key Permissions Required:** `Orders and trades - Create & modify orders` or `Orders and trades - Cancel & close orders`




# Cancel Order
Source: https://docs.kraken.com/api-reference/trading/cancel-order

/openapi/spot-rest.yaml post /private/CancelOrder
Cancel a particular open order (or set of open orders) by `txid`, `userref` or `cl_ord_id`

**API Key Permissions Required:** `Orders and trades - Create & modify orders` or `Orders and trades - Cancel & close orders`




# Cancel Order Batch
Source: https://docs.kraken.com/api-reference/trading/cancel-order-batch

/openapi/spot-rest.yaml post /private/CancelOrderBatch
Cancel multiple open orders  by `txid`, `userref` or `cl_ord_id`(maximum 50 total unique IDs/references)

**API Key Permissions Required:** `Orders and trades - Create & modify orders` or `Orders and trades - Cancel & close orders`




# Edit Order
Source: https://docs.kraken.com/api-reference/trading/edit-order

/openapi/spot-rest.yaml post /private/EditOrder
Sends a request to edit the order parameters of a live order. When an order has been successfully modified, the original order will be cancelled and a new order will be 
created with the adjusted parameters a new `txid` will be returned in the response.

**Note:** The new [AmendOrder](/exchange/guides/general/amends) endpoint resolves the caveats listed below and has additional performance gains.

Caveats for `EditOrder`:
* Triggered stop loss or take profit orders are not supported.
* Orders with conditional close terms attached are not supported.
* Orders where the executed volume is greater than the newly supplied volume will be rejected.
* `cl_ord_id` is not supported.
* Existing executions are associated with the original order and not copied to the amended order.
* Queue position will not be maintained.

**API Key Permissions Required:** `Orders and trades - Create & modify orders` and `Orders and trades - Cancel & close orders`




# Get Websockets Token
Source: https://docs.kraken.com/api-reference/trading/get-websockets-token

/openapi/spot-rest.yaml post /private/GetWebSocketsToken
An authentication token must be requested via this REST API endpoint in order to connect to and authenticate with our [Websockets API](../guides/spot-ws-auth). The token should be used within 15 minutes of creation, but it does not expire once a successful Websockets connection and private subscription has been made and is maintained.

**API Key Permissions Required:** `WebSocket interface - On`




# Cancel a pay transfer or an unclaimed paylink
Source: https://docs.kraken.com/api-reference/transfer/cancel-a-pay-transfer-or-an-unclaimed-paylink

/openapi/pay-rest.yaml post /private/Pay/transfer/cancel
Cancel a pay transfer or an **unclaimed** paylink

**API Key Permissions Required:** `Funds permissions - Query`




# Create a pay transfer
Source: https://docs.kraken.com/api-reference/transfer/create-a-pay-transfer

/openapi/pay-rest.yaml post /private/Pay/transfer/create
This method is asynchronous, your callback will be sent the `external_id` and the `status` when it reaches a final state.

**API Key Permissions Required:** `Funds permissions - Query` and `Funds permissions - Withdraw`




# Initiate sub account transfer
Source: https://docs.kraken.com/api-reference/transfers/initiate-sub-account-transfer

/openapi/futures-rest.yaml post /transfer/subaccount
This endpoint allows you to transfer funds between the current account and a sub account,
between two margin accounts with the same collateral currency, or between a margin account
and your cash account.



# Initiate wallet transfer
Source: https://docs.kraken.com/api-reference/transfers/initiate-wallet-transfer

/openapi/futures-rest.yaml post /transfer
This endpoint allows you to transfer funds between two margin accounts with the same
collateral currency, or between a margin account and your cash account.



# Initiate withdrawal to Spot wallet
Source: https://docs.kraken.com/api-reference/transfers/initiate-withdrawal-to-spot-wallet

/openapi/futures-rest.yaml post /withdrawal
This endpoint allows you to request to withdraw digital assets to your Kraken Spot wallet.

Wallet names can be found in the 'accounts' structure in the Get Wallets /accounts response.



# Post-Trade Data
Source: https://docs.kraken.com/api-reference/transparency/post-trade-data

/openapi/spot-rest.yaml get /public/PostTrade
Returns a list of trades on the spot exchange. 
If no filter parameters are specified, the last 1000 trades for all pairs are received.




# Pre-Trade Data
Source: https://docs.kraken.com/api-reference/transparency/pre-trade-data

/openapi/spot-rest.yaml get /public/PreTrade
Returns the price levels in the order book with aggregated order quantities at each price level. 
The top 10 levels are returned for each trading pair.




# Derivatives WebSocket
Source: https://docs.kraken.com/exchange/api-reference/futures-websocket

Real-time market data and account streaming for the Kraken Derivatives WebSocket API

Real-time market data and streaming account updates for Kraken's
Derivatives market.

<Note>
  Derivatives WebSocket is **streaming-only**. Order entry on Derivatives
  is handled via the [Derivatives REST
  API](/exchange/guides/futures/rest) or the
  [Unified FIX API](/exchange/api-reference/unified-fix). For end-to-end
  guidance, see the
  [Derivatives Introduction](/exchange/guides/futures/introduction).
</Note>

## Endpoint

```text theme={null}
wss://futures.kraken.com/ws/v1
```

A colocated endpoint is available alongside the Derivatives REST and
Unified FIX surfaces. Connection details are provided during
onboarding.

## Authentication

Private feeds use a signed-challenge model:

1. Connect to the WebSocket endpoint.
2. Request a challenge using your `api_key`.
3. Sign the challenge with your `api_secret` (SHA-256 → HMAC-SHA-512 →
   Base64).
4. Include both `original_challenge` and `signed_challenge` in every
   `subscribe`/`unsubscribe` for private feeds.

The signing flow is documented in full in the [Derivatives WebSocket
guide](/exchange/guides/futures/websockets#sign-challenge).

## Quick start

<CardGroup>
  <Card title="book (L2)" icon="layer-group" href="/exchange/api-reference/futures-websocket/book">
    Order book snapshots and incremental updates.
  </Card>

  <Card title="ticker" icon="chart-line" href="/exchange/api-reference/futures-websocket/ticker">
    Best-bid / best-offer with funding and mark.
  </Card>

  <Card title="open_orders" icon="receipt" href="/exchange/api-reference/futures-websocket/open_orders">
    Private open-order snapshot and updates.
  </Card>

  <Card title="fills" icon="circle-check" href="/exchange/api-reference/futures-websocket/fills">
    Per-fill execution stream.
  </Card>
</CardGroup>

The complete public catalog (`book`, `ticker`, `ticker_lite`, `trade`,
`heartbeat`) and private catalog (`open_orders`,
`open_orders_verbose`, `open_position`, `balances`, `fills`,
`account_log`, `notifications`, `challenge`) is available in the
**Derivatives WebSocket** dropdown in the left navigation.

## Connection management

Send a ping at least every 60 seconds to keep the connection open. On
reconnect, re-issue subscribe requests for each feed; most feeds send a
fresh snapshot followed by incremental updates.

## Related

<CardGroup>
  <Card title="Derivatives WebSocket guide" icon="bolt" href="/exchange/guides/futures/websockets">
    Authentication flow, subscribe/unsubscribe semantics.
  </Card>

  <Card title="Derivatives Introduction" icon="book" href="/exchange/guides/futures/introduction">
    Endpoints, protocols, and surface overview.
  </Card>

  <Card title="Derivatives REST" icon="code" href="/exchange/guides/futures/rest">
    Order entry and account-data endpoints.
  </Card>

  <Card title="Unified FIX" icon="terminal" href="/exchange/api-reference/unified-fix">
    Lowest-latency order entry across Spot + Derivatives.
  </Card>

  <Card title="Choose your protocol" icon="code-compare" href="/exchange/guides/general/api-comparison">
    REST vs WebSocket vs FIX — sequencing and cancel scope.
  </Card>
</CardGroup>


# Account Log
Source: https://docs.kraken.com/exchange/api-reference/futures-websocket/account_log

Subscribe to account log information

<div>
  <span>WSS</span>
  <span>futures.kraken.com/ws/v1</span>
  <span>account\_log</span>
</div>

This subscription feed publishes account information.

***

## Request

<ResponseField name="event" type="string">
  `subscribe` or `unsubscribe`
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `account_log`
</ResponseField>

<ResponseField name="api_key" type="string">
  The user API key.
</ResponseField>

<ResponseField name="original_challenge" type="string">
  The message that is received from a challenge request.
</ResponseField>

<ResponseField name="signed_challenge" type="string">
  The signed challenge message with user API secret.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribe",
    "feed": "account_log",
    "api_key": "CMl2SeSn09Tz+2tWuzPiPUjaXEQRGq6qv5UaexXuQ3SnahDQU/gO3aT+",
    "original_challenge": "226aee50-88fc-4618-a42a-34f7709570b2",
    "signed_challenge": "RE0DVOc7vS6pzcEjGWd/WJRRBWb54RkyvV+AZQSRl4+rap8Rlk64diR+Z9DQILm7qxncswMmJyvP/2vgzqqh+g=="
  }
  ```
</CodeGroup>

***

## Response Success

<ResponseField name="event" type="string">
  <span>One of:</span> `subscribed`, `subscribed_failed`, `unsubscribed`, `unsubscribed_failed`

  The result.
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `account_log`
</ResponseField>

<ResponseField name="api_key" type="string">
  The user API key.
</ResponseField>

<ResponseField name="original_challenge" type="string">
  The message that is received from a challenge request.
</ResponseField>

<ResponseField name="signed_challenge" type="string">
  The signed challenge message with user API secret.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribed",
    "feed": "account_log",
    "api_key": "CMl2SeSn09Tz+2tWuzPiPUjaXEQRGq6qv5UaexXuQ3SnahDQU/gO3aT+",
    "original_challenge": "226aee50-88fc-4618-a42a-34f7709570b2",
    "signed_challenge": "RE0DVOc7vS6pzcEjGWd/WJRRBWb54RkyvV+AZQSRl4+rap8Rlk64diR+Z9DQILm7qxncswMmJyvP/2vgzqqh+g=="
  }
  ```
</CodeGroup>

***

## Response Snapshot & Delta

<ResponseField name="feed" type="string">
  The subscribed feed.
</ResponseField>

<ResponseField name="logs" type="list of structures">
  A list containing the account logs.

  <Expandable title="properties">
    <ResponseField name="id" type="positive integer">The identifier of the log.</ResponseField>
    <ResponseField name="date" type="ISO8601 datetime">The creation time of the log according to server date and time.</ResponseField>
    <ResponseField name="asset" type="string">The asset related to the booking.</ResponseField>
    <ResponseField name="contract" type="string">The futures contract (symbol) associated with the log entry, if applicable.</ResponseField>
    <ResponseField name="info" type="string">A description of the booking.</ResponseField>
    <ResponseField name="booking_uid" type="string">The unique id of the booking.</ResponseField>
    <ResponseField name="margin_account" type="string">The name of the account associated with the entry.</ResponseField>
    <ResponseField name="old_balance" type="float">The account balance before the action described in `info`.</ResponseField>
    <ResponseField name="new_balance" type="float">The new balance of wallet or new size of the position after the action described in `info`.</ResponseField>
    <ResponseField name="old_average_entry_price" type="positive float">The average entry price of the position prior to this trade.</ResponseField>
    <ResponseField name="new_average_entry_price" type="positive float">The average entry price of the position after this trade.</ResponseField>
    <ResponseField name="trade_price" type="positive float">The price the trade was executed at.</ResponseField>
    <ResponseField name="mark_price" type="positive float">The mark price at the time the trade was executed.</ResponseField>
    <ResponseField name="realized_pnl" type="float">The pnl that is realized by reducing the position.</ResponseField>
    <ResponseField name="fee" type="float">The fee paid.</ResponseField>
    <ResponseField name="execution" type="string">The uid of the associated execution.</ResponseField>
    <ResponseField name="collateral" type="string">The currency of the associated entry.</ResponseField>
    <ResponseField name="funding_rate" type="float">The absolute funding rate.</ResponseField>
    <ResponseField name="realized_funding" type="float">The funding rate realized due to change in position size or end of funding rate period.</ResponseField>
    <ResponseField name="conversion_spread_percentage" type="float">The percentage conversion spread used in a currency conversion.</ResponseField>
    <ResponseField name="liquidation_fee" type="float">The liquidation fee associated with a liquidation/assignment entry. Not applicable for inverse futures.</ResponseField>
  </Expandable>
</ResponseField>

<CodeGroup>
  ```json Example: Snapshot theme={null}
  {
    "feed": "account_log_snapshot",
    "logs": [
      {
        "id": 1690,
        "date": "2019-07-11T08:00:00.000Z",
        "asset": "bch",
        "info": "funding rate change",
        "booking_uid": "86fdc252-1b6e-40ec-ac1d-c7bd46ddeebf",
        "margin_account": "f-bch:usd",
        "old_balance": 0.01215667051,
        "new_balance": 0.01215736653,
        "old_average_entry_price": 0.0,
        "new_average_entry_price": 0.0,
        "trade_price": 0.0,
        "mark_price": 0.0,
        "realized_pnl": 0.0,
        "fee": 0.0,
        "execution": "",
        "collateral": "bch",
        "funding_rate": -8.7002552653e-8,
        "realized_funding": 6.9602e-7,
        "conversion_spread_percentage": 0.0,
        "liquidation_fee": 0.0
      },
      {
        "id": 1689,
        "date": "2019-07-11T04:00:00.000Z",
        "asset": "bch",
        "info": "funding rate change",
        "booking_uid": "680d3973-5774-4a9d-b807-ab8aa73f95c3",
        "margin_account": "f-bch:usd",
        "old_balance": 0.01215715298,
        "new_balance": 0.01215667051,
        "old_average_entry_price": 0.0,
        "new_average_entry_price": 0.0,
        "trade_price": 0.0,
        "mark_price": 0.0,
        "realized_pnl": 0.0,
        "fee": 0.0,
        "execution": "",
        "collateral": "bch",
        "funding_rate": 6.0309345058e-8,
        "realized_funding": -4.8247e-7,
        "conversion_spread_percentage": 0.0,
        "liquidation_fee": 0.0
      }
    ]
  }
  ```

  ```json Example: Delta theme={null}
  {
    "feed": "account_log",
    "new_entry": {
      "id": 1697,
      "date": "2019-07-11T13:00:27.632Z",
      "asset": "pi_bchusd",
      "info": "futures trade",
      "booking_uid": "55a02b5b-2c90-4d43-b0eb-eb3801d50e3f",
      "margin_account": "f-bch:usd",
      "old_balance": 1.0,
      "new_balance": 2.0,
      "old_average_entry_price": 413.3,
      "new_average_entry_price": 374.3445326979084,
      "trade_price": 342.1,
      "mark_price": 342.4,
      "realized_pnl": 0.0,
      "fee": 0.0,
      "execution": "fc49fea9-8827-4a2e-8e36-c047523ddc30",
      "collateral": "bch",
      "funding_rate": 1.64955714332e-7,
      "realized_funding": -1.31965e-6,
      "conversion_spread_percentage": 0.0,
      "liquidation_fee": 0.0
    }
  }
  ```
</CodeGroup>

***

## Response Error

<ResponseField name="event" type="string">
  Value: `error`
</ResponseField>

<ResponseField name="message" type="string">
  <span>One of:</span> `Invalid feed`, `Json Error`

  An error message.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "error",
    "message": "Invalid feed"
  }
  ```
</CodeGroup>


# Balances
Source: https://docs.kraken.com/exchange/api-reference/futures-websocket/balances

Subscribe to balance information for holding, single collateral, and multi-collateral wallets

<div>
  <span>WSS</span>
  <span>futures.kraken.com/ws/v1</span>
  <span>balances</span>
</div>

This feed returns balance information for holding wallets, single collateral wallets and multi-collateral wallets.

***

## Request

<ResponseField name="event" type="string">
  `subscribe` or `unsubscribe`
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `balances`
</ResponseField>

<ResponseField name="api_key" type="string">
  The user API key.
</ResponseField>

<ResponseField name="original_challenge" type="string">
  The message that is received from a challenge request.
</ResponseField>

<ResponseField name="signed_challenge" type="string">
  The signed challenge message with user API secret.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribe",
    "feed": "balances",
    "api_key": "drUfSSmBbDpcIpwpqK0OBTcGLdAYZJU+NlPIsHaKspu/8feT2YSKl+Jw",
    "original_challenge": "c094497e-9b5f-40da-a122-3751c39b107f",
    "signed_challenge": "Ds0wtsHaXlAby/Vnoil59Q+yJIrJwZGUlgECD3+qEvFcTFfacJi2LrSRzAoqwBAeZk4pGXSmyyIW0uDymZ3olw=="
  }
  ```
</CodeGroup>

***

## Response Success

<ResponseField name="event" type="string">
  <span>One of:</span> `subscribed`, `subscribed_failed`, `unsubscribed`, `unsubscribed_failed`

  The result.
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `balances`
</ResponseField>

<ResponseField name="api_key" type="string">
  The user API key.
</ResponseField>

<ResponseField name="original_challenge" type="string">
  The message that is received from a challenge request.
</ResponseField>

<ResponseField name="signed_challenge" type="string">
  The signed challenge message with user API secret.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribed",
    "feed": "balances"
  }
  ```
</CodeGroup>

***

## Balances Snapshot

<ResponseField name="feed" type="string">
  The subscribed feed.
</ResponseField>

<ResponseField name="account" type="string">
  The user account.
</ResponseField>

<ResponseField name="timestamp" type="positive integer">
  The unix timestamp of the balance state in milliseconds.
</ResponseField>

<ResponseField name="seq" type="positive integer">
  The subscription message sequence number.
</ResponseField>

<ResponseField name="holding" type="map of floats">
  A map from currency names to balance quantity.

  <Expandable title="properties">
    <ResponseField name="name" type="string">The name of the account.</ResponseField>
    <ResponseField name="pair" type="string">The wallet currency pair.</ResponseField>
    <ResponseField name="unit" type="string">The wallet settlement unit.</ResponseField>
    <ResponseField name="portfolio_value" type="float">The current balance with haircuts and any unrealized margin from open positions in settlement units.</ResponseField>
    <ResponseField name="balance" type="float">The current balance in settlement units.</ResponseField>
    <ResponseField name="maintenance_margin" type="positive float">The maintenance margin for open positions.</ResponseField>
    <ResponseField name="initial_margin" type="float">The initial margin for open positions and open orders.</ResponseField>
    <ResponseField name="available" type="float">The current portfolio value minus initial margin.</ResponseField>
    <ResponseField name="unrealized_funding" type="positive float">The total unrealized funding for open positions.</ResponseField>
    <ResponseField name="pnl" type="positive float">The total profit and loss for open positions.</ResponseField>
    <ResponseField name="cash_value" type="float">The cash value of the single collateral wallet in USD.</ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="futures" type="map of structures">
  A map from single collateral wallet names to collateral wallet structure.

  <Expandable title="properties">
    <ResponseField name="name" type="string">The name of the account.</ResponseField>
    <ResponseField name="pair" type="string">The wallet currency pair.</ResponseField>
    <ResponseField name="unit" type="string">The wallet settlement unit.</ResponseField>
    <ResponseField name="portfolio_value" type="float">The current balance with haircuts and any unrealized margin from open positions in settlement units.</ResponseField>
    <ResponseField name="balance" type="float">The current balance in settlement units.</ResponseField>
    <ResponseField name="maintenance_margin" type="positive float">The maintenance margin for open positions.</ResponseField>
    <ResponseField name="initial_margin" type="float">The initial margin for open positions and open orders.</ResponseField>
    <ResponseField name="available" type="float">The current portfolio value minus initial margin.</ResponseField>
    <ResponseField name="unrealized_funding" type="positive float">The total unrealized funding for open positions.</ResponseField>
    <ResponseField name="pnl" type="positive float">The total profit and loss for open positions.</ResponseField>
    <ResponseField name="cash_value" type="float">The cash value of the single collateral wallet in USD.</ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="flex_futures" type="structure">
  The multi-collateral wallet structure.

  <Expandable title="properties">
    <ResponseField name="balance_value" type="float">The current USD balance of the account.</ResponseField>
    <ResponseField name="portfolio_value" type="float">The current collateral value with unrealized margin from any open positions.</ResponseField>
    <ResponseField name="collateral_value" type="float">The current USD balance with haircuts.</ResponseField>
    <ResponseField name="initial_margin" type="float">The total initial margin for open positions and open orders.</ResponseField>
    <ResponseField name="initial_margin_without_orders" type="float">The total initial margin for open positions.</ResponseField>
    <ResponseField name="maintenance_margin" type="float">The total maintenance margin for open positions.</ResponseField>
    <ResponseField name="pnl" type="float">The total profit and loss for open positions.</ResponseField>
    <ResponseField name="unrealized_funding" type="float">The total unrealized funding for open positions.</ResponseField>
    <ResponseField name="total_unrealized" type="float">The total unrealized funding and pnl.</ResponseField>
    <ResponseField name="total_unrealized_as_margin" type="float">The total unrealized in USD.</ResponseField>
    <ResponseField name="margin_equity" type="float">The current collateral value and unrealized margin.</ResponseField>
    <ResponseField name="available_margin" type="float">The margin equity minus initial margin.</ResponseField>
    <ResponseField name="total_position_size" type="float">Sum of all position sizes in USD.</ResponseField>
    <ResponseField name="unified_balances" type="boolean">True if the user has unified balances enabled, false if not.</ResponseField>

    <ResponseField name="currencies" type="map of structures">
      A map from collateral wallet names to collateral wallet structure.

      <Expandable title="properties">
        <ResponseField name="quantity" type="float">The currency quantity.</ResponseField>
        <ResponseField name="value" type="float">The USD value of the currency balance.</ResponseField>
        <ResponseField name="collateral_value" type="float">The current USD balance with haircuts.</ResponseField>
        <ResponseField name="available" type="float">The total available margin valued in the wallet currency.</ResponseField>
        <ResponseField name="haircut" type="float">The rate of reduction in the value of a collateral asset that may be used as margin.</ResponseField>
        <ResponseField name="conversion_spread" type="float">The conversion spread is used to calculate conversion fee for multi-collateral wallets.</ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="isolated" type="map of structures">
      A map from collateral wallet names to collateral wallet structure.

      <Expandable title="properties">
        <ResponseField name="initial_margin" type="float">Initial margin for any position plus open orders.</ResponseField>
        <ResponseField name="initial_margin_without_orders" type="float">Initial margin for any position.</ResponseField>
        <ResponseField name="maintenance_margin" type="float">Maintenance margin for any position.</ResponseField>
        <ResponseField name="pnl" type="float">Total profit and loss for any position.</ResponseField>
        <ResponseField name="unrealized_funding" type="float">Unrealized funding for any position.</ResponseField>
        <ResponseField name="total_unrealized" type="float">Unrealized funding plus pnl.</ResponseField>
        <ResponseField name="total_unrealized_as_margin" type="float">Total unrealized as USD.</ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="cross" type="map of structures">
      The current margin information for cross position(s).

      <Expandable title="properties">
        <ResponseField name="initial_margin" type="float">Initial margin for all positions plus open orders.</ResponseField>
        <ResponseField name="initial_margin_without_orders" type="float">Initial margin for all positions.</ResponseField>
        <ResponseField name="maintenance_margin" type="float">Maintenance margin for all positions.</ResponseField>
        <ResponseField name="pnl" type="float">Total profit and loss for all positions.</ResponseField>
        <ResponseField name="unrealized_funding" type="float">Unrealized funding for all positions.</ResponseField>
        <ResponseField name="total_unrealized" type="float">Unrealized funding plus pnl.</ResponseField>
        <ResponseField name="total_unrealized_as_margin" type="float">Total unrealized as USD.</ResponseField>
        <ResponseField name="balance_value" type="float">Total USD balance minus initial margin of isolated positions.</ResponseField>
        <ResponseField name="collateral_value" type="float">USD balance, but with haircuts applied.</ResponseField>
        <ResponseField name="portfolio_value" type="float">USD balance plus total unrealized.</ResponseField>
        <ResponseField name="margin_equity" type="float">Collateral value plus total unrealized.</ResponseField>
        <ResponseField name="available_margin" type="float">Margin equity minus initial margin of cross and isolated positions.</ResponseField>
        <ResponseField name="effective_leverage" type="float">Ratio of position size to margin equity.</ResponseField>
        <ResponseField name="total_position_size" type="float">Sum of all cross position sizes in USD.</ResponseField>

        <ResponseField name="portfolio_margin_breakdown" type="map of structures">
          A breakdown of the portfolio margin calculation components.

          <Expandable title="properties">
            <ResponseField name="market_risk" type="float">Non-delta market risk of the portfolio.</ResponseField>
            <ResponseField name="abs_options_delta" type="float">Absolute options delta of the portfolio.</ResponseField>
            <ResponseField name="net_position_delta" type="float">Net position delta of the portfolio.</ResponseField>
            <ResponseField name="futures_maintenance_margin" type="float">Total maintenance margin of all futures positions in the portfolio.</ResponseField>
          </Expandable>
        </ResponseField>
      </Expandable>
    </ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="futures_cash_value" type="float">
  Cash value sum total of the single collateral wallets in USD.
</ResponseField>

<ResponseField name="futures_upnl_cash_value" type="float">
  Cash value sum total with unrealized pnl of the single collateral wallets in USD.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "feed": "balances_snapshot",
    "account": "4a012c31-df95-484a-9473-d51e4a0c4ae7",
    "holding": {
      "USDT": 4997.5012493753,
      "XBT": 0.1285407184,
      "ETH": 1.8714395862,
      "LTC": 47.6462740614,
      "GBP": 3733.488646461,
      "USDC": 5001.00020004,
      "USD": 5000.0,
      "BCH": 16.8924625832,
      "EUR": 4459.070194683,
      "XRP": 7065.5399485629
    },
    "futures": {
      "F-ETH:EUR": {
        "name": "F-ETH:EUR",
        "pair": "ETH/EUR",
        "unit": "EUR",
        "portfolio_value": 0.0,
        "balance": 0.0,
        "maintenance_margin": 0.0,
        "initial_margin": 0.0,
        "available": 0.0,
        "unrealized_funding": 0.0,
        "pnl": 0.0
      },
      "F-XBT:USD": {
        "name": "F-XBT:USD",
        "pair": "XBT/USD",
        "unit": "XBT",
        "portfolio_value": 0.0,
        "balance": 0.0,
        "maintenance_margin": 0.0,
        "initial_margin": 0.0,
        "available": 0.0,
        "unrealized_funding": 0.0,
        "pnl": 0.0
      }
    },
    "flex_futures": {
      "currencies": {
        "USDT": {
          "quantity": 0.0,
          "value": 0.0,
          "collateral_value": 0.0,
          "available": 0.0,
          "haircut": 0.0,
          "conversion_spread": 0.0
        },
        "USD": {
          "quantity": 0.0,
          "value": 0.0,
          "collateral_value": 0.0,
          "available": 0.0,
          "haircut": 0.0,
          "conversion_spread": 0.0
        }
      },
      "balance_value": 0.0,
      "portfolio_value": 0.0,
      "collateral_value": 0.0,
      "initial_margin": 0.0,
      "initial_margin_without_orders": 0.0,
      "maintenance_margin": 0.0,
      "pnl": 0.0,
      "unrealized_funding": 0.0,
      "total_unrealized": 0.0,
      "total_unrealized_as_margin": 0.0,
      "margin_equity": 0.0,
      "available_margin": 0.0,
      "isolated": {
        "PF_ETHUSD": {
          "initial_margin": 0.0,
          "initial_margin_without_orders": 0.0,
          "maintenance_margin": 0.0,
          "pnl": 0.0,
          "unrealized_funding": 0.0,
          "total_unrealized": 0.0,
          "total_unrealized_as_margin": 0.0
        }
      },
      "cross": {
        "balance_value": 9963.66,
        "portfolio_value": 9963.66,
        "collateral_value": 9963.66,
        "initial_margin": 0.0,
        "initial_margin_without_orders": 0.0,
        "maintenance_margin": 0.0,
        "pnl": 0.0,
        "unrealized_funding": 0.0,
        "total_unrealized": 0.0,
        "total_unrealized_as_margin": 0.0,
        "margin_equity": 9963.66,
        "available_margin": 9963.66,
        "effective_leverage": 0.0
      }
    },
    "timestamp": 1640995200000,
    "seq": 0
  }
  ```
</CodeGroup>

***

## Balances Delta

<ResponseField name="feed" type="string">
  The subscribed feed.
</ResponseField>

<ResponseField name="account" type="string">
  The user account.
</ResponseField>

<ResponseField name="timestamp" type="positive integer">
  The unix timestamp of the balance state in milliseconds.
</ResponseField>

<ResponseField name="seq" type="positive integer">
  The subscription message sequence number.
</ResponseField>

<ResponseField name="holding" type="optional map of floats">
  A map from currency names to balance quantity.

  <Expandable title="properties">
    <ResponseField name="name" type="string">The name of the account.</ResponseField>
    <ResponseField name="pair" type="string">The wallet currency pair.</ResponseField>
    <ResponseField name="unit" type="string">The wallet settlement unit.</ResponseField>
    <ResponseField name="portfolio_value" type="float">The current balance with haircuts and any unrealized margin from open positions in settlement units.</ResponseField>
    <ResponseField name="balance" type="float">The current balance in settlement units.</ResponseField>
    <ResponseField name="maintenance_margin" type="positive float">The maintenance margin for open positions.</ResponseField>
    <ResponseField name="initial_margin" type="float">The initial margin for open positions and open orders.</ResponseField>
    <ResponseField name="available" type="float">The current portfolio value minus initial margin.</ResponseField>
    <ResponseField name="unrealized_funding" type="positive float">The total unrealized funding for open positions.</ResponseField>
    <ResponseField name="pnl" type="positive float">The total profit and loss for open positions.</ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="futures" type="optional map of structures">
  A map from single collateral wallet names to collateral wallet structure.

  <Expandable title="properties">
    <ResponseField name="name" type="string">The name of the account.</ResponseField>
    <ResponseField name="pair" type="string">The wallet currency pair.</ResponseField>
    <ResponseField name="unit" type="string">The wallet settlement unit.</ResponseField>
    <ResponseField name="portfolio_value" type="float">The current balance with haircuts and any unrealized margin from open positions in settlement units.</ResponseField>
    <ResponseField name="balance" type="float">The current balance in settlement units.</ResponseField>
    <ResponseField name="maintenance_margin" type="positive float">The maintenance margin for open positions.</ResponseField>
    <ResponseField name="initial_margin" type="float">The initial margin for open positions and open orders.</ResponseField>
    <ResponseField name="available" type="float">The current portfolio value minus initial margin.</ResponseField>
    <ResponseField name="unrealized_funding" type="positive float">The total unrealized funding for open positions.</ResponseField>
    <ResponseField name="pnl" type="positive float">The total profit and loss for open positions.</ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="flex_futures" type="optional structure">
  The multi-collateral wallet structure.

  <Expandable title="properties">
    <ResponseField name="balance_value" type="float">The current USD balance of the account.</ResponseField>
    <ResponseField name="portfolio_value" type="float">The current collateral value with unrealized margin from any open positions.</ResponseField>
    <ResponseField name="collateral_value" type="float">The current USD balance with haircuts.</ResponseField>
    <ResponseField name="initial_margin" type="float">The total initial margin for open positions and open orders.</ResponseField>
    <ResponseField name="initial_margin_without_orders" type="float">The total initial margin for open positions.</ResponseField>
    <ResponseField name="maintenance_margin" type="float">The total maintenance margin for open positions.</ResponseField>
    <ResponseField name="pnl" type="float">The total profit and loss for open positions.</ResponseField>
    <ResponseField name="unrealized_funding" type="float">The total unrealized funding for open positions.</ResponseField>
    <ResponseField name="total_unrealized" type="float">The total unrealized funding and pnl.</ResponseField>
    <ResponseField name="total_unrealized_as_margin" type="float">The total unrealized in USD.</ResponseField>
    <ResponseField name="margin_equity" type="float">The current collateral value and unrealized margin.</ResponseField>
    <ResponseField name="available_margin" type="float">The margin equity minus initial margin.</ResponseField>
    <ResponseField name="total_position_size" type="float">Sum of all position sizes in USD.</ResponseField>
    <ResponseField name="unified_balances" type="boolean">True if the user has unified balances enabled, false if not.</ResponseField>

    <ResponseField name="currencies" type="map of structures">
      A map from collateral wallet names to collateral wallet structure.

      <Expandable title="properties">
        <ResponseField name="quantity" type="float">The currency quantity.</ResponseField>
        <ResponseField name="value" type="float">The USD value of the currency balance.</ResponseField>
        <ResponseField name="collateral_value" type="float">The current USD balance with haircuts.</ResponseField>
        <ResponseField name="available" type="float">The total available margin valued in the wallet currency.</ResponseField>
        <ResponseField name="haircut" type="float">The rate of reduction in the value of a collateral asset that may be used as margin.</ResponseField>
        <ResponseField name="conversion_spread" type="float">The conversion spread is used to calculate conversion fee for multi-collateral wallets.</ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="isolated" type="map of structures">
      A map from collateral wallet names to collateral wallet structure.

      <Expandable title="properties">
        <ResponseField name="initial_margin" type="float">Initial margin for any position plus open orders.</ResponseField>
        <ResponseField name="initial_margin_without_orders" type="float">Initial margin for any position.</ResponseField>
        <ResponseField name="maintenance_margin" type="float">Maintenance margin for any position.</ResponseField>
        <ResponseField name="pnl" type="float">Total profit and loss for any position.</ResponseField>
        <ResponseField name="unrealized_funding" type="float">Unrealized funding for any position.</ResponseField>
        <ResponseField name="total_unrealized" type="float">Unrealized funding plus pnl.</ResponseField>
        <ResponseField name="total_unrealized_as_margin" type="float">Total unrealized as USD.</ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="cross" type="map of structures">
      The current margin information for cross position(s).

      <Expandable title="properties">
        <ResponseField name="initial_margin" type="float">Initial margin for all positions plus open orders.</ResponseField>
        <ResponseField name="initial_margin_without_orders" type="float">Initial margin for all positions.</ResponseField>
        <ResponseField name="maintenance_margin" type="float">Maintenance margin for all positions.</ResponseField>
        <ResponseField name="pnl" type="float">Total profit and loss for all positions.</ResponseField>
        <ResponseField name="unrealized_funding" type="float">Unrealized funding for all positions.</ResponseField>
        <ResponseField name="total_unrealized" type="float">Unrealized funding plus pnl.</ResponseField>
        <ResponseField name="total_unrealized_as_margin" type="float">Total unrealized as USD.</ResponseField>
        <ResponseField name="balance_value" type="float">Total USD balance minus initial margin of isolated positions.</ResponseField>
        <ResponseField name="collateral_value" type="float">USD balance, but with haircuts applied.</ResponseField>
        <ResponseField name="portfolio_value" type="float">USD balance plus total unrealized.</ResponseField>
        <ResponseField name="margin_equity" type="float">Collateral value plus total unrealized.</ResponseField>
        <ResponseField name="available_margin" type="float">Margin equity minus initial margin of cross and isolated positions.</ResponseField>
        <ResponseField name="effective_leverage" type="float">Ratio of position size to margin equity.</ResponseField>
        <ResponseField name="total_position_size" type="float">Sum of all cross position sizes in USD.</ResponseField>
      </Expandable>
    </ResponseField>
  </Expandable>
</ResponseField>

<CodeGroup>
  ```json Example: Holding Wallet Delta theme={null}
  {
    "feed": "balances",
    "account": "7a641082-55c7-4411-a85f-930ec2e09617",
    "holding": {
      "USD": 5000.0
    },
    "futures": {},
    "timestamp": 1640995200000,
    "seq": 83
  }
  ```

  ```json Example: Multi-Collateral Delta theme={null}
  {
    "feed": "balances",
    "account": "7a641082-55c7-4411-a85f-930ec2e09617",
    "flex_futures": {
      "currencies": {
        "USD": { "quantity": 5000.0, "value": 5000.0, "collateral_value": 5000.0, "available": 5000.0, "haircut": 0.0, "conversion_spread": 0.0 }
      },
      "balance_value": 5000.0,
      "portfolio_value": 5000.0,
      "collateral_value": 5000.0,
      "initial_margin": 0.0,
      "initial_margin_without_orders": 0.0,
      "maintenance_margin": 0.0,
      "pnl": 0.0,
      "unrealized_funding": 0.0,
      "total_unrealized": 0.0,
      "total_unrealized_as_margin": 0.0,
      "margin_equity": 5000.0,
      "available_margin": 5000.0,
      "isolated": {},
      "cross": {
        "balance": 0.0,
        "portfolio_value": 0.0,
        "collateral_value": 0.0,
        "initial_margin": 0.0,
        "initial_margin_without_orders": 0.0,
        "maintenance_margin": 0.0,
        "pnl": 0.0,
        "unrealized_funding": 0,
        "total_unrealized": 0.0,
        "total_unrealized_as_margin": 0.0,
        "margin_equity": 0.0,
        "available_margin": 0.0,
        "effective_leverage": 0.0
      }
    },
    "timestamp": 1640995200000,
    "seq": 1
  }
  ```

  ```json Example: Single-Collateral Delta theme={null}
  {
    "feed": "balances",
    "account": "7a641082-55c7-4411-a85f-930ec2e09617",
    "holding": {},
    "futures": {
      "F-XBT:USD": {
        "name": "F-XBT:USD",
        "pair": "XBT/USD",
        "unit": "XBT",
        "portfolio_value": 0.1219368845,
        "balance": 0.1219368845,
        "maintenance_margin": 0.0,
        "initial_margin": 0.0,
        "available": 0.1219368845,
        "unrealized_funding": 0.0,
        "pnl": 0.0
      }
    },
    "timestamp": 1640995200000,
    "seq": 2
  }
  ```
</CodeGroup>

***

## Response Error

<ResponseField name="event" type="string">
  Value: `error`
</ResponseField>

<ResponseField name="message" type="string">
  <span>One of:</span> `Invalid feed`, `Json Error`

  An error message.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "error",
    "message": "Invalid feed"
  }
  ```
</CodeGroup>


# Book
Source: https://docs.kraken.com/exchange/api-reference/futures-websocket/book

Subscribe to order book data

<div>
  <span>WSS</span>
  <span>futures.kraken.com/ws/v1</span>
  <span>book</span>
</div>

The `book` feed returns information about the order book.

***

## Request

<ResponseField name="event" type="string">
  `subscribe` or `unsubscribe`
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `book`
</ResponseField>

<ResponseField name="product_ids" type="list of strings">
  A list of strings which represent the products that user will receive information upon.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribe",
    "feed": "book",
    "product_ids": ["PF_XBTUSD"]
  }
  ```
</CodeGroup>

***

## Response Success

<ResponseField name="event" type="string">
  <span>One of:</span> `subscribed`, `subscribed_failed`, `unsubscribed`, `unsubscribed_failed`

  The result.
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `book`
</ResponseField>

<ResponseField name="product_ids" type="list of strings">
  A list of strings which represent the products that user will receive information upon.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribed",
    "feed": "book",
    "product_ids": ["PF_XBTUSD"]
  }
  ```
</CodeGroup>

***

## Response Snapshot

<ResponseField name="feed" type="string">
  The subscribed feed.
</ResponseField>

<ResponseField name="product_id" type="string">
  The subscribed product (referred also as instrument or symbol).
</ResponseField>

<ResponseField name="seq" type="positive integer">
  The subscription message sequence number.
</ResponseField>

<ResponseField name="timestamp" type="positive integer">
  Timestamp in milliseconds.
</ResponseField>

<ResponseField name="tickSize" type="string">
  Always null.
</ResponseField>

<ResponseField name="bids" type="list of structures">
  <Expandable title="properties">
    <ResponseField name="qty" type="positive float">The quantity of the entry.</ResponseField>
    <ResponseField name="price" type="positive float">The price of the entry.</ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="asks" type="list of structures">
  <Expandable title="properties">
    <ResponseField name="qty" type="positive float">The quantity of the entry.</ResponseField>
    <ResponseField name="price" type="positive float">The price of the entry.</ResponseField>
  </Expandable>
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "feed": "book_snapshot",
    "product_id": "PF_XBTUSD",
    "timestamp": 1612269825817,
    "seq": 326072249,
    "tickSize": null,
    "bids": [
      {
        "price": 34892.5,
        "qty": 6385
      },
      {
        "price": 34892,
        "qty": 10924
      }
    ],
    "asks": [
      {
        "price": 34911.5,
        "qty": 20598
      },
      {
        "price": 34912,
        "qty": 2300
      }
    ]
  }
  ```
</CodeGroup>

***

## Response Delta

<ResponseField name="feed" type="string">
  The subscribed feed.
</ResponseField>

<ResponseField name="product_id" type="string">
  The subscribed product (referred also as instrument or symbol).
</ResponseField>

<ResponseField name="seq" type="positive integer">
  The subscription message sequence number.
</ResponseField>

<ResponseField name="timestamp" type="positive integer">
  Timestamp in milliseconds.
</ResponseField>

<ResponseField name="side" type="string">
  The side of the entry.
</ResponseField>

<ResponseField name="price" type="positive float">
  The price of the entry.
</ResponseField>

<ResponseField name="qty" type="positive float">
  The quantity of the entry.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "feed": "book",
    "product_id": "PF_XBTUSD",
    "side": "sell",
    "seq": 326094134,
    "price": 34981,
    "qty": 0,
    "timestamp": 1612269953629
  }
  ```
</CodeGroup>

***

## Response Error

<ResponseField name="event" type="string">
  Value: `error`
</ResponseField>

<ResponseField name="message" type="string">
  <span>One of:</span> `Invalid product id`, `Invalid feed`, `Json Error`

  An error message.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "error",
    "message": "Invalid product id"
  }
  ```
</CodeGroup>


# Challenge
Source: https://docs.kraken.com/exchange/api-reference/futures-websocket/challenge

Request a challenge for user authentication handshake

<div>
  <span>WSS</span>
  <span>futures.kraken.com/ws/v1</span>
  <span>challenge</span>
</div>

This request returns a challenge to be used in handshake for user authentication.

***

## Request

<ResponseField name="event" type="string">
  The request event type.
</ResponseField>

<ResponseField name="api_key" type="string">
  The user API key.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "challenge",
    "api_key": "CMl2SeSn09Tz+2tWuzPfdaJdsahq6qv5UaexXuQ3SnahDQU/gO3aT+"
  }
  ```
</CodeGroup>

***

## Response Success

<ResponseField name="event" type="string">
  Value: `challenge`
</ResponseField>

<ResponseField name="message" type="string">
  The message that user will have to sign for authentication reasons.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "challenge",
    "message": "226aee50-88fc-4618-a42a-34f7709570b2"
  }
  ```
</CodeGroup>

***

## Response Error

<ResponseField name="event" type="string">
  Value: `error`
</ResponseField>

<ResponseField name="message" type="string">
  An error message. Value: `Json Error`
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "error",
    "message": "Json Error"
  }
  ```
</CodeGroup>


# Fills
Source: https://docs.kraken.com/exchange/api-reference/futures-websocket/fills

Subscribe to fills information for your account

<div>
  <span>WSS</span>
  <span>futures.kraken.com/ws/v1</span>
  <span>fills</span>
</div>

This subscription feed publishes fills information.

***

## Request

<ResponseField name="event" type="string">
  `subscribe` or `unsubscribe`
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `fills`
</ResponseField>

<ResponseField name="product_ids" type="list">
  Optionally, the `product_ids` field can be used to subscribe only to specific products.
</ResponseField>

<ResponseField name="api_key" type="string">
  The user API key.
</ResponseField>

<ResponseField name="original_challenge" type="string">
  The message that is received from a challenge request.
</ResponseField>

<ResponseField name="signed_challenge" type="string">
  The signed challenge message with user API secret.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribe",
    "feed": "fills",
    "api_key": "CMl2SeSn09Tz+2tWuzPiPUjaXEQRGq6qv5UaexXuQ3SnahDQU/gO3aT+",
    "original_challenge": "226aee50-88fc-4618-a42a-34f7709570b2",
    "signed_challenge": "RE0DVOc7vS6pzcEjGWd/WJRRBWb54RkyvV+AZQSRl4+rap8Rlk64diR+Z9DQILm7qxncswMmJyvP/2vgzqqh+g=="
  }
  ```
</CodeGroup>

***

## Response Success

<ResponseField name="event" type="string">
  <span>One of:</span> `subscribed`, `subscribed_failed`, `unsubscribed`, `unsubscribed_failed`

  The result.
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `fills`
</ResponseField>

<ResponseField name="product_ids" type="list">
  List of product identifiers to subscribe for. Other products are ignored.
</ResponseField>

<ResponseField name="api_key" type="string">
  The user API key.
</ResponseField>

<ResponseField name="original_challenge" type="string">
  The message that is received from a challenge request.
</ResponseField>

<ResponseField name="signed_challenge" type="string">
  The signed challenge message with user API secret.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribed",
    "feed": "fills",
    "product_ids": ["PF_XBTUSD"],
    "api_key": "CMl2SeSn09Tz+2tWuzPiPUjaXEQRGq6qv5UaexXuQ3SnahDQU/gO3aT+",
    "original_challenge": "226aee50-88fc-4618-a42a-34f7709570b2",
    "signed_challenge": "RE0DVOc7vS6pzcEjGWd/WJRRBWb54RkyvV+AZQSRl4+rap8Rlk64diR+Z9DQILm7qxncswMmJyvP/2vgzqqh+g=="
  }
  ```
</CodeGroup>

***

## Response Snapshot & Delta

<ResponseField name="feed" type="string">
  The subscribed feed.
</ResponseField>

<ResponseField name="account" type="string">
  The user account.
</ResponseField>

<ResponseField name="fills" type="list of structures">
  A list containing fill elements of the user account.

  <Expandable title="properties">
    <ResponseField name="instrument" type="string">The fill instrument (referred also as symbol or product\_id).</ResponseField>
    <ResponseField name="time" type="positive integer">The server UTC date and time in milliseconds.</ResponseField>
    <ResponseField name="price" type="positive float">The price at which the order was filled.</ResponseField>
    <ResponseField name="seq" type="positive integer">The subscription message sequence number.</ResponseField>
    <ResponseField name="buy" type="boolean">A flag that shows if filled order was a buy.</ResponseField>
    <ResponseField name="qty" type="positive float">The quantity that was filled.</ResponseField>
    <ResponseField name="remaining_order_qty" type="positive float">The remaining unfilled quantity in the order.</ResponseField>
    <ResponseField name="order_id" type="UUID">The order id that was filled.</ResponseField>
    <ResponseField name="cli_ord_id" type="UUID">The unique client order identifier. This field is returned only if the order has a client order id.</ResponseField>
    <ResponseField name="fill_id" type="UUID">The fill id.</ResponseField>

    <ResponseField name="fill_type" type="string">
      The classification of the fill: `maker` if the user has a limit order that gets filled, `taker` if the user makes an execution that crosses the spread, `liquidation` if an execution is the result of a liquidation, `assignee` if an execution is a result of a counterparty receiving an Assignment in PAS, `assignor` if an execution is a result of the user assigning their position due to a failed liquidation, `unwindBankrupt` any portion of a liquidated position cannot be filled or assigned the remaining contracts are unwound, `unwindCounterparty` any portion of your counterparty's position is liquidated and cannot be filled or assigned the remaining contracts are unwound, `takerAfterEdit` if the user edits the order and it is instantly executed.
    </ResponseField>

    <ResponseField name="fee_paid" type="positive float">Fee paid on fill.</ResponseField>
    <ResponseField name="fee_currency" type="string">Currency in which the fee was charged.</ResponseField>
    <ResponseField name="taker_order_type" type="string">The order type of the taker execution: `lmt`, `ioc`, `post`, `liquidation`, `assignment`, `stp`, `unwind`, `market`, `block`, `coveredLiquidation`, `hedgeImmediateOrCancel`, `hedgeAssignment`, `fillOrKill`.</ResponseField>
    <ResponseField name="order_type" type="string">The order type associated with the fill: `lmt`, `ioc`, `post`, `liquidation`, `assignment`, `stp`, `unwind`, `market`, `block`, `coveredLiquidation`, `hedgeImmediateOrCancel`, `hedgeAssignment`, `fillOrKill`.</ResponseField>
  </Expandable>
</ResponseField>

<CodeGroup>
  ```json Example: Snapshot theme={null}
  {
    "feed": "fills_snapshot",
    "account": "DemoUser",
    "fills": [
      {
        "instrument": "PF_XBTUSD",
        "time": 1600256910739,
        "price": 10937.5,
        "seq": 36,
        "buy": true,
        "qty": 5000.0,
        "remaining_order_qty": 0.0,
        "order_id": "9e30258b-5a98-4002-968a-5b0e149bcfbf",
        "fill_id": "cad76f07-814e-4dc6-8478-7867407b6bff",
        "fill_type": "maker",
        "fee_paid": -0.00009142857,
        "fee_currency": "BTC",
        "taker_order_type": "ioc",
        "order_type": "limit"
      },
      {
        "instrument": "PI_ETHUSD",
        "time": 1600256945531,
        "price": 364.65,
        "seq": 39,
        "buy": true,
        "qty": 5000.0,
        "remaining_order_qty": 0.0,
        "order_id": "7e60b6e8-e4c2-4ce8-bbd0-ef81e18b65bb",
        "fill_id": "b1aa44b2-4f2a-4031-999c-ae1175c91580",
        "fill_type": "taker",
        "fee_paid": 0.00685588921,
        "fee_currency": "ETH",
        "taker_order_type": "market",
        "order_type": "limit"
      }
    ]
  }
  ```
</CodeGroup>

***

## Response Error

<ResponseField name="event" type="string">
  Value: `error`
</ResponseField>

<ResponseField name="message" type="string">
  <span>One of:</span> `Invalid feed`, `Json Error`

  An error message.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "error",
    "message": "Invalid feed"
  }
  ```
</CodeGroup>


# Heartbeat
Source: https://docs.kraken.com/exchange/api-reference/futures-websocket/heartbeat

Subscribe to heartbeat messages at timed intervals

<div>
  <span>WSS</span>
  <span>futures.kraken.com/ws/v1</span>
  <span>heartbeat</span>
</div>

The `heartbeat` feed publishes a heartbeat message at timed intervals.

***

## Request

<ResponseField name="event" type="string">
  `subscribe` or `unsubscribe`
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `heartbeat`
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribe",
    "feed": "heartbeat"
  }
  ```
</CodeGroup>

***

## Response Success

<ResponseField name="event" type="string">
  <span>One of:</span> `subscribed`, `subscribed_failed`, `unsubscribed`, `unsubscribed_failed`

  The result.
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `heartbeat`
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribed",
    "feed": "heartbeat"
  }
  ```
</CodeGroup>

***

## Response Snapshot

<ResponseField name="feed" type="string">
  The subscribed feed.
</ResponseField>

<ResponseField name="time" type="positive integer">
  The UTC time of the server in milliseconds.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "feed": "heartbeat",
    "time": 1534262350627
  }
  ```
</CodeGroup>

***

## Response Error

<ResponseField name="event" type="string">
  Value: `error`
</ResponseField>

<ResponseField name="message" type="string">
  <span>One of:</span> `Invalid feed`, `Json Error`

  An error message.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "error",
    "message": "Json Error"
  }
  ```
</CodeGroup>


# Notifications
Source: https://docs.kraken.com/exchange/api-reference/futures-websocket/notifications

Subscribe to notifications for your account

<div>
  <span>WSS</span>
  <span>futures.kraken.com/ws/v1</span>
  <span>notifications\_auth</span>
</div>

This subscription feed publishes notifications to the client.

Authentication is required.

***

## Request

<ResponseField name="event" type="string">
  `subscribe` or `unsubscribe`
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `notifications_auth`
</ResponseField>

<ResponseField name="api_key" type="string">
  The user API key.
</ResponseField>

<ResponseField name="original_challenge" type="string">
  The message that is received from a challenge request.
</ResponseField>

<ResponseField name="signed_challenge" type="string">
  The signed challenge message with user API secret.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribe",
    "feed": "notifications_auth",
    "api_key": "CMl2SeSn09Tz+2tWuzPiPUjaXEQRGq6qv5UaexXuQ3SnahDQU/gO3aT+",
    "original_challenge": "226aee50-88fc-4618-a42a-34f7709570b2",
    "signed_challenge": "RE0DVOc7vS6pzcEjGWd/WJRRBWb54RkyvV+AZQSRl4+rap8Rlk64diR+Z9DQILm7qxncswMmJyvP/2vgzqqh+g=="
  }
  ```
</CodeGroup>

***

## Response Success

<ResponseField name="event" type="string">
  <span>One of:</span> `subscribed`, `subscribed_failed`, `unsubscribed`, `unsubscribed_failed`

  The result.
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `notifications_auth`
</ResponseField>

<ResponseField name="api_key" type="string">
  The user API key.
</ResponseField>

<ResponseField name="original_challenge" type="string">
  The message that is received from a challenge request.
</ResponseField>

<ResponseField name="signed_challenge" type="string">
  The signed challenge message with user API secret.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribed",
    "feed": "notifications_auth",
    "api_key": "CMl2SeSn09Tz+2tWuzPiPUjaXEQRGq6qv5UaexXuQ3SnahDQU/gO3aT+",
    "original_challenge": "226aee50-88fc-4618-a42a-34f7709570b2",
    "signed_challenge": "RE0DVOc7vS6pzcEjGWd/WJRRBWb54RkyvV+AZQSRl4+rap8Rlk64diR+Z9DQILm7qxncswMmJyvP/2vgzqqh+g=="
  }
  ```
</CodeGroup>

***

## Response Snapshot

<ResponseField name="feed" type="string">
  The subscribed feed.
</ResponseField>

<ResponseField name="notifications" type="list of structures">
  A list containing the notifications.

  <Expandable title="properties">
    <ResponseField name="id" type="positive integer">The notification id.</ResponseField>
    <ResponseField name="type" type="string">The notification type. Existing types are `market`, `general`, `new_feature`, `bug_fix`, `maintenance`, `settlement`.</ResponseField>
    <ResponseField name="priority" type="string">The notification priority. Existing priorities are: `low`, `medium`, `high`. If priority is `high` then it implies downtime will occur at `effective_time` when type is `maintenance`.</ResponseField>
    <ResponseField name="note" type="string">The notification note. A short description about the specific notification.</ResponseField>
    <ResponseField name="effective_time" type="integer">The time that notification is taking effect.</ResponseField>
    <ResponseField name="expected_downtime_minutes" type="integer">The expected downtime in minutes or absent if no downtime is expected.</ResponseField>
  </Expandable>
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "feed": "notifications_auth",
    "notifications": [
      {
        "id": 5,
        "type": "market",
        "priority": "low",
        "note": "A note describing the notification.",
        "effective_time": 1520288300000
      }
    ]
  }
  ```
</CodeGroup>

***

## Response Error

<ResponseField name="event" type="string">
  Value: `error`
</ResponseField>

<ResponseField name="message" type="string">
  <span>One of:</span> `Invalid feed`, `Json Error`

  An error message.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "error",
    "message": "Invalid feed"
  }
  ```
</CodeGroup>


# Open Orders
Source: https://docs.kraken.com/exchange/api-reference/futures-websocket/open_orders

Subscribe to open orders information for your account

<div>
  <span>WSS</span>
  <span>futures.kraken.com/ws/v1</span>
  <span>open\_orders</span>
</div>

This subscription feed publishes information about user open orders.

***

## Request

<ResponseField name="event" type="string">
  `subscribe` or `unsubscribe`
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `open_orders`
</ResponseField>

<ResponseField name="api_key" type="string">
  The user API key.
</ResponseField>

<ResponseField name="original_challenge" type="string">
  The message that is received from a challenge request.
</ResponseField>

<ResponseField name="signed_challenge" type="string">
  The signed challenge message with user API secret.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribe",
    "feed": "open_orders",
    "api_key": "CMl2SeSn09Tz+2tWuzPiPUjaXEQRGq6qv5UaexXuQ3SnahDQU/gO3aT+",
    "original_challenge": "226aee50-88fc-4618-a42a-34f7709570b2",
    "signed_challenge": "RE0DVOc7vS6pzcEjGWd/WJRRBWb54RkyvV+AZQSRl4+rap8Rlk64diR+Z9DQILm7qxncswMmJyvP/2vgzqqh+g=="
  }
  ```
</CodeGroup>

***

## Response Success

<ResponseField name="event" type="string">
  <span>One of:</span> `subscribed`, `subscribed_failed`, `unsubscribed`, `unsubscribed_failed`

  The result.
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `open_orders`
</ResponseField>

<ResponseField name="api_key" type="string">
  The user API key.
</ResponseField>

<ResponseField name="original_challenge" type="string">
  The message that is received from a challenge request.
</ResponseField>

<ResponseField name="signed_challenge" type="string">
  The signed challenge message with user API secret.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribed",
    "feed": "open_orders",
    "api_key": "CMl2SeSn09Tz+2tWuzPiPUjaXEQRGq6qv5UaexXuQ3SnahDQU/gO3aT+",
    "original_challenge": "226aee50-88fc-4618-a42a-34f7709570b2",
    "signed_challenge": "RE0DVOc7vS6pzcEjGWd/WJRRBWb54RkyvV+AZQSRl4+rap8Rlk64diR+Z9DQILm7qxncswMmJyvP/2vgzqqh+g=="
  }
  ```
</CodeGroup>

***

## Response Snapshot

<ResponseField name="feed" type="string">
  The subscribed feed.
</ResponseField>

<ResponseField name="account" type="string">
  The user account.
</ResponseField>

<ResponseField name="orders" type="list of structures">
  The user open orders.

  <Expandable title="properties">
    <ResponseField name="instrument" type="string">The instrument (referred also as symbol or product\_id) of the order.</ResponseField>
    <ResponseField name="time" type="positive integer">The UTC time in milliseconds.</ResponseField>
    <ResponseField name="last_update_time" type="positive integer">The UTC time in milliseconds that the order was last updated.</ResponseField>
    <ResponseField name="qty" type="positive float">The quantity of the order.</ResponseField>
    <ResponseField name="filled" type="positive float">The total amount of the order that is filled.</ResponseField>
    <ResponseField name="limit_price" type="positive float">The limit price of the order.</ResponseField>
    <ResponseField name="stop_price" type="positive float">The stop price of the order.</ResponseField>
    <ResponseField name="type" type="string">The order type: `limit`, `take_profit`, or `stop`.</ResponseField>
    <ResponseField name="order_id" type="UUID">The order id.</ResponseField>
    <ResponseField name="cli_ord_id" type="UUID">The unique client order identifier. This field is returned only if the order has a client order id.</ResponseField>
    <ResponseField name="direction" type="integer">The direction of the order, either 0 for a buy order or 1 for a sell order.</ResponseField>
    <ResponseField name="reduce_only" type="boolean">If true, the order can only reduce open positions, it cannot increase or open new positions.</ResponseField>
    <ResponseField name="triggerSignal" type="string">Trigger signal selected for take profit or stop loss order. Options are `last`, `mark`, or `spot`. Returned only for take profit or stop loss orders.</ResponseField>

    <ResponseField name="trailing_stop_options" type="list of structures">
      If this order is a trailing stop, this contains its parameters.

      <Expandable title="properties">
        <ResponseField name="max_deviation" type="double">The maximum distance the trigger price may be away from the trigger signal.</ResponseField>

        <ResponseField name="unit" type="string">
          <span>One of:</span> `percent`, `quote_currency`

          The unit of the deviation.
        </ResponseField>
      </Expandable>
    </ResponseField>
  </Expandable>
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "feed": "open_orders_snapshot",
    "account": "e258dba9-4dd4-4da5-bfef-75beb91c098e",
    "orders": [
      {
        "instrument": "PF_XBTUSD",
        "time": 1612275024153,
        "last_update_time": 1612275024153,
        "qty": 1000,
        "filled": 0,
        "limit_price": 34900,
        "stop_price": 13789,
        "type": "stop",
        "order_id": "723ba95f-13b7-418b-8fcf-ab7ba6620555",
        "direction": 1,
        "reduce_only": false,
        "triggerSignal": "last"
      },
      {
        "instrument": "PF_XBTUSD",
        "time": 1612275024153,
        "last_update_time": 1612275178153,
        "qty": 12,
        "filled": 0,
        "stop_price": 3200.1,
        "type": "trailing_stop",
        "order_id": "59302619-41d2-4f0b-941f-7e7914760ad3",
        "direction": 1,
        "reduce_only": false,
        "triggerSignal": "mark",
        "trailing_stop_options": {
          "max_deviation": 20.0,
          "unit": "percent"
        }
      },
      {
        "instrument": "PF_XBTUSD",
        "time": 1612275209430,
        "last_update_time": 1612275209430,
        "qty": 1000,
        "filled": 0,
        "limit_price": 35058,
        "stop_price": 0,
        "type": "limit",
        "order_id": "7a2f793e-26f3-4987-a938-56d296a11560",
        "direction": 1,
        "reduce_only": false
      }
    ]
  }
  ```
</CodeGroup>

***

## Response Delta

<ResponseField name="feed" type="string">
  The subscribed feed.
</ResponseField>

<ResponseField name="order" type="structure">
  The user order.

  <Expandable title="properties">
    <ResponseField name="instrument" type="string">The instrument (referred also as symbol or product\_id) of the order.</ResponseField>
    <ResponseField name="time" type="positive integer">The UTC time in milliseconds.</ResponseField>
    <ResponseField name="last_update_time" type="positive integer">The UTC time in milliseconds that the order was last updated.</ResponseField>
    <ResponseField name="qty" type="positive float">The quantity of the order.</ResponseField>
    <ResponseField name="filled" type="positive float">The total amount of the order that is filled.</ResponseField>
    <ResponseField name="limit_price" type="positive float">The limit price of the order.</ResponseField>
    <ResponseField name="stop_price" type="positive float">The stop price of the order.</ResponseField>
    <ResponseField name="type" type="string">The order type: `limit`, `take_profit`, or `stop`.</ResponseField>
    <ResponseField name="order_id" type="UUID">The order id.</ResponseField>
    <ResponseField name="cli_ord_id" type="UUID">The unique client order identifier. This field is returned only if the order has a client order id.</ResponseField>
    <ResponseField name="direction" type="integer">The direction of the order, either 0 for a buy order or 1 for a sell order.</ResponseField>
    <ResponseField name="reduce_only" type="boolean">If true, the order can only reduce open positions, it cannot increase or open new positions.</ResponseField>
    <ResponseField name="triggerSignal" type="string">Trigger signal selected for take profit or stop loss order. Options are `last`, `mark`, or `spot`. Returned only for take profit or stop loss orders.</ResponseField>

    <ResponseField name="trailing_stop_options" type="list of structures">
      If this order is a trailing stop, this contains its parameters.

      <Expandable title="properties">
        <ResponseField name="max_deviation" type="double">The maximum distance the trigger price may be away from the trigger signal.</ResponseField>

        <ResponseField name="unit" type="string">
          <span>One of:</span> `percent`, `quote_currency`

          The unit of the deviation.
        </ResponseField>
      </Expandable>
    </ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="is_cancel" type="boolean">
  If false the open order has been either placed or partially filled and needs to be updated. If true the open order was either fully filled, cancelled or rejected (for post-only). If it was filled or cancelled it must be removed from open orders snapshot.
</ResponseField>

<ResponseField name="reason" type="string">
  Reason behind the received delta:

  * `new_placed_order_by_user`: User placed a new order
  * `liquidation`: User position liquidated. The order cancelled
  * `stop_order_triggered`: A stop order triggered. The system removed the stop order
  * `limit_order_from_stop`: The system created a limit order because an existing stop order triggered
  * `partial_fill`: The order filled partially
  * `full_fill`: The order filled fully and removed
  * `cancelled_by_user`: The order cancelled by the user and removed
  * `contract_expired`: The order contract expired. All open orders of that contract removed
  * `not_enough_margin`: The order removed due to insufficient margin
  * `market_inactive`: The order removed because market became inactive
  * `cancelled_by_admin`: The order removed by administrator's action
  * `dead_man_switch`: The order removed because dead man's switch was triggered
  * `ioc_order_failed_because_it_would_not_be_executed`: The immediate or cancel order was rejected due to insufficient liquidity
  * `post_order_failed_because_it_would_filled`: The post only order was rejected as it crosses the spread and would be immediately filled
  * `would_execute_self`: The order was rejected as it would execute against another order from the same account
  * `would_not_reduce_position`: The order was rejected as the reduce-only option was selected and it would not reduce the position
  * `order_for_edit_not_found`: The order edit was rejected as the order to be edited could not be found
</ResponseField>

<CodeGroup>
  ```json Example: New Order theme={null}
  {
    "feed": "open_orders",
    "order": {
      "instrument": "PF_XBTUSD",
      "time": 1567702877410,
      "last_update_time": 1567702877410,
      "qty": 304.0,
      "filled": 0.0,
      "limit_price": 10640.0,
      "stop_price": 0.0,
      "type": "limit",
      "order_id": "59302619-41d2-4f0b-941f-7e7914760ad3",
      "direction": 1,
      "reduce_only": true
    },
    "is_cancel": false,
    "reason": "new_placed_order_by_user"
  }
  ```

  ```json Example: Cancelled Order theme={null}
  {
    "feed": "open_orders",
    "order_id": "660c6b23-8007-48c1-a7c9-4893f4572e8c",
    "is_cancel": true,
    "reason": "cancelled_by_user"
  }
  ```
</CodeGroup>

***

## Response Error

<ResponseField name="event" type="string">
  Value: `error`
</ResponseField>

<ResponseField name="message" type="string">
  <span>One of:</span> `Invalid feed`, `Json Error`

  An error message.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "error",
    "message": "Invalid feed"
  }
  ```
</CodeGroup>


# Open Orders (Verbose)
Source: https://docs.kraken.com/exchange/api-reference/futures-websocket/open_orders_verbose

Subscribe to verbose open orders information including failed post-only orders

<div>
  <span>WSS</span>
  <span>futures.kraken.com/ws/v1</span>
  <span>open\_orders\_verbose</span>
</div>

This subscription feed publishes information about user open orders. This feed adds extra information about all the post-only orders that failed to cross the book.

***

## Request

<ResponseField name="event" type="string">
  `subscribe` or `unsubscribe`
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `open_orders_verbose`
</ResponseField>

<ResponseField name="api_key" type="string">
  The user API key.
</ResponseField>

<ResponseField name="original_challenge" type="string">
  The message that is received from a challenge request.
</ResponseField>

<ResponseField name="signed_challenge" type="string">
  The signed challenge message with user API secret.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribe",
    "feed": "open_orders_verbose",
    "api_key": "CMl2SeSn09Tz+2tWuzPiPUjaXEQRGq6qv5UaexXuQ3SnahDQU/gO3aT+",
    "original_challenge": "226aee50-88fc-4618-a42a-34f7709570b2",
    "signed_challenge": "RE0DVOc7vS6pzcEjGWd/WJRRBWb54RkyvV+AZQSRl4+rap8Rlk64diR+Z9DQILm7qxncswMmJyvP/2vgzqqh+g=="
  }
  ```
</CodeGroup>

***

## Response Success

<ResponseField name="event" type="string">
  <span>One of:</span> `subscribed`, `subscribed_failed`, `unsubscribed`, `unsubscribed_failed`

  The result.
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `open_orders_verbose`
</ResponseField>

<ResponseField name="api_key" type="string">
  The user API key.
</ResponseField>

<ResponseField name="original_challenge" type="string">
  The message that is received from a challenge request.
</ResponseField>

<ResponseField name="signed_challenge" type="string">
  The signed challenge message with user API secret.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribed",
    "feed": "open_orders_verbose",
    "api_key": "CMl2SeSn09Tz+2tWuzPiPUjaXEQRGq6qv5UaexXuQ3SnahDQU/gO3aT+",
    "original_challenge": "226aee50-88fc-4618-a42a-34f7709570b2",
    "signed_challenge": "RE0DVOc7vS6pzcEjGWd/WJRRBWb54RkyvV+AZQSRl4+rap8Rlk64diR+Z9DQILm7qxncswMmJyvP/2vgzqqh+g=="
  }
  ```
</CodeGroup>

***

## Response Snapshot

<ResponseField name="feed" type="string">
  The subscribed feed.
</ResponseField>

<ResponseField name="account" type="string">
  The user account.
</ResponseField>

<ResponseField name="orders" type="list of structures">
  The user open orders.

  <Expandable title="properties">
    <ResponseField name="instrument" type="string">The instrument (referred also as symbol or product\_id) of the order.</ResponseField>
    <ResponseField name="time" type="positive integer">The UTC time in milliseconds.</ResponseField>
    <ResponseField name="last_update_time" type="positive integer">The UTC time in milliseconds that the order was last updated.</ResponseField>
    <ResponseField name="qty" type="positive float">The quantity of the order.</ResponseField>
    <ResponseField name="filled" type="positive float">The total amount of the order that has been filled.</ResponseField>
    <ResponseField name="limit_price" type="positive float">The limit price of the order.</ResponseField>
    <ResponseField name="stop_price" type="positive float">The stop price of the order.</ResponseField>
    <ResponseField name="type" type="string">The order type: `limit`, `take_profit`, or `stop`.</ResponseField>
    <ResponseField name="order_id" type="UUID">The order id.</ResponseField>
    <ResponseField name="cli_ord_id" type="UUID">The unique client order identifier. This field is returned only if the order has a client order id.</ResponseField>
    <ResponseField name="direction" type="integer">The direction of the order, either 0 for a buy order or 1 for a sell order.</ResponseField>
    <ResponseField name="reduce_only" type="boolean">If true, the order can only reduce open positions, it cannot increase or open new positions.</ResponseField>
    <ResponseField name="triggerSignal" type="string">Trigger signal selected for take profit or stop loss order. Options are `last`, `mark`, or `spot`. Returned only for take profit or stop loss orders.</ResponseField>
  </Expandable>
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "feed": "open_orders_verbose_snapshot",
    "account": "0f9c23b8-63e2-40e4-9592-6d5aa57c12ba",
    "orders": [
      {
        "instrument": "PF_XBTUSD",
        "time": 1567428848005,
        "last_update_time": 1567428848005,
        "qty": 100.0,
        "filled": 0.0,
        "limit_price": 8500.0,
        "stop_price": 0.0,
        "type": "limit",
        "order_id": "566942c8-a3b5-4184-a451-622b09493129",
        "direction": 0,
        "reduce_only": false
      },
      {
        "instrument": "PF_XBTUSD",
        "time": 1567428874347,
        "last_update_time": 1567428874347,
        "qty": 1501.0,
        "filled": 0.0,
        "limit_price": 7200.0,
        "stop_price": 0.0,
        "type": "limit",
        "order_id": "fcbb1459-6ed2-4b3c-a58c-67c4df7412cf",
        "direction": 0,
        "reduce_only": false
      },
      {
        "instrument": "PF_XBTUSD",
        "time": 1567515137945,
        "last_update_time": 1567515137945,
        "qty": 102.0,
        "filled": 0.0,
        "limit_price": 8500.0,
        "stop_price": 0.0,
        "type": "limit",
        "order_id": "3deea5c8-0274-4d33-988c-9e5a3895ccf8",
        "direction": 0,
        "reduce_only": false
      }
    ]
  }
  ```
</CodeGroup>

***

## Response Delta

<ResponseField name="feed" type="string">
  The subscribed feed.
</ResponseField>

<ResponseField name="order" type="structure">
  The user order.

  <Expandable title="properties">
    <ResponseField name="instrument" type="string">The instrument (referred also as symbol or product\_id) of the order.</ResponseField>
    <ResponseField name="time" type="positive integer">The UTC time in milliseconds.</ResponseField>
    <ResponseField name="last_update_time" type="positive integer">The UTC time in milliseconds that the order was last updated.</ResponseField>
    <ResponseField name="qty" type="positive float">The quantity of the order.</ResponseField>
    <ResponseField name="filled" type="positive float">The amount of the order that is filled.</ResponseField>
    <ResponseField name="limit_price" type="positive float">The limit price of the order.</ResponseField>
    <ResponseField name="stop_price" type="positive float">The stop price of the order.</ResponseField>
    <ResponseField name="type" type="string">The order type: `limit`, `take_profit`, or `stop`.</ResponseField>
    <ResponseField name="order_id" type="UUID">The order id.</ResponseField>
    <ResponseField name="cli_ord_id" type="UUID">The unique client order identifier. This field is returned only if the order has a client order id.</ResponseField>
    <ResponseField name="direction" type="integer">The direction of the order, either 0 for a buy order or 1 for a sell order.</ResponseField>
    <ResponseField name="reduce_only" type="boolean">If true, the order can only reduce open positions, it cannot increase or open new positions.</ResponseField>
    <ResponseField name="triggerSignal" type="string">Trigger signal selected for take profit or stop loss order. Options are `last`, `mark`, or `spot`. Returned only for take profit or stop loss orders.</ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="is_cancel" type="boolean">
  If false the open order has been either placed or partially filled and needs to be updated. If true the open order was either fully filled, cancelled or rejected (for post-only). If it was filled or cancelled it must be removed from open orders snapshot.
</ResponseField>

<ResponseField name="reason" type="string">
  Reason behind the received delta:

  * `new_placed_order_by_user`: User placed a new order
  * `liquidation`: User position liquidated. The order cancelled
  * `stop_order_triggered`: A stop order triggered. The system removed the stop order
  * `limit_order_from_stop`: The system created a limit order because an existing stop order triggered
  * `partial_fill`: The order filled partially
  * `full_fill`: The order filled fully and removed
  * `cancelled_by_user`: The order cancelled by the user and removed
  * `contract_expired`: The order contract expired. All open orders of that contract removed
  * `not_enough_margin`: The order removed due to insufficient margin
  * `market_inactive`: The order removed because market became inactive
  * `cancelled_by_admin`: The order removed by administrator's action
  * `dead_man_switch`: The order removed because dead man's switch was triggered
  * `ioc_order_failed_because_it_would_not_be_executed`: The immediate or cancel order was rejected due to insufficient liquidity
  * `post_order_failed_because_it_would_filled`: The post only order was rejected as it crosses the spread and would be immediately filled
  * `would_execute_self`: The order was rejected as it would execute against another order from the same account
  * `would_not_reduce_position`: The order was rejected as the reduce-only option was selected and it would not reduce the position
  * `order_for_edit_not_found`: The order edit was rejected as the order to be edited could not be found
</ResponseField>

<CodeGroup>
  ```json Example: Post-Only Rejected theme={null}
  {
    "feed": "open_orders_verbose",
    "order": {
      "instrument": "PF_XBTUSD",
      "time": 1567597581495,
      "last_update_time": 1567597581495,
      "qty": 102.0,
      "filled": 0.0,
      "limit_price": 10601.0,
      "stop_price": 0.0,
      "type": "limit",
      "order_id": "fa9806c9-cba9-4661-9f31-8c5fd045a95d",
      "direction": 0,
      "reduce_only": false
    },
    "is_cancel": true,
    "reason": "post_order_failed_because_it_would_be_filled"
  }
  ```

  ```json Example: Cancelled Order theme={null}
  {
    "feed": "open_orders_verbose",
    "order_id": "660c6b23-8007-48c1-a7c9-4893f4572e8c",
    "is_cancel": true,
    "reason": "cancelled_by_user"
  }
  ```
</CodeGroup>

***

## Response Error

<ResponseField name="event" type="string">
  Value: `error`
</ResponseField>

<ResponseField name="message" type="string">
  <span>One of:</span> `Invalid feed`, `Json Error`

  An error message.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "error",
    "message": "Invalid feed"
  }
  ```
</CodeGroup>


# Open Positions
Source: https://docs.kraken.com/exchange/api-reference/futures-websocket/open_position

Subscribe to open positions for your account

<div>
  <span>WSS</span>
  <span>futures.kraken.com/ws/v1</span>
  <span>open\_positions</span>
</div>

This subscription feed publishes the open positions of the user account.

***

## Request

<ResponseField name="event" type="string">
  `subscribe` or `unsubscribe`
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `open_positions`
</ResponseField>

<ResponseField name="api_key" type="string">
  The user API key.
</ResponseField>

<ResponseField name="original_challenge" type="string">
  The message that is received from a challenge request.
</ResponseField>

<ResponseField name="signed_challenge" type="string">
  The signed challenge message with user API secret.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribe",
    "feed": "open_positions",
    "api_key": "CMl2SeSn09Tz+2tWuzPiPUjaXEQRGq6qv5UaexXuQ3SnahDQU/gO3aT+",
    "original_challenge": "226aee50-88fc-4618-a42a-34f7709570b2",
    "signed_challenge": "RE0DVOc7vS6pzcEjGWd/WJRRBWb54RkyvV+AZQSRl4+rap8Rlk64diR+Z9DQILm7qxncswMmJyvP/2vgzqqh+g=="
  }
  ```
</CodeGroup>

***

## Response Success

<ResponseField name="event" type="string">
  <span>One of:</span> `subscribed`, `subscribed_failed`, `unsubscribed`, `unsubscribed_failed`

  The result.
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `open_positions`
</ResponseField>

<ResponseField name="api_key" type="string">
  The user API key.
</ResponseField>

<ResponseField name="original_challenge" type="string">
  The message that is received from a challenge request.
</ResponseField>

<ResponseField name="signed_challenge" type="string">
  The signed challenge message with user API secret.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribed",
    "feed": "open_positions",
    "api_key": "CMl2SeSn09Tz+2tWuzPiPUjaXEQRGq6qv5UaexXuQ3SnahDQU/gO3aT+",
    "original_challenge": "226aee50-88fc-4618-a42a-34f7709570b2",
    "signed_challenge": "RE0DVOc7vS6pzcEjGWd/WJRRBWb54RkyvV+AZQSRl4+rap8Rlk64diR+Z9DQILm7qxncswMmJyvP/2vgzqqh+g=="
  }
  ```
</CodeGroup>

***

## Response Snapshot

<ResponseField name="feed" type="string">
  The subscribed feed.
</ResponseField>

<ResponseField name="account" type="string">
  The user account.
</ResponseField>

<ResponseField name="seq" type="positive integer">
  The subscription message sequence number.
</ResponseField>

<ResponseField name="timestamp" type="positive integer">
  The UTC time in milliseconds.
</ResponseField>

<ResponseField name="positions" type="list of structures">
  A list containing the user open positions.

  <Expandable title="properties">
    <ResponseField name="instrument" type="string">The instrument (referred also as symbol or product\_id) of the order.</ResponseField>
    <ResponseField name="balance" type="float">The size of the position.</ResponseField>
    <ResponseField name="entry_price" type="positive float">The average entry price of the instrument.</ResponseField>
    <ResponseField name="mark_price" type="positive float">The market price of the position instrument.</ResponseField>
    <ResponseField name="index_price" type="positive float">The index price of the position instrument.</ResponseField>
    <ResponseField name="pnl" type="float">The profit and loss of the position.</ResponseField>
    <ResponseField name="liquidation_threshold" type="float">The mark price of the contract at which the position will be liquidated.</ResponseField>
    <ResponseField name="return_on_equity" type="float">The percentage gain or loss relative to the initial margin used in the position. Formula: PnL/IM.</ResponseField>
    <ResponseField name="unrealized_funding" type="float">Unrealised funding from funding rate.</ResponseField>
    <ResponseField name="effective_leverage" type="float">How leveraged the net position is in a given margin account. Formula: Position Value at Market / Portfolio Value.</ResponseField>
    <ResponseField name="initial_margin" type="float">The initial margin for the open position.</ResponseField>
    <ResponseField name="initial_margin_with_orders" type="float">The initial margin for the open position and open orders of the same instrument.</ResponseField>
    <ResponseField name="maintenance_margin" type="float">The maintenance margin for the open position.</ResponseField>
    <ResponseField name="pnl_currency" type="string">The profit currency for the position, not returned for inverse positions.</ResponseField>
    <ResponseField name="max_fixed_leverage" type="positive float">The maximum allowed fixed leverage for the position's instrument.</ResponseField>
    <ResponseField name="fill_time" type="ISO8601 datetime">The time the most recent fill occurred for this position.</ResponseField>
    <ResponseField name="iv" type="float">The option's implied volatility.</ResponseField>
    <ResponseField name="delta" type="float">Delta, the option value's sensitivity to change in the underlying price.</ResponseField>
    <ResponseField name="theta" type="float">Theta, the option value's sensitivity to the passage of time.</ResponseField>
    <ResponseField name="gamma" type="float">Gamma, delta's sensitivity to change in the underlying price.</ResponseField>
    <ResponseField name="vega" type="float">Vega, the option value's sensitivity to change in volatility.</ResponseField>
    <ResponseField name="rho" type="float">Rho, the option value's sensitivity to the interest rate.</ResponseField>
  </Expandable>
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "feed": "open_positions",
    "account": "DemoUser",
    "positions": [
      {
        "instrument": "PF_XRPUSD",
        "balance": 500.0,
        "pnl": -239.6506683474764,
        "entry_price": 0.3985,
        "mark_price": 0.4925844,
        "index_price": 0.49756,
        "liquidation_threshold": 0.0,
        "effective_leverage": 0.17404676894304316,
        "return_on_equity": -2.3609636135508127,
        "initial_margin": 101.5054475943615,
        "initial_margin_with_orders": 101.5054475943615,
        "maintenance_margin": 50.75272379718075
      },
      {
        "instrument": "PF_XBTUSD",
        "balance": 0.04,
        "pnl": 119.56244985549435,
        "entry_price": 26911.75,
        "mark_price": 29900.81124638736,
        "index_price": 29900.47,
        "liquidation_threshold": 9572.804662403718,
        "effective_leverage": 0.31865408963748215,
        "return_on_equity": 5.553450159107747,
        "unrealized_funding": 0.0004114160669590132,
        "initial_margin": 21.529400000000003,
        "initial_margin_with_orders": 21.529400000000003,
        "maintenance_margin": 10.764700000000001,
        "pnl_currency": "USD"
      },
      {
        "instrument": "OF_ETHUSD_240101_1000_C",
        "balance": 0.04,
        "pnl": 119.56244985549435,
        "entry_price": 26911.75,
        "mark_price": 29900.81124638736,
        "index_price": 29900.47,
        "return_on_equity": 5.553450159107747,
        "iv": 0.3,
        "delta": 0.5,
        "gamma": 0.5,
        "vega": 0.5,
        "theta": 0.5,
        "rho": 0.5
      }
    ],
    "seq": 4,
    "timestamp": 1687383625330
  }
  ```
</CodeGroup>

***

## Response Error

<ResponseField name="event" type="string">
  Value: `error`
</ResponseField>

<ResponseField name="message" type="string">
  <span>One of:</span> `Invalid product id`, `Invalid feed`, `Json Error`

  An error message.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "error",
    "message": "Invalid product id"
  }
  ```
</CodeGroup>


# Ticker
Source: https://docs.kraken.com/exchange/api-reference/futures-websocket/ticker

Subscribe to ticker information about listed products

<div>
  <span>WSS</span>
  <span>futures.kraken.com/ws/v1</span>
  <span>ticker</span>
</div>

The `ticker` feed returns ticker information about listed products. Only tradeable markets are available via individual WebSocket market data feeds. Delta messages are throttled such that they are published every 1s.

***

## Request

<ResponseField name="event" type="string">
  `subscribe` or `unsubscribe`
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `ticker`
</ResponseField>

<ResponseField name="product_ids" type="list of strings">
  A list of strings which represent the products that user will receive information upon.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribe",
    "feed": "ticker",
    "product_ids": ["PF_XBTUSD"]
  }
  ```
</CodeGroup>

***

## Response Success

<ResponseField name="event" type="string">
  <span>One of:</span> `subscribed`, `subscribed_failed`, `unsubscribed`, `unsubscribed_failed`

  The result.
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `ticker`
</ResponseField>

<ResponseField name="product_ids" type="list of strings">
  A list of strings which represent the products that user will receive information upon.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribed",
    "feed": "ticker",
    "product_ids": ["PF_XBTUSD"]
  }
  ```
</CodeGroup>

***

## Response Snapshot

The subscription data will return values for all fields even if the value of only a single field has changed since the last payload.

<ResponseField name="time" type="positive integer">
  The UTC time of the server in milliseconds.
</ResponseField>

<ResponseField name="product_id" type="string">
  The subscribed product (referred also as instrument or symbol).
</ResponseField>

<ResponseField name="funding_rate" type="float">
  The current funding rate. If zero, field is not populated. (Perpetuals only)
</ResponseField>

<ResponseField name="funding_rate_prediction" type="float">
  The estimated next funding rate. If zero, field is not populated. (Perpetuals only)
</ResponseField>

<ResponseField name="relative_funding_rate" type="float">
  The absolute funding rate relative to the spot price at the time of funding rate calculation. If zero, field is not populated. (Perpetuals only)
</ResponseField>

<ResponseField name="relative_funding_rate_prediction" type="float">
  The estimated next absolute funding rate relative to the current spot price. If zero, field is not populated. (Perpetuals only)
</ResponseField>

<ResponseField name="next_funding_rate_time" type="float">
  The time until next funding rate in milliseconds. (Perpetuals only)
</ResponseField>

<ResponseField name="feed" type="string">
  The subscribed feed.
</ResponseField>

<ResponseField name="bid" type="positive float">
  The price of the current best bid.
</ResponseField>

<ResponseField name="ask" type="positive float">
  The price of the current best ask.
</ResponseField>

<ResponseField name="bid_size" type="positive float">
  The size of the current best bid.
</ResponseField>

<ResponseField name="ask_size" type="positive float">
  The size of the current best ask.
</ResponseField>

<ResponseField name="volume" type="positive float">
  The sum of the sizes of all fills observed in the last 24 hours.
</ResponseField>

<ResponseField name="dtm" type="positive integer">
  The days until maturity.
</ResponseField>

<ResponseField name="leverage" type="string">
  The leverage of the product.
</ResponseField>

<ResponseField name="index" type="positive float">
  The real time index of the product.
</ResponseField>

<ResponseField name="last" type="positive float">
  The price of the last fill.
</ResponseField>

<ResponseField name="change" type="float">
  The 24h change in price.
</ResponseField>

<ResponseField name="suspended" type="boolean">
  True if the market is suspended.
</ResponseField>

<ResponseField name="tag" type="string">
  Currently can be `perpetual`, `month` or `quarter`. Other tags may be added without notice.
</ResponseField>

<ResponseField name="pair" type="string">
  The currency pair of the instrument.
</ResponseField>

<ResponseField name="openInterest" type="float">
  The current open interest of the instrument.
</ResponseField>

<ResponseField name="markPrice" type="float">
  The market price of the instrument.
</ResponseField>

<ResponseField name="maturityTime" type="positive integer">
  The UTC time, in milliseconds, at which the contract will stop trading.
</ResponseField>

<ResponseField name="post_only" type="boolean">
  True if the market is in post-only.
</ResponseField>

<ResponseField name="volumeQuote" type="positive float">
  The same as `volume` except that, for multi-collateral futures, it is converted to the non-base currency.
</ResponseField>

<ResponseField name="open" type="positive float">
  The first traded price in the last 24h.
</ResponseField>

<ResponseField name="high" type="positive float">
  The highest traded price in the last 24h.
</ResponseField>

<ResponseField name="low" type="positive float">
  The lowest traded price in the last 24h.
</ResponseField>

<ResponseField name="premium" type="float">
  The current premium (percentage difference between the futures price and the index price).
</ResponseField>

<ResponseField name="greeks" type="structure">
  The current Greeks, if this is an option.

  <Expandable title="properties">
    <ResponseField name="iv" type="float">The option's implied volatility.</ResponseField>
    <ResponseField name="delta" type="float">Delta, the option value's sensitivity to change in the underlying price.</ResponseField>
    <ResponseField name="theta" type="float">Theta, the option value's sensitivity to the passage of time.</ResponseField>
    <ResponseField name="gamma" type="float">Gamma, delta's sensitivity to change in the underlying price.</ResponseField>
    <ResponseField name="vega" type="float">Vega, the option value's sensitivity to change in volatility.</ResponseField>
    <ResponseField name="rho" type="float">Rho, the option value's sensitivity to the interest rate.</ResponseField>
  </Expandable>
</ResponseField>

<CodeGroup>
  ```json Example: Futures Snapshot theme={null}
  {
    "time": 1676393235406,
    "product_id": "PF_XBTUSD",
    "funding_rate": -6.2604214e-11,
    "funding_rate_prediction": -3.65989977e-10,
    "relative_funding_rate": -1.380384722222e-6,
    "relative_funding_rate_prediction": -8.047629166667e-6,
    "next_funding_rate_time": 1676394000000,
    "feed": "ticker",
    "bid": 21978.5,
    "ask": 21987.0,
    "bid_size": 2536.0,
    "ask_size": 13948.0,
    "volume": 31403908.0,
    "dtm": 0,
    "leverage": "50x",
    "index": 21984.54,
    "premium": -0.0,
    "last": 21983.5,
    "change": 1.9974017538161748,
    "suspended": false,
    "tag": "perpetual",
    "pair": "XBT:USD",
    "openInterest": 30072580.0,
    "markPrice": 21979.68641534714,
    "maturityTime": 0,
    "post_only": false,
    "volumeQuote": 31403908.0,
    "open": 21968.5,
    "high": 22123.0,
    "low": 21456.0
  }
  ```

  ```json Example: Options Snapshot theme={null}
  {
    "time": 1676393235406,
    "product_id": "OF_ETHUSD_240101_1000_C",
    "feed": "ticker",
    "bid": 21978.5,
    "ask": 21987.0,
    "bid_size": 2536.0,
    "ask_size": 13948.0,
    "volume": 31403908.0,
    "dtm": 0,
    "index": 21984.54,
    "last": 21983.5,
    "change": 1.9974017538161748,
    "suspended": false,
    "tag": "month",
    "pair": "ETH:USD",
    "openInterest": 30072580.0,
    "markPrice": 100.68641534714,
    "maturityTime": 1676393235406,
    "post_only": false,
    "volumeQuote": 31403908.0,
    "greeks": {
      "iv": 0.3,
      "delta": 0.5,
      "gamma": 0.5,
      "vega": 0.5,
      "theta": 0.5,
      "rho": 0.5
    }
  }
  ```
</CodeGroup>

***

## Response Error

<ResponseField name="event" type="string">
  Value: `error`
</ResponseField>

<ResponseField name="message" type="string">
  <span>One of:</span> `Invalid product id`, `Invalid feed`, `Json Error`

  An error message.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "error",
    "message": "Invalid product id"
  }
  ```
</CodeGroup>


# Ticker Lite
Source: https://docs.kraken.com/exchange/api-reference/futures-websocket/ticker_lite

Subscribe to lightweight ticker information about listed products

<div>
  <span>WSS</span>
  <span>futures.kraken.com/ws/v1</span>
  <span>ticker\_lite</span>
</div>

The `ticker_lite` feed returns ticker information about listed products. Delta messages are throttled such that they are published every 1s.

***

## Request

<ResponseField name="event" type="string">
  `subscribe` or `unsubscribe`
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `ticker_lite`
</ResponseField>

<ResponseField name="product_ids" type="list of strings">
  A list of strings which represent the products that user will receive information upon.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribe",
    "feed": "ticker_lite",
    "product_ids": ["PF_XBTUSD", "PF_ETHUSD"]
  }
  ```
</CodeGroup>

***

## Response Success

<ResponseField name="event" type="string">
  <span>One of:</span> `subscribed`, `subscribed_failed`, `unsubscribed`, `unsubscribed_failed`

  The result.
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `ticker_lite`
</ResponseField>

<ResponseField name="product_ids" type="list of strings">
  A list of strings which represent the products that user will receive information upon.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribed",
    "feed": "ticker_lite",
    "product_ids": ["PF_XBTUSD"]
  }
  ```
</CodeGroup>

***

## Response Snapshot

<ResponseField name="feed" type="string">
  The subscribed feed.
</ResponseField>

<ResponseField name="product_id" type="string">
  The subscribed product (referred also as instrument or symbol).
</ResponseField>

<ResponseField name="bid" type="positive float">
  The price of the current best bid.
</ResponseField>

<ResponseField name="ask" type="positive float">
  The price of the current best ask.
</ResponseField>

<ResponseField name="change" type="float">
  The 24h change in price.
</ResponseField>

<ResponseField name="premium" type="float">
  The premium associated with the product.
</ResponseField>

<ResponseField name="volume" type="positive float">
  The sum of the sizes of all fills observed in the last 24 hours.
</ResponseField>

<ResponseField name="tag" type="string">
  Currently can be `perpetual`, `month`, `quarter`, or `semiannual`. Other tags may be added without notice.
</ResponseField>

<ResponseField name="pair" type="string">
  The currency pair of the instrument.
</ResponseField>

<ResponseField name="dtm" type="integer">
  The days until maturity.
</ResponseField>

<ResponseField name="maturityTime" type="positive integer">
  Maturity time in milliseconds.
</ResponseField>

<ResponseField name="volumeQuote" type="positive float">
  The same as `volume` except that, for multi-collateral futures, it is converted to the non-base currency.
</ResponseField>

<ResponseField name="greeks" type="structure">
  The current Greeks, if this is an option.

  <Expandable title="properties">
    <ResponseField name="iv" type="float">The option's implied volatility.</ResponseField>
    <ResponseField name="delta" type="float">Delta, the option value's sensitivity to change in the underlying price.</ResponseField>
    <ResponseField name="theta" type="float">Theta, the option value's sensitivity to the passage of time.</ResponseField>
    <ResponseField name="gamma" type="float">Gamma, delta's sensitivity to change in the underlying price.</ResponseField>
    <ResponseField name="vega" type="float">Vega, the option value's sensitivity to change in volatility.</ResponseField>
    <ResponseField name="rho" type="float">Rho, the option value's sensitivity to the interest rate.</ResponseField>
  </Expandable>
</ResponseField>

<CodeGroup>
  ```json Example: Perpetual theme={null}
  {
    "feed": "ticker_lite",
    "product_id": "PF_XBTUSD",
    "bid": 34932,
    "ask": 34949.5,
    "change": 3.3705205220015966,
    "premium": 0.1,
    "volume": 264126741,
    "tag": "perpetual",
    "pair": "XBT:USD",
    "dtm": 0,
    "maturityTime": 0,
    "volumeQuote": 264126741
  }
  ```

  ```json Example: Perpetual (ETH) theme={null}
  {
    "feed": "ticker_lite",
    "product_id": "PF_ETHUSD",
    "bid": 1753.45,
    "ask": 1760.35,
    "change": 13.448175559936647,
    "premium": 0.1,
    "volume": 6899673.0,
    "tag": "perpetual",
    "pair": "ETH:USD",
    "dtm": 0,
    "maturityTime": 0,
    "volumeQuote": 6899673.0
  }
  ```
</CodeGroup>

***

## Response Error

<ResponseField name="event" type="string">
  Value: `error`
</ResponseField>

<ResponseField name="message" type="string">
  <span>One of:</span> `Invalid product id`, `Invalid feed`, `Json Error`

  An error message.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "error",
    "message": "Invalid product id"
  }
  ```
</CodeGroup>


# Trade
Source: https://docs.kraken.com/exchange/api-reference/futures-websocket/trade

Subscribe to information about executed trades

<div>
  <span>WSS</span>
  <span>futures.kraken.com/ws/v1</span>
  <span>trade</span>
</div>

The `trade` feed returns information about executed trades.

***

## Request

<ResponseField name="event" type="string">
  `subscribe` or `unsubscribe`
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `trade`
</ResponseField>

<ResponseField name="product_ids" type="list of strings">
  A list of strings which represent the products that user will receive information upon.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribe",
    "feed": "trade",
    "product_ids": ["PF_XBTUSD"]
  }
  ```
</CodeGroup>

***

## Response Success

<ResponseField name="event" type="string">
  <span>One of:</span> `subscribed`, `subscribed_failed`, `unsubscribed`, `unsubscribed_failed`

  The result.
</ResponseField>

<ResponseField name="feed" type="string">
  The requested subscription feed. Value: `trade`
</ResponseField>

<ResponseField name="product_ids" type="list of strings">
  A list of strings which represent the products that user will receive information upon.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "subscribed",
    "feed": "trade",
    "product_ids": ["PF_XBTUSD"]
  }
  ```
</CodeGroup>

***

## Response Snapshot

<ResponseField name="feed" type="string">
  The subscribed feed.
</ResponseField>

<ResponseField name="product_id" type="string">
  The subscribed product (referred also as instrument or symbol).
</ResponseField>

<ResponseField name="trades" type="list of structures">
  <Expandable title="properties">
    <ResponseField name="feed" type="string">Always `trade`.</ResponseField>
    <ResponseField name="product_id" type="string">The product symbol.</ResponseField>
    <ResponseField name="uid" type="string">Unique identifier for the matched trade.</ResponseField>
    <ResponseField name="side" type="string">The classification of the taker side in the matched trade: `buy` if the taker is a buyer, `sell` if the taker is a seller.</ResponseField>
    <ResponseField name="type" type="string">The classification of the matched trade in an orderbook: `fill` if it is a normal buyer and seller, `liquidation` if it is a result of a user being liquidated from their position, `termination` if it is a result of a user being terminated, or `block` if it is a component of a block trade.</ResponseField>
    <ResponseField name="seq" type="positive integer">The subscription message sequence number.</ResponseField>
    <ResponseField name="time" type="positive integer">The UTC or GMT time of the trade in milliseconds.</ResponseField>
    <ResponseField name="qty" type="positive float">The quantity of the traded product.</ResponseField>
    <ResponseField name="price" type="positive float">The price that the product got traded.</ResponseField>
  </Expandable>
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "feed": "trade_snapshot",
    "product_id": "PF_XBTUSD",
    "trades": [
      {
        "feed": "trade",
        "product_id": "PF_XBTUSD",
        "uid": "caa9c653-420b-4c24-a9f1-462a054d86f1",
        "side": "sell",
        "type": "fill",
        "seq": 655508,
        "time": 1612269657781,
        "qty": 440,
        "price": 34893
      },
      {
        "feed": "trade",
        "product_id": "PF_XBTUSD",
        "uid": "45ee9737-1877-4682-bc68-e4ef818ef88a",
        "side": "sell",
        "type": "fill",
        "seq": 655507,
        "time": 1612269656839,
        "qty": 9643,
        "price": 34891
      }
    ]
  }
  ```
</CodeGroup>

***

## Response Delta

<ResponseField name="feed" type="string">
  The subscribed feed.
</ResponseField>

<ResponseField name="product_id" type="string">
  The subscribed product (referred also as instrument or symbol).
</ResponseField>

<ResponseField name="uid" type="string">
  Unique identifier for the matched trade.
</ResponseField>

<ResponseField name="side" type="string">
  The classification of the taker side in the matched trade: `buy` if the taker is a buyer, `sell` if the taker is a seller.
</ResponseField>

<ResponseField name="type" type="string">
  The classification of the matched trade in an orderbook: `fill` if it is a normal buyer and seller, `liquidation` if it is a result of a user being liquidated from their position, `termination` if it is a result of a user being terminated, or `block` if it is a component of a block trade.
</ResponseField>

<ResponseField name="seq" type="positive integer">
  The subscription message sequence number.
</ResponseField>

<ResponseField name="time" type="positive integer">
  The UTC or GMT time of the trade in milliseconds.
</ResponseField>

<ResponseField name="qty" type="positive float">
  The quantity of the traded product.
</ResponseField>

<ResponseField name="price" type="positive float">
  The price that the product got traded.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "feed": "trade",
    "product_id": "PF_XBTUSD",
    "uid": "05af78ac-a774-478c-a50c-8b9c234e071e",
    "side": "sell",
    "type": "fill",
    "seq": 653355,
    "time": 1612266317519,
    "qty": 15000,
    "price": 34969.5
  }
  ```
</CodeGroup>

***

## Response Error

<ResponseField name="event" type="string">
  Value: `error`
</ResponseField>

<ResponseField name="message" type="string">
  <span>One of:</span> `Invalid product id`, `Invalid feed`, `Json Error`

  An error message.
</ResponseField>

<CodeGroup>
  ```json Example theme={null}
  {
    "event": "error",
    "message": "Invalid product id"
  }
  ```
</CodeGroup>


# Exchange API reference
Source: https://docs.kraken.com/exchange/api-reference/overview

Choose a protocol — REST, WebSocket, or FIX — for Spot or Derivatives trading

Kraken's Exchange APIs span two trading engines (Spot and Derivatives) and three protocols (REST, WebSocket, FIX). Pick the surface that matches your workflow.

<Note>
  New here? Start with [Choose your protocol](/exchange/guides/general/api-comparison) for a side-by-side feature and latency comparison.
</Note>

## Spot

Order management, account data, market data, funding, and Earn on Kraken's Spot trading engine.

<CardGroup>
  <Card title="Spot REST" icon="code" href="/api-reference/market-data/get-server-time">
    Account, trading, funding, and Earn. Public and private endpoints over HTTPS.
  </Card>

  <Card title="Spot WebSocket" icon="bolt" href="/exchange/api-reference/spot-websocket">
    Real-time market data and order entry. v2 recommended; v1 maintained.
  </Card>

  <Card title="Spot FIX" icon="terminal" href="/exchange/api-reference/unified-fix">
    Lowest-latency order entry via Unified FIX 4.4.
  </Card>
</CardGroup>

## Derivatives

Perpetuals and dated contracts on BTC, ETH, and more.

<CardGroup>
  <Card title="Derivatives REST" icon="code" href="/api-reference/market-data/get-tickers">
    Order entry, account, positions, fills, and historical data.
  </Card>

  <Card title="Derivatives WebSocket" icon="bolt" href="/exchange/api-reference/futures-websocket">
    Streaming-only market data and account updates.
  </Card>

  <Card title="Derivatives FIX" icon="terminal" href="/exchange/api-reference/unified-fix">
    Order entry via Unified FIX 4.4 — same session as Spot FIX.
  </Card>
</CardGroup>

## Not sure where to start?

<CardGroup>
  <Card title="Choose your protocol" icon="table" href="/exchange/guides/general/api-comparison">
    Side-by-side feature, latency, and sequencing comparison.
  </Card>

  <Card title="Authentication" icon="lock" href="/exchange/guides/rest/authentication">
    HMAC-SHA512 signing for REST and WebSocket private endpoints.
  </Card>

  <Card title="Rate limits" icon="gauge" href="/exchange/guides/general/ratelimits">
    Limits across REST, WebSocket, and FIX.
  </Card>

  <Card title="Errors" icon="triangle-exclamation" href="/exchange/guides/general/errors">
    Common errors and how to resolve them.
  </Card>
</CardGroup>


# Spot WebSocket
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket

Reference for the Spot WebSocket API — v2 (recommended) and v1 (maintained)

Real-time market data and streaming order entry over a persistent
connection. **v2 is recommended for all new integrations**; v1 is
maintained for existing clients.

For connection details, version differences, ping/pong, and rate-limit
behaviour, see the [Spot WebSocket
overview](/exchange/guides/websockets/introduction).

## Endpoints

| Environment  | Public                        | Private (auth)                     |
| :----------- | :---------------------------- | :--------------------------------- |
| v2 — Primary | `wss://ws.kraken.com/v2`      | `wss://ws-auth.kraken.com/v2`      |
| v2 — Beta    | `wss://beta-ws.kraken.com/v2` | `wss://beta-ws-auth.kraken.com/v2` |
| v1 — Primary | `wss://ws.kraken.com`         | `wss://ws-auth.kraken.com`         |
| v1 — Beta    | `wss://beta-ws.kraken.com`    | `wss://beta-ws-auth.kraken.com`    |

Beta endpoints share the production trading engine but receive new
features ahead of primary — used for client validation when announced.

## Authentication

Private channels require a **WebSocket token**, retrieved via the Spot
REST endpoint
[`GetWebSocketsToken`](/api-reference/trading/get-websockets-token).
Tokens are short-lived; obtain a fresh token on each connection.

See [WebSocket
authentication](/exchange/guides/websockets/authentication) for the
full flow.

## v2 vs v1

| Feature                | v1            | v2                          |
| :--------------------- | :------------ | :-------------------------- |
| Message format         | Array         | Normalised JSON object      |
| Symbol format          | `XBT/USD`     | `BTC/USD`                   |
| Timestamp              | Epoch sec, μs | RFC 3339 (`2026-04-28T...`) |
| L3 order-by-order book | —             | ✅                           |
| Book checksum          | Updates only  | Snapshot + updates          |
| Trade ID               | —             | Sequential int              |
| New features           | Frozen        | Active                      |

## Quick start

<CardGroup>
  <Card title="book (L2)" icon="layer-group" href="/exchange/api-reference/spot-websocket-v2/book">
    Order book snapshots + incremental updates with CRC32 checksums.
  </Card>

  <Card title="executions" icon="receipt" href="/exchange/api-reference/spot-websocket-v2/executions">
    Private order acks, fills, and amends — the canonical order-state stream.
  </Card>

  <Card title="add_order" icon="plus" href="/exchange/api-reference/spot-websocket-v2/add_order">
    Place an order over the open WebSocket connection.
  </Card>

  <Card title="cancel_after" icon="clock" href="/exchange/api-reference/spot-websocket-v2/cancel_after">
    Dead-man's switch — cancel all orders if the client stops checking in.
  </Card>
</CardGroup>

The complete v2 catalog (book, level3, ticker, trade, ohlc, instrument,
executions, balances, add\_order, amend\_order, cancel\_order, batch\_add,
batch\_cancel, cancel\_all, cancel\_after, ping, heartbeat, status) and
the v1 catalog (book, ticker, trade, spread, ohlc, ownTrades,
openOrders, addOrder, cancelOrder, cancelAll, systemStatus, heartbeat,
ping) are available under the **Spot WebSocket v2** and **Spot
WebSocket v1** dropdowns in the left navigation.

## Connection management

Send a `ping` at least every 60 seconds. On reconnect, resubscribe to
each channel and reconcile state — the
[reconnection guide](/exchange/guides/websockets/reconnection) walks
through resubscription, sequence handling, and book recovery.

## Related

<CardGroup>
  <Card title="WebSocket overview" icon="bolt" href="/exchange/guides/websockets/introduction">
    Connection details, v1 vs v2, beta endpoints.
  </Card>

  <Card title="WebSocket authentication" icon="key" href="/exchange/guides/websockets/authentication">
    Token retrieval and signed challenge flow.
  </Card>

  <Card title="Book checksum (v2)" icon="check" href="/exchange/guides/websockets/book-checksum-v2">
    Validate book consistency after every update.
  </Card>

  <Card title="L3 checksum (v2)" icon="check" href="/exchange/guides/websockets/l3-checksum-v2">
    L3 order-by-order checksum logic.
  </Card>

  <Card title="Reconnection" icon="rotate" href="/exchange/guides/websockets/reconnection">
    Disconnect handling and resubscribe.
  </Card>

  <Card title="Choose your protocol" icon="code-compare" href="/exchange/guides/general/api-comparison">
    WebSocket vs FIX vs REST trade-offs.
  </Card>
</CardGroup>


# Add Order
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v1/addorder

Send a single new order into the exchange

<div>
  <span>WSS</span>
  <span>ws-auth.kraken.com</span>
  <span>addOrder</span>
</div>

Sends a single, new order into the exchange. A range of order types, Time-In-Force (TIF) and order flags can be specified by the parameters below.

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `addOrder`
    </ResponseField>

    <ResponseField name="ordertype" type="string">
      <span>One of:</span> `limit`, `market`, `stop-loss`, `stop-loss-limit`, `take-profit`, `take-profit-limit`, `trailing-stop`, `trailing-stop-limit`, `settle-position`

      The execution model for the order.
    </ResponseField>

    <ResponseField name="type" type="string">
      <span>One of:</span> `buy`, `sell`

      Side of the order.
    </ResponseField>

    <ResponseField name="pair" type="string">
      <span>Example:</span> `BTC/USD`

      Currency pair.
    </ResponseField>

    <ResponseField name="price" type="string">
      This parameter represents the limit price or trigger price depending on the order type:

      * **limit** price for `limit` orders.
      * **trigger** price for `stop-loss`, `stop-loss-limit`, `take-profit`, `take-profit-limit`, `trailing-stop` and `trailing-stop-limit` orders.

      To specify a relative price, this field can be prefixed by `+`, `-`, or `#` to specify the order price as an offset relative to the last traded price.

      * `+` adds the amount to the last traded price.
      * `-` subtracts the amount from the last traded price.
      * `#` will either add or subtract the amount to the last traded price, depending on the direction.

      Prices can also be suffixed with a `%` to signify the relative amount as a percentage, rather than an absolute price difference in the quote currency. Example, to specify a price as 2% from last price use `"+2%"`.

      Note, trailing stop order types must use a relative price for this field, i.e. `+` to represent the reversion from the peak / trough price.
    </ResponseField>

    <ResponseField name="price2" type="string">
      This parameter represents the **limit** price for `stop-loss-limit`, `take-profit-limit` and `trailing-stop-limit` orders.

      To specify a relative price, this field can be prefixed by `+` or `-` to specify the order price as an offset relative to the market price.

      * `+` adds the amount to the reference price.
      * `-` subtracts the amount from the reference price.

      Prices can also be suffixed with a `%` to signify the relative amount as a percentage, rather than an absolute price difference in the quote currency. Example, to specify a price as 2% from last price use `"+2%"`.

      Note, trailing stop order types must use a relative price for this field, i.e. `+` or `-` to represent the offset from the triggered price.
    </ResponseField>

    <ResponseField name="volume" type="string">
      Order volume in base currency.
    </ResponseField>

    <ResponseField name="leverage" type="string">
      <span>One of:</span> `2`, `3`, `4`, `5`

      Funds the order on margin using the amount of leverage specified. The maximum leverage available differs across pairs.
    </ResponseField>

    <ResponseField name="margin" type="boolean">
      <span>One of:</span> `false`, `true`<br />
      <span>Default:</span> `false`

      Funds the order on margin using the maximum leverage for the pair. Note, absolute max leverage is 5.
    </ResponseField>

    <ResponseField name="reduce_only" type="boolean">
      <span>One of:</span> `false`, `true`<br />
      <span>Default:</span> `false`<br />
      <span>Condition:</span> Margin orders only

      If true, order will only reduce a currently open position, not increase it or open a new position.
    </ResponseField>

    <ResponseField name="oflags" type="string">
      <span>One of:</span> `fciq`, `fcib`, `nompp`, `post`, `viqc`

      Comma delimited list of order flags.

      * `fcib`: prefer fee in base currency (default if selling)
      * `fciq`: prefer fee in quote currency (default if buying, mutually exclusive with fcib)
      * `nompp`: no market price protection. DEPRECATED. If supplied, the flag is accepted but ignored
      * `post`: post only order (only on limit orders).
      * `viqc`: volume in quote currency (only available on buy market orders without margin funding).
    </ResponseField>

    <ResponseField name="starttm" type="string">
      Scheduled start time. 0 = now (default) `+n` = schedule start time `n` seconds from now `n` = unix timestamp of start time.
    </ResponseField>

    <ResponseField name="expiretm" type="string">
      Expiration time. 0 = no expiration (default) `+n` = expire `n` seconds from now `n` = unix timestamp of expiration time. GTD orders can have an expiry time up to one month in future.
    </ResponseField>

    <ResponseField name="deadline" type="string">
      <span>Format:</span> RFC3339<br />
      <span>Example:</span> `2022-12-25T09:30:59.123Z`

      Range of valid offsets (from current time) is 500 milliseconds to 60 seconds, default is 5 seconds. The precision of this parameter is to the millisecond. The engine will prevent this order from matching after this time, it provides protection against latency on time sensitive orders.
    </ResponseField>

    <ResponseField name="cl_ord_id" type="string">
      Adds an alphanumeric client order identifier which uniquely identifies an open order for each client. This field is mutually exclusive with `userref` parameter.

      The `cl_ord_id` parameter can be one of the following formats:

      * Long UUID: `6d1b345e-2821-40e2-ad83-4ecb18a06876` 32 hex characters separated with 4 dashes.
      * Short UUID: `da8e4ad59b78481c93e589746b0cf91f` 32 hex characters with no dashes.
      * Free text: `arb-20240509-00010` Free format ascii text up to 18 characters.
    </ResponseField>

    <ResponseField name="userref" type="string">
      <span>Example:</span> `"123456789"`

      This is an optional non-unique, numeric identifier which can be associated with a number of orders by the client. This field is mutually exclusive with `cl_ord_id` parameter.

      Many clients choose a unique integer value generated by their systems (i.e. a timestamp). However, because we don't enforce uniqueness on our side, it can also be used to easily tag a group of orders for querying or cancelling.
    </ResponseField>

    <ResponseField name="sender_sub_id" type="string">
      <span>Condition:</span> For institutional accounts with enhanced Self Trade Prevention (STP)

      Adds an alphanumeric sub-account/trader identifier which enables STP to be performed at a more granular level.

      The `sender_sub_id` parameter can be one of the following formats:

      * Long UUID: `6d1b345e-2821-40e2-ad83-4ecb18a06876` 32 hex characters separated with 4 dashes.
      * Short UUID: `da8e4ad59b78481c93e589746b0cf91f` 32 hex characters with no dashes.
      * Free text: `arb-20240509-00010` Free format ascii text up to 18 characters.
    </ResponseField>

    <ResponseField name="stp_type" type="string">
      <span>One of:</span> `cancel_newest`, `cancel_oldest`, `cancel_both`<br />
      <span>Default:</span> `cancel_newest`

      Self Trade Prevention (STP) is a protection feature to prevent users from inadvertently or deliberately trading against themselves.

      To prevent a self-match, one of the following STP modes can be used to define which order(s) will be expired:

      * `cancel_newest`: arriving order will be canceled.
      * `cancel_oldest`: resting order will be canceled.
      * `cancel_both`: both arriving and resting orders will be canceled.
    </ResponseField>

    <ResponseField name="validate" type="string">
      Validate inputs only; do not submit order.
    </ResponseField>

    <ResponseField name="timeinforce" type="string">
      <span>One of:</span> `GTC`, `GTD`, `IOC`, `FOK`<br />
      <span>Default:</span> `GTC`

      Time-in-force specifies how long an order remains in effect before expiry.

      * `GTC`: Good Till Canceled - until user has cancelled.
      * `GTD`: Good Till Date - until `expiretm` parameter.
      * `IOC`: Immediate Or Cancel - immediately cancels back any quantity that cannot be filled on arrival.
      * `FOK`: Fill Or Kill - immediately fills the full order quantity or cancels it entirely.
    </ResponseField>

    <ResponseField name="close[ordertype]" type="string">
      Order type of the secondary OTO order.
    </ResponseField>

    <ResponseField name="close[price]" type="string">
      `price` of OTO secondary order - see `price` parameter.
    </ResponseField>

    <ResponseField name="close[price2]" type="string">
      `price2` of OTO secondary order - see `price2` parameter.
    </ResponseField>

    <ResponseField name="reqid" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="token" type="string">
      Session token from the [GetWebSocketsToken](/api-reference/trading/get-websockets-token) REST endpoint.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="event" type="string">
      Value: `addOrderStatus`
    </ResponseField>

    <ResponseField name="txid" type="string">
      A Kraken order identifier for the new order.
    </ResponseField>

    <ResponseField name="cl_ord_id" type="string">
      An optional, alphanumeric identifier specified by the client in the `add_order` parameters.
    </ResponseField>

    <ResponseField name="descr" type="string">
      A descriptive summary for the new order.
    </ResponseField>

    <ResponseField name="status" type="string">
      <span>One of:</span> `ok`, `error`
    </ResponseField>

    <ResponseField name="reqid" type="integer">
      Client originated identifier for the request that initiated this response.
    </ResponseField>

    <ResponseField name="errorMessage" type="string">
      Error message for unsuccessful requests.
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Request theme={null}
    {
        "event": "addOrder",
        "ordertype": "limit",
        "pair": "XBT/USD",
        "price": "9000",
        "token": "0000000000000000000000000000000000000000",
        "type": "buy",
        "volume": "10.123"
    }
    ```

    ```json Response theme={null}
    {
        "descr": "buy 0.01770000 XBTUSD @ limit 4000",
        "event": "addOrderStatus",
        "status": "ok",
        "txid": "ONPNXH-KMKMU-F4MR5V"
    }
    ```

    ```json Error theme={null}
    {
        "errorMessage": "EOrder:Order minimum not met",
        "event": "addOrderStatus",
        "status": "error"
    }
    ```
  </CodeGroup>
</Panel>


# Amend Order
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v1/amendorder

Modify order parameters in-place without cancelling and recreating

<div>
  <span>WSS</span>
  <span>ws-auth.kraken.com</span>
  <span>amendOrder</span>
</div>

The amend request enables clients to modify order parameters in-place without the need to cancel the existing order and create a new one. The order identifiers assigned by Kraken and/or client will stay the same, and queue priority in the order book will be maintained where possible.

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `amendOrder`
    </ResponseField>

    <ResponseField name="txid" type="string">
      <span>Example:</span> `OFGKYQ-FHPCQ-HUQFEK`

      The Kraken identifier for the order to be amended. Either `txid` or `cl_ord_id` is required.
    </ResponseField>

    <ResponseField name="cl_ord_id" type="string">
      <span>Example:</span> `6d1b345e-2821-40e2-ad83-4ecb18a06876`

      The client identifier for the order to be amended. Either `txid` or `cl_ord_id` is required.
    </ResponseField>

    <ResponseField name="volume" type="string">
      The new order quantity in terms of the base asset.
    </ResponseField>

    <ResponseField name="display_volume" type="string">
      <span>Condition:</span> iceberg orders only

      Defines the new quantity to show in the book while the rest of order quantity remains hidden. Minimum value is 1 / 15 of remaining order quantity.
    </ResponseField>

    <ResponseField name="limit_price" type="string">
      <span>Condition:</span> For order types that support limit price only

      The new limit price restriction on the order.

      To specify a relative price, this field can be prefixed by `+` or `-` to specify the order price as an offset relative to the market price.

      * `+` prefix: adds the amount to the reference price.
      * `-` prefix: subtracts the amount from the reference price.
      * `%` suffix: signifies the relative amount as a percentage, i.e., for a limit price 2% from last price use `"+2%"`.
    </ResponseField>

    <ResponseField name="post_only" type="boolean">
      <span>One of:</span> `true`, `false`<br />
      <span>Default:</span> `false`<br />
      <span>Condition:</span> Optional parameter for limit price changes

      Applies to `limit_price` changes in this amend transaction. If `true`, the limit price change will be rejected if the order cannot be posted passively in the book.
    </ResponseField>

    <ResponseField name="trigger_price" type="string">
      <span>Condition:</span> For triggered order types only

      The new trigger price to activate the order.

      To specify a relative price, this field can be prefixed by `+` or `-` to specify the order price as an offset relative to the market price.

      * `+` prefix: adds the amount to the reference price.
      * `-` prefix: subtracts the amount from the reference price.
      * `%` suffix: signifies the relative amount as a percentage, i.e., for a limit price 2% from last price use `"+2%"`.
    </ResponseField>

    <ResponseField name="pair" type="string">
      <span>Example:</span> `TSLAx/USD`

      The `symbol` is required on amends for non-crypto pairs, i.e. provide the pair symbol for xstocks.
    </ResponseField>

    <ResponseField name="deadline" type="string">
      <span>Format:</span> RFC3339<br />
      <span>Example:</span> `2022-12-25T09:30:59.123Z`

      Range of valid offsets (from current time) is 500 milliseconds to 60 seconds, default is 5 seconds. The precision of this parameter is to the millisecond. The engine will prevent this order from matching after this time, it provides protection against latency on time sensitive orders.
    </ResponseField>

    <ResponseField name="reqid" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="token" type="string">
      Session token from the [GetWebSocketsToken](/api-reference/trading/get-websockets-token) REST endpoint.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="event" type="string">
      Value: `amendOrderStatus`
    </ResponseField>

    <ResponseField name="amend_id" type="string">
      The unique Kraken identifier generated for this amend transaction.
    </ResponseField>

    <ResponseField name="txid" type="string">
      The Kraken identifier, if populated in the request.
    </ResponseField>

    <ResponseField name="cl_ord_id" type="string">
      The client identifier, if populated in the request.
    </ResponseField>

    <ResponseField name="status" type="string">
      <span>One of:</span> `ok`, `error`
    </ResponseField>

    <ResponseField name="reqid" type="integer">
      Client originated identifier for the request that initiated this response.
    </ResponseField>

    <ResponseField name="errorMessage" type="string">
      Error message for unsuccessful requests.
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Request: Trigger Price theme={null}
    {
        "event": "amendOrder",
        "token": "AxBH/MuD3MyJWjkiViDd1FLPoinFBC8MHQg0/952jKE",
        "cl_ord_id": "906bcc85-1866-4b4b-9d0d-880bbcbe7447",
        "trigger_price": "61036.4"
    }
    ```

    ```json Request: Volume theme={null}
    {
        "event": "amendOrder",
        "token": "AxBH/MuD3MyJWjkiViDd1FLPoinFBC8MHQg0/952jKE",
        "txid": "OB54AL-OBWL7-YOYRZI",
        "volume": "0.011"
    }
    ```

    ```json Response theme={null}
    {
        "amend_id": "TGS4UP-DP6E3-YO3KFN",
        "cl_ord_id": "906bcc85-1866-4b4b-9d0d-880bbcbe7447",
        "event": "amendOrderStatus",
        "status": "ok"
    }
    ```
  </CodeGroup>
</Panel>


# Book
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v1/book

Subscribe to order book levels (Level 2)

<div>
  <span>WSS</span>
  <span>ws.kraken.com</span>
  <span>book</span>
</div>

Order book levels. On subscription, a snapshot is published at the specified depth, followed by level updates. Subscription depth options are 10, 25, 100, 500, or 1000 levels per side.

## Subscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="pair" type="string[]">
      <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`

      The currency pairs for this request.
    </ResponseField>

    <ResponseField name="subscription" type="object">
      <Expandable title="properties">
        <ResponseField name="name" type="string">
          Value: `book`
        </ResponseField>

        <ResponseField name="depth" type="integer">
          <span>One of:</span> `10`, `25`, `100`, `500`, `1000`<br />
          <span>Default:</span> `10`

          Specifies the number of price levels (in each side of the book) to be received.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="reqid" type="string">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    The subscription status is returned via the [subscriptionStatus](/exchange/api-reference/spot-websocket-v1/subscriptionstatus) message.
  </Tab>
</Tabs>

## Snapshot

Note, there is no checksum on the snapshot.

<ResponseField name="" type="array">
  <Expandable title="elements">
    <ResponseField name="[0] channel_id" type="integer">
      <span>Deprecated:</span> use `channelName` and `pair`

      Channel identifier.
    </ResponseField>

    <ResponseField name="[1] book" type="object">
      <Expandable title="properties">
        <ResponseField name="as" type="array">
          Ask price levels, ascending from best ask.

          <Expandable title="elements">
            <ResponseField name="level" type="array">
              <Expandable title="elements">
                <ResponseField name="[0] price" type="string">The price of this level.</ResponseField>
                <ResponseField name="[1] volume" type="string">Price level volume, for updates volume = 0 for level removal/deletion.</ResponseField>

                <ResponseField name="[2] timestamp" type="string">
                  <span>Format:</span> Epoch Seconds<br />
                  <span>Example:</span> `1534614248.456738`

                  Timestamp when the level last updated.
                </ResponseField>
              </Expandable>
            </ResponseField>
          </Expandable>
        </ResponseField>

        <ResponseField name="bs" type="array">
          Bid price levels, ascending from best bid.

          <Expandable title="elements">
            <ResponseField name="level" type="array">
              <Expandable title="elements">
                <ResponseField name="[0] price" type="string">Price level.</ResponseField>
                <ResponseField name="[1] volume" type="string">Price level volume, for updates volume = 0 for level removal/deletion.</ResponseField>

                <ResponseField name="[2] timestamp" type="string">
                  <span>Format:</span> Epoch Seconds<br />
                  <span>Example:</span> `1534614248.456738`

                  Timestamp when the level last updated.
                </ResponseField>
              </Expandable>
            </ResponseField>
          </Expandable>
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="[2] pair" type="string">
      <span>Example:</span> `"BTC/USD"`

      The symbol of the currency pair.
    </ResponseField>

    <ResponseField name="[3] channel_name" type="string">
      Value: `book-[depth]`
    </ResponseField>
  </Expandable>
</ResponseField>

## Update

<ResponseField name="" type="array">
  <Expandable title="elements">
    <ResponseField name="[0] channel_id" type="integer">
      <span>Deprecated:</span> use `channelName` and `pair`

      Channel identifier.
    </ResponseField>

    <ResponseField name="[1] book" type="object">
      <Expandable title="properties">
        <ResponseField name="a" type="array">
          Ask price levels.

          <Expandable title="elements">
            <ResponseField name="level" type="array">
              <Expandable title="elements">
                <ResponseField name="[0] price" type="string">The price for this level.</ResponseField>
                <ResponseField name="[1] volume" type="string">The cumulative volume at this price level. If volume is 0, remove level from book.</ResponseField>

                <ResponseField name="[2] timestamp" type="string">
                  <span>Format:</span> Epoch Seconds<br />
                  <span>Example:</span> `1534614248.456738`

                  Timestamp when the level was last updated.
                </ResponseField>

                <ResponseField name="[3] update_type" type="string">
                  <span>One of:</span> `r`<br />
                  <span>Condition:</span> Republish only
                </ResponseField>
              </Expandable>
            </ResponseField>
          </Expandable>

          <ResponseField name="c" type="string">
            <span>Example:</span> `"4088505763"`<br />
            <span>Condition:</span> Only present on last update

            Book checksum as a quoted unsigned 32-bit integer.
          </ResponseField>
        </ResponseField>

        <ResponseField name="b" type="array">
          Bid price levels.

          <Expandable title="elements">
            <ResponseField name="level" type="array">
              <Expandable title="elements">
                <ResponseField name="[0] price" type="string">The price for this level.</ResponseField>
                <ResponseField name="[1] volume" type="string">The cumulative volume at this price level. If volume is 0, remove level from book.</ResponseField>

                <ResponseField name="[2] timestamp" type="string">
                  <span>Format:</span> Epoch Seconds<br />
                  <span>Example:</span> `1534614248.456738`

                  Timestamp when the level was last updated.
                </ResponseField>

                <ResponseField name="[3] update_type" type="string">
                  <span>One of:</span> `r`<br />
                  <span>Condition:</span> Republish only
                </ResponseField>
              </Expandable>
            </ResponseField>
          </Expandable>

          <ResponseField name="c" type="string">
            <span>Example:</span> `"4088505763"`<br />
            <span>Condition:</span> Only present on last update

            Book checksum as a quoted unsigned 32-bit integer.
          </ResponseField>
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="[2] pair" type="string">
      <span>Example:</span> `"BTC/USD"`

      The symbol of the currency pair.
    </ResponseField>

    <ResponseField name="[3] channel_name" type="string">
      Value: `book-[depth]`
    </ResponseField>
  </Expandable>
</ResponseField>

## Unsubscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="pair" type="string[]">
      <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`<br />
      <span>Condition:</span> All channels which support pair subscriptions

      The currency pairs to unsubscribe.
    </ResponseField>

    <ResponseField name="reqid" type="string">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="subscription" type="object">
      <Expandable title="properties">
        <ResponseField name="name" type="string">
          Value: `book`
        </ResponseField>

        <ResponseField name="depth" type="integer">
          <span>Condition:</span> 'book' channel only

          Unsubscribe to a specific depth.
        </ResponseField>
      </Expandable>
    </ResponseField>
  </Tab>

  <Tab title="Response">
    The unsubscription status is returned via the [subscriptionStatus](/exchange/api-reference/spot-websocket-v1/subscriptionstatus) message.
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Subscribe theme={null}
    {
      "event": "subscribe",
      "pair": [
        "XBT/USD",
        "XBT/EUR"
      ],
      "subscription": {
        "name": "book"
      }
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Snapshot theme={null}
    [
      0,
      {
        "as": [
          [
            "5541.30000",
            "2.50700000",
            "1534614248.123678"
          ],
          [
            "5541.80000",
            "0.33000000",
            "1534614098.345543"
          ],
          [
            "5542.70000",
            "0.64700000",
            "1534614244.654432"
          ]
        ],
        "bs": [
          [
            "5541.20000",
            "1.52900000",
            "1534614248.765567"
          ],
          [
            "5539.90000",
            "0.30000000",
            "1534614241.769870"
          ],
          [
            "5539.50000",
            "5.00000000",
            "1534613831.243486"
          ]
        ]
      },
      "book-100",
      "XBT/USD"
    ]
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Update: Asks theme={null}
    [
      1234,
      {
        "a": [
          [
            "5541.30000",
            "2.50700000",
            "1534614248.456738"
          ],
          [
            "5542.50000",
            "0.40100000",
            "1534614248.456738"
          ]
        ],
        "c": "974942666"
      },
      "book-10",
      "XBT/USD"
    ]
    ```

    ```json Update: Bids theme={null}
    [
      1234,
      {
        "b": [
          [
            "5541.30000",
            "0.00000000",
            "1534614335.345903"
          ]
        ],
        "c": "974942666"
      },
      "book-10",
      "XBT/USD"
    ]
    ```

    ```json Update: Bids and Asks theme={null}
    [
      1234,
      {
        "a": [
          [
            "5541.30000",
            "2.50700000",
            "1534614248.456738"
          ],
          [
            "5542.50000",
            "0.40100000",
            "1534614248.456738"
          ]
        ]
      },
      {
        "b": [
          [
            "5541.30000",
            "0.00000000",
            "1534614335.345903"
          ]
        ],
        "c": "974942666"
      },
      "book-10",
      "XBT/USD"
    ]
    ```

    ```json Update: Republish theme={null}
    [
      1234,
      {
        "a": [
          [
            "5541.30000",
            "2.50700000",
            "1534614248.456738",
            "r"
          ],
          [
            "5542.50000",
            "0.40100000",
            "1534614248.456738",
            "r"
          ]
        ],
        "c": "974942666"
      },
      "book-25",
      "XBT/USD"
    ]
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Unsubscribe theme={null}
    {
      "event": "unsubscribe",
      "pair": [
        "XBT/EUR",
        "XBT/USD"
      ],
      "subscription": {
        "name": "book"
      }
    }
    ```
  </CodeGroup>
</Panel>


# Cancel All
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v1/cancelall

Cancel all open orders including partially-filled orders

<div>
  <span>WSS</span>
  <span>ws-auth.kraken.com</span>
  <span>cancelAll</span>
</div>

Cancel all open orders. Includes partially-filled orders.

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `cancelAll`
    </ResponseField>

    <ResponseField name="reqid" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="token" type="string">
      Session token from the [GetWebSocketsToken](/api-reference/trading/get-websockets-token) REST endpoint.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="event" type="string">
      Value: `cancelAllStatus`
    </ResponseField>

    <ResponseField name="count" type="string">
      Number of orders cancelled.
    </ResponseField>

    <ResponseField name="status" type="string">
      <span>One of:</span> `ok`, `error`
    </ResponseField>

    <ResponseField name="reqid" type="integer">
      Client originated identifier for the request that initiated this response.
    </ResponseField>

    <ResponseField name="errorMessage" type="string">
      Error message for unsuccessful requests.
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Request theme={null}
    {
        "event": "cancelAll",
        "token": "0000000000000000000000000000000000000000"
    }
    ```

    ```json Response theme={null}
    {
        "count": 2,
        "event": "cancelAllStatus",
        "status": "ok"
    }
    ```
  </CodeGroup>
</Panel>


# Cancel on Disconnect
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v1/cancelallordersafter

Dead Man's Switch mechanism to cancel all orders after a timeout

<div>
  <span>WSS</span>
  <span>ws-auth.kraken.com</span>
  <span>cancelAllOrdersAfter</span>
</div>

`cancelAllOrdersAfter` provides a "Dead Man's Switch" mechanism to protect the client from network malfunction, extreme latency or unexpected matching engine downtime. The client can send a request with a timeout (in seconds), that will start a countdown timer which will cancel *all* client orders when the timer expires.

The recommended use is to make a call every 15 to 30 seconds, providing a timeout of 60 seconds.

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `cancelAllOrdersAfter`
    </ResponseField>

    <ResponseField name="timeout" type="integer">
      Timeout specified in seconds. 0 to disable the timer.
    </ResponseField>

    <ResponseField name="reqid" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="token" type="string">
      Session token from the [GetWebSocketsToken](/api-reference/trading/get-websockets-token) REST endpoint.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="event" type="string">
      Value: `cancelAllOrdersAfterStatus`
    </ResponseField>

    <ResponseField name="currentTime" type="string">
      <span>Format:</span> RFC3339<br />
      <span>Example:</span> `2022-12-25T09:30:59.123456Z`

      Timestamp when the request has been handled (second precision, rounded up).
    </ResponseField>

    <ResponseField name="triggerTime" type="string">
      <span>Format:</span> RFC3339<br />
      <span>Example:</span> `2022-12-25T09:30:59.123456Z`

      Timestamp at which all open orders will be cancelled, unless the timer is extended or disabled (second precision, rounded up).
    </ResponseField>

    <ResponseField name="status" type="string">
      <span>One of:</span> `ok`, `error`
    </ResponseField>

    <ResponseField name="reqid" type="integer">
      Client originated identifier for the request that initiated this response.
    </ResponseField>

    <ResponseField name="errorMessage" type="string">
      Error message for unsuccessful requests.
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Request theme={null}
    {
        "event": "cancelAllOrdersAfter",
        "reqid": 1608543428050,
        "timeout": 60,
        "token": "0000000000000000000000000000000000000000"
    }
    ```

    ```json Response: Enabled theme={null}
    {
        "currentTime": "2020-12-21T09:37:09Z",
        "event": "cancelAllOrdersAfterStatus",
        "reqid": 1608543428050,
        "status": "ok",
        "triggerTime": "2020-12-21T09:38:09Z"
    }
    ```

    ```json Response: Disabled theme={null}
    {
        "currentTime": "2020-12-21T09:37:09Z",
        "event": "cancelAllOrdersAfterStatus",
        "reqid": 1608543428051,
        "status": "ok",
        "triggerTime": "0"
    }
    ```
  </CodeGroup>
</Panel>


# Cancel Order
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v1/cancelorder

Cancel one or more open orders

<div>
  <span>WSS</span>
  <span>ws-auth.kraken.com</span>
  <span>cancelOrder</span>
</div>

The `cancelOrder` request cancels one or more open orders in a single request. The orders to be cancelled can be identified by a range of client or Kraken identifiers.

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `cancelOrder`
    </ResponseField>

    <ResponseField name="txid" type="array of string">
      A list containing either client `order_userref` or Kraken `order_id` identifiers.
    </ResponseField>

    <ResponseField name="cl_ord_id" type="array of string">
      A list of client `cl_ord_id` identifiers.
    </ResponseField>

    <ResponseField name="reqid" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="token" type="string">
      Session token from the [GetWebSocketsToken](/api-reference/trading/get-websockets-token) REST endpoint.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="event" type="string">
      Value: `cancelOrderStatus`
    </ResponseField>

    <ResponseField name="status" type="string">
      <span>One of:</span> `ok`, `error`
    </ResponseField>

    <ResponseField name="reqid" type="integer">
      Client originated identifier for the request that initiated this response.
    </ResponseField>

    <ResponseField name="errorMessage" type="string">
      Error message for unsuccessful requests.
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Request theme={null}
    {
        "event": "cancelOrder",
        "token": "0000000000000000000000000000000000000000",
        "txid": [
            "OGTT3Y-C6I3P-XRI6HX",
            "OGTT3Y-C6I3P-X2I6HX"
        ]
    }
    ```

    ```json Response theme={null}
    {
        "event": "cancelOrderStatus",
        "status": "ok"
    }
    ```

    ```json Error theme={null}
    {
        "errorMessage": "EOrder:Unknown order",
        "event": "cancelOrderStatus",
        "status": "error"
    }
    ```
  </CodeGroup>
</Panel>


# Edit Order
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v1/editorder

Edit the parameters of a live order by cancelling and recreating it

<div>
  <span>WSS</span>
  <span>ws-auth.kraken.com</span>
  <span>editOrder</span>
</div>

Sends a request to edit the order parameters of a live order. When an order has been successfully modified, the original order will be cancelled and a new order will be created with the adjusted parameters and a new `txid` will be returned in the response.

<Warning>
  The newer [amendOrder](/exchange/api-reference/spot-websocket-v1/amendorder) endpoint resolves the caveats listed below and has additional performance gains.

  There are a number of caveats for `editOrder`:

  * `editOrder` cannot be used on partially filled orders.
  * `editOrder` is a cancel and replace, so queue priority is not maintained.
  * `editOrder` generates a new `txid` for the order.
</Warning>

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `editOrder`
    </ResponseField>

    <ResponseField name="orderid" type="string">
      Original Order ID or userref.
    </ResponseField>

    <ResponseField name="pair" type="string">
      Currency pair.
    </ResponseField>

    <ResponseField name="price" type="string">
      Dependent on order type - order price.
    </ResponseField>

    <ResponseField name="price2" type="string">
      Dependent on order type - order secondary price.
    </ResponseField>

    <ResponseField name="volume" type="string">
      Order volume in base currency.
    </ResponseField>

    <ResponseField name="oflags" type="string">
      Comma delimited list of order flags. `post` = post only order (available when ordertype = limit).
    </ResponseField>

    <ResponseField name="newuserref" type="string">
      User reference ID for new order (should be an integer in quotes).
    </ResponseField>

    <ResponseField name="validate" type="boolean">
      Validate inputs only; do not submit order.
    </ResponseField>

    <ResponseField name="reqid" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="token" type="string">
      Session token from the [GetWebSocketsToken](/api-reference/trading/get-websockets-token) REST endpoint.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="event" type="string">
      Value: `editOrderStatus`
    </ResponseField>

    <ResponseField name="txid" type="string">
      A new Kraken order identifier for the amended order.
    </ResponseField>

    <ResponseField name="originaltxid" type="string">
      The Kraken order identifier for the original order.
    </ResponseField>

    <ResponseField name="descr" type="string">
      A descriptive summary for the amended order.
    </ResponseField>

    <ResponseField name="status" type="string">
      <span>One of:</span> `ok`, `error`
    </ResponseField>

    <ResponseField name="reqid" type="integer">
      Client originated identifier for the request that initiated this response.
    </ResponseField>

    <ResponseField name="errorMessage" type="string">
      Error message for unsuccessful requests.
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Request theme={null}
    {
        "event": "editOrder",
        "newuserref": "666",
        "oflags": "",
        "orderid": "O26VH7-COEPR-YFYXLK",
        "pair": "XBT/USD",
        "price": "9000",
        "reqid": 3,
        "token": "0000000000000000000000000000000000000000"
    }
    ```

    ```json Response theme={null}
    {
        "descr": "order edited price = 9000.00000000",
        "event": "editOrderStatus",
        "originaltxid": "O65KZW-J4AW3-VFS74A",
        "reqid": 3,
        "status": "ok",
        "txid": "OTI672-HJFAO-XOIPPK"
    }
    ```
  </CodeGroup>
</Panel>


# Heartbeat
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v1/heartbeat

Server heartbeat sent when no subscription traffic is detected

<div>
  <span>WSS</span>
  <span>ws.kraken.com</span>
  <span>heartbeat</span>
</div>

Server heartbeat sent if no subscription traffic within approximately 1 second. Heartbeats are only sent if there is an active connection with at least one subscription.

## Payload

<ResponseField name="event" type="string">
  Value: `heartbeat`
</ResponseField>

<Panel>
  <CodeGroup>
    ```json Heartbeat theme={null}
    {
      "event": "heartbeat"
    }
    ```
  </CodeGroup>
</Panel>


# Candles (OHLC)
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v1/ohlc

Subscribe to Open High Low Close candle feed for currency pairs

<div>
  <span>WSS</span>
  <span>ws.kraken.com</span>
  <span>ohlc</span>
</div>

Open High Low Close (Candle) feed for a currency pair and interval period. When subscribed, a snapshot of the last valid candle (irrespective of the endtime) is sent, followed by updates to the running candle.

## Subscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="pair" type="string[]">
      <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`

      The currency pairs for this request.
    </ResponseField>

    <ResponseField name="subscription" type="object">
      <Expandable title="properties">
        <ResponseField name="name" type="string">
          Value: `ohlc`
        </ResponseField>

        <ResponseField name="interval" type="integer">
          <span>One of:</span> `1`, `5`, `15`, `30`, `60`, `240`, `1440`, `10080`, `21600`<br />
          <span>Default:</span> `1`

          Time interval associated with ohlc subscription in minutes.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="reqid" type="string">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    The subscription status is returned via the [subscriptionStatus](/exchange/api-reference/spot-websocket-v1/subscriptionstatus) message.
  </Tab>
</Tabs>

## Snapshot / Update

<ResponseField name="" type="array">
  <Expandable title="elements">
    <ResponseField name="[0] channel_id" type="integer">
      <span>Deprecated:</span> use `channelName` and `pair`

      Channel identifier.
    </ResponseField>

    <ResponseField name="[1] ohlc" type="array">
      The candle detail for a specific interval period.

      <Expandable title="elements">
        <ResponseField name="[0] epoc_last" type="string">Candle last update time, in seconds since epoch.</ResponseField>
        <ResponseField name="[1] epoc_end" type="string">End time of interval, in seconds since epoch.</ResponseField>
        <ResponseField name="[2] open" type="string">Open price of interval.</ResponseField>
        <ResponseField name="[3] high" type="string">High price within interval.</ResponseField>
        <ResponseField name="[4] low" type="string">Low price within interval.</ResponseField>
        <ResponseField name="[5] close" type="string">Close price of interval.</ResponseField>
        <ResponseField name="[6] vwap" type="string">Volume weighted average price within interval.</ResponseField>
        <ResponseField name="[7] volume" type="string">Accumulated volume within interval.</ResponseField>
        <ResponseField name="[8] count" type="string">Number of trades within interval.</ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="[2] pair" type="string">
      <span>Example:</span> `"BTC/USD"`

      The symbol of the currency pair.
    </ResponseField>

    <ResponseField name="[3] channel_name" type="string">
      Value: `ohlc-[depth]`
    </ResponseField>
  </Expandable>
</ResponseField>

## Unsubscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="pair" type="string[]">
      <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`<br />
      <span>Condition:</span> All channels which support pair subscriptions

      The currency pairs to unsubscribe.
    </ResponseField>

    <ResponseField name="reqid" type="string">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="subscription" type="object">
      <Expandable title="properties">
        <ResponseField name="name" type="string">
          Value: `ohlc`
        </ResponseField>

        <ResponseField name="interval" type="integer">
          <span>Condition:</span> 'ohlc' channel only

          Unsubscribe to a specific interval.
        </ResponseField>
      </Expandable>
    </ResponseField>
  </Tab>

  <Tab title="Response">
    The unsubscription status is returned via the [subscriptionStatus](/exchange/api-reference/spot-websocket-v1/subscriptionstatus) message.
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Subscribe theme={null}
    {
      "event": "subscribe",
      "pair": [
        "XBT/EUR"
      ],
      "subscription": {
        "interval": 5,
        "name": "ohlc"
      }
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Snapshot / Update theme={null}
    [
      42,
      [
        "1542057314.748456",
        "1542057360.435743",
        "3586.70000",
        "3586.70000",
        "3586.60000",
        "3586.60000",
        "3586.68894",
        "0.03373000",
        2
      ],
      "ohlc-5",
      "XBT/USD"
    ]
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Unsubscribe theme={null}
    {
      "event": "unsubscribe",
      "pair": [
        "XBT/EUR"
      ],
      "subscription": {
        "name": "ohlc"
      }
    }
    ```
  </CodeGroup>
</Panel>


# Open Orders
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v1/openorders

Subscribe to real-time open order updates for the authenticated user

<div>
  <span>WSS</span>
  <span>ws-auth.kraken.com</span>
  <span>openOrders</span>
</div>

The `openOrders` channel streams the open orders belonging to the authenticated user. The initial snapshot provides a list of all open orders, followed by real-time updates. For status change updates, such as `closed`, the fields `orderid` and `status` will be present in the payload.

## Subscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="subscription" type="object">
      <Expandable title="properties">
        <ResponseField name="name" type="string">
          Value: `openOrders`
        </ResponseField>

        <ResponseField name="token" type="string">
          Session token from the GetWebSocketsToken REST endpoint.
        </ResponseField>

        <ResponseField name="ratecounter" type="boolean">
          <span>One of:</span> `false`, `true`<br />
          <span>Default:</span> `false`

          Includes rate-limit counter in updates.
        </ResponseField>

        <ResponseField name="rebased" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `true`<br />
          <span>Condition:</span> Effective for viewing xstocks only

          If `true`, display in terms of underlying equity, otherwise display in terms of SPV tokens.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="reqid" type="string">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    The subscription status is returned via the [subscriptionStatus](/exchange/api-reference/spot-websocket-v1/subscriptionstatus) message.
  </Tab>
</Tabs>

## Snapshot / Update

The snapshot and update responses share the same schema. The payload is a JSON array containing the order data, the channel name, and feed detail.

<ResponseField name="[0]" type="object[]">
  A list of order objects. Each object is keyed by the Kraken order identifier.

  <Expandable title="properties">
    <ResponseField name="<order-id>" type="object">
      The key for each order is the Kraken order identifier.

      <Expandable title="properties">
        <ResponseField name="refid" type="string">
          Referral order transaction id that created this order.
        </ResponseField>

        <ResponseField name="userref" type="integer">
          An optional, numeric identifier associated with one or more orders.
        </ResponseField>

        <ResponseField name="cl_ord_id" type="string">
          An optional, alphanumeric client identifier associated with this order.
        </ResponseField>

        <ResponseField name="ext_ord_id" type="string">
          <span>Format:</span> UUID

          An optional, external partner order identifier.
        </ResponseField>

        <ResponseField name="status" type="string">
          Status of order.
        </ResponseField>

        <ResponseField name="opentm" type="string">
          Unix timestamp of when order was placed.
        </ResponseField>

        <ResponseField name="starttm" type="string">
          Unix timestamp of order start time (if set).
        </ResponseField>

        <ResponseField name="display_volume" type="string">
          <span>Condition:</span> Iceberg orders only

          The reload quantity for iceberg order types.
        </ResponseField>

        <ResponseField name="display_volume_remain" type="string">
          <span>Condition:</span> Iceberg orders only

          The visible quantity remaining in the book.
        </ResponseField>

        <ResponseField name="expiretm" type="string">
          Unix timestamp of order end time (if set).
        </ResponseField>

        <ResponseField name="contingent" type="object">
          Parameters for the conditional close order (if attached).

          <Expandable title="properties">
            <ResponseField name="ordertype" type="string">
              Conditional close order type.
            </ResponseField>

            <ResponseField name="price" type="string">
              Primary price of the conditional close order.
            </ResponseField>

            <ResponseField name="price2" type="string">
              Secondary price of the conditional close order.
            </ResponseField>

            <ResponseField name="oflags" type="string">
              Comma delimited list of order flags for the conditional close order. `fcib` = prefer fee in base currency, `fciq` = prefer fee in quote currency, `nompp` = no market price protection, `post` = post only order (available when ordertype = limit).
            </ResponseField>
          </Expandable>
        </ResponseField>

        <ResponseField name="descr" type="object">
          Order description info.

          <Expandable title="properties">
            <ResponseField name="pair" type="string">
              Asset pair.
            </ResponseField>

            <ResponseField name="position" type="string">
              Optional - position ID (if applicable).
            </ResponseField>

            <ResponseField name="type" type="string">
              Side of order (buy/sell).
            </ResponseField>

            <ResponseField name="ordertype" type="string">
              Order type.
            </ResponseField>

            <ResponseField name="price" type="string">
              The limit price or trigger price depending on the order type:

              * **limit** price for `limit` orders.
              * **trigger** price for all triggered orders.
            </ResponseField>

            <ResponseField name="price2" type="string">
              The **limit** price for `stop-loss-limit`, `take-profit-limit` and `trailing-stop-limit` orders.
            </ResponseField>

            <ResponseField name="leverage" type="string">
              Amount of margin leverage.
            </ResponseField>

            <ResponseField name="margin" type="boolean">
              Indicates if the order is funded on margin.
            </ResponseField>

            <ResponseField name="order" type="string">
              Text summary of order.
            </ResponseField>

            <ResponseField name="close" type="string">
              Text summary of conditional order (if conditional close attached).
            </ResponseField>
          </Expandable>
        </ResponseField>

        <ResponseField name="lastupdated" type="string">
          Unix timestamp of last change (for updates).
        </ResponseField>

        <ResponseField name="vol" type="string">
          Volume of order (base currency unless viqc set in oflags).
        </ResponseField>

        <ResponseField name="vol_exec" type="string">
          Total volume executed so far (base currency unless viqc set in oflags).
        </ResponseField>

        <ResponseField name="cost" type="string">
          Total cost (quote currency unless viqc set in oflags).
        </ResponseField>

        <ResponseField name="fee" type="string">
          Total fee (quote currency).
        </ResponseField>

        <ResponseField name="avg_price" type="string">
          Average price (cumulative; quote currency unless viqc set in oflags).
        </ResponseField>

        <ResponseField name="stopprice" type="string">
          Stop price (for trailing stops).
        </ResponseField>

        <ResponseField name="limitprice" type="string">
          Triggered limit price (after limit based order types are triggered).
        </ResponseField>

        <ResponseField name="misc" type="string">
          A comma delimited list of miscellaneous info:

          * `stopped`: triggered by stop price
          * `touched`: triggered by touch price
          * `liquidation`: liquidation event
          * `partial`: partial fill
        </ResponseField>

        <ResponseField name="oflags" type="string">
          A comma delimited list of order flags:

          * `viqc`: volume in quote currency
          * `fcib`: prefer fee in base currency
          * `fciq`: prefer fee in quote currency
          * `nompp`: no market price protection
          * `post`: post only order
        </ResponseField>

        <ResponseField name="sender_sub_id" type="string">
          For institutional accounts, identifies underlying sub-account/trader for Self Trade Prevention (STP).
        </ResponseField>

        <ResponseField name="timeinforce" type="string">
          <span>One of:</span> `GTC`, `GTD`, `IOC`, `FOK`<br />
          <span>Default:</span> `GTC`

          Time-in-force specifies how long an order remains in effect before expiry.

          * `GTC`: Good Till Canceled - until user has cancelled.
          * `GTD`: Good Till Date - until `expiretm` parameter.
          * `IOC`: Immediate Or Cancel - immediately cancels back any quantity that cannot be filled on arrival.
          * `FOK`: Fill Or Kill - immediately fills the full order quantity or cancels it entirely.
        </ResponseField>

        <ResponseField name="cancel_reason" type="string">
          Cancel reason, present for all cancellation updates (status="canceled") and for some close updates (status="closed").
        </ResponseField>

        <ResponseField name="amend_reason" type="string">
          Amendment reason, present for all amend events.
        </ResponseField>

        <ResponseField name="amended" type="boolean">
          <span>One of:</span> `true`, `false`

          Indicates if the order has been amended, the modification history can be extracted from the REST `OrderAmends` endpoint.
        </ResponseField>

        <ResponseField name="ratecount" type="string">
          Rate-limit counter, present if requested in subscription request. See Trading Rate Limits.
        </ResponseField>
      </Expandable>
    </ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="[1]" type="string">
  Value: `openOrders`
</ResponseField>

<ResponseField name="[2]" type="object">
  <Expandable title="properties">
    <ResponseField name="sequence" type="integer">
      Sequence number for this subscription.
    </ResponseField>
  </Expandable>
</ResponseField>

<Panel>
  <CodeGroup>
    ```json Subscribe theme={null}
    {
        "event": "subscribe",
        "subscription": {
            "name": "openOrders",
            "ratecounter": "true",
            "token": "WW91ciBhdXRoZW50aWNhdGlvbiB0b2tlbiBnb2VzIGhlcmUu"
        }
    }
    ```

    ```json Snapshot / Update theme={null}
    [
        [
            {
                "OGTT3Y-C6I3P-XRI6HX": {
                    "avg_price": "34.50000",
                    "cost": "0.00000",
                    "descr": {
                        "close": "",
                        "leverage": "0:1",
                        "order": "sell 10.00345345 XBT/EUR @ limit 34.50000 with 0:1 leverage",
                        "ordertype": "limit",
                        "pair": "XBT/EUR",
                        "price": "34.50000",
                        "price2": "0.00000",
                        "type": "sell"
                    },
                    "expiretm": "0.000000",
                    "fee": "0.00000",
                    "limitprice": "34.50000",
                    "misc": "",
                    "oflags": "fcib",
                    "opentm": "0.000000",
                    "refid": "OKIVMP-5GVZN-Z2D2UA",
                    "starttm": "0.000000",
                    "status": "open",
                    "stopprice": "0.000000",
                    "userref": 0,
                    "vol": "10.00345345",
                    "vol_exec": "0.00000000"
                }
            }
        ],
        "openOrders",
        {
            "sequence": 234
        }
    ]
    ```

    ```json Status Update theme={null}
    [
        [
            {
                "OGTT3Y-C6I3P-XRI6HX": {
                    "status": "closed"
                }
            }
        ],
        "openOrders",
        {
            "sequence": 59342
        }
    ]
    ```
  </CodeGroup>
</Panel>


# Own Trades
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v1/owntrades

Subscribe to real-time trade execution updates for the authenticated user

<div>
  <span>WSS</span>
  <span>ws-auth.kraken.com</span>
  <span>ownTrades</span>
</div>

The `ownTrades` channel streams executions for the authenticated user. A snapshot of the last 50 trades is sent on subscription, followed by real-time updates for any new trades.

## Subscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="subscription" type="object">
      <Expandable title="properties">
        <ResponseField name="name" type="string">
          Value: `ownTrades`
        </ResponseField>

        <ResponseField name="token" type="string">
          Session token from the GetWebSocketsToken REST endpoint.
        </ResponseField>

        <ResponseField name="snapshot" type="boolean">
          <span>One of:</span> `false`, `true`<br />
          <span>Default:</span> `true`

          Includes initial snapshot of historical data.
        </ResponseField>

        <ResponseField name="consolidate_taker" type="boolean">
          <span>One of:</span> `false`, `true`<br />
          <span>Default:</span> `true`

          If true, fills are consolidated by taker, otherwise all fills are shown.
        </ResponseField>

        <ResponseField name="rebased" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `true`<br />
          <span>Condition:</span> Effective for viewing xstocks only

          If `true`, display in terms of underlying equity, otherwise display in terms of SPV tokens.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="reqid" type="string">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    The subscription status is returned via the [subscriptionStatus](/exchange/api-reference/spot-websocket-v1/subscriptionstatus) message.
  </Tab>
</Tabs>

## Snapshot / Update

The snapshot and update responses share the same schema. The payload is a JSON array containing the trade data, the channel name, and feed detail.

<ResponseField name="[0]" type="object[]">
  A list of trade objects. Each object is keyed by the Kraken trade identifier.

  <Expandable title="properties">
    <ResponseField name="<trade-id>" type="object">
      The key for each trade is the Kraken trade identifier.

      <Expandable title="properties">
        <ResponseField name="ordertxid" type="string">
          Order identifier.
        </ResponseField>

        <ResponseField name="postxid" type="integer">
          Position identifier.
        </ResponseField>

        <ResponseField name="pair" type="string">
          Asset pair.
        </ResponseField>

        <ResponseField name="time" type="string">
          Unix timestamp of trade.
        </ResponseField>

        <ResponseField name="type" type="string">
          Side of order (buy/sell).
        </ResponseField>

        <ResponseField name="ordertype" type="string">
          Order type.
        </ResponseField>

        <ResponseField name="price" type="string">
          Average price order was filled in quote currency.
        </ResponseField>

        <ResponseField name="cost" type="string">
          Total cost of order in the quote currency.
        </ResponseField>

        <ResponseField name="fee" type="string">
          Total fees in the quote currency.
        </ResponseField>

        <ResponseField name="vol" type="string">
          Volume of the trade in base currency.
        </ResponseField>

        <ResponseField name="margin" type="string">
          Initial margin (quote currency).
        </ResponseField>

        <ResponseField name="margin_borrow" type="boolean">
          Indicates if an execution is on margin, i.e. if the trade increased or reduced size of margin borrowing. On trade events only.
        </ResponseField>

        <ResponseField name="cl_ord_id" type="string">
          An optional, alphanumeric client identifier associated with this order. Available on update messages only.
        </ResponseField>

        <ResponseField name="ext_exec_id" type="string">
          <span>Format:</span> UUID

          An optional, external partner execution identifier.
        </ResponseField>

        <ResponseField name="userref" type="integer">
          An optional, numeric identifier associated with one or more orders. Available on update messages only.
        </ResponseField>
      </Expandable>
    </ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="[1]" type="string">
  Value: `ownTrades`
</ResponseField>

<ResponseField name="[2]" type="object">
  <Expandable title="properties">
    <ResponseField name="sequence" type="integer">
      Sequence number for this subscription.
    </ResponseField>
  </Expandable>
</ResponseField>

<Panel>
  <CodeGroup>
    ```json Subscribe theme={null}
    {
        "event": "subscribe",
        "subscription": {
            "name": "ownTrades",
            "token": "WW91ciBhdXRoZW50aWNhdGlvbiB0b2tlbiBnb2VzIGhlcmUu"
        }
    }
    ```

    ```json Snapshot / Update theme={null}
    [
        [
            {
                "TDLH43-DVQXD-2KHVYY": {
                    "cost": "1000000.00000",
                    "fee": "1600.00000",
                    "margin": "0.00000",
                    "ordertxid": "TDLH43-DVQXD-2KHVYY",
                    "ordertype": "limit",
                    "pair": "XBT/EUR",
                    "postxid": "OGTT3Y-C6I3P-XRI6HX",
                    "price": "100000.00000",
                    "time": "1560516023.070651",
                    "type": "sell",
                    "vol": "1000000000.00000000"
                }
            }
        ],
        "ownTrades",
        {
            "sequence": 2948
        }
    ]
    ```
  </CodeGroup>
</Panel>


# Ping
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v1/ping

Client ping to determine whether the connection is alive

<div>
  <span>WSS</span>
  <span>ws.kraken.com</span>
  <span>ping</span>
</div>

Client can ping server to determine whether the connection is alive. This is an application level ping as opposed to default ping in the WebSocket standard which is server initiated.

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `ping`
    </ResponseField>

    <ResponseField name="reqid" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="event" type="string">
      Value: `pong`
    </ResponseField>

    <ResponseField name="reqid" type="integer">
      Client originated identifier for the request that initiated this response.
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Request theme={null}
    {
      "event": "ping",
      "reqid": 42
    }
    ```

    ```json Response theme={null}
    {
      "event": "pong",
      "reqid": 42
    }
    ```
  </CodeGroup>
</Panel>


# Spread
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v1/spread

Subscribe to spread feed for currency pairs

<div>
  <span>WSS</span>
  <span>ws.kraken.com</span>
  <span>spread</span>
</div>

Spread feed for a currency pair. Provides the best bid and ask prices along with their volumes.

## Subscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="pair" type="string[]">
      <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`

      The currency pairs for this request.
    </ResponseField>

    <ResponseField name="subscription" type="object">
      <Expandable title="properties">
        <ResponseField name="name" type="string">
          Value: `spread`
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="reqid" type="string">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    The subscription status is returned via the [subscriptionStatus](/exchange/api-reference/spot-websocket-v1/subscriptionstatus) message.
  </Tab>
</Tabs>

## Snapshot / Update

<ResponseField name="" type="array">
  <Expandable title="elements">
    <ResponseField name="[0] channel_id" type="integer">
      <span>Deprecated:</span> use `channelName` and `pair`

      Channel identifier.
    </ResponseField>

    <ResponseField name="[1] spread" type="array">
      <Expandable title="elements">
        <ResponseField name="[0] bid" type="string">Bid price.</ResponseField>
        <ResponseField name="[1] ask" type="string">Ask price.</ResponseField>

        <ResponseField name="[2] timestamp" type="string">
          Time of the current top-of-book quote, in seconds since epoch. This reflects the creation time of the best bid/ask order(s) currently resting at the top of book, not the time the message was generated. Because of this, the value is not monotonic: when the top of book changes to an order that was already resting in the book (for example after a trade), this timestamp may move backwards relative to the previous message. This is expected and does not indicate stale or dropped data.
        </ResponseField>

        <ResponseField name="[3] bid_volume" type="string">Bid Volume.</ResponseField>
        <ResponseField name="[4] ask_volume" type="string">Ask Volume.</ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="[2] pair" type="string">
      <span>Example:</span> `"BTC/USD"`

      The symbol of the currency pair.
    </ResponseField>

    <ResponseField name="[3] channel_name" type="string">
      Value: `spread`
    </ResponseField>
  </Expandable>
</ResponseField>

## Unsubscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="pair" type="string[]">
      <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`<br />
      <span>Condition:</span> All channels which support pair subscriptions

      The currency pairs to unsubscribe.
    </ResponseField>

    <ResponseField name="reqid" type="string">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="subscription" type="object">
      <Expandable title="properties">
        <ResponseField name="name" type="string">
          Value: `spread`
        </ResponseField>
      </Expandable>
    </ResponseField>
  </Tab>

  <Tab title="Response">
    The unsubscription status is returned via the [subscriptionStatus](/exchange/api-reference/spot-websocket-v1/subscriptionstatus) message.
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Subscribe theme={null}
    {
      "event": "subscribe",
      "pair": [
        "XBT/EUR"
      ],
      "subscription": {
        "name": "spread"
      }
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Snapshot / Update theme={null}
    [
      0,
      [
        "5698.40000",
        "5700.00000",
        "1542057299.545897",
        "1.01234567",
        "0.98765432"
      ],
      "spread",
      "XBT/USD"
    ]
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Unsubscribe theme={null}
    {
      "event": "unsubscribe",
      "pair": [
        "XBT/EUR"
      ],
      "subscription": {
        "name": "spread"
      }
    }
    ```
  </CodeGroup>
</Panel>


# Subscription Status
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v1/subscriptionstatus

Server-pushed subscription status response to subscribe, unsubscribe, or exchange-initiated unsubscribe

<div>
  <span>WSS</span>
  <span>ws.kraken.com</span>
  <span>subscriptionStatus</span>
</div>

Subscription status response to subscribe, unsubscribe or exchange-initiated unsubscribe. This message is returned for every subscribe or unsubscribe request across all channels.

## Payload

<ResponseField name="event" type="string">
  Value: `subscriptionStatus`
</ResponseField>

<ResponseField name="channelName" type="string">
  <span>One of:</span> `book`, `ohlc`, `openOrders`, `ownTrades`, `spread`, `ticker`, `trade`, `*`

  The name of the channel.
</ResponseField>

<ResponseField name="pair" type="string">
  <span>Example:</span> `"BTC/USD"`

  The currency pair associated with this subscription.
</ResponseField>

<ResponseField name="status" type="string">
  <span>One of:</span> `subscribed`, `unsubscribed`, `ok`, `error`
</ResponseField>

<ResponseField name="subscription" type="object">
  <Expandable title="properties">
    <ResponseField name="depth" type="integer">
      <span>Condition:</span> 'book' channel only

      The book depth.
    </ResponseField>

    <ResponseField name="interval" type="integer">
      <span>Condition:</span> 'ohlc' channel only

      The ohlc interval.
    </ResponseField>

    <ResponseField name="maxratecount" type="integer">
      The rate counter.
    </ResponseField>

    <ResponseField name="name" type="string">
      <span>One of:</span> `book`, `ohlc`, `openOrders`, `ownTrades`, `spread`, `ticker`, `trade`, `*`

      The name of the channel.
    </ResponseField>

    <ResponseField name="token" type="string">
      <span>Condition:</span> Authenticated requests only

      The authentication token associated with the request.
    </ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="reqid" type="integer">
  Client originated identifier for the request that initiated this response.
</ResponseField>

<ResponseField name="errorMessage" type="string">
  <span>Condition:</span> Unsuccessful requests only

  Error message for unsuccessful requests.
</ResponseField>

<ResponseField name="channelID" type="integer">
  <span>Deprecated:</span> use `channelName` and `pair`

  Channel ID on successful subscription, applicable to public messages only.
</ResponseField>

<Panel>
  <CodeGroup>
    ```json Subscribed: Ticker theme={null}
    {
      "channelID": 10001,
      "channelName": "ticker",
      "event": "subscriptionStatus",
      "pair": "XBT/EUR",
      "status": "subscribed",
      "subscription": {
        "name": "ticker"
      }
    }
    ```

    ```json Unsubscribed: OHLC theme={null}
    {
      "channelID": 10001,
      "channelName": "ohlc-5",
      "event": "subscriptionStatus",
      "pair": "XBT/EUR",
      "reqid": 42,
      "status": "unsubscribed",
      "subscription": {
        "interval": 5,
        "name": "ohlc"
      }
    }
    ```

    ```json Subscribed: ownTrades theme={null}
    {
      "channelName": "ownTrades",
      "event": "subscriptionStatus",
      "status": "subscribed",
      "subscription": {
        "name": "ownTrades"
      }
    }
    ```

    ```json Error theme={null}
    {
      "errorMessage": "Subscription depth not supported",
      "event": "subscriptionStatus",
      "pair": "XBT/USD",
      "status": "error",
      "subscription": {
        "depth": 42,
        "name": "book"
      }
    }
    ```
  </CodeGroup>
</Panel>


# System Status
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v1/systemstatus

Server-pushed system status on connection or status changes

<div>
  <span>WSS</span>
  <span>ws.kraken.com</span>
  <span>systemStatus</span>
</div>

Status sent on connection or system status changes. This is a server-initiated message — no subscription is required.

## Payload

<ResponseField name="event" type="string">
  Value: `systemStatus`
</ResponseField>

<ResponseField name="status" type="string">
  <span>One of:</span> `online`, `cancel_only`, `maintenance`, `post_only`

  The status of the trading engine.

  * `online`: Markets are operating normally - all order types may be submitted and order matching can occur.
  * `maintenance`: Markets are offline for scheduled maintenance - new orders cannot be placed and existing orders cannot be cancelled.
  * `cancel_only`: Orders can be cancelled but new orders cannot be placed. No order matching will occur.
  * `post_only`: Only limit orders using the `post_only` option can be submitted. Orders can be cancelled. No order matching will occur.
</ResponseField>

<ResponseField name="version" type="string">
  The version of the websockets service.
</ResponseField>

<ResponseField name="connectionID" type="integer">
  A unique connection identifier (for debugging).
</ResponseField>

<Panel>
  <CodeGroup>
    ```json System Status theme={null}
    {
      "connectionID": 8628615390848610000,
      "event": "systemStatus",
      "status": "online",
      "version": "1.9.1"
    }
    ```
  </CodeGroup>
</Panel>


# Ticker
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v1/ticker

Subscribe to ticker information on currency pairs

<div>
  <span>WSS</span>
  <span>ws.kraken.com</span>
  <span>ticker</span>
</div>

Ticker information on currency pair. On subscription, a snapshot of the current ticker data is sent, followed by updates on every trade event.

## Subscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="pair" type="string[]">
      <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`

      The currency pairs for this request.
    </ResponseField>

    <ResponseField name="subscription" type="object">
      <Expandable title="properties">
        <ResponseField name="name" type="string">
          Value: `ticker`
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="reqid" type="string">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    The subscription status is returned via the [subscriptionStatus](/exchange/api-reference/spot-websocket-v1/subscriptionstatus) message.
  </Tab>
</Tabs>

## Snapshot / Update

<ResponseField name="" type="array">
  <Expandable title="elements">
    <ResponseField name="[0] channel_id" type="integer">
      <span>Deprecated:</span> use `channelName` and `pair`

      Channel identifier.
    </ResponseField>

    <ResponseField name="[1] ticker" type="object">
      <Expandable title="properties">
        <ResponseField name="a" type="array">
          Best Ask

          <Expandable title="elements">
            <ResponseField name="[0] price" type="string">Best ask price.</ResponseField>
            <ResponseField name="[1] whole_lot_volume" type="integer">Whole lot volume.</ResponseField>
            <ResponseField name="[2] decimal" type="string">Lot volume.</ResponseField>
          </Expandable>
        </ResponseField>

        <ResponseField name="b" type="array">
          Best Bid

          <Expandable title="elements">
            <ResponseField name="[0] price" type="string">Best bid price.</ResponseField>
            <ResponseField name="[1] whole_lot_volume" type="integer">Whole lot volume.</ResponseField>
            <ResponseField name="[2] decimal" type="string">Lot volume.</ResponseField>
          </Expandable>
        </ResponseField>

        <ResponseField name="c" type="array">
          Close

          <Expandable title="elements">
            <ResponseField name="[0] price" type="string">Price.</ResponseField>
            <ResponseField name="[1] lot_volume" type="string">Lot volume.</ResponseField>
          </Expandable>
        </ResponseField>

        <ResponseField name="v" type="array">
          Volume

          <Expandable title="elements">
            <ResponseField name="[0] today" type="string">Value today.</ResponseField>
            <ResponseField name="[1] last_24h" type="string">Value over last 24 hours.</ResponseField>
          </Expandable>
        </ResponseField>

        <ResponseField name="p" type="array">
          Volume Weighted Average Price

          <Expandable title="elements">
            <ResponseField name="[0] today" type="string">Value today.</ResponseField>
            <ResponseField name="[1] last_24h" type="string">Value over last 24 hours.</ResponseField>
          </Expandable>
        </ResponseField>

        <ResponseField name="t" type="array">
          Number of trades

          <Expandable title="elements">
            <ResponseField name="[0] today" type="integer">Value today.</ResponseField>
            <ResponseField name="[1] last_24h" type="integer">Value over last 24 hours.</ResponseField>
          </Expandable>
        </ResponseField>

        <ResponseField name="l" type="array">
          Low price

          <Expandable title="elements">
            <ResponseField name="[0] today" type="string">Value today.</ResponseField>
            <ResponseField name="[1] last_24h" type="string">Value over last 24 hours.</ResponseField>
          </Expandable>
        </ResponseField>

        <ResponseField name="h" type="array">
          High price

          <Expandable title="elements">
            <ResponseField name="[0] today" type="string">Value today.</ResponseField>
            <ResponseField name="[1] last_24h" type="string">Value over last 24 hours.</ResponseField>
          </Expandable>
        </ResponseField>

        <ResponseField name="o" type="array">
          Open Price

          <Expandable title="elements">
            <ResponseField name="[0] today" type="string">Value today.</ResponseField>
            <ResponseField name="[1] last_24h" type="string">Value over last 24 hours.</ResponseField>
          </Expandable>
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="[2] pair" type="string">
      <span>Example:</span> `"BTC/USD"`

      The symbol of the currency pair.
    </ResponseField>

    <ResponseField name="[3] channel_name" type="string">
      Value: `ticker`
    </ResponseField>
  </Expandable>
</ResponseField>

## Unsubscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="pair" type="string[]">
      <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`<br />
      <span>Condition:</span> All channels which support pair subscriptions

      The currency pairs to unsubscribe.
    </ResponseField>

    <ResponseField name="reqid" type="string">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="subscription" type="object">
      <Expandable title="properties">
        <ResponseField name="name" type="string">
          Value: `ticker`
        </ResponseField>
      </Expandable>
    </ResponseField>
  </Tab>

  <Tab title="Response">
    The unsubscription status is returned via the [subscriptionStatus](/exchange/api-reference/spot-websocket-v1/subscriptionstatus) message.
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Subscribe theme={null}
    {
      "event": "subscribe",
      "pair": [
        "XBT/EUR"
      ],
      "subscription": {
        "name": "ticker"
      }
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Snapshot / Update theme={null}
    [
      0,
      {
        "a": [
          "5525.40000",
          1,
          "1.000"
        ],
        "b": [
          "5525.10000",
          1,
          "1.000"
        ],
        "c": [
          "5525.10000",
          "0.00398963"
        ],
        "h": [
          "5783.00000",
          "5783.00000"
        ],
        "l": [
          "5505.00000",
          "5505.00000"
        ],
        "o": [
          "5760.70000",
          "5763.40000"
        ],
        "p": [
          "5631.44067",
          "5653.78939"
        ],
        "t": [
          11493,
          16267
        ],
        "v": [
          "2634.11501494",
          "3591.17907851"
        ]
      },
      "ticker",
      "XBT/USD"
    ]
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Unsubscribe theme={null}
    {
      "event": "unsubscribe",
      "pair": [
        "XBT/EUR",
        "XBT/USD"
      ],
      "subscription": {
        "name": "ticker"
      }
    }
    ```
  </CodeGroup>
</Panel>


# Trade
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v1/trade

Subscribe to trade feed for currency pairs

<div>
  <span>WSS</span>
  <span>ws.kraken.com</span>
  <span>trade</span>
</div>

Trade feed for a currency pair. On subscription, the last 50 trades are sent as a snapshot, followed by real-time trade updates.

## Subscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="pair" type="string[]">
      <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`

      The currency pairs for this request.
    </ResponseField>

    <ResponseField name="subscription" type="object">
      <Expandable title="properties">
        <ResponseField name="name" type="string">
          Value: `trade`
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="reqid" type="string">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    The subscription status is returned via the [subscriptionStatus](/exchange/api-reference/spot-websocket-v1/subscriptionstatus) message.
  </Tab>
</Tabs>

## Snapshot / Update

<ResponseField name="" type="array">
  <Expandable title="elements">
    <ResponseField name="[0] channel_id" type="integer">
      <span>Deprecated:</span> use `channelName` and `pair`

      Channel identifier.
    </ResponseField>

    <ResponseField name="[1] trades" type="array">
      A list of trades.

      <Expandable title="elements">
        <ResponseField name="trade" type="array">
          <Expandable title="elements">
            <ResponseField name="[0] price" type="string">Price.</ResponseField>
            <ResponseField name="[1] volume" type="string">Volume.</ResponseField>
            <ResponseField name="[2] time" type="string">Time, seconds since epoch.</ResponseField>

            <ResponseField name="[3] side" type="string">
              <span>One of:</span> `buy`, `sell`

              Taker side.
            </ResponseField>

            <ResponseField name="[4] order_type" type="string">
              <span>One of:</span> `market`, `limit`

              Taker order type.
            </ResponseField>

            <ResponseField name="[5] misc" type="string">Miscellaneous.</ResponseField>
          </Expandable>
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="[2] pair" type="string">
      <span>Example:</span> `"BTC/USD"`

      The symbol of the currency pair.
    </ResponseField>

    <ResponseField name="[3] channel_name" type="string">
      Value: `trade`
    </ResponseField>
  </Expandable>
</ResponseField>

## Unsubscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="event" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="pair" type="string[]">
      <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`<br />
      <span>Condition:</span> All channels which support pair subscriptions

      The currency pairs to unsubscribe.
    </ResponseField>

    <ResponseField name="reqid" type="string">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="subscription" type="object">
      <Expandable title="properties">
        <ResponseField name="name" type="string">
          Value: `trade`
        </ResponseField>
      </Expandable>
    </ResponseField>
  </Tab>

  <Tab title="Response">
    The unsubscription status is returned via the [subscriptionStatus](/exchange/api-reference/spot-websocket-v1/subscriptionstatus) message.
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Subscribe theme={null}
    {
      "event": "subscribe",
      "pair": [
        "XBT/EUR"
      ],
      "subscription": {
        "name": "trade"
      }
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Snapshot / Update theme={null}
    [
      0,
      [
        [
          "5541.20000",
          "0.15850568",
          "1534614057.321597",
          "s",
          "l",
          ""
        ],
        [
          "6060.00000",
          "0.02455000",
          "1534614057.324998",
          "b",
          "l",
          ""
        ]
      ],
      "trade",
      "XBT/USD"
    ]
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Unsubscribe theme={null}
    {
      "event": "unsubscribe",
      "pair": [
        "XBT/EUR"
      ],
      "subscription": {
        "name": "trade"
      }
    }
    ```
  </CodeGroup>
</Panel>


# Unsubscribe
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v1/unsubscribe

Unsubscribe from one or more WebSocket channels

<div>
  <span>WSS</span>
  <span>ws.kraken.com</span>
  <span>unsubscribe</span>
</div>

Unsubscribe from one or more channels. You can specify a channelID or multiple currency pairs. The response is returned via the [subscriptionStatus](/exchange/api-reference/spot-websocket-v1/subscriptionstatus) message.

## Request

<ResponseField name="event" type="string">
  Value: `unsubscribe`
</ResponseField>

<ResponseField name="pair" type="array of strings">
  <span>Condition:</span> All channels which support pair subscriptions<br />
  <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`

  Unsubscribe to specific pairs.
</ResponseField>

<ResponseField name="reqid" type="string">
  Optional client originated request identifier sent as acknowledgment in the response.
</ResponseField>

<ResponseField name="subscription" type="object">
  <Expandable title="properties">
    <ResponseField name="name" type="string">
      <span>One of:</span> `book`, `ohlc`, `openOrders`, `ownTrades`, `spread`, `ticker`, `trade`, `*`

      The name of the channel to unsubscribe. Wildcard `*` is supported.
    </ResponseField>

    <ResponseField name="depth" type="integer">
      <span>Condition:</span> `book` channel only

      Unsubscribe to a specific depth.
    </ResponseField>

    <ResponseField name="interval" type="integer">
      <span>Condition:</span> `ohlc` channel only

      Unsubscribe to a specific interval.
    </ResponseField>
  </Expandable>
</ResponseField>

<Panel>
  <CodeGroup>
    ```json Unsubscribe theme={null}
    {
        "event": "unsubscribe",
        "pair": [
            "XBT/EUR",
            "XBT/USD"
        ],
        "subscription": {
            "name": "ticker"
        }
    }
    ```
  </CodeGroup>
</Panel>


# Add Order
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/add_order

Send a new order into the exchange via WebSocket

<div>
  <span>WSS</span>
  <span>ws-auth.kraken.com/v2</span>
  <span>add\_order</span>
</div>

Sends a single, new order into the exchange. A range of order types, Time-In-Force (TIF) and order flags can be specified by the parameters below.

For triggered order types (`stop-loss`, `take-profit`, `trailing-stop`), the `triggers` section contains the parameters for price tracking and trigger thresholds.

For One-Triggers-Other (OTO) orders, the `conditional` section contains the parameters to add a secondary close order to the primary order.

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `add_order`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="order_type" type="string">
          <span>One of:</span> `limit`, `market`, `iceberg`, `stop-loss`, `stop-loss-limit`, `take-profit`, `take-profit-limit`, `trailing-stop`, `trailing-stop-limit`, `settle-position`

          The execution model of the order.

          * `limit`: The full order quantity is placed immediately with a limit price restriction to only trade at this price or better.
          * `market`: The full order quantity executes immediately at the best available price in the order book.
          * `iceberg`: Hides the full order size by only showing your chosen display size in the book at your limit price.
          * `stop-loss`: A market order is triggered when the reference price reaches the stop price (from an unfavourable direction).
          * `stop-loss-limit`: A limit order is triggered when the reference price reaches the stop price (from an unfavourable direction).
          * `take-profit`: A market order is triggered when the reference price reaches the stop price (from a favourable direction).
          * `take-profit-limit`: A limit order is triggered when the reference price reaches the stop price (from a favourable direction).
          * `trailing-stop`: A market order is triggered when the market reverts a specified distance from the peak price.
          * `trailing-stop-limit`: A limit order is triggered when the market reverts a specified distance from the peak price.
          * `settle-position`: Settles an open leveraged position at the current market price.
        </ResponseField>

        <ResponseField name="side" type="string">
          <span>One of:</span> `buy`, `sell`

          Side of the order.
        </ResponseField>

        <ResponseField name="order_qty" type="float">
          Order quantity in terms of the base asset.
        </ResponseField>

        <ResponseField name="symbol" type="string">
          <span>Example:</span> `"BTC/USD"`

          The symbol of the currency pair.
        </ResponseField>

        <ResponseField name="limit_price" type="float">
          Limit price for order types that support limit price restriction.
        </ResponseField>

        <ResponseField name="limit_price_type" type="string">
          <span>One of:</span> `static`, `pct`, `quote`<br />
          <span>Default:</span> `quote`<br />
          <span>Condition:</span> Only available on trailing-stop-limit orders

          The units for the limit price.

          * `static`: a static market price for the asset, i.e. 30000 for BTC/USD.
          * `pct`: a percentage offset from the reference price, i.e. -10% from index price.
          * `quote`: a notional offset from the reference price in the quote currency, i.e, 150 BTC/USD from last price.

          Note, for `trailing-stop-limit` order type, the value represents offset from the trigger price. 0 would set a limit price the same as the trigger price.
        </ResponseField>

        <ResponseField name="triggers" type="object">
          <span>Condition:</span> Required for triggered order types only

          The parameters for setting the trigger price conditions.

          <Expandable title="properties">
            <ResponseField name="reference" type="string">
              <span>One of:</span> `index`, `last`<br />
              <span>Default:</span> `last`

              The reference price to track for triggering orders.

              * `index`: the index price in the broader market (for this pair). Note, to keep triggers serviceable during connectivity issues with external index feeds, the last price will be used as the reference price.
              * `last`: the last traded price in the Kraken order book (for this pair).
            </ResponseField>

            <ResponseField name="price" type="float">
              Specifies the amount for the trigger price - it supports both static market prices and relative prices. This field is used in combination with the `price_type` field below to determine the effective trigger price.

              **Examples:**

              * To trigger at 29000.5 BTC/USD, use price=29000.5, price\_type=static.
              * To trigger when price rises by 5%, use price=5, price\_type=pct.
              * To trigger when price drops by 150 USD, use price=-150, price\_type=quote.
            </ResponseField>

            <ResponseField name="price_type" type="string">
              <span>One of:</span> `static`, `pct`, `quote`<br />
              <span>Default:</span> `static`

              The units for the trigger price.

              * `static`: a static market price for the asset, i.e. 30000 for BTC/USD.
              * `pct`: a percentage offset from the reference price, i.e. -10% from index price.
              * `quote`: a notional offset from the reference price in the quote currency, i.e, 150 BTC/USD from last price.

              Note, for `trailing-stop` and `trailing-stop-limit` order types, the price represents the reversion from the peak. It is always a positive value with `pct` or `quote` offset.
            </ResponseField>
          </Expandable>
        </ResponseField>

        <ResponseField name="time_in_force" type="string">
          <span>One of:</span> `gtc`, `gtd`, `ioc`, `fok`<br />
          <span>Default:</span> `gtc`

          Time-in-force specifies how long an order remains in effect before being expired.

          * `gtc`: Good Till Canceled - until user has cancelled.
          * `gtd`: Good Till Date - until `expire_time` parameter.
          * `ioc`: Immediate Or Cancel - immediately cancels back any quantity that cannot be filled on arrival.
          * `fok`: Fill Or Kill - immediately fills the full order quantity or cancels it entirely. Available for `limit` orders only.
        </ResponseField>

        <ResponseField name="margin" type="boolean">
          <span>One of:</span> `false`, `true`<br />
          <span>Default:</span> `false`

          Funds the order on margin using the maximum leverage for the pair (maximum is leverage of 5).
        </ResponseField>

        <ResponseField name="post_only" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `false`<br />
          <span>Condition:</span> Orders with limit price only

          Cancels the order if it will take liquidity on arrival. Post only orders will always be posted passively in the book.
        </ResponseField>

        <ResponseField name="reduce_only" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `false`

          Reduces an existing margin position without opening an opposite long or short position worth more than the current value of your leveraged assets.
        </ResponseField>

        <ResponseField name="effective_time" type="string">
          <span>Format:</span> RFC3339<br />
          <span>Example:</span> `2022-12-25T09:30:59Z`

          Scheduled start time (precision to seconds).
        </ResponseField>

        <ResponseField name="expire_time" type="string">
          <span>Format:</span> RFC3339<br />
          <span>Example:</span> `2022-12-25T09:30:59Z`<br />
          <span>Condition:</span> GTD orders only

          Expiration time of the order (precision to seconds). GTD orders can have an expiry time up to one month in future.
        </ResponseField>

        <ResponseField name="deadline" type="string">
          <span>Format:</span> RFC3339<br />
          <span>Example:</span> `2022-12-25T09:30:59.123Z`

          Range of valid offsets (from current time) is 500 milliseconds to 60 seconds, default is 5 seconds. The precision of this parameter is to the millisecond. The engine will prevent this order from matching after this time, it provides protection against latency on time sensitive orders.
        </ResponseField>

        <ResponseField name="cl_ord_id" type="string">
          Adds a alphanumeric client order identifier which uniquely identifies an open order for each client. This field is mutually exclusive with `order_userref` parameter.

          The `cl_ord_id` parameter can be one of the following formats:

          * Long UUID: `6d1b345e-2821-40e2-ad83-4ecb18a06876` 32 hex characters separated with 4 dashes.
          * Short UUID: `da8e4ad59b78481c93e589746b0cf91f` 32 hex characters with no dashes.
          * Free text: `arb-20240509-00010` Free format ascii text up to 18 characters.
        </ResponseField>

        <ResponseField name="order_userref" type="integer">
          This is an optional non-unique, numeric identifier which can associated with a number of orders by the client. This field is mutually exclusive with `cl_ord_id` parameter.

          Many clients choose a unique integer value generated by their systems (i.e. a timestamp). However, because we don't enforce uniqueness on our side, it can also be used to easily tag a group of orders for querying or cancelling.
        </ResponseField>

        <ResponseField name="conditional" type="object">
          The conditional parameters are used as a template for generating the secondary close orders when the primary order fills. Each fill on the primary order will generate a new secondary order. The size of the secondary order will be the same size as the executed quantity and have the opposite side.

          <Expandable title="properties">
            <ResponseField name="order_type" type="string">
              <span>One of:</span> `limit`, `stop-loss`, `stop-loss-limit`, `take-profit`, `take-profit-limit`, `trailing-stop`, `trailing-stop-limit`

              Defines the order type of the secondary close orders which will be created on each fill.
            </ResponseField>

            <ResponseField name="limit_price" type="float">
              Defines the limit price on the secondary close orders. Only required on secondary order types that support limit price: `limit`, `stop-loss-limit`, `take-profit-limit`.
            </ResponseField>

            <ResponseField name="limit_price_type" type="string">
              <span>One of:</span> `static`, `pct`, `quote`<br />
              <span>Default:</span> `quote`<br />
              <span>Condition:</span> Only available on trailing-stop-limit orders

              The units for the limit price on the secondary order.

              * `static`: a static market price for the asset, i.e. 30000 for BTC/USD.
              * `pct`: a percentage offset from the reference price, i.e. -10% from index price.
              * `quote`: a notional offset from the reference price in the quote currency, i.e, 150 BTC/USD from last price.

              Note, for `trailing-stop-limit` order type, the value represents offset from the trigger price. 0 would set a limit price the same as the trigger price.
            </ResponseField>

            <ResponseField name="trigger_price" type="float">
              Specifies the amount for the trigger price - it supports both static market prices and relative prices. This field is used in combination with the `price_type` field below to determine the effective trigger price.

              **Examples:**

              * To trigger at 29000.5 BTC/USD, use price=29000.5, price\_type=static.
              * To trigger when price rises by 5%, use price=5, price\_type=pct.
              * To trigger when price drops by 150 USD, use price=-150, price\_type=quote.

              Note, for `trailing-stop` and `trailing-stop-limit` order types, the price represents the reversion from the peak. It is always a positive offset value.
            </ResponseField>

            <ResponseField name="trigger_price_type" type="string">
              <span>One of:</span> `static`, `pct`, `quote`<br />
              <span>Default:</span> `static`

              The units for the trigger price.

              * `static`: a static market price for the asset, i.e. 30000 for BTC/USD.
              * `pct`: a percentage offset from the reference price, i.e. -10% from index price.
              * `quote`: a notional offset from the reference price in the quote currency, i.e, 150 BTC/USD from last price.
            </ResponseField>

            <ResponseField name="stop_price" type="float">
              <span>Deprecated:</span> Use trigger\_price

              Defines the trigger price on the secondary close orders. Only required on triggered secondary order types: `stop-loss`, `stop-loss-limit`, `take-profit`, `take-profit-limit`.
            </ResponseField>
          </Expandable>
        </ResponseField>

        <ResponseField name="display_qty" type="float">
          <span>Condition:</span> iceberg orders only

          Defines the quantity to show in the book while the rest of order quantity remains hidden. Minimum value is 1 / 15 of `order_qty`.
        </ResponseField>

        <ResponseField name="fee_preference" type="string">
          <span>One of:</span> `base`, `quote`

          Fee preference base or quote currency. `quote` is the default for buy orders, `base` is the default for sell orders.
        </ResponseField>

        <ResponseField name="no_mpp" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `false`<br />
          <span>Condition:</span> Market orders only<br />
          <span>Deprecated:</span> If supplied, the flag is accepted but ignored

          Disables Market Price Protection (MPP) if set to `true`. MPP is a feature that protects market orders from filling at a bad price due to price slippage in an illiquid or volatile market.
        </ResponseField>

        <ResponseField name="stp_type" type="string">
          <span>One of:</span> `cancel_newest`, `cancel_oldest`, `cancel_both`<br />
          <span>Default:</span> `cancel_newest`

          Self Trade Prevention (STP) is a protection feature to prevent users from inadvertently or deliberately trading against themselves.

          * `cancel_newest`: arriving order will be canceled.
          * `cancel_oldest`: resting order will be canceled.
          * `cancel_both`: both arriving and resting orders will be canceled.
        </ResponseField>

        <ResponseField name="cash_order_qty" type="float">
          <span>Condition:</span> Buy market orders without margin funding

          Order volume expressed in quote currency.
        </ResponseField>

        <ResponseField name="validate" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `false`

          If set to `true` the order will be validated only, it will not trade in the matching engine.
        </ResponseField>

        <ResponseField name="sender_sub_id" type="string">
          <span>Condition:</span> For institutional accounts with enhanced Self Trade Prevention (STP)

          Adds a alphanumeric sub-account/trader identifier which enables STP to be performed at a more granular level.

          The `sender_sub_id` parameter can be one of the following formats:

          * Long UUID: `6d1b345e-2821-40e2-ad83-4ecb18a06876` 32 hex characters separated with 4 dashes.
          * Short UUID: `da8e4ad59b78481c93e589746b0cf91f` 32 hex characters with no dashes.
          * Free text: `arb-20240509-00010` Free format ascii text up to 18 characters.
        </ResponseField>

        <ResponseField name="stop_price" type="float">
          <span>Deprecated:</span> Use 'triggers' object

          The stop price for trigger order types.
        </ResponseField>

        <ResponseField name="trigger" type="string">
          <span>One of:</span> `last`, `index`<br />
          <span>Default:</span> `last`<br />
          <span>Condition:</span> Triggered order types only<br />
          <span>Deprecated:</span> Use 'triggers' object

          The reference price to trigger the order.

          * `index`: the index price for the broader market for this symbol.
          * `last`: the last traded price in the order book for this symbol.
        </ResponseField>

        <ResponseField name="token" type="string">
          Authentication token. See [authentication guide](/exchange/guides/websockets/authentication) for details.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="method" type="string">
      Value: `add_order`
    </ResponseField>

    <ResponseField name="result" type="object">
      <Expandable title="properties">
        <ResponseField name="order_id" type="string">
          Unique order identifier generated by Kraken.
        </ResponseField>

        <ResponseField name="cl_ord_id" type="string">
          An optional, alphanumeric identifier specified by the client in the `add_order` parameters.
        </ResponseField>

        <ResponseField name="order_userref" type="integer">
          An optional non-unique, numeric identifier specified by the client in the `add_order` parameters.
        </ResponseField>

        <ResponseField name="warnings" type="array of string">
          Non-fatal warnings about the order, if any.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the request was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the response was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Limit theme={null}
    {
        "method": "add_order",
        "params": {
            "order_type": "limit",
            "side": "buy",
            "limit_price": 26500.4,
            "order_userref": 100054,
            "order_qty": 1.2,
            "symbol": "BTC/USD",
            "token": "G38a1tGFzqGiUCmnegBcm8d4nfP3tytiNQz6tkCBYXY"
        },
        "req_id": 123456789
    }
    ```

    ```json Stop Loss theme={null}
    {
        "method": "add_order",
        "params": {
            "order_type": "stop-loss",
            "side": "sell",
            "order_qty": 100,
            "symbol": "MATIC/USD",
            "triggers": {
                "reference": "last",
                "price": -2.0,
                "price_type": "pct"
            },
            "token": "G38a1tGFzqGiUCmnegBcm8d4nfP3tytiNQz6tkCBYXY"
        }
    }
    ```

    ```json OTO theme={null}
    {
        "method": "add_order",
        "params": {
            "order_type": "limit",
            "side": "buy",
            "order_qty": 1.2,
            "symbol": "BTC/USD",
            "limit_price": 28440,
            "conditional": {
                "order_type": "stop-loss-limit",
                "trigger_price": 28410,
                "limit_price": 28400
            },
            "token": "G38a1tGFzqGiUCmnegBcm8d4nfP3tytiNQz6tkCBYXY"
        }
    }
    ```

    ```json Response theme={null}
    {
        "method": "add_order",
        "req_id": 123456789,
        "result": {
            "order_id": "AA5JGQ-SBMRC-SCJ7J7",
            "order_userref": 100054
        },
        "success": true,
        "time_in": "2023-09-21T14:15:07.197274Z",
        "time_out": "2023-09-21T14:15:07.205301Z"
    }
    ```

    ```json Error theme={null}
    {
        "error": "EOrder:Insufficient funds",
        "method": "add_order",
        "req_id": 123456789,
        "success": false,
        "time_in": "2023-09-21T14:15:07.197274Z",
        "time_out": "2023-09-21T14:15:07.205301Z"
    }
    ```
  </CodeGroup>
</Panel>


# Amend Order
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/amend_order

Amend the parameters of a live order in-place

<div>
  <span>WSS</span>
  <span>ws-auth.kraken.com/v2</span>
  <span>amend\_order</span>
</div>

The amend request enables clients to modify the order parameters in-place without the need to cancel the existing order and create a new one.

* The order identifiers assigned by Kraken and/or client will stay the same.
* Queue priority in the order book will be maintained where possible.
* If an amend request will reduce the order quantity below the existing filled quantity, the remaining quantity will be cancelled.

For more detail, see [amend transaction guide](/exchange/guides/general/amends).

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `amend_order`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="order_id" type="string">
          <span>Example:</span> `OFGKYQ-FHPCQ-HUQFEK`

          The Kraken identifier for the order to be amended. Either `order_id` or `cl_ord_id` is required.
        </ResponseField>

        <ResponseField name="cl_ord_id" type="string">
          <span>Example:</span> `6d1b345e-2821-40e2-ad83-4ecb18a06876`

          The client identifier for the order to be amended. Either `order_id` or `cl_ord_id` is required.
        </ResponseField>

        <ResponseField name="order_qty" type="float">
          The new order quantity in terms of the base asset.
        </ResponseField>

        <ResponseField name="display_qty" type="float">
          <span>Condition:</span> iceberg orders only

          Defines the new quantity to show in the book while the rest of order quantity remains hidden. Minimum value is 1 / 15 of remaining order quantity.
        </ResponseField>

        <ResponseField name="limit_price" type="float">
          <span>Condition:</span> For order types that support limit price only

          The new limit price restriction on the order, used in combination with the `limit_price_type` parameter.
        </ResponseField>

        <ResponseField name="limit_price_type" type="string">
          <span>One of:</span> `static`, `pct`, `quote`<br />
          <span>Condition:</span> Currently only available on trailing-stop-limit orders

          The units for `limit_price`.

          * `static`: a static market price for the asset, i.e. limit price at 29000.5 BTC/USD, use price=29000.5 and price\_type=static.
          * `pct`: a percentage offset from the reference price, i.e. limit price when market rises by 5%, use price=5 and price\_type=pct.
          * `quote`: a notional offset from the reference price in the quote currency, i.e, limit price when market drops by 150 USD, use price=-150 and price\_type=quote.

          `static` is the default for all order types except for `trailing-stop-limit` which has the default `quote` offset.
        </ResponseField>

        <ResponseField name="post_only" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `false`<br />
          <span>Condition:</span> Optional parameter for limit price amends

          If `true`, the limit price change will be rejected if the order cannot be posted passively in the book.
        </ResponseField>

        <ResponseField name="trigger_price" type="float">
          <span>Condition:</span> For triggered order types only

          The new trigger price to activate the order, used in combination with the `trigger_price_type` parameter.
        </ResponseField>

        <ResponseField name="trigger_price_type" type="string">
          <span>One of:</span> `static`, `pct`, `quote`<br />
          <span>Default:</span> `static`<br />
          <span>Condition:</span> For triggered order types only

          The units for `trigger_price`.

          * `static`: a static market price for the asset, i.e. to trigger at 29000.5 BTC/USD, use price=29000.5 and price\_type=static.
          * `pct`: a percentage offset from the reference price, i.e. to trigger when price rises by 5%, use price=5 and price\_type=pct.
          * `quote`: a notional offset from the reference price in the quote currency, i.e, to trigger when price drops by 150 USD, use price=-150 and price\_type=quote.
        </ResponseField>

        <ResponseField name="deadline" type="string">
          <span>Format:</span> RFC3339<br />
          <span>Example:</span> `2022-12-25T09:30:59.123Z`

          Range of valid offsets (from current time) is 500 milliseconds to 60 seconds, default is 5 seconds. The precision of this parameter is to the millisecond. The engine will prevent this order from matching after this time, it provides protection against latency on time sensitive orders.
        </ResponseField>

        <ResponseField name="symbol" type="string">
          <span>Example:</span> `TSLAx/USD`

          The `symbol` is required on amends for non-crypto pairs, i.e. provide the pair symbol for xstocks.
        </ResponseField>

        <ResponseField name="token" type="string">
          Authentication token. See [authentication guide](/exchange/guides/websockets/authentication) for details.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    A successful amend request will return the unique Kraken amend identifier.

    <ResponseField name="method" type="string">
      Value: `amend_order`
    </ResponseField>

    <ResponseField name="result" type="object">
      <span>Condition:</span> if `success` is `true`

      <Expandable title="properties">
        <ResponseField name="amend_id" type="string">
          The unique Kraken identifier generated for this amend transaction.
        </ResponseField>

        <ResponseField name="order_id" type="string">
          The Kraken identifier, if populated in the request.
        </ResponseField>

        <ResponseField name="cl_ord_id" type="string">
          The client identifier, if populated in the request.
        </ResponseField>

        <ResponseField name="warnings" type="array of string">
          Non-fatal warnings about the amend, if any.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the request was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the response was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Basic theme={null}
    {
      "method": "amend_order",
      "params": {
          "cl_ord_id": "2c6be801-1f53-4f79-a0bb-4ea1c95dfae9",
          "limit_price": 490795,
          "order_qty": 1.2,
          "token": "PM5Qm0MDrS54l657aQAtb7AhrwN30e2LBg1nUYOd6vU"
      }
    }
    ```

    ```json Advanced theme={null}
    {
        "method": "amend_order",
        "params": {
            "order_id": "OAIYAU-LGI3M-PFM5VW",
            "limit_price": 61031.3,
            "deadline": "2024-07-21T09:53:59.050Z",
            "post_only": true,
            "token": "DGB00LiKlPlLI/amQaSKUUr8niqXDb+1zwvtjp34nzk"
        }
    }
    ```

    ```json Response theme={null}
    {
        "method": "amend_order",
        "result": {
            "amend_id": "TTW6PD-RC36L-ZZSWNU",
            "cl_ord_id": "2c6be801-1f53-4f79-a0bb-4ea1c95dfae9"
        },
        "success": true,
        "time_in": "2024-07-26T13:39:04.922699Z",
        "time_out": "2024-07-26T13:39:04.924912Z"
    }
    ```
  </CodeGroup>
</Panel>


# Balances
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/balances

Subscribe to client asset balances and account ledger transactions

<div>
  <span>WSS</span>
  <span>ws-auth.kraken.com/v2</span>
  <span>balances</span>
</div>

The `balances` channel streams client asset balances and transactions from the account ledger.

This channel contains account specific data, an authentication token is required in the request.

## Subscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `balances`
        </ResponseField>

        <ResponseField name="snapshot" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `true`

          Request a snapshot after subscribing.
        </ResponseField>

        <ResponseField name="token" type="string">
          Authentication token. See [authentication guide](/exchange/guides/websockets/authentication) for details.
        </ResponseField>

        <ResponseField name="rebased" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `true`<br />
          <span>Condition:</span> Effective for viewing xstocks only

          If `true`, display in terms of underlying equity, otherwise display in terms of SPV tokens.
        </ResponseField>

        <ResponseField name="users" type="string">
          <span>One of:</span> `all`<br />
          <span>Condition:</span> Available on master accounts only

          If `all`, events for master and subaccounts are streamed, otherwise only master account events are published. No snapshot is provided.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="method" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="result" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `balances`
        </ResponseField>

        <ResponseField name="snapshot" type="boolean">
          Indicates if a snapshot is requested.
        </ResponseField>

        <ResponseField name="warnings" type="string[]">
          An advisory message, highlighting deprecated fields or upcoming changes to the channel.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the subscription was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the acknowledgement was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>
</Tabs>

## Snapshot

The snapshot provides the value of each asset held in this account.

<ResponseField name="channel" type="string">
  Value: `balances`
</ResponseField>

<ResponseField name="type" type="string">
  <span>One of:</span> `snapshot`
</ResponseField>

<ResponseField name="data" type="object[]">
  A list of assets held on account.

  <Expandable title="properties">
    <ResponseField name="asset" type="string">
      The asset symbol code.
    </ResponseField>

    <ResponseField name="asset_class" type="string">
      <span>One of:</span> `currency`

      The asset class. A placeholder for future expansion.
    </ResponseField>

    <ResponseField name="balance" type="float">
      The total amount of asset held across all wallet types.
    </ResponseField>

    <ResponseField name="wallets" type="object[]">
      A list of wallets for each asset.

      <Expandable title="properties">
        <ResponseField name="balance" type="float">
          Balance of asset in wallet.
        </ResponseField>

        <ResponseField name="type" type="string">
          <span>One of:</span> `spot`, `earn`

          Wallet type.
        </ResponseField>

        <ResponseField name="id" type="string">
          <span>One of:</span> `main`, `flex`, `bonded`, `flexible`, `liquid`, `locked`, `closed`

          Wallet identifier.
        </ResponseField>
      </Expandable>
    </ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="sequence" type="integer">
  The subscription message sequence number.
</ResponseField>

## Update

An update will be streamed on each completed transaction to the client account.

<ResponseField name="channel" type="string">
  Value: `balances`
</ResponseField>

<ResponseField name="type" type="string">
  <span>One of:</span> `update`
</ResponseField>

<ResponseField name="data" type="object[]">
  A list of account ledger transactions for each asset.

  <Expandable title="properties">
    <ResponseField name="asset" type="string">
      The asset symbol code.
    </ResponseField>

    <ResponseField name="asset_class" type="string">
      <span>One of:</span> `currency`

      The asset class. A placeholder for future expansion.
    </ResponseField>

    <ResponseField name="amount" type="float">
      The amount of asset change in this event.
    </ResponseField>

    <ResponseField name="balance" type="float">
      The total amount of this asset held in account.
    </ResponseField>

    <ResponseField name="fee" type="float">
      The fee paid on the transaction.
    </ResponseField>

    <ResponseField name="ledger_id" type="string">
      The identifier for this account ledger entry.
    </ResponseField>

    <ResponseField name="ref_id" type="string">
      A reference identifier in the context of this balance event. For example, `ref_id` will be the `trade_id` for a trade event.
    </ResponseField>

    <ResponseField name="timestamp" type="string">
      <span>Format:</span> RFC3339<br />
      <span>Example:</span> `2022-12-25T09:30:59.123456Z`

      The time of the balance change.
    </ResponseField>

    <ResponseField name="type" type="string">
      <span>One of:</span> `deposit`, `withdrawal`, `trade`, `margin`, `adjustment`, `rollover`, `credit`, `transfer`, `settled`, `staking`, `sale`, `reserve`, `conversion`, `dividend`, `reward`, `creator_fee`

      The broad type of the balance event.
    </ResponseField>

    <ResponseField name="subtype" type="string">
      <span>One of:</span> `spotfromfutures`, `spottofutures`, `stakingfromspot`, `spotfromstaking`, `stakingtospot`, `spottostaking`

      The specific subtype of the balance event.
    </ResponseField>

    <ResponseField name="category" type="string">
      <span>One of:</span> `deposit`, `withdrawal`, `trade`, `margin-trade`, `margin-settle`, `margin-conversion`, `conversion`, `credit`, `marginrollover`, `staking-rewards`, `instant`, `equity-trade`, `airdrop`, `equity-dividend`, `reward-bonus`, `nft`, `block-trade`

      The categorization of the balance event.
    </ResponseField>

    <ResponseField name="wallet_type" type="string">
      <span>One of:</span> `spot`, `earn`

      Wallet type.
    </ResponseField>

    <ResponseField name="wallet_id" type="string">
      <span>One of:</span> `main`, `bonded`, `flexible`, `liquid`, `locked`

      Wallet identifier.

      The following combinations of wallet types and wallet identifiers are available:

      Wallet type `spot`:

      * `main`: Primary spot pairs trading wallet.

      Wallet type `earn`:

      * `bonded`: earn on-chain product with lockup period.
      * `flexible`: earn product without lockup period.
      * `liquid`: kraken rewards program.
      * `locked`: earn product (may or may not have a lockup period).
    </ResponseField>

    <ResponseField name="user" type="string">
      <span>Example:</span> `AA96N74GCGEFN8KI`<br />
      <span>Condition:</span> Published when request parameters have 'users=all'

      The Kraken generated identifier for a user / sub-account.
    </ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="sequence" type="integer">
  The subscription message sequence number.
</ResponseField>

## Unsubscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `balances`
        </ResponseField>

        <ResponseField name="token" type="string">
          Authentication token. See [authentication guide](/exchange/guides/websockets/authentication) for details.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="method" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="result" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `balances`
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the subscription was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the acknowledgement was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Subscribe Request theme={null}
    {
        "method": "subscribe",
        "params": {
            "channel": "balances",
            "token": "G38a1tGFzqGiUCmnegBcm8d4nfP3tytiNQz6tkCBYXY"
        }
    }
    ```

    ```json Subscribe Response theme={null}
    {
        "method": "subscribe",
        "result": {
            "channel": "balances",
            "snapshot": true
        },
        "success": true,
        "time_in": "2023-10-16T13:29:13.111530Z",
        "time_out": "2023-10-16T13:29:13.111775Z"
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Snapshot theme={null}
    {
        "channel": "balances",
        "data": [
            {
                "asset": "BTC",
                "asset_class": "currency",
                "balance": 1.2,
                "wallets": [
                    {
                        "type": "spot",
                        "id": "main",
                        "balance": 1.2
                    }
                ]
            },
            {
                "asset": "MATIC",
                "asset_class": "currency",
                "balance": 500,
                "wallets": [
                    {
                        "type": "spot",
                        "id": "main",
                        "balance": 300
                    },
                    {
                        "type": "earn",
                        "id": "flex",
                        "balance": 200
                    }
                ]
            },
            {
                "asset": "USD",
                "asset_class": "currency",
                "balance": 80595.4943,
                "wallets": [
                    {
                        "type": "spot",
                        "id": "main",
                        "balance": 80595.4943
                    }
                ]
            }
        ],
        "type": "snapshot",
        "sequence": 1
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Deposit Update theme={null}
    {
       "channel": "balances",
       "type": "update",
       "data": [
          {
             "ledger_id": "ADKKFF-WEA5A-CNUBHG",
             "ref_id": "AGBWUJRU-LAREZ-W3UFAN",
             "timestamp": "2023-09-22T10:23:42.925034Z",
             "type": "deposit",
             "asset": "BTC",
             "asset_class": "currency",
             "category": "deposit",
             "wallet_type": "spot",
             "wallet_id": "main",
             "amount": 0.01,
             "fee": 0.0,
             "balance": 0.02
          }
       ],
       "sequence": 2
    }
    ```

    ```json Trade Update theme={null}
    {
        "channel": "balances",
        "type": "update",
        "data": [
            {
                "ledger_id": "AAICKV-NMQSR-ZO5IJD",
                "ref_id": "AGBB7L-HT5LX-J3BB4A",
                "timestamp": "2023-09-22T10:33:05.710082Z",
                "type": "trade",
                "asset": "BTC",
                "asset_class": "currency",
                "category": "trade",
                "wallet_type": "spot",
                "wallet_id": "main",
                "amount": -0.005,
                "fee": 0.0,
                "balance": 0.005
            }
        ],
        "sequence": 9
    }

    {
        "channel": "balances",
        "type": "update",
        "data": [
            {
                "ledger_id": "A5KS77-LQRMP-SMMN4B",
                "ref_id": "AGBB7L-HT5LX-J3BB4A",
                "timestamp": "2023-09-22T10:33:05.710082Z",
                "type": "trade",
                "asset": "USD",
                "asset_class": "currency",
                "category": "trade",
                "wallet_type": "spot",
                "wallet_id": "main",
                "amount": 132.9995,
                "fee": 0.3458,
                "balance": 500
            }
        ],
        "sequence": 10
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Unsubscribe Request theme={null}
    {
        "method": "unsubscribe",
        "params": {
            "channel": "balances",
            "token": "G38a1tGFzqGiUCmnegBcm8d4nfP3tytiNQz6tkCBYXY"
        }
    }
    ```

    ```json Unsubscribe Response theme={null}
    {
        "method": "unsubscribe",
        "result": {
            "channel": "balances"
        },
        "success": true,
        "time_in": "2023-10-16T13:29:13.111530Z",
        "time_out": "2023-10-16T13:29:13.111775Z"
    }
    ```
  </CodeGroup>
</Panel>


# Batch Add
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/batch_add

Submit a batch of orders in a single request

<div>
  <span>WSS</span>
  <span>ws-auth.kraken.com/v2</span>
  <span>batch\_add</span>
</div>

Sends a collection of orders (minimum of 2 and maximum 15):

* Validation is performed on the whole batch prior to submission to the engine. If an order fails validation, the whole batch will be rejected.
* On submission to the engine, if an order fails pre-match checks (i.e. funding), then the individual order will be rejected and remainder of the batch will be processed.
* All orders in batch are limited to a single pair.

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `batch_add`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="deadline" type="string">
          <span>Format:</span> RFC3339<br />
          <span>Example:</span> `2022-12-25T09:30:59.123Z`

          Range of valid offsets (from current time) is 500 milliseconds to 60 seconds, default is 5 seconds. The precision of this parameter is to the millisecond. The engine will prevent this order from matching after this time, it provides protection against latency on time sensitive orders.
        </ResponseField>

        <ResponseField name="symbol" type="string">
          <span>Example:</span> `"BTC/USD"`

          The symbol of the currency pair.
        </ResponseField>

        <ResponseField name="validate" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `false`

          If set to `true` the order will be validated only, it will not trade in the matching engine.
        </ResponseField>

        <ResponseField name="token" type="string">
          Authentication token. See [authentication guide](/exchange/guides/websockets/authentication) for details.
        </ResponseField>

        <ResponseField name="orders" type="object[]">
          A list of orders in the batch.

          <Expandable title="properties">
            <ResponseField name="cash_order_qty" type="float">
              <span>Condition:</span> market orders only

              Order volume expressed in quote currency.
            </ResponseField>

            <ResponseField name="conditional" type="object">
              The conditional parameters are used as a template for generating the secondary close orders when the primary order fills. Each fill on the primary order will generate a new secondary order. The size of the secondary order will be the same size as the executed quantity and have the opposite side.

              <Expandable title="properties">
                <ResponseField name="order_type" type="string">
                  <span>One of:</span> `limit`, `stop-loss`, `stop-loss-limit`, `take-profit`, `take-profit-limit`, `trailing-stop`, `trailing-stop-limit`

                  Defines the order type of the secondary close orders which will be created on each fill.
                </ResponseField>

                <ResponseField name="limit_price" type="float">
                  Defines the limit price on the secondary close orders. Only required on secondary order types that support limit price: `limit`, `stop-loss-limit`, `take-profit-limit`.
                </ResponseField>

                <ResponseField name="limit_price_type" type="string">
                  <span>One of:</span> `static`, `pct`, `quote`<br />
                  <span>Default:</span> `quote`<br />
                  <span>Condition:</span> Only available on trailing-stop-limit orders

                  The units for the limit price on the secondary order.

                  * `static`: a static market price for the asset, i.e. 30000 for BTC/USD.
                  * `pct`: a percentage offset from the reference price, i.e. -10% from index price.
                  * `quote`: a notional offset from the reference price in the quote currency, i.e, 150 BTC/USD from last price.

                  Note, for `trailing-stop-limit` order type, the value represents offset from the trigger price. 0 would set a limit price the same as the trigger price.
                </ResponseField>

                <ResponseField name="trigger_price" type="float">
                  Specifies the amount for the trigger price - it supports both static market prices and relative prices. This field is used in combination with the `price_type` field below to determine the effective trigger price.

                  **Examples:**

                  * To trigger at 29000.5 BTC/USD, use price=29000.5, price\_type=static.
                  * To trigger when price rises by 5%, use price=5, price\_type=pct.
                  * To trigger when price drops by 150 USD, use price=-150, price\_type=quote.

                  Note, for `trailing-stop` and `trailing-stop-limit` order types, the price represents the reversion from the peak. It is always a positive offset value.
                </ResponseField>

                <ResponseField name="trigger_price_type" type="string">
                  <span>One of:</span> `static`, `pct`, `quote`<br />
                  <span>Default:</span> `static`

                  The units for the trigger price.

                  * `static`: a static market price for the asset, i.e. 30000 for BTC/USD.
                  * `pct`: a percentage offset from the reference price, i.e. -10% from index price.
                  * `quote`: a notional offset from the reference price in the quote currency, i.e, 150 BTC/USD from last price.
                </ResponseField>

                <ResponseField name="stop_price" type="float">
                  <span>Deprecated:</span> Use `trigger_price`

                  Defines the trigger price on the secondary close orders. Only required on triggered secondary order types: `stop-loss`, `stop-loss-limit`, `take-profit`, `take-profit-limit`.
                </ResponseField>
              </Expandable>
            </ResponseField>

            <ResponseField name="display_qty" type="float">
              <span>Condition:</span> iceberg orders only

              Defines the quantity to show in the book while the rest of order quantity remains hidden. Minimum value is 1 / 15 of `order_qty`.
            </ResponseField>

            <ResponseField name="effective_time" type="string">
              <span>Format:</span> RFC3339<br />
              <span>Example:</span> `2022-12-25T09:30:59Z`

              Scheduled start time (precision to seconds).
            </ResponseField>

            <ResponseField name="expire_time" type="string">
              <span>Format:</span> RFC3339<br />
              <span>Example:</span> `2022-12-25T09:30:59Z`<br />
              <span>Condition:</span> GTD orders only

              Expiration time of the order (precision to seconds). GTD orders can have an expiry time up to one month in future.
            </ResponseField>

            <ResponseField name="fee_preference" type="string">
              <span>One of:</span> `base`, `quote`

              Fee preference base or quote currency. `quote` is the default for buy orders, `base` is the default for sell orders.
            </ResponseField>

            <ResponseField name="limit_price" type="float">
              Limit price for order types that support limit price restriction.
            </ResponseField>

            <ResponseField name="limit_price_type" type="string">
              <span>One of:</span> `static`, `pct`, `quote`<br />
              <span>Default:</span> `quote`<br />
              <span>Condition:</span> Only available on trailing-stop orders

              The units for the limit price.
            </ResponseField>

            <ResponseField name="margin" type="boolean">
              <span>One of:</span> `false`, `true`<br />
              <span>Default:</span> `false`

              Funds the order on margin using the maximum leverage for the pair (maximum is leverage of 5).
            </ResponseField>

            <ResponseField name="no_mpp" type="boolean">
              <span>One of:</span> `true`, `false`<br />
              <span>Default:</span> `false`<br />
              <span>Condition:</span> Market orders only<br />
              <span>Deprecated:</span> If supplied, the flag is accepted but ignored

              Disables Market Price Protection (MPP) if set to `true`. MPP is a feature that protects market orders from filling at a bad price due to price slippage in an illiquid or volatile market. See [MPP support article](https://support.kraken.com/hc/en-us/articles/201648183-Market-Price-Protection).
            </ResponseField>

            <ResponseField name="cl_ord_id" type="string">
              Adds an alphanumeric client order identifier which uniquely identifies an open order for each client. This field is mutually exclusive with `order_userref` parameter. The `cl_ord_id` parameter can be one of the following formats:

              * Long UUID: `6d1b345e-2821-40e2-ad83-4ecb18a06876` 32 hex characters separated with 4 dashes.
              * Short UUID: `da8e4ad59b78481c93e589746b0cf91f` 32 hex characters with no dashes.
              * Free text: `arb-20240509-00010` Free format ascii text up to 18 characters.
            </ResponseField>

            <ResponseField name="order_userref" type="integer">
              This is an optional non-unique, numeric identifier which can be associated with a number of orders by the client. This field is mutually exclusive with `cl_ord_id` parameter. Many clients choose a unique integer value generated by their systems (i.e. a timestamp). However, because we don't enforce uniqueness on our side, it can also be used to easily tag a group of orders for querying or cancelling.
            </ResponseField>

            <ResponseField name="order_qty" type="float">
              Order quantity in terms of the base asset.
            </ResponseField>

            <ResponseField name="order_type" type="string">
              <span>One of:</span> `limit`, `market`, `iceberg`, `stop-loss`, `stop-loss-limit`, `take-profit`, `take-profit-limit`, `trailing-stop`, `trailing-stop-limit`, `settle-position`

              The execution model of the order.
            </ResponseField>

            <ResponseField name="post_only" type="boolean">
              <span>One of:</span> `true`, `false`<br />
              <span>Default:</span> `false`<br />
              <span>Condition:</span> Orders with limit price only

              Cancels the order if it will take liquidity on arrival. Post only orders will always be posted passively in the book.
            </ResponseField>

            <ResponseField name="reduce_only" type="boolean">
              <span>One of:</span> `true`, `false`<br />
              <span>Default:</span> `false`

              Reduces an existing margin position without opening an opposite long or short position worth more than the current value of your leveraged assets.
            </ResponseField>

            <ResponseField name="side" type="string">
              <span>One of:</span> `buy`, `sell`

              Side of the order.
            </ResponseField>

            <ResponseField name="stp_type" type="string">
              <span>One of:</span> `cancel_newest`, `cancel_oldest`, `cancel_both`<br />
              <span>Default:</span> `cancel_newest`

              Self Trade Prevention (STP) is a protection feature to prevent users from inadvertently or deliberately trading against themselves. To prevent a self-match, one of the following STP modes can be used to define which order(s) will be expired.

              * `cancel_newest`: arriving order will be canceled.
              * `cancel_oldest`: resting order will be canceled.
              * `cancel_both`: both arriving and resting orders will be canceled.
            </ResponseField>

            <ResponseField name="time_in_force" type="string">
              <span>One of:</span> `gtc`, `gtd`, `ioc`, `fok`<br />
              <span>Default:</span> `gtc`

              Time-in-force specifies how long an order remains in effect before being expired.

              * `gtc`: Good Till Canceled - until user has cancelled.
              * `gtd`: Good Till Date - until `expire_time` parameter.
              * `ioc`: Immediate Or Cancel - immediately cancels back any quantity that cannot be filled on arrival.
              * `fok`: Fill Or Kill - immediately fills the full order quantity or cancels it entirely. Available for `limit` orders only.
            </ResponseField>

            <ResponseField name="triggers" type="object">
              <span>Condition:</span> Required for triggered order types only

              The parameters for setting the trigger price conditions.

              <Expandable title="properties">
                <ResponseField name="reference" type="string">
                  <span>One of:</span> `index`, `last`<br />
                  <span>Default:</span> `last`

                  The reference price to track for triggering orders.

                  * `index`: the index price in the broader market (for this pair). Note, to keep triggers serviceable during connectivity issues with external index feeds, the last price will be used as the reference price.
                  * `last`: the last traded price in the Kraken order book (for this pair).
                </ResponseField>

                <ResponseField name="price" type="float">
                  Specifies the amount for the trigger price - it supports both static market prices and relative prices. This field is used in combination with the `price_type` field below to determine the effective trigger price.

                  **Examples:**

                  * To trigger at 29000.5 BTC/USD, use price=29000.5, price\_type=static.
                  * To trigger when price rises by 5%, use price=5, price\_type=pct.
                  * To trigger when price drops by 150 USD, use price=-150, price\_type=quote.

                  Note, for `trailing-stop` and `trailing-stop-limit` order types, the price represents the reversion from the peak. It is always a positive offset value.
                </ResponseField>

                <ResponseField name="price_type" type="string">
                  <span>One of:</span> `static`, `pct`, `quote`<br />
                  <span>Default:</span> `static`

                  The units for the trigger price.

                  * `static`: a static market price for the asset, i.e. 30000 for BTC/USD.
                  * `pct`: a percentage offset from the reference price, i.e. -10% from index price.
                  * `quote`: a notional offset from the reference price in the quote currency, i.e, 150 BTC/USD from last price.
                </ResponseField>
              </Expandable>
            </ResponseField>

            <ResponseField name="sender_sub_id" type="string">
              <span>Condition:</span> For institutional accounts with enhanced Self Trade Prevention (STP). The `sender_sub_id` parameter can be one of the following formats:

              Adds an alphanumeric sub-account/trader identifier which enables STP to be performed at a more granular level.

              * Long UUID: `6d1b345e-2821-40e2-ad83-4ecb18a06876` 32 hex characters separated with 4 dashes.
              * Short UUID: `da8e4ad59b78481c93e589746b0cf91f` 32 hex characters with no dashes.
              * Free text: `arb-20240509-00010` Free format ascii text up to 18 characters.
            </ResponseField>

            <ResponseField name="stop_price" type="float">
              <span>Deprecated:</span> Use `triggers` object

              The stop price for trigger order types.
            </ResponseField>

            <ResponseField name="trigger" type="string">
              <span>One of:</span> `last`, `index`<br />
              <span>Default:</span> `last`<br />
              <span>Condition:</span> Triggered order types only<br />
              <span>Deprecated:</span> Use `triggers` object

              The reference price to trigger the order.

              * `index`: the index price for the broader market for this symbol.
              * `last`: the last traded price in the order book for this symbol.
            </ResponseField>
          </Expandable>
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    The order of returned txid's in the response array is the same as the order of the order list sent in request.

    <ResponseField name="method" type="string">
      Value: `batch_add`
    </ResponseField>

    <ResponseField name="result" type="object[]">
      <span>Condition:</span> if `success` is `true`

      <Expandable title="properties">
        <ResponseField name="order_id" type="string">
          Unique order identifier generated by Kraken.
        </ResponseField>

        <ResponseField name="cl_ord_id" type="string">
          An optional, alphanumeric identifier specified by the client in the `batch_add` parameters.
        </ResponseField>

        <ResponseField name="order_userref" type="integer">
          An optional order identifier specified by the client in the `batch_add` parameters.
        </ResponseField>

        <ResponseField name="warnings" type="array of string">
          Non-fatal warnings about the order, if any.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the request was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the response was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Request theme={null}
    {
        "method": "batch_add",
        "params": {
            "deadline": "2022-06-13T08:09:10.123456Z",
            "orders": [
                {
                    "limit_price": 1010.10,
                    "order_qty": 0.123456789,
                    "order_type": "limit",
                    "order_userref": 1,
                    "side": "buy"
                },
                {
                    "limit_price": 2020.20,
                    "order_qty": 0.987654321,
                    "order_type": "limit",
                    "order_userref": 2,
                    "side": "sell",
                    "stp_type": "cancel_both"
                }
            ],
            "symbol": "BTC/USD",
            "token": "TxxxxxxxxxOxxxxxxxxxxKxxxxxxxExxxxxxxxN",
            "validate": false
        },
        "req_id": 1234567890
    }
    ```

    ```json Response theme={null}
    {
        "method": "batch_add",
        "req_id": 1234567890,
        "result": [
            {
                "order_id": "ORDERX-IDXXX-XXXXX1",
                "order_userref": 1
            },
            {
                "order_id": "ORDERX-IDXXX-XXXXX2",
                "order_userref": 2
            }
        ],
        "success": true,
        "time_in": "2022-06-13T08:09:10.123456Z",
        "time_out": "2022-06-13T08:09:10.7890123"
    }
    ```
  </CodeGroup>
</Panel>


# Batch Cancel
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/batch_cancel

Cancel multiple orders in a single request

<div>
  <span>WSS</span>
  <span>ws-auth.kraken.com/v2</span>
  <span>batch\_cancel</span>
</div>

The `batch_cancel` request enables multiple orders to be cancelled in a single request by a range of identifiers (minimum of 2 and maximum 50 in each batch).

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `batch_cancel`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="orders" type="string[]">
          A list containing either client `order_userref` or Kraken `order_id` identifiers.
        </ResponseField>

        <ResponseField name="cl_ord_id" type="string[]">
          A list of client `cl_ord_id` identifiers.
        </ResponseField>

        <ResponseField name="token" type="string">
          Authentication token. See [authentication guide](/exchange/guides/websockets/authentication) for details.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="method" type="string">
      Value: `batch_cancel`
    </ResponseField>

    <ResponseField name="result" type="object">
      <span>Condition:</span> if `success` is `true`

      <Expandable title="properties">
        <ResponseField name="count" type="integer">
          Number of orders cancelled.
        </ResponseField>

        <ResponseField name="warnings" type="array of string">
          Non-fatal warnings, if any.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the request was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the response was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Request theme={null}
    {
        "method": "batch_cancel",
        "params": {
            "orders": [
                "1",
                "2",
                "ORDERX-IDXXX-XXXXX3"
            ],
            "token": "TxxxxxxxxxOxxxxxxxxxxKxxxxxxxExxxxxxxxN"
        },
        "req_id": 1234567890
    }
    ```

    ```json Response theme={null}
    {
        "method": "batch_cancel",
        "req_id": 1234567890,
        "result": {
            "count": 3
        },
        "success": true,
        "time_in": "2022-06-13T08:09:10.123456Z",
        "time_out": "2022-06-13T08:09:10.7890123"
    }
    ```
  </CodeGroup>
</Panel>


# Book (Level 2)
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/book

Subscribe to level 2 order book data with aggregated quantities at each price level

<div>
  <span>WSS</span>
  <span>ws.kraken.com/v2</span>
  <span>book</span>
</div>

The `book` channel streams level 2 (L2) order book. It describes the individual price levels in the book with aggregated order quantities at each level.

Subscriptions to this channel can be made for multiple symbols at once by specifying a list of pairs in the `symbol`.

For more detail on maintaining the order book and generating a checksum, see [guide](/exchange/guides/websockets/book-checksum-v2).

## Subscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `book`
        </ResponseField>

        <ResponseField name="symbol" type="string[]">
          <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`

          A list of currency pairs.
        </ResponseField>

        <ResponseField name="depth" type="integer">
          <span>One of:</span> `10`, `25`, `100`, `500`, `1000`<br />
          <span>Default:</span> `10`

          The number of price levels to be received.
        </ResponseField>

        <ResponseField name="snapshot" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `true`

          Request a snapshot after subscribing.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    There is a separate acknowledgement response for each symbol in the subscription list.

    <ResponseField name="method" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="result" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `book`
        </ResponseField>

        <ResponseField name="symbol" type="string">
          <span>Example:</span> `"BTC/USD"`

          The currency pair associated with this subscription.
        </ResponseField>

        <ResponseField name="depth" type="integer">
          <span>One of:</span> `10`, `25`, `100`, `500`, `1000`

          Specifies the number of price levels (in each side of the book) to be received.
        </ResponseField>

        <ResponseField name="snapshot" type="boolean">
          Indicates if a snapshot is requested.
        </ResponseField>

        <ResponseField name="warnings" type="string[]">
          An advisory message, highlighting deprecated fields or upcoming changes to the channel.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the subscription was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the acknowledgement was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>
</Tabs>

## Snapshot

The returned snapshot data contains the specified number of bids and asks for the symbol including a CRC32 checksum of the top 10 bids and asks.

<ResponseField name="channel" type="string">
  Value: `book`
</ResponseField>

<ResponseField name="type" type="string">
  <span>One of:</span> `snapshot`
</ResponseField>

<ResponseField name="data" type="object[]">
  <Expandable title="properties">
    <ResponseField name="asks" type="object[]">
      <Expandable title="properties">
        <ResponseField name="price" type="float">The ask price.</ResponseField>
        <ResponseField name="qty" type="float">The ask quantity.</ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="bids" type="object[]">
      <Expandable title="properties">
        <ResponseField name="price" type="float">The bid price.</ResponseField>
        <ResponseField name="qty" type="float">The bid quantity.</ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="checksum" type="integer">CRC32 checksum for the top 10 bids and asks.</ResponseField>

    <ResponseField name="symbol" type="string">
      <span>Example:</span> `"BTC/USD"`

      The symbol of the currency pair.
    </ResponseField>

    <ResponseField name="timestamp" type="string">
      <span>Format:</span> RFC3339<br />
      <span>Example:</span> `2022-12-25T09:30:59.123456Z`

      The timestamp of the order book snapshot.
    </ResponseField>
  </Expandable>
</ResponseField>

## Update

The data contains the updates of the bids and asks for the relevant symbol including a CRC32 checksum of the top 10 bids and asks.

Note, it is possible to have multiple updates to the same price level in a single update message. Updates should always be processed in sequence.

<ResponseField name="channel" type="string">
  Value: `book`
</ResponseField>

<ResponseField name="type" type="string">
  <span>One of:</span> `update`
</ResponseField>

<ResponseField name="data" type="object[]">
  <Expandable title="properties">
    <ResponseField name="asks" type="object[]">
      <Expandable title="properties">
        <ResponseField name="price" type="float">The ask price.</ResponseField>
        <ResponseField name="qty" type="float">The ask quantity.</ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="bids" type="object[]">
      <Expandable title="properties">
        <ResponseField name="price" type="float">The bid price.</ResponseField>
        <ResponseField name="qty" type="float">The bid quantity.</ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="checksum" type="integer">CRC32 checksum for the top 10 bids and asks.</ResponseField>

    <ResponseField name="symbol" type="string">
      <span>Example:</span> `"BTC/USD"`

      The symbol of the currency pair.
    </ResponseField>

    <ResponseField name="timestamp" type="string">
      <span>Format:</span> RFC3339<br />
      <span>Example:</span> `2022-12-25T09:30:59.123456Z`

      The book order update timestamp.
    </ResponseField>
  </Expandable>
</ResponseField>

## Unsubscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `book`
        </ResponseField>

        <ResponseField name="symbol" type="string[]">
          <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`

          A list of currency pairs.
        </ResponseField>

        <ResponseField name="depth" type="integer">
          <span>One of:</span> `10`, `25`, `100`, `500`, `1000`

          The number of price levels to be unsubscribed.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    There is a separate acknowledgement response for each symbol in the unsubscription list.

    <ResponseField name="method" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="result" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `book`
        </ResponseField>

        <ResponseField name="symbol" type="string">
          <span>Example:</span> `"BTC/USD"`

          The currency pair associated with this subscription.
        </ResponseField>

        <ResponseField name="depth" type="integer">
          <span>One of:</span> `10`, `25`, `100`, `500`, `1000`

          Specifies the number of price levels (in each side of the book) to be unsubscribed.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the subscription was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the acknowledgement was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Subscribe Request theme={null}
    {
        "method": "subscribe",
        "params": {
            "channel": "book",
            "symbol": [
                "ALGO/USD",
                "MATIC/USD"
            ]
        }
    }
    ```

    ```json Subscribe Response theme={null}
    {
        "method": "subscribe",
        "result": {
            "channel": "book",
            "depth": 10,
            "snapshot": true,
            "symbol": "ALGO/USD"
        },
        "success": true,
        "time_in": "2023-10-06T17:35:55.219022Z",
        "time_out": "2023-10-06T17:35:55.219067Z"
    }

    {
        "method": "subscribe",
        "result": {
            "channel": "book",
            "depth": 10,
            "snapshot": true,
            "symbol": "MATIC/USD"
        },
        "success": true,
        "time_in": "2023-10-06T17:35:55.219022Z",
        "time_out": "2023-10-06T17:35:55.219067Z"
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Snapshot theme={null}
    {
        "channel": "book",
        "type": "snapshot",
        "data": [
            {
                "symbol": "MATIC/USD",
                "bids": [
                    {
                        "price": 0.5666,
                        "qty": 4831.75496356
                    },
                    {
                        "price": 0.5665,
                        "qty": 6658.22734739
                    },
                    {
                        "price": 0.5664,
                        "qty": 18724.91513344
                    },
                    {
                        "price": 0.5663,
                        "qty": 11563.92544914
                    },
                    {
                        "price": 0.5662,
                        "qty": 14006.65365711
                    },
                    {
                        "price": 0.5661,
                        "qty": 17454.85679807
                    },
                    {
                        "price": 0.566,
                        "qty": 18097.1547
                    },
                    {
                        "price": 0.5659,
                        "qty": 33644.89175666
                    },
                    {
                        "price": 0.5658,
                        "qty": 148.3464
                    },
                    {
                        "price": 0.5657,
                        "qty": 606.70854372
                    }
                ],
                "asks": [
                    {
                        "price": 0.5668,
                        "qty": 4410.79769741
                    },
                    {
                        "price": 0.5669,
                        "qty": 4655.40412487
                    },
                    {
                        "price": 0.567,
                        "qty": 49844.89424998
                    },
                    {
                        "price": 0.5671,
                        "qty": 24306.41678
                    },
                    {
                        "price": 0.5672,
                        "qty": 29783.25223475
                    },
                    {
                        "price": 0.5673,
                        "qty": 57234.71239278
                    },
                    {
                        "price": 0.5674,
                        "qty": 45065.04744
                    },
                    {
                        "price": 0.5675,
                        "qty": 5912.76380354
                    },
                    {
                        "price": 0.5676,
                        "qty": 42514.92434778
                    },
                    {
                        "price": 0.5677,
                        "qty": 36304.0847022
                    }
                ],
                "checksum": 2439117997,
                "timestamp": "2023-10-06T17:35:55.440295Z"
            }
        ]
    }
    ```

    ```json Update theme={null}
    {
        "channel": "book",
        "type": "update",
        "data": [
            {
                "symbol": "MATIC/USD",
                "bids": [
                    {
                        "price": 0.5657,
                        "qty": 1098.3947558
                    }
                ],
                "asks": [],
                "checksum": 2114181697,
                "timestamp": "2023-10-06T17:35:55.440295Z"
            }
        ]
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Unsubscribe Request theme={null}
    {
        "method": "unsubscribe",
        "params": {
            "channel": "book",
            "symbol": [
                "ALGO/USD",
                "MATIC/USD"
            ]
        }
    }
    ```

    ```json Unsubscribe Response theme={null}
    {
        "method": "unsubscribe",
        "result": {
            "channel": "book",
            "depth": 10,
            "snapshot": true,
            "symbol": "ALGO/USD"
        },
        "success": true,
        "time_in": "2023-10-06T17:35:55.219022Z",
        "time_out": "2023-10-06T17:35:55.219067Z"
    }

    {
        "method": "unsubscribe",
        "result": {
            "channel": "book",
            "depth": 10,
            "snapshot": true,
            "symbol": "MATIC/USD"
        },
        "success": true,
        "time_in": "2023-10-06T17:35:55.219022Z",
        "time_out": "2023-10-06T17:35:55.219067Z"
    }
    ```
  </CodeGroup>
</Panel>


# Cancel on Disconnect
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/cancel_after

Dead Man's Switch mechanism to cancel all orders after a timeout

<div>
  <span>WSS</span>
  <span>ws-auth.kraken.com/v2</span>
  <span>cancel\_all\_orders\_after</span>
</div>

`cancel_all_orders_after` provides a "Dead Man's Switch" mechanism to protect from network malfunction, extreme latency or unexpected matching engine downtime.

* The client sends request with a timeout (in seconds), that will start a countdown timer in the trading engine which will cancel all client orders when the timer expires.
* The client must keep sending new requests to reset the trigger time, or deactivate the mechanism by specifying a timeout of 0.
* If the timer expires, all orders in the account are cancelled and the feature is disabled until the next `cancel_all_orders_after` request.
* The recommended use is to make a call every 15 to 30 seconds, providing a timeout of 60 seconds. This allows the client to keep the orders in place in case of a brief disconnection or transient delay, while keeping them safe in case of a network breakdown.

<Info>
  It is recommended to disable the timer ahead of scheduled trading engine maintenance (if the timer is enabled, all orders will be cancelled when the trading engine comes back from downtime).
</Info>

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `cancel_all_orders_after`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="timeout" type="integer">
          Duration (in seconds) to set/extend the timer, it should be less than `86400` seconds.
        </ResponseField>

        <ResponseField name="token" type="string">
          Authentication token. See [authentication guide](/exchange/guides/websockets/authentication) for details.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="method" type="string">
      Value: `cancel_all_orders_after`
    </ResponseField>

    <ResponseField name="result" type="object">
      <span>Condition:</span> if `success` is `true`

      <Expandable title="properties">
        <ResponseField name="currentTime" type="string">
          <span>Format:</span> RFC3339<br />
          <span>Example:</span> `2022-12-25T09:30:59.123456Z`

          The current engine time.
        </ResponseField>

        <ResponseField name="triggerTime" type="string">
          <span>Format:</span> RFC3339<br />
          <span>Example:</span> `2022-12-25T09:30:59.123456Z`

          The time the orders will be expired in the engine.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the request was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the response was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Request theme={null}
    {
        "method": "cancel_all_orders_after",
        "params": {
            "timeout": 100,
            "token": "zwpdzWUe18Bn6h4TAMorh26+QbcMeST2B5tamfe+pgQ"
        },
        "req_id": 1234567890
    }
    ```

    ```json Response theme={null}
    {
        "method": "cancel_all_orders_after",
        "req_id": 1234567890,
        "result": {
            "currentTime": "2023-09-21T15:49:29Z",
            "triggerTime": "2023-09-21T15:51:09Z"
        },
        "success": true,
        "time_in": "2023-09-21T15:49:28.627900Z",
        "time_out": "2023-09-21T15:49:28.649057Z"
    }
    ```
  </CodeGroup>
</Panel>


# Cancel All
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/cancel_all

Cancel all open orders

<div>
  <span>WSS</span>
  <span>ws-auth.kraken.com/v2</span>
  <span>cancel\_all</span>
</div>

Cancels all open orders, including untriggered orders and orders resting in the book.

Note, the details of the individual cancelled orders will also be streamed on the `executions` channel.

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `cancel_all`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="token" type="string">
          Authentication token. See [authentication guide](/exchange/guides/websockets/authentication) for details.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="method" type="string">
      Value: `cancel_all`
    </ResponseField>

    <ResponseField name="result" type="object">
      <span>Condition:</span> if `success` is `true`

      <Expandable title="properties">
        <ResponseField name="count" type="integer">
          Number of orders cancelled.
        </ResponseField>

        <ResponseField name="warnings" type="array of string">
          Non-fatal warnings, if any.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the request was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the response was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Request theme={null}
    {
        "method": "cancel_all",
        "params": {
            "token": "weeBxllys/7kHy/zHpkATSDIS42BvDgWS2b04ZSZHZ5"
        },
        "req_id": 1234567890
    }
    ```

    ```json Response theme={null}
    {
        "method": "cancel_all",
        "req_id": 1234567890,
        "result": {
            "count": 1
        },
        "success": true,
        "time_in": "2023-09-26T13:09:48.463201Z",
        "time_out": "2023-09-26T13:09:48.471419Z"
    }
    ```
  </CodeGroup>
</Panel>


# Cancel Order
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/cancel_order

Cancel one or more open orders via WebSocket

<div>
  <span>WSS</span>
  <span>ws-auth.kraken.com/v2</span>
  <span>cancel\_order</span>
</div>

The `cancel_order` request cancels one or more open orders in a single request. The orders to be cancelled can be identified by a range of client or Kraken identifiers. Note, the details of the individual cancelled orders will also be streamed on the `executions` channel.

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `cancel_order`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="order_id" type="array of string">
          A list of Kraken `order_id` identifiers. Cannot be combined with `cl_ord_id` or `order_userref` in the same request.
        </ResponseField>

        <ResponseField name="cl_ord_id" type="array of string">
          A list of client `cl_ord_id` identifiers. Cannot be combined with `order_id` or `order_userref` in the same request.
        </ResponseField>

        <ResponseField name="order_userref" type="array of integer">
          A list of client `order_userref` identifiers. Cannot be combined with `order_id` or `cl_ord_id` in the same request.
        </ResponseField>

        <ResponseField name="token" type="string">
          Authentication token. See [authentication guide](/exchange/guides/websockets/authentication) for details.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    When cancelling multiple orders, there will be a stream of individual order responses.

    <ResponseField name="method" type="string">
      Value: `cancel_order`
    </ResponseField>

    <ResponseField name="result" type="object">
      <Expandable title="properties">
        <ResponseField name="order_id" type="string">
          Kraken identifier of the cancelled order.
        </ResponseField>

        <ResponseField name="cl_ord_id" type="string">
          Optional client identifier of the cancelled order.
        </ResponseField>

        <ResponseField name="warnings" type="array of string">
          Non-fatal warnings about the cancellation, if any.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the request was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the response was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Request theme={null}
    {
        "method": "cancel_order",
        "params": {
            "order_id": [
                "OM5CRX-N2HAL-GFGWE9",
                "OLUMT4-UTEGU-ZYM7E9"
            ],
            "token": "zGXT1dUQQjJjy5VmGXMegdDQngXXehNo5qbMBVolwEQ"
        },
        "req_id": 123456789
    }
    ```

    ```json Response theme={null}
    {
        "method": "cancel_order",
        "req_id": 123456789,
        "result": {
            "order_id": "OLUMT4-UTEGU-ZYM7E9"
        },
        "success": true,
        "time_in": "2023-09-21T14:36:57.428972Z",
        "time_out": "2023-09-21T14:36:57.437952Z"
    }
    ```
  </CodeGroup>
</Panel>


# Edit Order
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/edit_order

Edit the parameters of a live order

<div>
  <span>WSS</span>
  <span>ws-auth.kraken.com/v2</span>
  <span>edit\_order</span>
</div>

Sends a request to edit the order parameters of a live order. When an order has been successfully modified, the original order will be cancelled and a new order will be created with the adjusted parameters a new `order_id` will be returned in the response.

<Note>
  The new [amend\_order](/exchange/api-reference/spot-websocket-v2/amend_order) endpoint resolves the caveats listed below and has additional performance gains.

  There are a number of caveats for `edit_order`:

  * triggered stop loss or profit take profit orders are not supported.
  * orders with conditional close terms attached are not supported.
  * orders where the executed volume is greater than the newly supplied volume will be rejected.
  * `cl_ord_id` is not supported.
  * existing executions will are associated with the original order and not copied to the amended order.
  * queue position will not be maintained.
</Note>

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `edit_order`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="deadline" type="string">
          <span>Format:</span> RFC3339<br />
          <span>Example:</span> `2022-12-25T09:30:59.123Z`

          Range of valid offsets (from current time) is 500 milliseconds to 60 seconds, default is 5 seconds. The precision of this parameter is to the millisecond. The engine will prevent this order from matching after this time, it provides protection against latency on time sensitive orders.
        </ResponseField>

        <ResponseField name="display_qty" type="float">
          <span>Condition:</span> Iceberg orders only

          Defines the quantity to show in the book while the rest of order quantity remains hidden. Minimum value is 1 / 15 of `order_qty`.
        </ResponseField>

        <ResponseField name="fee_preference" type="string">
          <span>One of:</span> `base`, `quote`

          Fee preference base or quote currency. `quote` is the default for buy orders, `base` is the default for sell orders.
        </ResponseField>

        <ResponseField name="limit_price" type="float">
          Limit price for order types that support limit price restriction.
        </ResponseField>

        <ResponseField name="no_mpp" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `false`<br />
          <span>Condition:</span> Market orders only<br />
          <span>Deprecated:</span> If supplied, the flag is accepted but ignored

          Disables Market Price Protection (MPP) if set to `true`. MPP is a feature that protects market orders from filling at a bad price due to price slippage in an illiquid or volatile market. See [MPP support article](https://support.kraken.com/hc/en-us/articles/201648183-Market-Price-Protection).
        </ResponseField>

        <ResponseField name="order_id" type="string">
          <span>Example:</span> `OFGKYQ-FHPCQ-HUQFEK`

          The Kraken identifier for the order to be amended.
        </ResponseField>

        <ResponseField name="order_qty" type="float">
          Order quantity in terms of the base asset.
        </ResponseField>

        <ResponseField name="order_userref" type="integer">
          User defined reference to be placed on the amended order. It does not identify the order to be amended, use `order_id`.
        </ResponseField>

        <ResponseField name="post_only" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `false`<br />
          <span>Condition:</span> Orders with limit price only

          Cancels the order if it will take liquidity on arrival. Post only orders will always be posted passively in the book.
        </ResponseField>

        <ResponseField name="reduce_only" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `false`

          Reduces an existing margin position without opening an opposite long or short position worth more than the current value of your leveraged assets.
        </ResponseField>

        <ResponseField name="symbol" type="string">
          <span>Example:</span> `"BTC/USD"`

          The original symbol identifier for the pair. Note, the `symbol` cannot be amended.
        </ResponseField>

        <ResponseField name="triggers" type="object">
          <span>Condition:</span> Required for triggered order types only

          The parameters for setting the trigger price conditions.

          <Expandable title="properties">
            <ResponseField name="reference" type="string">
              <span>One of:</span> `index`, `last`<br />
              <span>Default:</span> `last`

              The reference price to track for triggering orders.

              * `index`: the index price in the broader market (for this pair). Note, to keep triggers serviceable during connectivity issues with external index feeds, the last price will be used as the reference price.
              * `last`: the last traded price in the Kraken order book (for this pair).
            </ResponseField>

            <ResponseField name="price" type="float">
              Specifies the amount for the trigger price - it supports both static market prices and relative prices. This field is used in combination with the `price_type` field below to determine the effective trigger price.

              **Examples:**

              * To trigger at 29000.5 BTC/USD, use price=29000.5, price\_type=static.
              * To trigger when price rises by 5%, use price=5, price\_type=pct.
              * To trigger when price drops by 150 USD, use price=-150, price\_type=quote.

              Note, for `trailing-stop` and `trailing-stop-limit` order types, the price represents the reversion from the peak. It is always a positive offset value.
            </ResponseField>

            <ResponseField name="price_type" type="string">
              <span>One of:</span> `static`, `pct`, `quote`<br />
              <span>Default:</span> `static`

              The units for the trigger price.

              * `static`: a static market price for the asset, i.e. 30000 for BTC/USD.
              * `pct`: a percentage offset from the reference price, i.e. -10% from index price.
              * `quote`: a notional offset from the reference price in the quote currency, i.e, 150 BTC/USD from last price.
            </ResponseField>
          </Expandable>
        </ResponseField>

        <ResponseField name="validate" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `false`

          If set to `true` the order will be validated only, it will not trade in the matching engine.
        </ResponseField>

        <ResponseField name="price" type="float">
          <span>Deprecated:</span> Use `limit_price` parameter
        </ResponseField>

        <ResponseField name="trigger" type="string">
          <span>Deprecated:</span> Use `triggers.reference` parameter
        </ResponseField>

        <ResponseField name="stop_price" type="float">
          <span>Deprecated:</span> Use `triggers.price` parameter
        </ResponseField>

        <ResponseField name="token" type="string">
          Authentication token. See [authentication guide](/exchange/guides/websockets/authentication) for details.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="method" type="string">
      Value: `edit_order`
    </ResponseField>

    <ResponseField name="result" type="object">
      <span>Condition:</span> if `success` is `true`

      <Expandable title="properties">
        <ResponseField name="order_id" type="string">
          Unique ID of the order
        </ResponseField>

        <ResponseField name="original_order_id" type="string">
          ID of the order that have been edited
        </ResponseField>

        <ResponseField name="warnings" type="array of string">
          Non-fatal warnings about the edit, if any.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the request was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the response was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Request theme={null}
    {
      "method": "edit_order",
      "params": {
        "order_id": "ORDERX-IDXXX-XXXXX1",
        "order_qty": 0.2123456789,
        "symbol": "BTC/USD",
        "token": "TxxxxxxxxxOxxxxxxxxxxKxxxxxxxExxxxxxxxN"
      },
      "req_id": 1234567890
    }
    ```

    ```json Response theme={null}
    {
      "method": "edit_order",
      "req_id": 1234567890,
      "result": {
        "order_id": "ORDERX-IDXXX-XXXXX2",
        "original_order_id": "ORDERX-IDXXX-XXXXX1"
      },
      "success": true,
      "time_in": "2022-07-15T12:56:09.876488Z",
      "time_out": "2022-07-15T12:56:09.923422Z"
    }
    ```
  </CodeGroup>
</Panel>


# Executions
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/executions

Subscribe to order status and execution events for your account

<div>
  <span>WSS</span>
  <span>ws-auth.kraken.com/v2</span>
  <span>executions</span>
</div>

The `executions` channel streams order status and execution events for this account.

It corresponds to a combination of the following Websockets v1 channels: `openOrders` and `ownTrades`.

This channel contains account specific data, an authentication token is required in the request.

## Subscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `executions`
        </ResponseField>

        <ResponseField name="snap_trades" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `false`

          If `true`, the last 50 order fills will be included in snapshot.
        </ResponseField>

        <ResponseField name="snap_orders" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `true`

          If `true`, open orders will be included in snapshot.
        </ResponseField>

        <ResponseField name="order_status" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `true`

          If `true`, all possible status transitions will be sent. Otherwise, only open / close transitions will be streamed: `new`, `filled`, `canceled`, `expired`.
        </ResponseField>

        <ResponseField name="rebased" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `true`<br />
          <span>Condition:</span> Effective for viewing xstocks only

          If `true`, display in terms of underlying equity, otherwise display in terms of SPV tokens.
        </ResponseField>

        <ResponseField name="ratecounter" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `false`

          If `true`, the rate-limit counter is included in the stream.
        </ResponseField>

        <ResponseField name="users" type="string">
          <span>One of:</span> `all`<br />
          <span>Condition:</span> Available on master accounts only

          If `all`, events for master and subaccounts are streamed, otherwise only master account events are published. No snapshot is provided.
        </ResponseField>

        <ResponseField name="snapshot_trades" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Deprecated:</span> Use 'snap\_trades' field

          If `true`, snapshot provides only trade events. Otherwise, open orders and trades will be included in snapshot.
        </ResponseField>

        <ResponseField name="snapshot" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Deprecated:</span> Use 'snap\_orders' or 'snap\_trades' field

          Request a snapshot after subscribing.
        </ResponseField>

        <ResponseField name="token" type="string">
          Authentication token. See [authentication guide](/exchange/guides/websockets/authentication) for details.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="method" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="result" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `executions`
        </ResponseField>

        <ResponseField name="snap_orders" type="boolean">
          <span>One of:</span> `true`, `false`

          Indicates if a snapshot of orders is requested.
        </ResponseField>

        <ResponseField name="snap_trades" type="boolean">
          <span>One of:</span> `true`, `false`

          Indicates if a snapshot of trades is requested.
        </ResponseField>

        <ResponseField name="maxratecount" type="integer">
          Specifies the max rate counter value for the user transaction rate. It is based on user tier.
        </ResponseField>

        <ResponseField name="snapshot" type="boolean">
          <span>Deprecated:</span> Use 'snap\_trades' and 'snap\_orders'

          Indicates if a snapshot is requested.
        </ResponseField>

        <ResponseField name="warnings" type="string[]">
          An advisory message, highlighting deprecated fields or upcoming changes to the channel.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the subscription was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the acknowledgement was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>
</Tabs>

## Snapshot / Update

The snapshot and update stream share the same data schema, the fields included in the message is dependant on the `exec_type`.

By default, the snapshot response contains all open orders and latest 50 trades.

The snapshot message content can be adjusted with the subscription parameters.

<ResponseField name="channel" type="string">
  Value: `executions`
</ResponseField>

<ResponseField name="type" type="string">
  <span>One of:</span> `snapshot`, `update`
</ResponseField>

<ResponseField name="data" type="object[]">
  A list of execution reports: order status and fills.

  <Expandable title="properties">
    <ResponseField name="amended" type="boolean">
      <span>One of:</span> `true`, `false`

      Indicates if the order has been amended, the modification history can be extracted from the REST `OrderAmends` endpoint. This field is present in the snapshot and the `amended`, `restated` event types.
    </ResponseField>

    <ResponseField name="avg_price" type="float">
      Order's average fill price.
    </ResponseField>

    <ResponseField name="cash_order_qty" type="float">
      Order volume expressed in quote currency (if specified on the original order).
    </ResponseField>

    <ResponseField name="cl_ord_id" type="string">
      Optional client identifier associated with the order.
    </ResponseField>

    <ResponseField name="contingent" type="object">
      The contingent object describes the template for generating the secondary close orders when the primary order fills.

      <Expandable title="properties">
        <ResponseField name="order_type" type="string">
          <span>One of:</span> `limit`, `stop-loss`, `stop-loss-limit`, `take-profit`, `take-profit-limit`, `trailing-stop`, `trailing-stop-limit`

          Describes the order type of the secondary orders which will be created on each fill.
        </ResponseField>

        <ResponseField name="trigger_price" type="float">
          <span>Condition:</span> Only on triggered secondary order types

          Describes the trigger price amount on the secondary orders. This field is used in combination with the `contingent.trigger_price_type` field to determine the effective trigger price.
        </ResponseField>

        <ResponseField name="trigger_price_type" type="string">
          <span>One of:</span> `static`, `pct`, `quote`<br />
          <span>Condition:</span> Only on triggered secondary order types

          Describes trigger price units on the secondary orders.

          * `static`: a static market price for the asset, i.e. 30000 for BTC/USD.
          * `pct`: a percentage offset from the reference price, i.e. -10% from index price.
          * `quote`: a notional offset from the reference price in the quote currency, i.e, 150 BTC/USD from last price.
        </ResponseField>

        <ResponseField name="limit_price" type="float">
          <span>Condition:</span> Only on secondary order types that support limit price

          Describes limit price amount on the secondary orders. This field is used in combination with the `contingent.limit_price_type` field to determine the effective limit price.
        </ResponseField>

        <ResponseField name="limit_price_type" type="string">
          <span>One of:</span> `static`, `pct`, `quote`<br />
          <span>Condition:</span> Only on secondary order types that support limit price

          Describes limit price units on the secondary orders.

          * `static`: a static market price for the asset, i.e. 30000 for BTC/USD.
          * `pct`: a percentage offset from the reference price, i.e. -10% from index price.
          * `quote`: a notional offset from the reference price in the quote currency, i.e, 150 BTC/USD from last price.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="cost" type="float">
      <span>Condition:</span> trade events only

      Value of an individual execution.
    </ResponseField>

    <ResponseField name="cum_cost" type="float">
      The order cumulative value executed.
    </ResponseField>

    <ResponseField name="cum_qty" type="float">
      The order cumulative executed quantity.
    </ResponseField>

    <ResponseField name="display_qty" type="float">
      Display quantity for iceberg order types.
    </ResponseField>

    <ResponseField name="display_qty_remain" type="float">
      <span>Condition:</span> Iceberg Order

      Indicates next display\_qty in Iceberg order.
    </ResponseField>

    <ResponseField name="effective_time" type="string">
      <span>Format:</span> RFC3339<br />
      <span>Example:</span> `2022-12-25T09:30:59.123456Z`

      Scheduled start time of the order.
    </ResponseField>

    <ResponseField name="exec_id" type="string">
      <span>Condition:</span> trade events only

      Execution identifier.
    </ResponseField>

    <ResponseField name="exec_type" type="string">
      <span>One of:</span> `pending_new`, `new`, `trade`, `filled`, `iceberg_refill`, `canceled`, `expired`, `amended`, `restated`, `status`

      Describes the type of order event and determines the set of fields in the message.

      * `pending_new`: Order request has been received and validated but the order is not live yet.
      * `new`: Order has been created and is live in the engine.
      * `trade`: The order has received a fill.
      * `filled`: The order has been fully filled.
      * `canceled`: The order has been cancelled.
      * `iceberg_refill`: Indicates an Iceberg order refill.
      * `expired`: The order has expired.
      * `amended`: There is a user initiated amend on the order, i.e. limit price change.
      * `restated`: There is a engine initiated amend on the order for maintenance of position or book, see `reason` field, i.e. reduce non-tradable liquidity.
      * `status`: The order has a status update, i.e. trigger price has been updated.
    </ResponseField>

    <ResponseField name="expire_time" type="string">
      <span>Format:</span> RFC3339<br />
      <span>Example:</span> `2022-12-25T09:30:59.123456Z`

      Scheduled expiration time of the order.
    </ResponseField>

    <ResponseField name="ext_ord_id" type="string">
      <span>Format:</span> UUID

      An optional, external partner order identifier shown on order events.
    </ResponseField>

    <ResponseField name="ext_exec_id" type="string">
      <span>Format:</span> UUID

      An optional, external partner execution identifier shown on trade events.
    </ResponseField>

    <ResponseField name="fees" type="object[]">
      <span>Condition:</span> trade events only

      The fees paid on this trade event. Currently, the fees are expressed in the quote currency only.

      <Expandable title="properties">
        <ResponseField name="asset" type="string">
          The fee currency.
        </ResponseField>

        <ResponseField name="qty" type="float">
          The fee amount.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="fee_ccy_pref" type="string">
      The preferred currency for paying fees.

      * `fcib`: prefer fee in base currency.
      * `fciq`: prefer fee in quote currency.
    </ResponseField>

    <ResponseField name="fee_usd_equiv" type="float">
      The total fee paid in USD.
    </ResponseField>

    <ResponseField name="limit_price" type="float">
      Limit price for order types that support limit price restriction.
    </ResponseField>

    <ResponseField name="liquidated" type="boolean">
      Indicates if the order has been liquidated by the engine.
    </ResponseField>

    <ResponseField name="liquidity_ind" type="string">
      <span>One of:</span> `m`, `t`

      The liquidity indicator: `t` taker, `m` maker.
    </ResponseField>

    <ResponseField name="last_price" type="float">
      <span>Condition:</span> trade events only

      The average price in this trade event.
    </ResponseField>

    <ResponseField name="last_qty" type="float">
      <span>Condition:</span> trade events only

      The quantity filled in this trade event.
    </ResponseField>

    <ResponseField name="margin" type="boolean">
      Indicates if the order can be funded on margin.
    </ResponseField>

    <ResponseField name="margin_borrow" type="boolean">
      Indicates if an execution is on margin, i.e. if the trade increased or reduced size of margin borrowing. On trade events only.
    </ResponseField>

    <ResponseField name="no_mpp" type="boolean">
      Indicates if the order has market price protection.
    </ResponseField>

    <ResponseField name="ord_ref_id" type="string">
      Referral order transaction id that created this order.
    </ResponseField>

    <ResponseField name="order_id" type="string">
      Unique order identifier generated by Kraken.
    </ResponseField>

    <ResponseField name="order_qty" type="float">
      The client order quantity.
    </ResponseField>

    <ResponseField name="order_type" type="string">
      <span>One of:</span> `limit`, `market`, `iceberg`, `stop-loss`, `stop-loss-limit`, `take-profit`, `take-profit-limit`, `trailing-stop`, `trailing-stop-limit`, `settle-position`

      The execution model of the order.
    </ResponseField>

    <ResponseField name="order_status" type="string">
      Describes current state of the order.

      * `pending_new`: Order has been received but not yet created by the engine.
      * `new`: Order is live but has no fills.
      * `partially_filled`: Order is live and some fills.
      * `filled`: The order has been fully filled.
      * `canceled`: The order has been cancelled.
      * `expired`: The order has expired.
    </ResponseField>

    <ResponseField name="order_userref" type="integer">
      Optional numeric, client identifier associated with one or more orders.
    </ResponseField>

    <ResponseField name="post_only" type="boolean">
      <span>One of:</span> `true`, `false`

      Indicates a post only order.
    </ResponseField>

    <ResponseField name="position_status" type="string">
      <span>One of:</span> `opened`, `closing`, `closed`

      Indicates status of the position on a margin order.
    </ResponseField>

    <ResponseField name="reason" type="string">
      The reason associated with an event, if applicable.
    </ResponseField>

    <ResponseField name="reduce_only" type="boolean">
      <span>One of:</span> `true`, `false`

      Indicates a reduce only order.
    </ResponseField>

    <ResponseField name="sender_sub_id" type="string">
      For institutional accounts, identifies underlying sub-account/trader for Self Trade Prevention (STP).
    </ResponseField>

    <ResponseField name="side" type="string">
      <span>One of:</span> `buy`, `sell`

      Side of the order.
    </ResponseField>

    <ResponseField name="symbol" type="string">
      <span>Example:</span> `"BTC/USD"`

      The symbol of the currency pair.
    </ResponseField>

    <ResponseField name="time_in_force" type="string">
      <span>One of:</span> `GTC`, `GTD`, `IOC`, `FOK`

      Time-in-force specifies how long an order remains in effect before being expired.

      * `GTC`: Good Till Canceled
      * `GTD`: Good Till Date
      * `IOC`: Immediate Or Cancel
      * `FOK`: Fill Or Kill
    </ResponseField>

    <ResponseField name="timestamp" type="string">
      <span>Format:</span> RFC3339<br />
      <span>Example:</span> `2022-12-25T09:30:59.123456Z`

      Time of the event.
    </ResponseField>

    <ResponseField name="trade_id" type="integer">
      The trade identifier.
    </ResponseField>

    <ResponseField name="triggers" type="object">
      Describes the parameters and status of the price trigger for triggered order types.

      <Expandable title="properties">
        <ResponseField name="reference" type="string">
          <span>One of:</span> `index`, `last`

          The reference price tracked for triggering orders.
        </ResponseField>

        <ResponseField name="price" type="float">
          Specifies the amount for the trigger price - it supports both static market prices and relative prices. This field is used in combination with the `price_type` field below to determine the effective trigger price.
        </ResponseField>

        <ResponseField name="price_type" type="string">
          <span>One of:</span> `static`, `pct`, `quote`

          The units for the trigger price.

          * `static`: a static market price for the asset, i.e. 30000 for BTC/USD.
          * `pct`: a percentage offset from the reference price, i.e. -10% from index price.
          * `quote`: a notional offset from the reference price in the quote currency, i.e, 150 BTC/USD from last price.
        </ResponseField>

        <ResponseField name="actual_price" type="float">
          The current value of the effective trigger price, this is useful if the trigger was entered using a relative price or the trigger price changes over time.
        </ResponseField>

        <ResponseField name="peak_price" type="float">
          The peak / trough price on `trailing-stop` and `trailing-stop-limit` orders.
        </ResponseField>

        <ResponseField name="last_price" type="float">
          On trigger activation, the value of the reference last price that triggered the order.
        </ResponseField>

        <ResponseField name="status" type="string">
          <span>One of:</span> `triggered`, `untriggered`

          The status is set to `triggered` when the trigger conditions are met and the order becomes active.
        </ResponseField>

        <ResponseField name="timestamp" type="string">
          <span>Format:</span> RFC3339<br />
          <span>Example:</span> `2022-12-25T09:30:59.123456Z`

          On trigger activation, the timestamp of the trigger event.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="user" type="string">
      <span>Example:</span> `AA96N74GCGEFN8KI`<br />
      <span>Condition:</span> Published when request parameters have 'users=all'

      The Kraken generated identifier for a user / sub-account.
    </ResponseField>

    <ResponseField name="cancel_reason" type="string">
      <span>Deprecated:</span> Use 'reason' field

      Cancellation reason.
    </ResponseField>

    <ResponseField name="stop_price" type="float">
      <span>Deprecated:</span> Use 'triggers' object

      The stop price for triggered order types.
    </ResponseField>

    <ResponseField name="trigger" type="string">
      <span>One of:</span> `index`, `last`<br />
      <span>Deprecated:</span> Use 'triggers' object

      Reference price for triggered order types.
    </ResponseField>

    <ResponseField name="triggered_price" type="float">
      <span>Deprecated:</span> Use 'triggers' object

      Price which triggered the order.
    </ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="sequence" type="integer">
  The subscription message sequence number.
</ResponseField>

## Unsubscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `executions`
        </ResponseField>

        <ResponseField name="token" type="string">
          Authentication token. See [authentication guide](/exchange/guides/websockets/authentication) for details.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="method" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="result" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `executions`
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the subscription was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the acknowledgement was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Subscribe Request theme={null}
    {
        "method": "subscribe",
        "params": {
            "channel": "executions",
            "token": "G38a1tGFzqGiUCmnegBcm8d4nfP3tytiNQz6tkCBYXY",
            "snap_orders": true,
            "snap_trades": true
        }
    }
    ```

    ```json Subscribe Response theme={null}
    {
        "method": "subscribe",
        "result": {
            "channel": "executions",
            "maxratecount": 125,
            "snap_orders": true,
            "snap_trades": true
        },
        "success": true,
        "time_in": "2023-10-16T13:18:35.303171Z",
        "time_out": "2023-10-16T13:18:35.318297Z"
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Pending theme={null}
    {
        "channel": "executions",
        "type": "update",
        "data": [
            {
                "order_id": "OK4GJX-KSTLS-7DZZO5",
                "order_userref": 3,
                "symbol": "BTC/USD",
                "order_qty": 0.005,
                "cum_cost": 0.0,
                "time_in_force": "GTC",
                "exec_type": "pending_new",
                "side": "sell",
                "order_type": "limit",
                "limit_price_type": "static",
                "limit_price": 26500.0,
                "stop_price": 0.0,
                "order_status": "pending_new",
                "fee_usd_equiv": 0.0,
                "fee_ccy_pref": "fciq",
                "timestamp": "2023-09-22T10:33:05.709950Z"
            }
        ],
        "sequence": 8
    }
    ```

    ```json Live Order theme={null}
    {
        "channel": "executions",
        "type": "update",
        "data": [
            {
                "timestamp": "2023-09-22T10:33:05.709982Z",
                "order_status": "new",
                "exec_type": "new",
                "order_userref": 3,
                "order_id": "OK4GJX-KSTLS-7DZZO5"
            }
        ],
        "sequence": 9
    }
    ```

    ```json Execution theme={null}
    {
        "channel": "executions",
        "type": "update",
        "data": [
            {
                "order_id": "OK4GJX-KSTLS-7DZZO5",
                "order_userref": 3,
                "exec_id": "TGBB7L-HT5LX-J3BZ4A",
                "exec_type": "trade",
                "trade_id": 62887576,
                "symbol": "BTC/USD",
                "side": "sell",
                "last_qty": 0.005,
                "last_price": 26599.9,
                "liquidity_ind": "t",
                "cost": 132.9995,
                "order_type": "limit",
                "timestamp": "2023-09-22T10:33:05.709993Z",
                "order_status": "partially_filled",
                "cum_qty": 0.005,
                "cum_cost": 132.9995,
                "avg_price": 26599.9,
                "fee_usd_equiv": 0.3458,
                "fees": [
                    {
                        "asset": "USD",
                        "qty": 0.3458
                    }
                ]
            }
        ],
        "sequence": 10
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Unsubscribe Request theme={null}
    {
        "method": "unsubscribe",
        "params": {
            "channel": "executions",
            "token": "G38a1tGFzqGiUCmnegBcm8d4nfP3tytiNQz6tkCBYXY"
        }
    }
    ```

    ```json Unsubscribe Response theme={null}
    {
        "method": "unsubscribe",
        "result": {
            "channel": "executions"
        },
        "success": true,
        "time_in": "2023-10-16T13:18:35.303171Z",
        "time_out": "2023-10-16T13:18:35.318297Z"
    }
    ```
  </CodeGroup>
</Panel>


# Heartbeat
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/heartbeat

Automatic heartbeat messages to verify the connection is alive

<div>
  <span>WSS</span>
  <span>ws.kraken.com/v2</span>
  <span>heartbeat</span>
</div>

The `heartbeat` channel provides a mechanism to verify that the connection is alive.

Heartbeat messages are sent approximately once every second **in the absence of any other channel updates**.

There is no option to directly request a `heartbeat` subscription, the heartbeats will be automatically generated on subscription to any channel.

## Update

The channel name is the indicator of a heartbeat, there is no other data in the heartbeat payload.

<ResponseField name="channel" type="string">
  Value: `heartbeat`
</ResponseField>

<Panel>
  <CodeGroup>
    ```json Example: Heartbeat theme={null}
    {
        "channel": "heartbeat"
    }
    ```
  </CodeGroup>
</Panel>


# Instruments
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/instrument

Subscribe to reference data for all active assets and tradeable pairs

<div>
  <span>WSS</span>
  <span>ws.kraken.com/v2</span>
  <span>instrument</span>
</div>

The `instrument` channel provides a stream of reference data of all active assets and tradeable pairs.

It provides the symbol identifiers, precisions, trading parameters and rules.

## Subscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `instrument`
        </ResponseField>

        <ResponseField name="execution_venue" type="string">
          <span>One of:</span> `international`, `bitnomial-exchange`<br />
          <span>Default:</span> `international`

          The execution venue for the instrument channel. If not included, defaults to `international`.
        </ResponseField>

        <ResponseField name="include_tokenized_assets" type="boolean">
          <span>One of:</span> `false`, `true`<br />
          <span>Default:</span> `false`

          If `true`, include xStocks in the response, otherwise include crypto spot pairs only.
        </ResponseField>

        <ResponseField name="snapshot" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `true`

          Request a snapshot after subscribing.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="method" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="result" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `instrument`
        </ResponseField>

        <ResponseField name="snapshot" type="boolean">
          Indicates if a snapshot is requested.
        </ResponseField>

        <ResponseField name="warnings" type="string[]">
          An advisory message, highlighting deprecated fields or upcoming changes to the channel.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the subscription was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the acknowledgement was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>
</Tabs>

## Snapshot / Update

The snapshot and update responses share the same schema.

<ResponseField name="channel" type="string">
  Value: `instrument`
</ResponseField>

<ResponseField name="type" type="string">
  <span>One of:</span> `snapshot`, `update`
</ResponseField>

<ResponseField name="data" type="object">
  <Expandable title="properties">
    <ResponseField name="assets" type="object[]">
      A list of assets.

      <Expandable title="properties">
        <ResponseField name="borrowable" type="boolean">
          <span>One of:</span> `true`, `false`

          Flag if asset is borrowable.
        </ResponseField>

        <ResponseField name="collateral_value" type="float">Valuation as margin collateral (if applicable).</ResponseField>
        <ResponseField name="id" type="string">Asset identifier.</ResponseField>
        <ResponseField name="margin_rate" type="float">Interest rate to borrow the asset.</ResponseField>
        <ResponseField name="precision" type="integer">Maximum precision for asset ledger, balances.</ResponseField>
        <ResponseField name="precision_display" type="integer">Recommended display precision.</ResponseField>
        <ResponseField name="multiplier" type="float">Multiplier of the tokenised asset. Fixed conversion rate of the token.</ResponseField>
        <ResponseField name="class" type="string">Asset class (e.g. `currency`).</ResponseField>

        <ResponseField name="status" type="string">
          <span>One of:</span> `depositonly`, `disabled`, `enabled`, `fundingtemporarilydisabled`, `withdrawalonly`, `workinprogress`

          Status of asset.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="pairs" type="object[]">
      A list of pairs.

      <Expandable title="properties">
        <ResponseField name="base" type="string">Asset identifier of the base currency.</ResponseField>
        <ResponseField name="quote" type="string">Asset identifier of the quote currency.</ResponseField>
        <ResponseField name="cost_min" type="float">Minimum cost (price \* qty) for new orders.</ResponseField>
        <ResponseField name="cost_precision" type="integer">Maximum precision used for cost prices.</ResponseField>
        <ResponseField name="has_index" type="boolean">Whether the pair has an index available for example stop-loss triggers.</ResponseField>

        <ResponseField name="margin_initial" type="float">
          <span>Condition:</span> On marginable pairs only

          Initial margin requirement (in percent).
        </ResponseField>

        <ResponseField name="marginable" type="boolean">
          <span>One of:</span> `true`, `false`

          Whether the pair can be traded on margin.
        </ResponseField>

        <ResponseField name="position_limit_long" type="integer">
          <span>Condition:</span> On marginable pairs only

          Limit for long positions.
        </ResponseField>

        <ResponseField name="position_limit_short" type="integer">
          <span>Condition:</span> On marginable pairs only

          Limit for short positions.
        </ResponseField>

        <ResponseField name="price_increment" type="float">Minimum price increment for new orders.</ResponseField>
        <ResponseField name="price_precision" type="integer">Maximum precision used for order prices.</ResponseField>
        <ResponseField name="qty_increment" type="float">Minimum quantity increment for new orders.</ResponseField>
        <ResponseField name="qty_min" type="float">Minimum quantity (in base currency) for new orders.</ResponseField>
        <ResponseField name="qty_precision" type="integer">Maximum precision used for order quantities.</ResponseField>
        <ResponseField name="ws_display_price_precision" type="integer">Recommended display precision for prices in WebSocket feeds.</ResponseField>

        <ResponseField name="status" type="string">
          <span>One of:</span> `cancel_only`, `delisted`, `limit_only`, `maintenance`, `online`, `post_only`, `reduce_only`, `work_in_progress`

          Status of pair.
        </ResponseField>

        <ResponseField name="symbol" type="string">
          <span>Example:</span> `"BTC/USD"`

          The symbol of the currency pair.
        </ResponseField>

        <ResponseField name="tick_size" type="float">
          <span>Deprecated:</span> Use `price_increment`

          Minimum price increment for new orders.
        </ResponseField>
      </Expandable>
    </ResponseField>
  </Expandable>
</ResponseField>

## Unsubscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `instrument`
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="method" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="result" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `instrument`
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the subscription was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the acknowledgement was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Subscribe Request theme={null}
    {
        "method": "subscribe",
        "params": {
            "channel": "instrument"
        },
        "req_id": 79
    }
    ```

    ```json Subscribe Response theme={null}
    {
        "method": "subscribe",
        "req_id": 79,
        "result": {
            "channel": "instrument",
            "snapshot": true,
            "warnings": [
                "tick_size is deprecated, use price_increment"
            ]
        },
        "success": true,
        "time_in": "2023-09-26T16:49:20.962586Z",
        "time_out": "2023-09-26T16:49:20.962630Z"
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Snapshot theme={null}
    {
        "channel": "instrument",
        "type": "snapshot",
        "data": {
            "assets": [
                {
                    "id": "USD",
                    "status": "enabled",
                    "precision": 4,
                    "precision_display": 2,
                    "borrowable": true,
                    "collateral_value": 1.0,
                    "margin_rate": 0.015
                },
                {
                    "id": "BTC",
                    "status": "enabled",
                    "precision": 10,
                    "precision_display": 5,
                    "borrowable": true,
                    "collateral_value": 1.0,
                    "margin_rate": 0.01
                },
                {
                    "id": "XRP",
                    "status": "enabled",
                    "precision": 8,
                    "precision_display": 5,
                    "borrowable": true,
                    "collateral_value": 0.0,
                    "margin_rate": 0.02
                }
            ],
            "pairs": [
                {
                    "symbol": "BTC/USD",
                    "base": "BTC",
                    "quote": "USD",
                    "status": "online",
                    "qty_precision": 8,
                    "qty_increment": 1e-08,
                    "price_precision": 1,
                    "cost_precision": 5,
                    "marginable": true,
                    "has_index": true,
                    "cost_min": 0.5,
                    "margin_initial": 0.2,
                    "position_limit_long": 250,
                    "position_limit_short": 200,
                    "tick_size": 0.1,
                    "price_increment": 0.1,
                    "qty_min": 0.0001
                },
                {
                    "symbol": "MATIC/GBP",
                    "base": "MATIC",
                    "quote": "GBP",
                    "status": "online",
                    "qty_precision": 8,
                    "qty_increment": 1e-08,
                    "price_precision": 4,
                    "cost_precision": 6,
                    "marginable": false,
                    "has_index": true,
                    "cost_min": 0.43,
                    "tick_size": 0.0001,
                    "price_increment": 0.0001,
                    "qty_min": 4.0
                }
            ]
        }
    }
    ```

    ```json Update theme={null}
    {
        "channel": "instrument",
        "type": "update",
        "data": {
           "assets": [
              {
                 "id": "BTC",
                 "status": "enabled",
                 "precision": 10,
                 "precision_display": 5,
                 "borrowable": true,
                 "collateral_value": 1.0,
                 "margin_rate": 0.01
              }
           ],
           "pairs": []
        }
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Unsubscribe Request theme={null}
    {
        "method": "unsubscribe",
        "params": {
            "channel": "instrument"
        },
        "req_id": 79
    }
    ```

    ```json Unsubscribe Response theme={null}
    {
        "method": "unsubscribe",
        "req_id": 79,
        "result": {
            "channel": "instrument"
        },
        "success": true,
        "time_in": "2023-09-26T16:49:20.962586Z",
        "time_out": "2023-09-26T16:49:20.962630Z"
    }
    ```
  </CodeGroup>
</Panel>


# Orders (Level 3)
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/level3

Subscribe to individual order visibility in the order book

<div>
  <span>WSS</span>
  <span>ws-l3.kraken.com/v2</span>
  <span>level3</span>
</div>

The `level3` channel has an additional level of granularity over the `book` channel, it provides visibility of individual orders in the book.

L3 shows orders resting in the visible order book and it will never be crossed (i.e. no overlapping buy and sell orders). This feed excludes:

* In-flight orders.
* Unmatched market orders.
* Untriggered stop-loss and take-profit orders.
* Hidden quantity of iceberg orders.

For more detail on maintaining the order book and generating a checksum, see [guide](/exchange/guides/websockets/l3-checksum-v2).

### Subscription limits

The `level3` channel is authenticated (i.e. it requires an API token to subscribe) and there are restrictions of the number of symbols and the subscription rate.

* The total number of symbols per websocket connection is `200`. A client can open multiple websockets connections to increase symbol coverage.
* The subscription rate determined by client tier and order book depth. Standard rate count limit per second is `200` and the pro limit is `500`.
* The counter increase per book depth subscription is given in the table below.

| Order Book Depth | Rate Counter Increase per Symbol |
| ---------------- | -------------------------------- |
| 10               | 5                                |
| 100              | 25                               |
| 1000             | 100                              |

<span>Example:</span> Pro client can subscribe to 100 symbols of 10 depth every second.

## Subscribe

Only one subscription to one depth level per symbol is supported, i.e. cannot subscribe to 10 levels and 1000 levels of "BTC/USD".

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `level3`
        </ResponseField>

        <ResponseField name="symbol" type="string[]">
          <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`

          A list of currency pairs.
        </ResponseField>

        <ResponseField name="depth" type="integer">
          <span>One of:</span> `10`, `100`, `1000`<br />
          <span>Default:</span> `10`

          The number of price levels to be received.
        </ResponseField>

        <ResponseField name="snapshot" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `true`

          Request a snapshot after subscribing.
        </ResponseField>

        <ResponseField name="token" type="string">
          Authentication token. See [authentication guide](/exchange/guides/websockets/authentication) for details.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    There is a separate acknowledgement response for each symbol in the subscription list.

    <ResponseField name="method" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="result" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `level3`
        </ResponseField>

        <ResponseField name="symbol" type="string">
          <span>Example:</span> `"BTC/USD"`

          The currency pair associated with this subscription.
        </ResponseField>

        <ResponseField name="depth" type="integer">
          <span>One of:</span> `10`, `100`, `1000`

          The number of price levels to be received.
        </ResponseField>

        <ResponseField name="snapshot" type="boolean">
          Indicates if a snapshot is requested.
        </ResponseField>

        <ResponseField name="warnings" type="string[]">
          An advisory message, highlighting deprecated fields or upcoming changes to the channel.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the subscription was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the acknowledgement was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>
</Tabs>

## Snapshot

<ResponseField name="channel" type="string">
  Value: `level3`
</ResponseField>

<ResponseField name="type" type="string">
  <span>One of:</span> `snapshot`
</ResponseField>

<ResponseField name="data" type="object[]">
  <Expandable title="properties">
    <ResponseField name="symbol" type="string">
      <span>Example:</span> `"BTC/USD"`

      The symbol of the currency pair.
    </ResponseField>

    <ResponseField name="bids" type="object[]">
      A list of buy orders posted in the book.

      <Expandable title="properties">
        <ResponseField name="order_id" type="string">
          The Kraken order identifier of the order in the book
        </ResponseField>

        <ResponseField name="limit_price" type="float">
          Limit price of the order
        </ResponseField>

        <ResponseField name="order_qty" type="float">
          The remaining order quantity visible in the book
        </ResponseField>

        <ResponseField name="timestamp" type="string">
          <span>Format:</span> RFC3339<br />
          <span>Example:</span> `2022-12-25T09:30:59.123456789Z`

          The time the order was inserted or amended.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="asks" type="object[]">
      A list of sell orders posted in the book.

      <Expandable title="properties">
        <ResponseField name="order_id" type="string">
          The Kraken order identifier of the order in the book
        </ResponseField>

        <ResponseField name="limit_price" type="float">
          Limit price of the order
        </ResponseField>

        <ResponseField name="order_qty" type="float">
          The remaining order quantity visible in the book
        </ResponseField>

        <ResponseField name="timestamp" type="string">
          <span>Format:</span> RFC3339<br />
          <span>Example:</span> `2022-12-25T09:30:59.123456789Z`

          The time the order was inserted or amended.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="checksum" type="integer">
      CRC32 checksum for the top 10 price levels on both sides.
    </ResponseField>

    <ResponseField name="timestamp" type="string">
      <span>Format:</span> RFC3339<br />
      <span>Example:</span> `2022-12-25T09:30:59.123456789Z`

      The time this market data message was generated in the matching engine.
    </ResponseField>
  </Expandable>
</ResponseField>

## Update

* The updates will be streamed following the initial snapshot, no sequencing is required.
* The L3 channel is not throttled, updates will be provided in the real-time.
* If a price level is removed from the subscribed levels (i.e. result of trades/cancels) then all orders in the next available level will generate an add event.

### Maintaining the book

After each update, the book should be truncated to your subscribed depth, there will be no `delete` event for price levels that fall out of scope.
In other words, if you are subscribed with `depth` of 10 and an insert into the book results in 11 bids, you must remove the 11th worst bid.

<ResponseField name="channel" type="string">
  Value: `level3`
</ResponseField>

<ResponseField name="type" type="string">
  <span>One of:</span> `update`
</ResponseField>

<ResponseField name="data" type="object[]">
  <Expandable title="properties">
    <ResponseField name="symbol" type="string">
      <span>Example:</span> `"BTC/USD"`

      The symbol of the currency pair.
    </ResponseField>

    <ResponseField name="timestamp" type="string">
      <span>Format:</span> RFC3339<br />
      <span>Example:</span> `2022-12-25T09:30:59.123456789Z`

      The time this market data message was generated in the matching engine.
    </ResponseField>

    <ResponseField name="checksum" type="integer">
      CRC32 checksum for the top 10 price levels on both sides.
    </ResponseField>

    <ResponseField name="bids" type="object[]">
      A list of order events to the bid side of book.

      <Expandable title="properties">
        <ResponseField name="event" type="string">
          <span>One of:</span> `add`, `modify`, `delete`

          The type of order event for this update.

          * `add`: A new order added to the book.
          * `modify`: The order quantity has been modified, i.e. a fill.
          * `delete`: The order has been removed from the book, i.e. full fill or cancel.
        </ResponseField>

        <ResponseField name="order_id" type="string">
          The Kraken order identifier of the order in the book
        </ResponseField>

        <ResponseField name="limit_price" type="float">
          Limit price of the order
        </ResponseField>

        <ResponseField name="order_qty" type="float">
          The remaining order quantity visible in the book
        </ResponseField>

        <ResponseField name="timestamp" type="string">
          <span>Format:</span> RFC3339<br />
          <span>Example:</span> `2022-12-25T09:30:59.123456789Z`

          The time the order was inserted or amended.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="asks" type="object[]">
      A list of order events to the ask side of book.

      <Expandable title="properties">
        <ResponseField name="event" type="string">
          <span>One of:</span> `add`, `modify`, `delete`

          The type of order event for this update.

          * `add`: A new order added to the book.
          * `modify`: The order quantity has been modified, i.e. a fill.
          * `delete`: The order has been removed from the book, i.e. full fill or cancel.
        </ResponseField>

        <ResponseField name="order_id" type="string">
          The Kraken order identifier of the order in the book
        </ResponseField>

        <ResponseField name="limit_price" type="float">
          Limit price of the order
        </ResponseField>

        <ResponseField name="order_qty" type="float">
          The remaining order quantity visible in the book
        </ResponseField>

        <ResponseField name="timestamp" type="string">
          <span>Format:</span> RFC3339<br />
          <span>Example:</span> `2022-12-25T09:30:59.123456789Z`

          The time the order was inserted or amended.
        </ResponseField>
      </Expandable>
    </ResponseField>
  </Expandable>
</ResponseField>

## Unsubscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `level3`
        </ResponseField>

        <ResponseField name="symbol" type="string[]">
          <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`

          A list of currency pairs.
        </ResponseField>

        <ResponseField name="depth" type="integer">
          <span>One of:</span> `10`, `100`, `1000`<br />
          <span>Default:</span> `10`

          The number of price levels to be received.
        </ResponseField>

        <ResponseField name="token" type="string">
          Authentication token. See [authentication guide](/exchange/guides/websockets/authentication) for details.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    There is a separate acknowledgement response for each symbol in the unsubscribe request list.

    <ResponseField name="method" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="result" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `level3`
        </ResponseField>

        <ResponseField name="symbol" type="string">
          <span>Example:</span> `"BTC/USD"`

          The currency pair associated with this subscription.
        </ResponseField>

        <ResponseField name="depth" type="integer">
          <span>One of:</span> `10`, `100`, `1000`

          The number of price levels to be unsubscribed.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the subscription was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the acknowledgement was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Subscribe Request theme={null}
    {
        "method": "subscribe",
        "params": {
            "channel": "level3",
            "symbol": [
                "ALGO/USD",
                "MATIC/USD"
            ],
            "snapshot": true,
            "token": "G38a1tGFzqGiUCmnegBcm8d4nfP3tytiNQz6tkCBYXY"
        }
    }
    ```

    ```json Subscribe Response theme={null}
    {
        "method": "subscribe",
        "result": {
            "channel": "level3",
            "snapshot": true,
            "symbol": "ALGO/USD"
        },
        "success": true,
        "time_in": "2023-10-06T18:20:56.506266Z",
        "time_out": "2023-10-06T18:20:56.521803Z"
    }

    {
        "method": "subscribe",
        "result": {
            "channel": "level3",
            "snapshot": true,
            "symbol": "MATIC/USD"
        },
        "success": true,
        "time_in": "2023-10-06T18:20:56.506266Z",
        "time_out": "2023-10-06T18:20:56.521859Z"
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Snapshot theme={null}
    {
        "channel": "level3",
        "type": "snapshot",
        "data": [
            {
                "symbol": "MATIC/USD",
                "checksum": 281817320,
                "bids": [
                    {
                        "order_id": "O6ZQNQ-BXL4E-5WGINO",
                        "limit_price": 0.5629,
                        "order_qty": 111.56125344,
                        "timestamp": "2023-10-06T17:35:00.279389650Z"
                    },
                    {
                        "order_id": "OEP26Y-YAFEF-OFR62B",
                        "limit_price": 0.5625,
                        "order_qty": 6390.19338,
                        "timestamp": "2023-10-06T18:19:55.056070105Z"
                    },
                    {
                        "order_id": "OKNAY7-67JRK-AIZ4JO",
                        "limit_price": 0.5625,
                        "order_qty": 14084.5,
                        "timestamp": "2023-10-06T18:20:55.357467423Z"
                    }
                ],
                "asks": [
                    {
                        "order_id": "OLLSXO-HDMT3-BUOKEI",
                        "limit_price": 0.563,
                        "order_qty": 4422.9978357,
                        "timestamp": "2023-10-06T18:18:20.734897896Z"
                    },
                    {
                        "order_id": "O5SR5W-L7OLY-BLDEJV",
                        "limit_price": 0.563,
                        "order_qty": 420.0,
                        "timestamp": "2023-10-06T18:18:20.738706230Z"
                    },
                    {
                        "order_id": "OXV6QS-2GG4Q-F4EECM",
                        "limit_price": 0.563,
                        "order_qty": 490.0,
                        "timestamp": "2023-10-06T18:18:21.064657206Z"
                    }
                ]
            }
        ]
    }
    ```

    ```json Update theme={null}
    {
        "channel": "level3",
        "type": "update",
        "data": [
            {
                "checksum": 2841398499,
                "symbol": "MATIC/USD",
                "bids": [],
                "asks": [
                    {
                        "event": "delete",
                        "order_id": "OOIATY-6EIWY-ACVIUN",
                        "limit_price": 0.5636,
                        "order_qty": 302.89736033,
                        "timestamp": "2023-10-06T18:21:00.097010033Z"
                    },
                    {
                        "event": "add",
                        "order_id": "O2BN53-5RSB2-V3J57T",
                        "limit_price": 0.564,
                        "order_qty": 3500.77668626,
                        "timestamp": "2023-10-06T18:20:27.383408052Z"
                    },
                    {
                        "event": "add",
                        "order_id": "OWG5ZU-LHUHH-BICPEX",
                        "limit_price": 0.564,
                        "order_qty": 22149.62881248,
                        "timestamp": "2023-10-06T18:20:50.842854530Z"
                    },
                    {
                        "event": "add",
                        "order_id": "ONVDB3-2DRUF-Y6MF7D",
                        "limit_price": 0.564,
                        "order_qty": 42196.34088652,
                        "timestamp": "2023-10-06T18:20:58.101850535Z"
                    }
                ]
            }
        ]
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Unsubscribe Request theme={null}
    {
        "method": "unsubscribe",
        "params": {
            "channel": "level3",
            "symbol": [
                "ALGO/USD",
                "MATIC/USD"
            ],
            "token": "G38a1tGFzqGiUCmnegBcm8d4nfP3tytiNQz6tkCBYXY"
        }
    }
    ```

    ```json Unsubscribe Response theme={null}
    {
        "method": "unsubscribe",
        "result": {
            "channel": "level3",
            "symbol": "ALGO/USD"
        },
        "success": true,
        "time_in": "2023-10-06T18:20:56.506266Z",
        "time_out": "2023-10-06T18:20:56.521803Z"
    }

    {
        "method": "unsubscribe",
        "result": {
            "channel": "level3",
            "symbol": "MATIC/USD"
        },
        "success": true,
        "time_in": "2023-10-06T18:20:56.506266Z",
        "time_out": "2023-10-06T18:20:56.521859Z"
    }
    ```
  </CodeGroup>
</Panel>


# Candles (OHLC)
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/ohlc

Subscribe to Open, High, Low and Close (OHLC) candle data for specific interval periods

<div>
  <span>WSS</span>
  <span>ws.kraken.com/v2</span>
  <span>ohlc</span>
</div>

The `ohlc` channel streams the Open, High, Low and Close (OHLC) data for the specific interval period.

The feed accepts a list of symbols for subscription and the updates are generated on trade events.

## Subscribe

There is an acknowledgement response for each symbol in the subscription list.

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `ohlc`
        </ResponseField>

        <ResponseField name="symbol" type="string[]">
          <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`

          A list of currency pairs.
        </ResponseField>

        <ResponseField name="interval" type="integer">
          <span>One of:</span> `1`, `5`, `15`, `30`, `60`, `240`, `1440`, `10080`, `21600`

          The interval timeframe in minutes.
        </ResponseField>

        <ResponseField name="snapshot" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `true`

          Request a snapshot after subscribing.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="method" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="result" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `ohlc`
        </ResponseField>

        <ResponseField name="symbol" type="string">
          <span>Example:</span> `"BTC/USD"`

          The currency pair associated with this subscription.
        </ResponseField>

        <ResponseField name="snapshot" type="boolean">
          Indicates if a snapshot is requested.
        </ResponseField>

        <ResponseField name="interval" type="integer">
          The requested OHLC interval in minutes.
        </ResponseField>

        <ResponseField name="warnings" type="string[]">
          An advisory message, highlighting deprecated fields or upcoming changes to the channel.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the subscription was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the acknowledgement was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>
</Tabs>

## Snapshot / Update

The snapshot and update responses share the same schema. An update message is streamed on a trade event.

<ResponseField name="channel" type="string">
  Value: `ohlc`
</ResponseField>

<ResponseField name="type" type="string">
  <span>One of:</span> `snapshot`, `update`
</ResponseField>

<ResponseField name="data" type="object[]">
  A list of candle events.

  <Expandable title="properties">
    <ResponseField name="symbol" type="string">
      <span>Example:</span> `"BTC/USD"`

      The symbol of the currency pair.
    </ResponseField>

    <ResponseField name="open" type="float">The opening trade price within the interval.</ResponseField>
    <ResponseField name="high" type="float">The highest trade price within the interval.</ResponseField>
    <ResponseField name="low" type="float">The lowest trade price within the interval.</ResponseField>
    <ResponseField name="close" type="float">The last trade price within the interval.</ResponseField>
    <ResponseField name="vwap" type="float">Volume weighted average trade price within the interval.</ResponseField>
    <ResponseField name="trades" type="integer">Number of trades within the interval.</ResponseField>
    <ResponseField name="volume" type="float">Total traded volume (in base currency terms) within the interval.</ResponseField>

    <ResponseField name="interval_begin" type="string">
      <span>Format:</span> RFC3339<br />
      <span>Example:</span> `2022-12-25T09:30:59.123456Z`

      The timestamp of start of the interval.
    </ResponseField>

    <ResponseField name="interval" type="integer">The timeframe from the interval in minutes.</ResponseField>

    <ResponseField name="timestamp" type="string">
      <span>Format:</span> RFC3339<br />
      <span>Example:</span> `2022-12-25T09:30:59.123456Z`<br />
      <span>Deprecated:</span> Use `interval_begin`

      The timestamp of start of the interval.
    </ResponseField>
  </Expandable>
</ResponseField>

## Unsubscribe

There is an acknowledgement response for each symbol in the unsubscribe list.

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `ohlc`
        </ResponseField>

        <ResponseField name="symbol" type="string[]">
          <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`

          A list of currency pairs.
        </ResponseField>

        <ResponseField name="interval" type="integer">
          <span>One of:</span> `1`, `5`, `15`, `30`, `60`, `240`, `1440`, `10080`, `21600`

          The interval timeframe in minutes.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="method" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="result" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `ohlc`
        </ResponseField>

        <ResponseField name="symbol" type="string">
          <span>Example:</span> `"BTC/USD"`

          The currency pair associated with this subscription.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the subscription was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the acknowledgement was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Subscribe Request theme={null}
    {
        "method": "subscribe",
        "params": {
            "channel": "ohlc",
            "symbol": [
                "ALGO/USD",
                "MATIC/USD"
            ],
            "interval": 5
        }
    }
    ```

    ```json Subscribe Response theme={null}
    {
        "method": "subscribe",
        "result": {
            "channel": "ohlc",
            "interval": 5,
            "snapshot": true,
            "symbol": "ALGO/USD",
            "warnings": [
                "timestamp is deprecated, use interval_begin"
            ]
        },
        "success": true,
        "time_in": "2023-10-04T16:26:01.802708Z",
        "time_out": "2023-10-04T16:26:01.802791Z"
    }

    {
        "method": "subscribe",
        "result": {
            "channel": "ohlc",
            "interval": 5,
            "snapshot": true,
            "symbol": "MATIC/USD",
            "warnings": [
                "timestamp is deprecated, use interval_begin"
            ]
        },
        "success": true,
        "time_in": "2023-10-04T16:26:01.802708Z",
        "time_out": "2023-10-04T16:26:01.802791Z"
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Snapshot theme={null}
    {
        "channel": "ohlc",
        "type": "snapshot",
        "timestamp": "2023-10-04T16:26:01.806315597Z",
        "data": [
            {
                "symbol": "ALGO/USD",
                "open": 0.09875,
                "high": 0.09875,
                "low": 0.09875,
                "close": 0.09875,
                "trades": 1,
                "volume": 201.86015,
                "vwap": 0.09875,
                "interval_begin": "2023-10-04T15:25:00.000000000Z",
                "interval": 5,
                "timestamp": "2023-10-04T15:30:00.000000Z"
            },
            {
                "symbol": "ALGO/USD",
                "open": 0.09875,
                "high": 0.0988,
                "low": 0.09875,
                "close": 0.09875,
                "trades": 13,
                "volume": 16255.46368,
                "vwap": 0.09879,
                "interval_begin": "2023-10-04T15:30:00.000000000Z",
                "interval": 5,
                "timestamp": "2023-10-04T15:35:00.000000Z"
            }
        ]
    }
    ```

    ```json Update theme={null}
    {
        "channel": "ohlc",
        "type": "update",
        "timestamp": "2023-10-04T16:26:30.524394914Z",
        "data": [
            {
                "symbol": "MATIC/USD",
                "open": 0.5624,
                "high": 0.5628,
                "low": 0.5622,
                "close": 0.5627,
                "trades": 12,
                "volume": 30927.68066226,
                "vwap": 0.5626,
                "interval_begin": "2023-10-04T16:25:00.000000000Z",
                "interval": 5,
                "timestamp": "2023-10-04T16:30:00.000000Z"
            }
        ]
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Unsubscribe Request theme={null}
    {
        "method": "unsubscribe",
        "params": {
            "channel": "ohlc",
            "symbol": [
                "ALGO/USD",
                "MATIC/USD"
            ],
            "interval": 5
        }
    }
    ```

    ```json Unsubscribe Response theme={null}
    {
        "method": "unsubscribe",
        "result": {
            "channel": "ohlc",
            "interval": 5,
            "symbol": "ALGO/USD"
        },
        "success": true,
        "time_in": "2023-10-04T16:26:01.802708Z",
        "time_out": "2023-10-04T16:26:01.802791Z"
    }

    {
        "method": "unsubscribe",
        "result": {
            "channel": "ohlc",
            "interval": 5,
            "symbol": "MATIC/USD"
        },
        "success": true,
        "time_in": "2023-10-04T16:26:01.802708Z",
        "time_out": "2023-10-04T16:26:01.802791Z"
    }
    ```
  </CodeGroup>
</Panel>


# Ping
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/ping

Verify the WebSocket connection is alive with a ping/pong request

<div>
  <span>WSS</span>
  <span>ws.kraken.com/v2</span>
  <span>ping</span>
</div>

Clients can ping the server to verify connection is alive and the server will respond with a `pong`.

This is an application level ping, distinct from the protocol-level ping in the WebSockets standard.

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `ping`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="method" type="string">
      Value: `pong`
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the request was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the response was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Request theme={null}
    {
        "method": "ping",
        "req_id": 101
    }
    ```

    ```json Response theme={null}
    {
        "method": "pong",
        "req_id": 101,
        "time_in": "2023-09-24T14:10:23.799685Z",
        "time_out": "2023-09-24T14:10:23.799703Z"
    }
    ```
  </CodeGroup>
</Panel>


# Status
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/status

Receive exchange status updates and connection verification

<div>
  <span>WSS</span>
  <span>ws.kraken.com/v2</span>
  <span>status</span>
</div>

The `status` channel provides a mechanism to verify exchange status and successful initial connection.

There is no option to directly request a `status` update, a status will be automatically generated on successful websocket connection and when the trading engine status changes.

## Update

<ResponseField name="channel" type="string">
  Value: `status`
</ResponseField>

<ResponseField name="type" type="string">
  <span>One of:</span> `update`
</ResponseField>

<ResponseField name="data" type="object[]">
  <Expandable title="properties">
    <ResponseField name="system" type="string">
      <span>One of:</span> `online`, `cancel_only`, `maintenance`, `post_only`

      The status of the trading engine.

      * `online`: Markets are operating normally - all order types may be submitted and order matching can occur.
      * `maintenance`: Markets are offline for scheduled maintenance - new orders cannot be placed and existing orders cannot be cancelled.
      * `cancel_only`: Orders can be cancelled but new orders cannot be placed. No order matching will occur.
      * `post_only`: Only limit orders using the `post_only` option can be submitted. Orders can be cancelled. No order matching will occur.
    </ResponseField>

    <ResponseField name="api_version" type="string">
      <span>One of:</span> `v2`

      The version of the websockets API.
    </ResponseField>

    <ResponseField name="connection_id" type="integer">A unique connection identifier (for debugging).</ResponseField>
    <ResponseField name="version" type="string">The version of the websockets service.</ResponseField>
  </Expandable>
</ResponseField>

<Panel>
  <CodeGroup>
    ```json Example: Update theme={null}
    {
        "channel": "status",
        "data": [
            {
                "api_version": "v2",
                "connection_id": 13834774380200032777,
                "system": "online",
                "version": "2.0.0"
            }
        ],
        "type": "update"
    }
    ```
  </CodeGroup>
</Panel>


# Ticker
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/ticker

Subscribe to level 1 market data (top of book and recent trades)

<div>
  <span>WSS</span>
  <span>ws.kraken.com/v2</span>
  <span>ticker</span>
</div>

The `ticker` channel streams level 1 market data, i.e. top of the book (best bid/offer) and recent trade data.

The feed accepts a list of symbols for subscription and the updates are generated on trade events.

## Subscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `ticker`
        </ResponseField>

        <ResponseField name="symbol" type="string[]">
          <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`

          A list of currency pairs.
        </ResponseField>

        <ResponseField name="event_trigger" type="string">
          <span>One of:</span> `bbo`, `trades`<br />
          <span>Default:</span> `trades`

          The book event that causes a new ticker update to be published on the channel.

          * `bbo`: on a change in the best-bid-offer price levels.
          * `trades`: on every trade.
        </ResponseField>

        <ResponseField name="snapshot" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `true`

          Request a snapshot after subscribing.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="method" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="result" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `ticker`
        </ResponseField>

        <ResponseField name="symbol" type="string">
          <span>Example:</span> `"BTC/USD"`

          The currency pair associated with this subscription.
        </ResponseField>

        <ResponseField name="snapshot" type="boolean">
          <span>One of:</span> `true`, `false`

          Indicates if a snapshot is requested.
        </ResponseField>

        <ResponseField name="warnings" type="string[]">
          An advisory message, highlighting deprecated fields or upcoming changes to the channel.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the subscription was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the acknowledgement was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>
</Tabs>

## Snapshot / Update

The snapshot and update responses share the same schema. An update message is streamed on a trade event.

<ResponseField name="channel" type="string">
  Value: `ticker`
</ResponseField>

<ResponseField name="type" type="string">
  <span>One of:</span> `snapshot`, `update`
</ResponseField>

<ResponseField name="data" type="object[]">
  <Expandable title="properties">
    <ResponseField name="ask" type="float">Best ask price.</ResponseField>
    <ResponseField name="ask_qty" type="float">Best ask quantity.</ResponseField>
    <ResponseField name="bid" type="float">Best bid price.</ResponseField>
    <ResponseField name="bid_qty" type="float">Best bid quantity.</ResponseField>
    <ResponseField name="change" type="float">24-hour price change (in quote currency).</ResponseField>
    <ResponseField name="change_pct" type="float">24-hour price change (in percentage points).</ResponseField>
    <ResponseField name="high" type="float">24-hour highest trade price.</ResponseField>
    <ResponseField name="last" type="float">Last traded price (only guaranteed if traded within the past 24 hours).</ResponseField>
    <ResponseField name="low" type="float">24-hour lowest trade price.</ResponseField>

    <ResponseField name="symbol" type="string">
      <span>Example:</span> `"BTC/USD"`

      The symbol of the currency pair.
    </ResponseField>

    <ResponseField name="timestamp" type="string">
      <span>Format:</span> RFC3339<br />
      <span>Example:</span> `2022-12-25T09:30:59.123456Z`

      The ticker data timestamp.
    </ResponseField>

    <ResponseField name="volume" type="float">24-hour traded volume (in base currency terms).</ResponseField>
    <ResponseField name="vwap" type="float">24-hour volume weighted average price.</ResponseField>
  </Expandable>
</ResponseField>

## Unsubscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `ticker`
        </ResponseField>

        <ResponseField name="symbol" type="string[]">
          <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`

          A list of currency pairs.
        </ResponseField>

        <ResponseField name="event_trigger" type="string">
          <span>One of:</span> `bbo`, `trades`<br />
          <span>Default:</span> `trades`

          The book event that causes a new ticker update to be published on the channel.

          * `bbo`: on a change in the best-bid-offer price levels.
          * `trades`: on every trade.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="method" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="result" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `ticker`
        </ResponseField>

        <ResponseField name="symbol" type="string">
          <span>Example:</span> `"BTC/USD"`

          The currency pair associated with this subscription.
        </ResponseField>

        <ResponseField name="event_trigger" type="string">
          <span>One of:</span> `bbo`, `trades`<br />
          <span>Default:</span> `trades`

          The book event that causes a new ticker update to be published on the channel.

          * `bbo`: on a change in the best-bid-offer price levels.
          * `trades`: on every trade.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the subscription was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the acknowledgement was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Subscribe Request theme={null}
    {
        "method": "subscribe",
        "params": {
            "channel": "ticker",
            "symbol": [
                "ALGO/USD"
            ]
        }
    }
    ```

    ```json Subscribe Response theme={null}
    {
        "method": "subscribe",
        "result": {
            "channel": "ticker",
            "snapshot": true,
            "symbol": "ALGO/USD"
        },
        "success": true,
        "time_in": "2023-09-25T09:04:31.742599Z",
        "time_out": "2023-09-25T09:04:31.742648Z"
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Snapshot theme={null}
    {
        "channel": "ticker",
        "type": "snapshot",
        "data": [
            {
                "symbol": "ALGO/USD",
                "bid": 0.10025,
                "bid_qty": 740.0,
                "ask": 0.10036,
                "ask_qty": 1361.44813783,
                "last": 0.10035,
                "volume": 997038.98383185,
                "vwap": 0.10148,
                "low": 0.09979,
                "high": 0.10285,
                "change": -0.00017,
                "change_pct": -0.17,
                "timestamp": "2023-09-25T09:04:31.742648Z"
            }
        ]
    }
    ```

    ```json Update theme={null}
    {
        "channel": "ticker",
        "type": "update",
        "data": [
            {
                "symbol": "ALGO/USD",
                "bid": 0.10025,
                "bid_qty": 740.0,
                "ask": 0.10035,
                "ask_qty": 740.0,
                "last": 0.10035,
                "volume": 997038.98383185,
                "vwap": 0.10148,
                "low": 0.09979,
                "high": 0.10285,
                "change": -0.00017,
                "change_pct": -0.17,
                "timestamp": "2023-09-25T09:04:31.742648Z"
            }
        ]
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Unsubscribe Request theme={null}
    {
        "method": "unsubscribe",
        "params": {
            "channel": "ticker",
            "symbol": [
                "ALGO/USD"
            ]
        }
    }
    ```

    ```json Unsubscribe Response theme={null}
    {
        "method": "unsubscribe",
        "result": {
            "channel": "ticker",
            "event_trigger": "trades",
            "symbol": "ALGO/USD"
        },
        "success": true,
        "time_in": "2023-09-25T09:04:31.742599Z",
        "time_out": "2023-09-25T09:04:31.742648Z"
    }
    ```
  </CodeGroup>
</Panel>


# Trades
Source: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/trade

Subscribe to real-time trade events when orders are matched in the book

<div>
  <span>WSS</span>
  <span>ws.kraken.com/v2</span>
  <span>trade</span>
</div>

The `trade` channel generates a trade event when orders are matched in the book.

Multiple trades may be batched in a single message but that does not mean that these trades resulted from a single taker order.

The feed accepts a list of symbols for subscription.

## Subscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `trade`
        </ResponseField>

        <ResponseField name="symbol" type="string[]">
          <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`

          A list of currency pairs.
        </ResponseField>

        <ResponseField name="snapshot" type="boolean">
          <span>One of:</span> `true`, `false`<br />
          <span>Default:</span> `false`

          Request a snapshot after subscribing.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="method" type="string">
      Value: `subscribe`
    </ResponseField>

    <ResponseField name="result" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `trade`
        </ResponseField>

        <ResponseField name="symbol" type="string">
          <span>Example:</span> `"BTC/USD"`

          The currency pair associated with this subscription.
        </ResponseField>

        <ResponseField name="snapshot" type="boolean">
          Indicates if a snapshot is requested.
        </ResponseField>

        <ResponseField name="warnings" type="string[]">
          An advisory message, highlighting deprecated fields or upcoming changes to the channel.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the subscription was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the acknowledgement was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>
</Tabs>

## Snapshot / Update

The snapshot and update responses share the same schema. An update message is streamed on a trade event.

The snapshot reflects the most recent 50 trades.

<ResponseField name="channel" type="string">
  Value: `trade`
</ResponseField>

<ResponseField name="type" type="string">
  <span>One of:</span> `snapshot`, `update`
</ResponseField>

<ResponseField name="data" type="object[]">
  A list of trade events.

  <Expandable title="properties">
    <ResponseField name="symbol" type="string">
      <span>Example:</span> `"BTC/USD"`

      The symbol of the currency pair.
    </ResponseField>

    <ResponseField name="side" type="string">The side of the taker order.</ResponseField>
    <ResponseField name="qty" type="float">Size of the trade.</ResponseField>
    <ResponseField name="price" type="float">Average price of the trade.</ResponseField>

    <ResponseField name="ord_type" type="string">
      <span>One of:</span> `limit`, `market`

      The order type of the taker order.
    </ResponseField>

    <ResponseField name="trade_id" type="integer">Trade identifier is a sequence number, unique per book.</ResponseField>

    <ResponseField name="timestamp" type="string">
      <span>Format:</span> RFC3339<br />
      <span>Example:</span> `2022-12-25T09:30:59.123456Z`

      The book order update timestamp.
    </ResponseField>
  </Expandable>
</ResponseField>

## Unsubscribe

<Tabs>
  <Tab title="Request">
    <ResponseField name="method" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="params" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `trade`
        </ResponseField>

        <ResponseField name="symbol" type="string[]">
          <span>Example:</span> `["BTC/USD", "MATIC/GBP"]`

          A list of currency pairs.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>

  <Tab title="Response">
    <ResponseField name="method" type="string">
      Value: `unsubscribe`
    </ResponseField>

    <ResponseField name="result" type="object">
      <Expandable title="properties">
        <ResponseField name="channel" type="string">
          Value: `trade`
        </ResponseField>

        <ResponseField name="symbol" type="string">
          <span>Example:</span> `"BTC/USD"`

          The currency pair associated with this subscription.
        </ResponseField>
      </Expandable>
    </ResponseField>

    <ResponseField name="success" type="boolean">
      Indicates if the request was successfully processed by the engine. One of: `true`, `false`
    </ResponseField>

    <ResponseField name="error" type="string">
      Error message. Condition: if `success` is `false`.
    </ResponseField>

    <ResponseField name="time_in" type="string">
      The timestamp when the subscription was received on the wire, just prior to parsing data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="time_out" type="string">
      The timestamp when the acknowledgement was sent on the wire, just prior to transmitting data. Format: RFC3339. Example: `2022-12-25T09:30:59.123456Z`
    </ResponseField>

    <ResponseField name="req_id" type="integer">
      Optional client originated request identifier sent as acknowledgment in the response.
    </ResponseField>
  </Tab>
</Tabs>

<Panel>
  <CodeGroup>
    ```json Subscribe Request theme={null}
    {
        "method": "subscribe",
        "params": {
            "channel": "trade",
            "symbol": [
                "MATIC/USD"
            ],
            "snapshot": true
        }
    }
    ```

    ```json Subscribe Response theme={null}
    {
        "method": "subscribe",
        "result": {
            "channel": "trade",
            "snapshot": true,
            "symbol": "MATIC/USD"
        },
        "success": true,
        "time_in": "2023-09-25T09:21:10.428340Z",
        "time_out": "2023-09-25T09:21:10.428375Z"
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Snapshot theme={null}
    {
        "channel": "trade",
        "type": "snapshot",
        "data": [
            {
                "symbol": "MATIC/USD",
                "side": "buy",
                "price": 0.5147,
                "qty": 6423.46326,
                "ord_type": "limit",
                "trade_id": 4665846,
                "timestamp": "2023-09-25T07:48:36.925533Z"
            },
            {
                "symbol": "MATIC/USD",
                "side": "buy",
                "price": 0.5147,
                "qty": 1136.19677815,
                "ord_type": "limit",
                "trade_id": 4665847,
                "timestamp": "2023-09-25T07:49:36.925603Z"
            }
        ]
    }
    ```

    ```json Update theme={null}
    {
        "channel": "trade",
        "type": "update",
        "data": [
            {
                "symbol": "MATIC/USD",
                "side": "sell",
                "price": 0.5117,
                "qty": 40.0,
                "ord_type": "market",
                "trade_id": 4665906,
                "timestamp": "2023-09-25T07:49:37.708706Z"
            }
        ]
    }
    ```
  </CodeGroup>

  <CodeGroup>
    ```json Unsubscribe Request theme={null}
    {
        "method": "unsubscribe",
        "params": {
            "channel": "trade",
            "symbol": [
                "MATIC/USD"
            ],
            "snapshot": true
        }
    }
    ```

    ```json Unsubscribe Response theme={null}
    {
        "method": "unsubscribe",
        "result": {
            "channel": "trade",
            "symbol": "MATIC/USD"
        },
        "success": true,
        "time_in": "2023-09-25T09:21:10.428340Z",
        "time_out": "2023-09-25T09:21:10.428375Z"
    }
    ```
  </CodeGroup>
</Panel>


# Unified FIX
Source: https://docs.kraken.com/exchange/api-reference/unified-fix

FIX 4.4 reference for Spot and Derivatives — message types, session establishment, and endpoint mapping

The Kraken Unified FIX API is a FIX 4.4 implementation that covers
both Spot and Derivatives markets through a single set of credentials.
It is the lowest-latency order-entry path on the platform, with
deterministic sequencing, cancel-on-disconnect, and session-based
message replay.

For protocol architecture, supported messages, ClOrdID rules, STP, and
performance details, see the [FIX overview
guide](/exchange/guides/fix/introduction).

## Connection

| Environment | Hostname                             |
| :---------- | :----------------------------------- |
| Production  | `colo-london.vip-fix.kraken.com`     |
| UAT         | `colo-london.vip-fix.uat.kraken.com` |

| Service                      | Port |
| :--------------------------- | :--- |
| Spot Trading                 | 4001 |
| Spot Market Data (L2)        | 4000 |
| Spot Market Data (L3)        | 4005 |
| Derivatives Trading          | 4003 |
| Derivatives Market Data (L2) | 4002 |
| Derivatives Market Data (L3) | 4004 |

All connections use TCP with TLS 1.3. DNS records carry a 5-minute
TTL — always resolve at connection time, never bind to static IPs.

## Authentication

Authentication uses a **Spot FIX API Key**. The same key authorises
both Spot and Derivatives sessions on the appropriate ports — no
separate Derivatives FIX credentials are required.

See [FIX authentication](/exchange/guides/fix/authentication) for the
logon message structure, IP allow-listing, and CompID provisioning.

## Hours of operation

FIX sessions operate 24/7 with a logical session rollover every day at
**22:00 UTC**. The rollover lasts approximately 30 seconds. Both
Trading and Market Data sequence numbers reset to `0` after rollover.

## Cancel scope

Single-order cancels on FIX (`OrderCancelRequest`) only affect orders
placed on the same FIX session. To cancel orders placed on another
session — whether FIX, WebSocket, or REST — use
`OrderMassCancelRequest` (Tag 35=q) or fall back to REST/WebSocket.

## Quick start

<CardGroup>
  <Card title="Logon" icon="key" href="/exchange/api-reference/unified-fix/logon">
    Session establishment and parameters.
  </Card>

  <Card title="NewOrderSingle (D)" icon="plus" href="/exchange/api-reference/unified-fix/nos">
    Place an order on Spot or Derivatives.
  </Card>

  <Card title="ExecutionReport (8)" icon="receipt" href="/exchange/api-reference/unified-fix/er">
    Order acknowledgements, fills, cancels, and rejects.
  </Card>

  <Card title="OrderMassCancelRequest (q)" icon="ban" href="/exchange/api-reference/unified-fix/omcr">
    Cancel all orders on the account, regardless of session.
  </Card>
</CardGroup>

The full message catalog — `OrderCancelRequest`, `OrderCancelReplaceRequest`,
`MarketDataRequest`, `OrderStatusRequest`, `ResendRequest`,
`SequenceReset`, headers/trailers, and reject types — is available in
the **Unified FIX** dropdown in the left navigation.

<Note>
  Access to direct colocation requires VIP status, an executed NDA, and
  an Equinix London presence. Contact your Account Manager to begin
  onboarding.
</Note>

## Related

<CardGroup>
  <Card title="FIX overview" icon="terminal" href="/exchange/guides/fix/introduction">
    Session architecture, supported messages, performance, ports.
  </Card>

  <Card title="FIX authentication" icon="key" href="/exchange/guides/fix/authentication">
    Logon message and CompID setup.
  </Card>

  <Card title="Choose your protocol" icon="code-compare" href="/exchange/guides/general/api-comparison">
    REST vs WebSocket vs FIX — sequencing, cancel scope, latency.
  </Card>

  <Card title="Colocation and connectivity" icon="server" href="/exchange/guides/general/colocation">
    Connectivity tiers, latency expectations, LOA process.
  </Card>
</CardGroup>


# Execution Report
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/er

Order responses and fill notifications via FIX

<div>
  <span>FIX</span>
  <span>session: trading</span>
  <span>35=8</span>
</div>

As soon as Kraken Trading Engine accepts the order, all order responses will be sent using the Execution Report message.
This includes any fills, order status changes and confirmation of cancellation.

***

<ResponseField name="header" type="">35=`8`</ResponseField>

<ResponseField name="11 - ClOrdID" type="string">
  Unique identifier of the order.
</ResponseField>

<ResponseField name="41 - OrigClordid" type="string">
  ClOrdID of the previous action on this order.

  <span>Condition:</span> ExecType = Cancel
</ResponseField>

<ResponseField name="17 - ExecId" type="string">
  Unique identifier for each execution report message.
</ResponseField>

<ResponseField name="37 - OrderID" type="string">
  Unique order identifier generated by Kraken.
</ResponseField>

<ResponseField name="527 - SecondaryExecID" type="integer">
  Sequence number for every ExecType=Trade. This ID is unique by pair.

  <span>Condition:</span> ExecType = Trade
</ResponseField>

<ResponseField name="60 - TransactTime" type="string">
  Time of event expressed in UTC. Format: `YYYYMMDD-HH:MM:SS.uuu`
</ResponseField>

<ResponseField name="40 - OrderType" type="char">
  The execution model of the order. For triggered orders, after the trigger the OrderType will reflect the new execution model of the order (market or limit).

  **Possible values:**

  * `1` : market
  * `2` : Limit
  * `3` : Stop-loss
  * `4` : Stop-loss-limit
  * `R` : Take-profit
  * `T` : Take-profit-limit
  * `U` : Trailing-stop
  * `V` : Trailing-stop-limit
</ResponseField>

<ResponseField name="54 - Side" type="integer">
  Side of the order.

  **Possible values:**

  * `1` : Buy
  * `2` : Sell
</ResponseField>

<ResponseField name="55 - Symbol" type="string">
  Pair in the format BASE/QUOTE.
</ResponseField>

<ResponseField name="44 - Price" type="float">
  Limit Price of the order placed in the Order Book. This field is denominated in Quote Currency.

  <span>Condition:</span> OrderType = Limit / Stop-Loss-Limit / Take-Profit-Limit / Trailing-stop-limit
</ResponseField>

<ResponseField name="99 - StopPx" type="float">
  Stop Price for a Stop-Loss / Take-Profit / Stop-Loss-Limit or Take-Profit-Limit order. This field is denominated in Quote Currency.

  <span>Condition:</span> OrderType = Stop-Loss / Take-Profit / Stop-Loss-Limit / Trailing-stop / Trailing-stop-limit
</ResponseField>

<ResponseField name="31 - LastPx" type="float">
  Price of the trade.

  <span>Condition:</span> ExecType = Trade
</ResponseField>

<ResponseField name="6 - AvgPx" type="float">
  Avg price of all trades on the order.

  <span>Condition:</span> ExecType = Trade
</ResponseField>

<ResponseField name="1102 - TriggerPrice" type="float">
  Price that triggered for stop-loss, take-profit, stop-loss-limit, take-profit-limit, trailing\_stop or trailing\_stop\_limit. It can be different than the StopPx.
</ResponseField>

<ResponseField name="14 - CumQty" type="float">
  Total quantity filled on the order so far.
</ResponseField>

<ResponseField name="32 - LastQty" type="float">
  Quantity bought/sold on last trade.

  <span>Condition:</span> ExecType = Trade
</ResponseField>

<ResponseField name="151 - LeavesQty" type="float">
  Quantity left on the order on the Book.
</ResponseField>

<ResponseField name="38 - OrderQty" type="float">
  Size of the original order.
</ResponseField>

<ResponseField name="1138 - DisplayQty" type="float">
  Iceberg qty of the original order.
</ResponseField>

<ResponseField name="150 - ExecType" type="char">
  Describes the type of order event and determines the set of fields in the message.

  **Possible values:**

  * `0` : New — Order has been created and is live in the engine.
  * `4` : Canceled — The order has been cancelled.
  * `5` : Replace — The order has been replaced.
  * `A` : Pending New — Order request has been received and validated but the order is not live yet. Possible when EffectiveTime (Tag 168) is used on the New Order.
  * `C` : Expired — The order has expired.
  * `D` : Restated — The order has changed like a trigger event.
  * `F` : Trade — The order has received a fill.
  * `I` : Order Status — In response to an [Order Status Request](/exchange/api-reference/unified-fix/osr).
</ResponseField>

<ResponseField name="39 - OrdStatus" type="char">
  Describes the status of the order.

  **Possible values:**

  * `0` : New — Order is live in the engine with no fills.
  * `1` : Partially Filled — Order is live in the engine with fills.
  * `2` : Filled — Order is fully filled and closed.
  * `4` : Canceled — Order is cancelled and closed.
  * `5` : Replaced — Order is Replaced successfully.
  * `A` : Pending New — Order is not live yet. For example when EffectiveTime is used.
  * `C` : Expired — Order is expired and closed.
  * `E` : Pending Replace — New parameter of the replace are not live yet. For example when EffectiveTime is used or a trade was in flight during the replace request.
</ResponseField>

<ResponseField name="58 - Text" type="string">
  Full description for Cancellations or status of the order.
</ResponseField>

<ResponseField name="59 - TimeInForce" type="string">
  **Possible values:**

  * `1` : GTC (Good till canceled)
  * `3` : IOC (Immediate or Cancel)
  * `4` : FOK (Fill or Kill)
  * `6` : GTD (Good till date)
</ResponseField>

<ResponseField name="136 - NoMiscFee" type="integer">
  `1` where a fee is applicable or not present.

  <Expandable title="repeating group">
    <ResponseField name="137 - MiscFeeAmt" type="float">
      Absolute fee value present on Fill Reports. Fees are cumulative from the previous trades.
    </ResponseField>

    <ResponseField name="138 - MiscFeeCurr" type="string">
      Fee Asset.
    </ResponseField>

    <ResponseField name="139 - MiscFeeType" type="integer">
      **Possible values:**

      * `4` : Exchange Fee
    </ResponseField>

    <ResponseField name="891 - MiscFeeBasis" type="string">
      Define how the fee is charged.

      **Possible values:**

      * `2` : Percentage
    </ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="381 - GrossTradeAmt" type="float">
  Cum Cost of the Trade (CumQty × AvgPx).
</ResponseField>

<ResponseField name="118 - NetMoney" type="float">
  Cost of a Single Trade (LastQty × LastPx).
</ResponseField>

<ResponseField name="1003 - TradeID" type="string">
  Unique ID that identifies the trade at exchange.

  <span>Condition:</span> ExecType = Trade
</ResponseField>

<ResponseField name="5050 - LiquidityInd" type="string">
  Define if the trade was from a maker or taker order.

  **Possible values:**

  * `0` : Maker
  * `1` : Taker

  <span>Condition:</span> ExecType = Trade
</ResponseField>

<ResponseField name="78 - NoAllocs" type="integer">
  Number of subaccount that are part of the order. Always 1 for the broker accounts.

  <Expandable title="repeating group">
    <ResponseField name="79 - AllocAccount" type="string">
      Account ID of the Subaccount that this order is targeted to. Only available for broker accounts. Please contact your AM for further questions.
    </ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="378 - ExecRestatementReason" type="char">
  It can happen in some scenario that trades are not reported in time through the FIX API.
  In that case the FIX API will detect it and send a ExecType=Restated execution report and use ExecRestatementReason to warn the client.

  **Possible values:**

  * `3` : Repricing of Order
</ResponseField>

<ResponseField name="trailer" type="" />

<Tabs>
  <Tab title="Spot">
    <CodeGroup>
      ```text New (ExecType=0) theme={null}
      8=FIX.4.4|9=260|35=8|34=3|49=KRAKEN-TRD|56=CLIENT|52=20260407-14:32:05.122|6=0|11=1744036325000000|14=0|17=EXEC002:TRD001|37=OQNCZM-NVAVC-AVD2LO|38=0.001|39=0|40=2|44=84000|54=1|55=BTC/USD|58=buy 0.001 BTC/USD @ limit 84000|59=1|60=20260407-14:32:05.000|150=0|151=0.001|381=0|10=144|
      ```

      ```text Trade/Fill (ExecType=F) theme={null}
      8=FIX.4.4|9=307|35=8|34=5|49=KRAKEN-TRD|56=CLIENT|52=20260407-14:32:05.122|6=84000|11=1744036325000000|14=0.001|17=EXEC003:TRD001|31=84000|32=0.001|37=OQNCZM-NVAVC-AVD2LO|38=0.001|39=2|40=2|44=84000|54=1|55=BTC/USD|59=1|60=20260407-14:32:05.122|118=84|136=1|137=0.168|138=USD|139=4|150=F|151=0|381=84|1003=TRADE-001|5050=1|10=114|
      ```

      ```text Canceled (ExecType=4) theme={null}
      8=FIX.4.4|9=247|35=8|34=6|49=KRAKEN-TRD|56=CLIENT|52=20260407-14:32:05.122|6=0|11=1744036325300000|14=0|17=EXEC004:TRD001|37=OTOTN4-LJ3P7-PUMZVZ|38=0.001|39=4|40=2|44=84000|54=1|55=BTC/USD|58=Order canceled by user|59=1|60=20260407-14:32:06.000|150=4|151=0|381=0|10=244|
      ```

      ```text Replaced (ExecType=5) theme={null}
      8=FIX.4.4|9=225|35=8|34=7|49=KRAKEN-TRD|56=CLIENT|52=20260407-14:32:05.122|6=0|11=1744036325100000|14=0|17=EXEC005:TRD001|37=OQNCZM-NVAVC-AVD2LO|38=0.002|39=5|40=2|44=83500|54=1|55=BTC/USD|59=1|60=20260407-14:32:10.000|150=5|151=0.002|381=0|10=204|
      ```
    </CodeGroup>

    <Accordion title="Other states">
      <CodeGroup>
        ```text PendingNew (ExecType=A) theme={null}
        8=FIX.4.4|9=260|35=8|34=3|49=KRAKEN-TRD|56=CLIENT|52=20260407-14:32:05.122|6=0|11=1744036325000000|14=0|17=EXEC001:TRD001|37=OQNCZM-NVAVC-AVD2LO|38=0.001|39=A|40=2|44=84000|54=1|55=BTC/USD|58=buy 0.001 BTC/USD @ limit 84000|59=1|60=20260407-14:32:05.000|150=A|151=0.001|381=0|10=177|
        ```

        ```text Expired (ExecType=C) theme={null}
        8=FIX.4.4|9=242|35=8|34=9|49=KRAKEN-TRD|56=CLIENT|52=20260407-14:32:05.122|6=0|11=1744036325400000|14=0|17=EXEC007:TRD001|37=OBCDEF-GHIJK-LMNOPQ|38=0.001|39=C|40=2|44=84000|54=1|55=BTC/USD|58=GTD order expired|59=6|60=20260407-14:32:10.000|150=C|151=0|381=0|10=238|
        ```

        ```text OrderStatus (ExecType=I) theme={null}
        8=FIX.4.4|9=225|35=8|34=8|49=KRAKEN-TRD|56=CLIENT|52=20260407-14:32:05.122|6=0|11=1744036325000000|14=0|17=EXEC006:TRD001|37=OQNCZM-NVAVC-AVD2LO|38=0.001|39=0|40=2|44=84000|54=1|55=BTC/USD|59=1|60=20260407-14:32:05.000|150=I|151=0.001|381=0|10=218|
        ```
      </CodeGroup>
    </Accordion>
  </Tab>

  <Tab title="Futures">
    <CodeGroup>
      ```text New (ExecType=0) theme={null}
      8=FIX.4.4|9=315|35=8|34=3|49=KRAKEN-DRV-TRD|56=CLIENT-DRV|52=20260407-14:32:05.122|6=0|11=a17d4971-f00d-4f67-94d1-e7d604104ed2|14=0|17=6B2NDTNHRQAAA:TRD001|37=9e58120f-40e0-44dc-beec-6d1b5ea9136c|38=0.001|39=0|40=2|44=84000|54=1|55=PF_XBTUSD|58=buy 0.001 PF_XBTUSD @ limit 84000|59=1|60=20260407-14:32:05.000|150=0|151=0.001|381=0|10=179|
      ```

      ```text Trade/Fill (ExecType=F) theme={null}
      8=FIX.4.4|9=364|35=8|34=5|49=KRAKEN-DRV-TRD|56=CLIENT-DRV|52=20260407-14:32:05.122|6=84000|11=a17d4971-f00d-4f67-94d1-e7d604104ed2|14=0.001|17=6B2NDTNHRQAAB:TRD001|31=84000|32=0.001|37=9e58120f-40e0-44dc-beec-6d1b5ea9136c|38=0.001|39=2|40=2|44=84000|54=1|55=PF_XBTUSD|59=1|60=20260407-14:32:05.122|118=84|136=1|137=0.042|138=USD|139=4|150=F|151=0|381=84|1003=TRADE-FUT-001|5050=1|10=207|
      ```
    </CodeGroup>
  </Tab>
</Tabs>


# Header & Trailer
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/header-trailer

Standard FIX message header and trailer fields

<div>
  <span>FIX</span>
  <span>session: admin</span>
  <span>35=\*</span>
</div>

The baseline specification for this API is FIX 4.4. A standard header must be present at the start of every message in both directions. All messages sent in either direction should contain both **SenderCompID** and **TargetCompID**.
These values will be communicated by Kraken during the onboarding process.

## Standard Header

<ResponseField name="8 - BeginString" type="string">
  Must be `FIX.4.4`
</ResponseField>

<ResponseField name="9 - BodyLength" type="integer">
  Length of message expressed as the number of characters in the message following the BodyLength field up to, and including, the delimiter immediately preceding the checksum tag (10).
</ResponseField>

<ResponseField name="35 - MsgType" type="char">
  The message type.
</ResponseField>

<ResponseField name="34 - MsgSeqNum" type="integer">
  The sequence number for this message.
</ResponseField>

<ResponseField name="52 - SendingTime" type="string">
  Time of message transmission by the sender expressed in UTC. Format: `YYYYMMDD-HH:MM:SS.uuu`
</ResponseField>

<ResponseField name="49 - SenderCompID" type="string">
  Identifies the party sending the message.
</ResponseField>

<ResponseField name="56 - TargetCompID" type="string">
  Identifies the party receiving the message.
</ResponseField>

<ResponseField name="122 - OrigSendingTime" type="string">
  If no data is available, this value is set to the SendingTime value. Format: `YYYYMMDD-HH:MM:SS.uuu`

  <span>Condition:</span> Required for retransmission of message
</ResponseField>

<ResponseField name="43 - PossDupFlag" type="boolean">
  Indicates possible retransmission of message with this sequence number.
</ResponseField>

***

## Standard Trailer

<ResponseField name="10 - Checksum" type="string">
  Always the last field in a FIX message.
</ResponseField>


# Logon
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/logon

Authenticate and establish a FIX session

<div>
  <span>FIX</span>
  <span>session: admin</span>
  <span>35=A</span>
</div>

The Logon message (`35=A`) must be the **first message** sent after establishing the TCP connection. It authenticates the session and sets session-level parameters.

If logon succeeds, Kraken responds with a Logon message. If it fails, Kraken sends a Logout with a reason, or silently closes the connection.

<Warning>
  All FIX connections require **TLS**. The server rejects plain TCP connections with a TLS alert. Use `TLSv1.2` or higher. Certificate verification can be skipped for UAT; use full verification in production.
</Warning>

***

## Session Types

Kraken FIX offers two session types that use **different TargetCompIDs** and have different authentication requirements:

|                             | Market Data                           | Trading                           |
| --------------------------- | ------------------------------------- | --------------------------------- |
| **TargetCompID (56)**       | `KRAKEN-MD`                           | `KRAKEN-TRD`                      |
| **Authentication required** | No                                    | Yes (API Key + Password)          |
| **Fields 553, 554, 5025**   | Not required                          | Required                          |
| **Purpose**                 | Subscribe to order book, trades, OHLC | Place/cancel orders, account data |

<Info>
  Spot and Derivatives use separate SenderCompIDs. Your Derivatives SenderCompID will have a `DRV` suffix. Both are provided by Kraken during onboarding.
</Info>

***

## Fields

<ResponseField name="header" type="">35=`A`</ResponseField>

<ResponseField name="98 - EncryptMethod" type="integer">
  Always set to `0` (None).
</ResponseField>

<ResponseField name="108 - HeartBtInt" type="integer">
  Heartbeat interval in seconds. Recommended value: `60`.
</ResponseField>

<ResponseField name="553 - UserName" type="string">
  Your FIX API Key. Create it in [Kraken Pro settings](https://pro.kraken.com/app/settings/api) with **FIX** as the key type.

  <span>Condition:</span> Trading session only
</ResponseField>

<ResponseField name="554 - Password" type="string">
  HMAC-SHA512 signature. See [Password Generation](#password-generation) below.

  <span>Condition:</span> Trading session only
</ResponseField>

<ResponseField name="5025 - Nonce" type="string">
  Current timestamp in milliseconds since Unix epoch, as a string.

  <Warning>
    The nonce must be within **±5 seconds** of Kraken's server time. Clock drift is the most common cause of logon failures. Use NTP to keep your system clock in sync.
  </Warning>

  <span>Condition:</span> Trading session only
</ResponseField>

<ResponseField name="109 - ClientID" type="integer">
  Associates this connection with another connection (e.g. linking a trading session to a market data session).
</ResponseField>

<ResponseField name="141 - ResetSeqNumFlag" type="boolean">
  If `Y`, both sides reset their sequence numbers to `1`. Use on initial connect or after a session reset. Default: `N`.
</ResponseField>

<ResponseField name="8674 - CancelOrdersOnDisconnect" type="integer">
  Controls what happens to open orders if the session disconnects.

  **Possible values:**

  * `0` — Cancel all open orders placed during this session *(default)*
  * `1` — Leave open orders in place after disconnect
</ResponseField>

<ResponseField name="5030 - ForceResetClOrdID" type="boolean">
  Resets your ClOrdID sequence on re-logon. Use in emergencies only. Default: `N`.
</ResponseField>

<ResponseField name="5051 - Rebased" type="boolean">
  Applies to xStocks trading only.

  * `N` — Orders and execution reports use SPV token quantities *(default)*
  * `Y` — Orders and execution reports use underlying equity quantities (Kraken applies the multiplier automatically)
</ResponseField>

<ResponseField name="trailer" type="" />

***

## Password Generation

The password is computed as:

```
base64( HMAC-SHA512( base64decode(API_Secret), SHA256(MessageInput + Nonce) ) )
```

**MessageInput** is the concatenation of these fields using the FIX separator (SOH = `\x01`):

```
35=A  +SOH+  34=<MsgSeqNum>  +SOH+  49=<SenderCompID>  +SOH+  56=KRAKEN-TRD  +SOH+  553=<API_Key>  +SOH
```

<Warning>
  The API Secret must be **base64-decoded** before use as the HMAC key.
</Warning>

Both the `Nonce` (tag 5025) and the value used in `MessageInput` must be **identical**. Generate nonce once and use it in both places.

<CodeGroup>
  ```python Python theme={null}
  import base64
  import hashlib
  import hmac
  import time

  SOH = "\x01"

  def get_password(msg_seq_num: str, sender_comp_id: str, api_key: str, api_secret: str):
      nonce = str(int(time.time() * 1000))

      message_input = (
          f"35=A{SOH}"
          f"34={msg_seq_num}{SOH}"
          f"49={sender_comp_id}{SOH}"
          f"56=KRAKEN-TRD{SOH}"
          f"553={api_key}{SOH}"
      )

      sha256_hash = hashlib.sha256((message_input + nonce).encode("utf-8")).digest()
      hmac_hash = hmac.new(base64.b64decode(api_secret), sha256_hash, hashlib.sha512)
      password = base64.b64encode(hmac_hash.digest()).decode("utf-8")

      return password, nonce
  ```

  ```javascript Node.js theme={null}
  const crypto = require('crypto');

  const SOH = '\x01';

  function getPassword(msgSeqNum, senderCompId, apiKey, apiSecret) {
    const nonce = Date.now().toString();

    const messageInput =
      `35=A${SOH}` +
      `34=${msgSeqNum}${SOH}` +
      `49=${senderCompId}${SOH}` +
      `56=KRAKEN-TRD${SOH}` +
      `553=${apiKey}${SOH}`;

    const sha256Hash = crypto
      .createHash('sha256')
      .update(messageInput + nonce, 'utf8')
      .digest();

    const password = crypto
      .createHmac('sha512', Buffer.from(apiSecret, 'base64'))
      .update(sha256Hash)
      .digest('base64');

    return { password, nonce };
  }
  ```

  ```java Java theme={null}
  import javax.crypto.Mac;
  import javax.crypto.spec.SecretKeySpec;
  import java.security.MessageDigest;
  import java.util.Base64;

  public class FIXAuth {
      private static final char SOH = '\u0001';

      public static String[] getPassword(
              String msgSeqNum, String senderCompId,
              String apiKey, String apiSecret) throws Exception {

          String nonce = String.valueOf(System.currentTimeMillis());

          String messageInput =
              "35=A" + SOH +
              "34=" + msgSeqNum + SOH +
              "49=" + senderCompId + SOH +
              "56=KRAKEN-TRD" + SOH +
              "553=" + apiKey + SOH;

          byte[] sha256Hash = MessageDigest
              .getInstance("SHA-256")
              .digest((messageInput + nonce).getBytes("UTF-8"));

          Mac hmac = Mac.getInstance("HmacSHA512");
          hmac.init(new SecretKeySpec(Base64.getDecoder().decode(apiSecret), "HmacSHA512"));
          String password = Base64.getEncoder().encodeToString(hmac.doFinal(sha256Hash));

          return new String[]{ password, nonce };
      }
  }
  ```

  ```go Go theme={null}
  package main

  import (
  	"crypto/hmac"
  	"crypto/sha256"
  	"crypto/sha512"
  	"encoding/base64"
  	"fmt"
  	"strconv"
  	"time"
  )

  const SOH = "\x01"

  func getPassword(msgSeqNum, senderCompID, apiKey, apiSecret string) (password, nonce string, err error) {
  	nonce = strconv.FormatInt(time.Now().UnixMilli(), 10)

  	messageInput :=
  		"35=A" + SOH +
  		"34=" + msgSeqNum + SOH +
  		"49=" + senderCompID + SOH +
  		"56=KRAKEN-TRD" + SOH +
  		"553=" + apiKey + SOH

  	sha256Hash := sha256.Sum256([]byte(messageInput + nonce))

  	secretBytes, err := base64.StdEncoding.DecodeString(apiSecret)
  	if err != nil {
  		return "", "", fmt.Errorf("failed to decode API secret: %w", err)
  	}

  	mac := hmac.New(sha512.New, secretBytes)
  	mac.Write(sha256Hash[:])
  	password = base64.StdEncoding.EncodeToString(mac.Sum(nil))

  	return password, nonce, nil
  }
  ```

  ```csharp C# theme={null}
  using System;
  using System.Security.Cryptography;
  using System.Text;

  public static class FIXAuth
  {
      private const char SOH = '\x01';

      public static (string Password, string Nonce) GetPassword(
          string msgSeqNum, string senderCompId,
          string apiKey, string apiSecret)
      {
          string nonce = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();

          string messageInput =
              $"35=A{SOH}" +
              $"34={msgSeqNum}{SOH}" +
              $"49={senderCompId}{SOH}" +
              $"56=KRAKEN-TRD{SOH}" +
              $"553={apiKey}{SOH}";

          byte[] sha256Hash = SHA256.HashData(Encoding.UTF8.GetBytes(messageInput + nonce));

          using var hmac = new HMACSHA512(Convert.FromBase64String(apiSecret));
          string password = Convert.ToBase64String(hmac.ComputeHash(sha256Hash));

          return (password, nonce);
      }
  }
  ```
</CodeGroup>

***

## Message Examples

<CodeGroup>
  ```text Spot MD Logon (client → server) theme={null}
  8=FIX.4.4|9=76|35=A|34=1|49=CLIENT|56=KRAKEN-MD|52=20260407-14:32:01.000|98=0|108=30|141=Y|10=089|
  ```

  ```text Spot TRD Logon (client → server) theme={null}
  8=FIX.4.4|9=77|35=A|34=1|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:01.000|98=0|108=30|141=Y|10=179|
  ```

  ```text Spot TRD Logon Ack (server → client) theme={null}
  8=FIX.4.4|9=77|35=A|34=1|49=KRAKEN-TRD|56=CLIENT|52=20260407-14:32:01.000|98=0|108=30|141=Y|10=179|
  ```

  ```text Futures TRD Logon (client → server) theme={null}
  8=FIX.4.4|9=85|35=A|34=1|49=CLIENT-DRV|56=KRAKEN-DRV-TRD|52=20260407-14:32:01.000|98=0|108=30|141=Y|10=228|
  ```

  ```text Futures TRD Logon Ack (server → client) theme={null}
  8=FIX.4.4|9=85|35=A|34=1|49=KRAKEN-DRV-TRD|56=CLIENT-DRV|52=20260407-14:32:01.000|98=0|108=30|141=Y|10=228|
  ```
</CodeGroup>


# Logout
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/logout

Terminate a FIX session

<div>
  <span>FIX</span>
  <span>session: admin</span>
  <span>35=5</span>
</div>

The Logout message initiates or confirms the termination of a FIX session. Disconnection without the exchange of logout messages will be interpreted as an abnormal condition.
Before actually closing the session, the logout initiator must wait for the opposite side to respond with a confirming logout message. Abnormal disconnection without logout will activate cancel-on-disconnect on the session.

***

<ResponseField name="header" type="">35=`5`</ResponseField>

<ResponseField name="58 - Text" type="string">
  Reason for the logout. This will be used to explain why a logon failed.
</ResponseField>

<ResponseField name="trailer" type="" />

<CodeGroup>
  ```text Client-initiated Logout (client → server) theme={null}
  8=FIX.4.4|9=60|35=5|34=10|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:10.000|10=137|
  ```

  ```text Server Confirms Logout (server → client) theme={null}
  8=FIX.4.4|9=59|35=5|34=8|49=KRAKEN-TRD|56=CLIENT|52=20260407-14:32:10.000|10=104|
  ```

  ```text Server-initiated Logout — Auth Failure (server → client) theme={null}
  8=FIX.4.4|9=96|35=5|34=2|49=KRAKEN-TRD|56=CLIENT|52=20260407-14:32:01.000|58=Logon failed: invalid credentials|10=129|
  ```
</CodeGroup>


# Market Data Incremental Refresh
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/mdir

Incremental order book and trade updates via FIX

<div>
  <span>FIX</span>
  <span>session: market-data</span>
  <span>35=X</span>
</div>

Incremental updates to the order book and trades following a [Market Data Snapshot Full Refresh](/exchange/api-reference/unified-fix/mdsfr).

***

<ResponseField name="header" type="">35=`X`</ResponseField>

<ResponseField name="262 - MDReqID" type="string">
  Unique request identifier.
</ResponseField>

<ResponseField name="55 - Symbol" type="string">
  Asset Pair listed on the exchange.
</ResponseField>

<ResponseField name="268 - NoMDEntries" type="integer">
  Number of entries following. If several entries are present they need to be parsed in order (for example creation and deletion of an entry in the book can happen in the same message).

  <Expandable title="repeating group">
    <ResponseField name="279 - MDUpdateAction" type="integer">
      Always first field in this repeating group.

      **Possible values:**

      * `0` : New — Creation of an entry in the book
      * `1` : Update — Update of a quantity for an entry in the book
      * `2` : Delete — Removal of an entry from the subscribed depth (tag `271` greater than 0) or from the book entirely (tag `271=0`, cancelled or filled)
    </ResponseField>

    <ResponseField name="269 - MDEntryType" type="integer">
      **Possible values:**

      * `0` : Bid
      * `1` : Offer
      * `2` : Trade
    </ResponseField>

    <ResponseField name="278 - MDEntryID" type="string">
      Unique identifier for this market data entry. Corresponding to the OrderID for Level 3 subscription.
    </ResponseField>

    <ResponseField name="270 - MDEntryPx" type="float">
      Price of the market data entry.
    </ResponseField>

    <ResponseField name="271 - MDEntrySize" type="float">
      Volume represented by the market data entry.
    </ResponseField>

    <ResponseField name="273 - MDEntryTime" type="string">
      The time the entry was inserted or amended or deleted.
    </ResponseField>

    <ResponseField name="5060 - MDEntryTimestamp" type="string">
      High-precision event time for this market data update.
      **Level 3 only.** When present with 5273, 5060 is the time the update was generated; 5273 is the queue entry time.
      Sample format: `2026-02-03T10:24:34.650069468Z` (ISO 8601, nanosecond fractional seconds, UTC).
    </ResponseField>

    <ResponseField name="5273 - MDEntryTimeQueue" type="string">
      Queue entry time: when the order entered the book at this price level.
      **Level 3 only.** For L3, orders at the same price are ordered by this tag.
      Sample format: `2026-02-03T10:24:29.175114502Z` (ISO 8601, nanosecond fractional seconds, UTC).
    </ResponseField>

    <ResponseField name="40 - OrdType" type="char">
      The order type of the taker order.

      **Possible values:**

      * `1` : market
      * `2` : Limit

      <span>Condition:</span> MDEntryType = Trade
    </ResponseField>

    <ResponseField name="2446 - AggressorSide" type="char">
      The side of the taker order.

      **Possible values:**

      * `1` : Buy
      * `2` : Sell

      <span>Condition:</span> MDEntryType = Trade
    </ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="5041 - ChecksumOrderBook" type="string">
  Checksum to verify the orderbook update. See [Checksum article](/exchange/guides/fix/checksums).

  <span>Condition:</span> MDEntryType = Bid or Offer
</ResponseField>

<ResponseField name="trailer" type="" />

<CodeGroup>
  ```text Spot L2 Example theme={null}
  8=FIX.4.4|9=213|35=X|34=100|56=MYCOMPID|49=KRAKEN-MD|52=20230707-13:42:27.230|55=BTC/USD|262=1|268=2|279=2|269=1|278=O30300.7|270=30300.7|271=0.0|273=13:42:27.208|279=0|269=1|278=O31941.0|270=31941.0|271=0.0031746|273=20:40:00.455|10=112|
  ```

  ```text Futures L2 Example theme={null}
  8=FIX.4.4|9=173|35=X|34=33402|49=KRAKEN-DRV-MD|52=20250303-14:13:24.905|56=MYCOMPID_DRV|55=PF_ETHUSD|262=1|268=1|279=0|269=0|278=B2372.7|270=2372.7|271=0.084|273=14:13:24.859|5041=3254665545|10=121|
  ```

  ```text Futures L3 Example theme={null}
  8=FIX.4.4|9=198|35=X|34=7|49=KRAKEN-DRV-MD|52=20250304-15:25:09.913|56=MYCOMPID_DRV|55=PF_ETHUSD|262=1|268=1|279=2|269=1|278=00bf007e-0039-00dd-0071-00ae00d700c8|270=2044.8|271=2.874|273=15:25:09.844|5041=3889519115|10=012|
  ```
</CodeGroup>


# Market Data Request
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/mdr

Subscribe to market data streams via FIX

<div>
  <span>FIX</span>
  <span>session: market-data</span>
  <span>35=V</span>
</div>

The MarketDataRequest message is used by the client system to request a market data stream for the order book and/or trades.

In response, the FIX Server will begin sending out a [MarketDataSnapshot](/exchange/api-reference/unified-fix/mdsfr) if it is a valid request. Otherwise, the FIX Server will send out a [MarketDataRequestReject](/exchange/api-reference/unified-fix/mdrr) with the Text tag containing the reason for the rejection.

Each subscription request needs to have a unique identifier set via tag MDReqID, which will be used to refer back to the client. It is also used to unsubscribe from market data.

Market data updates are sent to clients using a [MarketDataSnapshotFullRefresh](/exchange/api-reference/unified-fix/mdsfr) message and then [MarketDataIncrementalRefresh](/exchange/api-reference/unified-fix/mdir) message. A full empty market data snapshot may be sent in case no more prices are received.
These prices will stream continuously until the client requests to unsubscribe using a MarketDataRequest with the SubscriptionRequestType set to Unsubscribe (263=2).

For the OrderBook, the client can request Level 2 or Level 3 depending on the value of the AggregatedBook tag.

In case of a disconnection, the subscription will be cancelled. The Client will need to subscribe again after the reconnection.

***

<ResponseField name="header" type="">35=`V`</ResponseField>

<ResponseField name="262 - MDReqID" type="string">
  Unique request identifier.
</ResponseField>

<ResponseField name="263 - SubscriptionRequestType" type="integer">
  **Possible values:**

  * `1` : Snapshot + Updates
  * `2` : Disable previous snapshot + Update request
</ResponseField>

<ResponseField name="264 - MarketDepth" type="integer">
  **Possible values:**

  * `0` : Full depth of book (limited to 1000 for Level 2)
  * `1` : Top of Book
  * `10`, `25`, `100`, `500` and `1000`
</ResponseField>

<ResponseField name="265 - MDUpdateType" type="integer">
  **Possible values:**

  * `1` : Incremental Refresh

  Only incremental Refresh is supported.
</ResponseField>

<ResponseField name="266 - AggregatedBook" type="boolean">
  Specify if the request is for Level 2 or Level 3.

  **Possible values:**

  * `Y` : one book entry per side per price. Aka Level 2.
  * `N` : Multiple entries per side per price allowed. Aka Level 3. Only Available for Derivatives.

  **Default value:** `Y`

  Level 3 is only available for MDEntryType BID and OFFER. Request will get rejected if used with MDEntryType TRADE.
</ResponseField>

<ResponseField name="267 - NoMDEntryTypes" type="integer">
  Repeating Group. Number of MDEntryTypes.

  <Expandable title="repeating group">
    <ResponseField name="269 - MDEntryType" type="integer">
      Client can subscribe to bid/offer and/or trades. It is not possible to subscribe to only bid or only offer.

      **Possible values:**

      * `0` : Bid
      * `1` : Offer
      * `2` : Trade
    </ResponseField>

    <ResponseField name="146 - NoRelatedSym" type="integer">
      Number of pairs to subscribe to.

      <Expandable title="repeating group">
        <ResponseField name="55 - Symbol" type="string">
          Asset Pair listed on the exchange.
        </ResponseField>
      </Expandable>
    </ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="trailer" type="" />

<CodeGroup>
  ```text Spot Subscribe BTC/USD L2 (bid+ask, depth 10) theme={null}
  8=FIX.4.4|9=117|35=V|34=2|49=CLIENT|56=KRAKEN-MD|52=20260407-14:32:01.000|262=MDSUB1|263=1|264=10|265=1|267=2|269=0|269=1|55=BTC/USD|10=244|
  ```

  ```text Spot Unsubscribe theme={null}
  8=FIX.4.4|9=111|35=V|34=3|49=CLIENT|56=KRAKEN-MD|52=20260407-14:32:10.000|262=MDSUB1|263=2|264=10|265=1|267=1|269=0|55=BTC/USD|10=223|
  ```

  ```text Futures L2 Subscribe theme={null}
  8=FIX.4.4|9=133|35=V|34=2|49=CLIENT-DRV|56=KRAKEN-DRV-MD|52=20260407-14:32:01.000|146=1|55=PF_ETHUSD|262=MDSUB2|263=1|264=0|265=1|267=3|269=0|269=1|269=2|10=197|
  ```

  ```text Futures L3 Subscribe theme={null}
  8=FIX.4.4|9=133|35=V|34=3|49=CLIENT-DRV|56=KRAKEN-DRV-MD|52=20260407-14:32:01.000|146=1|55=PF_ETHUSD|262=MDSUB3|263=1|264=0|265=1|266=N|267=2|269=0|269=1|10=121|
  ```
</CodeGroup>


# Market Data Request Reject
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/mdrr

Rejection of a market data subscription request via FIX

<div>
  <span>FIX</span>
  <span>session: market-data</span>
  <span>35=Y</span>
</div>

When a [Market Data Request](/exchange/api-reference/unified-fix/mdr) cannot be honored, the FIX Server responds with this reject message.

***

<ResponseField name="header" type="">35=`Y`</ResponseField>

<ResponseField name="262 - MDReqID" type="string">
  Unique request identifier.
</ResponseField>

<ResponseField name="281 - MDReqRejReason" type="integer">
  **Possible values:**

  * `0` : Unknown Symbol
  * `1` : Duplicate MDReqID
  * `4` : Unsupported SubscriptionRequestType
  * `5` : Unsupported MarketDepth
  * `6` : Unsupported MDUpdateType
  * `8` : Unsupported MDEntryType
  * `A` : Unsupported Scope
  * `B` : Level3 not available
  * `C` : Trade not available on this request
</ResponseField>

<ResponseField name="58 - Text" type="string">
  Full description for rejection.
</ResponseField>

<ResponseField name="trailer" type="" />

<CodeGroup>
  ```text Unknown Symbol (MDReqRejReason=0) theme={null}
  8=FIX.4.4|9=102|35=Y|34=3|49=KRAKEN-MD|56=CLIENT|52=20260407-14:32:01.000|262=MDSUB1|281=0|58=Unknown symbol: FOO/BAR|10=115|
  ```

  ```text Duplicate MDReqID (MDReqRejReason=1) theme={null}
  8=FIX.4.4|9=96|35=Y|34=4|49=KRAKEN-MD|56=CLIENT|52=20260407-14:32:01.000|262=MDSUB1|281=1|58=Duplicate MDReqID|10=106|
  ```

  ```text Unsupported Market Depth (MDReqRejReason=5) theme={null}
  8=FIX.4.4|9=108|35=Y|34=5|49=KRAKEN-MD|56=CLIENT|52=20260407-14:32:01.000|262=MDSUB2|281=5|58=Unsupported market depth: 100|10=006|
  ```
</CodeGroup>


# Market Data Snapshot Full Refresh
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/mdsfr

Full order book snapshot via FIX

<div>
  <span>FIX</span>
  <span>session: market-data</span>
  <span>35=W</span>
</div>

The initial response to a valid [Market Data Request](/exchange/api-reference/unified-fix/mdr) containing the full order book snapshot.

***

<ResponseField name="header" type="">35=`W`</ResponseField>

<ResponseField name="262 - MDReqID" type="string">
  Unique request identifier.
</ResponseField>

<ResponseField name="55 - Symbol" type="string">
  Asset Pair listed on the exchange.
</ResponseField>

<ResponseField name="268 - NoMDEntries" type="integer">
  Number of entries following.

  <Expandable title="repeating group">
    <ResponseField name="269 - MDEntryType" type="integer">
      **Possible values:**

      * `0` : Bid
      * `1` : Offer

      Trades will only be transmitted via [Market Data Incremental Refresh](/exchange/api-reference/unified-fix/mdir) messages.
    </ResponseField>

    <ResponseField name="278 - MDEntryID" type="string">
      Unique identifier for this market data entry. OrderID for the Level 3 subscription.
    </ResponseField>

    <ResponseField name="270 - MDEntryPx" type="float">
      Price of the market data entry.
    </ResponseField>

    <ResponseField name="271 - MDEntrySize" type="float">
      Volume represented by the market data entry.
    </ResponseField>

    <ResponseField name="273 - MDEntryTime" type="string">
      Time of market data entry.
    </ResponseField>

    <ResponseField name="5060 - MDEntryTimestamp" type="string">
      High-precision event time for this market data update.
      **Level 3 only.** When present with 5273, 5060 is the time the update was generated; 5273 is the queue entry time.
      Sample format: `2026-02-03T10:24:34.650069468Z` (ISO 8601, nanosecond fractional seconds, UTC).
    </ResponseField>

    <ResponseField name="5273 - MDEntryTimeQueue" type="string">
      Queue entry time: when the order entered the book at this price level.
      **Level 3 only.** For L3, orders at the same price are ordered by this tag.
      Sample format: `2026-02-03T10:24:29.175114502Z` (ISO 8601, nanosecond fractional seconds, UTC).
    </ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="trailer" type="" />

<CodeGroup>
  ```text Spot L2 Example theme={null}
  8=FIX.4.4|9=208|35=W|34=21|49=KRAKEN-MD|52=20230707-13:49:11.245|56=MYCOMPID|55=BTC/USD|262=3|268=2|269=1|278=O30300.0|270=30300.0|271=8.44867022|273=13:49:07.307|269=0|278=B30299.9|270=30299.9|271=0.67373926|273=13:49:10.179|10=254|
  ```

  ```text Futures L3 Example theme={null}
  8=FIX.4.4|9=87775|35=W|34=2|49=KRAKEN-DRV-MD|52=20250304-15:25:09.911|56=MYCOMPID_DRV|55=PF_ETHUSD|262=1|268=10|269=1|278=00bf00ff-00bb-00f7-00ed-006f007f00de|270=2043.1|271=2.05|273=15:25:09.883|269=1|278=009e005a-00b9-0035-00ff-009e00ce007e|270=2043.9|271=2.05|273=15:25:09.767|...|10=000|
  ```
</CodeGroup>


# New Order Single
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/nos

Submit a new order via FIX

<div>
  <span>FIX</span>
  <span>session: trading</span>
  <span>35=D</span>
</div>

To submit a new order, the client needs to send a NewOrderSingle message. All orders are submitted from the client's perspective to Kraken exchange to place bid/offer on the Kraken Order book.
A range of order types, Time-In-Force (TIF) and order flags can be specified by the parameters below.

The supported order types are:

* `market`: The full order quantity executes immediately at the best available price in the order book.
* `limit`: The full order quantity is placed immediately with a limit price restriction to only trade at this price or better.
* `stop-loss`: A market order is triggered when the reference price reaches the stop price (from an unfavourable direction).
* `stop-loss-limit`: A limit order is triggered when the reference price reaches the stop price (from an unfavourable direction).
* `take-profit`: A market order is triggered when the reference price reaches the stop price (from a favourable direction).
* `take-profit-limit`: A limit order is triggered when the reference price reaches the stop price (from a favourable direction).
* `trailing-stop`: A market order is triggered when the market reverts a specified distance from the peak price.
* `trailing-stop-limit`: A limit order is triggered when the market reverts a specified distance from the peak price.

***

<ResponseField name="header" type="">35=`D`</ResponseField>

<ResponseField name="11 - ClOrdID" type="string">
  Unique identifier of the order. The ID can be one of the following formats:

  * **Ever-Increasing Positive Numbers**: Ever-increasing positive numbers, such as microsecond timestamps, to ensure the uniqueness and sequential nature of the identifiers. (Spot only)
    **Example**: Using the current microsecond timestamp as the ClOrdID, such as `1623448294234000` (Max 18 characters)
  * **Timestamp-First v4 UUIDs** (required for Futures, supported for Spot): A COMB UUID where the first 48 bits (first two UUID fields) encode the current timestamp in **10-microsecond units** since the Unix epoch. Example: `a17d49af-1186-4984-bd10-29b8f232ee4d`, where `a17d49af-1186` encodes the timestamp `177559467882990` (= 10-μs units for a given moment). The server validates that this timestamp is within 120 seconds of server time.
</ResponseField>

<ResponseField name="40 - OrderType" type="char">
  The execution model of the order.

  **Possible values:**

  * `1` : market
  * `2` : Limit
  * `3` : Stop-loss
  * `4` : Stop-loss-limit
  * `R` : Take-profit
  * `T` : Take-profit-limit
  * `U` : Trailing-stop
  * `V` : Trailing-stop-limit (Spot only)
</ResponseField>

<ResponseField name="44 - Price" type="float">
  Limit Price of the order to be placed in the Order Book. This field is denominated in Quote Currency.

  <span>Condition:</span> OrderType = Limit / Stop-Loss-Limit / Take-Profit-Limit / Trailing-stop-limit
</ResponseField>

<ResponseField name="38 - OrderQty" type="float">
  Order quantity in terms of the base asset.
</ResponseField>

<ResponseField name="1138 - DisplayQty" type="float">
  Iceberg qty. This will indicate the Qty to show on the book.
  Only possible on Limit order. The Minimum value is 1 / 15 of order\_qty. (Spot only)
</ResponseField>

<ResponseField name="54 - Side" type="integer">
  Side of the order.

  **Possible values:**

  * `1` : Buy
  * `2` : Sell
</ResponseField>

<ResponseField name="55 - Symbol" type="string">
  Pair in the format BASE/QUOTE.
</ResponseField>

<ResponseField name="59 - TimeInForce" type="string">
  Time-in-force specifies how long an order remains in effect before being expired.

  **Possible values:**

  * `1` : GTC (Good till canceled)
  * `3` : IOC (Immediate or Cancel)
  * `4` : FOK (Fill or Kill) — The order must be filled in its entirety immediately or canceled entirely. (Spot only)
  * `6` : GTD (Good till date) - (Spot only)
</ResponseField>

<ResponseField name="60 - TransactTime" type="string">
  Time of order creation expressed in UTC. Format: `YYYYMMDD-HH:MM:SS.uuu`
</ResponseField>

<ResponseField name="126 - ExpireTime" type="string">
  Expiration of the Order if not fully filled before it. Expressed in UTC. GTD orders can have an expiry time up to one month in future. (Spot only) Format: `YYYYMMDD-HH:MM:SS`

  <span>Condition:</span> TimeInForce = GTD
</ResponseField>

<ResponseField name="168 - EffectiveTime" type="string">
  Scheduled start time on the order expressed in UTC. The order won't be visible on the book and won't match before that time. (Spot only)
</ResponseField>

<ResponseField name="18 - ExecInst" type="char">
  If more than one instruction is applicable to an order, this field may contain multiple instructions separated by space.

  **Possible values:**

  * `E` : Reduce-Only — Reduces an existing margin position without opening an opposite long or short position worth more than the current value of your leveraged assets.
  * `P` : Post-Only — Cancels the order if it will take liquidity on arrival. Post only orders will always be posted passively in the book.
  * `v` : viqc — OrderQty (tag 38) expressed in quote currency. (Spot only)
  * `f` : Cumulative fee in base currency — base is the default for sell orders. (Spot only)
  * `q` : Cumulative fee in quote currency — quote is the default for buy orders. (Spot only)
  * `s` : Single fee — Mandatory and only supported fee option for derivatives — fee sent on the execution report are based on the trade.
</ResponseField>

<ResponseField name="99 - StopPx" type="float">
  Defines the trigger price of the order. This field is denominated in Quote Currency.

  <span>Condition:</span> OrderType = Stop-Loss / Take-Profit / Stop-Loss-Limit / Trailing-stop / Trailing-stop-limit
</ResponseField>

<ResponseField name="388 - DiscretionInst" type="integer">
  The reference price to track for triggering orders.

  **Possible values:**

  * `1` : Related to index price
  * `5` : Related to last trade price

  **Default value:** `5`
</ResponseField>

<ResponseField name="5001 - Leverage" type="string">
  Use margin account for the order funding. (Spot only)

  **Possible values:**

  * `0` : Margin disabled
  * `1` : Margin enabled

  **Default value:** `0`
</ResponseField>

<ResponseField name="7928 - SelfTradePrevention" type="integer">
  Self Trade Prevention (STP) is a protection feature to prevent users from inadvertently or deliberately trading against themselves.
  To prevent a self-match, one of the following STP modes can be used to define which order(s) will be expired. (Spot only)

  **Possible values:**

  * `0` : Cancel both — both arriving and resting orders will be canceled.
  * `1` : Cancel Newest — arriving order will be canceled.
  * `2` : Cancel Oldest — resting order will be canceled.

  **Default value:** `1`
</ResponseField>

<ResponseField name="78 - NoAllocs" type="integer">
  Number of subaccount that are part of the order. Always 1 for the broker accounts.

  <Expandable title="repeating group">
    <ResponseField name="79 - AllocAccount" type="string">
      Account ID of the Subaccount that this order is targeted to. Only available for Broker accounts. Please contact your AM for further questions.
    </ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="62 - ValidUntilTime" type="string">
  The engine will reject any order entered into the matching engine after this time. This provides extra protection against latency on time sensitive orders. The timestamp should be at least 2 seconds and at most 60 seconds in the future. Format: `YYYYMMDD-HH:MM:SS.uuu`
</ResponseField>

<ResponseField name="trailer" type="" />

***

<Note>
  **Order Validation** — Kraken will validate each order it receives by checking that the user sent all the required FIX fields for the order.

  * FIX field level validation will result in [session level reject](/exchange/api-reference/unified-fix/reject-session).
  * Business rule validation failures will result in rejection in the form of a [business level reject](/exchange/api-reference/unified-fix/reject-business).
  * Once the order is accepted and Acked, any further business rule validations will result in an [execution report](/exchange/api-reference/unified-fix/er) with an unsolicited cancel status.
</Note>

<Tabs>
  <Tab title="Spot">
    <CodeGroup>
      ```text Limit (GTC) theme={null}
      8=FIX.4.4|9=148|35=D|34=2|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:05.000|11=1744036325000000|55=BTC/USD|54=1|40=2|44=84000|38=0.001|59=1|60=20260407-14:32:05.000|10=141|
      ```

      ```text Market theme={null}
      8=FIX.4.4|9=139|35=D|34=2|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:05.000|11=1744036325200000|55=BTC/USD|54=1|40=1|38=0.001|59=1|60=20260407-14:32:05.000|10=236|
      ```

      ```text IOC theme={null}
      8=FIX.4.4|9=148|35=D|34=2|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:05.000|11=1744036325300000|55=BTC/USD|54=1|40=2|44=84000|38=0.001|59=3|60=20260407-14:32:05.000|10=146|
      ```

      ```text FOK theme={null}
      8=FIX.4.4|9=148|35=D|34=2|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:05.000|11=1744036335000000|55=BTC/USD|54=1|40=2|44=84000|38=0.001|59=4|60=20260407-14:32:05.000|10=145|
      ```

      ```text GTD theme={null}
      8=FIX.4.4|9=170|35=D|34=2|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:05.000|11=1744036325400000|55=BTC/USD|54=1|40=2|44=84000|38=0.001|59=6|126=20260408-14:32:05|60=20260407-14:32:05.000|10=206|
      ```

      ```text Post-Only theme={null}
      8=FIX.4.4|9=153|35=D|34=2|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:05.000|11=1744036326000000|55=BTC/USD|54=1|40=2|44=83000|38=0.001|59=1|18=P|60=20260407-14:32:05.000|10=128|
      ```
    </CodeGroup>

    <Accordion title="Conditional orders">
      <CodeGroup>
        ```text Stop-Loss theme={null}
        8=FIX.4.4|9=148|35=D|34=2|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:05.000|11=1744036327000000|55=BTC/USD|54=2|40=3|99=80000|38=0.001|59=1|60=20260407-14:32:05.000|10=151|
        ```

        ```text Stop-Loss-Limit theme={null}
        8=FIX.4.4|9=157|35=D|34=2|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:05.000|11=1744036328000000|55=BTC/USD|54=2|40=4|99=80000|44=79500|38=0.001|59=1|60=20260407-14:32:05.000|10=068|
        ```

        ```text Take-Profit theme={null}
        8=FIX.4.4|9=148|35=D|34=2|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:05.000|11=1744036329000000|55=BTC/USD|54=2|40=R|99=90000|38=0.001|59=1|60=20260407-14:32:05.000|10=185|
        ```

        ```text Take-Profit-Limit theme={null}
        8=FIX.4.4|9=157|35=D|34=2|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:05.000|11=1744036330000000|55=BTC/USD|54=2|40=T|99=90000|44=90500|38=0.001|59=1|60=20260407-14:32:05.000|10=087|
        ```

        ```text Trailing-Stop theme={null}
        8=FIX.4.4|9=147|35=D|34=2|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:05.000|11=1744036331000000|55=BTC/USD|54=2|40=U|99=2000|38=0.001|59=1|60=20260407-14:32:05.000|10=125|
        ```
      </CodeGroup>
    </Accordion>

    <Accordion title="Iceberg and margin">
      <CodeGroup>
        ```text Iceberg theme={null}
        8=FIX.4.4|9=157|35=D|34=2|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:05.000|11=1744036332000000|55=BTC/USD|54=1|40=2|44=84000|38=0.15|1138=0.01|59=1|60=20260407-14:32:05.000|10=042|
        ```

        ```text Margin theme={null}
        8=FIX.4.4|9=155|35=D|34=2|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:05.000|11=1744036333000000|55=BTC/USD|54=1|40=2|44=84000|38=0.001|59=1|5001=1|60=20260407-14:32:05.000|10=191|
        ```
      </CodeGroup>
    </Accordion>
  </Tab>

  <Tab title="Futures">
    <CodeGroup>
      ```text Limit (COMB UUID + ExecInst=s) theme={null}
      8=FIX.4.4|9=183|35=D|34=2|49=CLIENT-DRV|56=KRAKEN-DRV-TRD|52=20260407-14:32:05.000|11=a17d4971-f00d-4f67-94d1-e7d604104ed2|55=PF_XBTUSD|54=1|40=2|44=84000|38=0.001|59=1|18=s|60=20260407-14:32:05.000|10=163|
      ```

      ```text Market theme={null}
      8=FIX.4.4|9=173|35=D|34=3|49=CLIENT-DRV|56=KRAKEN-DRV-TRD|52=20260407-14:32:05.000|11=a17d4972-1001-4abc-def0-1234567890ab|55=PF_ETHUSD|54=2|40=1|38=0.01|59=1|18=s|60=20260407-14:32:05.000|10=179|
      ```

      ```text Stop-Loss theme={null}
      8=FIX.4.4|9=183|35=D|34=4|49=CLIENT-DRV|56=KRAKEN-DRV-TRD|52=20260407-14:32:05.000|11=a17d4973-1001-4abc-def0-1234567890ab|55=PF_XBTUSD|54=2|40=3|99=80000|38=0.001|59=1|18=s|60=20260407-14:32:05.000|10=157|
      ```
    </CodeGroup>
  </Tab>
</Tabs>


# Order Cancel Request
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/ocr

Cancel a single order via FIX

<div>
  <span>FIX</span>
  <span>session: trading</span>
  <span>35=F</span>
</div>

Cancel a single GTD or GTC order.

A successful order cancellation will result in an [execution report](/exchange/api-reference/unified-fix/er) with the OrdStatus set to 4 (Cancelled).
Unsuccessful cancellation requests will result in a [business level reject](/exchange/api-reference/unified-fix/reject-business) message with the reason of the rejection.

***

<ResponseField name="header" type="">35=`F`</ResponseField>

<ResponseField name="11 - ClOrdID" type="string">
  Unique identifier of the order. The ID can be one of the following formats:

  * **Ever-Increasing Positive Numbers**: Ever-increasing positive numbers, such as microsecond timestamps, to ensure the uniqueness and sequential nature of the identifiers.
    **Example**: Using the current microsecond timestamp as the ClOrdID, such as `1623448294234000` (Max 18 characters)
  * **Timestamp-First v4 UUIDs**: A timestamp-first v4 UUID might look like `1b4e28ba-2fa1-11d2-883f-0016d3cca427`, where the initial part (`1b4e28ba-2fa1`) of the UUID represents the timestamp. The timestamp granularity to generate the first part needs to be 10 microseconds maximum such as `162344829423400`.
</ResponseField>

<ResponseField name="37 - OrderID" type="string">
  OrderId needs to match the one received on the ExecutionReports.

  <span>Condition:</span> One of ClOrdID or OrderID is required at least for the cancellation to be accepted
</ResponseField>

<ResponseField name="41 - OrigClordid" type="string">
  Reference the Last ClOrdID used. If both OrderID and OrigClordid are present then only the OrderID will be used.

  <span>Condition:</span> One of ClOrdID or OrderID is required at least for the cancellation to be accepted
</ResponseField>

<ResponseField name="54 - Side" type="integer">
  Side of the order.

  **Possible values:**

  * `1` : Buy
  * `2` : Sell
</ResponseField>

<ResponseField name="55 - Symbol" type="string">
  Pair in the format BASE/QUOTE.
</ResponseField>

<ResponseField name="60 - TransactTime" type="string">
  Time of order cancellation expressed in UTC. Format: `YYYYMMDD-HH:MM:SS.uuu`
</ResponseField>

<ResponseField name="trailer" type="" />

<Tabs>
  <Tab title="Spot">
    <CodeGroup>
      ```text Cancel request (client → server) theme={null}
      8=FIX.4.4|9=163|35=F|34=5|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:06.000|11=1744036325300000|37=OQNCZM-NVAVC-AVD2LO|41=1744036325000000|54=1|55=BTC/USD|60=20260407-14:32:06.000|10=111|
      ```

      ```text ER cancel response (server → client) theme={null}
      8=FIX.4.4|9=267|35=8|34=6|49=KRAKEN-TRD|56=CLIENT|52=20260407-14:32:06.000|6=0|11=1744036325300000|14=0|17=EXEC010:TRD001|37=OQNCZM-NVAVC-AVD2LO|38=0.001|39=4|40=2|41=1744036325000000|44=84000|54=1|55=BTC/USD|58=Order canceled by user|59=1|60=20260407-14:32:06.000|150=4|151=0|381=0|10=159|
      ```
    </CodeGroup>
  </Tab>

  <Tab title="Futures">
    <CodeGroup>
      ```text Cancel request (client → server) theme={null}
      8=FIX.4.4|9=230|35=F|34=5|49=CLIENT-DRV|56=KRAKEN-DRV-TRD|52=20260407-14:32:06.000|11=a17d4975-2001-4abc-def0-1234567890ab|37=9e58120f-40e0-44dc-beec-6d1b5ea9136c|41=a17d4971-f00d-4f67-94d1-e7d604104ed2|54=1|55=PF_XBTUSD|60=20260407-14:32:06.000|10=188|
      ```
    </CodeGroup>
  </Tab>
</Tabs>


# Order Cancel Replace Request
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/ocrr

Amend a working order via FIX (Spot only)

<div>
  <span>FIX</span>
  <span>session: trading</span>
  <span>35=G</span>
</div>

The Order Cancel-Replace Request message (MsgType=G) is used by the Client to amend the replaceable fields of working orders which are Quantities and Prices.
A successful order replacement request will result in an execution report with the OrdStatus.

<Note>This message is available for **Spot only**.</Note>

***

<ResponseField name="header" type="">35=`G`</ResponseField>

<ResponseField name="11 - ClOrdID" type="string">
  Unique identifier of the order. The ID can be one of the following formats:

  * **Ever-Increasing Positive Numbers**: Ever-increasing positive numbers, such as microsecond timestamps, to ensure the uniqueness and sequential nature of the identifiers.
    **Example**: Using the current microsecond timestamp as the ClOrdID, such as `1623448294234000` (Max 18 characters)
  * **Timestamp-First v4 UUIDs**: A timestamp-first v4 UUID might look like `1b4e28ba-2fa1-11d2-883f-0016d3cca427`, where the initial part (`1b4e28ba-2fa1`) of the UUID represents the timestamp. The timestamp granularity to generate the first part needs to be 10 microseconds maximum such as `162344829423400`.
</ResponseField>

<ResponseField name="37 - OrderID" type="string">
  OrderID to be amended; needs to match the one received on the ExecutionReports.
</ResponseField>

<ResponseField name="41 - OrigClordid" type="string">
  Reference the Last ClOrdID used.
</ResponseField>

<ResponseField name="54 - Side" type="integer">
  Side of the order.

  **Possible values:**

  * `1` : Buy
  * `2` : Sell
</ResponseField>

<ResponseField name="55 - Symbol" type="string">
  Pair in the format BASE/QUOTE.
</ResponseField>

<ResponseField name="60 - TransactTime" type="string">
  Time of order cancellation expressed in UTC. Format: `YYYYMMDD-HH:MM:SS.uuu`
</ResponseField>

<ResponseField name="38 - OrderQty" type="float">
  Size of the order.
</ResponseField>

<ResponseField name="1138 - DisplayQty" type="float">
  Maximum qty shown in the market at any point in time for iceberg orders.
</ResponseField>

<ResponseField name="40 - OrderType" type="char">
  The execution model of the order.

  **Possible values:**

  * `1` : market
  * `2` : Limit
  * `3` : Stop-loss
  * `4` : Stop-loss-limit
  * `R` : Take-profit
  * `T` : Take-profit-limit
  * `U` : Trailing-stop
  * `V` : Trailing-stop-limit
</ResponseField>

<ResponseField name="59 - TimeInForce" type="string">
  Time-in-force specifies how long an order remains in effect before being expired.

  **Possible values:**

  * `1` : GTC (Good till canceled)
  * `3` : IOC (Immediate or Cancel)
  * `6` : GTD (Good till date)
</ResponseField>

<ResponseField name="44 - Price" type="float">
  Limit Price of the order to be placed in the Order Book. This field is denominated in Quote Currency.

  <span>Condition:</span> OrderType = Limit / Stop-Loss-Limit / Take-Profit-Limit / Trailing-stop-limit
</ResponseField>

<ResponseField name="99 - StopPx" type="float">
  Defines the trigger price of the order. This field is denominated in Quote Currency.

  <span>Condition:</span> OrderType = Stop-Loss / Take-Profit / Stop-Loss-Limit / Trailing-stop / Trailing-stop-limit
</ResponseField>

<ResponseField name="18 - ExecInst" type="char">
  Enable clients to place order using the Post-Only safeguard.

  **Possible values:**

  * `P` : Post-Only — Cancels the order if it will take liquidity on arrival. Post only orders will always be posted passively in the book.
</ResponseField>

<ResponseField name="62 - ValidUntilTime" type="string">
  The engine will reject any order entered into the matching engine after this time. This provides extra protection against latency on time sensitive orders. The timestamp should be at least 2 seconds and at most 60 seconds in the future. Format: `YYYYMMDD-HH:MM:SS.uuu`
</ResponseField>

<ResponseField name="trailer" type="" />

<CodeGroup>
  ```text Amend Price and Qty (client → server) theme={null}
  8=FIX.4.4|9=191|35=G|34=3|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:10.000|11=1744036325100000|37=OQNCZM-NVAVC-AVD2LO|41=1744036325000000|54=1|55=BTC/USD|60=20260407-14:32:10.000|38=0.002|40=2|44=83500|59=1|10=083|
  ```

  ```text ER Replace Response (server → client) theme={null}
  8=FIX.4.4|9=245|35=8|34=7|49=KRAKEN-TRD|56=CLIENT|52=20260407-14:32:10.000|6=0|11=1744036325100000|14=0|17=EXEC011:TRD001|37=OQNCZM-NVAVC-AVD2LO|38=0.002|39=5|40=2|41=1744036325000000|44=83500|54=1|55=BTC/USD|59=1|60=20260407-14:32:10.000|150=5|151=0.002|381=0|10=136|
  ```
</CodeGroup>


# Order Mass Cancel Request
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/omcr

Cancel all open orders via FIX

<div>
  <span>FIX</span>
  <span>session: trading</span>
  <span>35=q</span>
</div>

This request is used by clients to cancel all open orders including untriggered orders and orders resting in the book.
As a response to this request, Kraken will confirm each order cancellation through [execution report](/exchange/api-reference/unified-fix/er) type canceled.

***

<ResponseField name="header" type="">35=`q`</ResponseField>

<ResponseField name="11 - ClOrdID" type="string">
  Unique identifier of the order. The ID can be one of the following formats:

  * **Ever-Increasing Positive Numbers**: Ever-increasing positive numbers, such as microsecond timestamps, to ensure the uniqueness and sequential nature of the identifiers.
    **Example**: Using the current microsecond timestamp as the ClOrdID, such as `1623448294234000` (Max 18 characters)
  * **Timestamp-First v4 UUIDs**: A timestamp-first v4 UUID might look like `1b4e28ba-2fa1-11d2-883f-0016d3cca427`, where the initial part (`1b4e28ba-2fa1`) of the UUID represents the timestamp. The timestamp granularity to generate the first part needs to be 10 microseconds maximum such as `162344829423400`.
</ResponseField>

<ResponseField name="60 - TransactTime" type="string">
  Time of order cancellation expressed in UTC. Format: `YYYYMMDD-HH:MM:SS.uuu`
</ResponseField>

<ResponseField name="530 - MassCancelRequestType" type="integer">
  **Possible values:**

  * `1` : Cancel all orders created or replaced during the trading Session by Symbol
  * `6` : Cancel all orders created or replaced during the trading Session
  * `7` : Cancel all open orders created by the SenderCompID
</ResponseField>

<ResponseField name="55 - Symbol" type="string">
  The pair in format BASE/QUOTE.

  <span>Condition:</span> MassCancelRequestType = 1
</ResponseField>

<ResponseField name="trailer" type="" />

<CodeGroup>
  ```text Cancel All Orders for a Symbol (MassCancelRequestType=1) theme={null}
  8=FIX.4.4|9=121|35=q|34=6|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:10.000|11=1744036340000000|55=BTC/USD|60=20260407-14:32:10.000|530=1|10=238|
  ```

  ```text Cancel All Session Orders (MassCancelRequestType=6) theme={null}
  8=FIX.4.4|9=110|35=q|34=7|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:10.000|11=1744036341000000|60=20260407-14:32:10.000|530=6|10=087|
  ```

  ```text Cancel All Open Orders (MassCancelRequestType=7) theme={null}
  8=FIX.4.4|9=110|35=q|34=8|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:10.000|11=1744036342000000|60=20260407-14:32:10.000|530=7|10=090|
  ```
</CodeGroup>


# Order Status Request
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/osr

Request current order status via FIX (Spot only)

<div>
  <span>FIX</span>
  <span>session: trading</span>
  <span>35=H</span>
</div>

This request is used by clients to obtain information about current order status on Kraken exchange.
As a response to this request, Order Status is sent on [execution report](/exchange/api-reference/unified-fix/er) with ExecType = `I`.
Tag 39 on this response would give away current order status.

<Note>This message is available for **Spot only**.</Note>

***

<ResponseField name="header" type="">35=`H`</ResponseField>

<ResponseField name="11 - ClOrdID" type="string">
  Unique identifier of the order. The ID can be one of the following formats:

  * **Ever-Increasing Positive Numbers**: Ever-increasing positive numbers, such as microsecond timestamps, to ensure the uniqueness and sequential nature of the identifiers.
    **Example**: Using the current microsecond timestamp as the ClOrdID, such as `1623448294234000` (Max 18 characters)
  * **Timestamp-First v4 UUIDs**: A timestamp-first v4 UUID might look like `1b4e28ba-2fa1-11d2-883f-0016d3cca427`, where the initial part (`1b4e28ba-2fa1`) of the UUID represents the timestamp. The timestamp granularity to generate the first part needs to be 10 microseconds maximum such as `162344829423400`.
</ResponseField>

<ResponseField name="37 - OrderID" type="string">
  OrderId needs to match the one received on the ExecutionReports.
</ResponseField>

<ResponseField name="55 - Symbol" type="string">
  Pair in the format BASE/QUOTE.
</ResponseField>

<ResponseField name="trailer" type="" />

<CodeGroup>
  ```text Order Status Request (client → server) theme={null}
  8=FIX.4.4|9=113|35=H|34=6|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:10.000|11=1744036325000000|37=OQNCZM-NVAVC-AVD2LO|55=BTC/USD|10=255|
  ```

  ```text ER OrderStatus Response (server → client, ExecType=I) theme={null}
  8=FIX.4.4|9=225|35=8|34=8|49=KRAKEN-TRD|56=CLIENT|52=20260407-14:32:10.000|6=0|11=1744036325000000|14=0|17=EXEC012:TRD001|37=OQNCZM-NVAVC-AVD2LO|38=0.001|39=0|40=2|44=84000|54=1|55=BTC/USD|59=1|60=20260407-14:32:05.000|150=I|151=0.001|381=0|10=206|
  ```
</CodeGroup>


# Reject - Business Level
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/reject-business

Business level message rejection via FIX

<div>
  <span>FIX</span>
  <span>session: admin</span>
  <span>35=j</span>
</div>

If Kraken needs to reject a message before it reaches the Trading engine and gets an OrderID, the order or cancellation will be rejected using a Business level reject.

***

<ResponseField name="header" type="">35=`j`</ResponseField>

<ResponseField name="45 - RefSeqNum" type="integer">
  Sequence number of the rejected message.
</ResponseField>

<ResponseField name="372 - RefMsgType" type="char">
  The MsgType `35` of the FIX message being referenced.
</ResponseField>

<ResponseField name="379 - BusinessRejectRefID" type="string">
  The value of the ClOrdID field on the message being rejected.
</ResponseField>

<ResponseField name="380 - BusinessRejectReason" type="integer">
  Code to identify reason for a Business Message Reject message.

  **Possible values:**

  * `0` : Others
  * `1` : Unknown ID
  * `2` : Unknown Instrument
  * `3` : Unsupported Message Type
  * `4` : Application not available
  * `5` : Conditionally Required Field Missing
  * `6` : Not Authorized
  * `101` : Unknown order
  * `104` : Order too old
</ResponseField>

<ResponseField name="58 - Text" type="string">
  Full description for rejection.
</ResponseField>

<ResponseField name="trailer" type="" />

<CodeGroup>
  ```text Insufficient Funds (BusinessRejectReason=0) theme={null}
  8=FIX.4.4|9=127|35=j|34=16|49=KRAKEN-TRD|56=CLIENT|52=20260407-14:32:05.122|45=0|58=EOrder:Insufficient funds|372=D|379=1744036325000000|380=0|10=080|
  ```

  ```text Order Minimum Not Met (BusinessRejectReason=0) theme={null}
  8=FIX.4.4|9=130|35=j|34=18|49=KRAKEN-TRD|56=CLIENT|52=20260407-14:32:05.000|45=0|58=EOrder:Order minimum not met|372=D|379=1744036334000000|380=0|10=015|
  ```

  ```text Unknown Order on Cancel (BusinessRejectReason=101) theme={null}
  8=FIX.4.4|9=124|35=j|34=17|49=KRAKEN-TRD|56=CLIENT|52=20260407-14:32:06.000|45=0|58=EOrder:Unknown order|372=F|379=1744036325999000|380=101|10=206|
  ```

  ```text Futures IOC — Would Enter Book (BusinessRejectReason=0) theme={null}
  8=FIX.4.4|9=150|35=j|34=10|49=KRAKEN-DRV-TRD|56=CLIENT-DRV|52=20260407-14:32:05.122|45=0|58=IOC_WOULD_ENTER_BOOK|372=D|379=a17d4971-f00d-4f67-94d1-e7d604104ed2|380=0|10=242|
  ```
</CodeGroup>


# Reject - Session Level
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/reject-session

Session level message rejection via FIX

<div>
  <span>FIX</span>
  <span>session: admin</span>
  <span>35=3</span>
</div>

Kraken will disregard any message that is garbled, cannot be parsed or fails a data integrity check. These messages will be rejected using the Session Level reject.

***

<ResponseField name="header" type="">35=`3`</ResponseField>

<ResponseField name="45 - RefSeqNum" type="integer">
  Sequence number of the rejected message.
</ResponseField>

<ResponseField name="371 - RefTagID" type="char">
  <span>Condition:</span> When rejected due to a specific tag
</ResponseField>

<ResponseField name="372 - RefMsgType" type="char">
  The MsgType `35` of the FIX message being referenced.
</ResponseField>

<ResponseField name="373 - SessionRejectReason" type="integer">
  Refer to standard FIX 4.4 documentation.
</ResponseField>

<ResponseField name="58 - Text" type="string">
  Full description for rejection.
</ResponseField>

<ResponseField name="trailer" type="" />

<CodeGroup>
  ```text Missing Mandatory Field (SessionRejectReason=1) theme={null}
  8=FIX.4.4|9=123|35=3|34=14|49=KRAKEN-TRD|56=CLIENT|52=20260407-14:32:05.122|45=12|371=54|372=D|373=1|58=Missing mandatory field: Side (54)|10=139|
  ```

  ```text Invalid Field Value (SessionRejectReason=5) theme={null}
  8=FIX.4.4|9=124|35=3|34=15|49=KRAKEN-TRD|56=CLIENT|52=20260407-14:32:05.122|45=13|371=40|372=D|373=5|58=Invalid value for tag 40: OrderType|10=042|
  ```

  ```text Futures — COMB UUID Required for ClOrdID theme={null}
  8=FIX.4.4|9=143|35=3|34=16|49=KRAKEN-DRV-TRD|56=CLIENT-DRV|52=20260407-14:32:05.122|45=3|371=11|372=D|373=5|58=COMB UUIDv4 required for ClOrdID on derivatives|10=054|
  ```
</CodeGroup>


# Resend Request
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/resend-request

Request retransmission of messages when a sequence gap is detected

<div>
  <span>FIX</span>
  <span>session: admin</span>
  <span>35=2</span>
</div>

The Resend Request message (`35=2`) is sent by either party when a sequence number gap is detected — that is, when an incoming message has a sequence number higher than expected. It requests the counterparty to retransmit all messages in the gap range.

Upon receiving a Resend Request, the counterparty should respond with either:

* The original messages with `PossDupFlag (43) = Y`, or
* A [Sequence Reset](/exchange/api-reference/unified-fix/sequence-reset) with `GapFillFlag (123) = Y` to skip messages that are no longer available (e.g. administrative messages).

***

## Fields

<ResponseField name="header" type="">35=`2`</ResponseField>

<ResponseField name="7 - BeginSeqNo" type="integer">
  First message sequence number to be retransmitted.
</ResponseField>

<ResponseField name="16 - EndSeqNo" type="integer">
  Last message sequence number to be retransmitted. Use `0` to request all messages from `BeginSeqNo` onwards (i.e. up to the current sequence).
</ResponseField>

<ResponseField name="trailer" type="" />

***

## Sequence Reset — Gap Fill

When a Resend Request is received, respond with a Sequence Reset using `GapFillFlag (123) = Y` and `NewSeqNo (36)` set to the sequence number *after* the gap. This tells the server the client is skipping over the requested range rather than replaying it.

<CodeGroup>
  ```text Resend Request (server → client) theme={null}
  8=FIX.4.4|9=58|35=2|34=114|49=KRAKEN-MD|56=damien|52=20260407-20:23:52.000|7=8|16=0|10=142|
  ```

  ```text Sequence Reset GapFill (client → server) theme={null}
  8=FIX.4.4|9=57|35=4|34=8|49=damien|56=KRAKEN-MD|52=20260407-20:23:52.000|123=Y|36=14|10=088|
  ```
</CodeGroup>

<Note>
  **When to expect a Resend Request:** If your client reconnects to an existing session without resetting sequence numbers (`141=N`), or if a message is dropped in transit, the server will send a Resend Request for the missing range. Always be prepared to handle it.
</Note>


# Sequence Reset
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/sequence-reset

Reset message sequence numbers via FIX

<div>
  <span>FIX</span>
  <span>session: admin</span>
  <span>35=4</span>
</div>

The Sequence Reset message is used to reset the incoming sequence number on the opposing side.

***

<ResponseField name="header" type="">35=`4`</ResponseField>

<ResponseField name="123 - SequenceReset" type="boolean">
  Indicates that the Sequence Reset (4) message is replacing administrative or application messages which will not be resent.

  **Possible values:**

  * `Y` : Gap Fill message, MsgSeqNum field valid
  * `N` : Sequence Reset, ignore MsgSeqNum
</ResponseField>

<ResponseField name="36 - NewSeqNo" type="integer">
  New sequence number.
</ResponseField>

<ResponseField name="trailer" type="" />

<CodeGroup>
  ```text Gap Fill — Skip a range of messages (client → server) theme={null}
  8=FIX.4.4|9=70|35=4|34=8|49=CLIENT|56=KRAKEN-MD|52=20260407-14:32:01.000|123=Y|36=14|10=064|
  ```

  ```text Hard Reset — Reset sequence to 1 (client → server) theme={null}
  8=FIX.4.4|9=70|35=4|34=1|49=CLIENT|56=KRAKEN-TRD|52=20260407-14:32:01.000|123=N|36=1|10=083|
  ```
</CodeGroup>


# Instrument List
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/sl

Instrument parameters and status response via FIX

<div>
  <span>FIX</span>
  <span>session: market-data</span>
  <span>35=y</span>
</div>

This message provides the different parameters of each instrument that can be traded on Kraken as well as their status at the time of the request.

***

<ResponseField name="header" type="">35=`y`</ResponseField>

<ResponseField name="146 - NoRelatedSym" type="integer">
  Repeating Group describing all the Symbols available on Kraken exchange.

  <Expandable title="repeating group">
    <ResponseField name="55 - Symbol" type="string">
      Asset Pair listed on Kraken exchange.
    </ResponseField>

    <ResponseField name="562 - minTradeVol" type="float">
      Minimum order quantity increment on an asset pair.
    </ResponseField>

    <ResponseField name="5010 - QtyPrecision" type="float">
      Specifies the quantity decimal precision of the asset pair and currency.
    </ResponseField>

    <ResponseField name="5011 - QtyMin" type="float">
      Minimum order quantity allowed on asset pair.
    </ResponseField>

    <ResponseField name="5012 - QtyMax" type="float">
      Maximum order quantity allowed on asset pair.
    </ResponseField>

    <ResponseField name="5013 - MinimumCost" type="float">
      Minimum cost (price × qty) for new orders.
    </ResponseField>

    <ResponseField name="2349 - PricePrecision" type="float">
      Specifies the price decimal precision of the asset pair.
    </ResponseField>

    <ResponseField name="5052 - MDPricePrecision" type="integer">
      Specifies the price decimal precision used on market data feeds. May be greater than `2349 - PricePrecision` for rebased xStocks pairs, where market data prices are published at full internal precision. Currently applies to order book and trade market data entries;
    </ResponseField>

    <ResponseField name="5022 - TickSize" type="float">
      Specifies the price increment allowed on the asset pair.
    </ResponseField>

    <ResponseField name="5032 - AssetPairStatus" type="integer">
      **Possible values:**

      * `0` : Hidden
      * `1` : Online
      * `2` : Maintenance
      * `3` : CancelOnly
      * `4` : PostOnly
      * `5` : LimitOnly
      * `6` : Delisted
      * `7` : ReduceOnly
    </ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="320 - InstrumentReqID" type="string">
  Unique request identifier.
</ResponseField>

<ResponseField name="393 - TotNoRelatedSym" type="integer">
  Total number of securities. Only seen when fragmentation occurs.
</ResponseField>

<ResponseField name="893 - LastFragment" type="boolean">
  Indicates whether this message is the last in a sequence of messages when the Security List was delivered in multiple SecurityList messages. Only seen when fragmentation occurs.
</ResponseField>

<ResponseField name="322 - InstrumentResponseID" type="string">
  Unique response identifier.
</ResponseField>

<ResponseField name="560 - InstrumentRequestResult" type="integer">
  **Possible values:**

  * `0` : Valid request
  * `1` : Invalid or unsupported request
  * `2` : No Instruments found that match criteria
  * `4` : Instrument data temporarily unavailable
</ResponseField>

<ResponseField name="58 - Text" type="string">
  Full description for rejection.
</ResponseField>

<ResponseField name="trailer" type="" />

<CodeGroup>
  ```text Instrument List Response (2 instruments) theme={null}
  8=FIX.4.4|9=254|35=y|34=4|49=KRAKEN-MD|56=CLIENT|52=20260407-14:32:01.000|320=SLREQ1|322=SLRESP1|560=0|146=2|55=BTC/USD|562=0.00001|5010=5|5011=0.0001|5013=0.5|2349=1|5052=1|5022=0.1|5032=1|55=ETH/USD|562=0.0001|5010=4|5011=0.001|5013=0.5|2349=2|5052=2|5022=0.01|5032=1|10=227|
  ```
</CodeGroup>


# Instrument List Request
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/slr

Request a list of available instruments via FIX

<div>
  <span>FIX</span>
  <span>session: market-data</span>
  <span>35=x</span>
</div>

The InstrumentListRequest message is used to return a list of securities from the exchange that match the criteria provided on the request.
We recommend that clients send an InstrumentListRequest on any new connection or reconnection as the status of the Instrument might have changed during the disconnection.

***

<ResponseField name="header" type="">35=`x`</ResponseField>

<ResponseField name="320 - InstrumentReqID" type="string">
  Unique request identifier.
</ResponseField>

<ResponseField name="263 - SubscriptionRequestType" type="integer">
  **Possible values:**

  * `0` : Snapshot
  * `1` : Snapshot + Updates
  * `2` : Disable previous snapshot + Update request
</ResponseField>

<ResponseField name="559 - InstrumentListRequestType" type="integer">
  **Possible values:**

  * `0` : Single asset pair definition
  * `1` : SecurityType
  * `4` : All Securities
</ResponseField>

<ResponseField name="167 - SecurityType" type="string">
  **Possible values:**

  * `CASH` : Spot only instruments
  * `FUT` : Futures only instruments
  * `OPT` : Options only instruments
  * `TS` : Tokenized stocks only instruments, i.e. xStocks

  <span>Condition:</span> InstrumentListRequestType = 1
</ResponseField>

<ResponseField name="55 - Symbol" type="string">
  Format should be BASE/QUOTE.

  <span>Condition:</span> InstrumentListRequestType = 0
</ResponseField>

<ResponseField name="trailer" type="" />

<CodeGroup>
  ```text Request All Securities (Snapshot) theme={null}
  8=FIX.4.4|9=81|35=x|34=2|49=CLIENT|56=KRAKEN-MD|52=20260407-14:32:01.000|263=0|320=SLREQ1|559=4|10=240|
  ```

  ```text Request Single Instrument theme={null}
  8=FIX.4.4|9=92|35=x|34=3|49=CLIENT|56=KRAKEN-MD|52=20260407-14:32:01.000|263=0|320=SLREQ2|559=0|55=BTC/USD|10=140|
  ```

  ```text Request All Spot Instruments (SecurityType=CASH) theme={null}
  8=FIX.4.4|9=100|35=x|34=4|49=CLIENT|56=KRAKEN-MD|52=20260407-14:32:01.000|263=0|320=SLREQ3|559=1|167=CASH|10=088|
  ```
</CodeGroup>


# Trading Session Status
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/tss

Trading session status response via FIX (Spot only)

<div>
  <span>FIX</span>
  <span>session: market-data</span>
  <span>35=h</span>
</div>

Response to a [Trading Session Status Request](/exchange/api-reference/unified-fix/tssr) with the current market status.

<Note>This message is available for **Spot only**.</Note>

***

<ResponseField name="header" type="">35=`h`</ResponseField>

<ResponseField name="335 - TradSesReqID" type="string">
  Unique request identifier.
</ResponseField>

<ResponseField name="336 - TradingSessionID" type="string">
  Trading Session identifier.
</ResponseField>

<ResponseField name="340 - TradSesStatus" type="integer">
  **Possible values:**

  * `0` : unknown
  * `1` : Maintenance — Markets are offline for scheduled maintenance — new orders cannot be placed and existing orders cannot be cancelled.
  * `2` : Online — Markets are operating normally — all order types may be submitted and order matching can occur.
  * `101` : cancel\_only — Orders can be cancelled but new orders cannot be placed. No order matching will occur.
  * `102` : post\_only — Only limit orders using the `post_only` option can be submitted. Orders can be cancelled. No order matching will occur.
</ResponseField>

<ResponseField name="567 - TradSesStatusRejReason" type="integer">
  **Possible values:**

  * `1` : UNKNOWNTRADINGSESSIONID
  * `100` : INVALIDREQUESTID
  * `101` : INVALIDSUBSTYPE
  * `102` : DUPLICATEREQUESTID
  * `103` : ALREADYSUBSCRIBED
</ResponseField>

<ResponseField name="trailer" type="" />

<CodeGroup>
  ```text Market Online (TradSesStatus=2) theme={null}
  8=FIX.4.4|9=88|35=h|34=3|49=KRAKEN-MD|56=CLIENT|52=20260407-14:32:01.000|335=TSSREQ1|336=SESSION|340=2|10=048|
  ```

  ```text Market Maintenance (TradSesStatus=1) theme={null}
  8=FIX.4.4|9=88|35=h|34=4|49=KRAKEN-MD|56=CLIENT|52=20260407-14:32:01.000|335=TSSREQ1|336=SESSION|340=1|10=048|
  ```
</CodeGroup>


# Trading Session Status Request
Source: https://docs.kraken.com/exchange/api-reference/unified-fix/tssr

Request trading session status via FIX (Spot only)

<div>
  <span>FIX</span>
  <span>session: market-data</span>
  <span>35=g</span>
</div>

This message will return the status of the market. You can subscribe to have snapshot only or updates as well.
A specific status can also be available for individual instruments in the [Instrument List Request](/exchange/api-reference/unified-fix/slr).

<Note>This message is available for **Spot only**.</Note>

***

<ResponseField name="header" type="">35=`g`</ResponseField>

<ResponseField name="335 - TradSesReqID" type="string">
  Unique request identifier.
</ResponseField>

<ResponseField name="336 - TradingSessionID" type="string">
  Trading Session identifier.
</ResponseField>

<ResponseField name="263 - SubscriptionRequestType" type="integer">
  **Possible values:**

  * `0` : Snapshot only
  * `1` : Snapshot + Updates
</ResponseField>

<ResponseField name="trailer" type="" />

<CodeGroup>
  ```text Snapshot-only Request (SubscriptionRequestType=0) theme={null}
  8=FIX.4.4|9=88|35=g|34=3|49=CLIENT|56=KRAKEN-MD|52=20260407-14:32:01.000|263=0|335=TSSREQ2|336=SESSION|10=050|
  ```

  ```text Subscribe to Updates (SubscriptionRequestType=1) theme={null}
  8=FIX.4.4|9=88|35=g|34=2|49=CLIENT|56=KRAKEN-MD|52=20260407-14:32:01.000|263=1|335=TSSREQ1|336=SESSION|10=049|
  ```
</CodeGroup>


# Release notes
Source: https://docs.kraken.com/exchange/changelog

A history of changes to Kraken's Exchange APIs

## 2026

### 3 July 2026 — Spot FIX v1

* Added Tag `5052` (`MDPricePrecision`) to the Instrument List (`35=y`) response. Specifies the price decimal precision used on market data feeds, which may be greater than `PricePrecision (2349)` for rebased xStocks pairs

### 22 June 2026 — Derivatives REST v1

* **DEPRECATED** the Futures `Fee Schedules` endpoints and related fields (`feeScheduleUid`, `FeeSchedule`, `FeeScheduleVolumes`, `FeeTier`). Fee calculation for Futures trades has been migrated to a centralised Kraken fee service — use the Spot `GetTradeVolume` endpoint to determine the fee rate applied to your trades

### 16 June 2026 — Spot REST v1

* `TradeVolume` `pair` parameter now also accepts a list of `{ asset, aclass }` objects, enabling fee queries for non-forex classes (such as `derivatives` and `equity_pair`)
* Added `fee_schedule` request parameter to `TradeVolume` to return the full per-pair fee schedule in the new `schedules` response field

### 18 May 2026 — Derivatives REST v1

* Added `unknown` value to multiple enums (order `direction`, `orderType`, `triggerSignal`, `triggerSide`, trailing-stop / max-deviation `unit`, and `HistoricalPositionUpdateElement` fields `positionChange`, `tradeType`, `updateReason`) as a fallback when the source value cannot be decoded

### 12 May 2026 — Spot REST v1

* Added `FOK` (fill-or-kill) value to `timeinforce` parameter on `AddOrder` and `AddOrderBatch` endpoints

### 7 May 2026 — Spot REST v1

* Added `broker` request body parameter to `AddOrder` and `AddOrderBatch` for qualified partners in Kraken's API Partner Program

### 30 April 2026 — Spot REST v1

* Added `execution_venue` query parameter to `AssetPairs` endpoint (filter by `international` or `bitnomial_exchange`)

### 28 April 2026 — Spot WS v2

* Added `execution_venue` subscription parameter to the `instrument` channel (one of `international`, `bitnomial-exchange`; defaults to `international`)

### 27 April 2026 — Spot REST v1

* Added `execution_venue` field to `AssetPairs` response (one of `international`, `bitnomial_exchange`)

### 11 March 2026 — Spot REST v1

* Added `GetApiKeyInfo` endpoint to retrieve API key configuration and usage

***

## 2025

### 15 December 2025 — Spot REST v1

* Added `Level3` endpoint for individual order-level (L3) order book data
* Added `GroupedBook` endpoint for aggregated order book data over configurable tick size

### 15 December 2025 — General Docs

* Migrated blog content to guides section
* Refreshed navigation menus for improved discoverability

### 2 December 2025 — Spot WS v2

* L3 WebSocket endpoint URL changed from `wss://ws-auth.kraken.com/v2` to `wss://ws-l3.kraken.com/v2`

### 13 November 2025 — Spot ALL

* Deprecated `.F` asset values returned by `Balance` and `BalanceEx` endpoints

### 18 September 2025 — Spot ALL

* Deprecated `no_mpp` parameter on `AddOrder`, `EditOrder`, and `AddOrderBatch`

### 5 September 2025 — Spot REST v1

* Added `asset_class` filter parameter to `Ticker` endpoint

### 15 August 2025 — Spot REST v1

* Added `asset_class` parameter to market data and trading endpoints for xStocks

### 15 August 2025 — Spot WS v2

* Added `rebased` parameter to `executions` and `balances` requests to specify xStocks mode

### 15 August 2025 — Spot WS v1

* Added `rebased` parameter to `openOrders` and `ownTrades` requests to specify xStocks mode

### 15 August 2025 — Spot FIX v1

* Added Tag `5051` to Logon requests to specify xStocks mode
* Added `TS` SecurityType to `InstrumentListRequest`

### 4 August 2025 — Derivatives REST v1

* Announced upcoming authentication breaking change effective October 1st, 2025

### 28 July 2025 — Spot REST v1

* Added documentation for `CreditLines` endpoint

### 24 June 2025 — Spot REST v1

* Fixed error message formatting on Account Data endpoints

### 29 May 2025 — Spot FIX v1

* Added Tag 78 and 79 for Subaccount Management for Broker accounts

### 28 May 2025 — Spot REST v1

* Moved OTC endpoints to Institutional menu section

### 28 May 2025 — Spot WS v2

* Added `user` field to `executions` and `balances` channels to help identify the account

### 8 May 2025 — Spot WS v1 (v1.9.6)

* Added `stp_type` to `addOrder` providing self trade prevention options

### 8 May 2025 — Spot WS v2 (v2.0.10)

* Added `timestamp` field to `level3` channel to help clients track market data sequence

### 8 March 2025 — Derivatives FIX v1

* FIX now supports futures trading

***

## 2024

### 28 September 2024 — Spot FIX v1

* Added Tag `5050` `LiquidityInd` in `ExecutionReport`

### 27 September 2024 — Spot REST v1

* Added `AmendOrder` endpoint to modify order parameters
* Added `OrderAmends` endpoint to retrieve an audit trail of amend transactions
* Added `amended` flag to `OpenOrders` and `ClosedOrders` endpoints to identify amended orders

### 27 September 2024 — Spot WS v1 (v1.9.5)

* Added `amendOrder` endpoint to modify order parameters
* Added `amended` flag to `openOrders` channel to identify amended orders

### 27 September 2024 — Spot WS v2 (v2.0.9)

* Added `amend_order` endpoint to modify order parameters
* Added `amended` exec\_type to `executions` channel to identify amended orders

### 27 September 2024 — Spot FIX v1

* Added order cancel-replace request message `MsgType=G` to modify order parameters

### 5 September 2024 — Spot REST v1

* Added `cl_ord_id` parameter to query endpoints: `ClosedOrders`, `OpenOrders`

### 22 August 2024 — Spot WS v2 (v2.0.8)

* Added `liquidated` flag to `executions` channel to show when an order has been liquidated
* Added subscription rate limits to the `level3` market data feed

### 1 August 2024 — Spot WS v2 (v2.0.7)

* `snap_trades` parameter now defaults to `false`
* Added `ext_ord_id` field to `openOrders` and `executions`
* Added `ext_exec_id` field to `ownTrades` and `executions`
* Added `margin_borrow` flag to `ownTrades` and `executions`

### 27 June 2024 — Spot WS v2 (v2.0.6)

* Deprecated `snapshot` and `snapshot_trades` in `executions` channel

### 24 June 2024 — Spot REST v1

* Added `cl_ord_id` parameter to order endpoints: `AddOrder`, `CancelOrder`

### 30 May 2024 — Spot WS v2 (v2.0.5)

* Modified `balances` channel to always include wallet breakdown and cumulative balance
* Added `asset_class` to `balances` channel for future expansion

### 23 May 2024 — Spot FIX v1.8

* Changed `ClOrdId` (Tag 11) and `OrigClOrdId` format and validation

### 21 May 2024 — Spot REST v1

* Added `country_code` parameter to `AssetPairs`

### 16 May 2024 — Spot WS v2 (v2.0.4)

* Added `cl_ord_id` and `sender_sub_id` client order identifiers
* Clarified that GTD expire time is one month

### 16 May 2024 — Spot WS v1 (v1.9.3)

* Added `cl_ord_id` and `sender_sub_id` client order identifiers
* Added `margin` indicator for leveraged orders

### 14 May 2024 — Spot REST v1

* Added `cl_ord_id` and `sender_sub_id` identifiers to order queries
* Added `margin` indicator to leveraged orders

### 18 April 2024 — Spot FIX v1.7

* Added `iceberg` and `trailing-stop` order types to FIX

### 1 March 2024 — Spot REST v1

* Removed `Staking` section, deprecated and no longer supported

### 1 March 2024 — Spot WS v2 (v2.0.3)

* Added `event_trigger` parameter to the `ticker` channel

### 15 February 2024 — Spot WS v2 (v2.0.2)

* Added `cash_order_qty` to the `executions` channel

### 1 February 2024 — Spot REST v1

* Added `maker` and `ledgers` fields to `TradesHistory` and `QueryTrades`

### 10 January 2024 — Spot WS v1 (v1.9.2)

* Narrowed range of valid offsets (from current time) for the `deadline` parameter

### 1 January 2024 — Spot REST v1

* Removed support for POST requests to all public endpoints
* Added migration notes to `Balance` and `Ledger` endpoints

***

## 2023

### 14 December 2023 — Spot WS v2 (v2.0.1)

* Added `trailing-stop` and `trailing-stop-limit` order types
* Added trigger protection during connectivity issues with index providers

### 14 December 2023 — Spot REST v1

* Added `trailing-stop` and `trailing-stop-limit` order types

### 7 December 2023 — Spot WS v2 (v2.0.0)

* WebSocket v2 taken out of beta
* Added `status` and `restated` values to `exec_type`
* Added support for native amends in `level3` channel
* Enabled `level3` channel in all environments
* Added support for new ledger types in `balances` channel
* Enabled `balances` channel in all environments
* Deprecated `cancel_reason` in `executions` channel — use `reason` instead

### 1 November 2023 — Spot REST v1

* Added `WithdrawMethods` and `WithdrawAddresses` endpoints
* Added `start`, `end`, `cursor`, and `limit` parameters to `WithdrawStatus`

### 30 October 2023 — Spot FIX v1.0.0

* Added Tag `5041` `ChecksumOrderBook` parameter

### 1 October 2023 — Spot REST v1

* Added `max_fee` parameter to `Withdraw` and minimum field in response

### 1 September 2023 — Spot REST v1

* Added `start`, `end`, `cursor`, and `limit` parameters to `DepositStatus`

### 1 August 2023 — Spot REST v1

* Added earn / balance service documentation

### 14 July 2023 — Spot WS v2 (beta)

* Added support for `iceberg` order type

### 1 July 2023 — Spot REST v1

* Added private `BalanceEx` documentation

### 1 June 2023 — Spot FIX v1.0.0

* First version of FIX API in production beta

### 1 June 2023 — Spot REST v1

* Added `amount` parameter to `DepositAddresses`
* Added `count` parameter to `Trades`

### 1 May 2023 — Spot REST v1

* Added `address` parameter to `Withdraw`
* Added `since` parameter to `Spread`

### 3 April 2023 — Spot WS v2 (beta)

* `OHLC` channel: added `interval` field to request parameters

### 22 March 2023 — Spot WS v2 (beta)

* Edit Order request: added `limit_price` field, deprecated `price` field
* `executions` channel: added `margin` field to order details
* `instrument` channel: added additional support for `price_precision`

### 15 March 2023 — Spot WS v2 (beta)

* `executions` channel: added `last_qty` and `last_price` fields to trade events
* OHLC channel: added `interval` and `interval_begin` fields
* Corrected default `time_in_force` settings

### 2 March 2023 — Spot WS v1 (v1.9.1)

* Added `contingent` field on private open order feed
* Enabled fast reconnect on WebSockets following trading engine maintenance

### 1 March 2023 — Spot REST v1

* Added `originators` parameter to `DepositStatus`

### 1 February 2023 — Spot REST v1

* Added long and short position limits to `AssetPairs`
* Specified minimum and maximum number of txids and userrefs
* Specified maximum number of responses for `DepositStatus` and `WithdrawStatus`
* Added note to use `%2b` instead of `+` for URL encoding

### 1 January 2023 — Spot REST v1

* Removed requirement for `asset` in `DepositStatus` and `WithdrawStatus`
* Documented `reduce_only` parameter
* Added `consolidate_taker` to `TradesHistory`, `ClosedOrders`, and `QueryOrders`
* Added Subaccounts section
* Added `trade_id` to private `TradesHistory`

***

## 2022

### 1 December 2022 — Spot REST v1

* Fixed pair parameter restriction on `TradeVolume`
* `EditOrder` now allowed on margin orders

### 28 November 2022 — Spot WS v2 (beta)

* Corrected several details in the `executions` channel

### 22 November 2022 — Spot WS v2 (beta)

* Removed internal version from the About section
* Multiple formatting and data corrections

### 1 November 2022 — Spot REST v1

* Added `tick_size` and `status` parameters to `AssetPairs`
* Added `status` and `collateral_value` to `Assets`
* Added `trade_id` to public `Trades`

### 1 October 2022 — Spot REST v1

* Documented `uv` (unexecuted value) field in `TradeBalance`
* Added `costmin` trading parameter to `AssetPairs`
* Ticker wildcard support — `pair` no longer required

### 1 September 2022 — Spot REST v1

* `AddOrder`, `EditOrder`, and `AddOrderBatch` now support iceberg orders

### 1 July 2022 — Spot REST v1

* Added support for restricting API keys to specified IP address(es)

### 1 June 2022 — Spot REST v1

* Added custom self trade prevention options

### 1 May 2022 — Spot REST v1

* New `AddOrderBatch` endpoint to send multiple new orders
* New `CancelOrderBatch` endpoint to cancel multiple open orders

### 22 March 2022 — Spot WS v1 (v1.9.0)

* Added support for `editOrder`

### 1 March 2022 — Spot REST v1

* New `EditOrder` endpoint to edit volume and price on open orders

***

## 2021

### 1 December 2021 — Spot REST v1

* Added `trigger` optional parameter to `AddOrder`

### 31 March 2021 — Spot WS v1 (v1.8.3)

* Added `deadline` support to `addOrder`

### 25 February 2021 — Spot WS v1 (v1.8.0)

* Added `timeinforce` and Immediate-or-Cancel (IOC) support

### 4 February 2021 — Spot WS v1 (v1.7.1)

* Changed close code to 1008 (Policy Violation) from 1013
* Added policy rule for maximum rate of subscriptions
* Added new generic error type with optional internal error codes
* Improved public market data snapshot performance

### 30 January 2021 — Spot WS v1 (v1.7.0)

* Added `userref` field to `openOrders` and `ownTrades` update messages

### 13 January 2021 — Spot WS v1 (v1.6.1)

* Added Dead Man's Switch (`cancelAllOrdersAfter`) REST endpoint
* Fixed intermittent public data WebSocket feed latency

***

## 2020

### 21 December 2020 — Spot WS v1 (v1.6.0)

* Introduced `post_only` trading mode for maintenance procedure

### 5 December 2020 — Spot WS v1 (v1.5.0)

* Added optional `ratecounter` argument for `openOrders` subscription
* Added `maxratecount` and current `ratecount` reporting
* Added `cancel_only` trading mode
* Relaxed slow-consumer constraint on WebSocket connections
* Maintained private WebSocket connections during maintenance
* Improved public market data snapshot/stream synchronisation

### 18 November 2020 — Spot WS v1 (v1.4.1)

* Added `cancelAll` REST endpoint

### 2 November 2020 — Spot WS v1 (v1.4.0)

* Added `cancelAll` trading request functionality
* Performance upgrade to `cancelOrder` request handling
* Improved messages and close codes when closing WebSocket connections
* Fixed incorrect error for `addOrder` with invalid pair

### 27 October 2020 — Spot WS v1 (v1.3.0)

* Added sequence numbers on private feeds (`openOrders`, `ownTrades`)

### 12 October 2020 — Spot WS v1 (v1.2.1)

* Eliminated trading rate limit penalty for filled orders
* Performance improvement for REST real-time and historical market data
* Rejected `market` conditional close orders
* Fixed intermittent bug affecting Ticker REST endpoint

### 31 August 2020 — Spot WS v1 (v1.2.0)

* Added `cancel_reason` to `openOrders` stream
* Added optional `snapshot` parameter for `ownTrades` feed

### 22 June 2020 — Spot WS v1 (v1.1.0)

* Added order book `checksum`

### 18 February 2020 — Spot WS v1 (v1.0.7)

* Added `addOrder` and `cancelOrder` endpoints

***

## 2019

### 1 October 2019 — Spot WS v1 (v1.0.6)

* Introduced `openOrders` and `ownTrades` channels

### 4 February 2019 — Spot WS v1 (v1.0.5)

* Fixed publishing of deleted price levels

### 23 January 2019 — Spot WS v1 (v1.0.4)

* Added `connectionID` field to `systemStatus` message

### 18 January 2019 — Spot WS v1 (v1.0.3)

* Added open prices on `ohlc` including 24-hour values
* Increased timestamp precision to microseconds
* Updated sandbox URL

***

## 2018

### 24 December 2018 — Spot WS v1 (v1.0.2)

* Changed timestamp field to string type

### 7 December 2018 — Spot WS v1 (v1.0.1)

* Released WebSocket public market data sandbox v0.0.4
* Changed timestamp precision to milliseconds

### 28 November 2018 — Spot WS v1 (v1.0.0)

* Released WebSocket public market data sandbox v0.0.3


# FIX Authentication
Source: https://docs.kraken.com/exchange/guides/fix/authentication

SenderCompID assignment, Logon message structure, password encoding, and session-level authentication for the Kraken Unified FIX API

## SenderCompID

Every FIX message — including the initial [Logon](/exchange/api-reference/unified-fix/logon) — requires a `SenderCompID` (tag 49). This identifier is assigned to you by Kraken during onboarding.

* **Spot** sessions use your standard SenderCompID
* **Derivatives** sessions use a SenderCompID with a `DRV` suffix
* Trading and Market Data sessions use the same SenderCompID but connect to different ports

<Info>
  Contact your Account Manager to request your SenderCompID and connection details.
</Info>

## API Key Setup

Private trading sessions require an API Key with **FIX** permissions. Create one in [Kraken Pro settings](https://pro.kraken.com/app/settings/api).

| Session             | API Key type needed                            |
| ------------------- | ---------------------------------------------- |
| Spot trading        | FIX key created under your Spot account        |
| Derivatives trading | FIX key created under your Derivatives account |

Note that a FIX key is created as a Spot key, even when used for Derivatives trading.

We recommend using separate API Keys for Spot and Derivatives, even though the authentication mechanism is identical.

## Authentication Flow

Market Data sessions authenticate with the SenderCompID alone. Trading sessions require an additional HMAC signature:

1. Generate a `Nonce` — current time in milliseconds since Unix epoch
2. Build the `MessageInput` string from fixed FIX fields
3. Compute `SHA256(MessageInput + Nonce)`
4. Sign it with `HMAC-SHA512` using your base64-decoded API Secret
5. base64-encode the result → this is your `Password` (tag 554)
6. Send the Logon with `UserName` (tag 553), `Password` (tag 554), and `Nonce` (tag 5025)

See the [Logon](/exchange/api-reference/unified-fix/logon) page for the full field reference and code examples in Python, Node.js, Java, Go, and C#.


# Book checksum (FIX)
Source: https://docs.kraken.com/exchange/guides/fix/checksums

How to maintain the order book and validate the CRC32 checksum on the FIX Market Data Incremental Refresh

The [Market Data Incremental Refresh](/exchange/api-reference/unified-fix/mdir) message includes a CRC32 checksum (tag `5041`) with each update. Validating it confirms your local book is correctly synchronised with the exchange.

The checksum is always calculated over the **top 10 price levels** regardless of subscription depth. Process all updates in a message before calculating the checksum.

## Book maintenance

Each entry in the [Market Data Incremental Refresh](/exchange/api-reference/unified-fix/mdir) carries an update action:

| Action           | Meaning                               |
| :--------------- | :------------------------------------ |
| New (`279=0`)    | A new price level was added           |
| Update (`279=1`) | The quantity at a price level changed |
| Delete (`279=2`) | A price level was removed             |

## Checksum calculation

Prices and quantities in the FIX feed are sent as floats. To compute the checksum correctly, you must first determine the precision for each instrument from an [Security List Request](/exchange/api-reference/unified-fix/slr).

### Step 1 — get instrument precision

Send a Security List Request for the instrument:

```text theme={null}
8=FIX.4.4|9=90|35=x|34=3|49=CLIENT|52=20231012-09:54:15.316|56=KRAKEN-MD|55=BTC/USD|320=SLS1000002|559=0|10=026|
```

The Security List response includes two precision fields:

```text theme={null}
8=FIX.4.4|9=177|35=y|49=KRAKEN-MD|56=CLIENT|34=3|52=20231012-09:54:15.317|320=SLS1000002|322=1697104455317568799|560=0|146=1|55=BTC/USD|562=0.00000001|5010=8|5011=0.0001|2349=1|5022=0.1|5032=1|10=068|
```

<Note>
  The two fields you need for checksum calculation:

  * `2349=1` — price precision is 1 decimal place
  * `5010=8` — quantity precision is 8 decimal places

  Store these values. They apply to all subsequent Market Data messages for this instrument.
</Note>

### Step 2 — subscribe and receive snapshot

Subscribe to Market Data for depth 10:

```text theme={null}
8=FIX.4.4|9=124|35=V|34=6|49=CLIENT|52=20231012-09:54:15.316|56=KRAKEN-MD|146=1|55=BTC/USD|262=0|263=1|264=10|265=1|267=3|269=1|269=0|269=2|10=170|
```

The [Market Data Full Refresh](/exchange/api-reference/unified-fix/mdsfr) response establishes your initial book state. No checksum is provided on the snapshot — only on subsequent incremental updates.

### Step 3 — calculate checksum on each incremental update

<Steps>
  <Step title="Apply the update">
    Apply all entries in the [Market Data Incremental Refresh](/exchange/api-reference/unified-fix/mdir) to your local book before calculating the checksum.
  </Step>

  <Step title="Build the asks string">
    For each of the top 10 ask price levels, sorted by price **low to high**:

    * Format the price using the instrument's price precision → `28013.0` → `"28013.0"`
    * Remove `.` → `"280130"`
    * Remove leading zeros → `"280130"`
    * Format the quantity using the instrument's quantity precision → `0.00096506` → `"0.00096506"`
    * Remove `.` → `"000096506"`
    * Remove leading zeros → `"96506"`
    * Append `price + qty` to the asks string → `"28013096506"`
  </Step>

  <Step title="Build the bids string">
    For each of the top 10 bid price levels, sorted by price **high to low**, apply the same formatting and append to the bids string.
  </Step>

  <Step title="Concatenate and hash">
    Concatenate **asks + bids** strings, then pass the result to a CRC32 function. Cast the result to an unsigned 32-bit integer and compare to tag `5041` in the message.
  </Step>
</Steps>

### Example

Incremental update received:

```text theme={null}
8=FIX.4.4|9=167|35=X|34=12|49=KRAKEN-MD|52=20231012-09:55:14.934|56=CLIENT|55=BTC/USD|262=0|268=1|279=1|269=1|278=O28013.0|270=28013.0|271=0.00096506|273=09:55:15.071|5041=3341325816|10=090|
```

Asks string (low → high, price precision=1, qty precision=8):

```text theme={null}
28013096506280398100000280665100000280933100000281200100000281467100000281735100000282002100000282270100000282537100000
```

Bids string (high → low):

```text theme={null}
28003010000027999996375279699738604232770013500002757323200002713741000000270913400000267294100000267026100000266759100000
```

Concatenated input to CRC32:

```text theme={null}
2801309650628039810000028066510000028093310000028120010000028146710000028173510000028200210000028227010000028253710000028003010000027999996375279699738604232770013500002757323200002713741000000270913400000267294100000267026100000266759100000
```

Expected result: **`3341325816`**


# FIX Introduction
Source: https://docs.kraken.com/exchange/guides/fix/introduction

Overview of the Kraken FIX 4.4 API — session architecture, supported messages, connectivity, and key design considerations

The Kraken FIX API is a FIX 4.4 implementation for institutional and HFT clients. It provides the lowest-latency order entry path, deterministic message sequencing, cancel-on-disconnect, and session-based message replay. It covers both Spot and Derivatives markets via a single **Spot FIX API Key**.

To get access, contact your Account Manager.

## Session architecture

FIX sessions follow a sticky routing model:

1. **HAProxy** assigns the FIX Gateway instance with the fewest active connections on initial logon (round-robin selection).
2. **Stickiness at SenderCompID level** — once connected, all messages from that session follow the same path: FIX Gateway → OES → Trading Engine.
3. **Ordering guarantee** — NEW and CANCEL messages from the same session arrive at the Trading Engine in order.

<Note>
  Spot and Derivatives have separate trading engines. Each FIX trading session connects to the appropriate engine based on the instrument being traded.
</Note>

This is distinct from WebSocket, where connections are load-balanced and two sequential messages may follow different paths to the trading engine's inbound queue.

## Supported messages

| Message Type                               | Tag 35 | Spot | Derivatives |
| :----------------------------------------- | :----: | :--: | :---------: |
| NewOrderSingle                             |    D   |   ✅  |      ✅      |
| OrderCancelRequest                         |    F   |   ✅  |      ✅      |
| OrderCancelReplaceRequest (Amend)          |    G   |   ✅  | Coming soon |
| ExecutionReport                            |    8   |   ✅  |      ✅      |
| OrderStatusRequest                         |    H   |   ✅  |      ✅      |
| OrderMassCancelRequest                     |    q   |   ✅  |      ✅      |
| InstrumentListRequest / InstrumentList     |    —   |   ✅  |      ✅      |
| MarketDataRequest / Snapshot / Incremental |    —   |   ✅  |      ✅      |
| TradingSessionStatusRequest / Status       |    —   |   ✅  |      ✅      |

<Warning>
  On FIX, orders can only be cancelled if they were placed on the same FIX session. The exception is `OrderMassCancelRequest` (Tag 35=q), which cancels all orders on the account regardless of origin. WebSocket and REST can cancel orders from any source (FIX, WebSocket, REST, UI). Design your architecture accordingly.
</Warning>

## Order types

All order types are handled at the Trading Engine level:

| Order type                          | Spot | Derivatives |
| :---------------------------------- | :--: | :---------: |
| Market                              |   ✅  |      ✅      |
| Limit                               |   ✅  |      ✅      |
| Stop-Loss / Stop-Loss-Limit         |   ✅  |      ✅      |
| Take-Profit / Take-Profit-Limit     |   ✅  |      ✅      |
| Trailing-Stop / Trailing-Stop-Limit |   ✅  |      ✅      |
| Iceberg (DisplayQty, Tag 1138)      |   ✅  |      —      |

Synthetic order types (TWAP, etc.) are not yet available via FIX. They will be handled by a new Algo Engine in a future release.

## Cancel on Disconnect (CoD)

Cancel on Disconnect is enabled by default on every FIX trading session. All open orders placed on the session are automatically cancelled on connection loss.

CoD is configured per session by setting `CancelOrdersOnDisconnect` (Tag 8674) on the Logon message; no onboarding step is required. See the [Logon field reference](/exchange/api-reference/unified-fix/logon) for the accepted values and their behaviour.

For manual intervention, `OrderMassCancelRequest` (Tag 35=q) cancels all orders immediately.

## ClOrdID rules

Each `ClOrdID` (Tag 11) must be **unique within a trading session**. Reuse results in rejection.

Recommended approaches:

* UUIDs
* Incrementing sequence numbers with a session prefix

`ExecID` (Tag 17) is derived from `ClOrdID` at the FIX Gateway level (base32 encoded). If `ClOrdID` is a UUID, only the last 12 hex characters are recoverable from the `ExecID`.

## Self-Trade Prevention (STP)

On **Spot**, STP is configured at the order level via FIX Tag 7928, or at the account level using `SenderSubID` (useful for brokers managing multiple sub-accounts):

| Mode          |   Tag 7928  | Behaviour                   |
| :------------ | :---------: | :-------------------------- |
| Cancel Newest | 1 (default) | Arriving order is cancelled |
| Cancel Oldest |      2      | Resting order is cancelled  |
| Cancel Both   |      0      | Both orders are cancelled   |

On **Derivatives**, STP is managed at the account level via REST API.

## Risk and validation layers

Orders pass through three validation layers before reaching the book:

| Layer                     | Checks performed                                        |
| :------------------------ | :------------------------------------------------------ |
| FIX Gateway               | Message format validation, session authentication       |
| OES (Order Entry Service) | Account validation, instrument checks, geo-restrictions |
| Trading Engine            | Balance checks, self-trade prevention, order limits     |

Configurable client-side risk controls (fat-finger limits, max notional per order) are not currently offered. Contact your Account Manager for specific requirements.

## Hours of operation

FIX sessions operate 24/7 with a logical session rollover every day at **22:00 UTC**. The rollover lasts approximately 30 seconds. Both Trading and Market Data sequence numbers reset to `0` after rollover.

## Connectivity

Connections must use **TCP SSL with TLS 1.3**.

### Endpoints

| Environment | Hostname             |
| :---------- | :------------------- |
| Production  | `fix.kraken.com`     |
| UAT         | `fix.uat.kraken.com` |

<Warning>
  DNS records carry a 5-minute TTL and must be treated as ephemeral. Always resolve DNS at connection time — do not bind to static IPs.
</Warning>

### FIX port allocation

| Service                      | Port |
| :--------------------------- | :--- |
| Spot Market Data (L2)        | 4000 |
| Spot Trading                 | 4001 |
| Derivatives Market Data (L2) | 4002 |
| Derivatives Trading          | 4003 |
| Derivatives L3 Market Data   | 4004 |
| Spot L3 Market Data          | 4005 |

WebSocket and REST share TCP 443 (SSL/HTTPS).

### IP whitelisting

Before logging on, your incoming IP addresses must be whitelisted. Kraken will provide your designated CompIDs, hostname, and ports during onboarding.

## Message replay

FIX Gateways support standard sequence number-based replay. If a session reconnects with a lower-than-expected sequence number, the gateway replays `ExecutionReport`s from the requested sequence number, following FIX 4.4 gap-fill and resend request semantics.

Duplicate messages (same sequence number) are handled per FIX protocol standards. If `PossDupFlag` (Tag 43) is set to `Y`, the message is treated as a possible duplicate. Messages with duplicate sequence numbers without the flag may trigger a sequence number resync.

## Rate limits

FIX rate limits are at the **session level** for Derivatives — each FIX session has its own token bucket. For Spot, FIX shares a unified account-level bucket with WebSocket and REST.

When a rate limit is reached, Kraken returns a business-level reject message on FIX. FIX sessions also include an automatic error rate safeguard: if a client generates too many errors per second, the session is automatically disconnected. The threshold can be raised on request through your Account Manager.

See the [rate limits guide](/exchange/guides/general/ratelimits) for full details.

## Related guides

<CardGroup>
  <Card title="FIX authentication" icon="lock" href="/exchange/guides/fix/authentication">
    Logon message, CompID setup, and session establishment
  </Card>

  <Card title="Colocation and connectivity" icon="server" href="/exchange/guides/general/colocation">
    Cross-connect specs, latency tiers, and how to apply for VIP access
  </Card>

  <Card title="Choose your protocol" icon="table" href="/exchange/guides/general/api-comparison">
    FIX vs WebSocket vs REST — sequencing, cancel scope, and latency
  </Card>

  <Card title="Order lifecycle" icon="arrows-spin" href="/exchange/guides/general/order-lifecycle">
    OrdStatus and ExecType values in ExecutionReport (MsgType=8)
  </Card>

  <Card title="Order amends" icon="pen" href="/exchange/guides/general/amends">
    Queue priority rules for reduce-only vs price/size amendments
  </Card>

  <Card title="Client order IDs" icon="fingerprint" href="/exchange/guides/general/clordid">
    ClOrdID uniqueness, ExecID derivation, and best practices
  </Card>
</CardGroup>


# Derivatives Introduction
Source: https://docs.kraken.com/exchange/guides/futures/introduction

Overview of the Kraken Derivatives (Futures) API — REST, WebSocket, and FIX access, conventions, and testing environment

## Platform overview

The Kraken Derivatives platform provides access via REST, WebSocket, and FIX APIs. For FIX, refer to the [FIX introduction](/exchange/guides/fix/introduction) for session setup and authentication.

The REST API provides secure access to your Derivatives account to:

* Request current or historical price information
* Check your account balance and PnL
* View margin parameters and estimated liquidation thresholds
* Place or cancel orders (individually or in batch)
* View open orders, open positions, or trade history
* Request a digital asset withdrawal

The [WebSocket API](/exchange/guides/futures/websockets) provides real-time data channels, eliminating the need to periodically poll for frequently changing information.

The API can be implemented in any language capable of managing HTTP requests. See [sample implementations](#sample-implementations) for code in Java, Python, C#, and Visual Basic .NET.

## Conventions

### Server time

All timestamps are in Coordinated Universal Time (UTC).

### Unique identifiers

```text theme={null}
c18f0c17-9971-40e6-8e5b-10df05d422f0
```

Unique identifiers follow the UUID (Universally Unique Identifier) standard.

### Dates and times

```text theme={null}
2016-02-26T12:09:38.830Z
```

The API requires and returns dates in ISO 8601 format: `<yyyy>-<mm>-<dd>T<HH>:<MM>:<SS>.<sss>Z`. The millisecond component `<sss>` is optional when provided as an argument. `Z` denotes UTC.

### Symbols

The system identifies accounts, margin accounts, futures contracts, and indices through ticker symbols:

| Symbol             | Description                                                     |
| :----------------- | :-------------------------------------------------------------- |
| `xbt`              | Bitcoin                                                         |
| `xrp`              | Ripple XRP                                                      |
| `fi_xbtusd`        | Bitcoin-Dollar Futures Margin Account                           |
| `fi_xrpusd`        | Ripple-Dollar Futures Margin Account                            |
| `fi_xbtusd_180615` | Bitcoin-Dollar Futures, maturing 16:00 London time 15 June 2018 |
| `in_xbtusd`        | Bitcoin-Dollar Real-Time Index                                  |
| `rr_xbtusd`        | Bitcoin-Dollar Reference Rate                                   |

## Generate API keys

1. Sign in to your Derivatives account.

2. Click your **name** in the upper-right corner.

3. Select **Settings** from the drop-down menu.

4. Select the **Create Key** tab in the API panel.

5. Choose the access level:

   **General API:** No Access / Read Only / Full Access (excludes withdrawals)

   **Withdrawal API:** No Access / Full Access (controls withdrawal permissions)

6. Press **Create Key**.

7. Record your Public and Private keys somewhere safe.

<Warning>
  The private key is shown only once. You cannot view it again after closing this screen.
</Warning>

<Warning>
  API keys must be kept secure and never shared. If you cannot store your private key safely, do not generate it.
</Warning>

### Key limits

Up to 50 keys can be created per account, each with a distinct nonce.

## API testing environment

A fully functional demo environment is available at [demo-futures.kraken.com](https://demo-futures.kraken.com). It is completely separate from production and does not require existing account credentials.

To get started:

1. Navigate to [demo-futures.kraken.com](https://demo-futures.kraken.com)
2. Click **Sign Up** — email and password are generated automatically
3. Accept the Demo Terms & Conditions and Privacy Policy
4. Note your credentials for reuse, then select **Complete Sign-Up**

Once signed up, [generate API keys](#generate-api-keys) for testing.

The demo API code is identical to production in terms of feeds, endpoints, and response structure. The only difference is the base URL:

| Environment | Base URL                          |
| :---------- | :-------------------------------- |
| Production  | `https://futures.kraken.com`      |
| Demo        | `https://demo-futures.kraken.com` |

**WebSocket (demo):** `wss://demo-futures.kraken.com/ws/v1`

**REST (demo):** `https://demo-futures.kraken.com/derivatives/api/v3/tickers`

## API URLs

**REST API:**

```text theme={null}
https://futures.kraken.com/derivatives/api/v3/
https://futures.kraken.com/api/history/v2/
https://futures.kraken.com/api/charts/v1/
```

**WebSocket:**

```text theme={null}
wss://futures.kraken.com/ws/v1
```

<Note>
  Direct access URLs for IP whitelisting are different from the above. Contact your Account Manager for whitelisted endpoint details.
</Note>

## Sample implementations

Sample implementations in Java, Python, C#, and Visual Basic .NET are available on GitHub:

[github.com/krakenfx](https://github.com/krakenfx)

If you have implemented the API in another language and would like to share it, contact support.


# Derivatives Rate Limits
Source: https://docs.kraken.com/exchange/guides/futures/ratelimits

Request cost budgets and WebSocket connection limits for the Derivatives REST and WebSocket APIs

<Note>
  These limits apply to Derivatives endpoints only. For Spot trading engine limits see [Spot trading limits](/exchange/guides/general/ratelimits). For Spot REST call counter limits see [REST rate limits](/exchange/guides/rest/ratelimits).
</Note>

## REST Request Limits

Request limits are determined from cost associated with each API call and rate limiting budgets depend on which path the endpoint uses. Public endpoints do not have a cost and therefore do not count against any rate limiting budget.
For `/derivatives` endpoints, clients can spend up to 500 every 10 seconds.

The below table displays the cost associated with each API call for `/derivatives` endpoints:

| Endpoint                                  | Cost              |
| :---------------------------------------- | ----------------- |
| sendorder                                 | 10                |
| editorder                                 | 10                |
| cancelorder                               | 10                |
| batchorder                                | 9 + size of batch |
| accounts                                  | 2                 |
| openpositions                             | 2                 |
| fills (without lastFillTime specified)    | 2                 |
| fills (with lastFillTime specified)       | 25                |
| cancelallorders                           | 25                |
| cancelallordersafter                      | 25                |
| withdrawaltospotwallet                    | 100               |
| openorders                                | 2                 |
| orders/status                             | 1                 |
| unwindqueue                               | 200               |
| GET leveragepreferences                   | 2                 |
| PUT leveragepreferences                   | 10                |
| GET pnlpreferences                        | 2                 |
| PUT pnlpreferences                        | 10                |
| transfer                                  | 10                |
| transfer/subaccount                       | 10                |
| subaccount/:subaccountUid/trading-enabled | 2                 |
| self-trade-strategy                       | 2                 |

On the [Batch Order](/api-reference/order-management/batch-order-management) endpoint, the cost is 9 + size of the batch of the requests.
For example, a batch of 10 order requests, (send, edit, and or cancel) sent through the Batch Order endpoint would cost 19.

If the API limit is exceeded, the API will return `error` equal to `apiLimitExceeded`.
For the FIX API the API Limit is done at the `CompID` level.

For `/history` endpoints, clients have a pool of up to 100 tokens that continually replenishes at a rate of 100 every 10 minutes.

The below table displays the cost associated with each API call for `/history` endpoints. The accountlog rate limit cost varies on the optional 'count' parameter (default count is 500):

| Endpoint                          | Cost |
| :-------------------------------- | ---- |
| historicalorders                  | 1    |
| historicaltriggers                | 1    |
| historicalexecutions              | 1    |
| accounglogcsv                     | 6    |
| accountlog (count: 1 - 25)        | 1    |
| accountlog (count: 26 - 50)       | 2    |
| accountlog (count: 51 - 1000)     | 3    |
| accountlog (count: 1001 - 5000)   | 6    |
| accountlog (count: 5001 - 100000) | 10   |

### Example

The following shows the return of call of the `sendorder` endpoint where the API limit has been exceeded.

```json theme={null}
{
  "result": "error",
  "serverTime": "2016-02-25T09:45:53.818Z",
  "error": "apiLimitExceeded"
}
```

## Websocket Limits

There are limits to both the number of connections a client can have open concurrently and the number of requests an individual connection can make.
Limit values are subject to change and additional limits may be added in the future.

The current limits are:

| Resource    | Allowance | Replenish Period |
| ----------- | --------- | ---------------- |
| Connections | 100       | N/A              |
| Requests    | 100       | 1 second         |


# Derivatives REST
Source: https://docs.kraken.com/exchange/guides/futures/rest

Authentication, request format, and response structure for the Derivatives REST API

## Authentication

<Warning>
  **Authentication Flow for v3 endpoints:** We have updated the authentication flow for `/derivatives/*` endpoints as of 20th February 2024 to align with best practices and ensure higher security standards. For more information, see [Upcoming Changes](#upcoming-changes).
</Warning>

Calls to endpoints requiring authentication must include the following HTTP headers: `APIKey` and `Authent`.
A third header, `Nonce`, may also be included (this is optional).

| Header name | Value                            |          |
| ----------- | -------------------------------- | -------- |
| APIKey      | Public api key (not the secret!) | required |
| Authent     | Authentication string            | required |
| Nonce       | A unique incrementing nonce      | optional |

Some HTTP endpoints allow performing sensitive operations such as placing orders or requesting a
digital asset withdrawal. These private endpoints can therefore be called only through encrypted
requests, and an authentication string (`Authent`) must be included in each such request. `Authent` is computed from the following inputs:

### PostData

`postData` represents the parameters sent to an HTTP endpoint, formatted as a `&` concatenated string in the form `<argument>=<value>`. The specific parameters required vary by endpoint.

*Example:* `symbol=fi_xbtusd_180615`

### Nonce

`Nonce` is a continuously incrementing integer parameter. A good nonce is your system time in
milliseconds (in string format). Our system tolerates nonces that are out of order for a brief period of time.
Nonce is **not** required.

*Example:* `1415957147987`

Many authentication issues are related with incorrect `Nonce`. A new pair of api keys will automatically reset the nonce and resolve these issues.

### Endpoint Path

`endpointPath` This is the URL extension of the endpoint.

*Example:* `/api/v3/orderbook`

### API Secret

The `api_secret` is obtained as described under \[generate-api-keys].

*Example:* `rttp4AzwRfYEdQ7R7X8Z/04Y4TZPa97pqCypi3xXxAqftygftnI6H9yGV+OcUOOJeFtZkr8mVwbAndU3Kz4Q+eG`

### Authent

Based on these inputs, `Authent` needs to be computed as follows:

1. Concatenate `postData` + `Nonce` + `endpointPath`
2. Hash the result of step 1 with the [SHA-256 algorithm](https://en.wikipedia.org/wiki/SHA-2)
3. [Base64-decode](https://en.wikipedia.org/wiki/Base64) your `api_secret`
4. Use the result of step 3 to hash the result of the step 2 with the [HMAC-SHA-512 algorithm](https://en.wikipedia.org/wiki/Hash-based_message_authentication_code)
5. [Base64-encode](https://en.wikipedia.org/wiki/Base64) the result of step 4

### Upcoming Changes

| Before                                                                                                                        | After                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Users were required to hash query string parameters before url-encoding for Authent generation, e.g., `greeting=hello world`. | The authentication process will now require hashing the full, url-encoded URI component as it appears in the request, e.g., `greeting=hello%20world`. |

This update is particularly relevant for the batchorder endpoint, which accepts a JSON body in its query parameters.

<Tip>
  For the time being, this change is backward compatible. The API will accept both Authent generation methods described above. However, we aim to phase out the old method (hashing decoded query string parameters) on October 1st, 2025 to maintain the highest security standards. We strongly encourage all users to transition to the new method as soon as possible to ensure seamless service continuity.
</Tip>

### Authentication example

Inclusion of HTTP headers in Java where `apiKey`, `nonce`, and `authent` are determined as described in this section.
For full working examples in different programming languages, see \[Sample Implementations]\[sample-implementations].

```java theme={null}

String url = "https://futures.kraken.com/derivatives/api/v3/sendOrder";

URL obj = new URL(url);
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
...
con.setRequestProperty("APIKey", apiKey);
con.setRequestProperty("Nonce", nonce);
con.setRequestProperty("Authent", authent);
```

## Calls and Returns

### Calls

Calls to endpoints that do not change the state of the server should be submitted with request type `GET` and with request parameters submitted in the URL.
Calls to endpoints that do change the state of the server should be submitted with request type `POST` or `PUT` and with request parameters submitted in the request body.

### Returns

> Example response of a successful call to the `sendorder` endpoint.

```json theme={null}
{
  "result": "success",
  "serverTime": "2016-02-25T09:45:53.818Z",
  "sendStatus": {
    "receivedTime": "2016-02-25T09:45:53.601Z",
    "status": "placed",
    "order_id": "c18f0c17-9971-40e6-8e5b10df05d422f0"
  }
}
```

The API's returns are in JSON format.
If the call was successful, the return includes the requested information or feedback on the requested action.

If a call was successful, the `result` key in the root structure will have the value `success`.

> Example response of a successful call to the `sendorder` endpoint where the desired operation was not performed.

```json theme={null}
{
   "result":"success",
   "serverTime":"2016-02-25T09:45:53.818Z",
   "sendStatus":{
      "receivedTime":"2016-02-25T09:45:53.601Z",
      "status":"insufficientAvailableFunds"
   }
}
```

Note that if a call comes back with `result` equal to `success`, this merely means that the request has been received and assessed successfully.
It does not necessarily mean that the desired operation has been performed.
Details on the operation's status are returned in a status key, where applicable.


# Derivatives WebSocket
Source: https://docs.kraken.com/exchange/guides/futures/websockets

Authentication, subscriptions, and real-time feeds for the Kraken Derivatives WebSocket API

## Endpoint

```text theme={null}
wss://futures.kraken.com/ws/v1
```

## Keeping the connection alive

Send a ping request at least every 60 seconds to keep the connection open. See the [sample implementation](https://github.com/CryptoFacilities/WebSocket-v1-Python/blob/master/cfWebSocketApiV1.py#L138) for reference.

## Snapshots and updates

Most feeds send a snapshot of the current state first, followed by real-time incremental updates.

## Authentication

Private feeds require a signed challenge. The process:

1. Connect to the WebSocket endpoint.
2. Send a request to obtain a challenge (using your `api_key`).
3. Sign the challenge with your `api_secret` (see [Sign challenge](#sign-challenge) below).
4. Include both `original_challenge` and `signed_challenge` in every subscribe/unsubscribe message for private feeds.

## Sign challenge

### Signing steps

Given a `challenge` string:

1. Hash the challenge with [SHA-256](https://en.wikipedia.org/wiki/SHA-2)
2. [Base64-decode](https://en.wikipedia.org/wiki/Base64) your `api_secret`
3. Hash the result of step 1 with the result of step 2 using [HMAC-SHA-512](https://en.wikipedia.org/wiki/Hash-based_message_authentication_code)
4. [Base64-encode](https://en.wikipedia.org/wiki/Base64) the result of step 3

The result of step 4 is the `signed_challenge`.

### Example

| Field              | Value                                                                                      |
| :----------------- | :----------------------------------------------------------------------------------------- |
| `challenge`        | `c100b894-1729-464d-ace1-52dbce11db42`                                                     |
| `api_secret`       | `7zxMEF5p/Z8l2p2U7Ghv6x14Af+Fx+92tPgUdVQ748FOIrEoT9bgT+bTRfXc5pz8na+hL/QdrCVG7bh9KpT0eMTm` |
| `signed_challenge` | `4JEpF3ix66GA2B+ooK128Ift4XQVtc137N9yeg4Kqsn9PI0Kpzbysl9M1IeCEdjg0zl00wkVqcsnG4bmnlMb3A==` |

The challenge is a [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier) string.

## Subscribe request

```json theme={null}
{
  "event": "subscribe",
  "feed": "ticker",
  "product_ids": [
    "PI_XBTUSD",
    "FI_ETHUSD_210625"
  ]
}
```

For private feeds, include the challenge fields:

```json theme={null}
{
  "event": "subscribe",
  "feed": "open_orders",
  "api_key": "<your_api_key>",
  "original_challenge": "<challenge>",
  "signed_challenge": "<signed_challenge>"
}
```


# Spot Atomic Amends
Source: https://docs.kraken.com/exchange/guides/general/amends

How atomic amends work, how they differ from legacy edit transactions, and which fields can be modified in-place without losing queue priority

The atomic amend model is a fast, single phase transaction that enables clients to modify order parameters in-place within the trading engine.

A single order will be maintained across the lifetime of amend transactions. Each amended order will:

* Keep the same order identifiers assigned by Kraken and/or client.
* Keep the execution information on the order for any previous fills.
* Keep queue priority in the order book where possible.

**Example**: using `AmendOrder` endpoint to modify both order quantity and limit price by client order identifier.

```json theme={null}
{
    "nonce": 1695828490,
    "cl_ord_id": "6d1b345e-2821-40e2-ad83-4ecb18a06876",
    "order_qty": "1.25",
    "limit_price": "690795"
}
```

## How atomic amends compare to legacy edit transactions

### Legacy Edit Transactions

The legacy `editOrder` endpoints are implemented using a **cancel-new** transaction model in the engine. This offers an effective and clean model for adjusting many of the core order attributes but also has some disadvantages.

The cancel-new model has multiple phases: a cancel phase, a creation phase for a new order, and a copy phase for order attributes. Latency is introduced as each phase requires validation, persistence, and new identifiers.

Caveats are introduced because the cancel phase loses some order state. Fill information for any executions is attached to the previous order and cannot be copied to the new one.

From a client perspective, legacy edit transactions have the following limitations:

* Latency is introduced due to multiple phases of processing and persistence.
* The client needs to chain order identifiers to track changes to an order.
* Orders always lose priority in the price queue.
* The loss of fill information on the order makes the transaction difficult to use when trading around the market price.

### Atomic Amend Benefits

Atomic amends address these limitations with significant performance gains:

* Atomic amends are **faster than legacy edit transactions** within the engine due to a reduction in phases.
* Atomic amends are **faster than creating a new order** given they adjust the existing order in the book.
* Given the efficiency increase, **higher rate limits** are available on atomic amends. See [trading engine limits](/exchange/guides/general/ratelimits).
* Due to better handling of race conditions, systematic clients are no longer required to initiate their own cancel-new transactions, reducing risk, number of transactions, I/O, and latency.

### API Support

The atomic amend transactions are supported in the following APIs:

* REST [/AmendOrder](/api-reference/trading/amend-order)
* WebSocket v2 [amend\_order](/exchange/api-reference/spot-websocket-v2/amend_order) and v1 [amendOrder](/exchange/api-reference/spot-websocket-v1/amendorder)
* FIX [cancel-replace 35=G](/exchange/api-reference/unified-fix/ocrr)

The amend history for an order can be retrieved using the REST [/OrderAmends](/api-reference/account-data/get-order-amends) endpoint.

### Amending Below Fill Quantity

To keep the behaviour consistent with the client intentions (i.e. not to trade above given order quantity), amending the order quantity to below the filled quantity will be accepted.

The order quantity will be amended to match the filled quantity and the remaining order is canceled back to the client.

In terms of rate limits, if an order is cancelled by an amend it has the standard cancel rate limit penalty.

## Supported Fields

The atomic amend model allows modification of the price and quantity fields. Single or multiple parameters can be amended in a transaction.

* Order limit price.
* Order trigger price.
* Order quantity.
* Display quantity on iceberg orders.

All other order attributes are not amendable. If the order type, margin characteristics or the lifetime attributes (start, end, time-in-force) need to be changed then cancel the existing order and resend a new one.

## Identifiers

The order to be amended can be identified by either:

* **Kraken order identifier**: the Kraken order identifier is unique over all order history and is received following the creation of a new order, e.g. `OGYHBI-KTAUP-5TC3HO`.
* **Client order identifier**: `cl_ord_id` are generated by the client and passed as a parameter on new orders, they are enforced to be unique over open orders and can be a UUID or text string, e.g.`2c6be801-1f53-4f79-a0bb-4ea1c95dfae9`.

### Post Only

For changes to limit price, an additional `post_only` attribute can be added to the transaction. The `post_only` flag will cause the amend to be rejected if the transaction would cause an immediate match in the book. This prevents clients from inadvertently crossing the spread and taking liquidity.

## Queue Priority

The matching engine uses a central limit order book (CLOB) model that matches orders on a price-time priority basis. Keeping queue priority can be important, especially for illiquid assets.

The impact of an amend on queue priority depends on which field is amended, see table below.

| Field             | Amend Up                                                                                                            | Amend Down                                             | Notes                                                         |
| ----------------- | :------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------- | :------------------------------------------------------------ |
| Order Quantity    | Order placed at back of price queue.                                                                                | Order maintains position in price queue.               |                                                               |
| Display Quantity  | Displayed order maintains position in the price queue, the next iceberg reload will be at the new display quantity. | Displayed order maintains position in the price queue. | Iceberg orders only.                                          |
| Order Limit Price | Order placed at back of new price queue.                                                                            | Order placed at back of new price queue.               |                                                               |
| Trigger Price     | No impact.                                                                                                          | No impact.                                             | Trigger based orders are placed in the book after triggering. |

## Iceberg Order Types

Iceberg orders show display size resting in the price queue with the remaining order quantity hidden. When the display quantity fully fills, the iceberg order appends the more quantity to the back of the visible price queue from the hidden residual.

The iceberg display size parameter is a maximum quantity to show in the book, the amount of quantity in the market at any time can be less than display size but never more. Amending display size will always try to maintain queue priority: amending down will maintain existing queue position and amending up will come into effect next reload cycle.

To avoid very granular trading of iceberg orders, there is a restriction on display size which must be greater than or equal to 1/15 of order remaining size. This validation is performed on amendment of both display quantity and order quantity for iceberg orders.

## Chaining of Unacknowledged Requests

For the FIX API, chaining of *unacknowledged* amends and cancels is fully supported. They are guaranteed to be processed in sequence by the API layer and the trading engine.

For websockets API, the sequence of *unacknowledged* amends and cancels is **not** guaranteed. The sequence of transactions is not deterministic, the API hot path depends on the load balancing of processes and threads.

## Caveats

* Orders with conditional close terms attached are not supported by the atomic amend model.


# Choose your protocol
Source: https://docs.kraken.com/exchange/guides/general/api-comparison

REST, WebSocket, and FIX — differences, trade-offs, and when to use each

Kraken's Spot and Derivatives markets run on **separate trading engines**, each with its own endpoints and latency characteristics. The right protocol combination depends on which market you trade.

<Tabs>
  <Tab title="Spot">
    Spot offers three protocols. They share the same rate limit counter — choose based on your latency requirements and feature needs.

    |                       |       REST       |     WebSocket    |     Unified FIX     |
    | :-------------------- | :--------------: | :--------------: | :-----------------: |
    | Connection model      | Request/response |    Persistent    |  Persistent session |
    | Latency profile       | Higher, variable |        Low       | Lowest (colocation) |
    | Market data           |         ✅        |         ✅        |          ✅          |
    | Order entry           |         ✅        |         ✅        |          ✅          |
    | Account data          |         ✅        |         ✅        |          —          |
    | L3 order book         |         ✅        |    ✅ (v2 only)   |          ✅          |
    | Order amend           |         ✅        |         ✅        |    ✅ (MsgType=G)    |
    | Cancel on disconnect  |         —        |         —        |          ✅          |
    | FIX message replay    |         —        |         —        |          ✅          |
    | Funding / Earn        |         ✅        |         —        |          —          |
    | Subaccount management |         ✅        |         —        |          —          |
    | FIX broker allocation |         —        |         —        |    ✅ (Tags 78/79)   |
    | Authentication        |    HMAC-SHA512   | Token (via REST) |   Spot FIX API Key  |
    | Colocation            |         —        |         ✅        |          ✅          |

    <AccordionGroup>
      <Accordion title="REST">
        Best for: operational tasks that don't require real-time streaming — checking balances, querying order history, managing deposits and withdrawals, Earn, sub-account transfers.

        Not recommended for: latency-sensitive order entry or real-time market data. Each request incurs a full HTTP round-trip.

        Base URL: `https://api.kraken.com`
      </Accordion>

      <Accordion title="WebSocket (v2 recommended)">
        Best for: most systematic trading use cases. Real-time order updates, market data streaming, L3 book, and order entry in a single persistent connection. The recommended choice for new integrations.

        Limitations: no Funding or Earn endpoints (use REST for those), no cancel-on-disconnect.

        Endpoint: `wss://ws.kraken.com/v2`
      </Accordion>

      <Accordion title="Unified FIX 4.4">
        Best for: institutional and HFT clients requiring the lowest latency, deterministic message sequencing, cancel-on-disconnect, and session-based message replay. Available for colocated deployments alongside WebSocket.

        Uses a **Spot FIX API Key** pre-configured with the correct permissions. Covers both Spot and Derivatives in a single session.

        Limitations: requires NDA and VIP status for production colocation. Cannot cancel orders from a different FIX session. No account data endpoints.
      </Accordion>
    </AccordionGroup>
  </Tab>

  <Tab title="Derivatives">
    Derivatives has its own trading engine with a separate REST API and WebSocket feed. For lowest-latency order management, use the Unified FIX API.

    |                      |       REST       |        WebSocket       |     Unified FIX     |
    | :------------------- | :--------------: | :--------------------: | :-----------------: |
    | Connection model     | Request/response | Persistent (streaming) |  Persistent session |
    | Latency profile      | Higher, variable |           Low          | Lowest (colocation) |
    | Market data          |         ✅        |            ✅           |          ✅          |
    | Order entry          |         ✅        |            —           |          ✅          |
    | Account data         |         ✅        |            ✅           |          —          |
    | L3 order book        |         —        |            —           |          ✅          |
    | Order amend          |         ✅        |            —           |    ✅ (MsgType=G)    |
    | Cancel on disconnect |         —        |            —           |          ✅          |
    | FIX message replay   |         —        |            —           |          ✅          |
    | Authentication       |    HMAC-SHA512   |         API Key        |   Spot FIX API Key  |
    | Colocation           |         ✅        |            ✅           |          ✅          |

    <Note>
      Derivatives WebSocket is for **streaming market data and account updates only**. Order entry is handled via REST or Unified FIX. Both REST and WebSocket are available for colocated Derivatives deployments.
    </Note>

    <AccordionGroup>
      <Accordion title="Derivatives REST">
        Best for: order management, position queries, account data, funding, and any operation requiring a confirmed response. Available in colocation.

        Base URL: `https://futures.kraken.com/derivatives/api/v3`
      </Accordion>

      <Accordion title="Derivatives WebSocket (streaming only)">
        Best for: real-time market data feeds, account balance updates, and position streaming. Not used for order entry — pair with REST or Unified FIX for order management.

        Endpoint: `wss://futures.kraken.com/ws/v1`

        Available in colocation alongside REST.
      </Accordion>

      <Accordion title="Unified FIX 4.4">
        Best for: lowest-latency order management on Derivatives. Covers both Spot and Derivatives via a single **Spot FIX API Key** — no separate Derivatives FIX credentials required.

        Provides deterministic message sequencing, cancel-on-disconnect, and session-based message replay. Available in colocation.
      </Accordion>
    </AccordionGroup>
  </Tab>

  <Tab title="Spot + Derivatives">
    When trading both markets, each has its own trading engine. The Unified FIX API is the only protocol that covers both markets in a single session.

    | Protocol              | Spot |  Derivatives  | Colocation |
    | :-------------------- | :--: | :-----------: | :--------: |
    | Spot REST             |   ✅  |       —       |      —     |
    | Spot WebSocket        |   ✅  |       —       |      ✅     |
    | Derivatives REST      |   —  |       ✅       |      ✅     |
    | Derivatives WebSocket |   —  | ✅ (streaming) |      ✅     |
    | Unified FIX           |   ✅  |       ✅       |      ✅     |

    **Recommended setup:**

    | Need                               | Protocol                        |
    | :--------------------------------- | :------------------------------ |
    | Spot order entry, low latency      | WebSocket v2 or Unified FIX     |
    | Derivatives order entry            | Unified FIX or Derivatives REST |
    | Spot market data                   | Spot WebSocket v2               |
    | Derivatives market data            | Derivatives WebSocket           |
    | Balances, history, funding         | Spot REST                       |
    | Lowest latency across both markets | Unified FIX (colocation)        |

    <Note>
      Rate limits are separate: Spot limits are shared across Spot REST, WebSocket, and the Spot leg of FIX. Derivatives limits run independently on a per-session basis for FIX and per-account for REST.
    </Note>
  </Tab>
</Tabs>

## Rate limits

| Protocol         | Rate limit scope                                    |
| :--------------- | :-------------------------------------------------- |
| Spot REST        | Account level — shared with Spot WebSocket and FIX  |
| Spot WebSocket   | Account level — shared with Spot REST and FIX       |
| Spot FIX         | Account level — shared with Spot REST and WebSocket |
| Derivatives FIX  | Session level — each FIX session has its own bucket |
| Derivatives REST | Account level — separate from Derivatives FIX       |

<Warning>If you run parallel order management systems across multiple protocols on Spot, they share a single rate counter. A burst on one will affect capacity on the others.</Warning>

## Symbol formats

The same instrument has different identifiers across protocols:

| Instrument                  | REST                    | WebSocket   | FIX (Symbol) |
| :-------------------------- | :---------------------- | :---------- | :----------- |
| Bitcoin / USD               | `XXBTZUSD` or `XBT/USD` | `BTC/USD`   | `XBT/USD`    |
| Ethereum / USD              | `XETHZUSD` or `ETH/USD` | `ETH/USD`   | `ETH/USD`    |
| BTC Perpetual (Derivatives) | `PI_XBTUSD`             | `PI_XBTUSD` | `PI_XBTUSD`  |

<Tip>WebSocket v2 and REST accept the more readable format (e.g. `BTC/USD`). FIX uses the same short format. REST also accepts the legacy Kraken format (e.g. `XXBTZUSD`) for backwards compatibility.</Tip>

## Cancel scope

| Protocol                     | Can cancel orders placed via   |
| :--------------------------- | :----------------------------- |
| REST                         | Any source (REST, WS, FIX, UI) |
| WebSocket                    | Any source (REST, WS, FIX, UI) |
| FIX (single order cancel)    | **Same FIX session only**      |
| FIX (OrderMassCancelRequest) | All orders on the account      |

This is a critical architectural consideration. If your FIX session disconnects and reconnects as a new session, you cannot cancel orders from the previous session using FIX `OrderCancelRequest` — you must use `OrderMassCancelRequest` or fall back to REST/WebSocket.

## Sequencing guarantees

**FIX (sticky routing):** Each FIX session is bound to a specific FIX Gateway instance and follows a deterministic path to the trading engine. New orders and cancels from the same session arrive in order at the engine.

**WebSocket (non-sticky):** Connections are load-balanced. Two messages sent on the same connection may follow different paths and arrive out of order at the engine's inbound queue.

**REST:** No ordering guarantees between separate HTTP requests.

For strategies where the sequence of a cancel and a new order matters (e.g. cancel-replace at a specific price), FIX provides the strongest guarantee.

## WebSocket v1 vs v2

| Feature             | v1            | v2                 |
| :------------------ | :------------ | :----------------- |
| Message format      | Array         | Object             |
| L3 order-by-order   | —             | ✅                  |
| Book checksum       | Updates only  | Snapshot + updates |
| Timestamp precision | Epoch sec, μs | ISO 8601, μs       |
| Trade ID            | —             | Sequential int     |
| New features        | Frozen        | Active development |

v1 is maintained for existing integrations. All new integrations should use v2.

## Related guides

<CardGroup>
  <Card title="Quickstart" icon="rocket" href="/home/guides/quickstart">
    Set up your first API key and place your first order
  </Card>

  <Card title="Order lifecycle" icon="arrows-spin" href="/exchange/guides/general/order-lifecycle">
    How order states and transitions work across all protocols
  </Card>

  <Card title="Colocation and connectivity" icon="server" href="/exchange/guides/general/colocation">
    Low-latency connectivity tiers — from cloud to cross-connect
  </Card>

  <Card title="WebSocket reconnection" icon="rotate" href="/exchange/guides/websockets/reconnection">
    Handle disconnects, re-subscription, and state reconciliation
  </Card>

  <Card title="Rate limits" icon="gauge" href="/exchange/guides/general/ratelimits">
    How rate limits work across REST, WebSocket, and FIX
  </Card>

  <Card title="Error reference" icon="triangle-exclamation" href="/exchange/guides/general/errors">
    Full list of error codes and how to handle them
  </Card>
</CardGroup>


# Spot Client Order Identifiers
Source: https://docs.kraken.com/exchange/guides/general/clordid

How to use cl_ord_id — client-assigned order identifiers — to track and manage orders across REST, WebSocket, and FIX

The `cl_ord_id` parameter enables clients to tag orders with their own text or UUID identifiers for tracking and managing transactions across all Kraken APIs.

## What is cl\_ord\_id?

The `cl_ord_id` terminology is borrowed from Financial Information eXchange (FIX) protocol. It is a parameter used as a "client order identifier" for tracking and managing transactions.

### Why cl\_ord\_id matters

It's essential for clients to communicate about specific orders without confusion, and the `cl_ord_id` provides a unique identifier for each open order. The client assigns a `cl_ord_id` on order placement and Kraken uses this identifier to provide status updates back to the client.

Kraken verifies `cl_ord_id` uniqueness across open orders for each client. FIX protocol extends this uniqueness check to across open orders and FIX session.

The `cl_ord_id` is particularly important when it comes to managing flow. If a client wants to cancel or amend an order, they can provide the `cl_ord_id` of that order in the request.

## Comparing Order Identifiers

Kraken has a range of order identifiers with different characteristics. The client can choose the combination of identifiers to best fit their requirements.

| Characteristic      | cl\_ord\_id                                         | Kraken Id                                                             | Userref                                        |
| ------------------- | --------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------- |
| Format              | string                                              | string                                                                | number                                         |
| Encoding            | UUID, free text                                     | Kraken proprietary                                                    | +/- integer                                    |
| Example             | `d15708c1-dbb6-465d-b77d-47258319cc90`              | `OCNNCT-MEB2I-2XGM7L`                                                 | `123948576`                                    |
| Enforced Uniqueness | Open orders (+ FIX session) per client              | Open and closed orders for all clients                                | None                                           |
| Assigned By         | Client                                              | Kraken                                                                | Client                                         |
| Good For            | Managing daily flow with client preferred id format | Record keeping (unique across all orders over time) and managing flow | Tagging groups of orders with single reference |

<Note>
  `cl_ord_id` and `userref` are mutually exclusive — they cannot both be used on the same order.
</Note>

## Format and Performance

`cl_ord_id` supports 3 different formats, depending on the length of the string:

| Format     | Description                                | Example                                |
| ---------- | ------------------------------------------ | -------------------------------------- |
| Long UUID  | 32 hex characters separated with 4 dashes  | `6d1b345e-2821-40e2-ad83-4ecb18a06876` |
| Short UUID | 32 hex characters with no dashes           | `da8e4ad59b78481c93e589746b0cf91f`     |
| Free text  | Free format ASCII text up to 18 characters | `meme-20240509-00010`                  |

Under the covers, the strings are stored as a 128-bit integer for efficiency and performance. A 128-bit integer is much more space efficient than a 36-character string.

Operations and indexing on integers is more efficient than strings, meaning checking uniqueness and queries for orders can be much faster.

## Example: Order Management with UUID

**New Order:** Client creates a new passive order with UUID as `cl_ord_id`

```json theme={null}
{
    "method": "add_order",
    "params": {
        "order_type": "limit",
        "side": "buy",
        "limit_price": 60299.9,
        "order_qty": 1.0,
        "symbol": "BTC/USD",
        "cl_ord_id": "0835958d-c526-4ad8-aea8-af54836de47e"
    }
}
```

**Cancel Order:** Client cancels the order using `cl_ord_id` (a list of identifiers is supported)

```json theme={null}
{
    "method": "cancel_order",
    "params": {
        "cl_ord_id": [
            "0835958d-c526-4ad8-aea8-af54836de47e"
        ]
    }
}
```

## FIX Protocol Guidelines

In the FIX protocol, the Tags ClOrdID and OrigClOrdID (Tags `11` and `41`) are mapped to the ClOrdID format as described above. This means that these order parameters are no longer limited to INT32. Instead, FIX ClOrdID now supports UUIDs.

The adoption of UUIDs, specifically timestamp-first version 4 UUIDs, significantly improves the efficiency and uniqueness of order identifiers. Unlike traditional INT32 identifiers, UUIDs offer a virtually limitless address space, greatly reducing the risk of identifier collisions and enhancing the robustness of the trading system.

### Timestamp-First v4 UUIDs

* **Structure**: Timestamp-first v4 UUIDs start with a timestamp, ensuring that each generated UUID is unique and sequential based on the time of creation.
* **Uniqueness**: These UUIDs combine the uniqueness of version 4 UUIDs with the time-based ordering, making them ideal for high-frequency trading environments.
* **Compatibility**: They are fully compatible with existing systems that support UUIDs, ensuring a smooth transition and integration.

### Implementation Guidelines

To improve the efficiency of the FIX API, clients are required to send a ClOrdID of either:

* **Ever-Increasing Positive Numbers**: Clients can use ever-increasing positive numbers, such as nanosecond timestamps, to ensure the uniqueness and sequential nature of the identifiers.
  * *Example*: Using the current microsecond timestamp as the ClOrdID, such as `1623448294234000` (the field is max 18 characters)
* **Timestamp-First v4 UUIDs**: Alternatively, clients can adopt timestamp-first v4 UUIDs, which provide a robust and scalable solution for order identification.
  * *Example*: A timestamp-first v4 UUID might look like `1b4e28ba-2fa1-11d2-883f-0016d3cca427`, where the initial part (`1b4e28ba-2fa1`) of the UUID represents the timestamp.


# Colocation and connectivity
Source: https://docs.kraken.com/exchange/guides/general/colocation

Low-latency connectivity options for Kraken's trading infrastructure, from cloud to direct cross-connect

Kraken's core trading infrastructure — both Spot and Derivatives engines — is hosted at Equinix in London. This page covers connectivity options and latency expectations.

## Connectivity tiers

| Option                            | Typical RTT | Requirements                             | APIs available       |
| :-------------------------------- | :---------- | :--------------------------------------- | :------------------- |
| Direct colocation (cross-connect) | \~200 μs    | VIP status, NDA, Equinix London presence | FIX, WebSocket, REST |
| Beeks Financial Cloud             | \~200 μs    | Beeks VPS or Bare Metal subscription     | FIX, WebSocket, REST |
| AWS London (eu-west-2)            | \~2 ms      | IP whitelisting or VPC Peering           | FIX, WebSocket, REST |
| BSO / Avelacom (Tokyo)            | \~140 ms    | Provider subscription                    | FIX, WebSocket, REST |
| BSO / Avelacom (US ↔ London)      | \~60 ms     | Provider subscription                    | FIX, WebSocket, REST |

<Note>REST is available at all connectivity tiers but is not optimised for low-latency order entry. Use FIX or WebSocket for latency-sensitive trading.</Note>

## Direct colocation

Direct colocation gives you a physical cross-connect to Kraken's infrastructure at Equinix London.

**Requirements:**

* VIP client status (existing volume threshold or qualifying planned volume)
* NDA signed with Kraken (datacenter location and cross-connect specs are disclosed under NDA)
* Infrastructure in Equinix London (or plans to deploy)

Once approved, Kraken issues two Letters of Authorization (LOAs) for provisioning dual diverse cross-connects. Contact your Account Manager to begin the onboarding process.

## Beeks Financial Cloud

Beeks provides managed VPS and Bare Metal hosting in Equinix London, in the same campus as Kraken's infrastructure. Latency is comparable to direct cross-connect (\~200 μs app-level RTT).

Beeks is the recommended path for clients who want ultra-low latency without managing their own Equinix cage. Contact [Beeks](https://www.beeksgroup.com) to set up a subscription, then coordinate with your Kraken Account Manager for connectivity.

## AWS London

Connect via public endpoints with IP whitelisting (all tiers) or VPC Peering (VIP clients).

* Latency: \~2 ms
* IP whitelisting instructions are provided during onboarding
* Suitable for systematic strategies that are not latency-critical

## Global connectivity (BSO / Avelacom)

For clients connecting from Tokyo or the US, Kraken partners with BSO and Avelacom for dedicated low-latency cross-border connectivity.

| Route          | Typical latency |
| :------------- | :-------------- |
| London ↔ Tokyo | \~140 ms        |
| London ↔ US    | \~60 ms         |

Both providers offer private, dedicated fiber — not shared internet. Kraken is provider-agnostic; choose based on your existing relationships and geographic requirements.

## Related guides

<CardGroup>
  <Card title="FIX introduction" icon="terminal" href="/exchange/guides/fix/introduction">
    FIX 4.4 session setup, hours of operation, and connectivity details
  </Card>

  <Card title="FIX authentication" icon="lock" href="/exchange/guides/fix/authentication">
    Logon message and session authentication
  </Card>

  <Card title="Choose your protocol" icon="table" href="/exchange/guides/general/api-comparison">
    Latency and feature trade-offs across REST, WebSocket, and FIX
  </Card>
</CardGroup>


# Error messages
Source: https://docs.kraken.com/exchange/guides/general/errors

All error codes returned by the Kraken Spot REST API, organized by category, with causes and handling guidance

Kraken API errors follow a consistent format: a string beginning with a capital-E category prefix, followed by a colon-separated description. Every response includes an `error` array — if non-empty, the request failed.

```json theme={null}
{
  "error": ["EAPI:Invalid key"],
  "result": {}
}
```

## Authentication errors

<AccordionGroup>
  <Accordion title="EAPI:Invalid key">
    **Cause:** The `API-Key` header is missing, malformed, or refers to a key that has been deleted or revoked.

    **Fix:** Verify the key exists in your Kraken account under Settings → API. Regenerate if needed and update your client. Repeated occurrences trigger `EGeneral:Temporary lockout`.
  </Accordion>

  <Accordion title="EAPI:Invalid signature">
    **Cause:** The `API-Sign` header does not match the expected HMAC-SHA512 signature.

    **Common causes:**

    * Wrong API secret (base64-decoded correctly?)
    * Nonce or POST body included in the wrong order
    * Extra whitespace or encoding issue in the payload

    **Fix:** Review the [authentication guide](/exchange/guides/rest/authentication) and reproduce the signature step-by-step. Use the API test endpoint `/0/private/Balance` with a minimal payload to isolate the issue.
  </Accordion>

  <Accordion title="EAPI:Invalid nonce">
    **Cause:** The nonce submitted is less than or equal to the last accepted nonce for this API key.

    **Fix:** Use a monotonically increasing nonce. The most reliable source is the current Unix timestamp in milliseconds. If multiple threads share the same API key, use a counter with a mutex, not the system clock.
  </Accordion>

  <Accordion title="EGeneral:Temporary lockout">
    **Cause:** Too many sequential `EAPI:Invalid key` errors. The account is temporarily locked to prevent brute-force attempts.

    **Fix:** Wait for the lockout to expire (typically a few minutes). Do not retry with the same invalid key — each attempt resets the timer.
  </Accordion>

  <Accordion title="EGeneral:Permission denied">
    **Cause:** The API key exists and authenticated correctly, but does not have the permission required for this endpoint.

    **Fix:** Check which permissions the key has under Settings → API. Add the required permission or use a different key that has it.
  </Accordion>

  <Accordion title="EAuth:Account temporary disabled">
    **Cause:** The account has been temporarily suspended, usually due to security concerns or compliance review.

    **Fix:** Contact Kraken support.
  </Accordion>

  <Accordion title="EAuth:Account unconfirmed">
    **Cause:** The account email has not been verified.

    **Fix:** Complete email verification before making authenticated requests.
  </Accordion>

  <Accordion title="EAuth:Rate limit exceeded / EAuth:Too many requests">
    **Cause:** Too many authentication attempts in a short period.

    **Fix:** Back off and retry. Do not hammer the auth endpoints.
  </Accordion>
</AccordionGroup>

## Order errors

<AccordionGroup>
  <Accordion title="EOrder:Insufficient funds">
    **Cause:** The account does not have enough available balance to place this order (for the quote currency on buys, base currency on sells).

    **Fix:** Check your balance via `/0/private/Balance` or `BalanceEx`. Account for any fees that will be deducted.
  </Accordion>

  <Accordion title="EOrder:Order minimum not met">
    **Cause:** The order volume is below the `ordermin` for this pair.

    **Fix:** Query `/0/public/AssetPairs` and check the `ordermin` field. Increase the order size.
  </Accordion>

  <Accordion title="EOrder:Cost minimum not met">
    **Cause:** The total cost (price × volume) is below the `costmin` for this pair.

    **Fix:** Check `costmin` in `/0/public/AssetPairs`. Increase price or volume so their product exceeds the minimum.
  </Accordion>

  <Accordion title="EOrder:Tick size check failed">
    **Cause:** The price submitted is not a valid multiple of the pair's `tick_size`.

    **Fix:** Round your price to the nearest valid tick. `tick_size` is returned by `/0/public/AssetPairs`.
  </Accordion>

  <Accordion title="EOrder:Invalid price">
    **Cause:** The submitted price is zero, negative, or otherwise invalid.

    **Fix:** Validate price inputs before sending. Market orders should not include a price parameter.
  </Accordion>

  <Accordion title="EOrder:Rate limit exceeded">
    **Cause:** The account's order rate limit counter has reached its threshold.

    **Fix:** See the [rate limits guide](/exchange/guides/rest/ratelimits). Slow down order placement and cancellation. Consider using `amend` instead of cancel + replace.
  </Accordion>

  <Accordion title="EOrder:Orders limit exceeded">
    **Cause:** The account has too many open orders.

    **Fix:** Cancel some open orders before placing new ones. See [rate limits](/exchange/guides/rest/ratelimits) for the open order cap by tier.
  </Accordion>

  <Accordion title="EOrder:Domain rate limit exceeded">
    **Cause:** The domain rate limit (master + all sub-accounts) has been reached.

    **Fix:** Rate limit is shared across all sub-accounts. Reduce order activity across the whole account group. See [sub-accounts](/exchange/guides/general/subaccounts).
  </Accordion>

  <Accordion title="EOrder:Scheduled orders limit exceeded">
    **Cause:** Too many scheduled (trigger) orders are open simultaneously.

    **Fix:** Cancel some scheduled orders before adding more.
  </Accordion>

  <Accordion title="EOrder:Positions limit exceeded">
    **Cause:** The account has reached the maximum number of open margin positions.

    **Fix:** Close existing positions before opening new ones.
  </Accordion>

  <Accordion title="EOrder:Reduce only — variants">
    | Error                                   | Cause                                                                            |
    | :-------------------------------------- | :------------------------------------------------------------------------------- |
    | `EOrder:Reduce only:Non-PC`             | Reduce-only flag submitted on a non-perpetual-contract pair                      |
    | `EOrder:Reduce only:No position exists` | Reduce-only order submitted but no open position exists for this market          |
    | `EOrder:Reduce only:Position is closed` | Order would flip the position — it partially fills and the remainder is canceled |

    **Fix:** Only use `reduce_only` when you have an open position in the matching direction.
  </Accordion>

  <Accordion title="EOrder:Unknown position">
    **Cause:** The referenced position ID does not exist or belongs to a different account.

    **Fix:** Verify the position ID via `/0/private/OpenPositions`.
  </Accordion>
</AccordionGroup>

## Margin errors

<AccordionGroup>
  <Accordion title="EOrder:Cannot open position / EOrder:Cannot open opposing position">
    **Cause:** The account tier or account type is not eligible for margin trading.

    **Fix:** Upgrade your account tier or complete margin trading verification. Check eligibility in your account settings.
  </Accordion>

  <Accordion title="EOrder:Margin allowance exceeded">
    **Cause:** The order would exceed the account's total margin allowance.

    **Fix:** Reduce position size or close existing positions.
  </Accordion>

  <Accordion title="EOrder:Margin level too low">
    **Cause:** The account has insufficient equity or collateral to support this position.

    **Fix:** Add funds or reduce open position size to restore margin level.
  </Accordion>

  <Accordion title="EOrder:Margin position size exceeded">
    **Cause:** The order would cause the account to exceed the maximum allowed position size for this pair.

    **Fix:** Check the pair's position size limit. Reduce order size.
  </Accordion>

  <Accordion title="EOrder:Insufficient margin">
    **Cause:** Kraken's exchange-side margin pool does not have sufficient funds for this trade. This is a platform-level constraint, not an account issue.

    **Fix:** Retry later. If this persists, contact support.
  </Accordion>
</AccordionGroup>

## Service errors

<AccordionGroup>
  <Accordion title="EService:Unavailable">
    **Cause:** The matching engine or API is offline, typically during a maintenance window.

    **Fix:** Check the [system status](https://status.kraken.com) page. Implement backoff and retry logic. Subscribe to the `status` WebSocket channel for advance notice.
  </Accordion>

  <Accordion title="EService:Market in cancel_only mode">
    **Cause:** The market is in `cancel_only` mode — no new orders can be placed, only cancellations.

    **Fix:** Wait for the market to return to normal. Check `SystemStatus` endpoint or the `status` WebSocket channel.
  </Accordion>

  <Accordion title="EService:Market in post_only mode">
    **Cause:** The market is in `post_only` mode — only maker orders are accepted.

    **Fix:** Submit limit orders with `post_only=true`, or wait for normal mode to resume.
  </Accordion>

  <Accordion title="EService:Deadline elapsed">
    **Cause:** The request timed out before the trading engine processed it. Can occur if the `deadline` parameter was set too short, or under high load.

    **Fix:** Increase your deadline or remove it. Before retrying, check `OpenOrders` — the order may have been placed despite the timeout.
  </Accordion>
</AccordionGroup>

## General errors

<AccordionGroup>
  <Accordion title="EGeneral:Invalid arguments">
    **Cause:** The request payload is malformed, missing required parameters, or contains invalid values.

    **Fix:** Validate all parameters against the endpoint documentation before sending. Check for incorrect types (string vs number), missing required fields, or unknown parameters.
  </Accordion>

  <Accordion title="EGeneral:Invalid arguments:Index unavailable">
    **Cause:** Index pricing is unavailable for stop or profit orders on this pair.

    **Fix:** Use a limit price instead of an index-based trigger for this pair.
  </Accordion>

  <Accordion title="EGeneral:Internal error">
    **Cause:** An unexpected error occurred on Kraken's side. The error may include a numeric code (e.g. `EGeneral:Internal error:5`).

    **Fix:** Retry with exponential backoff. If the error persists, contact Kraken support with the full request details and timestamp.
  </Accordion>

  <Accordion title="ETrade:Invalid request">
    **Cause:** The trade request is structurally invalid.

    **Fix:** Review the endpoint documentation. Ensure all required fields are present and correctly typed.
  </Accordion>

  <Accordion title="EAccount:Invalid permissions">
    **Cause:** The account does not have the permissions required to perform this action.

    **Fix:** Contact Kraken support or check account tier requirements.
  </Accordion>
</AccordionGroup>

## Funding errors

| Error                       | Cause                                                                                                |
| :-------------------------- | :--------------------------------------------------------------------------------------------------- |
| `EFunding:Max fee exceeded` | Withdrawal fee exceeds the `max_fee` set in the `Withdraw` request — increase `max_fee` or remove it |
| `EBM:limit exceeded:CAL`    | Exceeded Canadian Acquisition Limits for this cryptocurrency                                         |

## Related guides

<CardGroup>
  <Card title="Authentication" icon="lock" href="/exchange/guides/rest/authentication">
    Signature generation, nonce management, and EAPI error fixes
  </Card>

  <Card title="API key permissions" icon="key" href="/exchange/guides/rest/api-keys">
    Which permissions to grant to avoid EGeneral:Permission denied
  </Card>

  <Card title="Rate limits" icon="gauge" href="/exchange/guides/general/ratelimits">
    How rate limit counters work and how to avoid EOrder:Rate limit exceeded
  </Card>
</CardGroup>

## Error handling patterns

| Scenario                                       | Recommended approach                                                  |
| :--------------------------------------------- | :-------------------------------------------------------------------- |
| `EAPI:Invalid key` or `EAPI:Invalid signature` | Do not retry — fix the authentication logic first                     |
| `EAPI:Invalid nonce`                           | Do not retry the same nonce — generate a fresh one                    |
| `EService:Unavailable`                         | Retry with exponential backoff (start at 1s, cap at 60s)              |
| `EService:Deadline elapsed`                    | Check `OpenOrders` before retrying — the order may have placed        |
| `EOrder:Rate limit exceeded`                   | Back off and reduce order frequency; check counter via `TradeBalance` |
| `EGeneral:Internal error`                      | Retry with backoff; escalate to support if persistent                 |
| Any `EOrder:Insufficient*`                     | Check balances before retrying; do not retry immediately              |


# Spot Example Clients
Source: https://docs.kraken.com/exchange/guides/general/examples

Community and official API client libraries for Spot REST and WebSocket in Python, Go, Java, and more

## Official and community clients

In order to achieve maximum performance, security and flexibility for your particular needs, Kraken strongly encourage the implementation of this API with your own code, and to minimise reliance on third party software.

That being said, in order to aid with rapid development and prototyping, we're in the process of producing 'official' API clients in Python and Golang that will be actively maintained, coincident with the release of newer versions of both our Websockets and REST APIs. In the meantime, our Client Engagement team has compiled a number of [code snippets, examples and Postman collections](https://support.kraken.com/hc/en-us/sections/360003946512-Example-API-Code) that many find useful.

### Third Party Software

The following are some third party API client code libraries that may be useful when writing your own API client.

| Language | Link                                                                                                       |
| -------- | :--------------------------------------------------------------------------------------------------------- |
| C++      | [https://github.com/voidloop/krakenapi](https://github.com/voidloop/krakenapi)                             |
| Golang   | [https://github.com/Beldur/kraken-go-api-client](https://github.com/Beldur/kraken-go-api-client)           |
| Python 3 | [https://github.com/veox/python3-krakenex](https://github.com/veox/python3-krakenex)                       |
| Python 3 | [https://github.com/btschwertfeger/python-kraken-sdk](https://github.com/btschwertfeger/python-kraken-sdk) |
| Julia    | [https://github.com/btschwertfeger/KrakenEx.jl](https://github.com/btschwertfeger/KrakenEx.jl)             |

The following is some third party sample code that can be referenced when writing your own API client.

| Language | Type of Example           | Link                                                                                             |
| -------- | ------------------------- | :----------------------------------------------------------------------------------------------- |
| Python 3 | WebSocket order book feed | [https://github.com/voidloop/krakenapi](https://github.com/voidloop/krakenapi)                   |
| Golang   | WebSocket client          | [https://github.com/Beldur/kraken-go-api-client](https://github.com/Beldur/kraken-go-api-client) |

Please keep in mind that neither Payward nor the third party authors are responsible for losses due to bugs or improper use of the APIs.

Payward has performed an initial review of the safety of the third party code before listing them, but cannot vouch for any changes added since then, or for those that may be stale.

Please [contact our API support team](https://support.kraken.com/hc/en-us/forms/360000104043) if you have any concerns/questions.


# Historical data
Source: https://docs.kraken.com/exchange/guides/general/historical-data

How to access OHLCV history, trade ticks, and order book snapshots for backtesting and research

Kraken's public REST endpoints provide historical market data without authentication. This page covers what's available, the limits per call, and how to paginate efficiently for bulk collection.

## Available data types

| Data type           | Endpoint                    | Depth                      | Authenticated |
| :------------------ | :-------------------------- | :------------------------- | :------------ |
| OHLCV candles       | `GET /0/public/OHLC`        | Up to 720 candles per call | No            |
| Trade ticks         | `GET /0/public/Trades`      | Up to 1000 trades per call | No            |
| Order book snapshot | `GET /0/public/Depth`       | Up to 500 levels per side  | No            |
| Grouped book        | `GET /0/public/GroupedBook` | Configurable tick size     | No            |
| L3 order book       | `POST /0/private/Level3`    | Full book                  | Yes           |

## OHLCV candles

The `OHLC` endpoint returns candlestick data for a given interval.

```bash theme={null}
GET /0/public/OHLC?pair=XBTUSD&interval=1440&since=1700000000
```

**Parameters:**

| Parameter  | Values                                                                | Default          |
| :--------- | :-------------------------------------------------------------------- | :--------------- |
| `pair`     | Instrument name (e.g. `XBTUSD`)                                       | Required         |
| `interval` | `1`, `5`, `15`, `30`, `60`, `240`, `1440`, `10080`, `21600` (minutes) | `1`              |
| `since`    | Unix timestamp — return candles after this time                       | Oldest available |

**Response structure:**

```json theme={null}
{
  "result": {
    "XXBTZUSD": [
      [1700000000, "37000.0", "37500.0", "36800.0", "37200.0", "37100.0", "150.5", 320],
      ...
    ],
    "last": 1700086400
  }
}
```

Each candle: `[time, open, high, low, close, vwap, volume, count]`

**Pagination:** use the `last` value from the response as the `since` parameter in your next call to page forward.

**Depth limits:**

* Maximum 720 candles per call
* Daily candles (`interval=1440`): \~720 days (\~2 years) per call
* Minute candles (`interval=1`): 720 minutes (\~12 hours) per call

**Practical tip for collecting a year of daily data:**

```python theme={null}
import requests, time

def fetch_ohlcv(pair, interval, since=None):
    params = {"pair": pair, "interval": interval}
    if since:
        params["since"] = since
    r = requests.get("https://api.kraken.com/0/public/OHLC", params=params)
    data = r.json()
    result = list(data["result"].values())[0]  # candles
    last = data["result"]["last"]
    return result, last

all_candles = []
since = None

while True:
    candles, last = fetch_ohlcv("XBTUSD", 1440, since)
    if not candles:
        break
    all_candles.extend(candles)
    if since == last:
        break
    since = last
    time.sleep(1)  # respect rate limits
```

## Trade ticks

The `Trades` endpoint returns a time-ordered list of public trades.

```bash theme={null}
GET /0/public/Trades?pair=XBTUSD&since=1700000000000000000&count=1000
```

**Parameters:**

| Parameter | Description                                          |
| :-------- | :--------------------------------------------------- |
| `pair`    | Instrument name                                      |
| `since`   | Nanosecond timestamp — return trades after this time |
| `count`   | Max trades per call (up to 1000)                     |

**Response structure:**

```json theme={null}
{
  "result": {
    "XXBTZUSD": [
      ["37200.00000", "0.05000000", 1700000001.1234, "b", "l", "", 12345678],
      ...
    ],
    "last": "1700000100000000000"
  }
}
```

Each trade: `[price, volume, time, buy/sell, market/limit, miscellaneous, trade_id]`

**Pagination:** use `last` as the `since` value in the next call. The `since` value is in nanoseconds.

**Rate limit note:** the Trades endpoint is public and subject to IP-based rate limits. For bulk historical collection, introduce a delay between requests (100–200ms) to avoid throttling.

## Order book snapshots

The `Depth` endpoint returns the current order book at the time of the request. It is not a historical endpoint — it reflects the live state.

```bash theme={null}
GET /0/public/Depth?pair=XBTUSD&count=100
```

For L3 (order-by-order) book data, use the authenticated `Level3` endpoint:

```bash theme={null}
POST /0/private/Level3
# body: pair=XBT/USD
```

L3 data includes individual `OrderID` values, enabling reconciliation with `ExecutionReport` data from FIX or the `executions` WebSocket channel.

## Futures historical data

Futures provides dedicated historical endpoints under the Futures REST API:

| Data                     | Endpoint                                               |
| :----------------------- | :----------------------------------------------------- |
| OHLCV candles            | `GET /api/charts/v1/{tick_type}/{symbol}/{resolution}` |
| Trade history (fills)    | `GET /derivatives/api/v3/history`                      |
| Historical funding rates | `GET /derivatives/api/v3/historicalfundingrates`       |

```bash theme={null}
# Get BTC perpetual daily candles
GET https://futures.kraken.com/api/charts/v1/trade/PI_XBTUSD/1D

# Get historical funding rates
GET https://futures.kraken.com/derivatives/api/v3/historicalfundingrates?symbol=PI_XBTUSD
```

## Building a backtesting dataset

A practical approach for collecting a clean historical dataset:

<Steps>
  <Step title="Collect OHLCV for your timeframe">
    Start with daily candles to get a broad picture, then drill into minute candles for the periods you need. Use the pagination pattern above.
  </Step>

  <Step title="Augment with trade ticks for microstructure">
    Trade ticks give you the actual execution prices and sizes. Useful for modelling slippage and for tick-by-tick backtesting.
  </Step>

  <Step title="Validate against VWAP">
    Each OHLC candle includes VWAP. Cross-check your collected trade ticks against the VWAP to verify completeness and catch any pagination gaps.
  </Step>

  <Step title="Handle gaps">
    Thin markets or API collection gaps can leave missing candles. Decide upfront how to handle them: forward-fill with the previous close, or exclude those periods from your strategy.
  </Step>
</Steps>

<Note>
  Kraken does not provide a bulk historical data dump or websocket replay service. For very deep history (years of tick data) consider supplementing with third-party data providers.
</Note>

## Rate limits for data collection

Historical data endpoints are public but rate-limited per IP. Recommended safe intervals:

| Endpoint | Safe delay between calls |
| :------- | :----------------------- |
| `OHLC`   | 1 second                 |
| `Trades` | 1–2 seconds              |
| `Depth`  | 1 second                 |

If you need faster collection, distribute requests across multiple IPs or use the FIX market data feed for real-time capture going forward.

## Related guides

<CardGroup>
  <Card title="API comparison" icon="table" href="/exchange/guides/general/api-comparison">
    FIX and WebSocket for real-time market data capture
  </Card>

  <Card title="Rate limits" icon="gauge" href="/exchange/guides/general/ratelimits">
    IP-based rate limits for public data endpoints
  </Card>

  <Card title="WebSocket introduction" icon="bolt" href="/exchange/guides/websockets/introduction">
    Stream live market data for forward capture alongside historical backfill
  </Card>
</CardGroup>


# Spot Level 3 Market Data
Source: https://docs.kraken.com/exchange/guides/general/l3-data

Individual order visibility in the Kraken order book — queue priority, fill probability, and how to access L3 data via WebSocket, FIX, and REST

Level 3 (L3) market data provides visibility of individual orders in the order book. This insight enables determination of queue priorities, resting times, fill probabilities, and many other analytics to help make better informed trading decisions.

## Market Data Levels Overview

Using the Kraken API channels as a reference:

| Level  | Description                                                            | WebSocket channel | FIX           | REST |
| ------ | :--------------------------------------------------------------------- | ----------------- | ------------- | ---- |
| **L1** | Top of the book (best bid/offer) and recent trade data                 | `ticker`          | —             | ✅    |
| **L2** | Individual price levels with aggregated order quantities at each level | `book`            | ✅ (port 4000) | ✅    |
| **L3** | Individual orders in the book with order IDs and timestamps            | `level3`          | ✅ (port 4005) | ✅    |

## Order Visibility

The Level 3 feed shows orders **resting** in the visible order book. The book will never be crossed (i.e. no overlapping buy and sell orders). Therefore, this feed excludes:

* In-flight orders
* Unmatched market orders
* Untriggered stop-loss and take-profit orders
* Hidden quantity of `iceberg` orders

## Use Cases

Level 3 data enables advanced trading analytics:

* **Queue Priority Analysis**: Understand your position in the order queue at each price level
* **Resting Time Metrics**: Track how long orders have been in the book
* **Fill Probability Estimation**: Estimate likelihood of order execution based on queue depth
* **Market Microstructure Analysis**: Study order flow patterns and participant behavior
* **Liquidity Analysis**: Assess true market depth beyond aggregated views

## REST API

The `/private/Level3` endpoint provides a snapshot of the Level 3 order book.

### Example Request

```json theme={null}
{
    "nonce": 1695828490,
    "pair": "BTC/USD",
    "depth": 10
}
```

### Example Response

```json theme={null}
{
    "error": [],
    "result": {
        "pair": "BTC/USD",
        "bids": [
            {
                "price": "90509.00000",
                "qty": "0.04902300",
                "order_id": "ONLALL-67PF5-3CAQCL",
                "timestamp": 1765628335242269554
            },
            {
                "price": "90509.00000",
                "qty": "0.00010000",
                "order_id": "OZMMNG-E5B3K-4DCURI",
                "timestamp": 1765628346024196738
            },
            {
                "price": "90509.00000",
                "qty": "0.14670600",
                "order_id": "OGXZBL-RDLER-I45MMN",
                "timestamp": 1765628373027400852
            },
            {
                "price": "90506.80000",
                "qty": "1.65733300",
                "order_id": "O3YQDB-56ZLD-PYJJCD",
                "timestamp": 1765628373581704382
            }
        ],
        "asks": [
            {
                "price": "90509.10000",
                "qty": "0.00110900",
                "order_id": "OVT3GM-4OLSW-L4PPLG",
                "timestamp": 1765628340224297666
            },
            {
                "price": "90509.10000",
                "qty": "0.02771600",
                "order_id": "OBT7YM-NK4AM-3Z6CZR",
                "timestamp": 1765628349238326760
            },
            {
                "price": "90509.10000",
                "qty": "0.88510000",
                "order_id": "OPFXIF-2BHGV-3NJJTE",
                "timestamp": 1765628369865693932
            },
            {
                "price": "90509.50000",
                "qty": "0.34119400",
                "order_id": "OWMYX7-E63XJ-RHV64F",
                "timestamp": 1765628363316840374
            }
        ]
    }
}
```

## Websockets

For real-time Level 3 data, use the `level3` channel on the authenticated websockets connection. The channel provides:

* Initial snapshot of the order book
* Real-time updates as orders are added, modified, or removed
* Sequence numbers for synchronization

### Building the Book

The `level3` channel synchronizes the initial snapshot and subsequent stream of updates in a similar mechanism to the `book` feed. Only a single subscription request is required to build the book—the channel handles snapshot and update synchronization automatically.

### Checksum Verification

Optional checksum verification provides an additional check that the client version of the book has been constructed correctly and is synchronized to the exchange.

The checksum can be verified in production on every update or periodically depending on requirements. Some clients generate the checksum in the development environment only when building their book models.

See the [Level 3 checksum guide](/exchange/guides/websockets/l3-checksum-v2) for detailed checksum calculation instructions.

## FIX

L3 market data is available via FIX on **port 4005** (Spot L3 Market Data). The FIX feed provides individual order-level data with `OrderID` (Tag 278 / `MDEntryID`) enabling direct reconciliation with `ExecutionReport`s.

* Depth options: 0 (full book), 10, 100, or 1000 levels
* Timestamps: Tag 273 with microsecond precision and full date
* Available over direct colocation and Beeks at `colo-london.vip-ws.kraken.com`

<Tip>
  FIX L3 and WebSocket v2 L3 both carry `OrderID`, so fills in `ExecutionReport`s can be deterministically matched against book entries. This is not possible with L2 data.
</Tip>

## Performance Considerations

The latency differences between the `level3` and `book` feeds will be negligible compared to the transport time. However, here are some performance considerations:

* **Direct Stream**: `level3` is a direct stream of order events from the matching engine. The `book` feed contains cumulative data which is aggregated extremely efficiently in the engine. Consider both channels as streams from the matching engine with a thin API layer.

* **Payload Size**: `level3` data payload is larger than `book`. It takes more time to encode, transmit over the wire, and decode since it describes all orders in the book, not just cumulative quantity at a price level.

* **Channel Load**: The channels are hosted on different market data stacks. `level3` uses an authenticated channel while `book` uses a public channel. Typically, the authenticated channel has less load than the public channel (but this may not always be the case).

* **Checksum Computation**: `level3` checksum takes longer to compute than `book` checksum since it also verifies the sequence of orders in a price level.

* **Latency Metrics**: The timestamps in both feeds enable clients to create latency metrics for detailed performance tracking.


# Order lifecycle
Source: https://docs.kraken.com/exchange/guides/general/order-lifecycle

Every order state, transition, and how to observe them across REST, WebSocket, and FIX

Understanding how an order moves through states is critical for systematic trading. This page documents every state, what triggers each transition, and how to observe them across the three API protocols.

## State machine

```
                    ┌─────────────────────────────┐
                    │           PENDING            │
                    │  Order received, not yet     │
                    │  validated by trading engine │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │             OPEN             │
                    │  Resting in the order book   │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
  ┌───────────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
  │  PARTIALLY FILLED  │ │     FILLED      │ │    CANCELED     │
  │  Some qty matched  │ │  Fully matched  │ │  Canceled by    │
  │  remainder rests   │ │                 │ │  user or system │
  └───────────┬────────┘ └─────────────────┘ └─────────────────┘
              │
  ┌───────────▼──────────────────────────────────────────────┐
  │  CLOSED (fully filled from partial, or canceled partial) │
  └──────────────────────────────────────────────────────────┘
```

## States

| State               | Description                                                                           |
| :------------------ | :------------------------------------------------------------------------------------ |
| `pending`           | Order has been accepted but not yet processed by the trading engine                   |
| `open`              | Order is live in the order book, awaiting a match                                     |
| `partially_filled`  | One or more partial fills have occurred; remainder is still open                      |
| `filled` (closed)   | Order has been fully matched                                                          |
| `canceled` (closed) | Order was canceled — by the user, by COD, by `cancelAllOrdersAfter`, or by the system |
| `expired` (closed)  | GTD (Good Till Date) order whose expiry time was reached                              |

## State transitions

| From               | To                 | Trigger                                                                    |
| :----------------- | :----------------- | :------------------------------------------------------------------------- |
| —                  | `pending`          | Order accepted by OES/FIX Gateway                                          |
| `pending`          | `open`             | Validated and placed in the order book                                     |
| `pending`          | `canceled`         | Validation failure (insufficient funds, invalid params, rate limit)        |
| `open`             | `partially_filled` | Partial match in the trading engine                                        |
| `open`             | `filled`           | Full match in the trading engine                                           |
| `open`             | `canceled`         | User cancel, COD disconnect, `cancelAllOrdersAfter` deadline, `cancelAll`  |
| `open`             | `expired`          | GTD order expiry reached                                                   |
| `partially_filled` | `partially_filled` | Additional partial fill                                                    |
| `partially_filled` | `filled`           | Final fill clears remaining quantity                                       |
| `partially_filled` | `canceled`         | Remaining quantity canceled (IOC residual, user cancel, reduce-only limit) |

## Observing state by API

### REST

Use `OpenOrders` to see live orders and `ClosedOrders` / `QueryOrders` for historical state. The `status` field returns the current state string.

```bash theme={null}
# All open orders
POST /0/private/OpenOrders

# Specific order (open or closed)
POST /0/private/QueryOrders
# body: txid=ORDERTXID1
```

Response includes:

* `status`: `open`, `pending`, `closed`, `canceled`, `expired`
* `vol_exec`: volume filled so far
* `reason`: populated on cancellation (e.g. `"User requested"`, `"Order would trigger immediately"`)
* `amended`: boolean, `true` if the order was ever amended

### WebSocket v2

Subscribe to the `executions` channel for real-time state changes. Every state transition produces a message.

```json theme={null}
{
  "channel": "executions",
  "type": "snapshot" | "update",
  "data": [{
    "exec_type": "new" | "trade" | "canceled" | "expired" | "amended" | "status" | "restated" | "liquidated",
    "order_status": "new" | "partially_filled" | "filled" | "canceled" | "expired",
    "order_id": "ABCDE-12345-XXXXX",
    "qty": 1.0,
    "filled_qty": 0.5,
    "reason": "..."
  }]
}
```

Key `exec_type` values:

| `exec_type`  | Meaning                                                        |
| :----------- | :------------------------------------------------------------- |
| `new`        | Order placed in the book                                       |
| `trade`      | Partial or full fill                                           |
| `canceled`   | Order canceled                                                 |
| `expired`    | GTD expiry                                                     |
| `amended`    | Order was amended (price, quantity, or both)                   |
| `status`     | State confirmation with no change (e.g. on reconnect snapshot) |
| `restated`   | Order state was restated, typically after a system event       |
| `liquidated` | Order was forcibly closed by the risk system                   |

### WebSocket v1

Subscribe to `openOrders` for live state updates. The feed sends a snapshot on subscribe, then incremental updates.

```json theme={null}
[
  { "ORDERTXID": { "status": "open", "vol_exec": "0.50000000" } },
  [{"sequence": 4}]
]
```

### FIX

ExecutionReport (MsgType=8) is the primary message for order state. Key tags:

| Tag | Field       | Values                                                                                                        |
| :-- | :---------- | :------------------------------------------------------------------------------------------------------------ |
| 39  | `OrdStatus` | `0`=New, `1`=Partial fill, `2`=Filled, `4`=Canceled, `6`=Pending cancel, `8`=Rejected, `C`=Expired            |
| 150 | `ExecType`  | `0`=New, `1`=Partial fill, `2`=Fill, `4`=Canceled, `8`=Rejected, `C`=Expired, `D`=Restated, `G`=Trade correct |
| 58  | `Text`      | Human-readable reason on rejection or cancellation                                                            |
| 14  | `CumQty`    | Total quantity filled                                                                                         |
| 151 | `LeavesQty` | Remaining open quantity                                                                                       |

## Amendment and queue priority

When you amend an order, queue priority behaviour depends on what changed:

| Amendment type       | Queue priority                                       |
| :------------------- | :--------------------------------------------------- |
| Reduce quantity only | Preserved — the order keeps its time priority        |
| Increase quantity    | Lost — order moves to back of queue at that price    |
| Change price         | Lost — order moves to back of queue at the new price |

<Tip>For market-making strategies: reducing size without changing price preserves priority. This is a key advantage of `AmendOrder` over cancel-replace (`CancelOrder` + `AddOrder`).</Tip>

## Special cancellation triggers

**Cancel on Disconnect (COD) — FIX only**
When a FIX session disconnects, all orders placed on that session are automatically canceled. COD is configured at the session level during onboarding.

**Dead Man's Switch — all APIs**
`CancelAllOrdersAfter` sets a countdown timer. If not refreshed before expiry, all open orders are canceled. Use this as a safety net against connectivity issues.

```bash theme={null}
POST /0/private/CancelAllOrdersAfter
# body: timeout=60  (seconds)
```

Refresh it periodically from your trading loop. Cancel it by setting `timeout=0`.

**IOC — Immediate or Cancel**
Orders with `time_in_force=IOC` fill immediately at the available best price and the unfilled remainder is instantly canceled with `reason: "Immediate or cancel"`.

**Reduce-only cancellation**
If a reduce-only order would flip a position, it matches as much as possible and the remainder is canceled with `EOrder:Reduce only:Position is closed`.

## Self-trade prevention

Self-trade prevention (STP) prevents your orders from matching against each other. Configure at the order level:

| Mode                    | FIX Tag 7928 | REST `stp_type` | Behaviour                  |
| :---------------------- | :----------- | :-------------- | :------------------------- |
| Cancel newest (default) | `1`          | `cancel-newest` | Arriving order is canceled |
| Cancel oldest           | `2`          | `cancel-oldest` | Resting order is canceled  |
| Cancel both             | `0`          | `cancel-both`   | Both orders are canceled   |

## Related guides

<CardGroup>
  <Card title="API comparison" icon="table" href="/exchange/guides/general/api-comparison">
    Choose between REST, WebSocket, and FIX for order management
  </Card>

  <Card title="Error reference" icon="triangle-exclamation" href="/exchange/guides/general/errors">
    Order error codes and cancellation reason strings
  </Card>

  <Card title="WebSocket reconnection" icon="rotate" href="/exchange/guides/websockets/reconnection">
    Reconcile order state after a disconnect
  </Card>

  <Card title="Order amends" icon="pen" href="/exchange/guides/general/amends">
    Amend price or quantity without losing queue priority
  </Card>

  <Card title="Rate limits" icon="gauge" href="/exchange/guides/general/ratelimits">
    How order placement and cancellation consume rate limit
  </Card>

  <Card title="FIX ExecutionReport" icon="terminal" href="/exchange/api-reference/unified-fix/er">
    FIX MsgType=8 — full field reference for order state messages
  </Card>
</CardGroup>


# Spot Trading Limits
Source: https://docs.kraken.com/exchange/guides/general/ratelimits

Per-pair rate counters, decay rates, and open order limits enforced by the Spot trading engine across REST, WebSocket, and FIX

<Note>
  These limits apply to all protocols (REST, WebSocket, FIX). For REST-specific call counter limits see [REST rate limits](/exchange/guides/rest/ratelimits). For Derivatives limits see [Derivatives rate limits](/exchange/guides/futures/ratelimits).
</Note>

The engine has two categories of limits:

* Rate of transactions.
* Open order count.

The limits are agnostic of the API used, i.e. there is a shared limit across REST, Websockets and FIX.

## Transaction Rate Limits

Each client has a rate counter **per pair**, the count starts at 0 and the count is incremented on each transaction by a given amount depending on the transaction type. The count is decremented over time by a decay rate based on client tier.

When the rate counter threshold is reached, the engine will generate `EOrder:Rate limit exceeded` rejection message.

Note, most clients will never reach the trading rate threshold and the restriction is designed to protect the market / platform when clients trading at higher frequencies with a larger quantity of orders.

### Incrementing the rate counter

The table below shows the increase in the rate counter for different transactions:

* **Fixed count**: this is always applied on receipt of the transaction (even if the transaction fails validation).
* **Decaying count**: this is an additional count depending on the resting time of the order. The size of the count depends on the number of seconds since the order was created or amended.

| Transaction  | Fixed  | \< 5s   | \< 10s  | \< 15s  | \< 45s  | \< 90s  | \< 300s |
| :----------- | ------ | ------- | ------- | ------- | ------- | ------- | ------- |
| Add Order    | +1     | -       | -       | -       | -       | -       | -       |
| Amend Order  | +1     | +3      | +2      | +1      | -       | -       | -       |
| Edit Order   | +1     | +6      | +5      | +4      | +2      | +1      | -       |
| Cancel Order | -      | +8      | +6      | +5      | +4      | +2      | +1      |
| Batch Add    | +(n/2) | -       | -       | -       | -       | -       | -       |
| Batch Cancel | -      | +(8\*n) | +(6\*n) | +(5\*n) | +(4\*n) | +(2\*n) | (1\*n)  |

Note, for batch orders:

* `n` represents the number of orders in a batch.
* If the rate counter in the batch exceeds maximum for a batch cancel, the requests in batch are still accepted.

#### Example: rate counter increase over short order lifetime

Scenario: a client sends a new order and amends the price after 7 seconds. After a further 36 seconds, the client cancels the order from the book, what would be the increase to the rate counter?

| Description                 | Rate Count Change | Rate Count Total |
| :-------------------------- | ----------------- | ---------------- |
| Add order - fixed           | +1                | 1                |
| Amend order - fixed         | +1                | 2                |
| Amend order - decay \< 15s  | +2                | 4                |
| Cancel order - decay \< 45s | +4                | 8                |

The client will have accumulated a total rate counter value of **8** for this specific pair.

This simple example shows the *increase* in rate counter only. In practise the rate counter is also decrementing over time, this will be covered in the next section.

### Decrementing the rate counter

The rate counter is decreased by a **decay rate every second**, the decay rate varies by client tier.

|                         | Starter Tier | Intermediate Tier | Pro Tier |
| ----------------------- | ------------ | ----------------- | -------- |
| Rate counter decay rate | -1           | -2.34             | -3.75    |

#### Example: rate counter decrease over 10 seconds

Scenario: a intermediate tier client has entered a burst of 50 orders and waited 10 seconds, what would be the new rate counter value at the end of the period?

```text theme={null}
rate counter = (50 orders * add order) - (10 seconds * intermediate decay rate) = (50 * 1) - (10 * 2.34) = 26.6
```

### Exceeding rate counter threshold

When the rate counter exceeds the threshold for the client tier, further transactions will be restricted with `EOrder:Rate limit exceeded` rejection until the rate counter has decayed below the threshold.

|                        | Starter Tier | Intermediate Tier | Pro Tier |
| ---------------------- | ------------ | ----------------- | -------- |
| Rate counter threshold | 60           | 125               | 180      |

### Additional rate counter information

* The rate counter values can be monitored in the websockets feeds [openOrders (v1)](/exchange/api-reference/spot-websocket-v1/openorders) or [executions (v2)](/exchange/api-reference/spot-websocket-v2/executions).
* A [rate counter calculator](https://support.kraken.com/hc/en-us/articles/360061656951-Trading-rate-limit-calculator) is available in the support pages.

## Open Order Limits

The open order limit is the maximum number of open orders **per pair**. When the open order threshold is reached, the engine will generate `EOrder:Orders limit exceeded` rejection message.

The maximum open order limit varies per client tier.

|                          | Starter Tier | Intermediate Tier | Pro Tier |
| ------------------------ | ------------ | ----------------- | -------- |
| Max open orders per pair | 60           | 80                | 225      |


# Sub-accounts and multi-account management
Source: https://docs.kraken.com/exchange/guides/general/subaccounts

How to structure and operate multiple accounts via the API — sub-account creation, fund transfers, and FIX broker management

Institutional clients and professional traders often need to manage multiple accounts — separate strategies, separate risk buckets, or managing on behalf of clients. This page covers the API capabilities for multi-account setups.

## Sub-account model

A **master account** can create and manage **sub-accounts** (also called subaccounts). Each sub-account:

* Has its own balance
* Can have its own API keys
* Shares the master account's trading rate limit via the Domain Rate Limit (5× the individual account limit, pooled across all sub-accounts)
* Is accessible from the master account via the sub-account management endpoints

## Creating a sub-account

```bash theme={null}
POST /0/private/CreateSubaccount

# Required permissions: Create & Modify Orders (on master account)
```

**Parameters:**

| Parameter  | Description                         |
| :--------- | :---------------------------------- |
| `username` | Unique username for the sub-account |
| `email`    | Email address for the sub-account   |

```json theme={null}
{
  "error": [],
  "result": true
}
```

After creation, the sub-account owner receives an email to complete setup.

## Transferring funds between accounts

Use `AccountTransfer` to move funds between master and sub-accounts in either direction.

```bash theme={null}
POST /0/private/AccountTransfer
```

**Parameters:**

| Parameter | Description                                  |
| :-------- | :------------------------------------------- |
| `asset`   | Asset to transfer (e.g. `XBT`, `ETH`, `USD`) |
| `amount`  | Amount to transfer                           |
| `from`    | Sending account (username or account ID)     |
| `to`      | Receiving account (username or account ID)   |

```json theme={null}
{
  "error": [],
  "result": {
    "transfer_id": "TOH3AS2-LPCWR8-JDQGEU",
    "status": "complete"
  }
}
```

<Note>Transfers between accounts are instant and do not incur fees. Both accounts must be under the same master account.</Note>

## Per-account API keys

Each sub-account can have its own API keys with independent permission sets. This lets you:

* Give a market data service read-only keys on a sub-account
* Give a strategy read/write keys scoped to that sub-account only
* Revoke a single key without affecting other strategies

Generate keys via [Settings → API](https://www.kraken.com/u/security/api) while logged in to the specific sub-account.

## Domain rate limit

Spot rate limits normally apply at the account level. When using sub-accounts, the **Domain Rate Limit** applies: the master account and all sub-accounts share a pooled limit equal to **5× the individual account limit**.

This gives multi-strategy setups significantly more throughput than running everything on a single account.

| Account type                   | Spot rate limit          |
| :----------------------------- | :----------------------- |
| Single account (Starter)       | Counter threshold: 60    |
| Single account (Intermediate)  | Counter threshold: 125   |
| Single account (Pro)           | Counter threshold: 180   |
| Domain (master + sub-accounts) | 5× individual tier limit |

## FIX broker allocation model

Tags 78 and 79 are not sub-account management — they are part of the **FIX broker model**, which allows a prime broker to allocate orders to client accounts within a single FIX session. This is distinct from Kraken's sub-account feature.

| FIX Tag | Name           | Description                                   |
| :------ | :------------- | :-------------------------------------------- |
| 78      | `NoAllocs`     | Number of allocation entries                  |
| 79      | `AllocAccount` | Client account identifier for this allocation |

A broker uses this to route orders on behalf of multiple end clients without opening a separate FIX session per client. The broker holds a single FIX session and tags each order with the target client account.

<Note>FIX broker allocation via Tags 78/79 was added in May 2025. Contact your Account Manager to enable this for your FIX session.</Note>

## Portfolio-level view

To aggregate balances across master + all sub-accounts, call `Balance` or `BalanceEx` once per account. There is no single endpoint that returns an aggregated portfolio view — you must sum across accounts programmatically.

```python theme={null}
accounts = ["master", "sub1", "sub2", "sub3"]
total_balances = {}

for account in accounts:
    # Use the API key for each account
    balances = get_balance(api_key=keys[account])
    for asset, amount in balances.items():
        total_balances[asset] = total_balances.get(asset, 0) + float(amount)
```

## Futures sub-accounts

Futures has its own sub-account management:

```bash theme={null}
# List sub-accounts
GET /derivatives/api/v3/subaccounts

# Check trading enabled status
GET /derivatives/api/v3/subaccount/{subaccountUid}/trading-enabled

# Enable/disable trading
PUT /derivatives/api/v3/subaccount/{subaccountUid}/trading-enabled
```

Futures also supports cross-account transfers:

```bash theme={null}
POST /derivatives/api/v3/transfer/subaccount
```

## Common patterns

**Strategy isolation:** create one sub-account per strategy. Each strategy has its own balance, its own API keys, and its own risk perimeter. A blown strategy can't draw from other strategies' funds.

**Read-only monitoring:** create a sub-account with Query Funds + Query Open Orders keys only. Use this for your monitoring dashboard, keeping trading keys separate.

**Gradual rollout:** fund a sub-account with a small allocation while testing a new strategy in production. Scale up by transferring more funds once validated.

## Related guides

<CardGroup>
  <Card title="API key permissions" icon="key" href="/exchange/guides/rest/api-keys">
    Configure independent permission sets for each sub-account's keys
  </Card>

  <Card title="Rate limits" icon="gauge" href="/exchange/guides/general/ratelimits">
    Domain rate limit — how throughput pools across master and sub-accounts
  </Card>

  <Card title="API comparison" icon="table" href="/exchange/guides/general/api-comparison">
    Sub-account management across REST and FIX (Tags 78/79)
  </Card>
</CardGroup>


# Exchange overview
Source: https://docs.kraken.com/exchange/guides/overview

Spot and Derivatives trading APIs — REST, WebSocket, and FIX for algorithmic trading, market making, and HFT

Kraken's Exchange APIs give you programmatic access to two separate trading engines — **Spot** and **Derivatives** — each with its own endpoints, rate limits, and authentication flows.

## Markets

|                 | Spot                                                            | Derivatives                                          |
| :-------------- | :-------------------------------------------------------------- | :--------------------------------------------------- |
| Markets         | 700+ crypto pairs                                               | Perpetuals and dated contracts on BTC, ETH, and more |
| Order types     | Limit, market, stop, take-profit, trailing stop, IOC, post-only | Limit, market, stop, take-profit, IOC                |
| Base URL (REST) | `https://api.kraken.com`                                        | `https://futures.kraken.com`                         |
| WebSocket       | `wss://ws.kraken.com/v2`                                        | `wss://futures.kraken.com/ws/v1`                     |
| Sandbox         | UAT available on request via Account Manager                    | `https://demo-futures.kraken.com` (self-service)     |

## Protocols

All three protocols are available for both Spot and Derivatives, but with different capabilities on each engine.

| Protocol      | Best for                                                                           |
| :------------ | :--------------------------------------------------------------------------------- |
| **REST**      | Account operations, funding, one-off queries                                       |
| **WebSocket** | Real-time market data, order management, and balance updates                       |
| **FIX 4.4**   | Institutional and HFT — deterministic sequencing, cancel-on-disconnect, colocation |

See [Choose your protocol](/exchange/guides/general/api-comparison) for a full feature matrix, latency comparison, and guidance on which protocol to use.

## Workflows

| Workflow                | What you need                                            | Where to start                                               |
| :---------------------- | :------------------------------------------------------- | :----------------------------------------------------------- |
| **Market data**         | Public endpoints — no API key needed                     | REST `GET /0/public/*` or WebSocket public channels          |
| **Algorithmic trading** | Private order endpoints + real-time execution data       | REST or WebSocket v2 `executions` channel                    |
| **Market making**       | Low-latency order entry, live book, cancel-on-disconnect | WebSocket v2 or FIX                                          |
| **Account management**  | Balances, ledger, funding                                | REST private endpoints                                       |
| **HFT**                 | Deterministic sequencing, colocation, FIX replay         | FIX 4.4 or WebSocket (Spot); REST or WebSocket (Derivatives) |
| **Sub-accounts**        | Multi-account management                                 | REST `CreateSubaccount`, FIX Tags 78/79                      |
| **Earn**                | Allocate/deallocate to staking products                  | REST Earn endpoints                                          |

## Feature matrix

| Feature      | Spot REST | Spot WebSocket | Spot FIX | Derivatives REST | Derivatives WebSocket | Derivatives FIX |
| :----------- | :-------: | :------------: | :------: | :--------------: | :-------------------: | :-------------: |
| Market data  |     ✅     |        ✅       |     ✅    |         ✅        |           ✅           |        ✅        |
| Order entry  |     ✅     |        ✅       |     ✅    |         ✅        |           —           |        ✅        |
| Account data |     ✅     |        ✅       |     —    |         ✅        |           ✅           |        —        |
| Funding      |     ✅     |        —       |     —    |         ✅        |           —           |        —        |
| Earn         |     ✅     |        —       |     —    |         —        |           —           |        —        |
| Subaccounts  |     ✅     |        —       |     —    |         ✅        |           —           |        —        |

## Performance and hosting

For latency-sensitive strategies, Kraken offers connectivity options from AWS London (\~2 ms) to direct colocation at Equinix London (\~200 μs). See [Colocation and connectivity](/exchange/guides/general/colocation) for the full breakdown.

## Getting started

<CardGroup>
  <Card title="Choose your protocol" icon="table" href="/exchange/guides/general/api-comparison">
    Detailed comparison of REST, WebSocket, and FIX for each market
  </Card>

  <Card title="API key permissions" icon="key" href="/exchange/guides/rest/api-keys">
    Understand which permissions to enable for your use case
  </Card>

  <Card title="Authentication" icon="lock" href="/exchange/guides/rest/authentication">
    Nonce management and HMAC-SHA512 signature generation
  </Card>

  <Card title="Order lifecycle" icon="arrows-spin" href="/exchange/guides/general/order-lifecycle">
    How order states and transitions work across all protocols
  </Card>

  <Card title="Error reference" icon="triangle-exclamation" href="/exchange/guides/general/errors">
    Common errors and how to fix them
  </Card>

  <Card title="Rate limits" icon="gauge" href="/exchange/guides/general/ratelimits">
    How rate limits work across REST, WebSocket, and FIX
  </Card>
</CardGroup>


# API key permissions
Source: https://docs.kraken.com/exchange/guides/rest/api-keys

Which API key permissions to enable for each use case

When creating an API key at [Settings → API](https://www.kraken.com/u/security/api), Kraken asks you to select permissions. Granting too few causes `EGeneral:Permission denied` errors. Granting too many exposes you to unnecessary risk if the key is compromised.

## Permissions by use case

| Use case                                  | Required permissions                                                                                          |
| :---------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| Market data only (public endpoints)       | None — public endpoints require no key                                                                        |
| Read account balances                     | Query Funds                                                                                                   |
| Read order history and positions          | Query Open Orders & Trades, Query Closed Orders & Trades                                                      |
| Algorithmic spot trading                  | Query Funds, Query Open Orders & Trades, Create & Modify Orders, Cancel/Close Orders                          |
| Market making                             | Query Funds, Query Open Orders & Trades, Create & Modify Orders, Cancel/Close Orders, **Get WebSocket Token** |
| Funding operations (deposits/withdrawals) | Query Funds, Deposit Funds, Withdraw Funds                                                                    |
| Full institutional access                 | All of the above                                                                                              |
| Read-only monitoring dashboard            | Query Funds, Query Open Orders & Trades, Query Closed Orders & Trades                                         |
| Sub-account management                    | Query Funds, Create & Modify Orders, Cancel/Close Orders                                                      |

## Permission descriptions

| Permission                   | What it enables                                                                                        |
| :--------------------------- | :----------------------------------------------------------------------------------------------------- |
| Query Funds                  | `Balance`, `BalanceEx`, `TradeBalance`                                                                 |
| Query Open Orders & Trades   | `OpenOrders`, `QueryOrders`, `TradesHistory`, `QueryTrades`, `OpenPositions`                           |
| Query Closed Orders & Trades | `ClosedOrders`, `QueryOrders`, `TradesHistory`, `QueryTrades`                                          |
| Create & Modify Orders       | `AddOrder`, `EditOrder`, `AmendOrder`, `AddOrderBatch`                                                 |
| Cancel/Close Orders          | `CancelOrder`, `CancelAll`, `CancelAllOrdersAfter`, `CancelOrderBatch`                                 |
| Query Ledger Entries         | `Ledgers`, `QueryLedgers`                                                                              |
| Export Data                  | `AddExport`, `ExportStatus`, `RetrieveExport`, `RemoveExport`                                          |
| Access WebSocket API         | `GetWebSocketsToken` — required for authenticated WebSocket subscriptions                              |
| Deposit Funds                | `DepositMethods`, `DepositAddresses`, `DepositStatus`                                                  |
| Withdraw Funds               | `WithdrawMethods`, `WithdrawAddresses`, `WithdrawInfo`, `Withdraw`, `WithdrawStatus`, `WithdrawCancel` |
| Earn                         | `Earn/Strategies`, `Earn/Allocations`, `Earn/Allocate`, `Earn/Deallocate`                              |

## Security best practices

**Use IP whitelisting.** Lock your API key to the IP addresses your trading system runs from. This single measure prevents almost all key misuse even if the key is leaked.

**Use separate keys per purpose.** Give your market data service a read-only key. Give your order management system a trading key. Give your accounting system a ledger query key. If one is compromised, the blast radius is contained.

**Never embed keys in source code.** Use environment variables or a secrets manager. Rotate keys periodically.

**Set the minimum permissions required.** A key used only for placing orders does not need `Withdraw Funds`.

<Warning>
  Withdrawal permissions should only be enabled on keys that genuinely need to move funds, and those keys should have strict IP whitelisting. A compromised key with withdrawal permissions is a direct financial risk.
</Warning>

## WebSocket authentication

WebSocket private channels (executions, balances, open orders) require a short-lived token rather than your API key directly. Obtain it via the REST endpoint before opening your WebSocket connection:

```bash theme={null}
POST /0/private/GetWebSocketsToken
```

The token is valid for 15 minutes. Your API key must have the **Access WebSocket API** permission enabled.

```json theme={null}
{
  "error": [],
  "result": {
    "token": "WW91ciBhdXRoZW50aWNhdGlvbiB0b2tlbiBnb2VzIGhlcmUu",
    "expires": 900
  }
}
```

Use this token in your WebSocket subscription messages — never send your API key directly over WebSocket.

## Related guides

<CardGroup>
  <Card title="Authentication" icon="lock" href="/exchange/guides/rest/authentication">
    HMAC-SHA512 signature generation and nonce management
  </Card>

  <Card title="Sub-accounts" icon="users" href="/exchange/guides/general/subaccounts">
    Issue independent API keys per sub-account for strategy isolation
  </Card>

  <Card title="WebSocket authentication" icon="bolt" href="/exchange/guides/websockets/authentication">
    How to use your WebSocket token in subscription messages
  </Card>
</CardGroup>


# Spot REST Authentication
Source: https://docs.kraken.com/exchange/guides/rest/authentication

HMAC-SHA512 signature generation, nonce management, API-Key header, and two-factor authentication for the Spot REST API

## Authentication Parameters

For the REST API, the following parameters are used for authentication to endpoints which contain private data:

* `API-Key` HTTP header parameter: the public key from your API key-pair.
* `API-Sign` HTTP header parameter: encrypted signature of message.
* `nonce` payload parameter: always increasing, unsigned 64-bit integer.
* `otp` payload parameter: one-time-password and is only required if additional 2FA is configured for API.

## Setting the API-Key Parameter

The value for the `API-Key` HTTP header parameter is your **public** API key.

An API key-pair is required to access the authenticated endpoints, see [How to Create an API Key](https://support.kraken.com/hc/en-us/articles/360000919966-How-to-create-an-API-key).

<Warning>
  From your API key-pair, clearly identify which key is public and which key is private.

  * The **public** key is sent in the `API-Key` header parameter.
  * The **private** key is **never** sent, it is only used to encode the signature for `API-Sign` header parameter.
</Warning>

## Setting the API-Sign Parameter

The value for the `API-Sign` HTTP header parameter is a signature generated from encoding your **private** API key, nonce, encoded payload, and URI path.

```text theme={null}
  HMAC-SHA512 of (URI path + SHA256(nonce + POST data)) and base64 decoded secret API key
```

Note: The URI path used for API-Sign should be the part starting with "/0/private" of the API URL.

### Examples

The following is a specific example of a signature generated with a particular private key, nonce, and payload corresponding to a new limit order (buy 1.25 XBTUSD at \$37,500).If your code is generating a different signature (`API-Sign`) for this example, then there is likely an issue with your application of the above methodology. Code snippets for generating the signature in Python, Golang and Node.js follow below.

| Field           | Value                                                                                        |
| --------------- | :------------------------------------------------------------------------------------------- |
| Private Key     | kQH5HW/8p1uGOVjbgWA7FunAmGO8lsSUXNsu3eow76sz84Q18fWxnyRzBHCd3pd5nE9qa99HAZtuZuj6F1huXg==     |
| Nonce           | 1616492376594                                                                                |
| Encoded Payload | nonce=1616492376594\&ordertype=limit\&pair=XBTUSD\&price=37500\&type=buy\&volume=1.25        |
| URI Path        | /0/private/AddOrder                                                                          |
| **API-Sign**    | **4/dpxb3iT4tp/ZCVEwSnEsLxx0bqyhLpdfOpc6fn7OR8+UClSV5n9E6aSS8MPtnRfp32bAb0nmbRn6H8ndwLUQ==** |

<Tabs>
  <Tab title="Python">
    ```py theme={null}
    import urllib.parse
    import hashlib
    import hmac
    import base64

    def get_kraken_signature(urlpath, data, secret):

        if isinstance(data, str):
            encoded = (str(json.loads(data)["nonce"]) + data).encode()
        else:
            encoded = (str(data["nonce"]) + urllib.parse.urlencode(data)).encode()
        message = urlpath.encode() + hashlib.sha256(encoded).digest()

        mac = hmac.new(base64.b64decode(secret), message, hashlib.sha512)
        sigdigest = base64.b64encode(mac.digest())
        return sigdigest.decode()

    api_sec = "kQH5HW/8p1uGOVjbgWA7FunAmGO8lsSUXNsu3eow76sz84Q18fWxnyRzBHCd3pd5nE9qa99HAZtuZuj6F1huXg=="

    payload = {
            "nonce": "1616492376594",
            "ordertype": "limit",
            "pair": "XBTUSD",
            "price": 37500,
            "type": "buy",
            "volume": 1.25
            }

    signature = get_kraken_signature("/0/private/AddOrder", payload, api_sec)
    print("API-Sign: {}".format(signature))

    ```
  </Tab>

  <Tab title="Go">
    ```go theme={null}
    package main

    import (
        "crypto/hmac"
        "crypto/sha256"
        "crypto/sha512"
        "encoding/base64"
        "net/url"
        "fmt"
        "encoding/json"
        "strings"

        )

        func getKrakenSignature(urlPath string, data interface{}, secret string) (string, error) {
            var encodedData string

            switch v := data.(type) {
            case string:
                var jsonData map[string]interface{}
                if err := json.Unmarshal([]byte(v), &jsonData); err != nil {
                    return "", err
                }
                encodedData = jsonData["nonce"].(string) + v
            case map[string]interface{}:
                dataMap := url.Values{}
                for key, value := range v {
                    dataMap.Set(key, fmt.Sprintf("%v", value))
                }
                encodedData = v["nonce"].(string) + dataMap.Encode()
            default:
                return "", fmt.Errorf("invalid data type")
            }
            sha := sha256.New()
            sha.Write([]byte(encodedData))
            shaSum := sha.Sum(nil)

            message := append([]byte(urlPath), shaSum...)
            secretDecoded, err := base64.StdEncoding.DecodeString(secret)
            if err != nil {
                return "", err
            }
            mac := hmac.New(sha512.New, secretDecoded)
            mac.Write(message)
            macSum := mac.Sum(nil)
            sigDigest := base64.StdEncoding.EncodeToString(macSum)
            return sigDigest, nil
        }

        func main() {

            apiSecret := "kQH5HW/8p1uGOVjbgWA7FunAmGO8lsSUXNsu3eow76sz84Q18fWxnyRzBHCd3pd5nE9qa99HAZtuZuj6F1huXg=="

            payload := map[string]interface{}{
                "nonce":     "1616492376594",
                "ordertype": "limit",
                "pair":      "XBTUSD",
                "price":     37500,
                "type":      "buy",
                "volume":    1.25,
            }

            signature, err := getKrakenSignature("/0/private/AddOrder", payload, apiSecret)
            if err != nil {
                fmt.Println("Error generating signature:", err)
                return
            }
            fmt.Printf("API-Sign: %s\n", signature)
        }
    ```
  </Tab>

  <Tab title="Node JS">
    ```js theme={null}
    const crypto = require('crypto');
    const querystring = require('querystring');

    // Function to get Kraken signature
    function getKrakenSignature(urlPath, data, secret) {
      let encoded;
      if (typeof data === 'string') {
        const jsonData = JSON.parse(data);
        encoded = jsonData.nonce + data;
      } else if (typeof data === 'object') {
        const dataStr = querystring.stringify(data);
        encoded = data.nonce + dataStr;
      } else {
        throw new Error('Invalid data type');
      }

      const sha256Hash = crypto.createHash('sha256').update(encoded).digest();
      const message = urlPath + sha256Hash.toString('binary');
      const secretBuffer = Buffer.from(secret, 'base64');
      const hmac = crypto.createHmac('sha512', secretBuffer);
      hmac.update(message, 'binary');
      const signature = hmac.digest('base64');
      return signature;
    }

    const apiSec = 'kQH5HW/8p1uGOVjbgWA7FunAmGO8lsSUXNsu3eow76sz84Q18fWxnyRzBHCd3pd5nE9qa99HAZtuZuj6F1huXg==';

    const payload = {
      nonce: '1616492376594',
      ordertype: 'limit',
      pair: 'XBTUSD',
      price: 37500,
      type: 'buy',
      volume: 1.25,
    };

    const signature = getKrakenSignature('/0/private/AddOrder', payload, apiSec);
    console.log(`API-Sign: ${signature}`);
    ```
  </Tab>
</Tabs>

## Setting the nonce Parameter

The value for the `nonce` payload body parameter is an always increasing, unsigned 64-bit integer for each request that is made with a particular API key.

While a simple counter would provide a valid nonce, a more usual method of generating a valid nonce is to use e.g. a UNIX timestamp in milliseconds. There is no way to reset the nonce for an API key to a lower value, so be sure to use a nonce generation method that won't produce numbers less than the previous nonce.

Too many requests with invalid nonces (EAPI:Invalid nonce) can result in temporary bans.

Problems can arise from requests arriving out of order due to API keys being shared across processes, or from system clock drift/recalibration. An optional "nonce window" can be configured to specify a tolerance between nonce values.

Additional info can be found in our [support pages](https://support.kraken.com/hc/en-us/articles/360000906023-What-is-a-nonce-).

### Examples

The following are some examples of how to generate valid millisecond resolution nonce values in different programming languages:

<Tabs>
  <Tab title="Python">
    ```py theme={null}
    import time

    api_nonce = str(int(time.time() * 1000))
    ```
  </Tab>

  <Tab title="Go">
    ```go theme={null}
    import (
        "fmt"
        "time"
    )

    apiNonce := fmt.Sprintf("%d", time.Now().UnixMilli())
    ```
  </Tab>

  <Tab title="Node JS">
    ```js theme={null}
    const apiNonce = Date.now().toString();
    ```
  </Tab>
</Tabs>

## Setting the otp Parameter

The optional value for the `otp` payload body parameter is your one-time-password.

This parameter is only required if two-factor authentication (2FA) is enabled for the API key and action in question. The 2FA authentication is not needed for Websocket and FIX APIs.


# Spot REST Earn
Source: https://docs.kraken.com/exchange/guides/rest/earn

How to allocate and deallocate funds to Kraken Earn strategies, check allocation status, and understand geo restrictions

The earn API allows interacting with all of Kraken's yield generating products. It replaces the old `/staking` part of the API.

The different available earn products are represented by earn strategies. This corresponds to the legacy `Staking/Assets`. `Stake`/`Unstake` are replaced by `Allocate`/`Deallocate`.

## Available Earn endpoints

* `Strategies` - list all earn strategies for which you are eligible or have a balance.
* `Allocations` - lists the balance in your earn account for each strategy. Requires the `Query Funds` API key permission.
* `Allocate`/`Deallocate` - allocate/deallocate to an earn strategy through an async operation. Requires the `Earn Funds` API key permission.
* `AllocateStatus`/`DeallocateStatus` - verifies the state of the last allocation/deallocation. Requires the `Earn Funds` or `Query Funds` API key permission.

## Common workflows

### Determine which funds are earning rewards

1. Call `Strategies` to obtain information about the relevant strategy. The `lock_type` field shows whether bonding/unbonding funds are earning yield. The relevant fields are `bonding_rewards`/`unbonding_rewards`.
2. Call `Allocations` for the relevant strategy. From the previous step, for strategies where bonding/unbonding does not earn yield, substract these balances from `amount_allocated.total` to determine which balances are currently earning.

### Get allocatable balance

Call `/0/private/BalanceEx`, subtract `hold_trading` amount. Remaining balance is available for allocation to a strategy.

### Geo restrictions

Some earn strategies are not available in all geographic regions. `Strategies` will return only strategies available to the caller.


# Spot REST Funding (Beta)
Source: https://docs.kraken.com/exchange/guides/rest/funding

How to save withdrawal addresses, create withdrawals, and claim deposit addresses with the Funding (Beta) API

The Funding (Beta) API replaces the legacy `/0/private` funding endpoints with stable IDs, reusable
address scopes, and fee pinning. Relative to v0, the main gains are:

* **Stable IDs** for methods, networks, and addresses. Integrations are not tied to fragile
  display-name strings
* **Reusable withdrawal addresses.** Save once at network or network-group scope and use across
  methods
* **Fee pinning.** Lock a quoted fee rate with a fee token so automated withdrawals are insulated
  from fee changes between quote and submit
* **Simpler Query Funds permissioning** for read-only endpoints. Monitoring keys no longer need
  compound Withdraw or Deposit permissions (a Query Funds-only key can therefore access more via
  these endpoints than it could on the legacy API, including withdrawal addresses and history).
  See [New Funding Endpoints - Permission Changes From Legacy](https://support.kraken.com/articles/funding-api-v1).

This guide covers:

1. Adding a withdrawal address
2. Creating a withdrawal
3. Claiming a deposit address and depositing crypto

Authentication uses the same API key and secret as the rest of the Kraken REST API. For key
setup, see [Spot REST Authentication](/exchange/guides/rest/authentication). Funding requests sign each
call and send `api-key`, `api-sign`, and `api-nonce` headers as shown in the helper below (the
signed path includes the query string). Schemas are in the
[Funding API reference](/api-reference/funding-beta/list-funding-methods).

## Prerequisites

* A Kraken account with an API key that includes the funding permissions you need. See
  [Permission Changes From Legacy](https://support.kraken.com/articles/funding-api-v1)
  for how those permissions differ from the legacy endpoints, and
  [Withdrawal addresses API permission Risks](https://support.kraken.com/articles/withdrawal-addresses-api-permission)
  for the risks of Add withdrawal addresses.
* Your API secret for request signing
* For withdrawals: a funded balance and a verified destination address

### Shared Python helper

The examples below call this helper. Nested query objects are encoded as `asset[class]=…`
style parameters, matching what these Funding API endpoints expect.

```python theme={null}
import base64
import hashlib
import hmac
import json
import time
import urllib.parse
import urllib.request

BASE_URL = "https://api.kraken.com"
API_KEY = "YOUR_API_KEY"
API_SECRET = "YOUR_API_SECRET"  # base64-encoded

_last_nonce = 0


def _nonce() -> str:
    global _last_nonce
    candidate = int(time.time() * 1000)
    _last_nonce = max(candidate, _last_nonce + 1)
    return str(_last_nonce)


def _query(params: dict | None) -> str:
    if not params:
        return ""
    pairs: list[tuple[str, str]] = []

    def add(name: str, value) -> None:
        if isinstance(value, dict):
            for child_name, child_value in value.items():
                add(f"{name}[{child_name}]", child_value)
        elif isinstance(value, bool):
            pairs.append((name, "true" if value else "false"))
        elif value is not None:
            pairs.append((name, str(value)))

    for key, value in params.items():
        add(key, value)
    return urllib.parse.urlencode(pairs)


def funding_request(
    method: str,
    path: str,
    params: dict | None = None,
    body: dict | None = None,
):
    """Send a signed Funding API request."""
    nonce = _nonce()
    query = _query(params)
    signed_path = f"{path}?{query}" if query else path
    body_bytes = (
        json.dumps(body, separators=(",", ":")).encode() if body is not None else b""
    )
    digest = hashlib.sha256(nonce.encode() + body_bytes).digest()
    signature = base64.b64encode(
        hmac.new(
            base64.b64decode(API_SECRET),
            signed_path.encode() + digest,
            hashlib.sha512,
        ).digest()
    ).decode()

    headers = {
        "api-key": API_KEY,
        "api-sign": signature,
        "api-nonce": nonce,
    }
    if body is not None:
        headers["content-type"] = "application/json"

    request = urllib.request.Request(
        f"{BASE_URL}{signed_path}",
        data=body_bytes or None,
        headers=headers,
        method=method,
    )
    with urllib.request.urlopen(request) as response:
        return json.loads(response.read().decode())
```

## Section 1: Adding a withdrawal address

In the new Funding API, each saved withdrawal address is stored against exactly one
**scope**: a funding method, a network, or a network group. The scope you choose controls which
withdrawals can use that address later.

| Scope         | Field              | Address can be used with                         |
| ------------- | ------------------ | ------------------------------------------------ |
| Network group | `network_group_id` | Any withdraw method on any network in that group |
| Network       | `network_id`       | Any withdraw method on that network              |
| Method        | `method_id`        | Only that single method                          |

### How networks and methods group together

Funding methods sit under networks, and related networks sit under network groups:

```
Network group   (for example, EVM)
  └── Network   (for example, Ethereum)
        └── Method   (for example, USDC on Ethereum)
```

Broader scope means more reuse. Saving once at the EVM network-group level means you do not
need a separate saved address for every EVM method underneath it. Saving at the Ethereum
network level reuses the address across assets on Ethereum. Saving at the method level limits
the address to that one route.

<Note>
  Addresses saved against a `network` or `network_group` scope are fully usable through the API
  today, but they do not yet appear in the Kraken website withdrawal address book. Frontend
  support for these broader scopes is planned soon.

  Managing fiat withdrawal addresses through the Funding API is not available at this time. The
  address book endpoints support crypto withdrawal addresses only. Fiat withdrawals can still be
  submitted with
  [Create Funding Withdrawal](/api-reference/funding-beta/create-funding-withdrawal) using fiat
  addresses added via the Kraken UI.
</Note>

### Which addresses are returned when you list

Listing expands **upward** only. The filter you pass decides how far up the tree the response
looks:

```mermaid theme={null}
flowchart TB
  groupScoped["Address saved at network_group"]
  networkScoped["Address saved at network"]
  methodScoped["Address saved at method"]

  listGroup["List by network_group"] --> groupScoped
  listNetwork["List by network"] --> groupScoped
  listNetwork --> networkScoped
  listMethod["List by method"] --> groupScoped
  listMethod --> networkScoped
  listMethod --> methodScoped
```

* List by **method** returns addresses saved on that method, its network, and its network group.
* List by **network** returns addresses saved on that network and its network group, not
  method-only addresses under the network.
* List by **network group** returns only group-scoped addresses.

When you withdraw with a given method, you can use **any** address returned by listing with
that method's `method_id`: group-, network-, or method-scoped. That list is the complete set of
destinations valid for the withdrawal.

### Endpoints in this flow

Use these endpoints to discover IDs, create an address, and confirm what is usable:

| Step                             | Method | Path                           |
| -------------------------------- | ------ | ------------------------------ |
| List networks and network groups | `GET`  | `/funding/v1/networks`         |
| List withdraw methods            | `GET`  | `/funding/v1/methods/withdraw` |
| Create a saved address           | `POST` | `/funding/v1/addresses`        |
| List saved addresses             | `GET`  | `/funding/v1/addresses`        |

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ List Funding     │──▶│ List Funding     │──▶│ Create Funding   │──▶│ List Funding     │
│ Networks         │   │ Methods          │   │ Address          │   │ Addresses        │
└──────────────────┘   └──────────────────┘   └──────────────────┘   └──────────────────┘
GET /funding/v1/       GET /funding/v1/       POST /funding/v1/      GET /funding/v1/
networks               methods/withdraw       addresses              addresses
```

### Saving a withdrawal address

The following example saves a reusable Ethereum address for withdrawals.

#### Step 1: List funding networks

discover `network_id` and `network_group_id` values:

```python theme={null}
networks = funding_request("GET", "/funding/v1/networks")
for group in networks["network_groups"]:
    print(group["name"], group["network_group_id"])
```

Response:

```json theme={null}
{
  "network_groups": [
    {
      "network_group_id": "f95acdb7-48fb-4441-b5b4-843d3bf60e61",
      "name": "EVM",
      "network_ids": [
        "d9d375da-44b7-4be1-8a00-8b281acfe366",
        "9637bc15-ec8a-43de-8310-887f0a02a9ed",
      ]
    }
  ],
  "networks": [
    {
      "network_id": "d9d375da-44b7-4be1-8a00-8b281acfe366",
      "name": "Ethereum"
    },
    {
			"network_id": "9637bc15-ec8a-43de-8310-887f0a02a9ed",
			"name": "Base"
		},
  ]
}
```

#### Step 2: List funding methods

Select the withdraw method for your asset and note its network. Filter by asset using a nested
`asset` object. In the query string that becomes
`asset[class]=currency&asset[name]=USDC`:

```python theme={null}
methods = funding_request(
    "GET",
    "/funding/v1/methods/withdraw",
    params={
        "asset": {"class": "currency", "name": "USDC"},
        "limit": 50,
    },
)
for method in methods["methods"]:
    network = method.get("network") or {}
    print(
        method["method_name"],
        method["method_id"],
        network.get("network_name"),
        network.get("network_id"),
    )
```

Response:

```json theme={null}
{
  "methods": [
    {
      "asset": {"class": "currency", "name": "USDC"},
      "method_id": "67b765fd-4efd-42dc-8ce7-63352971d566",
      "method_name": "USDC - Ethereum",
      "minimum_amount": "0.01",
      "network": {
        "network_id": "d9d375da-44b7-4be1-8a00-8b281acfe366",
        "network_name": "Ethereum",
        "contract_address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "on_chain_asset_symbol": "USDC"
      }
    }
  ]
}
```

From here:

* `method_id` = `67b765fd-4efd-42dc-8ce7-63352971d566`
* `network_id` = `d9d375da-44b7-4be1-8a00-8b281acfe366` (Ethereum)
* `network_group_id` = `f95acdb7-48fb-4441-b5b4-843d3bf60e61` (EVM)

#### Step 3: Create funding address

Save the address at **network** scope so any funding method on Ethereum can use it:

```python theme={null}
created = funding_request(
    "POST",
    "/funding/v1/addresses",
    body={
        "scope": {"network_id": "d9d375da-44b7-4be1-8a00-8b281acfe366"},
        "address_details": {
            "crypto": {"address": "0xBef7B36845cA31045E86D0B46DBCac4e6752..."}
        },
        "name": "Personal Wallet",
        "description": "My Ethereum hardware wallet address",
    },
)
print(created["address_id"], created["verified"])
```

Response:

```json theme={null}
{
  "address_id": "AB7J4FF-BGM7G-V2JMIH",
  "verified": true
}
```

Addresses created through this endpoint are verified automatically and do not require email
verification. That makes API-managed destinations immediately usable for withdrawals. Review the
risks of this permission in
[Withdrawal addresses API permission](https://support.kraken.com/articles/withdrawal-addresses-api-permission).

Use `scope.method_id` or `scope.network_group_id` instead when you want narrower or broader
reuse. On blockchains that allow a tag or memo, you can include an optional `tag` or `memo`
under `address_details.crypto`. Either field is accepted.

<Note>
  If you save an address with `tag` but the method or network uses `memo`,
  [List Funding Addresses](/api-reference/funding-beta/list-funding-addresses) returns the value
  as `memo`. The same applies in reverse.
</Note>

#### Step 4: List funding addresses

List by method to see every address usable for `USDC - Ethereum`:

```python theme={null}
listed = funding_request(
    "GET",
    "/funding/v1/addresses",
    params={
        "scope": {"method_id": "67b765fd-4efd-42dc-8ce7-63352971d566"},
        "limit": 50,
    },
)
for address in listed["addresses"]:
    print(address["address_id"], address["scope"], address.get("name"))
```

Response. Notice the three scopes in one method-scoped list:

```json theme={null}
{
  "addresses": [
    {
      "address_id": "AB7J4FF-BGM7G-V2JMIH",
      "scope": {"network_id": "d9d375da-44b7-4be1-8a00-8b281acfe366"},
      "address_details": {
        "crypto": {"address": "0xbef7b36845ca31045e86d0b46dbcac4e6752..."}
      },
      "name": "Personal Wallet",
      "verified": true
    },
    {
      "address_id": "ABSXEMA-3FXQS-T7Q2FG",
      "scope": {"method_id": "67b765fd-4efd-42dc-8ce7-63352971d566"},
      "address_details": {
        "crypto": {"address": "0x1d0f55b2bcc52b9a92838e6afff2336438e0..."}
      },
      "verified": true
    },
    {
      "address_id": "ABR6SXP-SF6CY-VJMONY",
      "scope": {"network_group_id": "f95acdb7-48fb-4441-b5b4-843d3bf60e61"},
      "address_details": {
        "crypto": {"address": "0x5d7347ff6cd27a96c58e1426d45710c6d153..."}
      },
      "verified": true
    }
  ]
}
```

Listing the same book by network omits method-only addresses:

```python theme={null}
by_network = funding_request(
    "GET",
    "/funding/v1/addresses",
    params={
        "scope": {"network_id": "d9d375da-44b7-4be1-8a00-8b281acfe366"},
        "limit": 50,
    },
)
```

Listing by network group returns only group-scoped addresses:

```python theme={null}
by_group = funding_request(
    "GET",
    "/funding/v1/addresses",
    params={
        "scope": {"network_group_id": "f95acdb7-48fb-4441-b5b4-843d3bf60e61"},
        "limit": 50,
    },
)
```

Any of the addresses returned by the method-scoped list can be passed as `address_id` when
you create a withdrawal for that method.

## Section 2: Creating a withdrawal

### Workflow

1. **List funding methods:** choose the withdraw `method_id`.
2. **Calculate funding fees:** quote the fee and receive a `withdrawal_fee_token`.
3. **Create funding withdrawal:** submit with `address_id` and the fee token.

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ List Funding     │──▶│ Calculate        │──▶│ Create Funding   │
│ Methods          │   │ Funding Fees     │   │ Withdrawal       │
└──────────────────┘   └──────────────────┘   └──────────────────┘
GET /funding/v1/       GET /funding/v1/       POST /funding/v1/
methods/withdraw       fees/{method_id}       withdrawals
```

### Step 1: List funding methods

Reuse the methods call from Section 1. In this example we withdraw **5 USDC** on Arbitrum One
(`USDC - Arbitrum One`):

* `method_id`: `d4ec4d52-b159-428e-ba64-f45455a978a1`
* `address_id`: `ABR6SXP-SF6CY-VJMONY` (EVM network-group scoped address, valid for Arbitrum)

### Step 2: Calculate funding fees

```python theme={null}
quote = funding_request(
    "GET",
    "/funding/v1/fees/d4ec4d52-b159-428e-ba64-f45455a978a1",
    params={"amount": "5", "fee_included": True},
)
fee_token = quote["withdrawal_fee_token"]
print(quote["fee"], quote["net_amount"], quote["gross_amount"])
```

Response (token truncated):

```json theme={null}
{
  "fee": {
    "asset": {"class": "currency", "name": "USDC"},
    "amount": "1.00000000"
  },
  "gross_amount": {
    "asset": {"class": "currency", "name": "USDC"},
    "amount": "5.00000000"
  },
  "net_amount": {
    "asset": {"class": "currency", "name": "USDC"},
    "amount": "4.00000000"
  },
  "fee_details": {
    "base_fee": {
      "asset": {"class": "currency", "name": "USDC"},
      "amount": "1.00000000"
    },
    "fee_percentage": "0"
  },
  "withdrawal_fee_token": "AAAAAAAAAAHG33Wc1eES6QpeGgMok_gUnlZC7Y5niezI2,MBriLCyg8oqCX7SH1bSqY6SfmC2ZLf_SgTxNZj4Cd1RLPaTyZEDTlz1Pfb8XJ7W0Gev9J1S7TX4M4CUnxoUyq..."
}
```

`fee_included=true` means the amount you pass is the total debit from your balance.

The `withdrawal_fee_token` is an unique quote token returned with the fee calculation. It locks
in the quoted fee **rate** (the base fee and any percentage component) so a later withdrawal can
charge that rate instead of whatever the live fee happens to be at submit time. The token is
valid for **5 minutes** from when it was issued, and you can reuse the same token on **multiple
withdrawals** during that window. After it expires, request a new quote.

When you withdraw with a token, use the same `fee_included` setting you used for the quote. If
you withdraw the same amount you quoted, the fee matches the quote exactly. If the method charges
a percentage and you withdraw a different amount, that percentage is reapplied to the new amount
while still using the locked-in rate.

### Step 3: Create funding withdrawal

Submit the fee token under `fee.quoted_fee.token`:

```python theme={null}
withdrawal = funding_request(
    "POST",
    "/funding/v1/withdrawals",
    body={
        "scope": {"method_id": "d4ec4d52-b159-428e-ba64-f45455a978a1"},
        "address_id": "ABR6SXP-SF6CY-VJMONY",
        "amount": {
            "asset_amount": {
                "asset": {"class": "currency", "name": "USDC"},
                "amount": "5",
            }
        },
        "fee": {
            "quoted_fee": {"token": fee_token},
            "fee_included": True,
        },
    },
)
print(withdrawal["withdrawal_id"])
print(withdrawal["net_amount"], withdrawal["gross_amount"], withdrawal["fee"])
```

Response:

```json theme={null}
{
  "withdrawal_id": "FTVZiTI-e02T84mm87JmibnObWNdnW",
  "net_amount": {
    "asset_amount": {
      "asset": {"class": "currency", "name": "USDC"},
      "amount": "4.00000000"
    }
  },
  "gross_amount": {
    "asset_amount": {
      "asset": {"class": "currency", "name": "USDC"},
      "amount": "5.00000000"
    }
  },
  "fee": {
    "asset_amount": {
      "asset": {"class": "currency", "name": "USDC"},
      "amount": "1.00000000"
    }
  }
}
```

Notes:

* `scope` selects the withdraw method. You can pass `network_id` instead only when that network
  has exactly one available method for the asset; otherwise the request is ambiguous.
* The destination `address_id` may be method-, network-, or network-group-scoped, as long as it
  is compatible with the method you selected.
* Instead of a fee token, you can accept the current fee and optionally set a maximum:

```python theme={null}
"fee": {
    "current_fee": {
        "max_fee": {
            "asset_amount": {
                "asset": {"class": "currency", "name": "USDC"},
                "amount": "1",
            }
        }
    },
    "fee_included": True,
}
```

* Optional `expected_address` lets you confirm the on-chain destination still matches the saved
  address before the withdrawal proceeds.

## Section 3: Depositing funds

Deposit addresses belong to a **funding method**: one way to move one asset on one network,
for example depositing USDC on Ethereum. You always claim and list with a `method_id`. You do
not choose a network or network-group scope the way you do for withdrawal addresses.

### Workflow

1. **List funding methods:** choose a deposit `method_id`.
2. **List claimed deposit addresses:** reuse an existing address if one is returned.
3. **Claim funding deposit address:** only when you need another address.

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ List Funding     │──▶│ List Claimed     │──▶│ Claim Funding    │
│ Methods          │   │ Deposit Addresses│   │ Deposit Address  │
└──────────────────┘   └──────────────────┘   └──────────────────┘
GET /funding/v1/       GET /funding/v2/       PUT /funding/v1/
methods/deposit        deposit/addresses      deposit/address
```

Claiming can reserve a **new** address, so list first and only claim when you need another
one. Some methods share an on-chain address with another method. You can still list and claim
with the method you want to deposit to. See [Shared deposit addresses](#shared-deposit-addresses)
if you need that model.

### Step 1: List funding methods

```python theme={null}
deposit_methods = funding_request(
    "GET",
    "/funding/v1/methods/deposit",
    params={
        "asset": {"class": "currency", "name": "USDC"},
        "limit": 50,
    },
)
for method in deposit_methods["methods"]:
    deposit = method.get("deposit") or {}
    network = method.get("network") or {}
    print(
        method["method_name"],
        method["method_id"],
        network.get("network_name"),
        deposit.get("address_generation"),
    )
```

Response:

```json theme={null}
{
  "methods": [
    {
      "asset": {"class": "currency", "name": "USDC"},
      "method_id": "27ede8db-804b-4d91-8e25-46b7b9668730",
      "method_name": "Standard",
      "minimum_amount": "2",
      "network": {
        "network_id": "d9d375da-44b7-4be1-8a00-8b281acfe366",
        "network_name": "Ethereum",
        "contract_address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "on_chain_asset_symbol": "USDC"
      },
      "deposit": {
        "address_generation": {
          "status": "limited",
          "limit": 5
        },
        "shares_addresses_with_method_id": "a001231f-488e-48c0-b36c-6e0d2c1ee247"
      }
    }
  ]
}
```

`address_generation` tells you whether you can create more unused addresses for this method
(`unlimited`, `limited` plus `limit`, or `unsupported`). If `shares_addresses_with_method_id`
is present, this method reuses another method's addresses. You can ignore that field for the
walkthrough below and still list or claim with this `method_id`.

### Step 2: List claimed deposit addresses

This is the call to make when a user selects a deposit method and you need the address (and
any tag or memo) to display. Pass the method as `scope.method_id`.

```python theme={null}
claimed_list = funding_request(
    "GET",
    "/funding/v2/deposit/addresses",
    params={
        "scope": {"method_id": "27ede8db-804b-4d91-8e25-46b7b9668730"},
        "limit": 20,
    },
)
for address in claimed_list["addresses"]:
    print(address["method_id"], address["address_details"])
```

Response:

```json theme={null}
{
  "addresses": [
    {
      "address_details": {
        "crypto": {
          "address": "0xBef7B36845cA31045E86D0B46DBCac4e6752..."
        }
      },
      "method_id": "27ede8db-804b-4d91-8e25-46b7b9668730"
    }
  ]
}
```

If `tag` or `memo` is present, include it with the address. Deposits sent without a required
tag or memo may not be credited.

If the list is empty, claim an address in Step 3. Deposit claimed-address listing is separate
from the withdrawal address book in Section 1.

### Step 3: Claim funding deposit address

Claim with the `method_id` you want to deposit to. That does not have to be the method the
address is stored against. If the method shares addresses, Kraken returns the shared address.

```python theme={null}
claimed = funding_request(
    "PUT",
    "/funding/v1/deposit/address",
    body={"method_id": "27ede8db-804b-4d91-8e25-46b7b9668730"},
)
crypto = claimed["address_details"]["crypto"]
print(crypto["address"], crypto.get("tag"), crypto.get("memo"))
```

Response:

```json theme={null}
{
  "address_details": {
    "crypto": {
      "address": "0xBef7B36845cA31045E86D0B46DBCac4e6752..."
    }
  }
}
```

Where `address_generation` is limited (typically `limit: 5`), you may hold up to five unused
claimed addresses for that method at a time. If you are already at the limit, claim returns
`TooManyDepositAddresses`. List existing addresses instead. Once one of those addresses has
received a deposit, you can claim another; the oldest unused address then begins expiring and
is removed after **7 days**.

## Shared deposit addresses

On many networks, token deposit methods use the **same** on-chain address as the network's
native asset. Kraken stores that address against the native method. The token methods reuse it.

| Network  | Address stored against | Token methods that reuse it            |
| -------- | ---------------------- | -------------------------------------- |
| Ethereum | ETH on Ethereum        | ERC-20 tokens (USDC, USDT, and others) |
| Tron     | TRX on Tron            | TRC-20 tokens                          |
| Solana   | SOL on Solana          | SPL tokens                             |

Ethereum looks like this:

```mermaid theme={null}
flowchart TB
  subgraph owner["ETH on Ethereum"]
    addr["Deposit addresses are stored against this method"]
  end
  usdc["USDC on Ethereum"]
  usdt["USDT on Ethereum"]
  other["Other ERC-20 methods"]

  usdc -->|"shares_addresses_with_method_id"| owner
  usdt -->|"shares_addresses_with_method_id"| owner
  other -->|"shares_addresses_with_method_id"| owner
```

The same pattern applies on Tron (TRC-20s stored against TRX) and Solana (SPLs stored against
SOL). List Funding Methods tells you this with `deposit.shares_addresses_with_method_id`. The
field is omitted when a method has its own addresses.

You still list and claim with the method the user selected. For USDC on Ethereum, pass the
USDC `method_id`. Kraken returns the shared ETH address. You do not look up or claim against
ETH on Ethereum first. The same is true for a TRC-20 on Tron or an SPL on Solana.

<Note>
  Not all networks that have an EVM deposit address share addresses. Methods on the same network
  can share (ERC-20s with ETH on Ethereum, TRC-20s with TRX on Tron, SPLs with SOL on Solana).
  Methods in the same network group do not always share. Trust
  `shares_addresses_with_method_id` rather than assuming two methods share because they look
  related.
</Note>

### The same address, two `method_id` values

`method_id` on a claimed address is not always the method the address is stored against. It
depends on the list filter.

Listed for USDC (`scope.method_id` = USDC on Ethereum), as in Step 2. Use this when you are
showing the user where to send USDC:

```json theme={null}
{
  "address_details": {
    "crypto": {
      "address": "0xBef7B36845cA31045E86D0B46DBCac4e6752..."
    }
  },
  "method_id": "27ede8db-804b-4d91-8e25-46b7b9668730"
}
```

Listed with no method filter. `method_id` is ETH on Ethereum, because that is where the
address is stored:

```json theme={null}
{
  "address_details": {
    "crypto": {
      "address": "0xBef7B36845cA31045E86D0B46DBCac4e6752..."
    }
  },
  "method_id": "a001231f-488e-48c0-b36c-6e0d2c1ee247"
}
```

| List filter                | `method_id` in the response          |
| -------------------------- | ------------------------------------ |
| `scope.method_id` (USDC)   | USDC on Ethereum                     |
| None or `scope.network_id` | ETH on Ethereum (where it is stored) |

The same split happens on other networks. A TRC-20 listed by its own `method_id` reports that
token method; listed with no method filter it reports TRX on Tron. An SPL listed by its own
method reports the SPL; unscoped it reports SOL on Solana.

If you list every claimed address and then keep rows whose `method_id` is USDC, you will miss
this address. Put USDC in `scope.method_id` on the request instead.


# Spot REST Introduction
Source: https://docs.kraken.com/exchange/guides/rest/introduction

Overview of the Kraken Spot REST API organisation, requests, responses, and error handling

## OpenAPI spec

<CardGroup>
  <Card title="Spot REST OpenAPI" icon="download" href="/openapi/spot-rest.yaml">
    Download the Spot REST OpenAPI spec (YAML)
  </Card>

  <Card title="Derivatives REST OpenAPI" icon="download" href="/openapi/futures-rest.yaml">
    Download the Derivatives REST OpenAPI spec (YAML)
  </Card>
</CardGroup>

## API Organisation

The Spot REST API is organised by function, covering a wide range of services:

* [Market Data](/api-reference/market-data/get-order-book)
* [Account Data](/api-reference/account-data/get-account-balance)
* [Trading](/api-reference/trading/add-order)
* [Funding (Beta)](/api-reference/funding-beta/list-funding-methods)
* [Funding (Legacy)](/api-reference/funding/get-deposit-addresses)
* [Subaccounts](/api-reference/subaccounts/create-subaccount)
* [Earn](/api-reference/earn/allocate-earn-funds)
* [WebSocket Authentication](/api-reference/trading/get-websockets-token)

## Requests, Responses and Errors

### Requests

Request payloads supports Json encoding (`Content-Type: application/json`) as well as  form-encoded (`Content-Type: application/x-www-form-urlencoded`).
We recommend clients to specify `User-Agent` in the headers of all their requests. This will help us optimize interactions and improve the overall efficiency and security of the API.

### Responses

Responses are JSON encoded and contain one or two top-level keys (`result` and `error` for successful requests or those with warnings, or only `error` for failed or rejected requests)

### Example

Request:

```text theme={null}
GET <https://api.kraken.com/0/public/SystemStatus>
```

Successful response:

```json theme={null}
{
    "error": [],
    "result": {
        "status": "online",
        "timestamp": "2021-03-22T17:18:03Z"
    }
}
```

Error response:

```json theme={null}
{
    "error": [
        "EGeneral:Invalid arguments:ordertype"
    ]
}
```

### Error Details

HTTP status codes are generally not used by our API to convey information about the state of requests and any errors or warnings are denoted in the `error` field of the response as described above. Status codes **other** than 200 indicate that there was an issue with the request reaching our servers.

Error messages follow the general format "\<severity>\<category>: \<description>"

* \<severity> : `E` for error, `W` for warning.
* \<category> : `General`, `Auth`, `API`, `Query`, `Order`, `Trade`, `Funding`, or `Service`.
* \<description> : a text string that describes the reason for the error.

```text theme={null}
i.e., "EGeneral: Invalid arguments:ordertype"
```

Additional information can be found on the [error reference](/exchange/guides/general/errors) guide or the [support center](https://support.kraken.com/hc/en-us/articles/360001491786-API-error-messages).

## Related guides

<CardGroup>
  <Card title="Authentication" icon="lock" href="/exchange/guides/rest/authentication">
    HMAC-SHA512 signature, nonce management, and API-Key header
  </Card>

  <Card title="API key permissions" icon="key" href="/exchange/guides/rest/api-keys">
    Which permissions to enable for each use case
  </Card>

  <Card title="Error reference" icon="triangle-exclamation" href="/exchange/guides/general/errors">
    Full list of error codes and handling strategies
  </Card>

  <Card title="Rate limits" icon="gauge" href="/exchange/guides/rest/ratelimits">
    How the REST rate counter works
  </Card>

  <Card title="API comparison" icon="table" href="/exchange/guides/general/api-comparison">
    When to use REST vs WebSocket vs FIX
  </Card>
</CardGroup>


# Spot REST Rate Limits
Source: https://docs.kraken.com/exchange/guides/rest/ratelimits

REST API call counter, tier-based limits and decay rates, and matching engine limits that apply across all Spot protocols

## REST Specific Limits

Every REST API user has a "call counter" which starts at `0`. Ledger/trade history calls increase the counter by `2`. All other API calls increase this counter by `1` (except AddOrder, CancelOrder which operate on a different limiter detailed further below).

| Tier         | Max API Counter | API Counter Decay |
| ------------ | --------------- | ----------------- |
| Starter      | 15              | -0.33/sec         |
| Intermediate | 20              | -0.5/sec          |
| Pro          | 20              | -1/sec            |

The user's counter is reduced every couple of seconds depending on their verification tier. Each API key's counter is separate, and if the counter exceeds the maximum value, subsequent calls using that API key would be rate limited. If the rate limits are reached, additional calls will be restricted for a few seconds (or possibly longer if calls continue to be made while the rate limits are active).

<Note>
  Master accounts and subaccounts share the same default trading rate limits as determined by the master account's tier.
</Note>

## Matching engine limits

In addition to the REST-specific limits, the trading engine has its own limits applicable to all protocols. See [Trading engine limits](/exchange/guides/general/ratelimits) and [Derivatives rate limits](/exchange/guides/futures/ratelimits).

## Errors

* "EAPI:Rate limit exceeded" if the REST API counter exceeds the user's maximum.
* "EService: Throttled: \[UNIX timestamp]" if there are too many concurrent requests. Try again after \[timestamp].

Additional information can be found on our [support center](https://support.kraken.com/hc/en-us/articles/206548367-What-are-the-API-rate-limits-).


# Spot WebSocket Authentication
Source: https://docs.kraken.com/exchange/guides/websockets/authentication

How to obtain a WebSocket authentication token via the REST API and use it to subscribe to private channels

## Overview

The Spot WebSocket API uses token-based authentication. To subscribe to private channels (`ownTrades`, `openOrders`), first obtain a short-lived token via the REST API, then include it in each subscription message.

<Note>
  Tokens are valid for **15 minutes**. Obtain a fresh token before reconnecting or when the current one nears expiry.
</Note>

## Step 1: Obtain a WebSocket token

Call the [GetWebSocketsToken](/api-reference/trading/get-websockets-token) REST endpoint using your API key and secret. Authentication uses the same HMAC-SHA512 signing as all other private REST endpoints — see [REST Authentication](/exchange/guides/rest/authentication) for the full algorithm.

<Tabs>
  <Tab title="Python">
    ```py theme={null}
    import urllib.parse
    import hashlib
    import hmac
    import base64
    import time
    import requests

    def get_kraken_signature(urlpath, data, secret):
        encoded = (str(data["nonce"]) + urllib.parse.urlencode(data)).encode()
        message = urlpath.encode() + hashlib.sha256(encoded).digest()
        mac = hmac.new(base64.b64decode(secret), message, hashlib.sha512)
        return base64.b64encode(mac.digest()).decode()

    api_key = "YOUR_API_KEY"
    api_secret = "YOUR_API_SECRET"

    nonce = str(int(time.time() * 1000))
    data = {"nonce": nonce}

    headers = {
        "API-Key": api_key,
        "API-Sign": get_kraken_signature("/0/private/GetWebSocketsToken", data, api_secret),
    }

    response = requests.post(
        "https://api.kraken.com/0/private/GetWebSocketsToken",
        headers=headers,
        data=data,
    )
    token = response.json()["result"]["token"]
    print(f"Token: {token}")
    ```
  </Tab>

  <Tab title="Go">
    ```go theme={null}
    package main

    import (
        "crypto/hmac"
        "crypto/sha256"
        "crypto/sha512"
        "encoding/base64"
        "encoding/json"
        "fmt"
        "io"
        "net/http"
        "net/url"
        "strings"
        "time"
    )

    func getKrakenSignature(urlPath string, data url.Values, secret string) (string, error) {
        nonce := data.Get("nonce")
        encoded := nonce + data.Encode()
        sha := sha256.Sum256([]byte(encoded))
        message := append([]byte(urlPath), sha[:]...)
        secretDecoded, err := base64.StdEncoding.DecodeString(secret)
        if err != nil {
            return "", err
        }
        mac := hmac.New(sha512.New, secretDecoded)
        mac.Write(message)
        return base64.StdEncoding.EncodeToString(mac.Sum(nil)), nil
    }

    func main() {
        apiKey := "YOUR_API_KEY"
        apiSecret := "YOUR_API_SECRET"

        nonce := fmt.Sprintf("%d", time.Now().UnixMilli())
        data := url.Values{"nonce": {nonce}}

        sig, err := getKrakenSignature("/0/private/GetWebSocketsToken", data, apiSecret)
        if err != nil {
            panic(err)
        }

        req, _ := http.NewRequest("POST",
            "https://api.kraken.com/0/private/GetWebSocketsToken",
            strings.NewReader(data.Encode()))
        req.Header.Set("API-Key", apiKey)
        req.Header.Set("API-Sign", sig)
        req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

        resp, err := http.DefaultClient.Do(req)
        if err != nil {
            panic(err)
        }
        defer resp.Body.Close()

        body, _ := io.ReadAll(resp.Body)
        var result struct {
            Result struct {
                Token string `json:"token"`
            } `json:"result"`
        }
        json.Unmarshal(body, &result)
        fmt.Printf("Token: %s\n", result.Result.Token)
    }
    ```
  </Tab>

  <Tab title="Node.js">
    ```js theme={null}
    const crypto = require('crypto');
    const querystring = require('querystring');

    function getKrakenSignature(urlPath, data, secret) {
      const encoded = data.nonce + querystring.stringify(data);
      const sha256Hash = crypto.createHash('sha256').update(encoded).digest();
      const message = urlPath + sha256Hash.toString('binary');
      const secretBuffer = Buffer.from(secret, 'base64');
      const hmac = crypto.createHmac('sha512', secretBuffer);
      hmac.update(message, 'binary');
      return hmac.digest('base64');
    }

    async function getWebSocketToken(apiKey, apiSecret) {
      const nonce = Date.now().toString();
      const data = { nonce };

      const signature = getKrakenSignature('/0/private/GetWebSocketsToken', data, apiSecret);

      const response = await fetch('https://api.kraken.com/0/private/GetWebSocketsToken', {
        method: 'POST',
        headers: {
          'API-Key': apiKey,
          'API-Sign': signature,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(data),
      });

      const result = await response.json();
      return result.result.token;
    }

    const token = await getWebSocketToken('YOUR_API_KEY', 'YOUR_API_SECRET');
    console.log('Token:', token);
    ```
  </Tab>
</Tabs>

## Step 2: Subscribe to a private channel

Include the token in your WebSocket subscription message:

```json theme={null}
{
  "event": "subscribe",
  "subscription": {
    "name": "ownTrades",
    "token": "WW91ciBhdXRoZW50aWNhdGlvbiB0b2tlbiBnb2VzIGhlcmUu"
  }
}
```

A single token can be used for multiple subscriptions within the same session (e.g., subscribing to both `ownTrades` and `openOrders` simultaneously).

## Token expiry and refresh

Tokens expire **15 minutes** after creation. To maintain uninterrupted access:

* Obtain a new token before the current one expires by calling `GetWebSocketsToken` again
* After reconnecting, re-subscribe using the fresh token

For WebSocket reconnection patterns and session management, see the [Reconnection guide](/exchange/guides/websockets/reconnection).

## Error handling

If you subscribe with an invalid or expired token, the server returns an error in the subscription status message:

```json theme={null}
{
  "errorMessage": "Token is expired",
  "event": "subscriptionStatus",
  "status": "error",
  "subscription": { "name": "ownTrades" }
}
```

On receiving this error, call `GetWebSocketsToken` to obtain a fresh token, then re-subscribe.


# Book checksum (WebSocket v1)
Source: https://docs.kraken.com/exchange/guides/websockets/book-checksum-v1

How to maintain the order book and validate the CRC32 checksum on the WebSocket v1 book channel

The `book` channel includes a CRC32 checksum with each update message. Validating it confirms your local book is correctly synchronised with the exchange.

Checksum verification is optional. You can validate on every update or periodically depending on throughput requirements. The checksum is always calculated over the **top 10 price levels** regardless of subscription depth.

<Warning>
  Processing order matters. Price level updates arrive in the correct sequence from the exchange — the last entries in the array are the most recent. Do not sort by timestamp, as multiple updates for the same price level can occur within a single microsecond.
</Warning>

Checksums are not sent in snapshot messages — only in update messages. The checksum field (`"c"`) appears in the last bid or ask map structure in the message.

### Example `book` update

```json theme={null}
[
    0,
    {
        "a": [
            ["0.05120", "0.00000500", "1582905486.493008"],
            ["0.05275", "0.00000500", "1582905486.493034"]
        ]
    },
    {
        "b": [
            ["0.04765", "0.00000500", "1582905486.493008"],
            ["0.04940", "0.00000500", "1582905486.493034"]
        ],
        "c": "974947235"
    },
    "book-1000",
    "BTC/USD"
]
```

## Checksum calculation

### Algorithm

<Steps>
  <Step title="Apply the update">
    Apply all price level updates in the message to your local book before calculating the checksum.
  </Step>

  <Step title="Build the asks string">
    For each of the top 10 ask price levels, sorted by price **low to high**:

    * Remove `.` from the price → `"0.05000"` → `"005000"`
    * Remove leading zeros → `"005000"` → `"5000"`
    * Apply the same formatting to the volume
    * Append `price + volume` to the asks string

    For example, price `"0.05000"` with volume `"0.00000304"` formats as `"5000304"`. Timestamps are not included.
  </Step>

  <Step title="Build the bids string">
    For each of the top 10 bid price levels, sorted by price **high to low**, apply the same formatting and append to the bids string.
  </Step>

  <Step title="Concatenate and hash">
    Concatenate **asks + bids** strings, then pass the result to a CRC32 function. Cast the result to an unsigned 32-bit integer and compare to the `"c"` field in the message.
  </Step>
</Steps>

### Example

Input book state:

```json theme={null}
{
  "as": [
    ["0.05005", "0.00000500", "1582905487.684110"],
    ["0.05010", "0.00000500", "1582905486.187983"],
    ["0.05015", "0.00000500", "1582905484.480241"],
    ["0.05020", "0.00000500", "1582905486.645658"],
    ["0.05025", "0.00000500", "1582905486.859009"],
    ["0.05030", "0.00000500", "1582905488.601486"],
    ["0.05035", "0.00000500", "1582905488.357312"],
    ["0.05040", "0.00000500", "1582905488.785484"],
    ["0.05045", "0.00000500", "1582905485.302661"],
    ["0.05050", "0.00000500", "1582905486.157467"]
  ],
  "bs": [
    ["0.05000", "0.00000500", "1582905487.439814"],
    ["0.04995", "0.00000500", "1582905485.119396"],
    ["0.04990", "0.00000500", "1582905486.432052"],
    ["0.04980", "0.00000500", "1582905480.609351"],
    ["0.04975", "0.00000500", "1582905476.793880"],
    ["0.04970", "0.00000500", "1582905486.767461"],
    ["0.04965", "0.00000500", "1582905481.767528"],
    ["0.04960", "0.00000500", "1582905487.378907"],
    ["0.04955", "0.00000500", "1582905483.626664"],
    ["0.04950", "0.00000500", "1582905488.509872"]
  ]
}
```

Concatenated input to CRC32 (newlines added for readability):

```text theme={null}
50055005010500501550050205005025500
50305005035500504050050455005050500
50005004995500499050049805004975500
49705004965500496050049555004950500
```

Expected result: **`974947235`**


# Book checksum (WebSocket v2)
Source: https://docs.kraken.com/exchange/guides/websockets/book-checksum-v2

How to maintain the order book and validate the CRC32 checksum on the WebSocket v2 book channel

The `book` channel includes a CRC32 checksum with each update. Validating it confirms your local book is correctly synchronised with the exchange.

Checksum verification is optional. You can validate on every update or periodically depending on throughput requirements. The checksum is always calculated over the **top 10 price levels** regardless of subscription depth.

## Maintaining the book

* Process all price level updates in a message before calculating the checksum.
* An update with `"qty": 0` means that price level should be removed.
* After each update, truncate your book to the subscribed depth — you will not receive `"qty": 0` for levels that fall out of scope.

## Checksum calculation

<Tip>
  Parse `price` and `qty` fields using a decimal or string decoder to preserve full precision through deserialisation.
</Tip>

```python theme={null}
async for bytes in websocket:
    message = json.loads(bytes, parse_float=Decimal)
    self.on_message(message)
```

### Algorithm

<Steps>
  <Step title="Build the asks string">
    For each of the top 10 ask price levels, sorted by price **low to high**:

    * Remove `.` from `price` → `"45285.2"` → `"452852"`
    * Remove leading zeros → `"452852"` → `"452852"`
    * Remove `.` from `qty` → `"0.00100000"` → `"000100000"`
    * Remove leading zeros → `"000100000"` → `"100000"`
    * Append `price + qty` to the asks string → `"452852100000"`
  </Step>

  <Step title="Build the bids string">
    For each of the top 10 bid price levels, sorted by price **high to low**, apply the same formatting and append to the bids string.
  </Step>

  <Step title="Concatenate and hash">
    Concatenate **asks + bids** strings, then pass the result to a CRC32 function. Cast the result to an unsigned 32-bit integer and compare to the `checksum` field in the message.
  </Step>
</Steps>

### Example

Input snapshot:

```json theme={null}
{
  "channel": "book",
  "type": "snapshot",
  "data": [{
    "symbol": "BTC/USD",
    "bids": [
      {"price": "45283.5", "qty": "0.10000000"},
      {"price": "45283.4", "qty": "1.54582015"},
      {"price": "45282.1", "qty": "0.10000000"},
      {"price": "45281.0", "qty": "0.10000000"},
      {"price": "45280.3", "qty": "1.54592586"},
      {"price": "45279.0", "qty": "0.07990000"},
      {"price": "45277.6", "qty": "0.03310103"},
      {"price": "45277.5", "qty": "0.30000000"},
      {"price": "45277.3", "qty": "1.54602737"},
      {"price": "45276.6", "qty": "0.15445238"}
    ],
    "asks": [
      {"price": "45285.2", "qty": "0.00100000"},
      {"price": "45286.4", "qty": "1.54571953"},
      {"price": "45286.6", "qty": "1.54571109"},
      {"price": "45289.6", "qty": "1.54560911"},
      {"price": "45290.2", "qty": "0.15890660"},
      {"price": "45291.8", "qty": "1.54553491"},
      {"price": "45294.7", "qty": "0.04454749"},
      {"price": "45296.1", "qty": "0.35380000"},
      {"price": "45297.5", "qty": "0.09945542"},
      {"price": "45299.5", "qty": "0.18772827"}
    ],
    "checksum": 3310070434
  }]
}
```

Asks string (low → high):

```text theme={null}
45285210000045286415457195345286615457110945289615456091145290215890660452918154553491452947445474945296135380000452975994554245299518772827
```

Bids string (high → low):

```text theme={null}
452835100000004528341545820154528211000000045281010000000452803154592586452790799000045277633101034527753000000045277315460273745276615445238
```

Concatenated input to CRC32:

```text theme={null}
45285210000045286415457195345286615457110945289615456091145290215890660452918154553491452947445474945296135380000452975994554245299518772827452835100000004528341545820154528211000000045281010000000452803154592586452790799000045277633101034527753000000045277315460273745276615445238
```

Expected result: **`3310070434`**


# Spot WebSocket Introduction
Source: https://docs.kraken.com/exchange/guides/websockets/introduction

WebSocket v1 and v2 endpoints, connection details, version differences, and general considerations for the Spot WebSocket API

Websockets is a bi-directional protocol helping you build fast, real-time, event-driven applications. This sections contains a summary of the connection details and versions.

## Connection Details

The websocket URLs to connect to our trading environments are:

| Environment | API | Public Data                  | Private Data (authentication required) |
| ----------- | --- | ---------------------------- | -------------------------------------- |
| Primary     | v2  | wss\://ws.kraken.com/v2      | wss\://ws-auth.kraken.com/v2           |
| Primary     | v1  | wss\://ws.kraken.com         | wss\://ws-auth.kraken.com              |
| Beta        | v2  | wss\://beta-ws.kraken.com/v2 | wss\://beta-ws-auth.kraken.com/v2      |
| Beta        | v1  | wss\://beta-ws.kraken.com    | wss\://beta-ws-auth.kraken.com         |

* **Primary**: Production API and production trading engine.
* **Beta**: Beta API and production trading engine. Beta receives API software updates prior to the primary platform. A beta connection may required to access new or enhanced features, this will be indicated by the API guides or the support team

## Websockets Versions

We have 2 versions of websockets for spot: v1 and v2. Websockets v2 cleans up a number idiosyncrasies and ambiguities from v1 with the overall aim to enable easier integration with applications. It is intended that v1 will be maintained but future enhancements will be developed in v2.

Each version is described separately in the API pages:

* WebSocket v2: [API Reference](/exchange/api-reference/spot-websocket-v2/add_order)
* WebSocket v1: [API Reference](/exchange/api-reference/spot-websocket-v1/addorder)

## Websockets v2

The latest version of websockets has been completely re-designed to enable simpler and faster integration with applications:

### Cleaner Document Structure

* It has a FIX-like design, FIX is standard communication protocol across the financial industry, enabling a more familiar experience across all of our APIs.
* Pair symbols have been aligned into the more readable "BTC/USD" format.
* The timestamps use the RFC3339 format `2021-05-11T19:47:09.896860Z` which are readable, parsable and easy to sort.
* Prices and quantities are published as a number type for ease of processing. The values contain the same precision as the engine and full precision can be maintained when decoded as a decimal or a string instead of the default json parser setting (usually float). This offers ease of processing and precision where required.
* Payloads are normalised JSON objects with no/minimal positional or variable length fields, to allow for maximum future flexibility without breaking client code.
* The message structure is consistent (i.e. predictable dictionary keys) and is more readable for both human and machine clients.

**Example:** Add a `trailing-stop` order which triggers when the market reverts 1% from trough price

```json theme={null}
{
    "method": "add_order",
    "params": {
        "order_type": "trailing-stop",
        "side": "buy",
        "order_qty": 100,
        "symbol": "MATIC/USD",
        "triggers": {
            "reference": "last",
            "price": 1.0,
            "price_type": "pct"
        },
        "token": "G38a1tGFzqGiUCmnegBcm8d4nfP3tytiNQz6tkCBYXY"
    }
}
```

### Order Transactions and Requests

#### Requests

* All requests accept an optional, client-specified integer request identifier (`req_id`) for matching up the response, when returned. The uniqueness of the `req_id` is not enforced by the exchange.
* Warnings are generated on `add_order` transactions when deprecated fields are detected.

#### Responses

All responses to requests have a standardised response:

* `time_in` and `time_out` describe when our server received the request and sent the response, to help further isolate and measure network/client/server latency.
* `success` indicates if the request was handled successfully.
* `result` includes details specific to the type of request.
* `error` if present, gives details of what error occurred.

Additionally, the responses now contain advisory messages, highlighting deprecated fields or upcoming changes to the request / channel.

### Channels

Additional event driven streams have been added:

* `level3`: streams the orders that constitute the central limit order book. This offers an additional level of granularity over level2 `book` channel. This feed enables queue priority and a range of order book analytics to be calculated.
* `balance`: streams the client asset balances and transactions from your account ledger.

## FAQs

The Frequently Asked Questions (FAQs) section tries to answer the most common questions that users can encounter.

### Connection times out

The server closes any open websocket connection within approximately one minute of inactivity.

Any, for example a [ping](/exchange/api-reference/spot-websocket-v2/ping), request can be used to keep the connection alive.

### EOrder:Reduce only:Non-PC

The "**EOrder:Reduce only:Non-PC**" error response indicated to a problem with the Permitted Client (PC).

For more information please see the Kraken support article [Margin trading and Permitted Client self-certification for Ontario, Canada clients](https://support.kraken.com/hc/en-us/articles/6474011237268#whataretherequirementsforontariocanadaresidentstocontinuemargintrading).

### XBT/USD pair is missing

If you are getting the error "**Currency pair not supported XBT/USD**" that is because we are using `BTC` instead of `XBT` for bitcoin in v2.

Please use the [instrument](/exchange/api-reference/spot-websocket-v2/instrument) channel to fetch the list of pairs which can be subscribed to via WebSockets API.

## General Considerations (v1 and v2 connections)

* Transport Layer Security (TLS) with Server Name Indication (SNI) is required in order to establish a Kraken WebSockets API connection. See [Cloudflare's "What is SNI?" guide](https://www.cloudflare.com/learning/ssl/what-is-sni/) for more details.
* All messages sent and received via websockets are encoded in JavaScript Object Notation (JSON) format.
* Timestamps should not be considered unique and not be considered as aliases for transaction identifiers (IDs). Also, the granularity of timestamps is not representative of transaction rates.
* At least one private message should be subscribed to keep the authenticated client connection open.
* Cloudflare imposes a connection/re-connection rate limit---per Internet Protocol (IP) address---of approximately 150 attempts per rolling 10 minutes. If the reconnection rate limit is exceeded, the IP address is banned for 10 minutes.

### Instrument supported

* For websocket v1, Please use REST API endpoint [AssetPairs](/api-reference/market-data/get-tradable-asset-pairs) to fetch the list of pairs which can be subscribed via WebSockets API. For example, field 'wsname' gives the supported pairs name which can be used to subscribe.
* For websocket v2, Please use websocket endpoint [instrument](/exchange/api-reference/spot-websocket-v2/instrument) on Websocket v2 channel to fetch the list of pairs which can be subscribed via WebSockets API. The `pairs` array contains the supported pair names (see field`symbol`).

### Recommended reconnection behaviour

* Normal operation: Attempt reconnection instantly up to a handful of times if the websocket is dropped randomly.
* After maintenance or extended downtime: Attempt to reconnect no more quickly than once every five (5) seconds. There is no advantage to reconnecting more rapidly after maintenance during `cancel_only` mode.

For full reconnection patterns including exponential backoff, state reconciliation, and the Dead Man's Switch, see [Reconnection and resilience](/exchange/guides/websockets/reconnection).

## Related guides

<CardGroup>
  <Card title="Authentication" icon="lock" href="/exchange/guides/websockets/authentication">
    Obtain a WebSocket token via REST before subscribing to private channels
  </Card>

  <Card title="Reconnection and resilience" icon="rotate" href="/exchange/guides/websockets/reconnection">
    Handle disconnects, re-subscription, and order state reconciliation
  </Card>

  <Card title="API comparison" icon="table" href="/exchange/guides/general/api-comparison">
    WebSocket v1 vs v2 feature differences and when to use each
  </Card>

  <Card title="Order lifecycle" icon="arrows-spin" href="/exchange/guides/general/order-lifecycle">
    executions channel — order states and exec\_type values explained
  </Card>
</CardGroup>


# L3 checksum (WebSocket v2)
Source: https://docs.kraken.com/exchange/guides/websockets/l3-checksum-v2

How to maintain the level3 order book and validate the CRC32 checksum on the WebSocket v2 level3 channel

The `level3` channel includes a CRC32 checksum with each update. Validating it confirms your local book is correctly synchronised with the exchange, including the order sequence within each price level.

Checksum verification is optional. You can validate on every update or periodically depending on throughput requirements. The checksum is always calculated over the **top 10 price levels** regardless of subscription depth.

The `level3` checksum logic is similar to the `book` feed — see the [Book checksum (v2)](/exchange/guides/websockets/book-checksum-v2) guide. The key difference is that `level3` iterates through individual orders within each price level, so it also verifies queue priority.

## Maintaining the book

* Process all orders in a message before calculating the checksum.
* A price level with no remaining orders or quantity should be removed from your book.
* After each update, truncate your book to the subscribed depth. If a price level drops out of scope, all orders at the next available price level will be published to maintain the subscription depth.

## Checksum calculation

<Tip>
  Parse `limit_price` and `order_qty` fields using a decimal or string decoder to preserve full precision through deserialisation.
</Tip>

```python theme={null}
async for bytes in websocket:
    message = json.loads(bytes, parse_float=Decimal)
    self.on_message(message)
```

### Algorithm

<Steps>
  <Step title="Build the asks string">
    For each of the top 10 ask price levels, sorted by price **low to high**, iterate through each order in the price level:

    * Remove `.` from `limit_price` → `"44939.5"` → `"449395"`
    * Remove leading zeros → `"449395"` → `"449395"`
    * Remove `.` from `order_qty` → `"4.52308393"` → `"452308393"`
    * Remove leading zeros → `"452308393"` → `"452308393"`
    * Append `limit_price + order_qty` to the asks string → `"449395452308393"`
  </Step>

  <Step title="Build the bids string">
    For each of the top 10 bid price levels, sorted by price **high to low**, iterate through each order in the price level and apply the same formatting, appending to the bids string.
  </Step>

  <Step title="Concatenate and hash">
    Concatenate **asks + bids** strings, then pass the result to a CRC32 function. Cast the result to an unsigned 32-bit integer and compare to the `checksum` field in the message.
  </Step>
</Steps>

### Example

Input snapshot:

```json theme={null}
{
  "channel": "level3",
  "type": "snapshot",
  "data": [{
    "symbol": "BTC/USD",
    "checksum": 1063832831,
    "bids": [
      {"order_id": "OTCFZG-YOE2Q-LQKNM3", "limit_price": "44939.4", "order_qty": "0.88968699", "timestamp": "2024-01-08T12:26:39.526146327Z"},
      {"order_id": "OFGP5R-B3E7G-54EZD6", "limit_price": "44939.4", "order_qty": "0.45210000", "timestamp": "2024-01-08T12:26:39.530287934Z"},
      {"order_id": "OMPHVY-IZPJ4-KOKA3P", "limit_price": "44939.4", "order_qty": "0.10000000", "timestamp": "2024-01-08T12:26:39.576380340Z"},
      {"order_id": "OAI5QZ-AMPLW-NBNO72", "limit_price": "44939.4", "order_qty": "0.14296323", "timestamp": "2024-01-08T12:26:39.602118534Z"},
      {"order_id": "O7VFZI-CTFWH-FF6EIR", "limit_price": "44939.4", "order_qty": "0.25000000", "timestamp": "2024-01-08T12:26:41.780601700Z"},
      {"order_id": "O472V3-ZG4EZ-OLD66C", "limit_price": "44939.4", "order_qty": "0.10292988", "timestamp": "2024-01-08T12:26:43.087136366Z"},
      {"order_id": "OEK26P-BGPUK-LDHMD2", "limit_price": "44939.4", "order_qty": "0.33880000", "timestamp": "2024-01-08T12:26:43.822433365Z"},
      {"order_id": "OSMYPE-S5VOC-YSS3WM", "limit_price": "44939.4", "order_qty": "1.28140860", "timestamp": "2024-01-08T12:26:45.066096694Z"},
      {"order_id": "OJPMIN-NXZL5-SOWP6V", "limit_price": "44937.1", "order_qty": "0.03346877", "timestamp": "2024-01-08T12:26:39.691304329Z"},
      {"order_id": "O6PUGE-SQWYQ-TRJEEE", "limit_price": "44934.7", "order_qty": "0.35630000", "timestamp": "2024-01-08T12:26:44.129718463Z"},
      {"order_id": "OPUOGC-Q532V-3OKLPM", "limit_price": "44930.2", "order_qty": "0.22734299", "timestamp": "2024-01-08T12:26:30.769031831Z"},
      {"order_id": "OCIU7J-VB3CI-HPULSF", "limit_price": "44930.2", "order_qty": "0.01000000", "timestamp": "2024-01-08T12:26:36.054352106Z"},
      {"order_id": "ORWVAF-LJFLY-ZWEHDQ", "limit_price": "44930.2", "order_qty": "0.05550000", "timestamp": "2024-01-08T12:26:36.635882793Z"},
      {"order_id": "OYRAHE-PI5AN-7KOQ4E", "limit_price": "44930.2", "order_qty": "0.70000000", "timestamp": "2024-01-08T12:26:37.296554518Z"},
      {"order_id": "OGBHYU-UILDD-6DLLYJ", "limit_price": "44930.2", "order_qty": "0.15000000", "timestamp": "2024-01-08T12:26:41.222733191Z"},
      {"order_id": "O74ZBU-K2TKC-R76XSW", "limit_price": "44928.0", "order_qty": "0.00105240", "timestamp": "2024-01-08T12:26:23.542563322Z"},
      {"order_id": "OQVTQF-Y56MR-BM6LWL", "limit_price": "44919.6", "order_qty": "0.33870000", "timestamp": "2024-01-08T12:26:42.808132842Z"},
      {"order_id": "OYEH6U-ZCHA2-3HFR3W", "limit_price": "44919.5", "order_qty": "0.07610000", "timestamp": "2024-01-08T12:26:34.269600037Z"},
      {"order_id": "OLGPG7-HVKXU-J6SANK", "limit_price": "44912.0", "order_qty": "0.35630000", "timestamp": "2024-01-08T12:26:34.961292766Z"},
      {"order_id": "OHGC3L-FRZQ3-UIVZRU", "limit_price": "44909.7", "order_qty": "0.06690000", "timestamp": "2024-01-08T12:26:31.912880024Z"},
      {"order_id": "O73C6Y-VZXYA-H4LDFY", "limit_price": "44901.9", "order_qty": "0.00088982", "timestamp": "2024-01-08T12:26:42.883315043Z"}
    ],
    "asks": [
      {"order_id": "OFVLAA-HRSSP-BK75KB", "limit_price": "44939.5", "order_qty": "4.52308393", "timestamp": "2024-01-08T12:18:05.770906486Z"},
      {"order_id": "OYBAMK-O5DKX-WMPUTM", "limit_price": "44939.5", "order_qty": "0.00111261", "timestamp": "2024-01-08T12:18:12.847426441Z"},
      {"order_id": "O3DRCT-J5M2S-KYV526", "limit_price": "44939.5", "order_qty": "0.00100000", "timestamp": "2024-01-08T12:26:42.108176464Z"},
      {"order_id": "OF3X3A-72WZY-6EKA5F", "limit_price": "44939.5", "order_qty": "0.01000000", "timestamp": "2024-01-08T12:26:43.955098263Z"},
      {"order_id": "OF5UA6-6IIZ2-YGQTSJ", "limit_price": "44950.0", "order_qty": "0.10334926", "timestamp": "2024-01-08T12:25:52.800473795Z"},
      {"order_id": "OSDOZX-7UZ6Y-QDNPVI", "limit_price": "44953.0", "order_qty": "0.00064537", "timestamp": "2024-01-08T12:24:58.086806970Z"},
      {"order_id": "OV7KTS-A2TWV-3XKRIA", "limit_price": "44955.0", "order_qty": "0.00250000", "timestamp": "2024-01-08T12:21:52.257936228Z"},
      {"order_id": "OOF2V5-RYOHC-GLRNPM", "limit_price": "44959.6", "order_qty": "0.35630000", "timestamp": "2024-01-08T12:26:44.202823127Z"},
      {"order_id": "OTVOVS-QLST3-3JG7JI", "limit_price": "44959.6", "order_qty": "0.35630000", "timestamp": "2024-01-08T12:26:44.203383999Z"},
      {"order_id": "OGZCIU-RDQ77-DAAL3P", "limit_price": "44960.1", "order_qty": "0.00338072", "timestamp": "2024-01-08T12:26:42.724829715Z"},
      {"order_id": "OVLG3E-HYBQM-CWNGCY", "limit_price": "44960.2", "order_qty": "0.88967575", "timestamp": "2024-01-08T12:26:12.935924248Z"},
      {"order_id": "OWEOFO-HUCJC-T37MVO", "limit_price": "44967.0", "order_qty": "3.14392283", "timestamp": "2024-01-08T12:26:39.474431925Z"},
      {"order_id": "OVYTHY-D2N76-5QYREQ", "limit_price": "44978.5", "order_qty": "0.06778960", "timestamp": "2024-01-08T12:26:41.229379178Z"},
      {"order_id": "OFO525-PHRVS-236RMN", "limit_price": "44979.2", "order_qty": "0.35630000", "timestamp": "2024-01-08T12:26:20.271584488Z"}
    ]
  }]
}
```

Asks string (low → high, order by order within each level):

```text theme={null}
44939545230839344939511126144939510000044939510000004495001033492644953064537449550250000449596356300004495963563000044960133807244960288967575449670314392283449785677896044979235630000
```

Bids string (high → low, order by order within each level):

```text theme={null}
449394889686994493944521000044939410000000449394142963234493942500000044939410292988449394338800004493941281408604493713346877449347356300004493022273429944930210000004493025550000449302700000004493021500000044928010524044919633870000449195761000044912035630000449097669000044901988982
```

Concatenated input to CRC32:

```text theme={null}
44939545230839344939511126144939510000044939510000004495001033492644953064537449550250000449596356300004495963563000044960133807244960288967575449670314392283449785677896044979235630000449394889686994493944521000044939410000000449394142963234493942500000044939410292988449394338800004493941281408604493713346877449347356300004493022273429944930210000004493025550000449302700000004493021500000044928010524044919633870000449195761000044912035630000449097669000044901988982
```

Expected result: **`1063832831`**


# Reconnection and resilience
Source: https://docs.kraken.com/exchange/guides/websockets/reconnection

How to handle WebSocket disconnections, re-subscription, and state reconciliation

WebSocket connections will disconnect — during maintenance windows, network hiccups, or load balancer recycling. A resilient client handles this transparently. This page covers the patterns you need.

## Connection lifecycle

A WebSocket connection to Kraken goes through these phases:

1. **Connect** — TCP + TLS handshake to `wss://ws.kraken.com/v2`
2. **Authenticate** (private channels) — obtain a token via `GetWebSocketsToken` and send it in the subscription
3. **Subscribe** — send subscription messages for each channel you need
4. **Receive snapshot** — Kraken sends the current state for stateful channels (book, open orders, balances)
5. **Stream updates** — incremental updates from there on
6. **Disconnect** — connection closes (server or network)
7. **Reconnect** — repeat from step 1

## Detecting disconnects

Kraken sends periodic `heartbeat` messages. If you stop receiving them, the connection is likely dead.

Subscribe to the heartbeat channel after connecting:

```json theme={null}
{"method": "subscribe", "params": {"channel": "heartbeat"}}
```

A heartbeat arrives roughly every second:

```json theme={null}
{"channel": "heartbeat"}
```

**Recommended approach:** set a deadline timer (e.g. 5 seconds). If no message of any kind arrives within the deadline, close and reconnect. Don't rely solely on TCP close events — connections can go silent without a clean close.

## Reconnection with backoff

Use exponential backoff with jitter to avoid thundering-herd reconnection storms:

```python theme={null}
import asyncio, random, websockets, json

async def connect_with_backoff(uri, handler):
    delay = 1.0
    max_delay = 60.0
    while True:
        try:
            async with websockets.connect(uri) as ws:
                delay = 1.0  # reset on successful connect
                await handler(ws)
        except Exception as e:
            jitter = random.uniform(0, delay * 0.1)
            print(f"Disconnected: {e}. Reconnecting in {delay:.1f}s")
            await asyncio.sleep(delay + jitter)
            delay = min(delay * 2, max_delay)
```

## Re-subscribing after reconnect

After reconnecting you must re-subscribe to all channels. Kraken does not automatically restore subscriptions.

Keep a local registry of your active subscriptions and replay them on every connect:

```python theme={null}
subscriptions = [
    {"method": "subscribe", "params": {"channel": "book", "symbol": ["BTC/USD"], "depth": 10}},
    {"method": "subscribe", "params": {"channel": "executions", "token": token}},
    {"method": "subscribe", "params": {"channel": "balances", "token": token}},
]

async def on_connect(ws):
    for sub in subscriptions:
        await ws.send(json.dumps(sub))
```

## State reconciliation after reconnect

On subscribe, Kraken sends a **snapshot** of the current state for stateful channels. Use this to rebuild your local state rather than trying to merge with your pre-disconnect state — the snapshot is authoritative.

### Order book

When you subscribe to `book`, you receive a full snapshot first:

```json theme={null}
{"channel": "book", "type": "snapshot", "data": [...all levels...]}
```

Followed by incremental updates:

```json theme={null}
{"channel": "book", "type": "update", "data": [...changed levels...]}
```

**On reconnect:** discard your existing book, wait for the snapshot, rebuild from scratch. Do not attempt to merge deltas from before and after the reconnect gap.

**Checksum validation:** after each update, validate the CRC32 checksum included in the message. If it fails, unsubscribe and re-subscribe to force a fresh snapshot.

```python theme={null}
def validate_checksum(book, expected_checksum):
    # Construct string from top 10 asks and bids
    # Format: price_without_dot + qty_without_dot, repeated
    # See checksum guide for full algorithm
    pass
```

### Open orders

Subscribe to `executions` to receive live order state. On reconnect, the snapshot contains all currently open orders.

After reconnecting, call `QueryOrders` via REST to cross-check against the snapshot for any orders that transitioned during the reconnect window:

```python theme={null}
# REST cross-check after reconnect
open_orders = rest_client.query_open_orders()
ws_snapshot_ids = {o["order_id"] for o in ws_snapshot}
for order in open_orders:
    if order["txid"] not in ws_snapshot_ids:
        # Order exists on exchange but not in WS snapshot — handle
        pass
```

### Balances

The `balances` channel snapshot on reconnect reflects current state. No additional REST call needed unless you need sub-second precision during the gap.

## Token refresh for private channels

WebSocket tokens expire after 15 minutes. If your connection lives longer than that, you need to refresh the token and re-authenticate.

**Recommended:** fetch a new token just before subscribing (not when the connection opens), so the token is fresh. For long-running connections, fetch a new token proactively before each reconnect:

```python theme={null}
async def get_fresh_token():
    response = await rest_client.post("/0/private/GetWebSocketsToken")
    return response["result"]["token"]

async def reconnect():
    token = await get_fresh_token()
    # Use token in subscription messages
```

## Using `cancelAllOrdersAfter` as a safety net

Enable the Dead Man's Switch before going live. It ensures that if your client fails to reconnect and stops refreshing, all open orders will be canceled automatically:

```python theme={null}
# Set a 60-second countdown — refresh this every ~30 seconds from your trading loop
rest_client.post("/0/private/CancelAllOrdersAfter", {"timeout": 60})

# Cancel the switch when you shut down cleanly
rest_client.post("/0/private/CancelAllOrdersAfter", {"timeout": 0})
```

## System status

Subscribe to the `status` channel to receive notifications about planned maintenance and trading mode changes:

```json theme={null}
{"method": "subscribe", "params": {"channel": "status"}}
```

Status updates include:

```json theme={null}
{
  "channel": "status",
  "data": [{
    "api_version": "v2",
    "connection_id": 12345678,
    "system": "online",
    "version": "2.0.9"
  }]
}
```

`system` values: `online`, `maintenance`, `cancel_only`, `post_only`, `limit_only`. When `maintenance` is received, stop sending orders and prepare to reconnect.

## Sequence numbers (WebSocket v1)

WebSocket v1 private feeds (`openOrders`, `ownTrades`) include sequence numbers. On reconnect, compare the first sequence number in the new snapshot against your last received sequence number to detect gaps.

If a gap is detected, fall back to REST (`OpenOrders`, `ClosedOrders`) to reconstruct the missed state before resuming from the new WebSocket feed.

## Maintenance windows

FIX sessions have a logical session rollover every day at **22:00 UTC**. This lasts approximately 30 seconds. Sequence numbers reset to 0. Reconnect and re-establish the session after the rollover.

WebSocket connections during maintenance receive a `status: maintenance` message. Reconnect attempts during the window will fail — implement your backoff so you retry automatically once the window ends.

## Related guides

<CardGroup>
  <Card title="WebSocket authentication" icon="lock" href="/exchange/guides/websockets/authentication">
    How to obtain and refresh WebSocket tokens
  </Card>

  <Card title="Order lifecycle" icon="arrows-spin" href="/exchange/guides/general/order-lifecycle">
    Order states and how to reconcile them after a disconnect
  </Card>

  <Card title="API key permissions" icon="key" href="/exchange/guides/rest/api-keys">
    Access WebSocket API permission required for private channels
  </Card>

  <Card title="Book checksum (v2)" icon="shield-check" href="/exchange/guides/websockets/book-checksum-v2">
    Validate your order book state after reconnect
  </Card>
</CardGroup>


# kraken-cli
Source: https://docs.kraken.com/home/cli

Single-binary CLI for Spot and Derivatives trading — scripting, automation, paper trading, and AI agent workflows!

kraken-cli is a single compiled binary for trading and account management across the Kraken exchange. No runtime dependencies. One install covers Spot, Derivatives, xStocks, Forex, Earn, and Subaccounts.

<CardGroup>
  <Card title="GitHub" icon="github" href="https://github.com/krakenfx/kraken-cli">
    Source, releases, and changelog
  </Card>

  <Card title="MCP server" icon="robot" href="/home/mcp">
    Expose all 151 commands as tools for AI agents via the built-in MCP server
  </Card>
</CardGroup>

## Install

```bash theme={null}
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/krakenfx/kraken-cli/releases/latest/download/kraken-cli-installer.sh | sh
```

Supported on macOS (Apple Silicon and Intel), Linux (x86\_64 and ARM64), and Windows via WSL. Release binaries are Minisign-verified.

Verify the install:

```bash theme={null}
kraken status && kraken ticker BTCUSD
```

## What it covers

151 commands across 13 groups. Six asset classes in one binary:

| Asset class                    | Examples                       | Notes                           |
| :----------------------------- | :----------------------------- | :------------------------------ |
| Crypto spot                    | BTC, ETH, SOL (1,400+ pairs)   | Default engine                  |
| xStocks (tokenized equities)   | AAPL, TSLA, SPY (79 assets)    | `--asset-class tokenized_asset` |
| Forex                          | EUR/USD, GBP/USD (11 pairs)    | `--asset-class forex`           |
| Perpetual futures              | 317 contracts                  | Futures engine                  |
| Inverse and fixed-date futures | BTC, ETH, SOL                  | Futures engine                  |
| Earn / staking                 | Flexible and bonded strategies | `kraken earn`                   |

### Command groups

| Group         | Commands | Auth required |
| :------------ | :------: | :-----------: |
| market        |    10    |       No      |
| account       |    18    |      Yes      |
| trade         |     9    |      Yes      |
| funding       |    10    |      Yes      |
| earn          |     6    |      Yes      |
| subaccount    |     2    |      Yes      |
| futures       |    39    |     Mixed     |
| paper         |    10    |       No      |
| futures-paper |    17    |       No      |
| websocket     |    15    |     Mixed     |
| futures-ws    |     9    |     Mixed     |
| auth          |     4    |       No      |
| utility       |     2    |       No      |

## Paper trading

The CLI's built-in paper trading engine runs against live prices with no authentication required. It is the recommended way to test strategies and integrations.

```bash theme={null}
# Spot paper trading
kraken paper balance
kraken paper order buy BTCUSD 0.001 --type limit --price 50000
kraken paper positions

# Futures paper trading
kraken futures paper balance
kraken futures paper order buy PF_XBTUSD 1 --type limit --price 50000
```

Paper and live trading share the same command interface — switching to live is a matter of removing the `paper` subcommand and providing credentials.

## Scripting and automation

All 151 commands support `-o json` output and consistent exit codes (0 = success, non-zero = failure), making them composable in shell scripts and CI pipelines:

```bash theme={null}
# Cancel all open orders on BTC/USD
kraken spot orders cancel-all --pair BTC/USD

# Stream the live order book to a file
kraken spot ws book --symbol BTC/USD >> book.jsonl

# Fetch balance as JSON, filter with jq
kraken account balance -o json | jq '.XXBT'
```

Stdout always produces valid JSON on success or an error envelope on failure. Stderr carries diagnostics only. Never parse stderr for data.

## Account management

```bash theme={null}
kraken balance
kraken open-orders -o json
kraken account trades
```

## Dead man's switch

Cancel all open orders if your process stops sending heartbeats:

```bash theme={null}
kraken spot cancel-after --timeout 60
```

## Authentication

Credentials are resolved in this order:

1. Command-line flags (`--api-key`, `--api-secret`)
2. Environment variables (`KRAKEN_API_KEY`, `KRAKEN_API_SECRET`)
3. Config file (`~/.config/kraken/config.toml`)

Run the setup wizard to configure interactively:

```bash theme={null}
kraken setup
```

Generate API keys at [Settings → API](https://www.kraken.com/u/security/api) for Spot, or in the Futures interface for Derivatives. Grant only the permissions your workflow needs.

## Interactive shell

For exploratory sessions:

```bash theme={null}
kraken shell
```

## AI agent integration

The CLI is designed for machine consumption: structured JSON output, stable error categories, and predictable exit codes. See the [MCP server](/home/mcp) page to expose all commands as tools for LLM agents.

Agent resources shipped with the CLI:

| Resource                    | Purpose                                |
| :-------------------------- | :------------------------------------- |
| `AGENTS.md`                 | Full agent integration guide           |
| `CONTEXT.md`                | Runtime context for tool-using agents  |
| `agents/tool-catalog.json`  | 151 commands with parameter schemas    |
| `agents/error-catalog.json` | 9 error categories with retry guidance |
| `skills/`                   | 50 goal-oriented workflow packages     |
| `CLAUDE.md`                 | Claude-specific guidance               |


# Quickstart
Source: https://docs.kraken.com/home/guides/quickstart

From Kraken account to your first programmatic trade in minutes

This guide walks you through the complete setup from creating your API key to placing your first order programmatically.

<Steps>
  <Step title="Create a Kraken account">
    If you don't have one, sign up at [kraken.com](https://www.kraken.com). You'll need to complete identity verification before accessing trading APIs.

    <Note>Spot trading requires a verified account. Futures trading requires additional activation — see your account settings.</Note>
  </Step>

  <Step title="Generate an API key">
    Go to [Settings → API](https://www.kraken.com/u/security/api) and click **Add key**.

    For this quickstart, enable these permissions:

    * **Query Funds** — read balances
    * **Query Open Orders & Trades** — read order status
    * **Create & Modify Orders** — place orders

    Copy your API key and private key. The private key is only shown once.

    <Warning>Store your private key securely. Never commit it to version control or share it. For production use, restrict the key to specific IP addresses.</Warning>
  </Step>

  <Step title="Verify connectivity">
    Check that the API is reachable and your system clock is correct. The `Time` endpoint requires no authentication:

    ```bash theme={null}
    curl https://api.kraken.com/0/public/Time
    ```

    Expected response:

    ```json theme={null}
    {
      "error": [],
      "result": {
        "unixtime": 1700000000,
        "rfc1123": "Thu,  1 Jan 2026 00:00:00 +0000"
      }
    }
    ```

    <Tip>Your system clock must be within a few seconds of real time. An incorrect clock is the most common cause of `EAPI:Invalid nonce` errors.</Tip>
  </Step>

  <Step title="Check your balances">
    Your first authenticated request. The nonce must be a strictly increasing integer — using the current timestamp in milliseconds works well.

    <CodeGroup>
      ```bash cURL theme={null}
      API_KEY="your_api_key"
      API_SECRET="your_private_key"
      NONCE=$(date +%s%3N)
      DATA="nonce=$NONCE"
      API_PATH="/0/private/Balance"

      SIGNATURE=$(echo -n "${NONCE}${DATA}" | \
        openssl dgst -sha256 -binary | \
        cat <(echo -n "$API_PATH") - | \
        openssl dgst -sha512 -binary -hmac "$(echo "$API_SECRET" | base64 -d)" | \
        base64)

      curl -X POST "https://api.kraken.com${API_PATH}" \
        -H "API-Key: $API_KEY" \
        -H "API-Sign: $SIGNATURE" \
        -d "$DATA"
      ```

      ```python Python theme={null}
      import time, base64, hashlib, hmac, urllib.parse, requests

      api_key = "your_api_key"
      api_secret = "your_private_key"

      def kraken_request(url_path, data):
          nonce = str(int(time.time() * 1000))
          data["nonce"] = nonce
          postdata = urllib.parse.urlencode(data)
          encoded = (nonce + postdata).encode()
          message = url_path.encode() + hashlib.sha256(encoded).digest()
          mac = hmac.new(base64.b64decode(api_secret), message, hashlib.sha512)
          sig = base64.b64encode(mac.digest()).decode()
          return requests.post(
              "https://api.kraken.com" + url_path,
              headers={"API-Key": api_key, "API-Sign": sig},
              data=data
          ).json()

      print(kraken_request("/0/private/Balance", {}))
      ```
    </CodeGroup>
  </Step>

  <Step title="Test in a UAT environment">
    Both Spot and Futures provide UAT environments for validating your integration before going live.

    **Spot UAT** is available on request — contact your Account Manager. Once provisioned, it uses a separate base URL and isolated API keys but mirrors the full production trading stack.

    **Futures sandbox** is self-service at `https://demo-futures.kraken.com`. Generate a separate API key on the demo platform to get started immediately.

    ```bash theme={null}
    # Futures sandbox — get available instruments
    curl https://demo-futures.kraken.com/derivatives/api/v3/instruments

    # Place a limit order (buy 1 BTC perpetual at $90,000)
    curl -X POST https://demo-futures.kraken.com/derivatives/api/v3/sendorder \
      -H "APIKey: your_sandbox_api_key" \
      -H "Authent: your_signature" \
      -d "orderType=lmt&symbol=PF_XBTUSD&side=buy&size=1&limitPrice=90000"
    ```

    <Note>The Futures demo environment resets periodically. It is intended for integration validation, not persistent backtesting.</Note>
  </Step>
</Steps>

## Next steps

<CardGroup>
  <Card title="API key permissions" icon="key" href="/exchange/guides/rest/api-keys">
    Understand which permissions to enable for each use case
  </Card>

  <Card title="Authentication" icon="lock" href="/exchange/guides/rest/authentication">
    Deep dive into nonce management and signature generation
  </Card>

  <Card title="Rate limits" icon="gauge" href="/exchange/guides/rest/ratelimits">
    Understand trading rate limits and how to stay within them
  </Card>

  <Card title="WebSocket" icon="bolt" href="/exchange/guides/websockets/introduction">
    Switch to WebSocket for real-time order updates and market data
  </Card>

  <Card title="Error reference" icon="triangle-exclamation" href="/exchange/guides/general/errors">
    Common errors and how to fix them
  </Card>

  <Card title="API comparison" icon="table" href="/exchange/guides/general/api-comparison">
    Choose between REST, WebSocket, and FIX for your use case
  </Card>
</CardGroup>


# MCP server
Source: https://docs.kraken.com/home/mcp

Expose all Kraken CLI commands as tools for AI agents via the built-in Model Context Protocol server

kraken-cli ships a built-in [Model Context Protocol](https://modelcontextprotocol.io) server over stdio. It exposes all 151 CLI commands as structured tools that any MCP-compatible AI agent can call — Claude, Cursor, GitHub Copilot, Windsurf, and others.

The MCP server is part of the CLI binary. [Install the CLI](/home/cli) first.

## Quickstart

```bash theme={null}
kraken mcp
```

This starts the server with the default safe service set: `market` (public data), `account` (read-only), and `paper` (paper trading). No credentials required for market and paper.

## Client setup

<Tabs>
  <Tab title="Claude Code">
    Run once to register the server for your user:

    ```bash theme={null}
    claude mcp add --scope user kraken -- kraken mcp -s market,account,paper
    ```

    For all services including live trading:

    ```bash theme={null}
    claude mcp add --scope user kraken -- kraken mcp -s all
    ```

    Verify it is registered:

    ```bash theme={null}
    claude mcp list
    ```
  </Tab>

  <Tab title="Claude Desktop">
    Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

    ```json theme={null}
    {
      "mcpServers": {
        "kraken": {
          "command": "kraken",
          "args": ["mcp", "-s", "market,account,paper"]
        }
      }
    }
    ```

    Restart Claude Desktop to pick up the change.
  </Tab>

  <Tab title="Cursor">
    Create or edit `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` in your project:

    ```json theme={null}
    {
      "mcpServers": {
        "kraken": {
          "command": "kraken",
          "args": ["mcp", "-s", "market,account,paper"]
        }
      }
    }
    ```

    Reload the Cursor window after saving.
  </Tab>

  <Tab title="VS Code (Copilot)">
    Create or edit `.vscode/mcp.json` in your workspace:

    ```json theme={null}
    {
      "servers": {
        "kraken": {
          "type": "stdio",
          "command": "kraken",
          "args": ["mcp", "-s", "market,account,paper"]
        }
      }
    }
    ```
  </Tab>

  <Tab title="Windsurf">
    Edit `~/.codeium/windsurf/mcp_config.json`:

    ```json theme={null}
    {
      "mcpServers": {
        "kraken": {
          "command": "kraken",
          "args": ["mcp", "-s", "market,account,paper"]
        }
      }
    }
    ```

    Restart Windsurf to apply.
  </Tab>
</Tabs>

## Services

Pass `-s <services>` to control which command groups are exposed. Multiple services are comma-separated.

| Service         | Auth  | Risk level | What it exposes                                   |
| :-------------- | :---- | :--------- | :------------------------------------------------ |
| `market`        | No    | None       | Ticker, orderbook, trades, OHLC, spreads          |
| `account`       | Yes   | Read-only  | Balances, open orders, trade history, positions   |
| `paper`         | No    | None       | Spot paper trading (live prices, no real capital) |
| `futures-paper` | No    | None       | Futures paper trading                             |
| `trade`         | Yes   | Dangerous  | Place, amend, and cancel live Spot orders         |
| `futures`       | Mixed | Dangerous  | Futures order entry and market data               |
| `earn`          | Yes   | Dangerous  | Staking allocations and deallocations             |
| `funding`       | Yes   | Dangerous  | Withdrawals and transfers                         |
| `subaccount`    | Yes   | Dangerous  | Subaccount creation and transfers                 |
| `auth`          | No    | Read-only  | Credential validation                             |
| `all`           | Mixed | Mixed      | All of the above                                  |

**Default** (no `-s` flag): `market`, `account`, `paper`.

### Dangerous tools

Tools marked dangerous (order placement, withdrawals, transfers) require the calling agent to pass `acknowledged: true` in the tool input unless the server was started with `--allow-dangerous`. This gives you a confirmation gate at the tool level without relying on the agent's judgment alone.

```bash theme={null}
# Require per-call acknowledgement for dangerous tools
kraken mcp -s all

# Disable the acknowledgement gate (use in trusted, controlled environments only)
kraken mcp -s all --allow-dangerous
```

## Authentication

Set credentials as environment variables before starting the server:

```bash theme={null}
export KRAKEN_API_KEY="your-key"
export KRAKEN_API_SECRET="your-secret"
kraken mcp -s market,account,trade
```

Or use the CLI config file (set up once with `kraken setup`). The server inherits credentials from the CLI's standard resolution order.

## What agents can do

With the default safe service set, an agent can:

* Query live prices, orderbooks, and recent trades for any pair
* Check account balances and open orders
* Place and cancel paper trades against live prices
* Stream real-time market data

With `trade` added, an agent can place, amend, and cancel live orders. With `funding`, it can initiate withdrawals. Scope services to the minimum your workflow requires.

## Safety notes

* The MCP server runs locally over stdio and is not exposed as a network service
* Use minimum-permission API keys scoped to what the agent actually needs
* The default service set (`market`, `account`, `paper`) is read-only for live funds
* Treat agent sessions with live trading scope the same as a logged-in user session
* Set position size limits and pair allowlists at the API key level on Kraken's settings page

## Agent resources

The CLI ships supplementary resources for agent integration:

| Resource                    | Purpose                                                          |
| :-------------------------- | :--------------------------------------------------------------- |
| `AGENTS.md`                 | Full integration guide with patterns and constraints             |
| `CONTEXT.md`                | Runtime context injected at session start                        |
| `agents/tool-catalog.json`  | All 151 commands with parameter schemas in machine-readable form |
| `agents/error-catalog.json` | 9 error categories with retry guidance                           |
| `skills/`                   | 50 pre-built workflow packages for common trading tasks          |
| `CLAUDE.md`                 | Claude-specific guidance for the CLI                             |


# SDKs
Source: https://docs.kraken.com/home/sdks/index

Official Kraken SDKs for Spot and Derivatives — Go SDK and community libraries

<CardGroup>
  <Card title="kraken-cli" icon="terminal" href="/home/cli">
    Single-binary CLI for Spot and Derivatives trading. 151 commands, paper trading, scripting, and AI agent support.
  </Card>

  <Card title="MCP server" icon="robot" href="/home/mcp">
    Built-in MCP server that exposes all CLI commands as tools for LLM agents.
  </Card>
</CardGroup>

## api-go

[api-go](https://github.com/krakenfx/api-go) is the official Go module for building integrations against the Spot and Derivatives APIs.

### Install

```bash theme={null}
go get github.com/krakenfx/api-go/v2/...
```

### What it covers

* Spot and Derivatives REST (public and authenticated endpoints)
* Spot and Derivatives WebSocket (public data streams and private channels)
* Order operations: add, amend, cancel
* Real-time order book construction with CRC32 checksum validation
* Instrument and asset lookups, account data retrieval

### Example

```go theme={null}
client := krakenapi.New(apiKey, apiSecret)
resp, err := client.AddOrder(krakenapi.AddOrderOptions{
    Pair:      "XBTUSD",
    Type:      "buy",
    OrderType: "limit",
    Price:     "60000",
    Volume:    "0.01",
})
```

## Community libraries

<Note>
  These libraries are not officially maintained by Kraken. Review before using in production.
</Note>

| Library            | Language | Scope                 | Repository                                                                               |
| :----------------- | :------- | :-------------------- | :--------------------------------------------------------------------------------------- |
| kraken-wsclient-py | Python   | WebSocket only (Spot) | [github.com/krakenfx/kraken-wsclient-py](https://github.com/krakenfx/kraken-wsclient-py) |
| kraken-api-client  | PHP      | REST (example only)   | [github.com/krakenfx/kraken-api-client](https://github.com/krakenfx/kraken-api-client)   |


# Support
Source: https://docs.kraken.com/home/support/index

Get help with Kraken API integrations — support channels, status monitoring, and contact options

## API status

Check real-time health and incident history for all Kraken APIs at [status.kraken.com](https://status.kraken.com).

## Help center

Browse troubleshooting guides, FAQs, and account-related support at [support.kraken.com](https://support.kraken.com).

## Contact

For API-specific issues, send a full copy of your request including your IP address and all headers to [api@kraken.com](mailto:api@kraken.com).

| Topic                    | Contact                                                     |
| :----------------------- | :---------------------------------------------------------- |
| General API support      | [api@kraken.com](mailto:api@kraken.com)                     |
| Institutional onboarding | [institutional@kraken.com](mailto:institutional@kraken.com) |
| Embed / B2B partnerships | [embed@kraken.com](mailto:embed@kraken.com)                 |
| Market data licensing    | [marketdata@kraken.com](mailto:marketdata@kraken.com)       |


# Start building with Kraken
Source: https://docs.kraken.com/index

Build on Kraken — spot, derivatives, OTC, custody, and crypto payments over REST, WebSocket, and FIX.

<div>
  <div>
    <h1>Start building<br />with Kraken</h1>

    Build on Kraken — spot, derivatives, OTC, custody, and crypto payments over REST, WebSocket, and FIX.

    <HeroActions />
  </div>

  <div>
    <CodeGroup>
      ```python Python theme={null}
      import krakenex

      api = krakenex.API()
      api.key    = 'API_KEY'
      api.secret = 'API_SECRET'

      resp = api.query_private('AddOrder', {
          'pair':      'XXBTZUSD',
          'type':      'buy',
          'ordertype': 'limit',
          'price':     '50000',
          'volume':    '1.0',
      })
      print(resp['result'])
      ```

      ```javascript Node.js theme={null}
      const KrakenClient = require('kraken-api');
      const kraken = new KrakenClient(
        process.env.API_KEY,
        process.env.API_SECRET
      );

      const resp = await kraken.api('AddOrder', {
        pair:      'XXBTZUSD',
        type:      'buy',
        ordertype: 'limit',
        price:     '50000',
        volume:    '1.0',
      });
      console.log(resp.result);
      ```

      ```bash cURL theme={null}
      curl -X POST "https://api.kraken.com/0/private/AddOrder" \
        -H "API-Key: $API_KEY" \
        -H "API-Sign: $API_SIGN" \
        -d "nonce=$NONCE" \
        -d "ordertype=limit" \
        -d "type=buy" \
        -d "pair=XXBTZUSD" \
        -d "price=50000" \
        -d "volume=1.0"
      ```
    </CodeGroup>
  </div>
</div>

## Browse by product

<ProductCards />

## Kraken CLI

<KrakenCliSection />

## Need help integrating?

<CardGroup>
  <Card title="Help center" icon="circle-question" href="https://support.kraken.com">
    Browse account and product FAQs.
  </Card>

  <Card title="API status" icon="signal" href="https://status.kraken.com">
    Real-time API health and uptime.
  </Card>

  <Card title="Contact support" icon="headset" href="mailto:api@kraken.com">
    Open a ticket with API support.
  </Card>
</CardGroup>


# Custody REST
Source: https://docs.kraken.com/institutional/api-reference/custody-rest

Kraken Custody REST API reference

Reference documentation for the Kraken Custody REST API.


# OTC REST
Source: https://docs.kraken.com/institutional/api-reference/otc-rest

Kraken OTC REST API reference

Reference documentation for the Kraken OTC REST API.


# Institutional API reference
Source: https://docs.kraken.com/institutional/api-reference/overview

OTC, Custody, and Prime — pick the service and protocol for your workflow

Kraken's Institutional APIs cover three services. **OTC** and **Custody** are single-protocol; **Prime** offers REST, FIX, and WebSocket against the same accounts.

<Note>
  All Institutional APIs require onboarding through your Account Manager. See the [Institutional overview](/institutional/guides/overview) for use cases and access requirements.
</Note>

## OTC

Off-book block trading with negotiated quotes — request, accept, and reconcile large trades.

<CardGroup>
  <Card title="OTC REST" icon="code" href="/institutional/api-reference/otc-rest">
    Quote requests, active and historical quotes, exposures.
  </Card>
</CardGroup>

## Custody

Programmatic management of segregated wallets, deposits, withdrawals, and reconciliation.

<CardGroup>
  <Card title="Custody REST" icon="code" href="/institutional/api-reference/custody-rest">
    Vaults, balances, deposit/withdraw methods, custody tasks and activities.
  </Card>
</CardGroup>

## Prime

Institutional brokerage with three protocol surfaces against the same Prime accounts and keys.

<CardGroup>
  <Card title="Prime REST" icon="code" href="/institutional/api-reference/prime-rest">
    API-user management, key lifecycle, and settlement batches.
  </Card>

  <Card title="Prime FIX" icon="terminal" href="/institutional/api-reference/prime-fix/logon">
    FIX 4.4 order management and market data — co-located, deterministic.
  </Card>

  <Card title="Prime WebSocket" icon="bolt" href="/institutional/api-reference/prime-websocket/authentication">
    Real-time order events, balances, exposures, and RFQ flows.
  </Card>
</CardGroup>

## Not sure where to start?

<CardGroup>
  <Card title="Custody REST authentication" icon="lock" href="/institutional/guides/custody-rest-auth">
    Authenticate requests to the Custody REST API.
  </Card>

  <Card title="Prime WebSocket authentication" icon="lock" href="/institutional/guides/prime-websocket-auth">
    Authenticate and subscribe to Prime WebSocket channels.
  </Card>
</CardGroup>


# Execution Report
Source: https://docs.kraken.com/institutional/api-reference/prime-fix/er

FIX message used to acknowledge or reject orders, and to relay order status and fill updates.

The ExecutionReport message is used to acknowledge/reject an order or changes to an order, and to relay order status and fill updates.

<Tabs>
  <Tab title="FIX Specification">
    <ParamField type="">
      MsgType <code>8</code>
    </ParamField>

    <ParamField type="string">
      Unique identifier for Order as assigned by the client. Must be `<= 36 characters`. UUIDs are recommended.
    </ParamField>

    <ParamField type="string">
      Set to the ClOrdID of the previous accepted order when responding to a Cancel or Cancel/Replace request. Required when exectype=Cancel.
    </ParamField>

    <ParamField type="string">
      Unique identifier of most recent order as assigned by Customer.
    </ParamField>

    <ParamField type="string">
      The symbol of the currency pair to place an order on in the format `BASE-QUOTE`.
    </ParamField>

    <ParamField type="integer">
      Side of the order.

      <ul>
        <b>Possible values: </b>
        <li><code>1</code> : Buy</li>
        <li><code>2</code> : Sell</li>
      </ul>
    </ParamField>

    <ParamField type="float">
      Size of the order.
    </ParamField>

    <ParamField type="float">
      Price of the order. Required when OrderType=Limit/LimitAllIn.
    </ParamField>

    <ParamField type="string">
      Time of event expressed in UTC. Format: YYYYMMDD-HH:MM:SS.uuu
    </ParamField>

    <ParamField type="string">
      Unique identifier of most recent order as assigned by Customer.
    </ParamField>

    <ParamField type="integer">
      Sequence number for every ExecType=Trade. This ID unique by pair. Required when ExecType=Trade.
    </ParamField>

    <ParamField type="char">
      Describes the type of order event and determines the set of fields in the message.

      <ul>
        <b>Possible Values:</b>
        <li><code>0</code> : New</li>
        <li><code>3</code> : Done for day</li>
        <li><code>4</code> : Canceled</li>
        <li><code>5</code> : Replaced</li>
        <li><code>6</code> : Pending Cancel</li>
        <li><code>8</code> : Rejected</li>
        <li><code>A</code> : Pending New</li>
        <li><code>E</code> : Pending Replace</li>
        <li><code>F</code> : Trade</li>
      </ul>
    </ParamField>

    <ParamField type="string">
      <ul>
        <b>Possible Values:</b>
        <li><code>1</code> : GTC (Good till canceled)</li>
        <li><code>3</code> : IOC (Immediate or Cancel)</li>
        <li><code>4</code> : Fill Or Kill (FOK)</li>
      </ul>
    </ParamField>

    <ParamField type="char">
      The execution model of the order.

      <ul>
        <b>Possible values: </b>
        <li><code>1</code> : market</li>
        <li><code>2</code> : Limit</li>
      </ul>
    </ParamField>

    <ParamField type="char">
      Describes the status of the order.

      <ul>
        <b>Possible Values:</b>
        <li><code>0</code> : New</li>
        <li><code>1</code> : Partially Filled</li>
        <li><code>2</code> : Filled</li>
        <li><code>3</code> : Done for day</li>
        <li><code>4</code> : Canceled</li>
        <li><code>5</code> : Replaced</li>
        <li><code>6</code> : Pending Cancel</li>
        <li><code>8</code> : Rejected</li>
        <li><code>A</code> : Pending New</li>
        <li><code>E</code> : Pending Replace</li>
      </ul>
    </ParamField>

    <ParamField type="float">
      Quantity open for further execution. If OrdStatus(39) is 4 (Canceled), 3 (Done For Day), or 8 (Rejected) then LeavesQty(151) could be 0, otherwise LeavesQty(151) = OrderQty(38) - CumQty(14).
    </ParamField>

    <ParamField type="float">
      Currently executed quantity for chain of orders.
    </ParamField>

    <ParamField type="float">
      Calculated average price of all fills on this order. Required when ExecType=Trade.
    </ParamField>

    <ParamField type="char">
      Reason for rejection. Required when ExecType=Rejected.

      <ul>
        <b>Possible values: </b>
        <li><code>0</code> : Broker / exchange option</li>
        <li><code>1</code> : Unknown symbol</li>
        <li><code>2</code> : Exchange closed</li>
        <li><code>3</code> : Order exceeds limit</li>
        <li><code>5</code> : Unknown order</li>
        <li><code>6</code> : Duplicate of an existing order</li>
        <li><code>7</code> : Duplicate of a verbally communicated order</li>
        <li><code>8</code> : Stale order</li>
      </ul>
    </ParamField>

    <ParamField type="float">
      Price of the last trade. Required when ExecType=Trade.
    </ParamField>

    <ParamField type="float">
      Quantity bought or sold on the last trade. Required when ExecType=Trade.
    </ParamField>

    <ParamField type="float">
      Last amount traded (i.e. quantity \* price) expressed in units of counter currency. Required when ExecType=Trade.
    </ParamField>

    <ParamField type="float">
      Cumulative amount traded (i.e. quantity \* price) expressed in units of counter currency. Required when ExecType=Trade.
    </ParamField>

    <ParamField type="float">
      Cumulative fee amount expressed in units of fee currency. Required when ExecType=Trade.
    </ParamField>

    <ParamField type="float">
      Fee amount for the last trade expressed in units of fee currency. Required when ExecType=Trade.
    </ParamField>

    <ParamField type="string">
      Currency of the fee for the last trade. Required when ExecType=Trade.
    </ParamField>

    <ParamField type="char">
      Whether or not the order is canceled on disconnect. Required when ExecType=Trade.

      <ul>
        <b>Possible values: </b>
        <li><code>N</code> : No</li>
        <li><code>Y</code> : Yes</li>
      </ul>
    </ParamField>

    <ParamField type="char">
      The current decision status of the order. Required when ExecType=Trade. Default: A

      <ul>
        <b>Possible values: </b>
        <li><code>A</code> : Active</li>
        <li><code>P</code> : Paused</li>
        <li><code>U</code> : Pending Pause</li>
        <li><code>R</code> : Pending Resume</li>
        <li><code>W</code> : Waiting for StartTime</li>
        <li><code>T</code> : Waiting for Trigger</li>
      </ul>

      Paused or staged orders can be edited or resumed from the Customer UI. Pending statuses are intermediate states.
    </ParamField>

    <ParamField type="string">
      Full description for Cancellations or status of the order.
    </ParamField>

    <ParamField type="" />
  </Tab>

  <Tab title="Example">
    ```text theme={null}
    8=FIX.4.4|9=366|35=8|34=2|49={{ Customer }}|52=20220915-18:30:01.393|56=CUSTOMER|1=default|6=0|11=id-220912164936074-1152|14=0|17=ba22dbe1-cb33-4fcb-9613-921006afdebd|37=94869628-b862-43e4-bd2d-be85e4295bd4|38=1.00000000|39=8|40=2|44=1630.123|54=2|55=ETH-USD|58=Unable to submit market order - please try again later.|59=1|60=20220915-14:30:01.000|103=0|150=8|151=1.00000000|20030=N|20032=A|10=205|
    ```
  </Tab>
</Tabs>


# Header & Trailer
Source: https://docs.kraken.com/institutional/api-reference/prime-fix/header-trailer

Standard FIX message header and trailer fields required in every FIX message.

Every FIX message must include a standard header and trailer. The header contains essential routing and sequence information, while the trailer provides message integrity verification.

<Tabs>
  <Tab title="FIX Specification">
    <ParamField type="string">
      FIX.4.4. Must be the first field in the message.
    </ParamField>

    <ParamField type="integer">
      Must be the second field in the message.
    </ParamField>

    <ParamField type="string">
      Must be the third field in the message.
    </ParamField>

    <ParamField type="string">
      Provided by Customer during onboarding.
    </ParamField>

    <ParamField type="string">
      Provided by Customer during onboarding.
    </ParamField>

    <ParamField type="integer">
      Message sequence number.
    </ParamField>

    <ParamField type="boolean">
      Always required for retransmitted messages, whether prompted by the sending system or as the result of a resend request.
    </ParamField>

    <ParamField type="boolean">
      Required when the message may be duplicate of another message sent under a different sequence number.
    </ParamField>

    <ParamField type="string">
      Time of message transmission expressed in UTC. Format: YYYYMMDD-HH:MM:SS.uuu (required).
    </ParamField>

    <ParamField type="string">
      Required for message re-sent as a result of a ResendRequest. If data is not available set to same value as SendingTime (52). Format: YYYYMMDD-HH:MM:SS.uuu
    </ParamField>

    <ParamField type="string">
      Three byte, simple checksum. See the FIX spec for details.
    </ParamField>
  </Tab>
</Tabs>


# Heartbeat
Source: https://docs.kraken.com/institutional/api-reference/prime-fix/heartbeat

FIX message used to maintain session connectivity and confirm the application is functioning normally.

The Heartbeat message is used to maintain session connectivity and indicate that the application is functioning normally. Heartbeat messages are sent periodically based on the HeartBtInt from Logon, in response to Test Request messages, or when no other messages have been sent within the heartbeat interval.

<Tabs>
  <Tab title="FIX Specification">
    <ParamField type="">
      MsgType <code>0</code>
    </ParamField>

    <ParamField type="string">
      Required when the heartbeat is the result of a Test Request message.
    </ParamField>

    <ParamField type="" />
  </Tab>
</Tabs>


# Logon
Source: https://docs.kraken.com/institutional/api-reference/prime-fix/logon

Authenticate and establish a FIX session using HMAC SHA-256 signature-based authentication.

The Logon message is used to authenticate and establish a FIX session. It includes signature-based authentication using HMAC SHA-256.

<Tabs>
  <Tab title="FIX Specification">
    <ParamField type="">
      MsgType <code>A</code>
    </ParamField>

    <ParamField type="integer">
      Note same value used by both sides.
    </ParamField>

    <ParamField type="boolean">
      Indicates both sides of a FIX session should reset sequence numbers.
    </ParamField>

    <ParamField type="string">
      Contains signature (see below for creating a signature).
    </ParamField>

    <ParamField type="string">
      Contains the API Key for the Customer user.
    </ParamField>

    <ParamField type="" />
  </Tab>

  <Tab title="Example">
    **Logon Request:**

    ```text theme={null}
    8=FIX.4.4|9=143|35=A|34=1|49=CUSTOMER|52=20220915-18:29:58.756|56={{ Customer }}|95=44|96=ZduZiNxyxS7_4UPDesOryd9KVEecg9LAqqTRR79Pp20=|98=0|108=60|141=Y|554=PMsU9ypImeJ0ad9X39ngzPYRA|10=248|
    ```

    **Logon Response:**

    ```text theme={null}
    8=FIX.4.4|9=78|35=A|34=1|49={{ Customer }}|52=20220915-18:29:58.765|56=CUSTOMER|98=0|108=60|141=Y|10=255|
    ```
  </Tab>
</Tabs>

## Creating a Signature

The signature is created by concatenating:

* SendingTime (52) as a string
* ASCII 01 value
* SeqNum (34) as a string
* ASCII 01 value
* SenderCompID (49)
* ASCII 01 value
* TargetCompID (56)

This string is then signed using the HMAC SHA-256 Algorithm and the API Secret for the API Key.

### Sample Java Code

```java theme={null}
/**
 * Takes a Message, an apiKey and apiSecret and uses the HMAC-SHA256 algorithm to
 * sign a FIX message by appending the sending-time sequenceNumber, SenderCompID 
 * and TargetCompID with \u0001 separator and signing using the secret, putting it 
 * into the RawBytes in Base64 encoding.
 */
private static void signLogon(final Message message,
                              final SessionID sessionId,
                              final String apiKey,
                              final String apiSecret) throws FieldNotFound {
    final var senderCompId = sessionId.getSenderCompID();
    final var targetCompId = sessionId.getTargetCompID();
    final var sendingTime = message.getString(SendingTime.FIELD);
    final var seqNum = message.getInt(MsgSeqNum.FIELD);
    final var sep = "\u0001";
    
    final var hmac = sign(apiSecret, sendingTime + sep + seqNum + sep + 
                         senderCompId + sep + targetCompId);
    
    message.setString(Password.FIELD, apiKey);
    message.setInt(RawDataLength.FIELD, hmac.length());
    message.setString(RawData.FIELD, hmac);
}

private static String sign(final String apiSecret, final String data) {
    final var mac = HmacUtils.getInitializedMac(HmacAlgorithms.HMAC_SHA_256,
                                               apiSecret.getBytes());
    final var encodedBytes = mac.doFinal(data.getBytes());
    final var encoder = Base64.getUrlEncoder(); //URL Safe Base64
    return encoder.encodeToString(encodedBytes);
}
```

<Note>
  **Dependencies**

  This sample relies on Apache Commons-Codec and QuickFIX for Java.
</Note>


# Logout
Source: https://docs.kraken.com/institutional/api-reference/prime-fix/logout

FIX message used to initiate or confirm the termination of a FIX session.

The Logout message is used to initiate or confirm the termination of a FIX session.

<Tabs>
  <Tab title="FIX Specification">
    <ParamField type="">
      MsgType <code>5</code>
    </ParamField>

    <ParamField type="string">
      Optional text message.
    </ParamField>

    <ParamField type="" />
  </Tab>
</Tabs>


# Market Data Request
Source: https://docs.kraken.com/institutional/api-reference/prime-fix/mdr

FIX message to request market data for a specific symbol.

Request market data for a specific symbol. Note that exactly one of either Depth, or SizeBucket must be specified. For example, specifying both Depth and SizeBuckets will result in an error.

<Tabs>
  <Tab title="FIX Specification">
    <ParamField type=""> MsgType <code>V</code> </ParamField>

    <ParamField type="string">
      Must be unique, or the ID of previous Market Data Request to disable if SubscriptionRequestType(263) = 2 (Disable previous Snapshot + Updates Request).
    </ParamField>

    <ParamField type="integer">
      Subscription type for market data.

      <ul>
        <b>Possible values: </b>
        <li><code>0</code> : Snapshot</li>
        <li><code>1</code> : Snapshot + Updates (Subscribe)</li>
        <li><code>2</code> : Unsubscribe</li>
      </ul>
    </ParamField>

    <ParamField type="integer">
      Depth of market for Book Snapshot / Incremental updates. Exactly one of tag 264 or tag 20020 must be specified.

      <ul>
        <b>Possible values: </b>
        <li><code>0</code> : Full book depth</li>
        <li><code>1</code> : Top of book</li>
        <li><code>2 and above</code> : Book depth (number of levels)</li>
      </ul>
    </ParamField>

    <ParamField type="integer">
      Type of liquidity to be included.

      <ul>
        <b>Possible values: </b>
        <li><code>0</code> : Indicative</li>
        <li><code>1</code> : Tradeable (i.e., Firm)</li>
      </ul>
    </ParamField>

    <ParamField type="integer">
      A list of sizes to return price levels for. Used to ask for prices of aggregated sizes. Exactly one of tag 264 or tag 20020 must be specified. Only supported with MDUpdateType(265) = 0 (Full refresh).
    </ParamField>

    <ParamField type="float">
      Identifies a single size bucket. Required if NoSizeBucketsSegments is used.
    </ParamField>

    <ParamField type="string">
      The symbol of the currency pair to subscribe to. For example, BTC-USD.
    </ParamField>

    <ParamField type="" />
  </Tab>

  <Tab title="Example">
    ```text theme={null}
    8=FIX.4.4|9=186|35=V|34=2|49=CUSTOMER_MD|52=20220930-13:28:06.146|56={{ Customer }}|262=id-220929160342682-26|263=1|264=0|265=0|1070=1|146=1|55=ETH-USD|267=2|269=0|269=1|20020=4|20021=1|20021=2|20021=5|20021=10|10=226|
    ```
  </Tab>
</Tabs>


# Market Data Request Reject
Source: https://docs.kraken.com/institutional/api-reference/prime-fix/mdrr

FIX message used to reject invalid market data requests.

The Market Data Request Reject message is used to reject invalid market data requests.

<Tabs>
  <Tab title="FIX Specification">
    <ParamField type=""> MsgType <code>Y</code> </ParamField>

    <ParamField type="string">
      Refers to the MDReqID of the request.
    </ParamField>

    <ParamField type="string">
      Free-format text string explaining the rejection reason.
    </ParamField>

    <ParamField type="" />
  </Tab>
</Tabs>


# Market Data Snapshot Full Refresh
Source: https://docs.kraken.com/institutional/api-reference/prime-fix/mdsfr

FIX message providing a complete refresh of market data for a requested symbol.

The Market Data Snapshot Full Refresh message provides a complete refresh of market data for a requested symbol.

<Tabs>
  <Tab title="FIX Specification">
    <ParamField type=""> MsgType <code>W</code> </ParamField>

    <ParamField type="string">
      Refers to the MDReqID of the request.
    </ParamField>

    <ParamField type="string">
      Symbol updated by the Market Data Entry.
    </ParamField>

    <ParamField type="integer">
      Number of entries following.
    </ParamField>

    <ParamField type="integer">
      Type of market data entry. Required if NoMDEntries(268) > 0.

      <ul>
        <b>Possible values: </b>
        <li><code>0</code> : Bid</li>
        <li><code>1</code> : Offer</li>
      </ul>
    </ParamField>

    <ParamField type="float">
      Price of the Market Data Entry.
    </ParamField>

    <ParamField type="float">
      Quantity represented by the Market Data Entry.
    </ParamField>

    <ParamField type="string">
      Date of Market Data Entry.
    </ParamField>

    <ParamField type="string">
      Time of Market Data Entry.
    </ParamField>

    <ParamField type="" />
  </Tab>

  <Tab title="Example">
    ```text theme={null}
    8=FIX.4.4|9=608|35=W|34=2|49={{ Customer }}|52=20220930-13:28:06.454|56=CUSTOMER_MD|55=ETH-USD|262=id-220929160342682-26|268=8|269=0|270=1320.43|271=1.00000000|272=20220930|273=13:28:06.401|269=0|270=1320.43|271=2.00000000|272=20220930|273=13:28:06.401|269=0|270=1320.43|271=5.00000000|272=20220930|273=13:28:06.401|269=0|270=1320.43|271=10.00000000|272=20220930|273=13:28:06.401|269=1|270=1323.42|271=1.00000000|272=20220930|273=13:28:06.401|269=1|270=1323.42|271=2.00000000|272=20220930|273=13:28:06.401|269=1|270=1323.42|271=5.00000000|272=20220930|273=13:28:06.401|269=1|270=1323.42|271=10.00000000|272=20220930|273=13:28:06.401|10=247|
    ```
  </Tab>
</Tabs>


# New Order Single
Source: https://docs.kraken.com/institutional/api-reference/prime-fix/nos

Submit a new order to the Kraken order book via FIX.

To submit a new order, the client needs to send a NewOrderSingle message. All orders are submitted from the client's perspective to Kraken exchange to place bid/offer on the Kraken Order book.
A range of order types, Time-In-Force (TIF) and order flags can be specified by the parameters below.

The supported order types are:

* `market`: The full order quantity executes immediately at the best available price in the order book.
* `limit`: The full order quantity is placed immediately with a limit price restriction to only trade at this price or better.
* `limitallin`: The limit order price and quantity includes the fees.

<Tabs>
  <Tab title="FIX Specification">
    <ParamField type=""> MsgType <code>D</code> </ParamField>

    <ParamField type="string">
      The specific account for this order. Required if multiple accounts are enabled.
    </ParamField>

    <ParamField type="string">
      Unique identifier for Order as assigned by the client. Must be `<= 36 characters`. UUIDs are recommended.
    </ParamField>

    <ParamField type="string">
      The symbol of the currency pair to place an order on in the format `BASE-QUOTE`.
    </ParamField>

    <ParamField type="integer">
      Side of the order.

      <ul>
        <b>Possible values: </b>
        <li><code>1</code> : Buy</li>
        <li><code>2</code> : Sell</li>
      </ul>
    </ParamField>

    <ParamField type="char">
      The execution model of the order.

      <ul>
        <b>Possible values: </b>
        <li><code>1</code> : market</li>
        <li><code>2</code> : Limit</li>
        <li><code>A</code> : LimitAllIn</li>
      </ul>
    </ParamField>

    <ParamField type="float">
      Order quantity in terms of the base asset.
    </ParamField>

    <ParamField type="string">
      The currency the quantity is specified in. If not
      specified, defaults to the base currency for the
      symbol.
    </ParamField>

    <ParamField type="float">
      Limit price of the order to be placed in the Order Book. Required when OrderType=Limit/LimitAllIn.
    </ParamField>

    <ParamField type="string">
      Specifies how long the order remains in effect.

      <ul>
        <b>Possible values: </b>
        <li><code>1</code> : GTC (Good till canceled)</li>
        <li><code>3</code> : IOC (Immediate or Cancel)</li>
        <li><code>4</code> : Fill Or Kill (FOK) </li>
      </ul>
    </ParamField>

    <ParamField type="string">
      Business timestamp for this request. Format: YYYYMMDD-HH:MM:SS.uuu
    </ParamField>

    <ParamField type="string">
      Optional expiration time for the order. Only valid on orders with TimeInForce=1 (GTC). Required when TimeinForce=GTD. Format: YYYYMMDD-HH:MM:SS
    </ParamField>

    <ParamField type="string">
      Time at which this order will activate and begin sending orders to the market. Format: YYYYMMDD-HH:MM:SS.uuu
    </ParamField>

    <ParamField type="string">
      Allows Specifying an Order Strategy Type.

      <ul>
        <b>Possible values:</b>
        <li><code>StopLimit</code> : This strategy will only place the order once the specified stop price has been met. For a Buy StopLimit order, the stop price must be *above* the current market price. For a Sell StopLimit order, the stop price must be *below* the current market price. </li>
        <li><code>TakeProfitLimit</code> : This strategy will only place the order once the specified take profit price has been met. For a Buy TakeProfitLimit order, the take profit price must be *below* the current market price. For a Sell TakeProfitLimit order, the take profit price must be *above* the current market price.</li>
      </ul>
    </ParamField>

    <ParamField type="integer">
      The number of strategy parameter repeating groups
    </ParamField>

    <ParamField type="string">
      The name of the StrategyParameter being set
    </ParamField>

    <ParamField type="string">
      The value for the StrategyParameter being set
    </ParamField>

    <ParamField type="string">
      Whether or not this order should be canceled when this session is disconnected. Possible values: Y, N. Default: Y
    </ParamField>

    <ParamField type="" />
  </Tab>

  <Tab title="Example">
    ```text theme={null}
    8=FIX.4.4|9=147|35=D|34=2|49=CUSTOMER|52=20220915-18:30:01.335|56={{ Customer }}|11=id-220912164936074-1152|38=1|40=2|44=1630.123|54=2|55=ETH-USD|59=1|60=20220915-14:30:01|10=228|
    ```
  </Tab>
</Tabs>


# Order Cancel Request
Source: https://docs.kraken.com/institutional/api-reference/prime-fix/ocr

Cancel an existing order via FIX.

Cancel an existing order.

A successful order cancellation will result in an [execution report](/institutional/api-reference/prime-fix/er) with the OrdStatus set to 4 (Cancelled).
Unsuccessful cancellation requests will result in a [business level reject](/institutional/api-reference/prime-fix/ocrej) message with the reason of the rejection.

<Tabs>
  <Tab title="FIX Specification">
    <ParamField type=""> MsgType <code>F</code> </ParamField>

    <ParamField type="string">
      Unique identifier for Order as assigned by the client. Must be `<= 36 characters`. UUIDs are recommended.
    </ParamField>

    <ParamField type="string">
      ClOrdID(11) of the previous non-rejected order. One of ClOrdID or OrderID is required at least for the cancellation to be accepted.
    </ParamField>

    <ParamField type="string">
      The symbol of the currency pair to place an order on in the format `BASE-QUOTE`.
    </ParamField>

    <ParamField type="integer">
      Side of the order.

      <ul>
        <b>Possible values: </b>
        <li><code>1</code> : Buy</li>
        <li><code>2</code> : Sell</li>
      </ul>
    </ParamField>

    <ParamField type="string">
      Time of order cancellation expressed in UTC. Format: YYYYDD-HH:MM:SS.uuu
    </ParamField>

    <ParamField type="" />
  </Tab>
</Tabs>


# Order Cancel Reject
Source: https://docs.kraken.com/institutional/api-reference/prime-fix/ocrej

Response message used to reject invalid order cancel or cancel/replace requests.

The OrderCancelReject message is used to reject invalid cancel or cancel/replace requests.

<Tabs>
  <Tab title="FIX Specification">
    <ParamField type=""> MsgType <code>9</code> </ParamField>

    <ParamField type="string">
      ClOrdID(11) which could not be canceled/replaced.
    </ParamField>

    <ParamField type="string">
      ClOrdID of the previous accepted order.
    </ParamField>

    <ParamField type="string">
      Unique identifier of most recent order as assigned by Customer. If CxlRejReason="Unknown order", then will be "NONE".
    </ParamField>

    <ParamField type="string">
      Business timestamp for this reject. Format: YYYYMMDD-HH:MM:SS.uuu
    </ParamField>

    <ParamField type="integer">
      Identifies current status of order.

      <ul>
        <b>Possible values: </b>
        <li><code>0</code> : New</li>
        <li><code>1</code> : Partially filled</li>
        <li><code>2</code> : Filled</li>
        <li><code>4</code> : Canceled</li>
        <li><code>6</code> : Pending Cancel (i.e. result of Order Cancel Request)</li>
        <li><code>8</code> : Rejected</li>
        <li><code>A</code> : Pending New</li>
        <li><code>E</code> : Pending Replace (i.e. result of Order Cancel/Replace Request)</li>
      </ul>
    </ParamField>

    <ParamField type="integer">
      Identifies the type of request that a Cancel Reject is in response to.

      <ul>
        <b>Possible values: </b>
        <li><code>1</code> : Order cancel request</li>
        <li><code>2</code> : Order cancel/replace request</li>
      </ul>
    </ParamField>

    <ParamField type="integer">
      Code to identify reason for cancel rejection.

      <ul>
        <b>Possible values: </b>
        <li><code>0</code> : Too late to cancel</li>
        <li><code>1</code> : Unknown order</li>
        <li><code>2</code> : Broker / Exchange Option</li>
        <li><code>3</code> : Order already in Pending Cancel or Pending Replace status</li>
      </ul>
    </ParamField>

    <ParamField type="string">
      Free-format text string.
    </ParamField>

    <ParamField type="" />
  </Tab>
</Tabs>


# Order Cancel Replace Request
Source: https://docs.kraken.com/institutional/api-reference/prime-fix/ocrr

Amend the price, quantity, or other attributes of an existing FIX order.

The Order Cancel-Replace Request message (MsgType=G) is used to amend the price, quantity, or markets of an existing order.

<Tabs>
  <Tab title="FIX Specification">
    <ParamField type=""> MsgType <code>G</code> </ParamField>

    <ParamField type="string">
      Unique identifier for Order as assigned by the client. Must be `<= 36 characters`. UUIDs are recommended.
    </ParamField>

    <ParamField type="string">
      ClOrdID(11) of the previous non-rejected order.
    </ParamField>

    <ParamField type="string">
      The symbol of the currency pair to place an order on in the format `BASE-QUOTE`.
    </ParamField>

    <ParamField type="integer">
      Side of the order.

      <ul>
        <b>Possible values: </b>
        <li><code>1</code> : Buy</li>
        <li><code>2</code> : Sell</li>
      </ul>
    </ParamField>

    <ParamField type="char">
      The execution model of the order.

      <ul>
        <b>Possible values: </b>
        <li><code>1</code> : market</li>
        <li><code>2</code> : Limit</li>
        <li><code>A</code> : LimitAllIn</li>
      </ul>
    </ParamField>

    <ParamField type="float">
      Order quantity in terms of the base asset.
    </ParamField>

    <ParamField type="float">
      Limit price of the order to be placed in the Order Book. Required when OrderType=Limit/LimitAllIn.
    </ParamField>

    <ParamField type="string">
      Business timestamp for this request. Format: YYYYMMDD-HH:MM:SS.uuu
    </ParamField>

    <ParamField type="" />
  </Tab>
</Tabs>


# Resend Request
Source: https://docs.kraken.com/institutional/api-reference/prime-fix/resend-request

FIX message used to request retransmission of messages when a sequence gap is detected.

The Resend Request message is used to request retransmission of messages from the counterparty when a sequence gap is detected. When a sequence gap is detected (i.e., when the incoming message sequence number is greater than expected), a Resend Request should be sent to request retransmission of the missing messages.

<Tabs>
  <Tab title="FIX Specification">
    <ParamField type="">
      MsgType <code>2</code>
    </ParamField>

    <ParamField type="integer">
      First message sequence number to be resent.
    </ParamField>

    <ParamField type="integer">
      Last message sequence number to be resent. Set to 0 to request all messages from BeginSeqNo onwards.
    </ParamField>

    <ParamField type="" />
  </Tab>
</Tabs>


# Sequence Reset
Source: https://docs.kraken.com/institutional/api-reference/prime-fix/sequence-reset

FIX message used to reset sequence numbering or indicate that a range of sequence numbers will not be transmitted.

The Sequence Reset message is used to reset the sequence numbering or to indicate that a range of sequence numbers will not be transmitted. It can be used as a Gap Fill to indicate that no messages were sent in a range of sequence numbers, or as a Sequence Reset to reset the sequence number to a new value.

<Tabs>
  <Tab title="FIX Specification">
    <ParamField type="">
      MsgType <code>4</code>
    </ParamField>

    <ParamField type="boolean">
      Indicates whether this is a gap fill message.

      <ul>
        <b>Possible values: </b>
        <li><code>Y</code> : Gap Fill - indicates no messages were sent in a range of sequence numbers</li>
        <li><code>N</code> or not present : Sequence Reset - resets sequence number to new value</li>
      </ul>
    </ParamField>

    <ParamField type="integer">
      New sequence number for next message.
    </ParamField>

    <ParamField type="" />
  </Tab>
</Tabs>


# Session Reject
Source: https://docs.kraken.com/institutional/api-reference/prime-fix/session-reject

FIX message used to reject a received message at the session level due to protocol violations.

The Session Reject message is used to reject a received message at the session level due to protocol violations or other session-related issues.

<Tabs>
  <Tab title="FIX Specification">
    <ParamField type="">
      MsgType <code>3</code>
    </ParamField>

    <ParamField type="integer">
      MsgSeqNum of rejected message.
    </ParamField>

    <ParamField type="integer">
      The tag number of the FIX field being referenced.
    </ParamField>

    <ParamField type="string">
      The MsgType of the FIX message being referenced.
    </ParamField>

    <ParamField type="integer">
      Code to identify reason for a session-level Reject message.
    </ParamField>

    <ParamField type="string">
      Where possible, message to explain reason for rejection.
    </ParamField>

    <ParamField type="" />
  </Tab>
</Tabs>


# Security List
Source: https://docs.kraken.com/institutional/api-reference/prime-fix/sl

FIX response message returning the list of securities matching a Security List Request.

The Security List message is used to return a list of securities that matches the criteria specified in the Security List Request.

<Tabs>
  <Tab title="FIX Specification">
    <ParamField type=""> MsgType <code>y</code> </ParamField>

    <ParamField type="string">
      Unique ID to identify this request.
    </ParamField>

    <ParamField type="string">
      Identifier for the SecurityList message.
    </ParamField>

    <ParamField type="integer">
      Result of the Security Request Identified by the SecurityReqID.

      <ul>
        <b>Possible values: </b>
        <li><code>0</code> : Valid Request</li>
        <li><code>1</code> : Invalid or Unsupported Request</li>
        <li><code>2</code> : No instruments found that match the selection criteria</li>
        <li><code>3</code> : Not authorized to retrieve instrument data</li>
        <li><code>4</code> : Instrument data temporarily unavailable</li>
        <li><code>5</code> : Request for instrument data not supported</li>
      </ul>
    </ParamField>

    <ParamField type="integer">
      Used to indicate the total number of securities being returned for this request. Used in the event that message fragmentation is required.
    </ParamField>

    <ParamField type="boolean">
      Indicates whether this is the last fragment in a sequence of message fragments. Only required where message has been fragmented.
    </ParamField>

    <ParamField type="integer">
      Number of related symbols. Component Block \<Instrument> required if 560=0.
    </ParamField>

    <ParamField type="string">
      Common "human understood" representation of the security.
    </ParamField>

    <ParamField type="string">
      Internal Customer ID for Security - for information only.
    </ParamField>

    <ParamField type="integer">
      The trading lot size of a security.
    </ParamField>

    <ParamField type="float">
      Minimum Trading Volume for a security.
    </ParamField>

    <ParamField type="float">
      The smallest difference between quoted prices for this instrument.
    </ParamField>

    <ParamField type="float">
      Maximum Size for an order on this security.
    </ParamField>

    <ParamField type="" />
  </Tab>

  <Tab title="Example">
    ```text theme={null}
    8=FIX.4.4|9=243|35=y|34=3|49={{ Customer }}|52=20220930-13:28:16.514|56=CUSTOMER|146=2|55=ETH-USD|48=2|561=0.00000001|562=0.00000001|969=0.00001|1140=1000.00|55=BTC-USD|48=24|561=0.00000001|562=0|969=0.01|1140=1000.00|320=id-220929160342682-27|322=1BQM22QR01G00|560=0|10=153|
    ```
  </Tab>
</Tabs>


# Security List Request
Source: https://docs.kraken.com/institutional/api-reference/prime-fix/slr

FIX message to request the list of securities available for trading.

Request a list of securities available for trading.

<Tabs>
  <Tab title="FIX Specification">
    <ParamField type=""> MsgType <code>x</code> </ParamField>

    <ParamField type="string">
      Unique ID to identify this request.
    </ParamField>

    <ParamField type="integer">
      Identifies the type of Security List Request.

      <ul>
        <b>Possible values: </b>
        <li><code>4</code> : ALL\_SECURITIES</li>
      </ul>
    </ParamField>

    <ParamField type="" />
  </Tab>

  <Tab title="Example">
    ```text theme={null}
    8=FIX.4.4|9=88|35=x|34=3|49=CUSTOMER|52=20220930-13:28:16.451|56={{ Customer }}|320=id-220929160342682-27|559=4|10=156|
    ```
  </Tab>
</Tabs>


# Test Request
Source: https://docs.kraken.com/institutional/api-reference/prime-fix/test-request

FIX message used to force a Heartbeat from the counterparty.

The Test Request message is used to force a Heartbeat from the other side of the connection. When a Test Request is sent, the recipient must respond with a Heartbeat message containing the same TestReqID value.

<Tabs>
  <Tab title="FIX Specification">
    <ParamField type="">
      MsgType <code>1</code>
    </ParamField>

    <ParamField type="string">
      Unique identifier for the test request.
    </ParamField>

    <ParamField type="" />
  </Tab>
</Tabs>


# Prime REST
Source: https://docs.kraken.com/institutional/api-reference/prime-rest

Programmatic access to Kraken Prime — API-user management, key lifecycle, and settlement

The Prime REST API provides programmatic access to Kraken's Prime brokerage
services. Use it to manage Prime API users and their keys, and to drive
the settlement lifecycle for Prime trading activity.

For trade execution and live exposure data, pair Prime REST with the
[Prime WebSocket API](/institutional/api-reference/prime-websocket/authentication) (real-time)
or the [Prime FIX API](/institutional/api-reference/prime-fix/logon)
(session-based, deterministic ordering).

<Note>
  Access to Prime requires onboarding. Contact
  [prime\_trading@kraken.com](mailto:prime_trading@kraken.com) or your Account
  Manager to begin.
</Note>

## Connection

```text theme={null}
https://api.kraken.com/0
```

## Authentication

Prime REST uses the same HMAC-SHA512 signature scheme as the Spot REST API.
See the [Spot REST authentication
guide](/exchange/guides/rest/authentication) for the exact request signing
flow — the algorithm, headers, and nonce handling are identical. The API
key permissions, however, are scoped to Prime resources.

## Typical workflow

<Steps>
  <Step title="Create an API user">
    Call [`CreatePrimeApiUser`](/api-reference/api-users/create-prime-api-user)
    with either a `Viewer` (read-only) or `Trader` (read + trade) role.
  </Step>

  <Step title="Generate an API key">
    Call [`CreatePrimeApiUserKey`](/api-reference/api-user-keys/create-prime-api-user-key)
    to issue credentials for the user. **The API secret is returned once
    at creation time** — store it securely; it cannot be retrieved later.
  </Step>

  <Step title="Trade">
    Execute trades over Prime WebSocket or Prime FIX using the issued
    credentials. Trades book against your Prime credit line.
  </Step>

  <Step title="Snapshot a settlement batch">
    At the end of a trading period, call
    [`CreatePrimeSettlementBatch`](/api-reference/settlement/create-prime-settlement-batch)
    to capture all unsettled trades into a batch. Each batch contains legs
    representing the net position per asset, and `trade_ids` listing the
    trade IDs included in the snapshot.
  </Step>

  <Step title="Settle each leg">
    For each leg in the batch, call
    [`SettlePrimeSettlementBatchAsset`](/api-reference/settlement/settle-prime-settlement-batch-asset)
    to initiate the transfer. Track progress and retrieve `trade_ids` via
    [`GetPrimeSettlementBatch`](/api-reference/settlement/get-prime-settlement-batch).
  </Step>
</Steps>

## Endpoint groups

<CardGroup>
  <Card title="API Users" icon="user-gear" href="/api-reference/api-users/create-prime-api-user">
    Create, list, get, and update Prime API users. Manage user roles.
  </Card>

  <Card title="API User Keys" icon="key" href="/api-reference/api-user-keys/create-prime-api-user-key">
    Issue, list, update, and delete API keys for a Prime user.
  </Card>

  <Card title="Settlement" icon="handshake" href="/api-reference/settlement/create-prime-settlement-batch">
    Snapshot trades into batches and settle each leg.
  </Card>
</CardGroup>

## Roles

| Role     | Access                                                                          |
| :------- | :------------------------------------------------------------------------------ |
| `Viewer` | Read-only — query orders, balances, and exposure                                |
| `Trader` | Read + trade — submit and amend orders, in addition to all `Viewer` permissions |

The role is set at user creation and can be changed via
[`UpdatePrimeApiUserRoles`](/api-reference/api-users/update-prime-api-user-roles).

## Key lifecycle

API keys are tied to an API user, not directly to a Prime account. A user
may have multiple keys; revoking a key does not affect other keys for the
same user.

* **`CreatePrimeApiUserKey`** — issues a key pair; the secret is returned
  once and never persisted server-side.
* **`UpdatePrimeApiUserKey`** — rotate the IP allow-list or other key
  metadata.
* **`DeletePrimeApiUserKey`** — immediate revocation; subsequent requests
  signed with the deleted key fail authentication.

## Related

<CardGroup>
  <Card title="Prime WebSocket" icon="bolt" href="/institutional/api-reference/prime-websocket">
    Real-time order entry, executions, exposure, and balance streaming.
  </Card>

  <Card title="Prime FIX" icon="terminal" href="/institutional/api-reference/prime-fix">
    Session-based order entry with deterministic ordering and replay.
  </Card>

  <Card title="Spot REST authentication" icon="key" href="/exchange/guides/rest/authentication">
    HMAC-SHA512 signing flow shared with Prime REST.
  </Card>

  <Card title="Choose your protocol" icon="code-compare" href="/exchange/guides/general/api-comparison">
    REST vs WebSocket vs FIX trade-offs.
  </Card>
</CardGroup>


# Authentication
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/authentication

Authenticate WebSocket connections to the Kraken Prime API using HMAC-SHA256 signed headers.

<Note>Authenticated connection. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

WebSocket connections must be authenticated by signing the request and sending the signature in HTTP headers.

## Connection Headers

<Tabs>
  <Tab title="Header Schema">
    | Header           | Type   | Description                                                      |
    | ---------------- | ------ | ---------------------------------------------------------------- |
    | **ApiKey**       | string | Your Kraken API key                                              |
    | **ApiSign**      | string | base64-encoded signature                                         |
    | **ApiTimestamp** | string | An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z` |
  </Tab>

  <Tab title="Signature Generation">
    The signature is a base64 encoded sha256 HMAC using the API secret of the following:

    ```
    GET\n<ApiTimestamp>\n<host>\n<path>
    ```

    For example:

    ```
    GET\n2019-02-13T05:17:32.000000Z\nwss.sandbox.prime.kraken.com\n/ws/v1
    ```
  </Tab>

  <Tab title="Python Example">
    ```python theme={null}
    # to install websocket lib:
    # $ pip install websocket-client
    from websocket import create_connection
    import datetime
    import hmac
    import hashlib
    import base64

    api_key = "<apikey>"
    api_secret = "<apisecret>"

    utc_now = datetime.datetime.utcnow()
    utc_datetime = utc_now.strftime("%Y-%m-%dT%H:%M:%S.000000Z")

    host = "<websocket host>"  # wss.sandbox.prime.kraken.com, for example
    path = "/ws/v1"

    params = "\n".join([
        "GET",
        utc_datetime,
        host,
        path,
    ])

    hash = hmac.new(
        api_secret.encode('ascii'), params.encode('ascii'), hashlib.sha256)
    hash.hexdigest()

    signature = base64.urlsafe_b64encode(hash.digest()).decode()

    header = {
        "ApiKey": api_key,
        "ApiSign": signature,
        "ApiTimestamp": utc_datetime,
    }

    ws = create_connection("wss://" + host + path, header=header)

    while True:
        print(ws.recv())
    ```
  </Tab>
</Tabs>

## Environments

| Environment    | WebSocket Endpoint                         |
| -------------- | ------------------------------------------ |
| **Sandbox**    | `wss://wss.sandbox.prime.kraken.com/ws/v1` |
| **Production** | `wss://wss.prime.kraken.com/ws/v1`         |

## API Keys

For initial Prime access and onboarding, contact Kraken support at [prime\_trading@kraken.com](mailto:prime_trading@kraken.com) or your Account Manager.

After your Prime account is onboarded, you can create and manage API keys self-service from the [Prime UI API settings](https://pro.kraken.com/app/prime/api-settings). Sign in with your standard Kraken Pro credentials.

You will need separate API keys for the sandbox and production environments.

## Rate Limits

There is no limit to how many concurrent websocket connections you're allowed, though this may change in the future. If you expect to have more than \~10 active connections, please contact [prime\_trading@kraken.com](mailto:prime_trading@kraken.com).


# Balance
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/balance

Authenticated channel for streaming real-time account balance updates.

<Note>Authenticated channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Request for stream of Balance updates. Provides real-time account balance information.

## Subscribe Request

<Tabs>
  <Tab title="Subscribe Schema">
    <ParamField type="number">
      Request ID - will be echoed back in the response structure.
    </ParamField>

    <ParamField type="string">
      Request type. Value: `subscribe`
    </ParamField>

    <ParamField type="array">
      Array containing the Balance stream configuration.

      <Expandable title="properties">
        <ParamField type="string">
          Subscription name. Value: `Balance`
        </ParamField>

        <ParamField type="array">
          Optional list of currencies to filter these balance updates by, default is all available currencies.
        </ParamField>

        <ParamField type="string">
          If provided, will provide converted equivalent amounts of each currency in the provided Equivalent Currency.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 11,
      "type": "subscribe",
      "streams": [
        {
          "name": "Balance",
          "EquivalentCurrency": "USD"
        }
      ]
    }
    ```
  </Tab>
</Tabs>

## Response

<Tabs>
  <Tab title="Response Schema">
    <ParamField type="number">
      A number that relates this response to a request.
    </ParamField>

    <ParamField type="string">
      The type of message sent.
    </ParamField>

    <ParamField type="string">
      An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z`.
    </ParamField>

    <ParamField type="boolean">
      If this is initial data for a request, the initial flag will be set.
    </ParamField>

    <ParamField type="number">
      The sequence number for this response per request.
    </ParamField>

    <ParamField type="string">
      "Update" or "Remove" - tells the client if the given entity should be removed or added/updated.
    </ParamField>

    <ParamField type="array">
      Array of Balance data.

      <Expandable title="properties">
        <ParamField type="string">
          Currency of this balance update.
        </ParamField>

        <ParamField type="string">
          Current balance amount in the specified currency.
        </ParamField>

        <ParamField type="string">
          Amount available for trading right now.
        </ParamField>

        <ParamField type="object">
          If requested equivalent balance amount, will provide a Balance update in the specified equivalent currency.

          <Expandable title="properties">
            <ParamField type="string">
              Requested Equivalent Currency.
            </ParamField>

            <ParamField type="string">
              Amount of this balance in the equivalent currency.
            </ParamField>

            <ParamField type="string">
              Equivalent amount of amount available for trading right now.
            </ParamField>
          </Expandable>
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 11,
      "type": "Balance",
      "ts": "2021-09-16T16:17:06.892914Z",
      "initial": true,
      "seqNum": 1,
      "data": [
        {
          "Currency": "USD",
          "Amount": "-1928479.77953598",
          "AvailableAmount": "-1928479.77953598",
          "Equivalent": {
            "Currency": "USD",
            "Amount": "-1928479.78",
            "AvailableAmount": "-1928479.78"
          }
        },
        {
          "Currency": "BTC",
          "Amount": "40.15480673",
          "AvailableAmount": "40.15480673",
          "Equivalent": {
            "Currency": "USD",
            "Amount": "1930241.56",
            "AvailableAmount": "1930241.56"
          }
        }
      ]
    }
    ```
  </Tab>
</Tabs>


# Cancel Stream
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/cancel

Cancel an existing stream by request ID. The stream stops sending data; no response unless there is an error.

<Note>Public channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Cancels an existing stream by request ID. No response is sent unless there is an error — the stream associated with the specified `reqid` simply stops sending data.

If there is an error (for example, the `reqid` does not exist or the stream is already cancelled), an error response may be sent with details about the failure.

## Request

<Tabs>
  <Tab title="Request Schema">
    <ParamField type="number">
      Request ID to cancel. Must match an existing subscription request ID from a [Subscribe](/institutional/api-reference/prime-websocket/subscribe) request.
    </ParamField>

    <ParamField type="string">
      Request type for cancelling the subscription. Value: `cancel`
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 1,
      "type": "cancel"
    }
    ```
  </Tab>
</Tabs>

## Response

No response is sent unless there is an error. The stream associated with the specified `reqid` will stop sending data.


# Currency
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/currency

Public channel for streaming available currencies used within trading.

<Note>Public channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Request for stream of available currencies used within trading. On initial request, a snapshot of all available currencies is provided. All subsequent messages are deltas to the currency snapshot.

## Subscribe Request

<Tabs>
  <Tab title="Subscribe Schema">
    <ParamField type="number">
      Request ID - will be echoed back in the response structure.
    </ParamField>

    <ParamField type="string">
      Request type. Value: `subscribe`
    </ParamField>

    <ParamField type="array">
      Array containing the Currency stream configuration.

      <Expandable title="properties">
        <ParamField type="string">
          Subscription name. Value: `Currency`
        </ParamField>

        <ParamField type="array">
          Optional list of currency symbols to filter the subscription on.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 3,
      "type": "subscribe",
      "streams": [
        {
          "name": "Currency"
        }
      ]
    }
    ```
  </Tab>
</Tabs>

## Response

<Tabs>
  <Tab title="Response Schema">
    <ParamField type="number">
      A number that relates this response to a request.
    </ParamField>

    <ParamField type="string">
      The type of message sent.
    </ParamField>

    <ParamField type="string">
      An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z`.
    </ParamField>

    <ParamField type="boolean">
      If this is initial data for a request, the initial flag will be set.
    </ParamField>

    <ParamField type="number">
      The sequence number for this response per request.
    </ParamField>

    <ParamField type="string">
      "Update" or "Remove" - tells the client if the given entity should be removed or added/updated.
    </ParamField>

    <ParamField type="array">
      Array of Currency data.

      <Expandable title="properties">
        <ParamField type="number">
          Timestamp of message publication as nanoseconds since the Unix epoch.
        </ParamField>

        <ParamField type="string">
          "Update" or "Remove" where the latter indicates the Currency is no longer available. Possible values: `Update`, `Remove`
        </ParamField>

        <ParamField type="number">
          System ID for Currency - for information only.
        </ParamField>

        <ParamField type="string">
          Symbol for currency.
        </ParamField>

        <ParamField type="string">
          Minimum increment for Currency.
        </ParamField>

        <ParamField type="string">
          Default increment used in all Market Data and Orders.
        </ParamField>

        <ParamField type="string">
          Description of Currency.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 3,
      "type": "Currency",
      "ts": "2021-09-14T22:11:47.512168Z",
      "initial": true,
      "seqNum": 1,
      "data": [
        {
          "Timestamp": 1676936489075207000,
          "UpdateAction": "Update",
          "CurrencyID": 2,
          "Symbol": "USD",
          "MinIncrement": "0.01",
          "DefaultIncrement": "0.01",
          "Description": "U.S. Dollar"
        },
        {
          "Timestamp": 1676936515053193000,
          "UpdateAction": "Update",
          "CurrencyID": 17,
          "Symbol": "ETH",
          "MinIncrement": "0.00000001",
          "DefaultIncrement": "0.0001",
          "Description": "Ethereum"
        }
      ]
    }
    ```
  </Tab>
</Tabs>


# Currency Conversion
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/currency-conversion

Public channel for streaming real-time currency conversion rates.

<Note>Public channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Request for stream of currency conversion rates.

## Subscribe Request

<Tabs>
  <Tab title="Subscribe Schema">
    <ParamField type="number">
      Request ID - will be echoed back in the response structure.
    </ParamField>

    <ParamField type="string">
      Request type. Value: `subscribe`
    </ParamField>

    <ParamField type="array">
      Array containing the Currency Conversion stream configuration.

      <Expandable title="properties">
        <ParamField type="string">
          Subscription name. Value: `CurrencyConversion`
        </ParamField>

        <ParamField type="string">
          Quote currency to base the conversion rates on.
        </ParamField>

        <ParamField type="array">
          List of currencies and securities to generate conversion rates for; defaults to all available currencies.
        </ParamField>

        <ParamField type="string">
          Optional throttle interval for conversion rate updates. Minimal/default value: 10s.
        </ParamField>

        <ParamField type="string">
          Optional param to indicate what conversion rate percent change should trigger sending out an update. Minimal/default value: 0.0001 which means 1 bps.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 4,
      "type": "subscribe",
      "streams": [
        {
          "name": "CurrencyConversion",
          "EquivalentCurrency": "USD",
          "Currencies": ["BTC", "ETH", "BCH-USD"],
          "Throttle": "15s",
          "Tolerance": "0.0002"
        }
      ]
    }
    ```
  </Tab>
</Tabs>

## Response

<Tabs>
  <Tab title="Response Schema">
    <ParamField type="number">
      A number that relates this response to a request.
    </ParamField>

    <ParamField type="string">
      The type of message sent.
    </ParamField>

    <ParamField type="string">
      An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z`.
    </ParamField>

    <ParamField type="boolean">
      If this is initial data for a request, the initial flag will be set.
    </ParamField>

    <ParamField type="number">
      The sequence number for this response per request.
    </ParamField>

    <ParamField type="string">
      "Update" or "Remove" - tells the client if the given entity should be removed or added/updated.
    </ParamField>

    <ParamField type="array">
      Array of CurrencyConversion data.

      <Expandable title="properties">
        <ParamField type="string">
          Timestamp of message publication.
        </ParamField>

        <ParamField type="string">
          Currency symbol for equivalent currency.
        </ParamField>

        <ParamField type="string">
          Currency symbol for base currency on conversion.
        </ParamField>

        <ParamField type="string">
          Currency conversion rate.
        </ParamField>

        <ParamField type="string">
          Status of the conversion rate.
        </ParamField>

        <ParamField type="string">
          Path used for the conversion.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 4,
      "type": "CurrencyConversion",
      "ts": "2021-09-14T22:16:18.604996Z",
      "initial": true,
      "seqNum": 1,
      "data": [
        {
          "Timestamp": "2021-09-14T22:16:18.604674Z",
          "EquivalentCurrency": "USD",
          "Currency": "ETH",
          "Rate": "3368.16",
          "Status": "Online",
          "ConversionPath": "(ETH-USD)"
        },
        {
          "Timestamp": "2021-09-14T22:16:18.604674Z",
          "EquivalentCurrency": "USD",
          "Currency": "BTC",
          "Rate": "46841.35",
          "Status": "Online",
          "ConversionPath": "(BTC-USD)"
        }
      ]
    }
    ```
  </Tab>
</Tabs>


# Execution Report
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/execution-report

Authenticated channel for streaming all order responses and lifecycle updates.

<Note>Authenticated channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Request stream of Execution Reports. All order responses and updates are sent as ExecutionReport messages.

## Subscribe Request

<Tabs>
  <Tab title="Subscribe Schema">
    <ParamField type="number">
      Request ID - will be echoed back in the response structure.
    </ParamField>

    <ParamField type="string">
      Request type. Value: `subscribe`
    </ParamField>

    <ParamField type="array">
      Array containing the ExecutionReport stream configuration.

      <Expandable title="properties">
        <ParamField type="string">
          Subscription name. Value: `ExecutionReport`
        </ParamField>

        <ParamField type="string">
          If provided, the subscription will return execution reports that were published at or after this time. An ISO-8601 UTC string of the form 2019-02-13T05:17:32.000000Z.
        </ParamField>

        <ParamField type="string">
          If provided, the subscription will return execution reports that were published before this time.
        </ParamField>

        <ParamField type="string">
          If provided, Symbol of the security to get the executions for.
        </ParamField>

        <ParamField type="array">
          If provided, comma-separated statuses of orders to include e.g. New,Filled.
        </ParamField>

        <ParamField type="string">
          If provided, filter by OrderID.
        </ParamField>

        <ParamField type="string">
          If provided, filter by RFQID.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 5,
      "type": "subscribe",
      "streams": [
        {
          "name": "ExecutionReport",
          "StartDate": "2021-09-14T00:00:00.000000Z"
        }
      ]
    }
    ```
  </Tab>
</Tabs>

## Response

<Tabs>
  <Tab title="Response Schema">
    <ParamField type="number">
      A number that relates this response to a request.
    </ParamField>

    <ParamField type="string">
      The type of message sent.
    </ParamField>

    <ParamField type="string">
      An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z`.
    </ParamField>

    <ParamField type="boolean">
      If this is initial data for a request, the initial flag will be set.
    </ParamField>

    <ParamField type="number">
      The sequence number for this response per request.
    </ParamField>

    <ParamField type="string">
      "Update" or "Remove" - tells the client if the given entity should be removed or added/updated.
    </ParamField>

    <ParamField type="array">
      Array of ExecutionReport data.

      <Expandable title="properties">
        <ParamField type="string">
          Timestamp of the message.
        </ParamField>

        <ParamField type="string">
          Symbol of the order security.
        </ParamField>

        <ParamField type="string">
          Server assigned Order ID, will be a UUID.
        </ParamField>

        <ParamField type="string">
          Client assigned Order ID for the last request.
        </ParamField>

        <ParamField type="string">
          Original client assigned Order ID.
        </ParamField>

        <ParamField type="string">
          Time of original order submission.
        </ParamField>

        <ParamField type="string">
          Server assigned ID of this update, will be a UUID.
        </ParamField>

        <ParamField type="string">
          Order side. Possible values: `Buy`, `Sell`
        </ParamField>

        <ParamField type="string">
          Transaction time.
        </ParamField>

        <ParamField type="string">
          Describes the specific execution. Possible values: `New`, `Trade`, `Canceled`, `Replaced`, `PendingCancel`, `Stopped`, `Rejected`, `PendingNew`, `Restated`, `PendingReplace`, `CancelRejected`, `ReplaceRejected`, `PendingResume`, `Resumed`, `PendingPause`, `Paused`, `Triggered`, `Started`
        </ParamField>

        <ParamField type="string">
          Identifies current status of order. Possible values: `New`, `PartiallyFilled`, `Filled`, `Canceled`, `PendingCancel`, `Rejected`, `PendingNew`, `PendingReplace`
        </ParamField>

        <ParamField type="string">
          Order quantity.
        </ParamField>

        <ParamField type="string">
          Order type. Possible values: `Market`, `Limit`, `RFQ`
        </ParamField>

        <ParamField type="string">
          Order limit price, required when OrdType=Limit.
        </ParamField>

        <ParamField type="string">
          Currency of Quantity.
        </ParamField>

        <ParamField type="string">
          Quantity open for further execution.
        </ParamField>

        <ParamField type="string">
          Total quantity filled. Always in Currency units.
        </ParamField>

        <ParamField type="string">
          Average filled price of the order. Only valid if CumQty > 0. Does not include fees.
        </ParamField>

        <ParamField type="string">
          Specifies how long the order remains in effect. Possible values: `GoodTillCancel`, `FillAndKill`, `FillOrKill`
        </ParamField>

        <ParamField type="string">
          Last price, specified when ExecType=Trade.
        </ParamField>

        <ParamField type="string">
          Last qty, specified when ExecType=Trade.
        </ParamField>

        <ParamField type="string">
          Last amount, specified when ExecType=Trade.
        </ParamField>

        <ParamField type="string">
          Last fee, specified when ExecType=Trade.
        </ParamField>

        <ParamField type="string">
          Total amount filled. Always in Amount currency.
        </ParamField>

        <ParamField type="string">
          Currency of Amount.
        </ParamField>

        <ParamField type="string">
          The customer user associated with this execution report.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 6,
      "type": "ExecutionReport",
      "ts": "2021-09-14T22:23:11.920903Z",
      "initial": false,
      "seqNum": 2,
      "data": [
        {
          "Timestamp": "2021-09-14T22:23:11.903074Z",
          "Symbol": "BTC-USD",
          "OrderID": "1b6b882b-e2fc-4774-ad2d-9db4df536f29",
          "ClOrdID": "58b9adb0-15aa-11ec-b0a2-2554a9e1e7a4",
          "SubmitTime": "2021-09-14T22:23:11.903074Z",
          "ExecID": "4b423f54-4a54-4679-9ee7-1f5f417ec5f5",
          "Side": "Buy",
          "TransactTime": "2021-09-14T22:23:11.883000Z",
          "ExecType": "PendingNew",
          "OrdStatus": "PendingNew",
          "OrderQty": "0.20000000",
          "OrdType": "Market",
          "Currency": "BTC",
          "LeavesQty": "0.20000000",
          "CumQty": "0",
          "AvgPx": "0",
          "TimeInForce": "FillOrKill",
          "LastPx": "0",
          "LastQty": "0",
          "LastAmt": "0",
          "LastFee": "0",
          "CumAmt": "0",
          "AmountCurrency": "USD",
          "CustomerUser": "tom@company.com"
        }
      ]
    }
    ```
  </Tab>
</Tabs>


# Exposure
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/exposure

Authenticated channel for streaming real-time credit utilization and exposure limit information.

<Note>Authenticated channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Request for stream of Exposure updates. Provides real-time credit utilization and exposure limit information.

## Subscribe Request

<Tabs>
  <Tab title="Subscribe Schema">
    <ParamField type="number">
      Request ID - will be echoed back in the response structure.
    </ParamField>

    <ParamField type="string">
      Request type. Value: `subscribe`
    </ParamField>

    <ParamField type="array">
      Array containing the Exposure stream configuration.

      <Expandable title="properties">
        <ParamField type="string">
          Subscription name. Value: `Exposure`
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 11,
      "type": "subscribe",
      "streams": [
        {
          "name": "Exposure"
        }
      ]
    }
    ```
  </Tab>
</Tabs>

## Response

<Tabs>
  <Tab title="Response Schema">
    <ParamField type="number">
      A number that relates this response to a request.
    </ParamField>

    <ParamField type="string">
      The type of message sent.
    </ParamField>

    <ParamField type="string">
      An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z`.
    </ParamField>

    <ParamField type="boolean">
      If this is initial data for a request, the initial flag will be set.
    </ParamField>

    <ParamField type="number">
      The sequence number for this response per request.
    </ParamField>

    <ParamField type="string">
      "Update" or "Remove" - tells the client if the given entity should be removed or added/updated.
    </ParamField>

    <ParamField type="array">
      Array of Exposure data.

      <Expandable title="properties">
        <ParamField type="string">
          The currency all exposure values are expressed in.
        </ParamField>

        <ParamField type="string">
          Current credit utilization expressed in the ExposureCurrency.
        </ParamField>

        <ParamField type="string">
          Credit limit expressed in the ExposureCurrency.
        </ParamField>

        <ParamField type="string">
          Status of the exposure information. Possible values: `Online`, `Offline`
        </ParamField>

        <ParamField type="string">
          The last time the credit was updated.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 11,
      "type": "Exposure",
      "ts": "2021-09-16T16:17:06.892914Z",
      "initial": true,
      "seqNum": 1,
      "data": [
        {
          "ExposureCurrency": "USD",
          "Exposure": "1000000",
          "ExposureLimit": "5000000",
          "Status": "Online",
          "Timestamp": "2021-09-16T16:17:06.892914Z"
        }
      ]
    }
    ```
  </Tab>
</Tabs>


# Hello
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/hello

Server-sent hello message on a successful WebSocket connection.

<Note>Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

The server sends a `hello` message on a successful connection. After a client connects, the server will send an unsolicited `hello` message.

## Response

<Tabs>
  <Tab title="Response Schema">
    <ParamField type="string">
      Message type. Value: `hello`
    </ParamField>

    <ParamField type="string">
      An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z`.
    </ParamField>

    <ParamField type="string">
      A session ID that uniquely identifies this websocket session.
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "type": "hello",
      "ts": "2019-02-13T05:17:32.000000Z",
      "session_id": "1SJGEGSYMZ800"
    }
    ```
  </Tab>
</Tabs>


# Market Data Snapshot
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/market-data-snapshot

Public channel for streaming real-time bid/offer levels for a security.

<Note>Public channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Request stream of MarketDataSnapshot messages. To stream security pricing with real-time bid/offer levels.

## Subscribe Request

<Tabs>
  <Tab title="Subscribe Schema">
    <ParamField type="number">
      Request ID - will be echoed back in the response structure.
    </ParamField>

    <ParamField type="string">
      Request type. Value: `subscribe`
    </ParamField>

    <ParamField type="array">
      Array containing the MarketDataSnapshot stream configuration.

      <Expandable title="properties">
        <ParamField type="string">
          Subscription name. Value: `MarketDataSnapshot`
        </ParamField>

        <ParamField type="string">
          Security to request (e.g. `BTC-USD`).
        </ParamField>

        <ParamField type="string">
          Optional throttle duration for updates, defaults to configured MinMarketDataThrottle. Valid time units are "ns", "us", "ms", "s".
        </ParamField>

        <ParamField type="string">
          Price increment for levels to enable price bucketing.
        </ParamField>

        <ParamField type="number">
          Maximum number of bid/offer levels to stream prices for.
        </ParamField>

        <ParamField type="array">
          A list of sizes to return price levels for; defaults to configured Security SizeBuckets.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 5,
      "type": "subscribe",
      "streams": [
        {
          "name": "MarketDataSnapshot",
          "Symbol": "BTC-USD"
        }
      ]
    }
    ```
  </Tab>
</Tabs>

## Response

<Tabs>
  <Tab title="Response Schema">
    <ParamField type="number">
      A number that relates this response to a request.
    </ParamField>

    <ParamField type="string">
      The type of message sent.
    </ParamField>

    <ParamField type="string">
      An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z`.
    </ParamField>

    <ParamField type="boolean">
      If this is initial data for a request, the initial flag will be set.
    </ParamField>

    <ParamField type="number">
      The sequence number for this response per request.
    </ParamField>

    <ParamField type="string">
      "Update" or "Remove" - tells the client if the given entity should be removed or added/updated.
    </ParamField>

    <ParamField type="array">
      Array of MarketDataSnapshot data.

      <Expandable title="properties">
        <ParamField type="string">
          Timestamp of update in ISO-8601 UTC format.
        </ParamField>

        <ParamField type="string">
          Security for update.
        </ParamField>

        <ParamField type="string">
          Status of update. Possible values: `Online`, `Offline`
        </ParamField>

        <ParamField type="array">
          Full list of Bids.

          <Expandable title="properties">
            <ParamField type="string">
              Limit price of the level.
            </ParamField>

            <ParamField type="string">
              Size on this level.
            </ParamField>
          </Expandable>
        </ParamField>

        <ParamField type="array">
          Full list of Offers.

          <Expandable title="properties">
            <ParamField type="string">
              Limit price of the level.
            </ParamField>

            <ParamField type="string">
              Size on this level.
            </ParamField>
          </Expandable>
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 5,
      "type": "MarketDataSnapshot",
      "ts": "2026-06-17T11:47:35.341672Z",
      "initial": true,
      "seqNum": 1,
      "data": [
        {
          "Timestamp": "2026-06-17T11:47:35.340139Z",
          "Symbol": "BTC-USD",
          "Status": "Online",
          "Bids": [
            {
              "Price": "64805.0",
              "Size": "0.50000000"
            },
            {
              "Price": "64805.0",
              "Size": "2.50000000"
            }
          ],
          "Offers": [
            {
              "Price": "64807.9",
              "Size": "0.50000000"
            },
            {
              "Price": "64807.9",
              "Size": "2.50000000"
            }
          ]
        }
      ]
    }
    ```
  </Tab>
</Tabs>


# New Order Single
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/new-order-single

Authenticated command to submit a new order against available liquidity or an open RFQ.

<Note>Authenticated channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Command used to submit a new order either against any provided liquidity or an open RFQ. Results of this command will be visible in the ExecutionReport and Trade streams which will track the lifecycle of the order.

## Request

<Tabs>
  <Tab title="Request Schema">
    <ParamField type="number">
      Request ID.
    </ParamField>

    <ParamField type="string">
      Command type. Value: `NewOrderSingle`
    </ParamField>

    <ParamField type="array">
      Order data array.

      <Expandable title="properties">
        <ParamField type="string">
          Symbol of the security to submit an order on (e.g. `BTC-USD`).
        </ParamField>

        <ParamField type="string">
          Unique Client Order ID for this request. Format: UUID
        </ParamField>

        <ParamField type="string">
          Side of the order. Possible values: `Buy`, `Sell`
        </ParamField>

        <ParamField type="string">
          Order quantity in units of Currency.
        </ParamField>

        <ParamField type="string">
          Order type. Possible values: `Market`, `Limit`, `RFQ`
        </ParamField>

        <ParamField type="string">
          Order limit price. Required when `OrdType` is `Limit`. Optional when `OrdType` is `RFQ` — include it only to validate against a limit price; if omitted, the order executes at the quoted price.
        </ParamField>

        <ParamField type="string">
          The currency that the quantity is specified in. If not specified, defaults to the base currency for the symbol.
        </ParamField>

        <ParamField type="string">
          Specifies how long the order remains in effect. Possible values: `GoodTillCancel`, `FillAndKill`, `FillOrKill`. RFQ orders are always executed as `FillOrKill`; you may omit this field and the platform applies that behavior.
        </ParamField>

        <ParamField type="string">
          Optional order strategy to use for algorithmic orders. Possible values: `SteadyPace`, `StopLimit`
        </ParamField>

        <ParamField type="string">
          Optional QuoteID to trade on. Must be specified when OrdType=RFQ.
        </ParamField>

        <ParamField type="string">
          Optional RFQID to trade on. Must be specified when OrdType=RFQ.
        </ParamField>

        <ParamField type="string">
          Optional allowed price slippage for Limit order placed against RFQ.
        </ParamField>

        <ParamField type="string">
          Transaction timestamp. Format: ISO-8601 UTC (e.g. `2019-02-13T05:17:32.000000Z`)
        </ParamField>

        <ParamField type="object">
          Strategy-specific parameters. Required keys depend on `Strategy` — see [Supported Order Strategies](#supported-order-strategies) below. For `SteadyPace`, `ClipSize` and `ClipInterval` are required.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Limit Example">
    Use this for a standard resting limit order with no algorithmic strategy:

    ```json theme={null}
    {
      "reqid": 12,
      "type": "NewOrderSingle",
      "data": [
        {
          "Symbol": "BTC-USD",
          "ClOrdID": "4d489920-15da-11ec-b5e7-7f4881f01b7d",
          "Side": "Buy",
          "TransactTime": "2021-09-15T04:06:28.530000Z",
          "OrderQty": "0.01",
          "OrdType": "Limit",
          "Price": "43000",
          "Currency": "BTC",
          "TimeInForce": "GoodTillCancel"
        }
      ]
    }
    ```
  </Tab>

  <Tab title="SteadyPace Example">
    When `Strategy` is `SteadyPace`, include the required clip parameters in `Parameters`. `ErrorAction` is optional and controls behavior when a clip fails.

    ```json theme={null}
    {
      "reqid": 12,
      "type": "NewOrderSingle",
      "data": [
        {
          "Symbol": "BTC-USD",
          "ClOrdID": "4d489920-15da-11ec-b5e7-7f4881f01b7d",
          "Side": "Buy",
          "TransactTime": "2021-09-15T04:06:28.530000Z",
          "OrderQty": "0.01",
          "OrdType": "Limit",
          "Price": "43000",
          "Currency": "BTC",
          "TimeInForce": "GoodTillCancel",
          "Strategy": "SteadyPace",
          "Parameters": {
            "ClipSize": "0.001",
            "ClipInterval": "1m",
            "ErrorAction": "Pause"
          }
        }
      ]
    }
    ```
  </Tab>

  <Tab title="RFQ Example">
    Accept an open quote by sending `NewOrderSingle` with `OrdType` set to `RFQ`. Use `QuoteID` and `RFQID` from the latest `Open` update on the [Quote](/institutional/api-reference/prime-websocket/quote) stream. `Price` is optional — omit it to trade at the quoted price, or set it to enforce a limit.

    ```json theme={null}
    {
      "reqid": 41,
      "type": "NewOrderSingle",
      "data": [
        {
          "Symbol": "BTC-USD",
          "ClOrdID": "4d489920-15da-11ec-b5e7-7f4881f01b7d",
          "Side": "Buy",
          "TransactTime": "2021-09-15T04:06:28.530000Z",
          "OrderQty": "0.30000000",
          "OrdType": "RFQ",
          "QuoteID": "20e240c5-9a82-4731-809e-91b3a2bf2f49",
          "RFQID": "8688ceab-ea67-416c-8ce1-9b63d6c0fe4e"
        }
      ]
    }
    ```
  </Tab>
</Tabs>

## Accepting a quote (RFQ)

To trade against an open RFQ:

1. Subscribe to [Quote](/institutional/api-reference/prime-websocket/quote), [Execution Report](/institutional/api-reference/prime-websocket/execution-report), and [Trade](/institutional/api-reference/prime-websocket/trade).
2. Send a [Quote Request](/institutional/api-reference/prime-websocket/quote-request) and wait for `QuoteStatus` `Open`.
3. Send `NewOrderSingle` with `OrdType` `RFQ`, `QuoteID` and `RFQID` from the `Open` quote, matching `Side`/`Symbol`/`OrderQty`, and optional `Price` if you need limit validation. RFQ orders are always executed as `FillOrKill` — you may omit `TimeInForce`.
4. Monitor execution and trade streams for fill or reject. The quote moves to `Filled` when accepted.

Command requests do not return a direct ack; results arrive on the subscribed streams. Quotes expire at `ValidUntilTime` unless you accept them with `NewOrderSingle` or cancel the quote with [Quote Cancel Request](/institutional/api-reference/prime-websocket/quote-cancel-request).

## Supported Order Strategies

The **Limit Example** tab above omits `Strategy` entirely — suitable for a single resting limit order. Set `Strategy` when you need algorithmic execution; each strategy requires its own `Parameters` fields.

### SteadyPace

A schedule-based algorithm that divides an order into suborders (clips) and submits them at equal, user-defined intervals.

**Required parameters:**

| Parameter      | Type   | Description                                                      |
| -------------- | ------ | ---------------------------------------------------------------- |
| `ClipSize`     | Qty    | Quantity sent on each clip (must be less than total `OrderQty`). |
| `ClipInterval` | string | Interval between clips (e.g. `1m`, `30s`).                       |

**Optional parameters:**

| Parameter     | Type    | Description                                               |
| ------------- | ------- | --------------------------------------------------------- |
| `StartTime`   | string  | ISO-8601 UTC time when the schedule begins sending clips. |
| `EndTime`     | string  | ISO-8601 UTC expire time for the order.                   |
| `Variance`    | decimal | Randomization factor applied to clip sizes.               |
| `ErrorAction` | string  | Behavior when a clip fails (e.g. `Pause`).                |

<Note>
  Omitting `ClipSize` or `ClipInterval` while `Strategy` is `SteadyPace` produces an incomplete request. Use the **SteadyPace Example** tab above for a copy-paste-ready payload.
</Note>

### StopLimit

This strategy will only place the order once the specified stop price has been met.

**Parameters:**

* `TriggerPrice` (Price, required): The price that must be met to trigger execution of the order.
* `EndTime` (string, optional): Optional expire time for the order.


# Order Updates
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/order

Authenticated channel for streaming real-time order status updates.

<Note>Authenticated channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Request stream of Order updates. An Order update having a data field containing an array that has a similar structure to ExecutionReport.

## Subscribe Request

<Tabs>
  <Tab title="Subscribe Schema">
    <ParamField type="number">
      Request ID - will be echoed back in the response structure.
    </ParamField>

    <ParamField type="string">
      Request type. Value: `subscribe`
    </ParamField>

    <ParamField type="array">
      Array containing the Order stream configuration.

      <Expandable title="properties">
        <ParamField type="string">
          Subscription name. Value: `Order`
        </ParamField>

        <ParamField type="string">
          If provided, the subscription will return orders that were submitted after this time. An ISO-8601 UTC string of the form 2019-02-13T05:17:32.000000Z.
        </ParamField>

        <ParamField type="string">
          If provided, the subscription will return orders that were submitted before this time.
        </ParamField>

        <ParamField type="string">
          If provided, Symbol of the security to get the orders for.
        </ParamField>

        <ParamField type="array">
          If provided, comma-separated Statuses of orders to include e.g. New,Filled.
        </ParamField>

        <ParamField type="string">
          If provided, filter by OrderID.
        </ParamField>

        <ParamField type="string">
          If provided, filter by RFQID.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 7,
      "type": "subscribe",
      "streams": [
        {
          "name": "Order",
          "StartDate": "2021-09-14T00:00:00.000000Z"
        }
      ]
    }
    ```
  </Tab>
</Tabs>

## Response

<Tabs>
  <Tab title="Response Schema">
    <ParamField type="number">
      A number that relates this response to a request.
    </ParamField>

    <ParamField type="string">
      The type of message sent.
    </ParamField>

    <ParamField type="string">
      An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z`.
    </ParamField>

    <ParamField type="boolean">
      If this is initial data for a request, the initial flag will be set.
    </ParamField>

    <ParamField type="number">
      The sequence number for this response per request.
    </ParamField>

    <ParamField type="string">
      "Update" or "Remove" - tells the client if the given entity should be removed or added/updated.
    </ParamField>

    <ParamField type="array">
      Array of Order data with a similar structure to ExecutionReport.

      <Expandable title="properties">
        <ParamField type="string">
          Timestamp of the message.
        </ParamField>

        <ParamField type="string">
          Symbol of the order security.
        </ParamField>

        <ParamField type="string">
          Server assigned Order ID, will be a UUID.
        </ParamField>

        <ParamField type="string">
          Client assigned Order ID for the last request.
        </ParamField>

        <ParamField type="string">
          "Buy" or "Sell".
        </ParamField>

        <ParamField type="string">
          Describes the specific execution.
        </ParamField>

        <ParamField type="string">
          Identifies current status of order.
        </ParamField>

        <ParamField type="string">
          Order quantity.
        </ParamField>

        <ParamField type="string">
          Order type.
        </ParamField>

        <ParamField type="string">
          Currency of Quantity.
        </ParamField>

        <ParamField type="string">
          The customer user associated with this order.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 7,
      "type": "Order",
      "ts": "2021-09-14T22:26:44.518538Z",
      "initial": false,
      "seqNum": 3,
      "data": [
        {
          "Timestamp": "2021-09-14T22:26:44.505519Z",
          "Symbol": "BTC-USD",
          "OrderID": "b35b1c3b-a304-4224-919f-9db1319de188",
          "ClOrdID": "d7635e40-15aa-11ec-b0a2-2554a9e1e7a4",
          "SubmitTime": "2021-09-14T22:26:44.457050Z",
          "ExecID": "c73fcf77-aaa1-46e7-9260-f625d6416646",
          "Side": "Buy",
          "ExecType": "New",
          "OrdStatus": "New",
          "OrderQty": "0.10000000",
          "OrdType": "Market",
          "Currency": "BTC",
          "LeavesQty": "0.10000000",
          "CumQty": "0",
          "AvgPx": "0",
          "TimeInForce": "FillOrKill",
          "LastPx": "0",
          "LastQty": "0",
          "LastAmt": "0",
          "LastFee": "0",
          "CumAmt": "0",
          "DecisionStatus": "Active",
          "AmountCurrency": "USD",
          "CustomerUser": "tom@company.com"
        }
      ]
    }
    ```
  </Tab>
</Tabs>


# Order Cancel Replace Request
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/order-cancel-replace-request

Authenticated command to modify an open order's price, quantity, or strategy.

<Note>Authenticated channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Command used to modify an open order. Results of this command will be visible in the Order and ExecutionReport streams.

## Request

<Tabs>
  <Tab title="Request Schema">
    <ParamField type="number">
      Request ID.
    </ParamField>

    <ParamField type="string">
      Command type. Value: `OrderCancelReplaceRequest`
    </ParamField>

    <ParamField type="array">
      Replace request data array.

      <Expandable title="properties">
        <ParamField type="string">
          Symbol of the security to submit an order on.
        </ParamField>

        <ParamField type="string">
          Unique Client Order ID for this request, usually a UUID.
        </ParamField>

        <ParamField type="string">
          Client Order ID of the order to cancel, one of OrderID, OrigClOrdID is required.
        </ParamField>

        <ParamField type="string">
          Order ID of the order to cancel, one of OrderID, OrigClOrdID is required.
        </ParamField>

        <ParamField type="string">
          Order quantity in units of Currency.
        </ParamField>

        <ParamField type="string">
          Order limit price, required for Limit orders.
        </ParamField>

        <ParamField type="string">
          An ISO-8601 UTC string of the form 2019-02-13T05:17:32.000000Z.
        </ParamField>

        <ParamField type="string">
          Optional order strategy to use. For algorithmic orders Pegged, TWAP, FullAmount, TimeSliced, and SteadyPace are supported.
        </ParamField>

        <ParamField type="string">
          Optional expire time for the order. An ISO-8601 UTC string of the form 2019-02-13T05:17:32.000000Z.
        </ParamField>

        <ParamField type="object">
          Optional order strategy parameters.
        </ParamField>

        <ParamField type="string">
          Timestamp of the message.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 14,
      "type": "OrderCancelReplaceRequest",
      "data": [
        {
          "Price": "44000",
          "Symbol": "BTC-USD",
          "OrderID": "16a55364-4248-4575-aa0b-dddd3f694ca3",
          "ClOrdID": "b5e52570-15da-11ec-b5e7-7f4881f01b7d",
          "TransactTime": "2021-09-15T04:09:24.039000Z",
          "OrderQty": "0.5",
          "Parameters": {
            "ErrorAction": "Pause"
          }
        }
      ]
    }
    ```
  </Tab>
</Tabs>


# Order Cancel Request
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/order-cancel-request

Authenticated command to cancel an open order.

<Note>Authenticated channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Command used to cancel an open order. Results of this command will be visible in the Order and ExecutionReport streams.

## Request

<Tabs>
  <Tab title="Request Schema">
    <ParamField type="number">
      Request ID.
    </ParamField>

    <ParamField type="string">
      Command type. Value: `OrderCancelRequest`
    </ParamField>

    <ParamField type="array">
      Cancel request data array.

      <Expandable title="properties">
        <ParamField type="string">
          Symbol of the security to submit an order on.
        </ParamField>

        <ParamField type="string">
          Unique Client Order ID for this request, usually a UUID.
        </ParamField>

        <ParamField type="string">
          Client Order ID of the order to cancel, one of OrderID, OrigClOrdID is required.
        </ParamField>

        <ParamField type="string">
          Order ID of the order to cancel, one of OrderID, OrigClOrdID is required.
        </ParamField>

        <ParamField type="string">
          An ISO-8601 UTC string of the form 2019-02-13T05:17:32.000000Z.
        </ParamField>

        <ParamField type="string">
          Timestamp of the message.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 13,
      "type": "OrderCancelRequest",
      "data": [
        {
          "Symbol": "BTC-USD",
          "ClOrdID": "c0be17e0-15da-11ec-b5e7-7f4881f01b7d",
          "OrderID": "16a55364-4248-4575-aa0b-dddd3f694ca3",
          "TransactTime": "2021-09-15T04:09:42.238000Z"
        }
      ]
    }
    ```
  </Tab>
</Tabs>


# Order Control Request
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/order-control-request

Authenticated command to pause or resume an open order.

<Note>Authenticated channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Command used to Pause or Resume an open order. Results of this command will be visible in the Order and ExecutionReport streams.

## Request

<Tabs>
  <Tab title="Request Schema">
    <ParamField type="number">
      Request ID.
    </ParamField>

    <ParamField type="string">
      Command type. Value: `OrderControlRequest`
    </ParamField>

    <ParamField type="array">
      Control request data array.

      <Expandable title="properties">
        <ParamField type="string">
          Unique Client Order ID for this request, usually a UUID.
        </ParamField>

        <ParamField type="string">
          Client Order ID of the order to submit the control request for, one of OrderID, OrigClOrdID is required.
        </ParamField>

        <ParamField type="string">
          Order ID of the order to submit the control request for, one of OrderID, OrigClOrdID is required.
        </ParamField>

        <ParamField type="string">
          An ISO-8601 UTC string of the form 2019-02-13T05:17:32.000000Z.
        </ParamField>

        <ParamField type="string">
          Action to apply on the order. Possible values: `Pause`, `Resume`
        </ParamField>

        <ParamField type="string">
          Timestamp of the message.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 17,
      "type": "OrderControlRequest",
      "data": [
        {
          "ClOrdID": "9eb07120-15da-11ec-b5e7-7f4881f01b7d",
          "OrderID": "16a55364-4248-4575-aa0b-dddd3f694ca3",
          "TransactTime": "2021-09-15T04:10:00.000000Z",
          "Action": "Pause"
        }
      ]
    }
    ```
  </Tab>
</Tabs>


# Continue Paged Stream
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/page

Request the next page of data when a paged stream response includes a next field.

<Note>Public channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

If you request a stream that is paged, the data on the stream will be delivered with a `next` field populated. When this field is present, request the next set of data with the structure below. The response continues as with the original stream.

## Request

<Tabs>
  <Tab title="Request Schema">
    <ParamField type="number">
      The request ID to continue the page. Must match the original request ID from the [Subscribe](/institutional/api-reference/prime-websocket/subscribe) request.
    </ParamField>

    <ParamField type="string">
      Request type for continuing the paged stream. Value: `page`
    </ParamField>

    <ParamField type="array">
      Streams to continue paging.

      <Expandable title="properties">
        <ParamField type="string">
          Subscription name to continue the page.
        </ParamField>

        <ParamField type="string">
          Delivered `next` value from the paged stream payload.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 3,
      "type": "page",
      "streams": [
        {
          "name": "Trade",
          "after": "aGVsbG8="
        }
      ]
    }
    ```
  </Tab>
</Tabs>

## Response

The response structure remains the same as the original subscription, with additional data continuing from where the previous page ended.

<Tabs>
  <Tab title="Response Schema">
    Same structure as the original subscription response, with continuing data and potentially another `next` field if more pages are available.
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 3,
      "type": "Trade",
      "data": [],
      "page": true
    }
    ```
  </Tab>
</Tabs>


# Ping
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/ping

Optional client-initiated ping to verify connectivity; server responds with a Pong message.

<Note>Public channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Pings may be optionally initiated by the client. They are not required to keep the session alive. On a valid request, the server responds with a `Pong` message. If `data` is omitted or empty, the server responds with an `error` message instead.

## Request

<Tabs>
  <Tab title="Request Schema">
    <ParamField type="number">
      A unique number that identifies this ping request.
    </ParamField>

    <ParamField type="string">
      Request type. Value: `Ping`
    </ParamField>

    <ParamField type="string">
      An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z`.
    </ParamField>

    <ParamField type="array">
      Non-empty list of objects that is forwarded in the `Pong` response. Must contain at least one object; an empty array is rejected.
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 2,
      "type": "Ping",
      "ts": "2024-01-13T05:17:32.000000Z",
      "data": [
        {}
      ]
    }
    ```
  </Tab>
</Tabs>

## Response

<Tabs>
  <Tab title="Pong Schema">
    <ParamField type="number">
      The request ID from the ping request.
    </ParamField>

    <ParamField type="string">
      Response type. Value: `Pong`
    </ParamField>

    <ParamField type="number">
      Sequence number, always 0 for ping/pong when present. This field may be omitted from the response.
    </ParamField>

    <ParamField type="string">
      An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z`.
    </ParamField>

    <ParamField type="array">
      Objects forwarded from the ping request `data` array.
    </ParamField>
  </Tab>

  <Tab title="Pong Example">
    ```json theme={null}
    {
      "reqid": 2,
      "type": "Pong",
      "ts": "2024-01-13T05:17:32.002500Z",
      "data": [
        {}
      ]
    }
    ```
  </Tab>

  <Tab title="Error Schema">
    Returned when `data` is omitted or empty.

    <ParamField type="number">
      The request ID from the ping request.
    </ParamField>

    <ParamField type="string">
      Response type. Value: `error`
    </ParamField>

    <ParamField type="number">
      Sequence number for the error response. Error responses use `seq`, not `seqNum`.
    </ParamField>

    <ParamField type="string">
      An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z`.
    </ParamField>

    <ParamField type="object">
      Error details.

      <Expandable title="properties">
        <ParamField type="number">
          Error code.
        </ParamField>

        <ParamField type="string">
          Human-readable error message.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Error Example">
    If `data` is omitted:

    ```json theme={null}
    {
      "reqid": 2,
      "type": "Ping",
      "ts": "2024-01-13T05:17:32.000000Z"
    }
    ```

    The server responds with:

    ```json theme={null}
    {
      "reqid": 2,
      "type": "error",
      "seq": 1,
      "ts": "2024-01-13T05:17:32.002500Z",
      "error": {
        "code": 1,
        "msg": "missing Ping data"
      }
    }
    ```

    If `data` is an empty array, the same error is returned.
  </Tab>
</Tabs>

## Notes

* `data` is required and must contain at least one object. Requests that omit `data`, or send `"data": []`, are rejected with `"missing Ping data"`.
* Any objects included in `data` are echoed back unchanged in the `Pong` response.
* `seqNum` may be omitted from successful `Pong` responses.
* Error responses use `seq` (not `seqNum`) and include an `error` object with `code` and `msg` fields.


# Quote Updates
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/quote

Authenticated channel for streaming real-time quote responses from RFQ requests.

<Note>Authenticated channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Request stream of Quotes. All quote responses are sent as Quote updates. To request a quote, send a QuoteRequest message. The server responds with one or many Quote messages as the streaming prices update.

## Subscribe Request

<Tabs>
  <Tab title="Subscribe Schema">
    <ParamField type="number">
      Request ID - will be echoed back in the response structure.
    </ParamField>

    <ParamField type="string">
      Request type. Value: `subscribe`
    </ParamField>

    <ParamField type="array">
      Array containing the Quote stream configuration.

      <Expandable title="properties">
        <ParamField type="string">
          Subscription name. Value: `Quote`
        </ParamField>

        <ParamField type="string">
          If provided, the subscription will return quotes for rfqs that were submitted after this time.
        </ParamField>

        <ParamField type="string">
          If provided, the subscription will return quotes for rfqs that were submitted before this time.
        </ParamField>

        <ParamField type="string">
          If provided, Symbol of the security to filter quotes for.
        </ParamField>

        <ParamField type="string">
          If provided, filter by RFQID.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 6,
      "type": "subscribe",
      "streams": [
        {
          "name": "Quote",
          "StartDate": "2021-09-14T00:00:00.000000Z"
        }
      ]
    }
    ```
  </Tab>
</Tabs>

## Response

<Tabs>
  <Tab title="Response Schema">
    <ParamField type="number">
      A number that relates this response to a request.
    </ParamField>

    <ParamField type="string">
      The type of message sent.
    </ParamField>

    <ParamField type="string">
      An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z`.
    </ParamField>

    <ParamField type="boolean">
      If this is initial data for a request, the initial flag will be set.
    </ParamField>

    <ParamField type="number">
      The sequence number for this response per request.
    </ParamField>

    <ParamField type="string">
      "Update" or "Remove" - tells the client if the given entity should be removed or added/updated.
    </ParamField>

    <ParamField type="array">
      Array of Quote data.

      <Expandable title="properties">
        <ParamField type="string">
          Timestamp of the message.
        </ParamField>

        <ParamField type="string">
          Symbol of the order security.
        </ParamField>

        <ParamField type="string">
          Currency of Quantity.
        </ParamField>

        <ParamField type="string">
          Server-assigned RFQID. Present from `PendingNew` onward.
        </ParamField>

        <ParamField type="string">
          Client assigned Quote Req ID for the quote request.
        </ParamField>

        <ParamField type="string">
          Status of the quote. Possible values: `PendingNew`, `Open`, `PendingCancel`, `Canceled`, `PendingFill`, `Filled`, `Rejected`
        </ParamField>

        <ParamField type="string">
          Server assigned ID for this quote update.
        </ParamField>

        <ParamField type="string">
          Quote request reject reason, specified when `QuoteStatus` is `Rejected`.
        </ParamField>

        <ParamField type="string">
          Time of original quote request submission.
        </ParamField>

        <ParamField type="string">
          Order quantity.
        </ParamField>

        <ParamField type="string">
          Currency of Amount.
        </ParamField>

        <ParamField type="string">
          End time of RFQ.
        </ParamField>

        <ParamField type="string">
          Quote side. Possible values: `Buy`, `Sell`
        </ParamField>

        <ParamField type="string">
          The price of the trade if the quote is filled.
        </ParamField>

        <ParamField type="string">
          The quantity of the trade if the quote is filled.
        </ParamField>

        <ParamField type="string">
          The amount of the trade if the quote is filled.
        </ParamField>

        <ParamField type="string">
          Bid quote price.
        </ParamField>

        <ParamField type="string">
          Bid quote amount in units of AmountCurrency.
        </ParamField>

        <ParamField type="string">
          Offer quote price.
        </ParamField>

        <ParamField type="string">
          Offer quote amount in units of AmountCurrency.
        </ParamField>

        <ParamField type="string">
          Expire time for the current streaming quote. Present on `Open` updates with live bid/offer prices.
        </ParamField>

        <ParamField type="string">
          The customer user associated with this quote.
        </ParamField>

        <ParamField type="string">
          Market account associated with this quote.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 9,
      "type": "Quote",
      "ts": "2021-09-14T22:31:27.214025Z",
      "initial": false,
      "seqNum": 3,
      "data": [
        {
          "Timestamp": "2021-09-14T22:31:27.204209Z",
          "Symbol": "BTC-USD",
          "Currency": "BTC",
          "RFQID": "8688ceab-ea67-416c-8ce1-9b63d6c0fe4e",
          "QuoteReqID": "7feb22f0-15ab-11ec-b0a2-2554a9e1e7a4",
          "QuoteStatus": "Open",
          "QuoteID": "20e240c5-9a82-4731-809e-91b3a2bf2f49",
          "SubmitTime": "2021-09-14T22:31:27.183751Z",
          "OrderQty": "0.30000000",
          "AmountCurrency": "USD",
          "EndTime": "2021-09-14T22:31:42.183751Z",
          "BidPx": "46836.27",
          "BidAmt": "14050.88",
          "OfferPx": "46879.47",
          "OfferAmt": "14063.85",
          "ValidUntilTime": "2021-09-14T22:31:28.204209Z",
          "CustomerUser": "tom@company.com"
        }
      ]
    }
    ```
  </Tab>
</Tabs>

## RFQ workflow

A typical RFQ flow looks like this:

1. Subscribe to the [Quote](/institutional/api-reference/prime-websocket/quote) stream.
2. Send a [Quote Request](/institutional/api-reference/prime-websocket/quote-request) to open an RFQ and receive streaming prices.
3. When ready to trade, send a [New Order Single](/institutional/api-reference/prime-websocket/new-order-single) with `OrdType` set to `RFQ` and `QuoteID` and `RFQID` from the latest `Open` quote update. See the **RFQ Example** tab on that page.
4. Monitor fills on the [Execution Report](/institutional/api-reference/prime-websocket/execution-report) and [Trade](/institutional/api-reference/prime-websocket/trade) streams.

To cancel an open quote without trading, use [Quote Cancel Request](/institutional/api-reference/prime-websocket/quote-cancel-request).


# Quote Cancel Request
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/quote-cancel-request

Authenticated command to cancel an open RFQ.

<Note>Authenticated channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Command used to cancel an open RFQ. Results of this command will be visible in the Quote stream.

## Request

<Tabs>
  <Tab title="Request Schema">
    <ParamField type="number">
      Request ID.
    </ParamField>

    <ParamField type="string">
      Command type. Value: `QuoteCancelRequest`
    </ParamField>

    <ParamField type="array">
      Quote cancel request data array.

      <Expandable title="properties">
        <ParamField type="string">
          QuoteReqID from the request to cancel.
        </ParamField>

        <ParamField type="string">
          RFQID to cancel, required and must align with QuoteReqID.
        </ParamField>

        <ParamField type="string">
          An ISO-8601 UTC string of the form 2019-02-13T05:17:32.000000Z.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 16,
      "type": "QuoteCancelRequest",
      "data": [
        {
          "QuoteReqID": "8e9540d0-15db-11ec-b5e7-7f4881f01b7d",
          "RFQID": "f47bfb99-4d1e-4179-b62c-a96e83cc93ba",
          "TransactTime": "2021-09-15T04:15:24.581000Z"
        }
      ]
    }
    ```
  </Tab>
</Tabs>


# Quote Request
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/quote-request

Authenticated command to open a new RFQ and request a streaming quote.

<Note>Authenticated channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Command used to request a quote thereby opening a new RFQ. Results of this command will be visible in the Quote stream.

## Request

<Tabs>
  <Tab title="Request Schema">
    <ParamField type="number">
      Request ID.
    </ParamField>

    <ParamField type="string">
      Command type. Value: `QuoteRequest`
    </ParamField>

    <ParamField type="array">
      Quote request data array.

      <Expandable title="properties">
        <ParamField type="string">
          Symbol of the security to submit an order on.
        </ParamField>

        <ParamField type="string">
          The currency that the quantity is specified in.
        </ParamField>

        <ParamField type="string">
          Unique ID for this request, usually a UUID.
        </ParamField>

        <ParamField type="string">
          Optional side for a one sided request. Possible values: `Buy`, `Sell`. Leave blank for a two way quote.
        </ParamField>

        <ParamField type="string">
          Requested quantity in units of Currency.
        </ParamField>

        <ParamField type="string">
          An ISO-8601 UTC string of the form 2019-02-13T05:17:32.000000Z.
        </ParamField>

        <ParamField type="string">
          Timestamp of the message.
        </ParamField>

        <ParamField type="object">
          Optional parameters for the quote request.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 15,
      "type": "QuoteRequest",
      "data": [
        {
          "QuoteReqID": "8e9540d0-15db-11ec-b5e7-7f4881f01b7d",
          "OrderQty": "0.75",
          "Currency": "BTC",
          "Symbol": "BTC-USD",
          "TransactTime": "2021-09-15T04:15:27.581000Z",
          "Parameters": {}
        }
      ]
    }
    ```
  </Tab>
</Tabs>

## Notes

To generate a `QuoteReqID`, we recommend using a UUID4 or another globally unique identifier. `QuoteReqID` must be unique and with length less than or equal to 36 characters.

Quote responses are delivered on the [Quote](/institutional/api-reference/prime-websocket/quote) stream. To accept a quote, see [New Order Single](/institutional/api-reference/prime-websocket/new-order-single) (`OrdType=RFQ`).


# Security
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/security

Public channel for streaming the list of available securities and real-time updates to their properties.

<Note>Public channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Request for stream of available securities for trading. On initial request, a snapshot of all available securities is provided. All subsequent messages are deltas to the securities snapshot.

Kraken maintains a security master which contains up-to-date information about the securities supported over API that are available to trade.

## Subscribe Request

<Tabs>
  <Tab title="Subscribe Schema">
    <ParamField type="number">
      Request ID - will be echoed back in the response structure.
    </ParamField>

    <ParamField type="string">
      Request type. Value: `subscribe`
    </ParamField>

    <ParamField type="array">
      Array containing the Security stream configuration.

      <Expandable title="properties">
        <ParamField type="string">
          Subscription name. Value: `Security`
        </ParamField>

        <ParamField type="array">
          Optional list of symbols to filter the subscription on.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 2,
      "type": "subscribe",
      "streams": [
        {
          "name": "Security"
        }
      ]
    }
    ```
  </Tab>
</Tabs>

## Response

<Tabs>
  <Tab title="Response Schema">
    <ParamField type="number">
      A number that relates this response to a request.
    </ParamField>

    <ParamField type="string">
      The type of message sent.
    </ParamField>

    <ParamField type="string">
      An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z`.
    </ParamField>

    <ParamField type="boolean">
      If this is initial data for a request, the initial flag will be set.
    </ParamField>

    <ParamField type="number">
      The sequence number for this response per request.
    </ParamField>

    <ParamField type="string">
      "Update" or "Remove" - tells the client if the given entity should be removed or added/updated.
    </ParamField>

    <ParamField type="array">
      Array of Security data.

      <Expandable title="properties">
        <ParamField type="string">
          Timestamp of message publication in ISO-8601 UTC format.
        </ParamField>

        <ParamField type="string">
          "Update" or "Remove" where the latter indicates the Security is no longer available.
        </ParamField>

        <ParamField type="number">
          System ID for Security - for information only.
        </ParamField>

        <ParamField type="string">
          Symbol for security.
        </ParamField>

        <ParamField type="string">
          Minimum Price Increment for Security.
        </ParamField>

        <ParamField type="string">
          Minimum Size Increment for Security. This increment is used to validate orders and RFQS expressed in base currency of the security.
        </ParamField>

        <ParamField type="string">
          Minimum Amount Increment for Security. This increment is used to validate orders and RFQS expressed in quote currency of the security.
        </ParamField>

        <ParamField type="string">
          Minimum Size for an Order on this Security.
        </ParamField>

        <ParamField type="string">
          Maximum Size for an Order on this Security.
        </ParamField>

        <ParamField type="string">
          Currency in which the Security is quoted.
        </ParamField>

        <ParamField type="string">
          Base currency for the Security.
        </ParamField>

        <ParamField type="string">
          Date this security was Disabled.
        </ParamField>

        <ParamField type="string">
          Default price increment used in all Market Data and Orders.
        </ParamField>

        <ParamField type="string">
          Default size increment used in all Market Data and Orders.
        </ParamField>

        <ParamField type="string">
          String specification describing the price display.
        </ParamField>

        <ParamField type="string">
          String specification describing the size display.
        </ParamField>

        <ParamField type="string">
          Normal size of Security.
        </ParamField>

        <ParamField type="string">
          Product type of Security.
        </ParamField>

        <ParamField type="string">
          Currency in which any position on this Security is tracked.
        </ParamField>

        <ParamField type="string">
          Currency in which any settlement on this Security is negotiated.
        </ParamField>

        <ParamField type="string">
          Notional Multiplier of Security.
        </ParamField>

        <ParamField type="string">
          Expiration of Security.
        </ParamField>

        <ParamField type="array">
          Default array of Size Buckets for Market Data Snapshot Streams.
        </ParamField>

        <ParamField type="string">
          Display symbol for Security.
        </ParamField>

        <ParamField type="string">
          Description of Security.
        </ParamField>

        <ParamField type="number">
          Security rank.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 2,
      "type": "Security",
      "ts": "2021-09-14T22:11:47.512168Z",
      "initial": true,
      "seqNum": 1,
      "data": [
        {
          "Timestamp": "2021-09-14T22:11:47.512168Z",
          "UpdateAction": "Update",
          "SecurityID": 2,
          "Symbol": "ETH-USD",
          "MinPriceIncrement": "0.01",
          "MinSizeIncrement": "0.00000001",
          "MinAmtIncrement": "0.01",
          "MinimumSize": "0.00000001",
          "MaximumSize": "10000000",
          "QuoteCurrency": "USD",
          "BaseCurrency": "ETH",
          "DefaultPriceIncrement": "0.01",
          "DefaultSizeIncrement": "0.0001",
          "PriceDisplaySpec": "M.m",
          "SizeDisplaySpec": "M.m",
          "NormalSize": "2",
          "ProductType": "Spot",
          "PositionCurrency": "ETH",
          "SettlementCurrency": "USD",
          "NotionalMultiplier": "1",
          "SizeBuckets": [
            {
              "Size": "0"
            }
          ],
          "DisplaySymbol": "ETH-USD",
          "Description": "Ethereum/U.S. Dollar",
          "Rank": 2
        }
      ]
    }
    ```
  </Tab>
</Tabs>


# Subscribe
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/subscribe

Send a subscription request to begin a stream of data from the Prime WebSocket API.

<Note>Public channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Send a subscription request to begin a stream of data. An example request that subscribes to data.

## Request

<Tabs>
  <Tab title="Request Schema">
    <ParamField type="number">
      Request ID - will be echoed back in the response structure.
    </ParamField>

    <ParamField type="string">
      Request type for initializing a subscription. Value: `subscribe`
    </ParamField>

    <ParamField type="string">
      Optional user generated tag to attach to stream data.
    </ParamField>

    <ParamField type="array">
      Streams to subscribe to.

      <Expandable title="properties">
        <ParamField type="string">
          Subscription name (e.g., "Security", "MarketDataSnapshot", "ExecutionReport").
        </ParamField>

        <ParamField type="various">
          Any required or optional parameters described for the subscription names.
        </ParamField>
      </Expandable>
    </ParamField>

    <ParamField type="string">
      An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z`.
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 1,
      "type": "subscribe",
      "streams": [
        {
          "name": "MarketDataSnapshot",
          "Symbol": "BTC-USD"
        }
      ],
      "ts": "2019-02-13T05:17:32.000000Z"
    }
    ```
  </Tab>
</Tabs>

## Response

<Tabs>
  <Tab title="Response Schema">
    <ParamField type="number">
      A number that relates this response to a request.
    </ParamField>

    <ParamField type="number">
      The sequence number for this response per request. seqNum begins at 1 on the first message with this reqid and increments by one for each message sent on this reqid.
    </ParamField>

    <ParamField type="string">
      The type of message sent. This document describes all valid message types.
    </ParamField>

    <ParamField type="string">
      An optional tag from the stream request.
    </ParamField>

    <ParamField type="string">
      An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z`.
    </ParamField>

    <ParamField type="boolean">
      If this is initial data for a request, the initial flag will be set.
    </ParamField>

    <ParamField type="string">
      "Update" or "Remove" - tells the client if the given entity should be removed or added/updated.
    </ParamField>

    <ParamField type="number">
      The total number of records for this stream.
    </ParamField>

    <ParamField type="array">
      Array of response data structured per subscription type.
    </ParamField>

    <ParamField type="string">
      If paging, tag for next page of data.
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 1,
      "type": "MarketDataSnapshot",
      "ts": "2026-06-17T11:27:06.865086Z",
      "initial": true,
      "seqNum": 1,
      "data": [
        {
          "Timestamp": "2026-06-17T11:27:06.863369Z",
          "Symbol": "BTC-USD",
          "Status": "Online",
          "Bids": [
            {
              "Price": "64647.0",
              "Size": "0.50000000"
            },
            {
              "Price": "64647.0",
              "Size": "2.50000000"
            }
          ],
          "Offers": [
            {
              "Price": "64648.0",
              "Size": "0.50000000"
            },
            {
              "Price": "64648.0",
              "Size": "2.50000000"
            }
          ]
        }
      ]
    }
    ```
  </Tab>
</Tabs>

## Notes

* `reqid` cannot be equal to 0.
* `seqNum` is for debug purposes only, the client is not required to do any sequencing.
* If a request requires responses with different types, then multiple responses may have the `initial` flag set for different types.
* `action` is either `Update` or `Remove` and tells the client if the given entity should be removed or added/updated. The key for a given entity depends on the message type.


# Trade
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/trade

Authenticated channel for streaming real-time trade fill updates.

<Note>Authenticated channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Request stream of Trade messages. Upon subscription, the server will return all Trade for this client as long as the optional constraints are satisfied. Server will also send a Trade update when the order receives more fills or new fills arrive on a new order.

## Subscribe Request

<Tabs>
  <Tab title="Subscribe Schema">
    <ParamField type="number">
      Request ID - will be echoed back in the response structure.
    </ParamField>

    <ParamField type="string">
      Request type. Value: `subscribe`
    </ParamField>

    <ParamField type="array">
      Array containing the Trade stream configuration.

      <Expandable title="properties">
        <ParamField type="string">
          Subscription name. Value: `Trade`
        </ParamField>

        <ParamField type="string">
          If provided, the subscription will return trades that were executed after this time. An ISO-8601 UTC string of the form 2019-02-13T05:17:32.000000Z.
        </ParamField>

        <ParamField type="string">
          If provided, the subscription will return trades that were executed before this time.
        </ParamField>

        <ParamField type="string">
          If provided, Symbol of the security to get the orders for.
        </ParamField>

        <ParamField type="string">
          If provided, filter by OrderID.
        </ParamField>

        <ParamField type="string">
          If provided, filter by RFQID.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 8,
      "type": "subscribe",
      "streams": [
        {
          "name": "Trade",
          "StartDate": "2021-09-14T00:00:00.000000Z"
        }
      ]
    }
    ```
  </Tab>
</Tabs>

## Response

<Tabs>
  <Tab title="Response Schema">
    <ParamField type="number">
      A number that relates this response to a request.
    </ParamField>

    <ParamField type="string">
      The type of message sent.
    </ParamField>

    <ParamField type="string">
      An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z`.
    </ParamField>

    <ParamField type="boolean">
      If this is initial data for a request, the initial flag will be set.
    </ParamField>

    <ParamField type="number">
      The sequence number for this response per request.
    </ParamField>

    <ParamField type="string">
      "Update" or "Remove" - tells the client if the given entity should be removed or added/updated.
    </ParamField>

    <ParamField type="array">
      Array of Trade data.

      <Expandable title="properties">
        <ParamField type="string">
          Timestamp of the message.
        </ParamField>

        <ParamField type="string">
          Security symbol for this trade (e.g. `BTC-USD`).
        </ParamField>

        <ParamField type="string">
          Server assigned Order ID, will be a UUID.
        </ParamField>

        <ParamField type="string">
          Server assigned Trade ID, will be a UUID.
        </ParamField>

        <ParamField type="string">
          Trade side. Possible values: `Buy`, `Sell`
        </ParamField>

        <ParamField type="string">
          Transaction time.
        </ParamField>

        <ParamField type="string">
          Describes the specific execution (e.g. Pending Cancel) while OrdStatus will always identify the current order status (e.g. Partially Filled).
        </ParamField>

        <ParamField type="string">
          Currency of Quantity.
        </ParamField>

        <ParamField type="string">
          Order limit price, required when OrdType=Limit.
        </ParamField>

        <ParamField type="string">
          Trade quantity.
        </ParamField>

        <ParamField type="string">
          Trade amount.
        </ParamField>

        <ParamField type="string">
          Trade fee.
        </ParamField>

        <ParamField type="string">
          Fee currency.
        </ParamField>

        <ParamField type="string">
          Status of the trade. Possible values: `Pending`, `Confirmed`, `Canceled`
        </ParamField>

        <ParamField type="string">
          Side of the aggressing order. Possible values: `Buy`, `Sell`
        </ParamField>

        <ParamField type="string">
          Server assigned QuoteID for RFQ Orders.
        </ParamField>

        <ParamField type="string">
          Currency of Amount.
        </ParamField>

        <ParamField type="string">
          Currency in which the trade was dealt.
        </ParamField>

        <ParamField type="string">
          Market account associated with this trade.
        </ParamField>

        <ParamField type="number">
          Revision number for this trade update.
        </ParamField>

        <ParamField type="string">
          Source of the trade (e.g. `Dealer`).
        </ParamField>

        <ParamField type="string">
          Action for this trade update (e.g. `New`).
        </ParamField>

        <ParamField type="string">
          Server assigned RFQID for RFQ Orders.
        </ParamField>

        <ParamField type="string">
          The customer user associated with this trade.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 8,
      "type": "Trade",
      "ts": "2021-09-14T22:29:32.255949Z",
      "initial": true,
      "seqNum": 1,
      "data": [
        {
          "Timestamp": "2021-09-14T22:23:11.989845Z",
          "Symbol": "BTC-USD",
          "OrderID": "1b6b882b-e2fc-4774-ad2d-9db4df536f29",
          "TradeID": "a0ec46f2-6d0e-451a-a4f1-2a0be7d32d26",
          "Side": "Buy",
          "TransactTime": "2021-09-14T22:23:11.964531Z",
          "ExecType": "Trade",
          "Currency": "BTC",
          "Price": "47085.090668824440",
          "Quantity": "0.20000000",
          "Amount": "9417.02",
          "Fee": "0",
          "CustomerUser": "tom@company.com",
          "TradeStatus": "Confirmed",
          "AggressorSide": "Buy",
          "AmountCurrency": "USD",
          "DealtCurrency": "BTC"
        }
      ]
    }
    ```
  </Tab>
</Tabs>


# User
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/user

Authenticated channel for streaming updates for the current customer user.

<Note>Authenticated channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Request for updates for this customer user. No subscription parameters required.

## Subscribe Request

<Tabs>
  <Tab title="Subscribe Schema">
    <ParamField type="number">
      Request ID - will be echoed back in the response structure.
    </ParamField>

    <ParamField type="string">
      Request type. Value: `subscribe`
    </ParamField>

    <ParamField type="array">
      Array containing the User stream configuration.

      <Expandable title="properties">
        <ParamField type="string">
          Subscription name. Value: `User`
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 10,
      "type": "subscribe",
      "streams": [
        {
          "name": "User"
        }
      ]
    }
    ```
  </Tab>
</Tabs>

## Response

<Tabs>
  <Tab title="Response Schema">
    <ParamField type="number">
      A number that relates this response to a request.
    </ParamField>

    <ParamField type="string">
      The type of message sent.
    </ParamField>

    <ParamField type="string">
      An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z`.
    </ParamField>

    <ParamField type="boolean">
      If this is initial data for a request, the initial flag will be set.
    </ParamField>

    <ParamField type="number">
      The sequence number for this response per request.
    </ParamField>

    <ParamField type="string">
      "Update" or "Remove" - tells the client if the given entity should be removed or added/updated.
    </ParamField>

    <ParamField type="array">
      Array of User data.

      <Expandable title="properties">
        <ParamField type="string">
          Server assigned ID of this Customer User.
        </ParamField>

        <ParamField type="string">
          Email of Customer User.
        </ParamField>

        <ParamField type="string">
          Friendly name for customer user.
        </ParamField>

        <ParamField type="array">
          List of user config settings.

          <Expandable title="properties">
            <ParamField type="string">
              Timestamp of config setting update.
            </ParamField>

            <ParamField type="string">
              Customer User for this config setting.
            </ParamField>

            <ParamField type="string">
              Setting whether config is enabled, values Enabled or Disabled.
            </ParamField>

            <ParamField type="string">
              User config key.
            </ParamField>

            <ParamField type="string">
              Configuration value, JSON-serialized and transmitted as a string. Escaped characters in the wire format are normal JSON encoding.
            </ParamField>
          </Expandable>
        </ParamField>

        <ParamField type="array">
          List of permissions for the customer user.
        </ParamField>

        <ParamField type="object">
          Market account authorizations mapping market accounts to their respective permissions.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 10,
      "type": "User",
      "ts": "2021-09-15T03:33:07.545223Z",
      "initial": true,
      "seqNum": 1,
      "data": [
        {
          "CustomerUserID": "174K1Q9GC0C00",
          "Email": "tom@company.com",
          "DisplayName": "Tom",
          "Config": [
            {
              "Timestamp": 1628004805337309202,
              "CustomerUserID": "174K1Q9GC0C00",
              "Key": "recentSymbols",
              "Value": "{\"BTC-USD\":[1626111502357],\"ADA-USD\":[1626732116743],\"BCH-USD\":[1628004751665]}"
            },
            {
              "Timestamp": 1628004805377207692,
              "CustomerUserID": "174K1Q9GC0C00",
              "Key": "symbol",
              "Value": "\"BTC-USD\""
            }
          ],
          "Permissions": [
            "read::orders",
            "write::orders",
            "read::marketdata",
            "read::entity"
          ],
          "MarketAccountAuthorizations": {
            "market-account-1": [
              "read::orders",
              "read::marketdata",
              "read::entity"
            ],
            "market-account-2": ["read::orders", "read::marketdata", "read::entity"]
          }
        }
      ]
    }
    ```
  </Tab>
</Tabs>


# User Config
Source: https://docs.kraken.com/institutional/api-reference/prime-websocket/user-config

Authenticated command to update user configuration settings for the session user.

<Note>Authenticated channel. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

Command used to update user config on behalf of session user. Results of this command will be visible in the User stream.

## Request

<Tabs>
  <Tab title="Request Schema">
    <ParamField type="number">
      Request ID.
    </ParamField>

    <ParamField type="string">
      Command type. Value: `UserConfig`
    </ParamField>

    <ParamField type="array">
      User config data array.

      <Expandable title="properties">
        <ParamField type="string">
          Key of config.
        </ParamField>

        <ParamField type="string">
          Configuration value, JSON-serialized and transmitted as a string. Escaped characters in the wire format are normal JSON encoding.
        </ParamField>

        <ParamField type="string">
          Optional mode on config. Possible values: `Enabled`, `Disabled`
        </ParamField>

        <ParamField type="string">
          Timestamp of the message.
        </ParamField>
      </Expandable>
    </ParamField>
  </Tab>

  <Tab title="Example">
    ```json theme={null}
    {
      "reqid": 18,
      "type": "UserConfig",
      "data": [
        {
          "Key": "symbol",
          "Value": "\"ETH-BTC\""
        }
      ]
    }
    ```
  </Tab>
</Tabs>


# Release notes
Source: https://docs.kraken.com/institutional/changelog

A history of changes to Kraken's Institutional APIs



# Custody REST Authentication
Source: https://docs.kraken.com/institutional/guides/custody-rest-auth

How to authenticate API requests to the Custody REST API using API keys, signatures, and nonces.

The Custody REST API uses API keys to authenticate and authorize API requests. A secure authentication process is enforced to ensure high security both when creating API keys and when making API calls.
To authenticate API requests, you must first create an API user and obtain API key credentials.

## API Users and Access Control

API users function similarly to human users in that they are assigned roles, permissions, and vault access at the time of creation. When an API user interacts with the system, these settings are enforced to control which data they can access and which actions they can perform.

However, unlike regular users, API users cannot log in to the Custody application. Their interaction with the system is limited strictly to API calls, making them an essential component for programmatic access while maintaining strict security boundaries.

## Creating a new API Key

A system administrator must initiate the creation of a new API user before generating an API key:

1. Log in to your Custody environment
2. Navigate to Settings → Users → API Users
3. Submit a request for a new API user and complete the two-factor authentication (2FA) process
4. The request will appear under Tasks → Pending until it is approved by the Admin Quorum
5. Once approved, open the request details to view the API key information
6. The admin user who submitted the request can access the API key and secret from the API key details page

<Warning>
  Only the admin user who created the API user request can view the API key and secret. Store these credentials securely. For security reasons, the API key and secret will not be viewable again after they are generated. API key credentials are a prime target for malicious actors. Ensure you follow security best practices to protect them.
</Warning>

## Authentication Parameters

For the REST API, the following parameters are used for authentication to endpoints which contain private data:

* `API-Key` HTTP header parameter: the public key from your API key-pair.
* `API-Sign` HTTP header parameter: encrypted signature of message.
* `nonce` payload parameter: always increasing, unsigned 64-bit integer.

## Setting the API-Key Parameter

The value for the `API-Key` HTTP header parameter is your **public** API key.

An API key-pair is required to access the authenticated endpoints.

<Warning>
  From your API key-pair, clearly identify which key is public and which key is private.

  * The **public** key is sent in the `API-Key` header parameter.
  * The **private** key is **never** sent, it is only used to encode the signature for `API-Sign` header parameter.
</Warning>

## Setting the API-Sign Parameter

The value for the `API-Sign` HTTP header parameter is a signature generated from encoding your **private** API key, nonce, encoded payload, and URI path.

```text theme={null}
  HMAC-SHA512 of (URI path + SHA256(nonce + POST data)) and base64 decoded secret API key
```

Note: The URI path used for API-Sign should be the part starting with "/0/private" of the API URL.

### Examples

The following is a specific example of a signature generated with a particular private key, nonce, and payload corresponding to a new limit order (buy 1.25 XBTUSD at \$37,500). If your code is generating a different signature (`API-Sign`) for this example, then there is likely an issue with your application of the above methodology. Code snippets for generating the signature in Python, Golang and Node.js follow below.

| Field           | Value                                                                                        |
| --------------- | :------------------------------------------------------------------------------------------- |
| Private Key     | kQH5HW/8p1uGOVjbgWA7FunAmGO8lsSUXNsu3eow76sz84Q18fWxnyRzBHCd3pd5nE9qa99HAZtuZuj6F1huXg==     |
| Nonce           | 1616492376594                                                                                |
| Encoded Payload | nonce=1616492376594                                                                          |
| URI Path        | /0/private/GetCustodyTask?id=TGWOJ4JQPOTZT2                                                  |
| **API-Sign**    | **2rM09q8HG7LvjivBitQUybwZ/DSeO8+i0U/at/wclH2Jma6gMaE/0Nw9dyLR+ykMd5eWCngSL4K58i6uJzXDCw==** |

<Tabs>
  <Tab title="Python">
    ```py theme={null}
    import urllib.parse
    import hashlib
    import hmac
    import base64

    def get_kraken_signature(urlpath, data, secret):

        if isinstance(data, str):
            encoded = (str(json.loads(data)["nonce"]) + data).encode()
        else:
            encoded = (str(data["nonce"]) + urllib.parse.urlencode(data)).encode()
        message = urlpath.encode() + hashlib.sha256(encoded).digest()

        mac = hmac.new(base64.b64decode(secret), message, hashlib.sha512)
        sigdigest = base64.b64encode(mac.digest())
        return sigdigest.decode()

    api_sec = "kQH5HW/8p1uGOVjbgWA7FunAmGO8lsSUXNsu3eow76sz84Q18fWxnyRzBHCd3pd5nE9qa99HAZtuZuj6F1huXg=="

    payload = {
      "nonce": 1616492376594,
    }

    signature = get_kraken_signature("/0/private/GetCustodyTask?id=TGWOJ4JQPOTZT2", payload, api_sec)
    print("API-Sign: {}".format(signature))

    ```
  </Tab>

  <Tab title="Go">
    ```go theme={null}
    package main

    import (
        "crypto/hmac"
        "crypto/sha256"
        "crypto/sha512"
        "encoding/base64"
        "net/url"
        "fmt"
        "encoding/json"
        "strings"

        )

        func getKrakenSignature(urlPath string, data interface{}, secret string) (string, error) {
            var encodedData string

            switch v := data.(type) {
            case string:
                var jsonData map[string]interface{}
                if err := json.Unmarshal([]byte(v), &jsonData); err != nil {
                    return "", err
                }
                encodedData = jsonData["nonce"].(string) + v
            case map[string]interface{}:
                dataMap := url.Values{}
                for key, value := range v {
                    dataMap.Set(key, fmt.Sprintf("%v", value))
                }
                encodedData = v["nonce"].(string) + dataMap.Encode()
            default:
                return "", fmt.Errorf("invalid data type")
            }
            sha := sha256.New()
            sha.Write([]byte(encodedData))
            shasum := sha.Sum(nil)

            message := append([]byte(urlPath), shaSum...)
            mac := hmac.New(sha512.New, base64.StdEncoding.DecodeString(secret))
            mac.Write(message)
            macsum := mac.Sum(nil)
            sigDigest := base64.StdEncoding.EncodeToString(macSum)
            return sigDigest, nil
        }

        func main() {

            apiSecret := "kQH5HW/8p1uGOVjbgWA7FunAmGO8lsSUXNsu3eow76sz84Q18fWxnyRzBHCd3pd5nE9qa99HAZtuZuj6F1huXg=="

            payload := map[string]interface{}{
                "nonce":     1616492376594,
            }

            signature, err := getKrakenSignature("/0/private/GetCustodyTask?id=TGWOJ4JQPOTZT2", payload, apiSec)
            if err != nil {
                fmt.Println("Error generating signature:", err)
                return
            }
            fmt.Printf("API-Sign: %s\n", signature)
        }
    ```
  </Tab>

  <Tab title="Node JS">
    ```js theme={null}
    const crypto = require('crypto');
    const querystring = require('querystring');

    // Function to get Kraken signature
    function getKrakenSignature(urlPath, data, secret) {
      let encoded;
      if (typeof data === 'string') {
        const jsonData = JSON.parse(data);
        encoded = jsonData.nonce + data;
      } else if (typeof data === 'object') {
        const dataStr = querystring.stringify(data);
        encoded = data.nonce + dataStr;
      } else {
        throw new Error('Invalid data type');
      }

      const sha256Hash = crypto.createHash('sha256').update(encoded).digest();
      const message = urlPath + sha256Hash.toString('binary');
      const secretBuffer = Buffer.from(secret, 'base64');
      const hmac = crypto.createHmac('sha512', secretBuffer);
      hmac.update(message, 'binary');
      const signature = hmac.digest('base64');
      return signature;
    }

    const apiSec = 'kQH5HW/8p1uGOVjbgWA7FunAmGO8lsSUXNsu3eow76sz84Q18fWxnyRzBHCd3pd5nE9qa99HAZtuZuj6F1huXg==';

    const payload = JSON.stringify({
      nonce: 1616492376594,
    });

    const signature = getKrakenSignature('/0/private/GetCustodyTask?id=TGWOJ4JQPOTZT2', payload, apiSec);
    console.log(`API-Sign: ${signature}`);
    ```
  </Tab>
</Tabs>

## Setting the nonce Parameter

The value for the `nonce` payload body parameter is an always increasing, unsigned 64-bit integer for each request that is made with a particular API key.

While a simple counter would provide a valid nonce, a more usual method of generating a valid nonce is to use e.g. a UNIX timestamp in milliseconds. There is no way to reset the nonce for an API key to a lower value, so be sure to use a nonce generation method that won't produce numbers less than the previous nonce.

Too many requests with invalid nonces (EAPI:Invalid nonce) can result in temporary bans.

Problems can arise from requests arriving out of order due to API keys being shared across processes, or from system clock drift/recalibration. An optional "nonce window" can be configured to specify a tolerance between nonce values.

### Examples

The following are some examples of how to generate valid millisecond resolution nonce values in different programming languages:

<Tabs>
  <Tab title="Python">
    ```py theme={null}
    import time

    api_nonce = time.time_ns()
    ```
  </Tab>

  <Tab title="JavaScript">
    ```js theme={null}
    const api_nonce = Date.now()
    ```
  </Tab>

  <Tab title="PHP">
    ```php theme={null}
    $api_nonce = explode(' ', microtime());
    $api_nonce = $api_nonce[1].substr($api_nonce[0], 2, 3);
    ```
  </Tab>
</Tabs>


# Institutional overview
Source: https://docs.kraken.com/institutional/guides/overview

OTC trading, custody, and prime brokerage APIs — designed for institutions managing large positions or client assets

Kraken's Institutional platform covers four distinct services, each purpose-built for a specific use case. Access to all Institutional APIs requires onboarding through your Kraken Account Manager.

## Services overview

| Service             | What it does                                                                     | Protocol  |
| :------------------ | :------------------------------------------------------------------------------- | :-------- |
| **OTC**             | Execute large block trades off the order book with minimal market impact         | REST      |
| **Custody**         | Secure digital asset storage with segregated accounts, deposits, and withdrawals | REST      |
| **Prime FIX**       | Low-latency institutional order management via FIX 4.4                           | FIX 4.4   |
| **Prime WebSocket** | Real-time market data, order updates, and account event streaming                | WebSocket |

## What can I build?

<CardGroup>
  <Card title="Block trading desk" icon="handshake">
    Use the **OTC REST** API to request quotes and execute large trades at negotiated prices, avoiding slippage on the public order book. Suitable for single-asset and cross-asset block trades.
  </Card>

  <Card title="Institutional custody" icon="vault">
    Use the **Custody REST** API to manage segregated wallets, automate deposit monitoring, initiate withdrawals, and reconcile client balances programmatically.
  </Card>

  <Card title="Prime order management" icon="terminal">
    Use **Prime FIX** for deterministic, low-latency order routing with cancel-on-disconnect, session-based message replay, and co-location at Equinix London. Designed for systematic and HFT workflows.
  </Card>

  <Card title="Real-time prime data" icon="bolt">
    Use **Prime WebSocket** to stream live order book data, fills, open positions, and account balances into your own execution or risk systems.
  </Card>
</CardGroup>

## Choosing your protocol

| Need                                     | Use                         |
| :--------------------------------------- | :-------------------------- |
| Large off-book trade at a specific price | OTC REST                    |
| Programmatic custody and asset movement  | Custody REST                |
| Low-latency order management with replay | Prime FIX                   |
| Real-time fills and position data        | Prime WebSocket             |
| Combined order entry + data streaming    | Prime FIX + Prime WebSocket |

## Getting started

All Institutional API access requires onboarding. Contact your Account Manager or reach out at [institutional@kraken.com](mailto:institutional@kraken.com) to:

* Request API credentials for the services you need
* Arrange co-location if using Prime FIX
* Complete any required NDA or compliance documentation

<CardGroup>
  <Card title="Custody REST authentication" icon="lock" href="/institutional/guides/custody-rest-auth">
    How to authenticate requests to the Custody REST API
  </Card>

  <Card title="Prime WebSocket authentication" icon="lock" href="/institutional/guides/prime-websocket-auth">
    How to authenticate and subscribe to Prime WebSocket channels
  </Card>
</CardGroup>


# Prime WebSocket Authentication
Source: https://docs.kraken.com/institutional/guides/prime-websocket-auth

How to authenticate WebSocket connections to the Kraken Prime API using HMAC-SHA256 signed headers.

<Note>Authenticated connection. Connect to: `wss://wss.prime.kraken.com/ws/v1`</Note>

WebSocket connections must be authenticated by signing the request and sending the signature in HTTP headers.

## Connection Headers

<Tabs>
  <Tab title="Header Schema">
    | Header           | Type   | Description                                                      |
    | ---------------- | ------ | ---------------------------------------------------------------- |
    | **ApiKey**       | string | Your Kraken API key                                              |
    | **ApiSign**      | string | base64-encoded signature                                         |
    | **ApiTimestamp** | string | An ISO-8601 UTC string of the form `2019-02-13T05:17:32.000000Z` |
  </Tab>

  <Tab title="Signature Generation">
    The signature is a base64 encoded sha256 HMAC using the API secret of the following:

    ```
    GET\n<ApiTimestamp>\n<host>\n<path>
    ```

    For example:

    ```
    GET\n2019-02-13T05:17:32.000000Z\nwss.sandbox.prime.kraken.com\n/ws/v1
    ```
  </Tab>

  <Tab title="Python Example">
    ```python theme={null}
    # to install websocket lib:
    # $ pip install websocket-client
    from websocket import create_connection
    import datetime
    import hmac
    import hashlib
    import base64

    api_key = "<apikey>"
    api_secret = "<apisecret>"

    utc_now = datetime.datetime.utcnow()
    utc_datetime = utc_now.strftime("%Y-%m-%dT%H:%M:%S.000000Z")

    host = "<websocket host>"  # wss.sandbox.prime.kraken.com, for example
    path = "/ws/v1"

    params = "\n".join([
        "GET",
        utc_datetime,
        host,
        path,
    ])

    hash = hmac.new(
        api_secret.encode('ascii'), params.encode('ascii'), hashlib.sha256)
    hash.hexdigest()

    signature = base64.urlsafe_b64encode(hash.digest()).decode()

    header = {
        "ApiKey": api_key,
        "ApiSign": signature,
        "ApiTimestamp": utc_datetime,
    }

    ws = create_connection("wss://" + host + path, header=header)

    while True:
        print(ws.recv())
    ```
  </Tab>
</Tabs>

## Environments

| Environment    | WebSocket Endpoint                         |
| -------------- | ------------------------------------------ |
| **Sandbox**    | `wss://wss.sandbox.prime.kraken.com/ws/v1` |
| **Production** | `wss://wss.prime.kraken.com/ws/v1`         |

## API Keys

For initial Prime access and onboarding, contact Kraken support at [prime\_trading@kraken.com](mailto:prime_trading@kraken.com) or your Account Manager.

After your Prime account is onboarded, you can create and manage API keys self-service from the [Prime UI API settings](https://pro.kraken.com/app/prime/api-settings). Sign in with your standard Kraken Pro credentials.

You will need separate API keys for the sandbox and production environments.

## Rate Limits

There is no limit to how many concurrent websocket connections you're allowed, though this may change in the future. If you expect to have more than \~10 active connections, please contact [prime\_trading@kraken.com](mailto:prime_trading@kraken.com).


# Pay webhook notifications
Source: https://docs.kraken.com/pay/guides/pay-webhook

Handle Kraken Pay webhook notifications for payment status changes using JWT verification with ES256.

### Overview

Kraken Pay will notify your system via webhook when the payment status changes. You'll receive `POST` notifications for the following statuses:

```
- success
- failed
- cancelled
- expired
- declined
```

The payload is encoded and signed using [**JWT**](https://www.rfc-editor.org/rfc/rfc7519) with the `ES256` algorithm (ECDSA using P-256 and SHA-256) and the specified `kid`.
The `kid` is used to verify the signature by looking up the correct public key in the JWKS  available at **[https://www.kraken.com/.well-known/pay-callback-keys.json](https://www.kraken.com/.well-known/pay-callback-keys.json)**. <br />
A given `kid` will always point to the same key, so you can cache it forever.
You will only need to fetch the remote JWKS and update your local set if the JWT is signed with a new `kid`.

JWT expiration is set to 24 hours. **If you have to process the message past the expiry you can simply ignore it.**

### Claims

JWT claims have the following schema:

| Field                      | Type               | Description                                                                                                                                                                                                                    |
| :------------------------- | :----------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `iss`                      | `string`           | Issuer. Should always be `kraken-pay`                                                                                                                                                                                          |
| `aud`                      | `string` or `null` | Recipients that the JWT is intented for (unused)                                                                                                                                                                               |
| `exp`                      | `number`           | Expiration time. Unix timestamp in seconds                                                                                                                                                                                     |
| `payload.external_id`      | `string`           | Your unique ID for tracking the payment                                                                                                                                                                                        |
| `payload.status`           | `string`           | Payment status. `success`, `failed`, `cancelled`, `expired`, `declined`                                                                                                                                                        |
| `payload.customer_kraktag` | `string` or `null` | In the case of a pay request, Kraktag of the payer. In the case of a transfer or paylink, Kraktag of the recipient. If the notification is triggered by a cancelled or an expired paylink or pay request, this will be `null`. |

Because new fields could be added to the `payload` in the future, your deserialization implementation **should** handle unknown fields.

**Example**: Decoded JWT claims

```json theme={null}
{
  "iss": "kraken-pay",
  "aud": null,
  "exp": 1749547869,
  "payload": {
    "external_id": "GSoAAAAAAAA",
    "status": "success",
    "customer_kraktag": "bob"
  }
}
```

### Webhook response

On successful validation of the payload your endpoint **must** return a `200` code with the following `JSON` payload:

```json theme={null}
{
  "code": "success"
}
```

**Anything else will be treated as an error.**

### Examples

#### Decode and validate JWT

The following are Rust and PHP examples of how to decode the JWT and validate its signature.

| Type        | Value                                                                                                                                                                                                                                                                                                                                                |
| ----------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Private key | <pre>-----BEGIN PRIVATE KEY----- <br />MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgCfJ5HUY3VRpKR7rb <br />f60ba2BMvRSoZCyqnscwBvf+HlGhRANCAARtlMp6bYdgBIuEn3b/tmIRnJ6O6+Zf <br />9NhKpuKPe7Vj76Vv5mohvNczcM0sWjo6OEQ6jngzD5wMTWIhXvRcyRtO <br />-----END PRIVATE KEY-----  </pre>                                                                |
| Algorithm   | `ES256`                                                                                                                                                                                                                                                                                                                                              |
| kid         | `test-pay-callback-1`                                                                                                                                                                                                                                                                                                                                |
| JWT         | `eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiIsImtpZCI6InRlc3QtcGF5LWNhbGxiYWNrLTEifQ.eyJpc3MiOiJrcmFrZW4tcGF5IiwiYXVkIjpudWxsLCJleHAiOjE3NDk1NDc4NjksInBheWxvYWQiOnsiZXh0ZXJuYWxfaWQiOiJHU29BQUFBQUFBQSIsInN0YXR1cyI6InN1Y2Nlc3MiLCJjdXN0b21lcl9rcmFrdGFnIjoiYm9iIn19.dmlaZ0sdPVodkytuv8IFUj4Sbn0wpywzW51itWCh7dHX-bELdhkwE8pVpIyRYGP42TtyBChbVKwXEfd2-uxTHQ` |

<Tabs>
  <Tab title="Rust">
    ```rust theme={null}
    use std::{str::FromStr, sync::LazyLock};

    use actix_web::{error, post, App, Error, HttpResponse, HttpServer};
    use anyhow::anyhow;
    use chrono::{serde::ts_seconds, DateTime, Utc};
    use jsonwebtoken::{decode_header, jwk::JwkSet, Algorithm, DecodingKey, TokenData, Validation};
    use serde::{Deserialize, Serialize};
    use url::Url;

    static JWT_VERIFIER: LazyLock<JwtVerifier> = LazyLock::new(|| JwtVerifier::new().unwrap());

    #[post("/")]
    async fn index(token: String) -> Result<HttpResponse, Error> {
        let token_data = JWT_VERIFIER
            .validate_via_kid(&token)
            .await
            .map_err(error::ErrorBadRequest)?;

        // Do something with the payload
        let notification = token_data.claims.payload;
        println!("Got Kraken Pay notification: {notification:#?}");

        Ok(HttpResponse::Ok().json(CallbackResponse {
            code: PayResponseCode::Success,
        }))
    }

    #[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
    pub enum PayResponseCode {
        Success,
    }

    #[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
    pub struct CallbackResponse {
        pub code: PayResponseCode,
    }

    #[actix_web::main]
    async fn main() -> std::io::Result<()> {
        HttpServer::new(|| App::new().service(index))
            .bind(("127.0.0.1", 8080))?
            .run()
            .await
    }

    #[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
    struct Claims {
        /// Issuer.
        iss: String,
        /// Audience.
        aud: Option<String>,
        /// Time beyond which the JWT is no longer valid
        #[serde(with = "ts_seconds")]
        exp: DateTime<Utc>,
        /// Notification payload
        payload: Notification,
    }

    #[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
    struct Notification {
        external_id: String,
        status: PayStatus,
        customer_kraktag: Option<String>,
    }

    #[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
    #[serde(rename_all = "kebab-case")]
    enum PayStatus {
        Success,
        Failed,
        Cancelled,
        Expired,
        Declined,
    }

    struct JwtVerifier {
        validation: Validation,
        jwks: JwkSet,
        jwks_url: Url,
        http: reqwest::Client,
    }

    impl JwtVerifier {
        fn new() -> anyhow::Result<Self> {
            let mut validation = Validation::new(Algorithm::ES256);
            validation.set_issuer(&["kraken-pay"]);

            let jwks = jwk_set();
            let http = reqwest::Client::builder()
                .user_agent("Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0")
                .timeout(std::time::Duration::from_secs(10))
                .build()?;
            let jwks_url = Url::from_str("https://www.kraken.com/.well-known/pay-callback-keys.json")?;

            Ok(Self {
                validation,
                jwks,
                jwks_url,
                http,
            })
        }

        /// Validate JWT via `kid`. If the key is present in the local JWKS then read from it,
        /// otherwise fetch the remote JWKS.
        async fn validate_via_kid(&self, token: &str) -> anyhow::Result<TokenData<Claims>> {
            let header = decode_header(token)?;
            let kid = header.kid.as_deref().ok_or(anyhow!("JWT has no kid"))?;

            let decoding_key = {
                if let Some(jwk) = self.jwks.find(kid) {
                    DecodingKey::from_jwk(jwk)?
                } else {
                    let jwks: JwkSet = self
                        .http
                        .get(self.jwks_url.clone())
                        .send()
                        .await?
                        .json()
                        .await?;
                    let jwk = jwks.find(kid).ok_or(anyhow!("Cannot find key in jwks"))?;
                    DecodingKey::from_jwk(jwk)?
                }
            };

            Ok(jsonwebtoken::decode(
                token,
                &decoding_key,
                &self.validation,
            )?)
        }
    }

    fn jwk_set() -> JwkSet {
        let jwk_text = r#"{
          "keys": [
            {
              "alg": "ES256",
              "kty": "EC",
              "kid": "test-pay-callback-1",
              "crv": "P-256",
              "x": "bZTKem2HYASLhJ92_7ZiEZyejuvmX_TYSqbij3u1Y-8",
              "y": "pW_maiG81zNwzSxaOjo4RDqOeDMPnAxNYiFe9FzJG04"
            }
          ]
        }"#;

        serde_json::from_str(jwk_text).unwrap()
    }
    ```
  </Tab>

  <Tab title="PHP">
    ```php theme={null}
    <?php

    // This script uses composer to import the JWT library
    // $ composer require firebase/php-jwt
    // $ composer require paragonie/sodium_compat
    // $ php -S localhost:8080 listener.php

    require_once "vendor/autoload.php";
    use Firebase\JWT\JWK;
    use Firebase\JWT\JWT;

    // Local set of keys
    $jwks = json_decode(
        '{
            "keys": [
              {
                "alg": "ES256",
                "kty": "EC",
                "kid": "test-pay-callback-1",
                "crv": "P-256",
                "use": "sig",
                "x": "bZTKem2HYASLhJ92_7ZiEZyejuvmX_TYSqbij3u1Y-8",
                "y": "pW_maiG81zNwzSxaOjo4RDqOeDMPnAxNYiFe9FzJG04"
              }
            ]
        }',
        true
    );


    function get_method()
    {
        return $_SERVER["REQUEST_METHOD"];
    }

    function get_request_data()
    {
        return file_get_contents("php://input", true);
    }

    function send_response($response, $code = 200)
    {
        http_response_code($code);
        $response = json_encode($response);
        error_log("Response: ". $response);
        die($response);
    }

    function decode_headers($jwt)
    {
        // Decode headers from the JWT string WITHOUT validation
        list($headersB64, $payloadB64, $sig) = explode(".", $jwt);
        $decoded = json_decode(base64_decode($headersB64), true);
        return $decoded;
    }


    function update_jwks(&$jwks)
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://www.kraken.com/.well-known/pay-callback-keys.json");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $output = curl_exec($ch);
        curl_close($ch);
        $remote_keys = json_decode($output, true);
        $remote_keys = $remote_keys["keys"];

        $jwks["keys"] = array_merge($jwks["keys"], $remote_keys);
    }

    function validate_jwt_via_kid($jwt, &$jwks)
    {
        $headers = decode_headers($jwt);
        $kid = $headers["kid"];
        $keys = $jwks["keys"];

        $found = false;
        foreach ($keys as $key) {
            if ($key["kid"] == $kid) {
                $found = true;
            }
        }
        if (!$found) {
            throw new Exception("kid not found in JWKS");
        }

        $decoded = null;
        try {
            $keySet = JWK::parseKeySet($jwks);
            $decoded = JWT::decode($jwt, $keySet);
            $decoded = json_decode(json_encode($decoded), true);
        } catch (Exception $e) {
            $exception = $e->getMessage();
            // Ignore expired token if needed
            if ($exception == "Expired token") {
                error_log("Ignoring expired token");
                list($header, $payload, $signature) = explode(".", $jwt);
                $decoded = base64_decode($payload);
                $decoded = json_decode($decoded, true);
            } else {
                send_response(array(
                    "code" => 400,
                    "status" => "failed",
                    "message" => $exception
                ), 400);
            }
        }

        $iss = $decoded["iss"];
        if ($iss != "kraken-pay") {
            send_response(array(
                "code" => 400,
                "status" => "failed",
                "message" => "Unexpected issuer: " . $iss
            ), 400);
        }

        return $decoded;
    }

    $method = get_method();
    if ($method === "POST") {
        $data = get_request_data();
        $decoded = null;
        try {
            $decoded = validate_jwt_via_kid($data, $jwks);
        } catch (Exception $e) {
            $exception = $e->getMessage();
            if ($exception == "kid not found in JWKS") {
                error_log("kid not found in JWKS, fetching remote JWKS");
                update_jwks($jwks);
                $decoded = validate_jwt_via_kid($data, $jwks);
            }
        }

        // Do something with the payload
        error_log("Got Kraken Pay notification: " . json_encode($decoded));

        // All good
        send_response([
            "code" => "success",
        ]);
    }

    // Error for any other method
    send_response(array(
        "code" => 405,
        "status" => "failed",
        "message" => "Method not allowed"
    ), 405);
    ```
  </Tab>
</Tabs>


