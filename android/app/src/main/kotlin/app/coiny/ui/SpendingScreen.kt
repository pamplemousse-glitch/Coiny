package app.coiny.ui

import android.text.format.DateUtils
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.coiny.data.ReactionRecord
import app.coiny.data.SpendingSummary
import app.coiny.viewmodel.PetViewModel
import app.coiny.viewmodel.SpendingViewModel
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SpendingScreen(petViewModel: PetViewModel, spendingViewModel: SpendingViewModel) {
    val petState by petViewModel.state.collectAsState()
    val spendingState by spendingViewModel.state.collectAsState()

    val reactions = when (val s = petState) {
        is PetViewModel.UiState.Loaded -> s.pet.reactionHistory
        else -> emptyList()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Activity") },
                actions = {
                    IconButton(onClick = {
                        spendingViewModel.refresh()
                        petViewModel.refresh()
                    }) {
                        Icon(Icons.Filled.Refresh, contentDescription = "Refresh")
                    }
                },
            )
        },
    ) { innerPadding ->
        if (spendingState.isLoading && spendingState.summary == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            spendingState.summary?.let { summary ->
                item {
                    SavingsCard(
                        summary = summary,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    )
                }

                val cats = summary.spendByCategory.orEmpty()
                if (cats.isNotEmpty()) {
                    item {
                        CategoryCard(
                            categories = cats,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                        )
                    }
                }
            }

            if (reactions.isNotEmpty()) {
                item {
                    Text(
                        "Recent reactions",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(start = 16.dp, top = 16.dp, bottom = 4.dp),
                    )
                }
                items(reactions) { record ->
                    ReactionRow(record = record)
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                }
            } else if (spendingState.summary == null && !spendingState.isLoading) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "No activity yet. Reactions appear once your bank starts sending transactions.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

@Composable
private fun SavingsCard(summary: SpendingSummary, modifier: Modifier = Modifier) {
    val usd = remember { NumberFormat.getCurrencyInstance(Locale.US) }

    val rateColor: Color = when {
        (summary.savingsRate ?: 0) >= 20 -> Color(0xFF4CAF50)
        (summary.savingsRate ?: 0) >= 5 -> Color(0xFFFF9800)
        else -> Color(0xFFF44336)
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        shape = MaterialTheme.shapes.large,
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "Savings rate",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    summary.savingsRate?.let { "$it%" } ?: "—",
                    style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                    color = if (summary.savingsRate != null) rateColor else MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    "30-day average",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text("Spend", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(usd.format(summary.monthlySpend), style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.height(4.dp))
                Text("Income", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(usd.format(summary.monthlyIncome), style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun CategoryCard(categories: Map<String, Double>, modifier: Modifier = Modifier) {
    val usd = remember { NumberFormat.getCurrencyInstance(Locale.US) }
    val top5 = remember(categories) {
        categories.entries.sortedByDescending { it.value }.take(5)
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        shape = MaterialTheme.shapes.large,
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "Top categories",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(8.dp))
            top5.forEach { (cat, amount) ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 2.dp),
                ) {
                    Text(
                        cat.replace("_", " ").replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        usd.format(amount),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }
        }
    }
}

@Composable
private fun ReactionRow(record: ReactionRecord) {
    val relativeTime = remember(record.at) {
        DateUtils.getRelativeTimeSpanString(
            record.at.toEpochMilliseconds(),
            System.currentTimeMillis(),
            DateUtils.MINUTE_IN_MILLIS,
        ).toString()
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
    ) {
        Row(modifier = Modifier.fillMaxWidth()) {
            Text(
                record.eventType.replace("_", " ").replaceFirstChar { it.uppercase() },
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                modifier = Modifier.weight(1f),
            )
            Text(
                relativeTime,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Spacer(Modifier.height(2.dp))
        Text(
            record.reaction.reason,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
