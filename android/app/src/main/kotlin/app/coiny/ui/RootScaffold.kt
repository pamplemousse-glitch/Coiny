package app.coiny.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier

@Composable
fun RootScaffold() {
    var selectedTab by remember { mutableStateOf(Tab.Pet) }

    Scaffold(
        bottomBar = {
            NavigationBar {
                Tab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = tab == selectedTab,
                        onClick = { selectedTab = tab },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label) },
                    )
                }
            }
        },
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize().padding(innerPadding), contentAlignment = Alignment.Center) {
            when (selectedTab) {
                Tab.Pet -> Text("Pet view (TODO — wire PetViewModel)")
                Tab.Spending -> Text("Spending view (TODO)")
                Tab.Settings -> Text("Settings view (TODO)")
            }
        }
    }
}

private enum class Tab(val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Pet("Pet", Icons.Filled.Face),
    Spending("Spending", Icons.Filled.CreditCard),
    Settings("Settings", Icons.Filled.Settings),
}
