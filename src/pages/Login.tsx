import { useState } from "react";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../lib/firebase"; // sesuaikan path firebase config kamu
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate("/dashboard");
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-left">
        <div className="brand">
          <span className="brand-icon">🫁</span>
          <span className="brand-name">BreaHealth</span>
        </div>
        <div className="auth-hero">
          <h1>Breathe Better,<br />Live Longer.</h1>
          <p>Monitor your respiratory health with precision. Real-time data, personalized insights.</p>
          <div className="stats-row">
            <div className="stat"><span className="stat-num">98%</span><span className="stat-label">Accuracy</span></div>
            <div className="stat"><span className="stat-num">50K+</span><span className="stat-label">Users</span></div>
            <div className="stat"><span className="stat-num">24/7</span><span className="stat-label">Monitoring</span></div>
          </div>
        </div>
        <div className="breath-rings">
          <div className="ring r1" />
          <div className="ring r2" />
          <div className="ring r3" />
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <h2>Welcome back</h2>
          <p className="auth-sub">Sign in to your health dashboard</p>

          {error && <div className="alert-error">{error}</div>}

          <form onSubmit={handleLogin} noValidate>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="pass-wrap">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-pass"
                  onClick={() => setShowPass(!showPass)}
                  aria-label="Toggle password"
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div className="field-row">
              <label className="checkbox-label">
                <input type="checkbox" /> Remember me
              </label>
              <Link to="/forgot-password" className="link-plain">Forgot password?</Link>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : "Sign In"}
            </button>
          </form>

          <div className="divider"><span>or</span></div>

          <button className="btn-google" onClick={handleGoogle} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.705A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.705V4.963H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.037l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.964L3.964 7.295C4.672 5.169 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p className="auth-switch">
            Don't have an account? <Link to="/register" className="link-accent">Create one</Link>
          </p>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

function friendlyError(code: string) {
  switch (code) {
    case "auth/user-not-found": return "No account found with this email.";
    case "auth/wrong-password": return "Incorrect password. Please try again.";
    case "auth/invalid-email": return "Please enter a valid email address.";
    case "auth/too-many-requests": return "Too many attempts. Please try again later.";
    default: return "Something went wrong. Please try again.";
  }
}

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .auth-root {
    display: flex;
    min-height: 100vh;
    font-family: 'DM Sans', system-ui, sans-serif;
    background: #f0f4f8;
  }

  /* ── LEFT PANEL ── */
  .auth-left {
    flex: 1;
    background: linear-gradient(145deg, #0a4a6e 0%, #0e7a8a 50%, #12c4a0 100%);
    padding: 2.5rem;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    min-height: 100vh;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    z-index: 2;
  }
  .brand-icon { font-size: 1.8rem; }
  .brand-name {
    font-size: 1.4rem;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.5px;
  }

  .auth-hero {
    margin-top: auto;
    margin-bottom: auto;
    z-index: 2;
    color: #fff;
  }
  .auth-hero h1 {
    font-size: clamp(2rem, 3.5vw, 2.8rem);
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -1px;
    margin-bottom: 1rem;
  }
  .auth-hero p {
    font-size: 1rem;
    opacity: 0.8;
    max-width: 340px;
    line-height: 1.6;
    margin-bottom: 2rem;
  }

  .stats-row {
    display: flex;
    gap: 2rem;
  }
  .stat { display: flex; flex-direction: column; }
  .stat-num { font-size: 1.6rem; font-weight: 800; color: #7effd4; }
  .stat-label { font-size: 0.75rem; opacity: 0.7; letter-spacing: 0.5px; }

  /* Animated breath rings */
  .breath-rings {
    position: absolute;
    right: -80px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }
  .ring {
    position: absolute;
    border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,0.15);
    transform: translate(-50%, -50%);
    animation: breathe 4s ease-in-out infinite;
  }
  .r1 { width: 220px; height: 220px; animation-delay: 0s; }
  .r2 { width: 360px; height: 360px; animation-delay: 0.6s; }
  .r3 { width: 500px; height: 500px; animation-delay: 1.2s; }

  @keyframes breathe {
    0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
    50% { opacity: 0.1; transform: translate(-50%, -50%) scale(1.05); }
  }

  /* ── RIGHT PANEL ── */
  .auth-right {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .auth-card {
    background: #fff;
    border-radius: 20px;
    padding: 2.5rem;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 4px 40px rgba(0,0,0,0.08);
  }

  .auth-card h2 {
    font-size: 1.7rem;
    font-weight: 800;
    color: #0a2540;
    letter-spacing: -0.5px;
    margin-bottom: 0.3rem;
  }
  .auth-sub { color: #64748b; font-size: 0.9rem; margin-bottom: 1.8rem; }

  .alert-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    border-radius: 10px;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .field { margin-bottom: 1.1rem; }
  .field label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.4rem;
    letter-spacing: 0.2px;
  }
  .field input {
    width: 100%;
    padding: 0.7rem 1rem;
    border: 1.5px solid #e5e7eb;
    border-radius: 10px;
    font-size: 0.9rem;
    color: #0a2540;
    transition: border-color 0.2s;
    outline: none;
    background: #fafafa;
  }
  .field input:focus { border-color: #0e7a8a; background: #fff; }

  .pass-wrap { position: relative; }
  .pass-wrap input { padding-right: 2.8rem; }
  .toggle-pass {
    position: absolute;
    right: 0.8rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
  }

  .field-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.2rem;
    font-size: 0.82rem;
  }
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: #374151;
    cursor: pointer;
  }
  .link-plain { color: #64748b; text-decoration: none; }
  .link-plain:hover { color: #0e7a8a; }

  .btn-primary {
    width: 100%;
    padding: 0.85rem;
    background: linear-gradient(135deg, #0e7a8a, #12c4a0);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 48px;
  }
  .btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  .spinner {
    width: 18px; height: 18px;
    border: 2.5px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .divider {
    text-align: center;
    position: relative;
    margin: 1.2rem 0;
    color: #9ca3af;
    font-size: 0.8rem;
  }
  .divider::before, .divider::after {
    content: '';
    position: absolute;
    top: 50%;
    width: calc(50% - 20px);
    height: 1px;
    background: #e5e7eb;
  }
  .divider::before { left: 0; }
  .divider::after { right: 0; }

  .btn-google {
    width: 100%;
    padding: 0.8rem;
    background: #fff;
    border: 1.5px solid #e5e7eb;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 600;
    color: #374151;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    transition: background 0.2s, border-color 0.2s;
    min-height: 48px;
  }
  .btn-google:hover:not(:disabled) { background: #f9fafb; border-color: #d1d5db; }
  .btn-google:disabled { opacity: 0.6; cursor: not-allowed; }

  .auth-switch {
    text-align: center;
    font-size: 0.85rem;
    color: #64748b;
    margin-top: 1.4rem;
  }
  .link-accent { color: #0e7a8a; font-weight: 600; text-decoration: none; }
  .link-accent:hover { text-decoration: underline; }

  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    .auth-left { display: none; }
    .auth-right { padding: 1.5rem; background: #fff; }
    .auth-card {
      box-shadow: none;
      padding: 1.5rem 0;
      max-width: 100%;
    }
    .auth-root { background: #fff; }
  }
`;