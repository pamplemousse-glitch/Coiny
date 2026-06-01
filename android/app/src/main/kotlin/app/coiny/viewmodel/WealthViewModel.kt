package app.coiny.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.coiny.data.Api
import app.coiny.data.NetWorth
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class WealthViewModel : ViewModel() {

    data class UiState(
        val netWorth: NetWorth? = null,
        val isLoading: Boolean = false,
        val error: String? = null,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        if (_state.value.isLoading) return
        _state.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            runCatching { Api.instance.getNetWorth() }
                .onSuccess { nw -> _state.update { it.copy(netWorth = nw, isLoading = false) } }
                .onFailure { e -> _state.update { it.copy(isLoading = false, error = e.message ?: "Unknown error") } }
        }
    }
}
