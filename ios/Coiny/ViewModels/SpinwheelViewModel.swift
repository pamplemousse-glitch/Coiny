import Foundation
import Observation

protocol SpinwheelViewModelAPI: Sendable {
    func getSpinwheelStatus() async throws -> SpinwheelStatus
    func sendSpinwheelOtp(phone: String, dateOfBirth: String) async throws -> EmptyResponse
    func verifySpinwheelOtp(phone: String, code: String) async throws -> EmptyResponse
    func getSpinwheelDebts() async throws -> SpinwheelDebtsResponse
    func getSpinwheelCreditScore() async throws -> SpinwheelCreditScoreResponse
    func disconnectSpinwheel() async throws
}

extension API: SpinwheelViewModelAPI {}

@Observable
@MainActor
final class SpinwheelViewModel {
    private(set) var isConnected = false
    private(set) var isLoading = false
    private(set) var showOtpEntry = false
    private(set) var debts: [SpinwheelDebt] = []
    private(set) var creditScore: Int?
    private(set) var creditUtilization: Double?
    private(set) var errorMessage: String?

    private(set) var pendingPhone = ""

    private let api: any SpinwheelViewModelAPI

    init(api: any SpinwheelViewModelAPI = API.shared) {
        self.api = api
    }

    func loadStatus() async {
        isLoading = true
        errorMessage = nil
        do {
            let s = try await api.getSpinwheelStatus()
            isConnected = s.connected
            if isConnected {
                async let debtsResult = api.getSpinwheelDebts()
                async let scoreResult = api.getSpinwheelCreditScore()
                let (dr, sr) = (try? await debtsResult, try? await scoreResult)
                debts = dr?.debts ?? []
                creditScore = sr?.score
                creditUtilization = sr?.utilization
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func sendOtp(phone: String, dateOfBirth: String) async {
        errorMessage = nil
        do {
            _ = try await api.sendSpinwheelOtp(phone: phone, dateOfBirth: dateOfBirth)
            pendingPhone = phone
            showOtpEntry = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func verifyOtp(code: String) async {
        errorMessage = nil
        do {
            _ = try await api.verifySpinwheelOtp(phone: pendingPhone, code: code)
            showOtpEntry = false
            await loadStatus()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func disconnect() async {
        errorMessage = nil
        do {
            try await api.disconnectSpinwheel()
            isConnected = false
            debts = []
            creditScore = nil
            creditUtilization = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
