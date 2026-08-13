import XCTest
@testable import Coiny

/// Tests for `JourneyStore`: section load states, the R-7.9 goal-limit
/// mapping (a rule with its own copy, never a generic failure), and
/// `GoalDraft` validation.
@MainActor
final class JourneyStoreTests: XCTestCase {

    // MARK: - Fake API

    final class FakeJourneyAPI: JourneyAPI, @unchecked Sendable {
        var goalsResult: Result<GoalsListResponse, Error> = .success(
            GoalsListResponse(goals: [], maxActive: 3)
        )
        var guardrailsResult: Result<GuardrailsResponse, Error> = .success(
            GuardrailsResponse(guardrails: [])
        )
        var createResult: Result<TargetGoal, Error> = .failure(CancellationError())
        var archiveError: Error?
        var skippedCalls: [(Int, RungSkipStatus, RungSkipReason?)] = []

        func getGoals() async throws -> GoalsListResponse { try goalsResult.get() }
        func getGuardrails() async throws -> GuardrailsResponse { try guardrailsResult.get() }
        func createGoal(_ body: GoalCreateBody) async throws -> TargetGoal { try createResult.get() }
        func updateGoal(id: Int, body: GoalPatchBody) async throws -> TargetGoal { try createResult.get() }
        func archiveGoal(id: Int) async throws {
            if let archiveError { throw archiveError }
        }
        func skipLadderRung(
            _ rungId: Int, status: RungSkipStatus, reason: RungSkipReason?
        ) async throws -> LadderSnapshot {
            skippedCalls.append((rungId, status, reason))
            return LadderSnapshot(currentRung: 0, rungs: [:], activeRung: nil, reopened: [])
        }
        func unskipLadderRung(_ rungId: Int) async throws -> LadderSnapshot {
            LadderSnapshot(currentRung: 0, rungs: [:], activeRung: nil, reopened: [])
        }
    }

    private func sampleGoal(id: Int = 1, archivedAt: Date? = nil) -> TargetGoal {
        TargetGoal(
            id: id, name: "Goal \(id)", emoji: nil, kind: .save,
            targetAmountUsd: 1000, targetDate: nil, fundingAccountId: nil,
            countsExistingBalance: true, contributionRule: .recurringDefault,
            recurringAnnual: false, createdAt: Date(timeIntervalSince1970: 0),
            achievedAt: nil, archivedAt: archivedAt, pace: nil
        )
    }

    // MARK: - Loading

    func testLoadPopulatesBothSections() async {
        let api = FakeJourneyAPI()
        api.goalsResult = .success(GoalsListResponse(goals: [sampleGoal()], maxActive: 3))
        let store = JourneyStore(api: api)

        await store.load()

        XCTAssertEqual(store.activeGoals.count, 1)
        XCTAssertEqual(store.guardrails, .loaded([]))
    }

    func testFailedLoadMarksSectionsFailedIndependently() async {
        let api = FakeJourneyAPI()
        api.goalsResult = .failure(CancellationError())
        let store = JourneyStore(api: api)

        await store.load()

        XCTAssertEqual(store.goals, .failed)
        XCTAssertEqual(store.guardrails, .loaded([]))
    }

    func testArchivedGoalsAreExcludedFromActive() async {
        let api = FakeJourneyAPI()
        api.goalsResult = .success(
            GoalsListResponse(goals: [sampleGoal(id: 1), sampleGoal(id: 2, archivedAt: Date())], maxActive: 3)
        )
        let store = JourneyStore(api: api)

        await store.load()

        XCTAssertEqual(store.activeGoals.map(\.id), [1])
    }

    // MARK: - Save outcomes

    private func validDraft() -> GoalDraft {
        var draft = GoalDraft()
        draft.name = "Japan"
        draft.amountText = "4000"
        return draft
    }

    func testSaveMapsTheGoalLimit409ToLimitReached() async {
        let api = FakeJourneyAPI()
        api.createResult = .failure(API.APIError.http(
            status: 409,
            body: #"{"error":"goal_limit_reached","limit":3}"#
        ))
        let store = JourneyStore(api: api)

        let outcome = await store.save(validDraft())

        XCTAssertEqual(outcome, .limitReached)
    }

    func testSaveMapsOther409sToFailedNotLimit() async {
        let api = FakeJourneyAPI()
        api.createResult = .failure(API.APIError.http(status: 409, body: #"{"error":"something_else"}"#))
        let store = JourneyStore(api: api)

        let outcome = await store.save(validDraft())
        XCTAssertEqual(outcome, .failed)
    }

    func testSaveSucceedsAndReloadsGoals() async {
        let api = FakeJourneyAPI()
        api.createResult = .success(sampleGoal())
        api.goalsResult = .success(GoalsListResponse(goals: [sampleGoal()], maxActive: 3))
        let store = JourneyStore(api: api)

        let outcome = await store.save(validDraft())

        XCTAssertEqual(outcome, .saved)
        XCTAssertEqual(store.activeGoals.count, 1)
    }

    func testInvalidDraftNeverReachesTheNetwork() async {
        let api = FakeJourneyAPI()
        let store = JourneyStore(api: api)

        let outcome = await store.save(GoalDraft())
        XCTAssertEqual(outcome, .failed)
    }

    // MARK: - Skips

    func testSkipForwardsTheReasonToken() async {
        let api = FakeJourneyAPI()
        let store = JourneyStore(api: api)

        let snapshot = await store.skipRung(4, status: .skipped, reason: .notNow)

        XCTAssertNotNil(snapshot)
        XCTAssertEqual(api.skippedCalls.count, 1)
        XCTAssertEqual(api.skippedCalls.first?.0, 4)
        XCTAssertEqual(api.skippedCalls.first?.2, .notNow)
    }

    // MARK: - GoalDraft validation

    func testDraftRequiresNameAndPositiveAmount() {
        var draft = GoalDraft()
        XCTAssertFalse(draft.isValid)
        draft.name = "Japan"
        draft.amountText = "0"
        XCTAssertFalse(draft.isValid)
        draft.amountText = "-5"
        XCTAssertFalse(draft.isValid)
        draft.amountText = "4,000"
        XCTAssertTrue(draft.isValid)
        XCTAssertEqual(draft.amount, 4000)
    }

    func testRecurringAnnualRequiresADate() {
        var draft = validDraft()
        draft.recurringAnnual = true
        XCTAssertFalse(draft.isValid, "A sinking fund without a date is meaningless (R-7.7)")
        draft.hasTargetDate = true
        XCTAssertTrue(draft.isValid)
    }

    func testDraftRoundTripsAGoal() {
        let goal = TargetGoal(
            id: 9, name: "Van", emoji: "🚐", kind: .purchase,
            targetAmountUsd: 12_500.5, targetDate: "2027-06-01", fundingAccountId: nil,
            countsExistingBalance: false, contributionRule: .recurringDefault,
            recurringAnnual: true, createdAt: Date(timeIntervalSince1970: 0),
            achievedAt: nil, archivedAt: nil, pace: nil
        )
        let draft = GoalDraft(goal: goal)
        XCTAssertEqual(draft.id, 9)
        XCTAssertEqual(draft.kind, .purchase)
        XCTAssertEqual(draft.amount, 12_500.5)
        XCTAssertTrue(draft.hasTargetDate)
        XCTAssertEqual(draft.targetDateString, "2027-06-01")
        XCTAssertFalse(draft.countsExistingBalance)
        XCTAssertTrue(draft.recurringAnnual)
    }
}
