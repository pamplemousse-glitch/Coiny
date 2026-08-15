import XCTest
@testable import Coiny

/// Wire tests for the debt endpoints (`backend/src/api/debts.ts`): the exact
/// `serializeDebt` shape decodes, the plan response decodes with findings and
/// the comparison block, and the PATCH bodies encode explicit nulls (absent
/// means "leave it" on the server, null means "clear it").
final class DebtsAPIDecodingTests: XCTestCase {
    private var http: FakeHTTPClient!
    private var store: InMemorySessionStore!
    private let baseURL = URL(string: "https://test.coiny.local")!

    override func setUp() {
        super.setUp()
        http = FakeHTTPClient()
        store = InMemorySessionStore()
    }

    override func tearDown() {
        http = nil
        store = nil
        super.tearDown()
    }

    private func makeAPI() -> API {
        try? store.save("tok-debts")
        return API(baseURL: baseURL, http: http, sessionStore: store)
    }

    private func debtJSON(type: String = "credit_card", status: String = "open") -> String {
        """
        {
          "debtId": "d1",
          "issuer": "Chase Bank",
          "nickname": null,
          "type": "\(type)",
          "sourceIds": ["plaid:acc1", "spinwheel:sw9"],
          "sources": ["plaid", "spinwheel"],
          "balance": 4820.55,
          "apr": null,
          "aprAssumed": true,
          "aprOverride": null,
          "minPayment": 85,
          "creditLimit": 8000,
          "dueDay": 15,
          "statementCloseDay": null,
          "isPromotional": false,
          "promoEndDate": null,
          "promoApr": null,
          "status": "\(status)",
          "payment36": 189.41
        }
        """
    }

    // MARK: - GET /api/debts

