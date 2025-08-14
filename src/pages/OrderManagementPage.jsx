import { useEffect, useMemo, useState } from "react";
import api from "../services/api.js";

const STATUS_OPTIONS = ["pending", "shipped", "delivered", "cancelled"];

export default function OrderManagementPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  // top controls (same pattern as Reviews/Users)
  const [q, setQ] = useState(""); // search (user email / product name)
  const [statusFilter, setStatusFilter] = useState("all"); // all | pending | shipped | delivered | cancelled

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const { data } = await api.get("/orders");
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.orders)
        ? data.orders
        : [];
      setOrders(list);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      setBusyId(id);
      await api.put(`/orders/${id}/status`, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) => (o._id === id ? { ...o, status: newStatus } : o))
      );
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setBusyId(null);
    }
  };

  // inline badge chips (same visual language as other pages)
  const chip = (bg, color = "#000") => ({
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 8,
    fontWeight: 700,
    lineHeight: 1,
    background: bg,
    color,
    textTransform: "capitalize",
  });

  const badgeFor = (status) => {
    switch (status) {
      case "pending":
        return chip("#fff3cd", "#663c00"); // amber
      case "shipped":
        return chip("#cfe8ff", "#084298"); // info-ish
      case "delivered":
        return chip("#d1fae5", "#065f46"); // green
      case "cancelled":
        return chip("#f8d7da", "#842029"); // red
      default:
        return chip("#e9ecef", "#212529");
    }
  };

  // filter + search just like Reviews page
  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return orders.filter((o) => {
      const statusOk =
        statusFilter === "all" ? true : o.status === statusFilter;
      const textOk =
        !text ||
        o.userId?.email?.toLowerCase().includes(text) ||
        (o.products || []).some((it) =>
          (it.productId?.name || String(it.productId || ""))
            .toLowerCase()
            .includes(text)
        );
      return statusOk && textOk;
    });
  }, [orders, q, statusFilter]);

  return (
    <>
      {/* header controls – aligned to the right, consistent with other pages */}
      <div
        className="d-flex flex-wrap gap-2 align-items-center mb-3"
        style={{ rowGap: 8 }}
      >
        <h3 className="mb-0">Orders</h3>

        <div className="ms-auto d-flex gap-2">
          <input
            className="form-control"
            placeholder="Search (user email or product)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 260 }}
          />
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            title="Filter by status"
            style={{ width: 180 }}
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
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
        <div className="py-5 text-center text-muted">No orders found.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>User</th>
                <th>Products</th>
                <th>Total</th>
                <th>Status</th>
                <th>Placed On</th>
                <th style={{ width: 220 }}>Update</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o._id}>
                  <td style={{ maxWidth: 220 }} className="text-truncate">
                    {o.userId?.email || "—"}
                  </td>

                  <td>
                    <ul className="mb-0 ps-3">
                      {(o.products || []).map((item, idx) => (
                        <li key={idx}>
                          {item.productId?.name || item.productId || "—"} ×{" "}
                          {item.quantity}
                        </li>
                      ))}
                    </ul>
                  </td>

                  <td>${Number(o.totalAmount || 0).toFixed(2)}</td>

                  <td>
                    <span style={badgeFor(o.status)}>{o.status}</span>
                  </td>

                  <td>
                    {o.createdAt
                      ? new Date(o.createdAt).toLocaleDateString()
                      : "—"}
                  </td>

                  <td>
                    <div className="d-flex gap-2">
                      <select
                        className="form-select form-select-sm"
                        value={o.status}
                        onChange={(e) => updateStatus(o._id, e.target.value)}
                        disabled={busyId === o._id}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
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
