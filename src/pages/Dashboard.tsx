import { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../lib/firebase";
import { connectBreathDevice } from "../lib/ble";

// ─── Types ───────────────────────────────────────────────────────────────────
type BreathStatus = "Mild" | "Normal" | "Stressed" | "Weak";
type CheckPhase = "idle" | "connected" | "checking" | "done";

interface Alert {
  id: number;
  type: "warning" | "info" | "critical";
  msg: string;
  time: string;
}

const VALID_STATUSES: BreathStatus[] = ["Mild", "Normal", "Stressed", "Weak"];

const STATUS_CONFIG: Record<BreathStatus, { color: string; bg: string; icon: string; desc: string }> = {
  Normal:   { color: "#16a34a", bg: "#dcfce7", icon: "😊", desc: "Pernapasan normal, kondisi baik" },
  Mild:     { color: "#ca8a04", bg: "#fef9c3", icon: "😐", desc: "Sedikit tidak normal, perhatikan pola napas" },
  Stressed: { color: "#dc2626", bg: "#fee2e2", icon: "😰", desc: "Terdeteksi stres, cobalah untuk rileks" },
  Weak:     { color: "#7c3aed", bg: "#ede9fe", icon: "😮‍💨", desc: "Napas lemah, disarankan istirahat" },
};

// ─── Sidebar nav ──────────────────────────────────────────────────────────────
const NAV = [
  { icon: "⊡",  label: "Dashboard",  id: "dashboard" },
  { icon: "📈", label: "Monitoring", id: "monitoring" },
  { icon: "📋", label: "Reports",    id: "reports" },
  { icon: "💊", label: "Medication", id: "medication" },
  { icon: "📅", label: "Schedule",   id: "schedule" },
  { icon: "⚙️", label: "Settings",   id: "settings" },
];

const CHECK_DURATION = 7000; // 7 detik (dalam range 5–10 detik)

export default function Dashboard() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const firstName = user?.displayName?.split(" ")[0] ?? "User";
  const greeting = now.getHours() < 12 ? "Pagi" : now.getHours() < 17 ? "Sore" : "Malam";

  // ─── BLE & Check State ───────────────────────────────────────────────────────
  const [phase, setPhase] = useState<CheckPhase>("idle");
  const [countdown, setCountdown] = useState(0);
  const [dataBuffer, setDataBuffer] = useState<BreathStatus[]>([]);
  const [finalResult, setFinalResult] = useState<BreathStatus | null>(null);
  const [history, setHistory] = useState<{ status: BreathStatus; time: string }[]>([]);

  const countRef = useRef<Record<BreathStatus, number>>({ Mild: 0, Normal: 0, Stressed: 0, Weak: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Connect BLE ─────────────────────────────────────────────────────────────
  const handleConnect = async () => {
    if (phase !== "idle") return;
    try {
      setPhase("connected");
      await connectBreathDevice((dataStr) => {
        const trimmed = dataStr.trim() as BreathStatus;
        if (VALID_STATUSES.includes(trimmed)) {
          countRef.current[trimmed]++;
          setDataBuffer((prev) => [...prev, trimmed]);
        }
      });
    } catch (error: any) {
      console.error(error);
      setPhase("idle");
      alert(error.message);
    }
  };

  // ─── Mulai Pengecekan ─────────────────────────────────────────────────────────
  const handleStartCheck = () => {
    if (phase !== "connected") return;

    // Reset counter
    countRef.current = { Mild: 0, Normal: 0, Stressed: 0, Weak: 0 };
    setDataBuffer([]);
    setFinalResult(null);
    setPhase("checking");
    setCountdown(Math.round(CHECK_DURATION / 1000));

    // Countdown timer
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    // Setelah durasi, ambil hasil
    timerRef.current = setTimeout(() => {
      const counts = countRef.current;
      const result = (Object.keys(counts) as BreathStatus[]).reduce((a, b) =>
        counts[a] >= counts[b] ? a : b
      );
      setFinalResult(result);
      setPhase("done");

      const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      setHistory((prev) => [{ status: result, time: timeStr }, ...prev].slice(0, 5));
    }, CHECK_DURATION);
  };

  // ─── Ulangi Pengecekan ────────────────────────────────────────────────────────
  const handleRecheck = () => {
    setPhase("connected");
    setFinalResult(null);
    setDataBuffer([]);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // ─── Button label & handler ───────────────────────────────────────────────────
  const btnLabel = () => {
    if (phase === "idle") return "🔗 Connect Device";
    if (phase === "connected") return "▶ Mulai Pengecekan";
    if (phase === "checking") return `⏳ Menganalisis... ${countdown}s`;
    return "✅ Selesai";
  };

  const handleBtn = () => {
    if (phase === "idle") handleConnect();
    else if (phase === "connected") handleStartCheck();
  };

  const btnDisabled = phase === "checking" || phase === "done";

  const btnBg =
    phase === "idle" ? "#0e7a8a" :
    phase === "connected" ? "#7c3aed" :
    phase === "checking" ? "#94a3b8" :
    "#16a34a";

  return (
    <div className="db-root">
      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-icon">🫁</span>
          <span className="brand-name">BreaHealth</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${activeNav === n.id ? "active" : ""}`}
              onClick={() => { setActiveNav(n.id); setSidebarOpen(false); }}
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
      <main className="db-main">
        {/* Header */}
        <header className="db-header">
          <div className="header-left">
            <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Menu">☰</button>
            <div>
              <h1 className="header-title">
                <span>{greeting},</span>
                <span className="greeting-name">{firstName} 👋</span>
              </h1>
              <p className="header-sub">
                {now.toLocaleDateString("id-ID", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
          <div className="header-right">
            <button
              onClick={handleBtn}
              disabled={btnDisabled}
              style={{
                padding: "0.5rem 1.2rem",
                borderRadius: "8px",
                border: "none",
                background: btnBg,
                color: "white",
                cursor: btnDisabled ? "not-allowed" : "pointer",
                fontWeight: "bold",
                fontSize: "0.85rem",
                opacity: btnDisabled ? 0.75 : 1,
                transition: "all 0.2s",
              }}
            >
              {btnLabel()}
            </button>

            {finalResult && (
              <div
                className="health-badge"
                style={{
                  background: STATUS_CONFIG[finalResult].bg,
                  color: STATUS_CONFIG[finalResult].color,
                }}
              >
                ● {finalResult}
              </div>
            )}
            <button className="icon-btn" aria-label="Notifications">🔔</button>
          </div>
        </header>

        {/* ── Sensor Card ── */}
        <section className="content-row">
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <div>
                <h3>🫁 Pengecekan Napas</h3>
                <p className="card-sub">SmartBreathprint via Bluetooth</p>
              </div>
              {phase === "done" && (
                <button
                  onClick={handleRecheck}
                  style={{
                    padding: "0.4rem 1rem",
                    background: "#0e7a8a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "0.82rem",
                  }}
                >
                  🔄 Cek Ulang
                </button>
              )}
            </div>

            {/* State: Idle */}
            {phase === "idle" && (
              <div className="state-box">
                <div className="state-icon">📡</div>
                <p className="state-title">Belum Terhubung</p>
                <p className="state-desc">Tekan tombol <strong>"Connect Device"</strong> untuk menghubungkan SmartBreathprint via Bluetooth.</p>
              </div>
            )}

            {/* State: Connected, siap cek */}
            {phase === "connected" && (
              <div className="state-box">
                <div className="state-icon" style={{ color: "#7c3aed" }}>✅</div>
                <p className="state-title" style={{ color: "#7c3aed" }}>Perangkat Terhubung!</p>
                <p className="state-desc">Tekan <strong>"Mulai Pengecekan"</strong> lalu bernapaslah secara normal selama {CHECK_DURATION / 1000} detik.</p>
              </div>
            )}

            {/* State: Checking */}
            {phase === "checking" && (
              <div className="state-box">
                <div className="pulse-ring">
                  <div className="pulse-core">🫁</div>
                </div>
                <p className="state-title" style={{ color: "#0e7a8a" }}>Sedang Menganalisis...</p>
                <p className="state-desc">Bernapaslah normal. Selesai dalam <strong>{countdown} detik</strong>.</p>
                {/* Live data pills */}
                <div className="pill-row">
                  {(["Normal", "Mild", "Stressed", "Weak"] as BreathStatus[]).map((s) => (
                    <div
                      key={s}
                      className="count-pill"
                      style={{ background: STATUS_CONFIG[s].bg, color: STATUS_CONFIG[s].color }}
                    >
                      {s}: {countRef.current[s]}x
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* State: Done - Hasil */}
            {phase === "done" && finalResult && (
              <div className="result-box" style={{ background: STATUS_CONFIG[finalResult].bg }}>
                <div className="result-icon">{STATUS_CONFIG[finalResult].icon}</div>
                <div className="result-label" style={{ color: STATUS_CONFIG[finalResult].color }}>
                  Hasil: {finalResult}
                </div>
                <p className="result-desc" style={{ color: STATUS_CONFIG[finalResult].color }}>
                  {STATUS_CONFIG[finalResult].desc}
                </p>

                {/* Breakdown counts */}
                <div className="pill-row" style={{ marginTop: "1rem" }}>
                  {(["Normal", "Mild", "Stressed", "Weak"] as BreathStatus[]).map((s) => (
                    <div
                      key={s}
                      className="count-pill"
                      style={{
                        background: s === finalResult ? STATUS_CONFIG[s].color : "#f1f5f9",
                        color: s === finalResult ? "#fff" : "#64748b",
                        fontWeight: s === finalResult ? 800 : 500,
                      }}
                    >
                      {s}: {countRef.current[s]}x
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Riwayat */}
          {history.length > 0 && (
            <div className="card" style={{ gridColumn: "1 / -1" }}>
              <div className="card-header">
                <div>
                  <h3>📋 Riwayat Pengecekan</h3>
                  <p className="card-sub">5 hasil terakhir</p>
                </div>
              </div>
              <div className="history-list">
                {history.map((h, i) => (
                  <div
                    key={i}
                    className="history-item"
                    style={{ borderLeft: `4px solid ${STATUS_CONFIG[h.status].color}` }}
                  >
                    <span className="history-icon">{STATUS_CONFIG[h.status].icon}</span>
                    <div>
                      <span
                        className="history-status"
                        style={{ color: STATUS_CONFIG[h.status].color }}
                      >
                        {h.status}
                      </span>
                      <span className="history-desc">{STATUS_CONFIG[h.status].desc}</span>
                    </div>
                    <span className="history-time">{h.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <style>{styles}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .db-root {
    display: flex;
    min-height: 100vh;
    font-family: 'DM Sans', system-ui, sans-serif;
    background: #f1f5f9;
    color: #0a2540;
  }

  /* ── SIDEBAR ── */
  .sidebar {
    width: 240px;
    background: #0a2540;
    display: flex;
    flex-direction: column;
    padding: 1.5rem 1rem;
    position: fixed;
    top: 0; left: 0; bottom: 0;
    z-index: 100;
    transition: transform 0.3s;
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
  .db-main { flex: 1; margin-left: 240px; padding: 1.5rem; min-height: 100vh; max-width: 100%; }

  /* ── HEADER ── */
  .db-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
  .header-left { display: flex; align-items: center; gap: 0.75rem; }
  .hamburger { display: none; background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #0a2540; }
  .header-title { font-size: clamp(1.1rem,2.5vw,1.5rem); font-weight: 800; color: #0a2540; }
  .greeting-name { color: #0e7a8a; }
  .header-sub { font-size: 0.8rem; color: #64748b; margin-top: 0.1rem; }
  .header-right { display: flex; align-items: center; gap: 0.75rem; }
  .health-badge {
    padding: 0.35rem 0.9rem; border-radius: 20px;
    font-size: 0.78rem; font-weight: 700; letter-spacing: 0.2px;
  }
  .icon-btn { background: #fff; border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 0.5rem 0.65rem; cursor: pointer; font-size: 1rem; }

  /* ── CARDS ── */
  .card {
    background: #fff; border-radius: 16px; padding: 1.4rem;
    box-shadow: 0 1px 12px rgba(0,0,0,0.05);
  }
  .card h3 { font-size: 1rem; font-weight: 700; color: #0a2540; }
  .card-sub { font-size: 0.78rem; color: #94a3b8; margin-top: 0.1rem; }
  .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }

  .content-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }

  /* ── STATE BOXES ── */
  .state-box {
    display: flex; flex-direction: column; align-items: center;
    padding: 2rem 1rem; gap: 0.6rem; text-align: center;
  }
  .state-icon { font-size: 2.5rem; }
  .state-title { font-size: 1.1rem; font-weight: 700; color: #0a2540; }
  .state-desc { font-size: 0.85rem; color: #64748b; max-width: 400px; }

  /* ── PULSE ANIMATION ── */
  .pulse-ring {
    width: 100px; height: 100px; border-radius: 50%;
    background: rgba(14,122,138,0.1);
    display: flex; align-items: center; justify-content: center;
    animation: pulse-out 1.5s ease-in-out infinite;
  }
  .pulse-core { font-size: 2.2rem; }
  @keyframes pulse-out {
    0%   { box-shadow: 0 0 0 0 rgba(14,122,138,0.4); }
    70%  { box-shadow: 0 0 0 20px rgba(14,122,138,0); }
    100% { box-shadow: 0 0 0 0 rgba(14,122,138,0); }
  }

  /* ── RESULT BOX ── */
  .result-box {
    display: flex; flex-direction: column; align-items: center;
    padding: 2rem 1rem; gap: 0.5rem; border-radius: 12px; text-align: center;
  }
  .result-icon { font-size: 3rem; }
  .result-label { font-size: 1.5rem; font-weight: 800; }
  .result-desc { font-size: 0.9rem; opacity: 0.8; }

  /* ── PILLS ── */
  .pill-row { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; margin-top: 0.5rem; }
  .count-pill {
    padding: 0.3rem 0.8rem; border-radius: 20px;
    font-size: 0.78rem; font-weight: 600;
  }

  /* ── HISTORY ── */
  .history-list { display: flex; flex-direction: column; gap: 0.6rem; }
  .history-item {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.75rem 1rem; border-radius: 10px; background: #f8fafc;
    border-left: 4px solid #e5e7eb;
  }
  .history-icon { font-size: 1.3rem; }
  .history-status { display: block; font-size: 0.9rem; font-weight: 700; }
  .history-desc { display: block; font-size: 0.75rem; color: #94a3b8; }
  .history-time { margin-left: auto; font-size: 0.75rem; color: #94a3b8; white-space: nowrap; }

  /* ── SIDEBAR OVERLAY ── */
  .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 99; }

  @media (max-width: 900px) { .content-row { grid-template-columns: 1fr; } }

  @media (max-width: 768px) {
    .sidebar { transform: translateX(-100%); }
    .sidebar.open { transform: translateX(0); }
    .sidebar-overlay { display: block; }
    .hamburger { display: block; }
    .db-main { margin-left: 0; padding: 1rem; }
    .content-row { grid-template-columns: 1fr; }
    .header-title { display: flex; flex-direction: column; line-height: 1.15; }
    .greeting-name { display: block; }
  }

  @media (max-width: 400px) {
    .pill-row { gap: 0.3rem; }
    .count-pill { font-size: 0.7rem; padding: 0.25rem 0.6rem; }
  }
`;
