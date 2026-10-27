export default function Home() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Betting Platform (Simulated Money)</h1>
      <p className="mt-2 text-gray-600">Virtual wallet only. No real money.</p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded p-4">Browse Events - TODO</div>
        <div className="border rounded p-4">Bet Slip - TODO</div>
        <div className="border rounded p-4">My Wallet - TODO</div>
      </div>
    </div>
  )
}