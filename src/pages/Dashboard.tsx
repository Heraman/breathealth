import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../lib/firebase";
import { connectBreathDevice } from "../lib/ble";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Metric {
  label: string;
  value: string;
  unit: string;
  status: "normal" | "warning" | "critical";
  trend: string;
  icon: string;
  detail: string;
}

interface Alert {
  id: number;
  type: "warning" | "info" | "critical";
  msg: string;
  time: string;
}

// ─── Mock Data (ganti dengan Firebase Firestore) ──────────────────────────────
const METRICS: Metric[] = [
  { label: "SpO₂ Level",       value: "98",  unit: "%",   status: "normal",   trend: "+0.5%", icon: "🩸", detail: "Excellent oxygen saturation" },
  { label: "Breathing Rate",   value: "16",  unit: "/min",status: "normal",   trend: "-1",    icon: "🫁", detail: "Normal resting rate" },
  { label: "Peak Flow",        value: "480", unit: "L/min",status: "warning", trend: "-12%",  icon: "💨", detail: "Slightly below personal best" },
  { label: "FEV1 Score",       value: "82",  unit: "%",   status: "normal",   trend: "+2%",   icon: "📊", detail: "Predicted: 3.8L | Actual: 3.1L" },
];

const ALERTS: Alert[] = [
  { id: 1, type: "warning", msg: "Peak flow dropped 12% from yesterday", time: "2h ago" },
  { id: 2, type: "info",    msg: "Weekly report is ready to view",        time: "5h ago" },
  { id: 3, type: "info",    msg: "Reminder: Log your morning reading",    time: "8h ago" },
];

// SpO₂ chart (last 12h — mock)
const SPO2_DATA = [96, 97, 97, 98, 98, 97, 98, 99, 98, 98, 97, 98];
const HOURS     = ["12a","2a","4a","6a","8a","10a","12p","2p","4p","6p","8p","10p"];

