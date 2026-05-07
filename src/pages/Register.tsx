import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../lib/firebase"; // sesuaikan path firebase config kamu
import { useNavigate, Link } from "react-router-dom";

interface FormData {
  name: string;
  email: string;
  password: string;
  confirm: string;
  agree: boolean;
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>({ name: "", email: "", password: "", confirm: "", agree: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: key === "agree" ? e.target.checked : e.target.value }));

  const strength = passwordStrength(form.password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    if (!form.agree) return setError("Please accept the terms to continue.");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(cred.user, { displayName: form.name });
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
          <h1>Your Health,<br />Your Data.</h1>
          <p>Join thousands monitoring respiratory wellness with cutting-edge AI diagnostics.</p>
          <div className="features">
            {["Real-time SpO₂ tracking", "AI-powered breathing analysis", "Personalized health reports", "24/7 anomaly detection"].map((f) => (
              <div className="feature-item" key={f}>
                <span className="check">✓</span> {f}
              </div>
            ))}
          </div>
        </div>
        <div className="breath-rings">
          <div className="ring r1" /><div className="ring r2" /><div className="ring r3" />
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <h2>Create account</h2>
          <p className="auth-sub">Start monitoring your health today</p>

          {error && <div className="alert-error">{error}</div>}

          <form onSubmit={handleRegister} noValidate>
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" type="text" placeholder="John Doe" value={form.name} onChange={set("name")} required />
            </div>

            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} required />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="pass-wrap">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={set("password")}
                  required
                />
                <button type="button" className="toggle-pass" onClick={() => setShowPass(!showPass)}>
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
              {form.password && (
                <div className="strength-wrap">
                  <div className="strength-bar">
                    <div className={`strength-fill s-${strength.level}`} style={{ width: strength.pct }} />
                  </div>
                  <span className={`strength-label sl-${strength.level}`}>{strength.label}</span>
                </div>
              )}
            </div>

            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                type={showPass ? "text" : "password"}
                placeholder="Re-enter password"
                value={form.confirm}
                onChange={set("confirm")}
                required
              />
              {form.confirm && form.password !== form.confirm && (
                <span className="field-hint error">Passwords don't match</span>
              )}
            </div>

            <label className="checkbox-label mb">
              <input type="checkbox" checked={form.agree} onChange={set("agree")} />
              I agree to the{" "}
              <Link to="/terms" className="link-accent">Terms of Service</Link> and{" "}
              <Link to="/privacy" className="link-accent">Privacy Policy</Link>
            </label>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : "Create Account"}
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
            Sign up with Google
          </button>

          <p className="auth-switch">
            Already have an account? <Link to="/login" className="link-accent">Sign in</Link>
          </p>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

function passwordStrength(pw: string): { level: string; label: string; pct: string } {
  if (!pw) return { level: "none", label: "", pct: "0%" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: "weak", label: "Weak", pct: "25%" };
  if (score <= 3) return { level: "fair", label: "Fair", pct: "55%" };
  if (score === 4) return { level: "good", label: "Good", pct: "80%" };
  return { level: "strong", label: "Strong", pct: "100%" };
}

function friendlyError(code: string) {
  switch (code) {
    case "auth/email-already-in-use": return "This email is already registered.";
    case "auth/invalid-email": return "Please enter a valid email address.";
    case "auth/weak-password": return "Password is too weak.";
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
  .brand-name { font-size: 1.4rem; font-weight: 700; color: #fff; letter-spacing: -0.5px; }

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
    margin-bottom: 1.8rem;
  }

  .features { display: flex; flex-direction: column; gap: 0.65rem; }
  .feature-item { font-size: 0.9rem; opacity: 0.85; display: flex; align-items: center; gap: 0.6rem; }
  .check { color: #7effd4; font-weight: 700; }

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
  .auth-sub { color: #64748b; font-size: 0.9rem; margin-bottom: 1.5rem; }

  .alert-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    border-radius: 10px;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .field { margin-bottom: 1rem; }
  .field label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.4rem;
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
  }

  .strength-wrap {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-top: 0.4rem;
  }
  .strength-bar {
    flex: 1;
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    overflow: hidden;
  }
  .strength-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s, background 0.3s;
  }
  .s-weak { background: #ef4444; }
  .s-fair { background: #f59e0b; }
  .s-good { background: #3b82f6; }
  .s-strong { background: #10b981; }

  .strength-label { font-size: 0.72rem; font-weight: 600; }
  .sl-weak { color: #ef4444; }
  .sl-fair { color: #f59e0b; }
  .sl-good { color: #3b82f6; }
  .sl-strong { color: #10b981; }

  .field-hint { display: block; font-size: 0.75rem; margin-top: 0.3rem; }
  .field-hint.error { color: #ef4444; }

  .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.82rem;
    color: #374151;
    cursor: pointer;
    line-height: 1.5;
  }
  .checkbox-label.mb { margin-bottom: 1.2rem; }

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
    transition: background 0.2s;
    min-height: 48px;
  }
  .btn-google:hover:not(:disabled) { background: #f9fafb; }
  .btn-google:disabled { opacity: 0.6; cursor: not-allowed; }

  .auth-switch {
    text-align: center;
    font-size: 0.85rem;
    color: #64748b;
    margin-top: 1.4rem;
  }
  .link-accent { color: #0e7a8a; font-weight: 600; text-decoration: none; }
  .link-accent:hover { text-decoration: underline; }

  @media (max-width: 768px) {
    .auth-left { display: none; }
    .auth-right { padding: 1.5rem; background: #fff; }
    .auth-card { box-shadow: none; padding: 1.5rem 0; max-width: 100%; }
    .auth-root { background: #fff; }
  }
`;