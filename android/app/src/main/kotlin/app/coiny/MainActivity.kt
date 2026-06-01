package app.coiny

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import app.coiny.ui.CoinyTheme
import app.coiny.ui.RootScaffold
import app.coiny.ui.SignInScreen
import app.coiny.viewmodel.AuthViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CoinyTheme {
                val authViewModel: AuthViewModel = viewModel()
                val authState by authViewModel.state.collectAsState()
                when (authState.auth) {
                    AuthViewModel.AuthState.Loading -> Box(
                        Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) { CircularProgressIndicator() }
                    AuthViewModel.AuthState.SignedOut -> SignInScreen(
                        state = authState,
                        viewModel = authViewModel,
                    )
                    AuthViewModel.AuthState.SignedIn -> RootScaffold()
                }
            }
        }
    }
}
