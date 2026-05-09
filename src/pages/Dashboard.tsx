import { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { connectBreathDevice } from "../lib/ble";

// ─── Types ───────────────────────────────────────────────────────────────────
type BreathStatus = "Mild" | "Normal" | "Stressed" | "Weak";
type CheckPhase = "idle" | "connected" | "checking" | "done";

const VALID_STATUSES: BreathStatus[] = ["Mild", "Normal", "Stressed", "Weak"];

const STATUS_CONFIG: Record<BreathStatus, { color: string; bg: string; icon: string; desc: string }> = {
  Normal:   { color: "#16a34a", bg: "#dcfce7", icon: "😊", desc: "Pernapasan normal, kondisi baik" },
  Mild:     { color: "#ca8a04", bg: "#fef9c3", icon: "😐", desc: "Sedikit tidak normal, perhatikan pola napas" },
  Stressed: { color: "#dc2626", bg: "#fee2e2", icon: "😰", desc: "Terdeteksi stres, cobalah untuk rileks" },
  Weak:     { color: "#7c3aed", bg: "#ede9fe", icon: "😮‍💨", desc: "Napas lemah, disarankan istirahat" },
};

// ─── Sidebar nav ──────────────────────────────────────────────────────────────
const NAV = [
  { icon: "📈",  label: "Dashboard",  id: "dashboard" },
  { icon: "📋", label: "History",    id: "history" },
];

const CHECK_DURATION = 10000;

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

  // Navigate to history page when History nav is clicked
  const handleNavClick = (id: string) => {
    if (id === "history") {
      navigate("/history");
    } else {
      setActiveNav(id);
    }
    setSidebarOpen(false);
  };

  const firstName = user?.displayName?.split(" ")[0] ?? "User";
  const greeting = now.getHours() < 12 ? "Pagi" : now.getHours() < 17 ? "Sore" : "Malam";

  // ─── BLE & Check State ───────────────────────────────────────────────────────
  const [phase, setPhase] = useState<CheckPhase>("idle");
  const [countdown, setCountdown] = useState(0);
  const [finalResult, setFinalResult] = useState<BreathStatus | null>(null);
  const [saving, setSaving] = useState(false);

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
    countRef.current = { Mild: 0, Normal: 0, Stressed: 0, Weak: 0 };
    setFinalResult(null);
    setPhase("checking");
    setCountdown(Math.round(CHECK_DURATION / 1000));

    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    timerRef.current = setTimeout(async () => {
      const counts = { ...countRef.current };
      const result = (Object.keys(counts) as BreathStatus[]).reduce((a, b) =>
        counts[a] >= counts[b] ? a : b
      );
      setFinalResult(result);
      setPhase("done");

      // ─── Save to Firestore ────────────────────────────────────────────────────
      if (user) {
        setSaving(true);
        try {
          await addDoc(collection(db, "users", user.uid, "checkHistory"), {
            status: result,
            counts,
            timestamp: Timestamp.now(),
          });
        } catch (err) {
          console.error("Gagal simpan ke Firebase:", err);
        } finally {
          setSaving(false);
        }
      }
    }, CHECK_DURATION);
  };

  // ─── Ulangi Pengecekan ────────────────────────────────────────────────────────
  const handleRecheck = () => {
    setPhase("connected");
    setFinalResult(null);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

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
      <main className="db-main">
        {/* Header */}
        <header className="db-header">
          <div className="header-left">
            <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Menu">☰</button>
            <div>
              <h1 className="header-title">
                <span>Selamat {greeting},</span>
                <span className="greeting-name"> {firstName} 👋</span>
              </h1>
              <p className="header-sub">
                {now.toLocaleDateString("id-ID", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
        </header>

        <section className="content-col">

          {/* ── Sensor Card ── */}
          <div className="card sensor-card">
            <div className="card-header">
              <div>
                <h3>🫁 Pengecekan Napas</h3>
                <p className="card-sub">SmartBreathprint via Bluetooth</p>
              </div>

              {/* Status badge di header card - hanya tampil connected & checking */}
              {phase === "connected" && (
                <span className="phase-badge connected">● Terhubung</span>
              )}
              {phase === "checking" && (
                <span className="phase-badge checking">⏳ {countdown}s</span>
              )}
            </div>

            {/* State: Idle */}
            {phase === "idle" && (
              <div className="state-box">
                <div className="state-icon">📡</div>
                <p className="state-title">Belum Terhubung</p>
                <p className="state-desc">Hubungkan SmartBreathprint via Bluetooth untuk memulai pengecekan.</p>
                <button className="btn-action btn-connect" onClick={handleConnect}>
                  🔗 Connect Device
                </button>
              </div>
            )}

            {/* State: Connected */}
            {phase === "connected" && (
              <div className="state-box">
                <div className="state-icon" style={{ color: "#7c3aed" }}>✅</div>
                <p className="state-title" style={{ color: "#7c3aed" }}>Perangkat Terhubung!</p>
                <p className="state-desc">
                  Tekan <strong>Mulai Pengecekan</strong> lalu bernapaslah secara normal selama {CHECK_DURATION / 1000} detik.
                </p>
                <button className="btn-action btn-start" onClick={handleStartCheck}>
                  ▶ Mulai Pengecekan
                </button>
              </div>
            )}

            {/* State: Checking - tanpa pills status */}
            {phase === "checking" && (
              <div className="state-box">
                <div className="pulse-ring">
                  <div className="pulse-core">🫁</div>
                </div>
                <p className="state-title" style={{ color: "#0e7a8a" }}>Sedang Menganalisis...</p>
                <p className="state-desc">Bernapaslah normal. Selesai dalam <strong>{countdown} detik</strong>.</p>
              </div>
            )}

            {/* State: Done - hanya tampil result akhir, tanpa pills breakdown */}
            {phase === "done" && finalResult && (
              <div className="result-box" style={{ background: STATUS_CONFIG[finalResult].bg }}>
                <div className="result-icon">{STATUS_CONFIG[finalResult].icon}</div>
                <div className="result-label" style={{ color: STATUS_CONFIG[finalResult].color }}>
                  {STATUS_CONFIG[finalResult].desc}
                </div>
                <div className="done-actions">
                  {saving && <span className="saving-label">💾 Menyimpan...</span>}
                  <button className="btn-action btn-recheck" onClick={handleRecheck}>
                    🔄 Cek Ulang
                  </button>
                  <button className="btn-action btn-history" onClick={() => navigate("/history")}>
                    📋 Lihat Riwayat
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Quick Stats Card ── */}
          {/* <div className="card">
            <div className="card-header">
              <div>
                <h3>📊 Ringkasan</h3>
                <p className="card-sub">Pantau kesehatan pernapasanmu</p>
              </div>
            </div>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-icon">🫁</span>
                <p className="stat-label">Pengecekan Hari Ini</p>
                <p className="stat-value">—</p>
              </div>
              <div className="stat-item">
                <span className="stat-icon">✅</span>
                <p className="stat-label">Status Terakhir</p>
                <p className="stat-value" style={{ color: finalResult ? STATUS_CONFIG[finalResult].color : "#94a3b8" }}>
                  {finalResult ? STATUS_CONFIG[finalResult].icon + " " + finalResult : "—"}
                </p>
              </div>
              <div className="stat-item">
                <span className="stat-icon">📅</span>
                <p className="stat-label">Riwayat Lengkap</p>
                <button className="stat-link" onClick={() => navigate("/history")}>Lihat →</button>
              </div>
            </div>
          </div> */}

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
  .db-main { flex: 1; margin-left: 240px; padding: 1.5rem; min-height: 100vh; }

  /* ── HEADER ── */
  .db-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 1.5rem;
  }
  .header-left { display: flex; align-items: center; gap: 0.75rem; }
  .hamburger { display: none; background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #0a2540; padding: 0.25rem; }
  .header-title { font-size: clamp(1rem, 2.5vw, 1.4rem); font-weight: 800; color: #0a2540; }
  .greeting-name { color: #0e7a8a; }
  .header-sub { font-size: 0.8rem; color: #64748b; margin-top: 0.15rem; }

  /* ── CONTENT COLUMN ── */
  .content-col { display: flex; flex-direction: column; gap: 1rem; }

  /* ── CARDS ── */
  .card {
    background: #fff; border-radius: 16px; padding: 1.4rem;
    box-shadow: 0 1px 12px rgba(0,0,0,0.05);
  }
  .card h3 { font-size: 1rem; font-weight: 700; color: #0a2540; }
  .card-sub { font-size: 0.78rem; color: #94a3b8; margin-top: 0.1rem; }
  .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }

  /* ── PHASE BADGE ── */
  .phase-badge {
    padding: 0.3rem 0.75rem; border-radius: 20px;
    font-size: 0.75rem; font-weight: 700; white-space: nowrap;
  }
  .phase-badge.connected { background: #ede9fe; color: #7c3aed; }
  .phase-badge.checking { background: #e0f2fe; color: #0284c7; }

  /* ── STATE BOXES ── */
  .state-box {
    display: flex; flex-direction: column; align-items: center;
    padding: 1.5rem 1rem; gap: 0.6rem; text-align: center;
  }
  .state-icon { font-size: 2.4rem; }
  .state-title { font-size: 1rem; font-weight: 700; color: #0a2540; }
  .state-desc { font-size: 0.84rem; color: #64748b; max-width: 360px; line-height: 1.5; }

  /* ── ACTION BUTTONS ── */
  .btn-action {
    margin-top: 0.75rem;
    padding: 0.6rem 1.5rem;
    border: none; border-radius: 10px;
    font-size: 0.9rem; font-weight: 700; cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
  }
  .btn-action:active { transform: scale(0.97); }
  .btn-connect { background: #0e7a8a; color: #fff; }
  .btn-connect:hover { opacity: 0.9; }
  .btn-start { background: #7c3aed; color: #fff; }
  .btn-start:hover { opacity: 0.9; }
  .btn-recheck { background: #0e7a8a; color: #fff; }
  .btn-history { background: #f1f5f9; color: #0a2540; border: 1px solid #e2e8f0; margin-top: 0.75rem; }
  .btn-history:hover { background: #e2e8f0; }

  /* ── PULSE ANIMATION ── */
  .pulse-ring {
    width: 90px; height: 90px; border-radius: 50%;
    background: rgba(14,122,138,0.1);
    display: flex; align-items: center; justify-content: center;
    animation: pulse-out 1.5s ease-in-out infinite;
  }
  .pulse-core { font-size: 2rem; }
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
  .result-icon { font-size: 3.5rem; margin-bottom: 0.25rem; }
  .result-label { font-size: 1rem; font-weight: 600; line-height: 1.5; max-width: 320px; }
  .done-actions { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem; flex-wrap: wrap; justify-content: center; }
  .saving-label { font-size: 0.8rem; color: #64748b; }

  /* ── STATS GRID ── */
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  .stat-item { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; text-align: center; padding: 0.75rem 0.5rem; background: #f8fafc; border-radius: 10px; }
  .stat-icon { font-size: 1.5rem; }
  .stat-label { font-size: 0.72rem; color: #94a3b8; font-weight: 500; }
  .stat-value { font-size: 0.88rem; font-weight: 700; color: #0a2540; }
  .stat-link { background: none; border: none; color: #0e7a8a; font-size: 0.82rem; font-weight: 700; cursor: pointer; padding: 0; }
  .stat-link:hover { text-decoration: underline; }

  /* ── OVERLAY ── */
  .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 99; }

  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    .sidebar { transform: translateX(-100%); }
    .sidebar.open { transform: translateX(0); }
    .sidebar-overlay { display: block; }
    .hamburger { display: block; }
    .db-main { margin-left: 0; padding: 1rem; }
    .card { padding: 1.1rem; }
    .card h3 { font-size: 0.95rem; }
    .state-box { padding: 1.25rem 0.5rem; }
    .state-desc { font-size: 0.8rem; }
    .btn-action { padding: 0.55rem 1.2rem; font-size: 0.85rem; }
    .stats-grid { grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
    .result-label { font-size: 0.9rem; }
  }

  @media (max-width: 400px) {
    .db-main { padding: 0.75rem; }
    .card { padding: 1rem 0.9rem; border-radius: 12px; }
    .stats-grid { grid-template-columns: repeat(3, 1fr); }
    .phase-badge { font-size: 0.7rem; padding: 0.25rem 0.6rem; }
  }
`;