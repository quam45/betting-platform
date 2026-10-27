import axios from "axios";

const API = "http://localhost:5000";

export type PlaceBetInput = {
  eventId: string;
  marketId: string;
  selectionId: string;
  stake: number;
  odds: number;
  // Reuse the same key when retrying the same bet: the server returns the original bet instead of charging twice
  idempotencyKey: string;
};

export type PlacedBet = { betId: string; stake: number; status: string; oddsSnapshot: number; placedAtUtc: string };

export async function placeBet(input: PlaceBetInput, token: string): Promise<PlacedBet> {
  const res = await axios.post(`${API}/api/v1/bets`, {
    eventId: input.eventId,
    marketId: input.marketId,
    selectionId: input.selectionId,
    stake: input.stake,
    expectedOdds: input.odds
  }, {
    headers: {
      "Idempotency-Key": input.idempotencyKey,
      Authorization: `Bearer ${token}`
    }
  });
  return res.data;
}
