package app.coiny.data

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import io.ktor.client.request.get
import io.ktor.serialization.kotlinx.json.json
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
    }

    suspend fun getPetState(): PetState = client.get(BASE_URL + "/api/pets").body()

    suspend fun health(): HealthResponse = client.get(BASE_URL + "/health").body()

    companion object {
        const val BASE_URL = "https://coiny-backend.fly.dev"
        val instance: Api by lazy { Api() }
    }
}

@kotlinx.serialization.Serializable
data class HealthResponse(val ok: Boolean)
