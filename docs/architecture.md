# Architecture Decision Records

## ADR-001: Modular Monolith over Microservices
- Decision: One deployable API with clear module boundaries.
- Reason: Easier transactions for wallet+bet atomicity, simpler deployment for portfolio, can split later.

## ADR-002: Dapper + Stored Procedures
- Decision: Use Dapper for explicit SQL, critical operations in SPs.
- Reason: Transparent SQL, control over locking, interview demonstration of transaction safety.

## ADR-003: DECIMAL(19,4) for Money
- Never use float/real for financial values. All money DECIMAL(19,4), UTC timestamps.

## ADR-004: Idempotency
- Idempotency-Key header required for POST /bets. Stored with UserId + hash, unique constraint, returns original result on retry.

## Entity Relationship Summary
Users 1--* Wallets 1--* WalletLedgerEntries
Sports 1--* Competitions 1--* Events 1--* Markets 1--* Selections 1--* OddsHistory
Users 1--* Bets 1--* BetSelections (snapshot odds)
Bets 1--* SettlementRecords (unique per bet)
Events 1--1 EventResults
AuditLogs (Actor, Action, EntityType, EntityId, CorrelationId)

## Critical Flow: PlaceBet
Client -> Idempotency-Key + selections + stake
-> Auth + Validation -> BEGIN TRAN -> Check/Claim Idempotency Key (unique constraint)
-> Validate Event/Market/Selection status not suspended
-> Check odds-change policy
-> Lock wallet via UPDATE with concurrency token / sp_getapplock pattern
-> INSERT Bet + BetSelections (with OddsAtPlacement)
-> INSERT Ledger DEBIT
-> COMMIT -> Return ticket