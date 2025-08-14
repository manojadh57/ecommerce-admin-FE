import { useEffect, useMemo, useState } from "react";
import api from "../services/api.js";

export default function UsersManagementPage() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("all"); // all | active | inactive | verified | unverified

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const { data } = await api.get("/users", { params: { q } });
      setUsers(Array.isArray(data) ? data : data?.users || []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // initial
  // optional: live search
  // useEffect(() => { const t=setTimeout(load, 300); return () => clearTimeout(t); }, [q]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (filter === "active" && !u.active) return false;
      if (filter === "inactive" && u.active) return false;
      if (filter === "verified" && !u.verified) return false;
      if (filter === "unverified" && u.verified) return false;
      return true;
    });
  }, [users, filter]);

  const setActive = async (id, active) => {
    try {
      setBusyId(id);
      const { data } = await api.put(`/users/${id}/active`, { active });
      setUsers((prev) => prev.map((u) => (u._id === id ? data : u)));
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this user permanently?")) return;
    try {
      setBusyId(id);
      await api.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setBusyId(null);
    }
  };

  const badgeStyle = (ok, colorYes, colorNo) => ({
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 8,
    fontWeight: 600,
    background: ok ? colorYes : colorNo,
    color: ok ? "#0b2e13" : "#1a1a1a",
  });

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0 }}>Users</h3>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <input
            className="form-control"
            placeholder="Search email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 260 }}
          />
          <select
            className="form-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
          <button className="btn btn-outline-secondary" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      {loading ? (
        <div className="py-5 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-5 text-center text-muted">No users found.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Verified</th>
                <th>Active</th>
                <th>Joined</th>
                <th style={{ width: 260 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id}>
                  <td>{u.email}</td>
                  <td style={{ textTransform: "capitalize" }}>
                    {u.role || "customer"}
                  </td>
                  <td>
                    <span style={badgeStyle(u.verified, "#c8f7c5", "#ffe8a1")}>
                      {u.verified ? "verified" : "unverified"}
                    </span>
                  </td>
                  <td>
                    <span
                      style={badgeStyle(
                        u.active !== false,
                        "#c8f7c5",
                        "#f8d7da"
                      )}
                    >
                      {u.active !== false ? "active" : "inactive"}
                    </span>
                  </td>
                  <td>
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="d-flex flex-wrap gap-2">
                    {u.active !== false ? (
                      <button
                        className="btn btn-sm btn-warning"
                        disabled={busyId === u._id}
                        onClick={() => setActive(u._id, false)}
                      >
                        {busyId === u._id ? "Updating…" : "Deactivate"}
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-success"
                        disabled={busyId === u._id}
                        onClick={() => setActive(u._id, true)}
                      >
                        {busyId === u._id ? "Updating…" : "Activate"}
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-outline-danger"
                      disabled={busyId === u._id}
                      onClick={() => remove(u._id)}
                    >
                      {busyId === u._id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
