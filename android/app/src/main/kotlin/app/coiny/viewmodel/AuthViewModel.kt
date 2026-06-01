package app.coiny.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import app.coiny.auth.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class AuthViewModel(application: Application) : AndroidViewModel(application) {

    private val repo = AuthRepository(application)

    sealed interface AuthState {
        data object Loading : AuthState
        data object SignedOut : AuthState
        data object SignedIn : AuthState
    }

    data class UiState(
        val auth: AuthState = AuthState.Loading,
        val isSigningIn: Boolean = false,
        val error: String? = null,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    val googleSignInConfigured: Boolean
        get() = repo.googleSignInConfigured

    init {
        viewModelScope.launch {
            val token = repo.token.first()
            repo.applyToken(token)
            _state.update {
                it.copy(auth = if (token != null) AuthState.SignedIn else AuthState.SignedOut)
            }
        }
    }

    fun signInWithGoogle() {
        if (_state.value.isSigningIn) return
        _state.update { it.copy(isSigningIn = true, error = null) }
        viewModelScope.launch {
            repo.signInWithGoogle()
                .onSuccess { _state.update { it.copy(auth = AuthState.SignedIn, isSigningIn = false) } }
                .onFailure { e -> _state.update { it.copy(isSigningIn = false, error = e.message ?: "Sign-in failed") } }
        }
    }

    fun signInWithDebugSession() {
        if (_state.value.isSigningIn) return
        _state.update { it.copy(isSigningIn = true, error = null) }
        viewModelScope.launch {
            repo.signInWithDebugSession()
                .onSuccess { _state.update { it.copy(auth = AuthState.SignedIn, isSigningIn = false) } }
                .onFailure { e -> _state.update { it.copy(isSigningIn = false, error = e.message ?: "Sign-in failed") } }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            repo.signOut()
            _state.update { UiState(auth = AuthState.SignedOut) }
        }
    }
}
