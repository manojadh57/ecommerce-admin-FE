// src/pages/admin/AdminLoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./admin-auth.css";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!email || !password) {
      setErr("Please enter email and password.");
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.post("/auth/login", { email, password });
      // prefer chosen storage based on "Remember me"
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem("token", data?.tokens?.accessJWT || "");
      // store email for header initial (optional)
      localStorage.setItem("adminEmail", email);
      navigate("/dashboard");
    } catch (e) {
      setErr(e?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page d-flex justify-content-center align-items-center">
      <form className="auth-card card shadow-lg" onSubmit={handleSubmit}>
        <div className="card-body p-4 p-md-5">
          <h1 className="h4 mb-1 text-center fw-bold">
            Welcome to Admin Portal
          </h1>
          <p className="text-muted text-center mb-4">
            Please sign in to continue
          </p>

          {err && (
            <div className="alert alert-danger py-2" role="alert">
              {err}
            </div>
          )}

          <div className="mb-3">
            <label htmlFor="adminEmail" className="form-label">
              Email
            </label>
            <input
              id="adminEmail"
              className="form-control"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="adminPwd" className="form-label">
              Password
            </label>
            <div className="input-group">
              <input
                id="adminPwd"
                className="form-control"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPwd(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPwd((v) => !v)}
                tabIndex={-1}
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="form-check">
              <input
                id="rememberMe"
                className="form-check-input"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <label htmlFor="rememberMe" className="form-check-label">
                Remember me
              </label>
            </div>
          </div>

          <button className="btn btn-primary w-100" disabled={loading}>
            {loading ? "Signing in…" : "Login"}
          </button>
        </div>
      </form>
    </div>
  );
}
