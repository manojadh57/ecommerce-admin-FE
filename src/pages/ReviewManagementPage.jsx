// src/pages/admin/ReviewManagementPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api.js";

const ROOT = import.meta.env.VITE_ROOT_URL || "http://localhost:8000";

// helpers
const placeImg = "https://placehold.co/120x120?text=No+Image";

function normalizeImagePath(p) {
  if (!p) return "";
  const norm = String(p).replace(/\\/g, "/");
  if (/^https?:\/\//i.test(norm)) return norm;
  const m = norm.match(/\/?assets\/.+$/);
  if (m) return `${ROOT}/${m[0].replace(/^\/?/, "")}`;
  if (norm.startsWith("assets/")) return `${ROOT}/${norm}`;
  return `${ROOT}/${norm.replace(/^\.?\/*/, "")}`;
}

function Stars({ value = 0, size = 16 }) {
  const v = Math.max(0, Math.min(5, Number(value)));
  const full = "★".repeat(Math.floor(v));
  const empty = "☆".repeat(5 - Math.floor(v));
  return (
    <span
      aria-label={`${v} out of 5`}
      style={{ fontSize: size, letterSpacing: 1 }}
    >
      {full}
      {empty}
    </span>
  );
}

function normalizeReview(r) {
  const prod = r.product ?? r.productId ?? {};
  const user = r.user ?? r.userId ?? {};
  const productName =
    prod?.name || prod?.title || (typeof prod === "string" ? prod : "—");
  const firstImg =
    Array.isArray(prod?.images) && prod.images.length ? prod.images[0] : "";
  const productImage = firstImg ? normalizeImagePath(firstImg) : "";
  const userEmail = user?.email || (typeof user === "string" ? user : "—");

  return {
    id: r._id || r.id,
    productName,
    productImage,
    userEmail,
    rating: Number(r.rating ?? 0),
    comment: r.comment ?? "",
    approved: Boolean(r.approved),
    createdAt: r.createdAt ? new Date(r.createdAt) : null,
  };
}

/* ===== main component ===== */
export default function ReviewManagementPage() {
  // data
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filters / controls
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all"); // all | pending | approved
  const [minRating, setMinRating] = useState(0); // 0..5
  const [range, setRange] = useState("30d"); // 7d | 30d | 90d | all
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | rating

  // selection + actions
  const [selected, setSelected] = useState(() => new Set());
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  // UI extras
  const [expanded, setExpanded] = useState(() => new Set()); // row ids with expanded comment
  const [view, setView] = useState(null); // review object for modal

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const { data } = await api.get("/reviews");
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.reviews)
        ? data.reviews
        : [];
      setAll(list.map(normalizeReview));
      setSelected(new Set());
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
      setAll([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // time range filter
  const now = useMemo(() => new Date(), []);
  const fromDate = useMemo(() => {
    if (range === "all") return null;
    const d = new Date();
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    d.setDate(d.getDate() - days);
    return d;
  }, [range]);

  // filtered + sorted list
  const filtered = useMemo(() => {
    const txt = q.trim().toLowerCase();
    let arr = all.filter((r) => {
      const statusOk =
        status === "all"
          ? true
          : status === "approved"
          ? r.approved
          : !r.approved;

      const ratingOk = r.rating >= Number(minRating || 0);

      const dateOk =
        !fromDate ||
        (r.createdAt && r.createdAt >= fromDate && r.createdAt <= now);

      const textOk =
        !txt ||
        r.productName?.toLowerCase().includes(txt) ||
        r.comment?.toLowerCase().includes(txt) ||
        r.userEmail?.toLowerCase().includes(txt);

      return statusOk && ratingOk && dateOk && textOk;
    });

    switch (sortBy) {
      case "oldest":
        arr.sort(
          (a, b) =>
            (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
        );
        break;
      case "rating":
        arr.sort((a, b) => b.rating - a.rating);
        break;
      default:
        arr.sort(
          (a, b) =>
            (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
        );
    }
    return arr;
  }, [all, status, minRating, fromDate, now, q, sortBy]);

  // stats (overall and shown)
  const statsAll = useMemo(() => {
    const total = all.length;
    const approved = all.filter((r) => r.approved).length;
    const pending = total - approved;
    const avg = total
      ? all.reduce((s, r) => s + (r.rating || 0), 0) / total
      : 0;
    return { total, approved, pending, avg };
  }, [all]);

  const statsShown = useMemo(() => {
    const total = filtered.length;
    const approved = filtered.filter((r) => r.approved).length;
    const pending = total - approved;
    const avg = total
      ? filtered.reduce((s, r) => s + (r.rating || 0), 0) / total
      : 0;
    return { total, approved, pending, avg };
  }, [filtered]);

  // tri-state select all
  const headChk = useRef(null);
  const filteredIds = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const allChecked = useMemo(
    () => filteredIds.length > 0 && filteredIds.every((id) => selected.has(id)),
    [filteredIds, selected]
  );
  const someChecked = useMemo(
    () =>
      selected.size > 0 &&
      !allChecked &&
      filteredIds.some((id) => selected.has(id)),
    [selected, allChecked, filteredIds]
  );
  useEffect(() => {
    if (headChk.current) headChk.current.indeterminate = someChecked;
  }, [someChecked]);

  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => {
      if (allChecked) return new Set();
      return new Set(filteredIds);
    });

  // actions
  const setApproval = async (id, approved) => {
    try {
      setBusyId(id);
      await api.put(`/reviews/${id}/approve`, { approved });
      setAll((prev) => prev.map((r) => (r.id === id ? { ...r, approved } : r)));
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this review permanently?")) return;
    try {
      setBusyId(id);
      await api.delete(`/reviews/${id}`);
      setAll((prev) => prev.filter((r) => r.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setBusyId(null);
    }
  };

  const withFallbackAllSettled = async (calls) => {
    const res = await Promise.allSettled(calls);
    const ok = res.filter((r) => r.status === "fulfilled").length;
    const fail = res.length - ok;
    alert(`Done: ${ok} success, ${fail} failed`);
  };

  const bulkApprove = async (approved) => {
    if (selected.size === 0) return alert("Select some reviews first");
    setBulkBusy(true);
    try {
      await withFallbackAllSettled(
        Array.from(selected).map((id) =>
          api.put(`/reviews/${id}/approve`, { approved })
        )
      );
      setAll((prev) =>
        prev.map((r) => (selected.has(r.id) ? { ...r, approved } : r))
      );
      setSelected(new Set());
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return alert("Select some reviews first");
    if (!confirm(`Delete ${selected.size} review(s)? This cannot be undone.`))
      return;
    setBulkBusy(true);
    try {
      await withFallbackAllSettled(
        Array.from(selected).map((id) => api.delete(`/reviews/${id}`))
      );
      setAll((prev) => prev.filter((r) => !selected.has(r.id)));
      setSelected(new Set());
    } finally {
      setBulkBusy(false);
    }
  };

  // csv export (selected > filtered)
  const exportCSV = () => {
    const src = selected.size
      ? filtered.filter((r) => selected.has(r.id))
      : filtered;
    const esc = (v = "") =>
      `"${String(v)
        .replaceAll('"', '""')
        .replace(/\r?\n|\r/g, " ")}"`;
    const rows = [
      ["Product", "User", "Rating", "Status", "Date", "Comment"]
        .map(esc)
        .join(","),
      ...src.map((r) =>
        [
          r.productName,
          r.userEmail,
          r.rating,
          r.approved ? "approved" : "pending",
          r.createdAt ? r.createdAt.toISOString().slice(0, 10) : "",
          r.comment,
        ]
          .map(esc)
          .join(",")
      ),
    ].join("\n");
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const blob = new Blob([bom, rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reviews_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // styles
  const thumbWrap = {
    width: 64,
    height: 64,
    borderRadius: 12,
    background: "#f4f4f4",
    overflow: "hidden",
    flexShrink: 0,
  };
  const thumbImg = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  };
  const commentBase = (isOpen) => ({
    maxWidth: 520,
    fontSize: 15,
    color: "#4b5563",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: isOpen ? "unset" : 2,
    WebkitBoxOrient: "vertical",
    whiteSpace: isOpen ? "normal" : "initial",
  });
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
  const chipApproved = chip("#d1fae5", "#065f46");
  const chipPending = chip("#fff3cd", "#663c00");

  return (
    <div className="container-fluid">
      {/* ===== Header (aligned with other pages) ===== */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div className="d-flex align-items-center flex-wrap gap-2">
          <h2 className="mb-0">Reviews</h2>
          <div className="d-flex gap-2 ms-2">
            <span className="badge bg-secondary">{statsAll.total} total</span>
            <span className="badge bg-success">
              {statsAll.approved} approved
            </span>
            <span className="badge bg-warning text-dark">
              {statsAll.pending} pending
            </span>
            <span className="badge bg-info text-dark">
              Avg {statsAll.avg ? statsAll.avg.toFixed(1) : "0.0"}★
            </span>
          </div>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={exportCSV}
            disabled={loading || (!filtered.length && !selected.size)}
            title="Export visible/selected"
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
          <span>{err}</span>
          <button className="btn btn-sm btn-outline-dark" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {/* ===== Toolbar (light box; filters + conditional bulk actions) ===== */}
      <div className="border rounded p-3 bg-light mb-3">
        <div className="d-flex flex-wrap gap-2 justify-content-between">
          <div className="d-flex flex-wrap gap-2">
            <input
              className="form-control form-control-sm"
              placeholder="Search (product, comment, user)…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 260 }}
            />
            <select
              className="form-select form-select-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              title="Status"
              style={{ width: 140 }}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>
            <select
              className="form-select form-select-sm"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              title="Min rating"
              style={{ width: 150 }}
            >
              <option value={0}>Rating: any</option>
              <option value={5}>Rating: 5★</option>
              <option value={4}>Rating: ≥4★</option>
              <option value={3}>Rating: ≥3★</option>
              <option value={2}>Rating: ≥2★</option>
              <option value={1}>Rating: ≥1★</option>
            </select>
            <select
              className="form-select form-select-sm"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              title="Date range"
              style={{ width: 150 }}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            <select
              className="form-select form-select-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              title="Sort by"
              style={{ width: 150 }}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="rating">Rating</option>
            </select>
          </div>

          {/* Conditional bulk actions (mirrors Products page pattern) */}
          <div className="d-flex flex-wrap gap-2 align-items-center">
            {selected.size > 0 ? (
              <>
                <span className="badge bg-info text-dark align-self-center">
                  {selected.size} selected
                </span>
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => bulkApprove(true)}
                  disabled={bulkBusy}
                >
                  {bulkBusy ? "Working…" : "Approve"}
                </button>
                <button
                  className="btn btn-sm btn-warning"
                  onClick={() => bulkApprove(false)}
                  disabled={bulkBusy}
                >
                  {bulkBusy ? "Working…" : "Unapprove"}
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={bulkDelete}
                  disabled={bulkBusy}
                >
                  {bulkBusy ? "Working…" : "Delete"}
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setSelected(new Set())}
                  disabled={bulkBusy}
                >
                  Clear
                </button>
              </>
            ) : (
              <span className="text-muted small">
                Showing {statsShown.total} of {statsAll.total} · Avg{" "}
                {statsShown.avg ? statsShown.avg.toFixed(1) : "0.0"}★
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ===== Loading / Empty ===== */}
      {loading ? (
        <div className="py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
          <p className="mt-2 mb-0">Loading reviews…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-5 text-center text-muted">No reviews found.</div>
      ) : (
        <>
          {/* Summary card (consistent section) */}
          <div className="card mb-3">
            <div className="card-header bg-light">
              <h5 className="mb-0">Summary</h5>
            </div>
            <div className="card-body d-flex justify-content-between align-items-center">
              <span>
                Showing {statsShown.total} of {statsAll.total} reviews
              </span>
              <span>
                Approved: <strong>{statsShown.approved}</strong> · Pending:{" "}
                <strong>{statsShown.pending}</strong> · Avg{" "}
                <strong>
                  {statsShown.avg ? statsShown.avg.toFixed(1) : "0.0"}★
                </strong>
              </span>
            </div>
          </div>

          {/* Table in a card */}
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0">Review List</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 44 }}>
                        <input
                          ref={headChk}
                          type="checkbox"
                          className="form-check-input"
                          checked={allChecked}
                          onChange={toggleAll}
                          aria-checked={someChecked ? "mixed" : allChecked}
                        />
                      </th>
                      <th style={{ width: 340 }}>Product</th>
                      <th>User</th>
                      <th>Rating</th>
                      <th>Comment</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th style={{ width: 300 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const isExpanded = expanded.has(r.id);
                      return (
                        <tr
                          key={r.id}
                          className={selected.has(r.id) ? "table-active" : ""}
                        >
                          <td>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selected.has(r.id)}
                              onChange={() => toggleOne(r.id)}
                            />
                          </td>

                          <td>
                            <div className="d-flex align-items-center gap-3">
                              <div style={thumbWrap}>
                                <img
                                  src={r.productImage || placeImg}
                                  alt=""
                                  style={thumbImg}
                                  onError={(e) =>
                                    (e.currentTarget.src = placeImg)
                                  }
                                />
                              </div>
                              <div
                                className="text-truncate"
                                style={{ maxWidth: 240 }}
                              >
                                {r.productName || "—"}
                              </div>
                            </div>
                          </td>

                          <td
                            className="text-truncate"
                            style={{ maxWidth: 220 }}
                          >
                            {r.userEmail}
                          </td>

                          <td>
                            <Stars value={r.rating} />
                          </td>

                          <td>
                            <div style={commentBase(isExpanded)}>
                              {r.comment || "—"}
                            </div>
                            {r.comment && r.comment.length > 80 && (
                              <button
                                className="btn btn-link p-0 small"
                                onClick={() =>
                                  setExpanded((prev) => {
                                    const next = new Set(prev);
                                    next.has(r.id)
                                      ? next.delete(r.id)
                                      : next.add(r.id);
                                    return next;
                                  })
                                }
                              >
                                {isExpanded ? "Show less" : "Show more"}
                              </button>
                            )}
                          </td>

                          <td>
                            {r.approved ? (
                              <span style={chipApproved}>approved</span>
                            ) : (
                              <span style={chipPending}>pending</span>
                            )}
                          </td>

                          <td>
                            {r.createdAt
                              ? r.createdAt.toLocaleDateString()
                              : "—"}
                          </td>

                          <td>
                            <div className="d-flex flex-wrap gap-2">
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setView(r)}
                              >
                                View
                              </button>
                              {r.approved ? (
                                <button
                                  className="btn btn-sm btn-warning"
                                  disabled={busyId === r.id}
                                  onClick={() => setApproval(r.id, false)}
                                >
                                  {busyId === r.id ? "Updating…" : "Unapprove"}
                                </button>
                              ) : (
                                <button
                                  className="btn btn-sm btn-primary"
                                  disabled={busyId === r.id}
                                  onClick={() => setApproval(r.id, true)}
                                >
                                  {busyId === r.id ? "Approving…" : "Approve"}
                                </button>
                              )}
                              <button
                                className="btn btn-sm btn-outline-danger"
                                disabled={busyId === r.id}
                                onClick={() => remove(r.id)}
                              >
                                {busyId === r.id ? "Deleting…" : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* View modal (simple Bootstrap modal markup; consistent buttons) */}
      {view && (
        <div
          className="modal d-block"
          tabIndex="-1"
          onClick={() => setView(null)}
        >
          <div
            className="modal-dialog modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Review</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setView(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="d-flex gap-3 mb-3">
                  <div style={{ ...thumbWrap, width: 96, height: 96 }}>
                    <img
                      src={view.productImage || placeImg}
                      alt=""
                      style={thumbImg}
                      onError={(e) => (e.currentTarget.src = placeImg)}
                    />
                  </div>
                  <div>
                    <div className="fw-bold">{view.productName}</div>
                    <div className="text-muted small">{view.userEmail}</div>
                    <Stars value={view.rating} size={18} />
                    <div className="mt-2">
                      {view.approved ? (
                        <span style={chipApproved}>approved</span>
                      ) : (
                        <span style={chipPending}>pending</span>
                      )}
                    </div>
                    <div className="text-muted small mt-1">
                      {view.createdAt ? view.createdAt.toLocaleString() : ""}
                    </div>
                  </div>
                </div>
                <p
                  className="mb-0"
                  style={{ fontSize: 15, whiteSpace: "pre-wrap" }}
                >
                  {view.comment || "—"}
                </p>
              </div>
              <div className="modal-footer">
                {view.approved ? (
                  <button
                    className="btn btn-warning"
                    onClick={async () => {
                      await setApproval(view.id, false);
                      setView((v) => ({ ...v, approved: false }));
                    }}
                  >
                    Unapprove
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={async () => {
                      await setApproval(view.id, true);
                      setView((v) => ({ ...v, approved: true }));
                    }}
                  >
                    Approve
                  </button>
                )}
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setView(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
