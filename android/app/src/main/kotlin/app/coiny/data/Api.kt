package app.coiny.data

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Singleton HTTP client + endpoint wrappers for coiny-backend.fly.dev.
 *
 * Single instance per process. Used by view models via [Api.instance].
 *
 * Auth: callers (typically [app.coiny.auth.AuthRepository]) set the bearer
 * token via [setSessionToken]. Authed endpoints throw if no token is set.
 */
class Api private constructor() {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    private val client = HttpClient(OkHttp) {
        install(ContentNegotiation) { json(json) }
        install(HttpTimeout) {
            requestTimeoutMillis = 30_000
            connectTimeoutMillis = 10_000
        }
        install(Logging) { level = LogLevel.INFO }
        expectSuccess = true
    }

    @Volatile private var sessionToken: String? = null

    fun setSessionToken(token: String?) {
        sessionToken = token
    }

    fun hasSession(): Boolean = sessionToken != null

    suspend fun getPetState(): PetState = authedGet("/api/pets")
    suspend fun getSpendingSummary(): SpendingSummary = authedGet("/api/spending/summary")
    suspend fun getSpendingOverrides(): List<SpendingOverride> = authedGet("/api/spending/overrides")
    suspend fun getNetWorth(): NetWorth = authedGet("/api/net-worth")
    suspend fun health(): HealthResponse = client.get(BASE_URL + "/health").body()

    /** Exchanges a Google ID token for a backend session token. */
    suspend fun signInWithGoogle(idToken: String): AuthResponse =
        client.post(BASE_URL + "/api/auth/google") {
            contentType(ContentType.Application.Json)
            setBody(GoogleSignInRequest(id_token = idToken))
        }.body()

    /** Sandbox-only: mints a session for the fixed simulator user. */
    suspend fun fetchDebugSession(): String =
        client.post(BASE_URL + "/api/debug/session").body<DebugSessionResponse>().token

    /** Invalidates the current session on the server. */
    suspend fun logout(): Unit {
        val token = sessionToken ?: return
        client.post(BASE_URL + "/api/auth/logout") { bearer(token) }
    }

    private suspend inline fun <reified T> authedGet(path: String): T {
        val token = sessionToken ?: error("No session token set; sign in first")
        return client.get(BASE_URL + path) { bearer(token) }.body()
    }

    private fun HttpRequestBuilder.bearer(token: String) {
        header(HttpHeaders.Authorization, "Bearer $token")
    }

    @Serializable
    private data class DebugSessionResponse(val token: String)

    @Serializable
    private data class GoogleSignInRequest(val id_token: String)

    companion object {
        const val BASE_URL = "https://coiny-backend.fly.dev"
        val instance: Api by lazy { Api() }
    }
}

@kotlinx.serialization.Serializable
data class HealthResponse(val ok: Boolean)

@kotlinx.serialization.Serializable
data class AuthResponse(val token: String, val user_id: String)
