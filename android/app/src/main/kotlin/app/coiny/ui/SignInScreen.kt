package app.coiny.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.coiny.viewmodel.AuthViewModel

@Composable
fun SignInScreen(state: AuthViewModel.UiState, viewModel: AuthViewModel) {
    Box(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                "Coiny",
                style = MaterialTheme.typography.displaySmall.copy(fontWeight = FontWeight.Bold),
            )
            Text(
                "Sign in to start tracking your money pet.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(16.dp))

            Button(
                onClick = { viewModel.signInWithGoogle() },
                enabled = !state.isSigningIn && viewModel.googleSignInConfigured,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (state.isSigningIn) "Signing in…" else "Sign in with Google")
            }

            if (!viewModel.googleSignInConfigured) {
                Text(
                    "Google Sign-In not configured. Set GOOGLE_AUTH_CLIENT_ID in local.properties to enable.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
            }

            OutlinedButton(
                onClick = { viewModel.signInWithDebugSession() },
                enabled = !state.isSigningIn,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Use debug session (sandbox)")
            }

            state.error?.let { err ->
                Text(
                    err,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    textAlign = TextAlign.Center,
                )
            }

            if (state.isSigningIn) {
                Spacer(Modifier.height(8.dp))
                CircularProgressIndicator()
            }
        }
    }
}
