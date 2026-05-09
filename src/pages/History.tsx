import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { signOut } from "firebase/auth";

// ─── Types ───────────────────────────────────────────────────────────────────
type BreathStatus = "Mild" | "Normal" | "Stressed" | "Weak";

interface HistoryEntry {
  id?: string;
  status: BreathStatus;
  timestamp: Timestamp | Date;
  counts: Record<BreathStatus, number>;
}

const STATUS_CONFIG: Record<BreathStatus, { color: string; bg: string; icon: string; desc: string }> = {
  Normal:   { color: "#16a34a", bg: "#dcfce7", icon: "😊", desc: "Pernapasan normal, kondisi baik" },
  Mild:     { color: "#ca8a04", bg: "#fef9c3", icon: "😐", desc: "Sedikit tidak normal, perhatikan pola napas" },
  Stressed: { color: "#dc2626", bg: "#fee2e2", icon: "😰", desc: "Terdeteksi stres, cobalah untuk rileks" },
  Weak:     { color: "#7c3aed", bg: "#ede9fe", icon: "😮‍💨", desc: "Napas lemah, disarankan istirahat" },
};

const STATUSES: BreathStatus[] = ["Normal", "Mild", "Stressed", "Weak"];

const MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember"
];

function toDate(ts: Timestamp | Date): Date {
  return ts instanceof Date ? ts : ts.toDate();
}