    func testDecodesTheDebtsListWithHighAprFeed() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: """
            {"debts": [\(debtJSON())], "highAprDebtBalances": [4820.55]}
            """)

        let response = try await api.getDebts()

        XCTAssertEqual(http.requests.first?.url?.absoluteString, "https://test.coiny.local/api/debts")
        XCTAssertEqual(response.debts.count, 1)
        let debt = try XCTUnwrap(response.debts.first)
        XCTAssertEqual(debt.debtId, "d1")
        XCTAssertEqual(debt.type, .creditCard)
        XCTAssertNil(debt.apr)
        XCTAssertTrue(debt.aprAssumed)
        XCTAssertEqual(debt.payment36, 189.41)
        XCTAssertEqual(debt.sources, ["plaid", "spinwheel"])
        XCTAssertEqual(response.highAprDebtBalances, [4820.55])
    }

    func testNullHighAprFeedDecodesAsNil() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: """
            {"debts": [], "highAprDebtBalances": null}
            """)

        let response = try await api.getDebts()
        XCTAssertNil(response.highAprDebtBalances)
    }

    func testUnknownTypeAndStatusFallBackInsteadOfFailing() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: """
            {"debts": [\(debtJSON(type: "heloc_futuretype", status: "frozen"))], "highAprDebtBalances": null}
            """)

        let response = try await api.getDebts()
        XCTAssertEqual(response.debts.first?.type, .other)
        XCTAssertEqual(response.debts.first?.status, .open)
    }

    // MARK: - GET /api/debts/plan

    private var planJSON: String {
        """
        {
          "strategy": "blend",
          "extraMonthly": 200,
          "months": null,
          "debtFreeDate": null,
          "totalInterest": 2140.5,
          "order": ["d1"],
          "perDebt": [
            {"id": "d1", "order": 1, "payoffMonth": null, "payoffDate": null, "interestPaid": 900.25, "aprAssumed": true}
          ],
          "findings": [
            {"id": "d1", "kind": "never_pays_off", "monthlyInterest": 96.19, "clearingPayment36": 189.41}
          ],
          "comparison": {
            "blend": {"months": null, "debtFreeDate": null, "totalInterest": 2140.5, "order": ["d1"]},
            "avalanche": {"months": null, "debtFreeDate": null, "totalInterest": 1926.5, "order": ["d1"]},
            "snowball": {"months": null, "debtFreeDate": null, "totalInterest": 2946.5, "order": ["d1"]},
            "minimumsOnly": {"months": null, "debtFreeDate": null, "totalInterest": 9999.99, "order": ["d1"]}
          },
          "costVsAvalanche": 214,
          "costVsSnowball": -806
        }
        """
    }

    func testDecodesThePlanWithFindingsAndComparison() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: planJSON)

        let plan = try await api.getDebtPlan(strategy: nil, extra: nil)

        XCTAssertEqual(http.requests.first?.url?.absoluteString, "https://test.coiny.local/api/debts/plan")
        XCTAssertEqual(plan.strategy, .blend)
        XCTAssertNil(plan.months)
        XCTAssertNil(plan.debtFreeDate)
        XCTAssertEqual(plan.findings.count, 1)
        XCTAssertTrue(plan.findings[0].isNeverPaysOff)
        XCTAssertEqual(plan.findings[0].clearingPayment36, 189.41)
        XCTAssertEqual(plan.comparison.avalanche.totalInterest, 1926.5)
        XCTAssertEqual(plan.costVsAvalanche, 214)
        XCTAssertEqual(plan.costVsSnowball, -806)
    }

    func testPlanQueryCarriesStrategyAndExtra() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: planJSON)

        _ = try await api.getDebtPlan(strategy: .snowball, extra: 250)

        XCTAssertEqual(
            http.requests.first?.url?.absoluteString,
            "https://test.coiny.local/api/debts/plan?strategy=snowball&extra=250"
        )
    }

    // MARK: - PATCH bodies

    private func requestBodyJSON() throws -> [String: Any] {
        let body = try XCTUnwrap(http.requests.first?.httpBody)
        let object = try JSONSerialization.jsonObject(with: body)
        return try XCTUnwrap(object as? [String: Any])
    }

    func testClearingTheAprOverrideSendsExplicitNull() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: debtJSON())

        _ = try await api.setDebtAprOverride(id: "d1", apr: nil)

        XCTAssertEqual(http.requests.first?.httpMethod, "PATCH")
        XCTAssertEqual(http.requests.first?.url?.absoluteString, "https://test.coiny.local/api/debts/d1")
        let json = try requestBodyJSON()
        // The key must be present with a JSON null: absent would mean "leave it".
        XCTAssertTrue(json.keys.contains("aprOverride"))
        XCTAssertTrue(json["aprOverride"] is NSNull)
    }

    func testSettingTheAprOverrideSendsTheNumber() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: debtJSON())

        _ = try await api.setDebtAprOverride(id: "d1", apr: 21.99)

        let json = try requestBodyJSON()
        XCTAssertEqual(json["aprOverride"] as? Double, 21.99)
        XCTAssertEqual(json.count, 1, "Only the edited field may be sent")
    }

    func testStatementCloseDayBodyIsScopedToItsField() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: debtJSON())

        _ = try await api.setDebtStatementCloseDay(id: "d1", day: 27)

        let json = try requestBodyJSON()
        XCTAssertEqual(json["statementCloseDay"] as? Int, 27)
        XCTAssertEqual(json.count, 1)
    }

    // MARK: - Merge, split, plan save

    func testMergePostsTheOtherDebtId() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: """
            {"debts": [\(debtJSON())]}
            """)

        let response = try await api.mergeDebts(id: "d1", otherDebtId: "d2")

        XCTAssertEqual(http.requests.first?.url?.absoluteString, "https://test.coiny.local/api/debts/d1/merge")
        let json = try requestBodyJSON()
        XCTAssertEqual(json["otherDebtId"] as? String, "d2")
        // The merge envelope has no highAprDebtBalances key; it must still decode.
        XCTAssertNil(response.highAprDebtBalances)
        XCTAssertEqual(response.debts.count, 1)
    }

    func testSplitPostsToTheSplitRoute() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: """
            {"debts": []}
            """)

        _ = try await api.splitDebt(id: "d1")

        XCTAssertEqual(http.requests.first?.url?.absoluteString, "https://test.coiny.local/api/debts/d1/split")
        XCTAssertEqual(http.requests.first?.httpMethod, "POST")
    }

    func testSavingThePlanPutsStrategyAndExtra() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: """
            {"ok": true, "strategy": "avalanche", "extraMonthly": 150}
            """)

        try await api.saveDebtPlan(strategy: .avalanche, extraMonthly: 150)

        XCTAssertEqual(http.requests.first?.httpMethod, "PUT")
        XCTAssertEqual(http.requests.first?.url?.absoluteString, "https://test.coiny.local/api/debts/plan")
        let json = try requestBodyJSON()
        XCTAssertEqual(json["strategy"] as? String, "avalanche")
        XCTAssertEqual(json["extraMonthly"] as? Double, 150)
    }
}
