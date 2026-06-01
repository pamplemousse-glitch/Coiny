package app.coiny.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import app.coiny.BuildConfig
import app.coiny.data.Api
import app.coiny.data.SessionStore
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.Companion.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
import kotlinx.coroutines.flow.Flow

/**
 * Owns the bearer-token lifecycle. Reads/writes [SessionStore], pushes the
 * token into [Api], and brokers sign-in via Credential Manager.
 */
class AuthRepository(private val context: Context) {

    private val sessionStore = SessionStore(context)
    private val credentialManager = CredentialManager.create(context)

    val token: Flow<String?> = sessionStore.token

    /** Push a previously-persisted token into the Api singleton. */
    fun applyToken(token: String?) {
        Api.instance.setSessionToken(token)
    }

    /** True if the BuildConfig has a real Google client ID wired up. */
    val googleSignInConfigured: Boolean
        get() = BuildConfig.GOOGLE_AUTH_CLIENT_ID.isNotBlank()

    suspend fun signInWithGoogle(): Result<Unit> = runCatching {
        check(googleSignInConfigured) { "GOOGLE_AUTH_CLIENT_ID is not set" }

        val option = GetGoogleIdOption.Builder()
            .setServerClientId(BuildConfig.GOOGLE_AUTH_CLIENT_ID)
            .setFilterByAuthorizedAccounts(false)
            .build()
        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()

        val response = credentialManager.getCredential(context, request)
        val credential = response.credential
        val idToken = when {
            credential is CustomCredential && credential.type == TYPE_GOOGLE_ID_TOKEN_CREDENTIAL ->
                GoogleIdTokenCredential.createFrom(credential.data).idToken
            else -> error("Unexpected credential type: ${credential.type}")
        }

        val auth = Api.instance.signInWithGoogle(idToken)
        sessionStore.save(auth.token)
        Api.instance.setSessionToken(auth.token)
    }

    /** Sandbox-only escape hatch — keeps the debug-session flow we shipped earlier. */
    suspend fun signInWithDebugSession(): Result<Unit> = runCatching {
        val token = Api.instance.fetchDebugSession()
        sessionStore.save(token)
        Api.instance.setSessionToken(token)
    }

    suspend fun signOut(): Result<Unit> = runCatching {
        runCatching { Api.instance.logout() } // best-effort server-side invalidation
        sessionStore.clear()
        Api.instance.setSessionToken(null)
    }
}
