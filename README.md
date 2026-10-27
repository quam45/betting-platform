# Betting Platform - Full-Stack Senior Engineering Project

**Stack:** React + TypeScript + Vite | ASP.NET Core 8 LTS | SQL Server | Dapper + Stored Procedures | Docker

**Mode:** Simulated / Virtual Money ONLY - Not a licensed real-money service.

## Architecture: Modular Monolith
```
React (Vite) -> ASP.NET Core API -> Application Services -> Dapper -> SQL Server (SPs + Constraints)
```

## How to Run (Clean Checkout)
1. `docker-compose up -d sqlserver`
2. Create DB `BettingPlatformDb`
3. Run scripts in `database/migrations/` then `stored-procedures/` then `seed/`
4. API: `cd src/Betting.Api && dotnet restore && dotnet run` -> http://localhost:5000/swagger
5. Web: `cd src/betting-web && npm install && npm run dev` -> http://localhost:5173

## Phase Roadmap (10-12 Weeks Full-Time)
0. Design (Done) - ERD, API contract, ADRs
1. Foundation (In Progress) - Solution, Docker, Swagger, HealthChecks
2. Accounts - Identity, JWT + HttpOnly, RBAC
3. Catalogue - Sports/Events/Markets/Odds
4. Wallet - Append-only ledger
5. Single Bets - Atomic + Idempotent PlaceBet
6. Settlement - Idempotent settlement engine
7. Frontend - Full user & admin journeys
8. Hardening - Concurrency, security, observability
9. Deployment - Runbook + Demo

## Critical Rules
- Server decides odds, stake, balance, payout. Never trust client.
- Bet placement is atomic transaction + idempotency key + unique constraint.
- WalletLedger is append-only, DECIMAL(19,4), UTC.
- Odds snapshot stored on BetSelections.

## API Contract v1
See docs/api-conventions.md

## Environment Variables
ConnectionStrings__BettingDb
Jwt__Issuer, Jwt__Audience, Jwt__SigningKey
Frontend__AllowedOrigin=http://localhost:5173