import { useEffect, useMemo, useState } from "react";
import api from "../services/api.js";

const ROOT = import.meta.env.VITE_ROOT_URL || "http://localhost:8000";

/* ---------- helpers ---------- */
function normalizeImagePath(p) {
  if (!p) return "";
  const norm = String(p).replace(/\\/g, "/");
  if (/^https?:\/\//i.test(norm)) return norm;
  const m = norm.match(/\/?assets\/.+$/);
  if (m) return `${ROOT}/${m[0].replace(/^\/?/, "")}`;
  if (norm.startsWith("assets/")) return `${ROOT}/${norm}`;
  return `${ROOT}/${norm.replace(/^\.?\/*/, "")}`;
}

function Stars({ value = 0 }) {
  const v = Math.max(0, Math.min(5, Number(value)));
  const full = "★".repeat(Math.floor(v));
  const empty = "☆".repeat(5 - Math.floor(v));
  return (
    <span
      aria-label={`${v} out of 5`}
      style={{ fontSize: 16, letterSpacing: 1 }}
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

/* ---------- component ---------- */
export default function ReviewManagementPage() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("all"); // all | pending | approved
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);

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

  const filtered = useMemo(() => {
    const txt = q.trim().toLowerCase();
    return all.filter((r) => {
      const statusOk =
        filter === "all"
          ? true
          : filter === "approved"
          ? r.approved
          : !r.approved;
      const textOk =
        !txt ||
        r.productName?.toLowerCase().includes(txt) ||
        r.comment?.toLowerCase().includes(txt) ||
        r.userEmail?.toLowerCase().includes(txt);
      return statusOk && textOk;
    });
  }, [all, filter, q]);

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
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setBusyId(null);
    }
  };

  /* ---------- inline styles to match your design ---------- */
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

  const chipApproved = chip("#d1fae5", "#065f46"); // green-ish
  const chipPending = chip("#fff3cd", "#663c00"); // amber-ish

  const thumbWrap = {
    width: 64,
    height: 64,
    borderRadius: 12,
    background: "#f4f4f4",
    border: "1px solid rgba(0,0,0,0.08)",
    overflow: "hidden",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const thumbImg = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  };

  const commentCell = {
    maxWidth: 420,
    color: "#6c757d",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  };

  return (
    <>
      {/* header controls – same as Orders/Users */}
      <div
        className="d-flex flex-wrap gap-2 align-items-center mb-3"
        style={{ rowGap: 8 }}
      >
        <h3 className="mb-0">Reviews</h3>

        <div className="ms-auto d-flex gap-2">
          <input
            className="form-control"
            placeholder="Search (product, comment, user)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 280 }}
          />
          <select
            className="form-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            title="Filter"
            style={{ width: 160 }}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
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
        <div className="py-5 text-center text-muted">No reviews found.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ width: 340 }}>Product</th>
                <th>User</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ width: 260 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <div style={thumbWrap}>
                        <img
                          src={
                            r.productImage ||
                            "https://placehold.co/120x120?text=No+Image"
                          }
                          alt=""
                          style={thumbImg}
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://placehold.co/120x120?text=No+Image";
                          }}
                        />
                      </div>
                      <div className="text-truncate" style={{ maxWidth: 240 }}>
                        {r.productName || "—"}
                      </div>
                    </div>
                  </td>

                  <td className="text-truncate" style={{ maxWidth: 200 }}>
                    {r.userEmail}
                  </td>

                  <td>
                    <Stars value={r.rating} />
                  </td>

                  <td style={commentCell}>{r.comment || "—"}</td>

                  <td>
                    {r.approved ? (
                      <span style={chipApproved}>approved</span>
                    ) : (
                      <span style={chipPending}>pending</span>
                    )}
                  </td>

                  <td>
                    {r.createdAt ? r.createdAt.toLocaleDateString() : "—"}
                  </td>

                  <td className="d-flex flex-wrap gap-2">
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
