import { useState } from "react";
import axios from "axios";

export default function AdminSettleModal({ betId, onSettled }: { betId: string, onSettled: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const settle = async (result: "Won" | "Lost" | "Void") => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`http://localhost:5000/api/v1/admin/bets/${betId}/settle`,
        { result },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOpen(false);
      onSettled();
    } catch (e: any) {
      alert(e.response?.data?.error || e.response?.data?.message || "Settle failed - maybe already settled or not admin");
    } finally { setLoading(false); }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs bg-zinc-800 px-2 py-1 rounded">Settle</button>
      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700 w-80">
            <h3 className="font-bold mb-4">Settle {betId.slice(0, 8)}...</h3>
            <div className="grid grid-cols-3 gap-2">
              <button disabled={loading} onClick={() => settle("Won")} className="bg-green-600 py-2 rounded">Won</button>
              <button disabled={loading} onClick={() => settle("Lost")} className="bg-red-600 py-2 rounded">Lost</button>
              <button disabled={loading} onClick={() => settle("Void")} className="bg-zinc-600 py-2 rounded">Void</button>
            </div>
            <button onClick={() => setOpen(false)} className="mt-4 w-full text-sm opacity-60">Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}