// ─── Sidebar nav ──────────────────────────────────────────────────────────────
const NAV = [
  { icon: "⊡",  label: "Dashboard",  id: "dashboard" },
  { icon: "📈", label: "Monitoring", id: "monitoring" },
  { icon: "📋", label: "Reports",    id: "reports" },
  { icon: "💊", label: "Medication", id: "medication" },
  { icon: "📅", label: "Schedule",   id: "schedule" },
  { icon: "⚙️", label: "Settings",   id: "settings" },
];

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

  const [bleStatus, setBleStatus] = useState<string>("Disconnected");
  const [sensorData, setSensorData] = useState({ r: 0, g: 0, b: 0, status: "Unknown" });
  const [rawBleData, setRawBleData] = useState<string>("");

  // 2. Fungsi untuk koneksi ke ESP32
  const handleConnect = async () => {
    try {
      setBleStatus("Connecting...");
      await connectBreathDevice((dataStr) => {
        // dataStr berisi string dari ESP32, contoh: "R:255 G:100 B:50 -> Normal"
        setRawBleData(dataStr); 
        
        // (Opsional) Memecah/Parsing string untuk mengambil nilai R, G, B, dan Status
        const match = dataStr.match(/R:(\d+)\s+G:(\d+)\s+B:(\d+)\s+->\s+(.*)/);
        if (match) {
          setSensorData({
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3]),
            status: match[4]
          });
        }
      });
      setBleStatus("Connected");
    } catch (error: any) {
      console.error(error);
      setBleStatus("Failed to connect");
      alert(error.message);
    }
  };

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

      {/* Overlay for mobile */}
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
              {/* <h1 className="header-title">{firstName} 👋</h1> */}
              {/* <br></br> */}
              <p className="header-sub">
                {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
          <div className="header-right">
            {/* Tombol Connect BLE */}
            <button 
              onClick={handleConnect} 
              style={{
                padding: "0.5rem 1rem", 
                borderRadius: "8px", 
                border: "none", 
                background: bleStatus === "Connected" ? "#10b981" : "#0e7a8a", 
                color: "white", 
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              {bleStatus === "Connected" ? "Bluetooth Connected" : "Connect Device"}
            </button>
            
            <div className={`health-badge ${sensorData.status === 'Normal' ? 'normal' : 'warning'}`}>
              ● {sensorData.status}
            </div>
            <button className="icon-btn" aria-label="Notifications">🔔</button>
          </div>
        </header>

        {/* ── Metric cards ── */}
        {/* <section className="metrics-grid">
          {METRICS.map((m) => (
            <div key={m.label} className={`metric-card ${m.status}`}>
              <div className="metric-top">
                <span className="metric-icon">{m.icon}</span>
                <span className={`status-dot ${m.status}`} />
              </div>
              <div className="metric-value">
                {m.value}<span className="metric-unit">{m.unit}</span>
              </div>
              <div className="metric-label">{m.label}</div>
              <div className="metric-bottom">
                <span className="metric-detail">{m.detail}</span>
                <span className={`metric-trend ${m.trend.startsWith("+") ? "up" : "down"}`}>
                  {m.trend.startsWith("+") ? "↑" : "↓"} {m.trend.replace(/[+-]/, "")}
                </span>
              </div>
            </div>
          ))}
        </section> */}

        {/* ── Charts + Alerts row ── */}
        <section className="content-row">
          {/* ── Sensor Data Card ── */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3>Live Sensor Data</h3>
                <p className="card-sub">Data dari SmartBreathprint</p>
              </div>
            </div>
            
            <div style={{ marginTop: "1rem" }}>
              <p><strong>Raw Data:</strong> {rawBleData || "Belum ada data"}</p>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <div style={{ padding: "1rem", background: "#fee2e2", borderRadius: "8px", flex: 1, textAlign: "center" }}>
                  <h4 style={{ color: "#ef4444" }}>RED</h4>
                  <h2>{sensorData.r}</h2>
                </div>
                <div style={{ padding: "1rem", background: "#dcfce7", borderRadius: "8px", flex: 1, textAlign: "center" }}>
                  <h4 style={{ color: "#22c55e" }}>GREEN</h4>
                  <h2>{sensorData.g}</h2>
                </div>
                <div style={{ padding: "1rem", background: "#dbeafe", borderRadius: "8px", flex: 1, textAlign: "center" }}>
                  <h4 style={{ color: "#3b82f6" }}>BLUE</h4>
                  <h2>{sensorData.b}</h2>
                </div>
              </div>
              <h3 style={{ marginTop: "1rem", textAlign: "center", fontSize: "1.2rem" }}>
                Status: <span style={{ color: "#0e7a8a" }}>{sensorData.status}</span>
              </h3>
            </div>
          </div>
          {/* SpO₂ mini chart */}
          {/* <div className="card chart-card">
            <div className="card-header">
              <div>
                <h3>SpO₂ Trend</h3>
                <p className="card-sub">Last 12 hours</p>
              </div>
              <select className="chart-select">
                <option>12 Hours</option>
                <option>24 Hours</option>
                <option>7 Days</option>
              </select>
            </div>
            <SpO2Chart data={SPO2_DATA} labels={HOURS} />
            <div className="chart-legend">
              <span className="legend-dot normal" />Normal range: 95–100%
            </div>
          </div> */}

          {/* Alerts */}
          {/* <div className="card alerts-card">
            <div className="card-header">
              <div>
                <h3>Alerts</h3>
                <p className="card-sub">{ALERTS.length} new notifications</p>
              </div>
              <button className="link-btn">View all</button>
            </div>
            <div className="alerts-list">
              {ALERTS.map((a) => (
                <div key={a.id} className={`alert-item ${a.type}`}>
                  <span className="alert-icon">
                    {a.type === "warning" ? "⚠️" : a.type === "critical" ? "🚨" : "ℹ️"}
                  </span>
                  <div className="alert-body">
                    <p className="alert-msg">{a.msg}</p>
                    <span className="alert-time">{a.time}</span>
                  </div>
                </div>
              ))}
            </div> */}

            {/* Quick log */}
            {/* <div className="quick-log">
              <h4>Log a Reading</h4>
              <div className="log-row">
                <input type="number" placeholder="SpO₂ %" className="log-input" />
                <input type="number" placeholder="Peak Flow" className="log-input" />
                <button className="btn-log">+ Log</button>
              </div>
            </div>
          </div> */}
        </section>

        {/* ── Bottom row ── */}
        <section className="content-row">
          {/* Breathing exercise */}
          {/* <div className="card exercise-card">
            <h3>Breathing Exercise</h3>
            <p className="card-sub">Daily guided session</p>
            <BreathingWidget />
          </div> */}

          {/* Weekly summary */}
          {/* <div className="card summary-card">
            <div className="card-header">
              <div><h3>Weekly Summary</h3><p className="card-sub">Mon – Sun</p></div>
              <button className="link-btn">Download</button>
            </div>
            <WeeklyBars />
            <div className="summary-footer">
              <div className="sf-item"><span>Avg SpO₂</span><strong>97.4%</strong></div>
              <div className="sf-item"><span>Sessions</span><strong>14</strong></div>
              <div className="sf-item"><span>Streak</span><strong>🔥 5 days</strong></div>
            </div>
          </div> */}
        </section>
      </main>

      <style>{styles}</style>
    </div>
  );
}

// ─── SpO₂ Chart (pure SVG, no lib needed) ────────────────────────────────────
// function SpO2Chart({ data, labels }: { data: number[]; labels: string[] }) {
//   const W = 520, H = 140;
//   const min = 90, max = 100;
//   const pts = data.map((v, i) => {
//     const x = (i / (data.length - 1)) * W;
//     const y = H - ((v - min) / (max - min)) * H;
//     return `${x},${y}`;
//   });
//   const area = `0,${H} ${pts.join(" ")} ${W},${H}`;

//   return (
//     <div className="chart-wrap">
//       <svg viewBox={`0 0 ${W} ${H + 24}`} preserveAspectRatio="xMidYMid meet">
//         {/* Normal range band */}
//         <rect x={0} y={0} width={W} height={H * 0.5} fill="#dcfce7" opacity={0.4} />
//         {/* Area */}
//         <polygon points={area} fill="url(#spo2grad)" opacity={0.3} />
//         {/* Line */}
//         <polyline points={pts.join(" ")} fill="none" stroke="#0e7a8a" strokeWidth={2.5} strokeLinejoin="round" />
//         {/* Dots */}
//         {pts.map((p, i) => {
//           const [x, y] = p.split(",").map(Number);
//           return <circle key={i} cx={x} cy={y} r={3} fill="#0e7a8a" />;
//         })}
//         {/* X labels */}
//         {labels.map((l, i) => {
//           if (i % 2 !== 0) return null;
//           const x = (i / (data.length - 1)) * W;
//           return <text key={i} x={x} y={H + 18} fontSize={9} fill="#94a3b8" textAnchor="middle">{l}</text>;
//         })}
//         <defs>
//           <linearGradient id="spo2grad" x1="0" y1="0" x2="0" y2="1">
//             <stop offset="0%" stopColor="#0e7a8a" />
//             <stop offset="100%" stopColor="#fff" stopOpacity={0} />
//           </linearGradient>
//         </defs>
//       </svg>
//     </div>
//   );
// }

// ─── Weekly Bars ──────────────────────────────────────────────────────────────
// const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// const VALS = [96, 98, 97, 99, 98, 97, 98];

// function WeeklyBars() {
//   return (
//     <div className="weekly-bars">
//       {DAYS.map((d, i) => (
//         <div key={d} className="bar-col">
//           <span className="bar-val">{VALS[i]}%</span>
//           <div className="bar-track">
//             <div
//               className="bar-fill"
//               style={{ height: `${((VALS[i] - 90) / 10) * 100}%` }}
//             />
//           </div>
//           <span className="bar-label">{d}</span>
//         </div>
//       ))}
//     </div>
//   );
// }

// ─── Breathing Widget ─────────────────────────────────────────────────────────
function BreathingWidget() {
  const [phase, setPhase] = useState<"idle" | "inhale" | "hold" | "exhale">("idle");
  const [count, setCount] = useState(0);

  const start = () => {
    let c = 0;
    setCount(c);
    setPhase("inhale");
    const cycle = () => {
      setPhase("inhale");
      setTimeout(() => setPhase("hold"), 4000);
      setTimeout(() => setPhase("exhale"), 7000);
      setTimeout(() => {
        c++;
        setCount(c);
        if (c < 3) cycle();
        else setPhase("idle");
      }, 11000);
    };
    cycle();
  };

  const labels: Record<string, string> = {
    idle: "Start session", inhale: "Inhale…", hold: "Hold…", exhale: "Exhale…",
  };
  const sizes: Record<string, string> = {
    idle: "80px", inhale: "130px", hold: "130px", exhale: "80px",
  };

  return (
    <div className="breath-widget">
      <div
        className={`breath-orb ${phase}`}
        style={{ width: sizes[phase], height: sizes[phase] }}
      />
      <p className="breath-phase">{labels[phase]}</p>
      {phase === "idle" && <button className="btn-start" onClick={start}>▶ Start</button>}
      {phase !== "idle" && <p className="breath-count">Cycle {count + 1} / 3</p>}
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

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 2.5rem;
    padding: 0 0.5rem;
  }
  .brand-icon { font-size: 1.6rem; }
  .brand-name { color: #fff; font-size: 1.2rem; font-weight: 700; }

  .sidebar-nav { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.7rem 0.9rem;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.55);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
    width: 100%;
  }
  .nav-item:hover { background: rgba(255,255,255,0.07); color: #fff; }
  .nav-item.active { background: linear-gradient(135deg,#0e7a8a,#12c4a0); color: #fff; }
  .nav-icon { font-size: 1rem; width: 20px; text-align: center; }
  .nav-label { font-size: 0.875rem; }

  .sidebar-footer { margin-top: auto; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.08); }
  .user-chip { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.8rem; }
  .user-avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg,#0e7a8a,#12c4a0);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.9rem;
    flex-shrink: 0;
  }
  .user-name { display: block; color: #fff; font-size: 0.82rem; font-weight: 600; }
  .user-role { display: block; color: rgba(255,255,255,0.4); font-size: 0.72rem; }

  .btn-logout {
    width: 100%;
    padding: 0.5rem;
    background: rgba(255,255,255,0.06);
    border: none;
    border-radius: 8px;
    color: rgba(255,255,255,0.5);
    font-size: 0.82rem;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-logout:hover { background: rgba(255,255,255,0.1); color: #fff; }

  /* ── MAIN ── */
  .db-main {
    flex: 1;
    margin-left: 240px;
    padding: 1.5rem;
    min-height: 100vh;
    max-width: 100%;
  }

  /* ── HEADER ── */
  .db-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }
  .header-left { display: flex; align-items: center; gap: 0.75rem; }
  .hamburger {
    display: none;
    background: none;
    border: none;
    font-size: 1.4rem;
    cursor: pointer;
    color: #0a2540;
  }
  .header-title { font-size: clamp(1.1rem,2.5vw,1.5rem); font-weight: 800; color: #0a2540; }
  .header-sub { font-size: 0.8rem; color: #64748b; margin-top: 0.1rem; }

  .header-right { display: flex; align-items: center; gap: 0.75rem; }
  .health-badge {
    padding: 0.35rem 0.9rem;
    border-radius: 20px;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.2px;
  }
  .health-badge.normal { background: #dcfce7; color: #16a34a; }
  .health-badge.warning { background: #fef9c3; color: #ca8a04; }
  .icon-btn { background: #fff; border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 0.5rem 0.65rem; cursor: pointer; font-size: 1rem; }

  /* ── METRIC CARDS ── */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.2rem;
  }

  .metric-card {
    background: #fff;
    border-radius: 16px;
    padding: 1.25rem;
    box-shadow: 0 1px 12px rgba(0,0,0,0.05);
    border-top: 3px solid transparent;
    transition: transform 0.15s;
  }
  .metric-card:hover { transform: translateY(-2px); }
  .metric-card.normal  { border-top-color: #10b981; }
  .metric-card.warning { border-top-color: #f59e0b; }
  .metric-card.critical{ border-top-color: #ef4444; }

  .metric-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; }
  .metric-icon { font-size: 1.4rem; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; }
  .status-dot.normal  { background: #10b981; box-shadow: 0 0 6px #10b981; }
  .status-dot.warning { background: #f59e0b; box-shadow: 0 0 6px #f59e0b; }
  .status-dot.critical{ background: #ef4444; box-shadow: 0 0 6px #ef4444; }

  .metric-value { font-size: 2rem; font-weight: 800; color: #0a2540; line-height: 1; }
  .metric-unit { font-size: 0.9rem; font-weight: 500; color: #64748b; margin-left: 2px; }
  .metric-label { font-size: 0.8rem; color: #64748b; margin: 0.25rem 0 0.7rem; }

  .metric-bottom { display: flex; justify-content: space-between; align-items: center; }
  .metric-detail { font-size: 0.7rem; color: #94a3b8; }
  .metric-trend { font-size: 0.75rem; font-weight: 700; }
  .metric-trend.up   { color: #10b981; }
  .metric-trend.down { color: #f59e0b; }

  /* ── CARDS ── */
  .card {
    background: #fff;
    border-radius: 16px;
    padding: 1.4rem;
    box-shadow: 0 1px 12px rgba(0,0,0,0.05);
  }
  .card h3 { font-size: 1rem; font-weight: 700; color: #0a2540; }
  .card-sub { font-size: 0.78rem; color: #94a3b8; margin-top: 0.1rem; }
  .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }

  .content-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  /* ── CHART ── */
  .chart-card { }
  .chart-select {
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    padding: 0.3rem 0.6rem;
    font-size: 0.78rem;
    color: #374151;
    outline: none;
    cursor: pointer;
  }
  .chart-wrap { overflow: hidden; }
  .chart-wrap svg { width: 100%; height: auto; }
  .chart-legend { font-size: 0.72rem; color: #94a3b8; margin-top: 0.5rem; display: flex; align-items: center; gap: 0.4rem; }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block; }
  .link-btn { background: none; border: none; color: #0e7a8a; font-size: 0.8rem; font-weight: 600; cursor: pointer; }

  /* ── ALERTS ── */
  .alerts-list { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.2rem; }
  .alert-item {
    display: flex;
    gap: 0.7rem;
    padding: 0.7rem;
    border-radius: 10px;
    align-items: flex-start;
  }
  .alert-item.warning  { background: #fffbeb; }
  .alert-item.info     { background: #f0f9ff; }
  .alert-item.critical { background: #fef2f2; }
  .alert-icon { font-size: 1rem; line-height: 1.2; }
  .alert-msg { font-size: 0.82rem; color: #374151; font-weight: 500; }
  .alert-time { font-size: 0.7rem; color: #94a3b8; }

  /* ── QUICK LOG ── */
  .quick-log { border-top: 1px solid #f1f5f9; padding-top: 1rem; }
  .quick-log h4 { font-size: 0.85rem; font-weight: 700; color: #374151; margin-bottom: 0.6rem; }
  .log-row { display: flex; gap: 0.5rem; }
  .log-input {
    flex: 1;
    padding: 0.5rem 0.7rem;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    font-size: 0.8rem;
    outline: none;
    color: #0a2540;
    min-width: 0;
  }
  .log-input:focus { border-color: #0e7a8a; }
  .btn-log {
    padding: 0.5rem 0.9rem;
    background: linear-gradient(135deg,#0e7a8a,#12c4a0);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }

  /* ── BREATHING WIDGET ── */
  .breath-widget {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem 0;
    gap: 1rem;
  }
  .breath-orb {
    border-radius: 50%;
    background: radial-gradient(circle, #12c4a0, #0e7a8a);
    opacity: 0.8;
    transition: width 4s ease-in-out, height 4s ease-in-out;
    box-shadow: 0 0 30px rgba(18,196,160,0.3);
  }
  .breath-phase { font-size: 1rem; font-weight: 600; color: #374151; }
  .breath-count { font-size: 0.8rem; color: #94a3b8; }
  .btn-start {
    padding: 0.55rem 1.4rem;
    background: linear-gradient(135deg,#0e7a8a,#12c4a0);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 0.875rem;
    font-weight: 700;
    cursor: pointer;
  }

  /* ── WEEKLY BARS ── */
  .weekly-bars {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
    height: 100px;
    margin: 1rem 0;
  }
  .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.3rem; height: 100%; }
  .bar-val { font-size: 0.65rem; color: #0e7a8a; font-weight: 700; }
  .bar-track { flex: 1; width: 100%; background: #f1f5f9; border-radius: 6px; overflow: hidden; display: flex; align-items: flex-end; }
  .bar-fill { width: 100%; background: linear-gradient(to top, #0e7a8a, #12c4a0); border-radius: 6px; transition: height 0.5s; }
  .bar-label { font-size: 0.65rem; color: #94a3b8; }

  .summary-footer {
    display: flex;
    gap: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid #f1f5f9;
  }
  .sf-item { flex: 1; text-align: center; }
  .sf-item span { display: block; font-size: 0.7rem; color: #94a3b8; margin-bottom: 0.2rem; }
  .sf-item strong { font-size: 0.95rem; color: #0a2540; }

  /* ── MOBILE ── */
  .sidebar-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 99;
  }

  @media (max-width: 900px) {
    .content-row { grid-template-columns: 1fr; }
  }

  @media (max-width: 768px) {
    .sidebar { transform: translateX(-100%); }
    .sidebar.open { transform: translateX(0); }
    .sidebar-overlay { display: block; }
    .hamburger { display: block; }
    .db-main { margin-left: 0; padding: 1rem; }
    .metrics-grid { grid-template-columns: 1fr 1fr; }
    .content-row { grid-template-columns: 1fr; }
    .header-title {
        display: flex;
        flex-direction: column;
        line-height: 1.15;
    }

    .greeting-name {
        display: block;
    }
  }

  @media (max-width: 400px) {
    .metrics-grid { grid-template-columns: 1fr; }
    .log-row { flex-wrap: wrap; }
    .btn-log { width: 100%; }
  }
`;