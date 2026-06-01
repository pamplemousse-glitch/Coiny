package app.coiny.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "coiny_session")

/**
 * Persists the bearer token across process restarts.
 *
 * Trade-off: DataStore preferences are not encrypted at rest. The token is a
 * server-issued opaque session identifier (not a long-lived credential, not a
 * Google/Apple identity token), so the blast radius of disk extraction is a
 * single revocable session. Real password/OAuth refresh tokens never land here.
 */
class SessionStore(private val context: Context) {

    private val tokenKey = stringPreferencesKey("session_token")

    val token: Flow<String?> = context.dataStore.data.map { it[tokenKey] }

    suspend fun save(token: String) {
        context.dataStore.edit { it[tokenKey] = token }
    }

    suspend fun clear() {
        context.dataStore.edit { it.remove(tokenKey) }
    }
}
