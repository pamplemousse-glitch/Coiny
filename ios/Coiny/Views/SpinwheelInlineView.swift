import SwiftUI

// MARK: - Spinwheel inline views (extracted from NetWorthView for file-length compliance)

struct SpinwheelInlineView: View {
    let vm: SpinwheelViewModel

    var body: some View {
        if vm.isLoading {
            ProgressView("Checking status…")
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
        } else if vm.isConnected {
            connectedContent
        } else if vm.showOtpEntry {
            OtpInlineView(vm: vm)
        } else {
            PhoneInlineView(vm: vm)
        }
    }

    @ViewBuilder
    private var connectedContent: some View {
        if vm.debts.isEmpty {
            Text("No debts found")
                .font(.caption)
                .foregroundStyle(CoinyTheme.ink2)
                .padding(.top, 4)
        } else {
            ForEach(vm.debts) { debt in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(debt.debtType?.capitalized ?? "Debt").font(.subheadline)
                        if let monthly = debt.monthlyPayment {
                            Text("\(monthly, format: .currency(code: "USD"))/mo")
                                .font(.caption).foregroundStyle(CoinyTheme.ink2)
                        }
                    }
                    Spacer()
                    if let balance = debt.balance {
                        // A debt is a fact, in ink with its sign, never red
                        // (design-direction 4.3 rule 5).
                        Text(-balance, format: .currency(code: "USD"))
                            .font(.subheadline.monospacedDigit())
                            .foregroundStyle(CoinyTheme.ink)
                    }
                }
                .padding(.vertical, 2)
            }
        }
        Button("Disconnect Spinwheel", role: .destructive) {
            Task { await vm.disconnect() }
        }
        .font(.caption)
        .padding(.top, 4)
    }
}

struct PhoneInlineView: View {
    let vm: SpinwheelViewModel
    @State private var phone = ""
    @State private var dob = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Connect debt tracker")
                .font(.subheadline.weight(.semibold))
            TextField("Phone (+1…)", text: $phone)
                .keyboardType(.phonePad)
                .textContentType(.telephoneNumber)
                .textFieldStyle(.roundedBorder)
            TextField("Date of birth (YYYY-MM-DD)", text: $dob)
                .keyboardType(.numbersAndPunctuation)
                .textFieldStyle(.roundedBorder)
            if let error = vm.errorMessage {
                CoinyErrorLine(message: error)
            }
            Button("Send code") {
                let p = phone; let d = dob
                Task { await vm.sendOtp(phone: p, dateOfBirth: d) }
            }
            .buttonStyle(.coinyFilledInline)
            .disabled(phone.isEmpty || dob.isEmpty)
        }
        .padding(.top, 4)
    }
}

struct OtpInlineView: View {
    let vm: SpinwheelViewModel
    @State private var code = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Enter the code sent to \(vm.pendingPhone)")
                .font(.subheadline)
                .foregroundStyle(CoinyTheme.ink2)
            TextField("6-digit code", text: $code)
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .textFieldStyle(.roundedBorder)
            if let error = vm.errorMessage {
                CoinyErrorLine(message: error)
            }
            Button("Verify") {
                let c = code
                Task { await vm.verifyOtp(code: c) }
            }
            .buttonStyle(.coinyFilledInline)
            .disabled(code.isEmpty)
        }
        .padding(.top, 4)
    }
}
