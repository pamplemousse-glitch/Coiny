import SwiftUI

struct SpinwheelView: View {
    @State private var vm = SpinwheelViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading {
                    ProgressView("Checking status…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if vm.isConnected {
                    connectedContent
                } else if vm.showOtpEntry {
                    OtpEntryView(vm: vm)
                } else {
                    PhoneEntryView(vm: vm)
                }
            }
            .navigationTitle("Debt Tracker")
        }
        .task { await vm.loadStatus() }
    }

    private var connectedContent: some View {
        List {
            Section {
                if vm.debts.isEmpty {
                    Text("No debts found.")
                        .foregroundStyle(CoinyTheme.ink2)
                } else {
                    ForEach(vm.debts) { debt in
                        DebtRow(debt: debt)
                    }
                }
            } header: {
                Text("Your Debts")
            }

            Section {
                Button("Disconnect Spinwheel", role: .destructive) {
                    Task { await vm.disconnect() }
                }
            }
        }
    }
}

private struct PhoneEntryView: View {
    let vm: SpinwheelViewModel
    @State private var phone = ""
    @State private var dob = ""

    var body: some View {
        Form {
            Section {
                TextField("Phone (+1…)", text: $phone)
                    .keyboardType(.phonePad)
                    .textContentType(.telephoneNumber)
                TextField("Date of birth (YYYY-MM-DD)", text: $dob)
                    .keyboardType(.numbersAndPunctuation)
            } header: {
                Text("Connect Spinwheel")
            } footer: {
                Text("We'll send a one-time code to verify your identity.")
            }

            if let error = vm.errorMessage {
                Section {
                    CoinyErrorLine(message: error)
                        .font(.caption)
                }
            }

            Section {
                Button("Send code") {
                    let p = phone; let d = dob
                    Task { await vm.sendOtp(phone: p, dateOfBirth: d) }
                }
                .disabled(phone.isEmpty || dob.isEmpty)
            }
        }
    }
}

private struct OtpEntryView: View {
    let vm: SpinwheelViewModel
    @State private var code = ""

    var body: some View {
        Form {
            Section {
                TextField("6-digit code", text: $code)
                    .keyboardType(.numberPad)
                    .textContentType(.oneTimeCode)
            } header: {
                Text("Enter verification code")
            } footer: {
                Text("Enter the code sent to \(vm.pendingPhone).")
            }

            if let error = vm.errorMessage {
                Section {
                    CoinyErrorLine(message: error)
                        .font(.caption)
                }
            }

            Section {
                Button("Verify") {
                    let c = code
                    Task { await vm.verifyOtp(code: c) }
                }
                .disabled(code.isEmpty)
            }
        }
    }
}

private struct DebtRow: View {
    let debt: SpinwheelDebt

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(debt.debtType?.capitalized ?? "Debt")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                if let balance = debt.balance {
                    Text(balance, format: .currency(code: "USD"))
                        .font(.subheadline)
                        .monospacedDigit()
                }
            }
            if let monthly = debt.monthlyPayment {
                Text("Monthly: \(monthly, format: .currency(code: "USD"))")
                    .font(.caption)
                    .foregroundStyle(CoinyTheme.ink2)
                    .monospacedDigit()
            }
        }
    }
}

#Preview {
    SpinwheelView()
}