function formatDate(d: Date) {
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function formatTime(d: Date) {
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// ─── Sidebar nav ──────────────────────────────────────────────────────────────
const NAV = [
  { icon: "📈",  label: "Dashboard",  id: "dashboard" },
  { icon: "📋", label: "History",    id: "history" },
];

export default function HistoryPage() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Filters ─────────────────────────────────────────────────────────────────
  const [filterYear, setFilterYear]     = useState<string>("");
  const [filterMonth, setFilterMonth]   = useState<string>("");
  const [filterDay, setFilterDay]       = useState<string>("");
  const [filterResult, setFilterResult] = useState<string>("");

  const firstName = user?.displayName?.split(" ")[0] ?? "User";

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleNavClick = (id: string) => {
    if (id === "dashboard") navigate("/dashboard");
    else if (id === "history") { /* already here */ }
    setSidebarOpen(false);
  };

  // ─── Firebase: Load history ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "checkHistory"),
      orderBy("timestamp", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const entries: HistoryEntry[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<HistoryEntry, "id">),
      }));
      setHistory(entries);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // ─── Available years from data ────────────────────────────────────────────────
  const availableYears = useMemo(() => {
    const years = new Set(history.map((h) => toDate(h.timestamp).getFullYear().toString()));
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [history]);

  // ─── Filtered list ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return history.filter((h) => {
      const d = toDate(h.timestamp);
      if (filterYear   && d.getFullYear().toString() !== filterYear) return false;
      if (filterMonth  && d.getMonth().toString() !== filterMonth)    return false;
      if (filterDay    && d.getDate().toString() !== filterDay)       return false;
      if (filterResult && h.status !== filterResult)                  return false;
      return true;
    });
  }, [history, filterYear, filterMonth, filterDay, filterResult]);

  // ─── Summary stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const counts: Record<BreathStatus, number> = { Normal: 0, Mild: 0, Stressed: 0, Weak: 0 };
    filtered.forEach((h) => counts[h.status]++);
    return counts;
  }, [filtered]);

  const hasFilters = filterYear || filterMonth || filterDay || filterResult;

  const clearFilters = () => {
    setFilterYear("");
    setFilterMonth("");
    setFilterDay("");
    setFilterResult("");
  };

  // ─── Group by date ────────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>();
    filtered.forEach((h) => {
      const d = toDate(h.timestamp);
      const key = formatDate(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(h);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="hist-root">
      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-icon">🫁</span>
          <span className="brand-name">BreatHealth</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${n.id === "history" ? "active" : ""}`}
              onClick={() => handleNavClick(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{firstName[0].toUpperCase()}</div>
            <div className="user-info">
              <span className="user-name">{user?.displayName ?? "User"}</span>
              <span className="user-role">Patient</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>↩ Logout</button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── Main ── */}
      <main className="hist-main">
        {/* Header */}
        <header className="hist-header">
          <div className="header-left">
            <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
            <div>
              <h1 className="header-title">📋 Riwayat Pengecekan</h1>
              <p className="header-sub">
                {loading ? "Memuat..." : `${filtered.length} dari ${history.length} hasil`}
                {hasFilters && " (difilter)"}
              </p>
            </div>
          </div>
          <button className="btn-back" onClick={() => navigate("/dashboard")}>
            ← Dashboard
          </button>
        </header>

        {/* ── Filter Panel ── */}
        <div className="filter-card">
          <div className="filter-row">
            {/* Year */}
            <div className="filter-group">
              <label className="filter-label">Tahun</label>
              <select className="filter-select" value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setFilterMonth(""); setFilterDay(""); }}>
                <option value="">Semua Tahun</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div className="filter-group">
              <label className="filter-label">Bulan</label>
              <select className="filter-select" value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setFilterDay(""); }} disabled={!filterYear}>
                <option value="">Semua Bulan</option>
                {MONTHS.map((m, i) => (
                  <option key={i} value={i.toString()}>{m}</option>
                ))}
              </select>
            </div>

            {/* Day */}
            <div className="filter-group">
              <label className="filter-label">Tanggal</label>
              <select className="filter-select" value={filterDay} onChange={(e) => setFilterDay(e.target.value)} disabled={!filterMonth}>
                <option value="">Semua Tanggal</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d.toString()}>{d}</option>
                ))}
              </select>
            </div>

            {/* Result */}
            <div className="filter-group">
              <label className="filter-label">Hasil</label>
              <select className="filter-select" value={filterResult} onChange={(e) => setFilterResult(e.target.value)}>
                <option value="">Semua Hasil</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].icon} {s}</option>
                ))}
              </select>
            </div>
          </div>

          {hasFilters && (
            <div className="filter-actions">
              <div className="active-filters">
                {filterYear && <span className="filter-tag">📅 {filterYear}</span>}
                {filterMonth && <span className="filter-tag">🗓 {MONTHS[parseInt(filterMonth)]}</span>}
                {filterDay && <span className="filter-tag">📆 Tgl {filterDay}</span>}
                {filterResult && (
                  <span className="filter-tag" style={{ background: STATUS_CONFIG[filterResult as BreathStatus].bg, color: STATUS_CONFIG[filterResult as BreathStatus].color }}>
                    {STATUS_CONFIG[filterResult as BreathStatus].icon} {filterResult}
                  </span>
                )}
              </div>
              <button className="btn-clear" onClick={clearFilters}>✕ Reset Filter</button>
            </div>
          )}
        </div>

        {/* ── Summary Stats ── */}
        {filtered.length > 0 && (
          <div className="stats-bar">
            {STATUSES.map((s) => stats[s] > 0 && (
              <div key={s} className="stat-chip" style={{ background: STATUS_CONFIG[s].bg, color: STATUS_CONFIG[s].color }}>
                <span>{STATUS_CONFIG[s].icon}</span>
                <span className="stat-chip-label">{s}</span>
                <span className="stat-chip-count">{stats[s]}x</span>
              </div>
            ))}
          </div>
        )}

        {/* ── History List ── */}
        {loading ? (
          <div className="empty-state">
            <span className="empty-icon">⏳</span>
            <p>Memuat data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">{hasFilters ? "🔍" : "📭"}</span>
            <p>{hasFilters ? "Tidak ada data sesuai filter." : "Belum ada riwayat pengecekan."}</p>
            {hasFilters && (
              <button className="btn-clear" style={{ marginTop: "0.75rem" }} onClick={clearFilters}>
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          <div className="history-sections">
            {grouped.map(([dateLabel, entries]) => (
              <div key={dateLabel} className="date-group">
                <div className="date-divider">
                  <span className="date-divider-label">{dateLabel}</span>
                  <span className="date-divider-count">{entries.length} pengecekan</span>
                </div>
                <div className="history-list">
                  {entries.map((h, i) => {
                    const d = toDate(h.timestamp);
                    const cfg = STATUS_CONFIG[h.status];
                    return (
                      <div
                        key={h.id ?? i}
                        className="history-item"
                        style={{ borderLeft: `4px solid ${cfg.color}` }}
                      >
                        {/* Icon & Result */}
                        <div className="history-badge" style={{ background: cfg.bg }}>
                          <span className="history-icon">{cfg.icon}</span>
                        </div>

                        <div className="history-body">
                          <div className="history-top">
                            <span className="history-status" style={{ color: cfg.color }}>
                              {h.status}
                            </span>
                            <span className="history-time">{formatTime(d)}</span>
                          </div>
                          <span className="history-desc">{cfg.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{styles}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .hist-root {
    display: flex; min-height: 100vh;
    font-family: 'DM Sans', system-ui, sans-serif;
    background: #f1f5f9; color: #0a2540;
  }

  /* ── SIDEBAR (same as Dashboard) ── */
  .sidebar {
    width: 240px; background: #0a2540;
    display: flex; flex-direction: column;
    padding: 1.5rem 1rem;
    position: fixed; top: 0; left: 0; bottom: 0;
    z-index: 100; transition: transform 0.3s;
  }
  .sidebar-brand { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 2.5rem; padding: 0 0.5rem; }
  .brand-icon { font-size: 1.6rem; }
  .brand-name { color: #fff; font-size: 1.2rem; font-weight: 700; }
  .sidebar-nav { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
  .nav-item {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.7rem 0.9rem; border-radius: 10px; border: none;
    background: transparent; color: rgba(255,255,255,0.55);
    font-size: 0.875rem; font-weight: 500; cursor: pointer;
    transition: all 0.15s; text-align: left; width: 100%;
  }
  .nav-item:hover { background: rgba(255,255,255,0.07); color: #fff; }
  .nav-item.active { background: linear-gradient(135deg,#0e7a8a,#12c4a0); color: #fff; }
  .nav-icon { font-size: 1rem; width: 20px; text-align: center; }
  .sidebar-footer { margin-top: auto; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.08); }
  .user-chip { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.8rem; }
  .user-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg,#0e7a8a,#12c4a0);
    color: #fff; display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 0.9rem; flex-shrink: 0;
  }
  .user-name { display: block; color: #fff; font-size: 0.82rem; font-weight: 600; }
  .user-role { display: block; color: rgba(255,255,255,0.4); font-size: 0.72rem; }
  .btn-logout {
    width: 100%; padding: 0.5rem; background: rgba(255,255,255,0.06);
    border: none; border-radius: 8px; color: rgba(255,255,255,0.5);
    font-size: 0.82rem; cursor: pointer; transition: background 0.15s;
  }
  .btn-logout:hover { background: rgba(255,255,255,0.1); color: #fff; }

  /* ── MAIN ── */
  .hist-main { flex: 1; margin-left: 240px; padding: 1.5rem; min-height: 100vh; display: flex; flex-direction: column; gap: 1rem; }

  /* ── HEADER ── */
  .hist-header {
    display: flex; align-items: center; justify-content: space-between;
  }
  .header-left { display: flex; align-items: center; gap: 0.75rem; }
  .hamburger { display: none; background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #0a2540; }
  .header-title { font-size: clamp(1rem, 2.5vw, 1.3rem); font-weight: 800; color: #0a2540; }
  .header-sub { font-size: 0.78rem; color: #64748b; margin-top: 0.1rem; }
  .btn-back {
    padding: 0.45rem 1rem; background: #fff; border: 1px solid #e2e8f0;
    border-radius: 10px; font-size: 0.82rem; font-weight: 600;
    color: #0a2540; cursor: pointer; transition: background 0.15s;
    white-space: nowrap;
  }
  .btn-back:hover { background: #f1f5f9; }

  /* ── FILTER CARD ── */
  .filter-card {
    background: #fff; border-radius: 16px; padding: 1.2rem 1.4rem;
    box-shadow: 0 1px 12px rgba(0,0,0,0.05);
  }
  .filter-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  .filter-group { display: flex; flex-direction: column; gap: 0.3rem; flex: 1; min-width: 120px; }
  .filter-label { font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
  .filter-select {
    padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px;
    font-size: 0.85rem; color: #0a2540; background: #f8fafc;
    cursor: pointer; outline: none; transition: border 0.15s;
    appearance: auto;
  }
  .filter-select:focus { border-color: #0e7a8a; background: #fff; }
  .filter-select:disabled { opacity: 0.4; cursor: not-allowed; }

  .filter-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 0.85rem; flex-wrap: wrap; gap: 0.5rem; }
  .active-filters { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .filter-tag {
    padding: 0.22rem 0.65rem; background: #f1f5f9; color: #0a2540;
    border-radius: 20px; font-size: 0.75rem; font-weight: 600;
  }
  .btn-clear {
    padding: 0.35rem 0.9rem; background: #fee2e2; color: #dc2626;
    border: none; border-radius: 8px; font-size: 0.8rem; font-weight: 700;
    cursor: pointer; transition: background 0.15s;
  }
  .btn-clear:hover { background: #fca5a5; }

  /* ── STATS BAR ── */
  .stats-bar { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .stat-chip {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.4rem 0.85rem; border-radius: 20px; font-size: 0.8rem;
  }
  .stat-chip-label { font-weight: 600; }
  .stat-chip-count { font-weight: 800; }

  /* ── HISTORY SECTIONS ── */
  .history-sections { display: flex; flex-direction: column; gap: 1rem; }

  .date-group { display: flex; flex-direction: column; gap: 0.5rem; }
  .date-divider {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.3rem 0.1rem;
    border-bottom: 1.5px solid #e2e8f0;
  }
  .date-divider-label { font-size: 0.82rem; font-weight: 700; color: #0a2540; }
  .date-divider-count { font-size: 0.72rem; color: #94a3b8; }

  .history-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .history-item {
    display: flex; align-items: center; gap: 0.85rem;
    padding: 0.9rem 1rem; border-radius: 12px; background: #fff;
    border-left: 4px solid #e5e7eb;
    box-shadow: 0 1px 6px rgba(0,0,0,0.04);
    transition: box-shadow 0.15s;
  }
  .history-item:hover { box-shadow: 0 2px 14px rgba(0,0,0,0.08); }

  .history-badge {
    width: 44px; height: 44px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; font-size: 1.4rem;
  }

  .history-body { flex: 1; min-width: 0; }
  .history-top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .history-status { font-size: 0.92rem; font-weight: 800; }
  .history-time { font-size: 0.78rem; font-weight: 600; color: #64748b; white-space: nowrap; }
  .history-desc { display: block; font-size: 0.76rem; color: #94a3b8; margin-top: 0.2rem; line-height: 1.4; }

  /* ── EMPTY STATE ── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    gap: 0.4rem; padding: 3rem 1rem; text-align: center;
    color: #94a3b8; font-size: 0.85rem;
    background: #fff; border-radius: 16px;
    box-shadow: 0 1px 12px rgba(0,0,0,0.05);
  }
  .empty-icon { font-size: 2.5rem; }

  /* ── OVERLAY ── */
  .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 99; }

  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    .sidebar { transform: translateX(-100%); }
    .sidebar.open { transform: translateX(0); }
    .sidebar-overlay { display: block; }
    .hamburger { display: block; }
    .hist-main { margin-left: 0; padding: 1rem; }
    .filter-row { gap: 0.5rem; }
    .filter-group { min-width: calc(50% - 0.25rem); }
    .history-item { padding: 0.8rem; }
  }

  @media (max-width: 400px) {
    .hist-main { padding: 0.75rem; }
    .filter-group { min-width: 100%; }
    .hist-header { flex-direction: column; align-items: flex-start; gap: 0.6rem; }
    .btn-back { align-self: flex-start; }
  }
`;