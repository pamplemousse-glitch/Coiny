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
import io.ktor.http.HttpHeaders
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Singleton HTTP client + endpoint wrappers for coiny-backend.fly.dev.
 *
 * Single instance per process. Used by view models via [Api.instance].
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
    private val sessionMutex = Mutex()

    suspend fun getPetState(): PetState = authedGet("/api/pets")

    suspend fun getSpendingSummary(): SpendingSummary = authedGet("/api/spending/summary")

    suspend fun getSpendingOverrides(): List<SpendingOverride> = authedGet("/api/spending/overrides")

    suspend fun health(): HealthResponse = client.get(BASE_URL + "/health").body()

    private suspend inline fun <reified T> authedGet(path: String): T {
        val token = ensureSession()
        return client.get(BASE_URL + path) { bearer(token) }.body()
    }

    private suspend fun ensureSession(): String {
        sessionToken?.let { return it }
        return sessionMutex.withLock {
            sessionToken ?: fetchDebugSession().also { sessionToken = it }
        }
    }

    private suspend fun fetchDebugSession(): String =
        client.post(BASE_URL + "/api/debug/session").body<DebugSessionResponse>().token

    private fun HttpRequestBuilder.bearer(token: String) {
        header(HttpHeaders.Authorization, "Bearer $token")
    }

    @Serializable
    private data class DebugSessionResponse(val token: String)

    companion object {
        const val BASE_URL = "https://coiny-backend.fly.dev"
        val instance: Api by lazy { Api() }
    }
}

@kotlinx.serialization.Serializable
data class HealthResponse(val ok: Boolean)
