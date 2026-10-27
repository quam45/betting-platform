import { useState } from "react";

type Bet = { betId: string; stake: number; oddsSnapshot: number; status: string; payout?: number };

export default function MyBets() {
  const [bets] = useState<Bet[]>([
    { betId: "312496C9-5C84-41F0-9CF2-90C49A7836F2", stake: 100, oddsSnapshot: 2.1, status: "Won", payout: 210 },
    { betId: "8A454497-AA12-440D-84BA-F7833643E3A8", stake: 100, oddsSnapshot: 2.1, status: "Pending" }
  ]);
  const wallet = 10010;

  const badge = (s: string) => {
    if (s === "Won") return "bg-green-600 text-white";
    if (s === "Lost") return "bg-red-600 text-white";
    return "bg-yellow-500 text-black";
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">My Bets</h1>
        <div className="bg-black text-white px-4 py-2 rounded">Wallet: ${wallet.toFixed(2)} USD</div>
      </div>
      <div className="grid gap-3">
        {bets.map(b => (
          <div key={b.betId} className="border p-4 rounded flex justify-between items-center">
            <div>
              <div className="font-mono text-sm">{b.betId.slice(0,8)}...</div>
              <div>{b.stake} @ {b.oddsSnapshot} → Pot. Return: {b.stake * b.oddsSnapshot}</div>
            </div>
            <span className={`px-3 py-1 rounded text-sm ${badge(b.status)}`}>{b.status} {b.payout ? `+${b.payout}` : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}