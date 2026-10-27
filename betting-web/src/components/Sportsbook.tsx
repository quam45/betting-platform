import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import AdminSettleModal from "./AdminSettleModal";
import { placeBet } from "../api/betsApi";

const API = "http://localhost:5000";
const BRAND = { first: "SPORTY", second: "BET" };
const MAX_SELECTIONS = 30;
const QUICK_STAKES = [100, 500, 1000, 5000];
const OUTCOMES = [
  { key: "1", market: "Home Win" },
  { key: "X", market: "Draw" },
  { key: "2", market: "Away Win" }
] as const;
const FLAGS: Record<string, string> = {
  England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", Germany: "🇩🇪", Europe: "🇪🇺", Spain: "🇪🇸", France: "🇫🇷", Nigeria: "🇳🇬", Italy: "🇮🇹"
};

type Selection = { selectionId: string; name: string; decimalOdds: number; status: string };
type Market = { marketId: string; name: string; status: string; selections: Selection[] };
type BettingEvent = {
  eventId: string; name: string; homeTeam: string; awayTeam: string; sportName: string;
  competitionName: string; country: string; startsAtUtc: string; status: string; markets: Market[];
};
type SlipItem = { event: BettingEvent; market: Market; selection: Selection; outcome: string; idempotencyKey: string };
type Bet = { betId: string; eventName: string; selectionName: string; stake: number; oddsSnapshot: number; status: string; payoutAmount: number | null };
type Wallet = { balance: number; currency: string };

function normalizeBet(row: Record<string, unknown>): Bet {
  return {
    betId: String(row.betId ?? row.BetId ?? ""),
    eventName: String(row.eventName ?? row.EventName ?? ""),
    selectionName: String(row.selectionName ?? row.SelectionName ?? ""),
    stake: Number(row.stake ?? row.Stake ?? 0),
    oddsSnapshot: Number(row.oddsSnapshot ?? row.OddsSnapshot ?? 0),
    status: String(row.status ?? row.Status ?? "Unknown"),
    payoutAmount: row.payoutAmount == null && row.PayoutAmount == null ? null : Number(row.payoutAmount ?? row.PayoutAmount)
  };
}

// Older API builds don't send team/competition fields; fall back so grouping and list keys stay unique
function normalizeEvent(e: BettingEvent): BettingEvent {
  const [home = e.name, away = ""] = (e.name ?? "").split(" vs ");
  return {
    ...e,
    homeTeam: e.homeTeam ?? home,
    awayTeam: e.awayTeam ?? away,
    country: e.country ?? "Other",
    competitionName: e.competitionName ?? "Other"
  };
}

function kickoff(iso: string) {
  const date = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return `Today ${time}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow ${time}`;
  return `${date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })} ${time}`;
}

function outcomeSelection(event: BettingEvent, marketName: string) {
  const market = event.markets.find(m => m.name === marketName);
  const selection = market?.selections[0];
  return market && selection ? { market, selection } : null;
}

const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Logo({ size = "text-[22px]" }: { size?: string }) {
  return (
    <span className={`font-black tracking-tight leading-none ${size}`}>
      <span className="text-[#00a826]">{BRAND.first}</span><span className="text-black">{BRAND.second}</span>
    </span>
  );
}

