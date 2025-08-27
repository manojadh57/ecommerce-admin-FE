import { useEffect, useMemo, useState } from "react";
import api from "../services/api.js";

// Normalize user object from API
function normalizeUser(u) {
  return {
    id: u._id || u.id,
    email: u.email || "",
    role: (u.role || "customer").toLowerCase(),
    active: u.active !== false, // undefined => active
    createdAt: u.createdAt ? new Date(u.createdAt) : null,
  };
}

const N = (x, d = 0) => {
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
};

const idOf = (x) => (typeof x === "string" ? x : x && x._id ? x._id : null);
const fmtDate = (d) =>
  d instanceof Date && !isNaN(d) ? d.toLocaleDateString() : "—";

// include orders that realistically count as revenue
function isRevenueOrder(o) {
  const s = String(o.status || "").toLowerCase();
  const p = String(o.paymentStatus || "").toLowerCase();

  const include =
    [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "completed",
      "paid",
    ].includes(s) || ["paid", "captured", "succeeded"].includes(p);

  const exclude = ["cancelled", "canceled", "failed", "refunded"].includes(s);

  return include && !exclude;
}

// --- Amounts in DOLLARS (plain numbers) ---
const c2d = (n) => Number(n || 0) / 100;

// Preferred: use cents total; fallback: sum line items (dollars) + shipping/tax − discount.
function orderTotalDollars(o) {
  if (o.totalAmount != null && !isNaN(o.totalAmount)) return c2d(o.totalAmount);
  if (o.grandTotalCents != null) return c2d(o.grandTotalCents);
  if (o.amountCents != null) return c2d(o.amountCents);

  const items = o.products || o.items || [];
  const itemsTotal = items.reduce((sum, it) => {
    const unit = N(it.price) || N(it.unitPrice) || N(it.product?.price) || 0; // dollars
    const qty = N(it.quantity ?? it.qty, 1);
    return sum + unit * qty;
  }, 0);

  const shipping = N(o.shippingFee ?? o.shipping ?? o.shippingAmount, 0); // dollars
  const tax = N(o.tax ?? o.taxAmount, 0);
  const discount = N(o.discount ?? o.discountAmount, 0);

  return Math.max(0, itemsTotal + shipping + tax - discount);
}

// Net dollars after refunds.
// If total was cents, treat refund as cents; else as dollars.
function orderNetDollars(o) {
  const total = orderTotalDollars(o);
  let refund = 0;
  if (o.totalAmount != null && o.refundAmount != null)
    refund = c2d(o.refundAmount);
  else refund = N(o.refundAmount, 0);
  return Math.max(0, total - refund);
}

