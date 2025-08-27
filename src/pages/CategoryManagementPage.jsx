import { useState, useEffect, Fragment, useMemo } from "react";
import { Modal, Spinner } from "react-bootstrap";
import api from "../services/api";
import CategoryForm from "../components/CategoryForm";

// formatters
const LOCALE = import.meta.env.VITE_LOCALE || "en-AU";
const CURRENCY = (import.meta.env.VITE_CURRENCY || "AUD").toUpperCase();

const fmtInt = new Intl.NumberFormat(LOCALE);
const fmtMoney = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// helpers
function idOf(parentLike) {
  if (!parentLike) return null;
  if (typeof parentLike === "string") return parentLike;
  if (typeof parentLike === "object" && parentLike._id) return parentLike._id;
  return null;
}

export default function CategoryManagementPage() {
  // ---------- state ----------
  const [cats, setCats] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState(""); // search

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [prodModal, setProdModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [prodError, setProdError] = useState("");

  // data load
  const fetchCats = async () => {
    try {
      setPageLoading(true);
      setError("");
      const { data } = await api.get("/categories");
      setCats(Array.isArray(data) ? data : data?.categories || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load categories"
      );
      setCats([]);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchCats();
  }, []);

  const parents = useMemo(() => cats.filter((c) => !idOf(c.parent)), [cats]);

  // Map: parent -> sum of child productCount
  const childCountMap = useMemo(() => {
    const map = new Map();
    for (const c of cats) {
      const pid = idOf(c.parent);
      if (!pid) continue;
      map.set(pid, (map.get(pid) || 0) + (Number(c.productCount) || 0));
    }
    return map;
  }, [cats]);

  const totalForParent = (parent) =>
    (Number(parent.productCount) || 0) + (childCountMap.get(parent._id) || 0);

  // Search (parents only, to keep the tree structure)
  const filteredParents = useMemo(() => {
    const txt = q.trim().toLowerCase();
    if (!txt) return parents;
    return parents.filter((p) => p.name?.toLowerCase().includes(txt));
  }, [parents, q]);

  // Stats
  const stats = useMemo(() => {
    const parentsCount = parents.length;
    const categories = cats.length;
    const childrenCount = Math.max(0, categories - parentsCount);
    const totalProducts = cats.reduce(
      (sum, c) => sum + (Number(c.productCount) || 0),
      0
    );
    return { categories, parentsCount, childrenCount, totalProducts };
  }, [cats, parents]);

  // actions
  const saveCat = async (payload) => {
    try {
      setActionLoading(true);
      if (editing) {
        await api.put(`/categories/${editing._id}`, payload);
      } else {
        await api.post("/categories", payload);
      }
      setShowForm(false);
      setEditing(null);
      await fetchCats();
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save category"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const delCat = async (id) => {
    // 1) Block parent with children
    const hasChildren = cats.some((c) => idOf(c.parent) === id);
    if (hasChildren) {
      alert(
        "This category has child categories. Remove or reassign them before deleting."
      );
      return;
    }

    // 2) Block categories that still have products
    const cat = cats.find((c) => c._id === id);
    const count = Number(cat?.productCount) || 0;
    if (count > 0) {
      alert(
        `This category still has ${count} product${
          count === 1 ? "" : "s"
        }. Move or delete the products first.`
      );
      return;
    }

    if (!window.confirm("Delete this category?")) return;

    try {
      setDeletingId(id);
      await api.delete(`/categories/${id}`);
      await fetchCats();
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete category"
      );
    } finally {
      setDeletingId("");
    }
  };

  const openProducts = async (catId) => {
    try {
      setProdError("");
      setProdLoading(true);
      setProducts([]);
      const { data } = await api.get(`/products`, {
        params: { category: catId },
      });
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.products)
        ? data.products
        : [];
      setProducts(list);
      setProdModal(true);
    } catch (err) {
      setProdError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load products"
      );
      setProducts([]);
      setProdModal(true);
    } finally {
      setProdLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      {/* ===== Header (aligns with other pages) ===== */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div className="d-flex align-items-center flex-wrap gap-2">
          <h2 className="mb-0">Categories</h2>
          <div className="d-flex gap-2 ms-2">
            <span className="badge bg-secondary">
              {fmtInt.format(stats.categories)} total
            </span>
            <span className="badge bg-info">
              {fmtInt.format(stats.parentsCount)} parents
            </span>
            <span className="badge bg-light text-dark">
              {fmtInt.format(stats.childrenCount)} subcategories
            </span>
          </div>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={fetchCats}
          >
            Refresh
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setShowForm(true)}
            disabled={actionLoading}
          >
            + Add Category
          </button>
        </div>
      </div>

      {/* ===== Error ===== */}
      {error && (
        <div
          className="alert alert-danger d-flex justify-content-between align-items-center"
          role="alert"
        >
          <span>{error}</span>
          <button className="btn btn-sm btn-outline-dark" onClick={fetchCats}>
            Retry
          </button>
        </div>
      )}

      {/* ===== Toolbar (light box; search consistent with other pages) ===== */}
      <div className="border rounded p-3 bg-light mb-3">
        <div className="d-flex flex-wrap gap-2 justify-content-between">
          <div className="d-flex gap-2">
            <input
              className="form-control form-control-sm"
              placeholder="Search parent categories…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 260 }}
            />
          </div>
          <div className="text-muted small align-self-center">
            Tip: search matches <strong>parent</strong> category names. Children
            remain visible under each parent.
          </div>
        </div>
      </div>

      {/* ===== Loading / Table ===== */}
      {pageLoading ? (
        <div className="py-5 text-center">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          {/* Summary card (keeps sections visually consistent) */}
          <div className="card mb-3">
            <div className="card-header bg-light">
              <h5 className="mb-0">Summary</h5>
            </div>
            <div className="card-body d-flex justify-content-between align-items-center">
              <span>
                Showing {fmtInt.format(filteredParents.length)} of{" "}
                {fmtInt.format(parents.length)} parent categories
              </span>
              <span>
                Products across all categories:{" "}
                <strong>{fmtInt.format(stats.totalProducts)}</strong>
              </span>
            </div>
          </div>

          {/* Category tree in a card */}
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0">Category Tree</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover table-bordered align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th># Products</th>
                      <th style={{ width: 260 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParents.map((parent) => (
                      <Fragment key={parent._id}>
                        {/* parent row */}
                        <tr className="table-primary">
                          <td>
                            <strong>{parent.name}</strong>
                          </td>
                          <td>{fmtInt.format(totalForParent(parent))}</td>
                          <td>
                            <div className="d-flex flex-wrap gap-2">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => openProducts(parent._id)}
                                disabled={actionLoading}
                                title="View products in this category"
                              >
                                View
                              </button>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => {
                                  setEditing(parent);
                                  setShowForm(true);
                                }}
                                disabled={actionLoading}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => delCat(parent._id)}
                                disabled={
                                  deletingId === parent._id || actionLoading
                                }
                              >
                                {deletingId === parent._id ? (
                                  <>
                                    <Spinner
                                      size="sm"
                                      animation="border"
                                      className="me-1"
                                    />{" "}
                                    Deleting…
                                  </>
                                ) : (
                                  "Delete"
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* children */}
                        {cats
                          .filter((c) => idOf(c.parent) === parent._id)
                          .map((child) => (
                            <tr key={child._id}>
                              <td className="ps-4">— {child.name}</td>
                              <td>
                                {child.productCount != null
                                  ? fmtInt.format(child.productCount)
                                  : "—"}
                              </td>
                              <td>
                                <div className="d-flex flex-wrap gap-2">
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => openProducts(child._id)}
                                    disabled={actionLoading}
                                  >
                                    View
                                  </button>
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => {
                                      setEditing(child);
                                      setShowForm(true);
                                    }}
                                    disabled={actionLoading}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => delCat(child._id)}
                                    disabled={
                                      deletingId === child._id || actionLoading
                                    }
                                  >
                                    {deletingId === child._id ? (
                                      <>
                                        <Spinner
                                          size="sm"
                                          animation="border"
                                          className="me-1"
                                        />{" "}
                                        Deleting…
                                      </>
                                    ) : (
                                      "Delete"
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </Fragment>
                    ))}

                    {filteredParents.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center text-muted">
                          No categories found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* create/edit modal */}
      {showForm && (
        <Modal
          show
          onHide={() => {
            setShowForm(false);
            setEditing(null);
          }}
        >
          <Modal.Header closeButton>
            <Modal.Title>
              {editing ? "Edit Category" : "Add Category"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <CategoryForm
              initial={editing}
              parents={parents}
              onSave={saveCat}
              loading={actionLoading}
            />
          </Modal.Body>
        </Modal>
      )}

      {/* products modal */}
      <Modal size="lg" show={prodModal} onHide={() => setProdModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Products in Category</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {prodLoading ? (
            <div className="py-4 text-center">
              <Spinner animation="border" />
            </div>
          ) : prodError ? (
            <div className="alert alert-danger mb-0" role="alert">
              {prodError}
            </div>
          ) : products.length ? (
            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p._id}>
                      <td>{p.name}</td>
                      <td>{fmtMoney.format(Number(p.price) || 0)}</td>
                      <td>{fmtInt.format(Number(p.stock) || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mb-0">No products found for this category.</p>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