export default function Sportsbook() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [role, setRole] = useState(() => localStorage.getItem("role") ?? "User");
  const [events, setEvents] = useState<BettingEvent[]>([]);
  const [eventsError, setEventsError] = useState("");
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [country, setCountry] = useState<string | null>(null);
  const [league, setLeague] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ England: true, Germany: true, Spain: true });
  const [search, setSearch] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [slip, setSlip] = useState<SlipItem[]>([]);
  const [stake, setStake] = useState(1000);
  const [placing, setPlacing] = useState(false);
  const [slipMessage, setSlipMessage] = useState("");
  const [panelTab, setPanelTab] = useState<"slip" | "bets">("slip");
  const [mobileSlipOpen, setMobileSlipOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/v1/events`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((rows: BettingEvent[]) => setEvents(rows.map(normalizeEvent)))
      .catch(() => setEventsError("Could not load events. Check that the API is running on localhost:5000."))
      .finally(() => setLoadingEvents(false));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setToken(null);
    setRole("User");
    setWallet(null);
    setBets([]);
  }, []);

  const loadAccount = useCallback(async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [walletResponse, betsResponse] = await Promise.all([
        axios.get(`${API}/api/v1/wallet`, { headers }),
        axios.get(`${API}/api/v1/bets?page=1&pageSize=50`, { headers })
      ]);
      setWallet({ balance: Number(walletResponse.data.balance ?? 0), currency: walletResponse.data.currency ?? "" });
      const rows = betsResponse.data.items ?? betsResponse.data;
      setBets(Array.isArray(rows) ? rows.map(normalizeBet) : []);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) logout();
    }
  }, [token, logout]);

  useEffect(() => { void loadAccount(); }, [loadAccount]);

  const visibleEvents = useMemo(() => {
    let list = showClosed ? events : events.filter(e => e.status === "Open");
    if (country) list = list.filter(e => e.country === country);
    if (league) list = list.filter(e => e.competitionName === league);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(e => [e.homeTeam, e.awayTeam, e.competitionName, e.country].some(v => v?.toLowerCase().includes(q)));
    return list;
  }, [events, showClosed, country, league, search]);

  const countries = useMemo(() => {
    const base = showClosed ? events : events.filter(e => e.status === "Open");
    const map = new Map<string, Map<string, number>>();
    base.forEach(e => {
      const leagues = map.get(e.country) ?? new Map<string, number>();
      leagues.set(e.competitionName, (leagues.get(e.competitionName) ?? 0) + 1);
      map.set(e.country, leagues);
    });
    return [...map.entries()].map(([name, leagues]) => ({
      name,
      count: [...leagues.values()].reduce((a, b) => a + b, 0),
      leagues: [...leagues.entries()].map(([leagueName, count]) => ({ name: leagueName, count }))
    }));
  }, [events, showClosed]);

  const totalCount = countries.reduce((sum, c) => sum + c.count, 0);

  const grouped = useMemo(() => {
    const groups = new Map<string, BettingEvent[]>();
    visibleEvents.forEach(e => {
      const key = `${e.country} - ${e.competitionName}`;
      groups.set(key, [...(groups.get(key) ?? []), e]);
    });
    return [...groups.entries()];
  }, [visibleEvents]);

  const totalStake = stake * slip.length;
  const potentialWin = slip.reduce((sum, item) => sum + stake * item.selection.decimalOdds, 0);

  function toggleSelection(event: BettingEvent, outcome: string, marketName: string) {
    const pick = outcomeSelection(event, marketName);
    if (!pick) return;
    setSlipMessage("");
    setSlip(current => {
      const same = current.findIndex(s => s.selection.selectionId === pick.selection.selectionId);
      if (same >= 0) return current.filter((_, i) => i !== same);
      const withoutEvent = current.filter(s => s.event.eventId !== event.eventId);
      if (withoutEvent.length >= MAX_SELECTIONS) return current;
      return [...withoutEvent, { event, market: pick.market, selection: pick.selection, outcome, idempotencyKey: crypto.randomUUID() }];
    });
  }

  const isSelected = (selectionId?: string) => !!selectionId && slip.some(s => s.selection.selectionId === selectionId);

  function chooseCountry(name: string | null) {
    setCountry(current => (current === name ? null : name));
    setLeague(null);
    if (name) setExpanded(current => ({ ...current, [name]: true }));
  }

  async function placeBets() {
    if (!token) { setLoginOpen(true); return; }
    if (slip.length === 0 || !(stake > 0)) return;
    setPlacing(true);
    setSlipMessage("");
    const failed: SlipItem[] = [];
    const errors: string[] = [];
    for (const item of slip) {
      try {
        await placeBet({
          eventId: item.event.eventId,
          marketId: item.market.marketId,
          selectionId: item.selection.selectionId,
          stake,
          odds: item.selection.decimalOdds,
          idempotencyKey: item.idempotencyKey
        }, token);
      } catch (error) {
        failed.push(item);
        const reason = axios.isAxiosError(error) ? error.response?.data?.error ?? "request failed" : "request failed";
        errors.push(`${item.event.homeTeam} vs ${item.event.awayTeam}: ${reason}`);
      }
    }
    const placed = slip.length - failed.length;
    setSlip(failed);
    setSlipMessage(errors.length
      ? `${placed} placed, ${failed.length} failed. ${errors.join("; ")}`
      : `${placed} bet${placed === 1 ? "" : "s"} placed.`);
    setPlacing(false);
    void loadAccount();
  }

  const sidebar = (
    <>
      <div className="px-4 pt-5 pb-4 border-b border-[#e5e7eb]">
        <div className="flex items-center justify-between">
          <Logo />
          {token
            ? <button type="button" onClick={logout} className="text-[11px] font-semibold text-[#6b7280] hover:text-black px-2 py-1 rounded hover:bg-[#f3f4f6]">Log out</button>
            : <button type="button" onClick={() => setLoginOpen(true)} className="text-[11px] font-semibold bg-[#00a826] text-white px-2.5 py-1 rounded hover:bg-[#009423]">Log in</button>}
        </div>
        {token && wallet && <div className="mt-3 text-[12px] text-[#374151]">Balance: <b>{wallet.currency} {money(wallet.balance)}</b>{role === "Admin" && <span className="ml-2 text-[10px] font-bold bg-black text-white px-1.5 py-0.5 rounded">ADMIN</span>}</div>}
      </div>
      <div className="px-3 py-3">
        <div className="text-[11px] font-bold tracking-widest text-[#9ca3af] mb-2 px-1">ALL SPORTS</div>
        <div className="relative mb-3">
          <span className="absolute left-2.5 top-2 text-[#9ca3af]">⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teams, leagues..." className="w-full h-9 pl-7 pr-3 rounded bg-[#f5f5f7] border border-[#e5e7eb] text-[12px] outline-none focus:border-[#00a826] placeholder:text-[#9ca3af]" />
        </div>
        <button type="button" onClick={() => { setCountry(null); setLeague(null); setMobileMenuOpen(false); }} className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-[12px] font-semibold mb-1 transition ${country === null ? "bg-[#e8f5e9] text-[#00a826] border border-[#a5d6a7]" : "bg-white text-[#111827] hover:bg-[#f5f5f7] border border-transparent"}`}>
          <span className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-[#f3f4f6] flex items-center justify-center text-[11px]">⚽</span> All Football</span>
          <span className={`text-[11px] px-1.5 py-0.5 rounded ${country === null ? "bg-[#00a826] text-white" : "bg-[#f3f4f6] text-[#6b7280]"}`}>({totalCount})</span>
        </button>
        <div className="mt-1 space-y-0.5">
          {countries.map(c => {
            const active = country === c.name;
            const open = expanded[c.name];
            return (
              <div key={c.name} className="rounded">
                <div className={`w-full flex items-center justify-between rounded text-[12px] font-medium transition ${active ? "bg-[#e8f5e9] text-[#0a7a1f] border border-[#a5d6a7]" : "hover:bg-[#f9fafb] text-[#374151] border border-transparent"}`}>
                  <button type="button" onClick={() => { chooseCountry(c.name); setMobileMenuOpen(false); }} className="flex-1 flex items-center gap-2 px-2.5 py-2 text-left">
                    <span className="text-[14px]">{FLAGS[c.name] ?? "🏳️"}</span>
                    <span>{c.name}</span>
                    <span className="text-[11px] text-[#9ca3af]">({c.count})</span>
                  </button>
                  <button type="button" aria-label={open ? `Collapse ${c.name}` : `Expand ${c.name}`} onClick={() => setExpanded(cur => ({ ...cur, [c.name]: !cur[c.name] }))} className="w-7 h-7 flex items-center justify-center text-[#9ca3af]">
                    <span className={`inline-block transition-transform text-[10px] ${open ? "rotate-90" : ""}`}>▶</span>
                  </button>
                </div>
                {open && <div className="ml-7 mt-0.5 mb-1 border-l border-[#e5e7eb] pl-2 space-y-0.5">
                  {c.leagues.map(l => (
                    <button type="button" key={l.name} onClick={() => { setCountry(c.name); setLeague(l.name); setMobileMenuOpen(false); }} className={`w-full text-left flex items-center justify-between px-2 py-1.5 rounded text-[11px] ${league === l.name ? "bg-[#f0fdf4] text-[#00a826] font-semibold" : "text-[#6b7280] hover:bg-[#f3f4f6]"}`}>
                      <span>{l.name}</span>
                      <span className="text-[10px] bg-[#f3f4f6] px-1.5 rounded">({l.count})</span>
                    </button>
                  ))}
                </div>}
              </div>
            );
          })}
        </div>
        <label className="mt-4 flex items-center gap-2 px-1 text-[11px] text-[#6b7280]">
          <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} />
          Show closed events
        </label>
      </div>
    </>
  );

  const betPanel = (
    <>
      <div className="px-4 py-3 border-b border-[#e5e7eb] flex items-center justify-between">
        <div className="flex bg-[#f3f4f6] rounded p-1 gap-1">
          <button type="button" onClick={() => setPanelTab("slip")} className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wide ${panelTab === "slip" ? "bg-black text-white" : "text-[#6b7280]"}`}>
            BETSLIP <span className="ml-1 bg-[#00a826] text-white text-[10px] px-1.5 py-0.5 rounded">{slip.length}</span>
          </button>
          <button type="button" onClick={() => setPanelTab("bets")} className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wide ${panelTab === "bets" ? "bg-black text-white" : "text-[#6b7280]"}`}>MY BETS</button>
        </div>
        {panelTab === "slip" && <button type="button" onClick={() => { setSlip([]); setSlipMessage(""); }} className="text-[11px] text-[#6b7280] hover:text-black px-2 py-1 rounded hover:bg-[#f3f4f6]">Clear</button>}
      </div>

      {panelTab === "bets" ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!token && <p className="text-[12px] text-[#6b7280]">Log in to see your bets.</p>}
          {token && bets.length === 0 && <p className="text-[12px] text-[#6b7280]">No bets yet.</p>}
          {bets.map(b => (
            <div key={b.betId} className="rounded border border-[#e5e7eb] bg-[#f9fafb] p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="text-[11px] leading-tight">
                  <div className="font-semibold text-[#111827]">{b.eventName || b.betId.slice(0, 8)}</div>
                  <div className="text-[10px] text-[#6b7280] mt-0.5">{b.selectionName} @ {b.oddsSnapshot.toFixed(2)} • Stake {money(b.stake)}</div>
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded ${b.status === "Won" ? "bg-[#00a826] text-white" : b.status === "Lost" ? "bg-red-500 text-white" : "bg-[#e5e7eb] text-[#374151]"}`}>
                  {b.status}{b.payoutAmount ? ` +${money(b.payoutAmount)}` : ""}
                </span>
              </div>
              {role === "Admin" && b.status === "Pending" && <div className="mt-2"><AdminSettleModal betId={b.betId} onSettled={() => void loadAccount()} /></div>}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto">
            {slip.length === 0 ? (
              <div className="p-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-[#f3f4f6] flex items-center justify-center mb-3 text-[22px]">🎫</div>
                <div className="text-[13px] font-semibold">No bets selected</div>
                <div className="text-[11px] text-[#6b7280] leading-snug mt-1.5 max-w-[220px]">Click any odds in the center panel to add them to your betslip.</div>
                <div className="mt-4 w-full rounded bg-[#f9fafb] border border-[#e5e7eb] p-2.5 text-left">
                  <div className="text-[10px] font-bold tracking-widest text-[#9ca3af]">BET RULES</div>
                  <div className="text-[11px] text-[#374151] mt-1 space-y-1">
                    <div>• Max {MAX_SELECTIONS} selections</div>
                    <div>• Each selection is placed as a single bet</div>
                    <div>• One selection per match</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {slip.map(item => (
                  <div key={item.selection.selectionId} className="rounded border border-[#e5e7eb] bg-[#f9fafb] p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[11px] leading-tight">
                        <div className="font-semibold text-[#111827]">{item.event.homeTeam} vs {item.event.awayTeam}</div>
                        <div className="text-[10px] text-[#6b7280] mt-0.5">{item.event.country} • {item.event.competitionName}</div>
                      </div>
                      <button type="button" aria-label="Remove selection" onClick={() => setSlip(cur => cur.filter(s => s !== item))} className="w-5 h-5 rounded bg-white border border-[#e5e7eb] flex items-center justify-center text-[12px] hover:bg-red-50">×</button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] font-bold bg-black text-white px-2 py-0.5 rounded">{item.outcome} • {item.market.name}</span>
                      <span className="text-[12px] font-bold text-[#00a826]">{item.selection.decimalOdds.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-[#e5e7eb] bg-white p-3 space-y-3">
            <div>
              <div className="flex justify-between items-center text-[11px] mb-1.5">
                <span className="font-semibold">STAKE PER BET{wallet ? ` (${wallet.currency})` : ""}</span>
                {wallet && <span className="text-[#9ca3af] text-[10px]">Balance: {money(wallet.balance)}</span>}
              </div>
              <input type="number" min={1} value={stake} onChange={e => setStake(Number(e.target.value) || 0)} className="w-full h-9 px-3 rounded border border-[#e5e7eb] bg-[#f9fafb] text-[13px] font-semibold outline-none focus:border-[#00a826]" />
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {QUICK_STAKES.map(q => (
                  <button type="button" key={q} onClick={() => setStake(q)} className={`h-7 rounded border text-[11px] font-semibold ${stake === q ? "bg-black text-white border-black" : "bg-white border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]"}`}>{q}</button>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#6b7280]">Total stake ({slip.length} bet{slip.length === 1 ? "" : "s"})</span>
              <span className="font-bold text-[13px]">{money(totalStake)}</span>
            </div>
            <div className="flex justify-between items-center bg-[#f3f4f6] rounded px-2.5 py-2">
              <span className="text-[11px] text-[#6b7280]">POTENTIAL WIN</span>
              <span className="font-black text-[14px] text-[#00a826]">{money(potentialWin)}</span>
            </div>
            <button type="button" disabled={slip.length === 0 || placing || !(stake > 0)} onClick={placeBets} className={`w-full h-10 rounded font-bold text-[13px] tracking-wide transition ${slip.length === 0 || !(stake > 0) ? "bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed" : "bg-[#00a826] text-white hover:bg-[#009423] shadow"}`}>
              {placing ? "Placing..." : token ? "Place bet" : "Log in to place bet"}
            </button>
            {slipMessage && <p role="status" className="text-[11px] text-[#374151]">{slipMessage}</p>}
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#111827] antialiased" style={{ fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-[#e5e7eb] flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Open menu" onClick={() => setMobileMenuOpen(true)} className="p-1.5 rounded bg-[#f3f4f6]">
            <div className="w-5 h-0.5 bg-black mb-1" /><div className="w-5 h-0.5 bg-black mb-1" /><div className="w-5 h-0.5 bg-black" />
          </button>
          <Logo size="text-[18px]" />
        </div>
        <button type="button" onClick={() => setMobileSlipOpen(true)} className="bg-black text-white text-[12px] font-semibold px-3 py-1.5 rounded">
          BETSLIP <span className="ml-1 bg-[#00a826] text-[10px] px-1.5 py-0.5 rounded">{slip.length}</span>
        </button>
      </div>

      <div className="mx-auto max-w-[1440px] flex flex-col lg:flex-row items-stretch">
        <aside className="hidden lg:flex flex-col w-[250px] shrink-0 bg-white border-r border-[#e5e7eb] sticky top-0 h-[100vh] overflow-y-auto">
          {sidebar}
        </aside>

        <main className="flex-1 min-w-0 bg-white border-r border-[#e5e7eb] flex flex-col">
          <div className="sticky top-0 z-20 bg-white border-b border-[#e5e7eb] px-3 lg:px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-black text-white text-[11px] font-bold px-2.5 py-1 rounded-full tracking-wide">
                <span className="w-1.5 h-1.5 bg-[#00a826] rounded-full" /> FOOTBALL
              </span>
              <span className="text-[12px] text-[#6b7280]">{visibleEvents.length} matches</span>
              {league && <span className="text-[12px] text-[#6b7280]">• {league}</span>}
            </div>
            <span className="px-3 py-1.5 rounded text-[11px] font-semibold bg-black text-white">1X2</span>
          </div>

          <div className="bg-[#f9fafb] border-b border-[#e5e7eb] px-3 lg:px-4 py-2 flex items-center text-[10px] font-bold tracking-widest text-[#9ca3af]">
            <div className="flex-1">MATCH</div>
            <div className="hidden sm:flex gap-1.5 w-[234px]">
              {OUTCOMES.map(o => <span key={o.key} className="flex-1 text-center">{o.key}</span>)}
            </div>
          </div>

          <div className="flex-1 bg-white">
            {loadingEvents && <div className="p-10 text-center text-[13px] text-[#6b7280]">Loading matches...</div>}
            {eventsError && <div role="alert" className="p-10 text-center text-[13px] text-red-600">{eventsError}</div>}
            {!loadingEvents && !eventsError && grouped.length === 0 && (
              <div className="p-10 text-center text-[13px] text-[#6b7280]">{search ? `No matches found for "${search}"` : "No matches available."}</div>
            )}
            {grouped.map(([group, groupEvents]) => {
              const [groupCountry] = group.split(" - ");
              return (
                <div key={group} className="border-b border-[#e5e7eb]">
                  <div className="bg-[#f5f5f7] px-3 lg:px-4 py-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white border border-[#e5e7eb] flex items-center justify-center text-[12px]">{FLAGS[groupCountry] ?? "🏳️"}</span>
                    <span className="text-[11px] font-bold tracking-wide">{group.toUpperCase()}</span>
                    <span className="ml-auto text-[10px] text-[#9ca3af]">{groupEvents.length} games</span>
                  </div>
                  {groupEvents.map(ev => {
                    const open = ev.status === "Open";
                    return (
                      <div key={ev.eventId} className="flex flex-col sm:flex-row sm:items-center px-3 lg:px-4 py-2.5 border-t border-[#f3f4f6] hover:bg-[#fcfcfd] transition">
                        <div className="flex-1 min-w-0 flex items-start gap-3">
                          <div className="text-[11px] leading-tight min-w-[74px]">
                            <div className="text-[#6b7280]">{kickoff(ev.startsAtUtc)}</div>
                            {!open && <div className="text-[10px] text-red-500 font-semibold mt-0.5">{ev.status}</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] font-semibold truncate">{ev.homeTeam}</span>
                              <span className="text-[9px] font-bold bg-[#e8f5e9] text-[#00a826] px-1 py-0.5 rounded">HOME</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[12px] font-medium text-[#374151] truncate">{ev.awayTeam}</span>
                              <span className="text-[9px] font-bold bg-[#f3f4f6] text-[#6b7280] px-1 py-0.5 rounded">AWAY</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-0 flex gap-1.5 sm:w-[234px]">
                          {OUTCOMES.map(o => {
                            const pick = outcomeSelection(ev, o.market);
                            const selected = isSelected(pick?.selection.selectionId);
                            const disabled = !open || !pick || pick.market.status !== "Open";
                            return (
                              <button
                                type="button"
                                key={o.key}
                                disabled={disabled}
                                aria-label={`${ev.homeTeam} vs ${ev.awayTeam}: ${o.market}`}
                                onClick={() => toggleSelection(ev, o.key, o.market)}
                                className={`flex-1 h-[36px] rounded text-[13px] font-semibold border transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${selected ? "bg-[#00a826] text-white border-[#00a826] shadow" : "bg-[#f3f4f6] text-[#111827] border-[#e5e7eb] hover:bg-[#e5e7eb] hover:border-[#d1d5db]"}`}
                              >
                                {pick ? pick.selection.decimalOdds.toFixed(2) : "-"}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {!loadingEvents && !eventsError && (
              <div className="p-3 text-center">
                <span className="inline-flex items-center gap-2 text-[11px] text-[#9ca3af] bg-[#f9fafb] border border-[#e5e7eb] rounded-full px-3 py-1.5">
                  Showing {visibleEvents.length} of {totalCount} matches
                </span>
              </div>
            )}
          </div>
        </main>

        <aside className="hidden lg:flex w-[300px] shrink-0 bg-white flex-col sticky top-0 h-[100vh]">
          {betPanel}
        </aside>
      </div>

      {mobileSlipOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSlipOpen(false)} />
          <div className="relative w-[86%] max-w-[340px] bg-white h-full flex flex-col shadow-2xl">
            <button type="button" aria-label="Close betslip" onClick={() => setMobileSlipOpen(false)} className="absolute right-2 top-2 z-10 w-7 h-7 rounded bg-[#f3f4f6]">×</button>
            {betPanel}
          </div>
        </div>
      )}

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-[280px] bg-white h-full overflow-y-auto shadow-xl">
            <button type="button" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} className="absolute right-2 top-2 z-10 w-7 h-7 rounded bg-[#f3f4f6]">×</button>
            {sidebar}
          </div>
        </div>
      )}

      {!mobileSlipOpen && (
        <button type="button" onClick={() => setMobileSlipOpen(true)} className="lg:hidden fixed bottom-4 right-4 z-30 bg-black text-white rounded-full px-4 py-3 shadow-lg flex items-center gap-2 text-[12px] font-bold">
          Betslip <span className="bg-[#00a826] rounded-full w-5 h-5 flex items-center justify-center text-[11px]">{slip.length}</span>
        </button>
      )}

      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} onLoggedIn={(newToken, newRole) => {
        localStorage.setItem("token", newToken);
        localStorage.setItem("role", newRole);
        setToken(newToken);
        setRole(newRole);
        setLoginOpen(false);
      }} />}
    </div>
  );
}

function LoginModal({ onClose, onLoggedIn }: { onClose: () => void; onLoggedIn: (token: string, role: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        className="relative w-full max-w-[340px] bg-white rounded p-6 shadow-2xl space-y-3"
        onSubmit={async e => {
          e.preventDefault();
          setError("");
          setSubmitting(true);
          try {
            const response = await axios.post(`${API}/api/v1/auth/login`, { email, password });
            if (!response.data.token) throw new Error("No token in response");
            onLoggedIn(response.data.token, response.data.role ?? "User");
          } catch (requestError) {
            setError(axios.isAxiosError(requestError) && requestError.response?.status === 401
              ? "Email or password is incorrect."
              : "Could not log in. Check that the API is running.");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div className="flex items-center justify-between">
          <Logo size="text-[18px]" />
          <button type="button" aria-label="Close" onClick={onClose} className="w-7 h-7 rounded bg-[#f3f4f6]">×</button>
        </div>
        <h2 className="text-[14px] font-bold">Log in</h2>
        <label className="block text-[12px] text-[#374151]">
          Email
          <input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-[#e5e7eb] bg-[#f9fafb] text-[13px] outline-none focus:border-[#00a826]" />
        </label>
        <label className="block text-[12px] text-[#374151]">
          Password
          <input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-[#e5e7eb] bg-[#f9fafb] text-[13px] outline-none focus:border-[#00a826]" />
        </label>
        {error && <p role="alert" className="text-[12px] text-red-600">{error}</p>}
        <button type="submit" disabled={submitting} className="w-full h-10 rounded font-bold text-[13px] bg-[#00a826] text-white hover:bg-[#009423] disabled:opacity-60">
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>
    </div>
  );
}