// CSV export: numbers only (no $), 2 decimals, safe escaping.
function exportUsersCSV(rows) {
  const esc = (v = "") =>
    `"${String(v)
      .replaceAll('"', '""')
      .replace(/\r?\n|\r/g, " ")}"`;
  const data = [
    ["Email", "Role", "Spent", "Active", "Joined"].map(esc).join(","),
    ...rows.map((u) =>
      [
        u.email,
        u.role,
        (u.spent ?? 0).toFixed(2),
        u.active ? "yes" : "no",
        fmtDate(u.createdAt),
      ]
        .map(esc)
        .join(",")
    ),
  ].join("\n");
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const blob = new Blob([bom, data], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `users_${new Date().toISOString().slice(0, 10)}.csv`,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* =========================
   UsersManagementPage
   ========================= */

export default function UsersManagementPage() {
  // data
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);

  // ui state
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  // controls
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | inactive
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | spentDesc | spentAsc

  // Money formatter to match Orders page ($ and 2 decimals)
  const money = (n) =>
    "$" +
    Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // load users + orders together (admin endpoints)
  const load = async (query = q) => {
    try {
      setLoading(true);
      setErr("");
      const [uRes, oRes] = await Promise.all([
        api.get("/users", { params: { q: query } }),
        api.get("/orders"),
      ]);

      const uList = Array.isArray(uRes.data)
        ? uRes.data
        : uRes.data?.users || [];
      const oList = Array.isArray(oRes.data)
        ? oRes.data
        : oRes.data?.orders || [];

      setUsers(uList.map(normalizeUser));
      setOrders(oList);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
      setUsers([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); // initial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => load(q), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // map: user id -> total spent (DOLLARS)
  const userSpendMap = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      if (!isRevenueOrder(o)) continue;
      const uid = idOf(o.userId);
      if (!uid) continue;
      const net = orderNetDollars(o); // dollars
      map.set(uid, (map.get(uid) || 0) + net);
    }
    return map;
  }, [orders]);

  // attach spend to users
  const usersWithSpend = useMemo(
    () => users.map((u) => ({ ...u, spent: userSpendMap.get(u.id) || 0 })),
    [users, userSpendMap]
  );

  // filter, search, sort
  const filtered = useMemo(() => {
    let arr = usersWithSpend;
    if (filter === "active") arr = arr.filter((u) => u.active);
    if (filter === "inactive") arr = arr.filter((u) => !u.active);

    const txt = q.trim().toLowerCase();
    if (txt) arr = arr.filter((u) => u.email.toLowerCase().includes(txt));

    arr = [...arr].sort((a, b) => {
      if (sortBy === "spentDesc") return b.spent - a.spent;
      if (sortBy === "spentAsc") return a.spent - b.spent;
      const A = a.createdAt?.getTime() || 0;
      const B = b.createdAt?.getTime() || 0;
      return sortBy === "oldest" ? A - B : B - A;
    });
    return arr;
  }, [usersWithSpend, filter, q, sortBy]);

  // header totals
  const totals = useMemo(() => {
    const active = usersWithSpend.filter((u) => u.active).length;
    const totalSpendShown = filtered.reduce((s, u) => s + (u.spent || 0), 0);
    return {
      all: usersWithSpend.length,
      active,
      inactive: usersWithSpend.length - active,
      totalSpendShown,
    };
  }, [usersWithSpend, filtered]);

  // actions
  const setActive = async (id, active) => {
    try {
      setBusyId(id);
      const { data } = await api.put(`/users/${id}/active`, { active });
      const updated = normalizeUser(data);
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
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
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setBusyId(null);
    }
  };

  /* =========================
     Render
     ========================= */

  return (
    <div className="container-fluid">
      {/* ===== Header (aligned with other pages) ===== */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div className="d-flex align-items-center flex-wrap gap-2">
          <h2 className="mb-0">Users</h2>
          <div className="d-flex flex-wrap gap-2 ms-2">
            <span className="badge bg-secondary">All: {totals.all}</span>
            <span className="badge bg-success">Active: {totals.active}</span>
            <span className="badge bg-danger">Inactive: {totals.inactive}</span>
            <span className="badge bg-info text-dark">
              Total Spend (shown): {money(totals.totalSpendShown)}
            </span>
          </div>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => load()}
          >
            Refresh
          </button>
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => exportUsersCSV(filtered)}
            disabled={!filtered.length}
            title="Export visible rows"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* ===== Error ===== */}
      {err && (
        <div
          className="alert alert-danger d-flex justify-content-between align-items-center"
          role="alert"
        >
          <span>
            <strong>Error:</strong> {err}
          </span>
          <button
            className="btn btn-sm btn-outline-dark"
            onClick={() => load()}
          >
            Retry
          </button>
        </div>
      )}

      {/* ===== Toolbar (light box; search/filter/sort) ===== */}
      <div className="border rounded p-3 bg-light mb-3">
        <div className="d-flex flex-wrap gap-2 justify-content-between">
          <div className="d-flex flex-wrap gap-2">
            <input
              className="form-control form-control-sm"
              placeholder="Search email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 240 }}
              aria-label="Search by email"
            />
            <select
              className="form-select form-select-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter users"
              style={{ width: 140 }}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              className="form-select form-select-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort users"
              style={{ width: 170 }}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="spentDesc">Spent: high → low</option>
              <option value="spentAsc">Spent: low → high</option>
            </select>
          </div>
          <div className="text-muted small align-self-center">
            Showing {filtered.length} of {usersWithSpend.length} users
          </div>
        </div>
      </div>

      {/* ===== Loading / Empty ===== */}
      {loading ? (
        <div className="py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
          <p className="mt-2 mb-0">Loading users…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-5 text-center text-muted">No users found.</div>
      ) : (
        <>
          {/* Summary card (consistent section) */}
          <div className="card mb-3">
            <div className="card-header bg-light">
              <h5 className="mb-0">Summary</h5>
            </div>
            <div className="card-body d-flex justify-content-between align-items-center">
              <span>
                Showing {filtered.length} of {usersWithSpend.length} users
              </span>
              <span>
                Total spend (shown):{" "}
                <strong>{money(totals.totalSpendShown)}</strong>
              </span>
            </div>
          </div>

          {/* Table in a card */}
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0">User List</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Spent</th>
                      <th>Active</th>
                      <th>Joined</th>
                      <th style={{ width: 260 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => (
                      <tr key={u.id}>
                        <td className="text-truncate" style={{ maxWidth: 320 }}>
                          {u.email}
                        </td>
                        <td style={{ textTransform: "capitalize" }}>
                          {u.role}
                        </td>
                        <td>
                          <strong>{money(u.spent || 0)}</strong>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              u.active ? "bg-success" : "bg-danger"
                            }`}
                          >
                            {u.active ? "active" : "inactive"}
                          </span>
                        </td>
                        <td>{fmtDate(u.createdAt)}</td>
                        <td>
                          <div className="d-flex flex-wrap gap-2">
                            {u.active ? (
                              <button
                                className="btn btn-sm btn-warning"
                                disabled={busyId === u.id}
                                onClick={() => setActive(u.id, false)}
                                title="Deactivate user"
                              >
                                {busyId === u.id ? "Updating…" : "Deactivate"}
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm btn-success"
                                disabled={busyId === u.id}
                                onClick={() => setActive(u.id, true)}
                                title="Activate user"
                              >
                                {busyId === u.id ? "Updating…" : "Activate"}
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-outline-danger"
                              disabled={busyId === u.id}
                              onClick={() => remove(u.id)}
                              title="Delete user"
                            >
                              {busyId === u.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
