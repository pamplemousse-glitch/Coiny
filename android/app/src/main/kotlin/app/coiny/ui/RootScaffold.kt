package app.coiny.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.Pets
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.lifecycle.viewmodel.compose.viewModel
import app.coiny.viewmodel.PetViewModel
import app.coiny.viewmodel.SpendingViewModel
import app.coiny.viewmodel.WealthViewModel

@Composable
fun RootScaffold() {
    var selectedTab by remember { mutableStateOf(Tab.Pet) }

    val petViewModel: PetViewModel = viewModel()
    val spendingViewModel: SpendingViewModel = viewModel()
    val wealthViewModel: WealthViewModel = viewModel()

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
                Tab.Pet -> PetScreen(viewModel = petViewModel)
                Tab.Activity -> SpendingScreen(petViewModel = petViewModel, spendingViewModel = spendingViewModel)
                Tab.Wealth -> WealthScreen(viewModel = wealthViewModel)
            }
        }
    }
}

private enum class Tab(val label: String, val icon: ImageVector) {
    Pet("Pet", Icons.Filled.Pets),
    Activity("Activity", Icons.AutoMirrored.Filled.ReceiptLong),
    Wealth("Wealth", Icons.Filled.AccountBalance),
}
