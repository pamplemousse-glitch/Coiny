package app.coiny.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.coiny.data.NetWorth
import app.coiny.viewmodel.WealthViewModel
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WealthScreen(viewModel: WealthViewModel) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Wealth") },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Filled.Refresh, contentDescription = "Refresh")
                    }
                },
            )
        },
    ) { innerPadding ->
        when {
            state.isLoading && state.netWorth == null -> {
                Box(Modifier.fillMaxSize().padding(innerPadding), Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            state.error != null && state.netWorth == null -> {
                Box(
                    Modifier.fillMaxSize().padding(innerPadding).padding(24.dp),
                    Alignment.Center,
                ) {
                    Text(
                        state.error ?: "",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }
            state.netWorth != null -> {
                WealthContent(
                    netWorth = state.netWorth!!,
                    modifier = Modifier.fillMaxSize().padding(innerPadding),
                )
            }
        }
    }
}

@Composable
private fun WealthContent(netWorth: NetWorth, modifier: Modifier = Modifier) {
    val usd = remember { NumberFormat.getCurrencyInstance(Locale.US) }
    val breakdown = remember(netWorth) { netWorth.nonZeroBreakdown() }

    LazyColumn(modifier = modifier) {
        item {
            TotalCard(
                total = netWorth.total,
                debts = netWorth.debts,
                liquidCashMonths = netWorth.liquidCashMonths,
                usd = usd,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
        }

        if (breakdown.isEmpty()) {
            item {
                Box(
                    Modifier.fillMaxWidth().padding(32.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "No assets connected yet. Connect a bank, exchange, or wallet to see your net worth here.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        } else {
            item {
                Text(
                    "Breakdown",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 16.dp, top = 16.dp, bottom = 4.dp),
                )
            }
            items(breakdown) { (label, value) ->
                BreakdownRow(label = label, value = value, usd = usd)
                HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
            }
        }

        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun TotalCard(
    total: Double,
    debts: Double,
    liquidCashMonths: Double?,
    usd: NumberFormat,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        shape = MaterialTheme.shapes.large,
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "Net worth",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                usd.format(total),
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
            )

            if (debts > 0.0 || liquidCashMonths != null) {
                Spacer(Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    if (debts > 0.0) {
                        Column {
                            Text(
                                "Debts",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(usd.format(debts), style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                    if (liquidCashMonths != null) {
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                "Liquid runway",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                "%.1f mo".format(liquidCashMonths),
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BreakdownRow(label: String, value: Double, usd: NumberFormat) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
        Text(
            usd.format(value),
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
        )
    }
}

private fun NetWorth.nonZeroBreakdown(): List<Pair<String, Double>> {
    val rows = listOf(
        "Bank" to bank,
        "Investments" to investments,
        "Crypto" to crypto,
        "DeFi" to defi,
        "Chain wallets" to chainWallets,
        "Hyperliquid" to hyperliquid,
        "Polymarket" to polymarket,
        "Kalshi" to kalshi,
        "Kraken" to kraken,
        "Alpaca" to alpaca,
        "SnapTrade" to snaptrade,
        "YNAB" to ynab,
        "TrueLayer" to truelayer,
        "Real estate" to realEstate,
        "Vehicles" to vehicles,
        "Metals" to metals,
        "Energy" to energy,
        "Farmland" to farmland,
        "Sneakers" to sneakers,
        "NFTs" to nft,
        "Steam" to steam,
        "Pokémon cards" to pokemonCards,
        "Trading cards" to tradingCards,
        "Coins" to coins,
        "Vinyl" to vinyl,
        "Manual assets" to manual,
    )
    return rows.filter { it.second > 0.0 }.sortedByDescending { it.second }
}
