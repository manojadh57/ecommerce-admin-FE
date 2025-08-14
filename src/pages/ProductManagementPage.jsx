import { useEffect, useMemo, useState } from "react";
import api from "../services/api.js";
import ProductForm from "../components/ProductForm.jsx";

const ROOT = import.meta.env.VITE_ROOT_URL || "http://localhost:8000";

function normalizeImagePath(p) {
  if (!p) return "";
  const norm = String(p).replace(/\\/g, "/");
  if (/^https?:\/\//i.test(norm)) return norm;
  const m = norm.match(/\/?assets\/.+$/);
  if (m) return `${ROOT}/${m[0].replace(/^\/?/, "")}`;
  if (norm.startsWith("assets/")) return `${ROOT}/${norm}`;
  return `${ROOT}/${norm.replace(/^\.?\/*/, "")}`;
}

export default function ProductManagementPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [show, setShow] = useState(false);
  const [editItem, setEdit] = useState(null);

  // simple search
  const [q, setQ] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const { data } = await api.get("/products");
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.products)
        ? data.products
        : [];
      setItems(list);
    } catch (e) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      await load();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  // super-light search (name/sku/desc)
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(t) ||
        (p.sku || "").toLowerCase().includes(t) ||
        (p.description || "").toLowerCase().includes(t)
    );
  }, [items, q]);

  const thumbStyle = {
    width: 48,
    height: 48,
    objectFit: "cover",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "#f5f5f5",
    display: "block",
  };

  return (
    <>
      {/* Header */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h3 className="mb-0">Products</h3>

        <div className="ms-auto d-flex gap-2">
          <input
            className="form-control"
            placeholder="Search products"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 240 }}
          />
          <button className="btn btn-outline-secondary" onClick={load}>
            Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEdit(null);
              setShow(true);
            }}
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* Alerts */}
      {err && <div className="alert alert-danger">{err}</div>}

      {/* Body */}
      {loading ? (
        <div className="py-5 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-5 text-center text-muted">No products found.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ width: 60 }}></th>
                <th>Name</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Category</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const firstImg =
                  Array.isArray(p.images) && p.images.length ? p.images[0] : "";
                const img = firstImg ? normalizeImagePath(firstImg) : "";

                return (
                  <tr key={p._id}>
                    <td>
                      <img
                        src={img || "https://placehold.co/96x96?text=No+Image"}
                        alt=""
                        style={thumbStyle}
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://placehold.co/96x96?text=No+Image";
                        }}
                      />
                    </td>

                    <td className="text-truncate" style={{ maxWidth: 320 }}>
                      {p.name || "—"}
                    </td>

                    <td>${Number(p.price || 0).toFixed(2)}</td>

                    <td>{p.stock ?? 0}</td>

                    <td className="text-truncate" style={{ maxWidth: 220 }}>
                      {p.category?.name || "—"}
                    </td>

                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setEdit(p);
                            setShow(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => onDelete(p._id)}
                        >
                          Delete
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

      {/* Form modal (unchanged) */}
      {show && (
        <ProductForm
          initial={editItem}
          onClose={() => {
            setShow(false);
            setEdit(null);
          }}
          onSuccess={load}
        />
      )}
    </>
  );
}
