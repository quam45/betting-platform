# API Conventions v1
Base: /api/v1
Format: JSON, UTC ISO-8601, ProblemDetails errors

## Routes
POST /auth/register - public
POST /auth/login - public
GET /sports - public
GET /events?from=&to=&sportId=&page=&pageSize= - public
GET /events/{eventId} - public
GET /wallet - auth
GET /wallet/ledger?page= - auth
POST /bets - auth + Idempotency-Key
GET /bets/{betId} - owner/admin
GET /bets?status=&page= - auth

Admin:
POST /admin/events
PATCH /admin/markets/{marketId}/status
POST /admin/events/{eventId}/result
POST /admin/bets/{betId}/settlement

## Error Format: RFC 9457 ProblemDetails + traceId/correlationId
{
  "type": "https://api.betting.com/errors/idempotency-conflict",
  "title": "Idempotency conflict",
  "status": 409,
  "traceId": "...",
  "errors": {}
}

Status codes: 200,201,202,400,401,403,404,409,422,429,500