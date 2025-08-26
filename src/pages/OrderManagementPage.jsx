import { useEffect, useMemo, useState } from "react";
import { Modal, Spinner } from "react-bootstrap";
import api from "../services/api"; // MUST point to /api/admin/v1 and set admin JWT

const asAmount = (cents) =>
  ((Number(cents) || 0) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// DB keeps product.price in DOLLARS; order.totalAmount is in CENTS
const lineToCents = (priceDollars, qty) =>
  Math.round(Number(priceDollars || 0) * 100) * Number(qty || 1);

const statusBadge = (s) => {
  const v = String(s || "").toLowerCase();
  if (v.includes("deliver")) return ["success", "Delivered"];
  if (v.includes("ship")) return ["info", "Shipped"];
  if (v.includes("cancel")) return ["danger", "Cancelled"];
  if (v.includes("process")) return ["primary", "Processing"];
  return ["warning", "Pending"];
};

export default function AdminOrdersPage() {
  // data
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // row busy (status update)
  const [busyId, setBusyId] = useState(null);

  // modal state
  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const { data } = await api.get("/orders");
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
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

  /* ---------- filtering ---------- */
  const filtered = useMemo(() => {
    const txt = q.trim().toLowerCase();
    return orders.filter((o) => {
      const statusOk =
        statusFilter === "all"
          ? true
          : String(o.status || "").toLowerCase() === statusFilter;
      if (!statusOk) return false;

      if (!txt) return true;
      const email = o.userId?.email?.toLowerCase() || "";
      const productHit = (o.products || []).some((it) =>
        (it.productId?.name || "").toLowerCase().includes(txt)
      );
      return email.includes(txt) || productHit;
    });
  }, [orders, q, statusFilter]);

  /* ---------- status update ---------- */
  const updateStatus = async (id, status) => {
    try {
      setBusyId(id);
      const { data } = await api.put(`/orders/${id}/status`, {
        status,
        notify: false, // flip to true if you want to email from the list
      });
      setOrders((prev) => prev.map((o) => (o._id === id ? data.order : o)));
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setBusyId(null);
    }
  };

  const openDetail = async (id) => {
    try {
      setShowDetail(true);
      setDetail(null);
      setDetailErr("");
      setDetailLoading(true);
      const { data } = await api.get(`/orders/${id}`); // admin: GET /api/admin/v1/orders/:id
      setDetail(data.order || null);
    } catch (e) {
      setDetailErr(e?.response?.data?.message || e.message);
    } finally {
      setDetailLoading(false);
    }
  };
  const closeDetail = () => {
    setShowDetail(false);
    setDetail(null);
    setDetailErr("");
  };

  return (
    <div className="container-fluid">
      {/* header */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <h3 className="mb-0">Orders</h3>

        <div className="ms-auto d-flex gap-2">
          <input
            className="form-control"
            placeholder="Search (user email or product)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 280 }}
          />
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 160 }}
          >
            <option value="all">All statuses</option>
            <option value="pending">pending</option>
            <option value="processing">processing</option>
            <option value="shipped">shipped</option>
            <option value="delivered">delivered</option>
            <option value="cancelled">cancelled</option>
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
                <th style={{ width: 260 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const [variant, label] = statusBadge(o.status);
                const when = o.createdAt
                  ? new Date(o.createdAt).toLocaleDateString()
                  : "—";
                return (
                  <tr key={o._id}>
                    <td className="text-truncate" style={{ maxWidth: 260 }}>
                      {o.userId?.email || "—"}
                    </td>

                    <td>
                      <ul className="m-0 ps-3">
                        {(o.products || []).map((it, i) => (
                          <li
                            key={i}
                            className="text-truncate"
                            style={{ maxWidth: 520 }}
                          >
                            {it.productId?.name || "(product)"} × {it.quantity}
                          </li>
                        ))}
                      </ul>
                    </td>

                    <td>${asAmount(o.totalAmount)}</td>

                    <td>
                      <span className={`badge bg-${variant}`}>{label}</span>
                    </td>

                    <td>{when}</td>

                    <td>
                      <div className="d-flex gap-2 flex-wrap align-items-center">
                        <select
                          className="form-select"
                          disabled={busyId === o._id}
                          value={o.status}
                          onChange={(e) => updateStatus(o._id, e.target.value)}
                          style={{ width: 160 }}
                        >
                          <option value="pending">pending</option>
                          <option value="processing">processing</option>
                          <option value="shipped">shipped</option>
                          <option value="delivered">delivered</option>
                          <option value="cancelled">cancelled</option>
                        </select>

                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => openDetail(o._id)}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Detail Modal ===== */}
      <Modal show={showDetail} onHide={closeDetail} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {detail?._id ? `Order #${detail._id}` : "Order"}
            {detail?.status ? (
              <span
                className={`badge ms-2 bg-${
                  (detail.status || "").includes("deliver")
                    ? "success"
                    : (detail.status || "").includes("ship")
                    ? "info"
                    : (detail.status || "").includes("cancel")
                    ? "danger"
                    : (detail.status || "").includes("process")
                    ? "primary"
                    : "warning"
                }`}
              >
                {detail.status}
              </span>
            ) : null}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {detailLoading ? (
            <div className="py-5 text-center">
              <Spinner animation="border" />
            </div>
          ) : detailErr ? (
            <div className="alert alert-danger">{detailErr}</div>
          ) : !detail ? (
            <div className="text-muted">No order found.</div>
          ) : (
            <>
              {/* Customer + Address */}
              <div className="row g-3 mb-3">
                <div className="col-md-5">
                  <div className="card h-100">
                    <div className="card-header bg-light">
                      <strong>Customer</strong>
                    </div>
                    <div className="card-body">
                      <div>
                        <strong>{detail.address?.name || "—"}</strong>
                      </div>
                      <div className="text-muted">
                        {detail.address?.email || detail.userId?.email || "—"}
                      </div>
                      {detail.address?.phone && (
                        <div>☎ {detail.address.phone}</div>
                      )}
                      {detail.createdAt && (
                        <div className="text-muted mt-2">
                          {new Date(detail.createdAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-md-7">
                  <div className="card h-100">
                    <div className="card-header bg-light">
                      <strong>Shipping address</strong>
                    </div>
                    <div className="card-body">
                      {detail.address?.line1 ? (
                        <>
                          <div>{detail.address.line1}</div>
                          {detail.address.line2 && (
                            <div>{detail.address.line2}</div>
                          )}
                          <div>
                            {[
                              detail.address.city,
                              detail.address.state,
                              detail.address.postalCode,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          </div>
                          <div>{detail.address.country}</div>
                        </>
                      ) : (
                        <div className="text-muted">No address on file.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items + Totals */}
              <div className="card">
                <div className="card-header bg-light">
                  <strong>Items</strong>
                </div>
                <div className="card-body table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ width: 80 }}>Qty</th>
                        <th className="text-end" style={{ width: 160 }}>
                          Line total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.products || []).map((it, idx) => {
                        const p = it.productId || {};
                        const lineCents = lineToCents(
                          p.price || 0,
                          it.quantity || 1
                        );
                        return (
                          <tr key={idx}>
                            <td
                              className="text-truncate"
                              style={{ maxWidth: 420 }}
                            >
                              {p.name || "—"}
                            </td>
                            <td>{it.quantity}</td>
                            <td className="text-end">${asAmount(lineCents)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      {(() => {
                        const subtotal = (detail.products || []).reduce(
                          (s, it) =>
                            s +
                            lineToCents(
                              (it.productId || {}).price || 0,
                              it.quantity || 1
                            ),
                          0
                        );
                        const fee =
                          detail.shippingMethod === "express"
                            ? 1295
                            : detail.shippingMethod === "standard"
                            ? 695
                            : Math.max(
                                Number(detail.totalAmount || 0) - subtotal,
                                0
                              );
                        return (
                          <>
                            <tr>
                              <td colSpan={2}>Subtotal</td>
                              <td className="text-end">
                                ${asAmount(subtotal)}
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={2}>
                                Shipping
                                {detail.shippingMethod
                                  ? ` (${detail.shippingMethod})`
                                  : ""}
                              </td>
                              <td className="text-end">${asAmount(fee)}</td>
                            </tr>
                            <tr>
                              <td colSpan={2}>
                                <strong>Total</strong>
                              </td>
                              <td className="text-end">
                                <strong>${asAmount(detail.totalAmount)}</strong>
                              </td>
                            </tr>
                          </>
                        );
                      })()}
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <button className="btn btn-secondary" onClick={closeDetail}>
            Close
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
