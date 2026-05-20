package app.coiny.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.coiny.data.Api
import app.coiny.data.PetState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class PetViewModel : ViewModel() {

    sealed interface UiState {
        data object Idle : UiState
        data object Loading : UiState
        data class Loaded(val pet: PetState) : UiState
        data class Failed(val message: String) : UiState
    }

    private val _state = MutableStateFlow<UiState>(UiState.Idle)
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        if (_state.value is UiState.Loading) return
        _state.value = UiState.Loading
        viewModelScope.launch {
            runCatching { Api.instance.getPetState() }
                .onSuccess { _state.value = UiState.Loaded(it) }
                .onFailure { _state.value = UiState.Failed(it.message ?: "Unknown error") }
        }
    }
}
