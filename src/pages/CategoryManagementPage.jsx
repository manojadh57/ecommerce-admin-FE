import { useState, useEffect, Fragment, useMemo } from "react";
import { Table, Button, Modal, Spinner, Alert } from "react-bootstrap";
import api from "../services/api";
import CategoryForm from "../components/CategoryForm";

/* ---------- formatters ---------- */
const LOCALE = import.meta.env.VITE_LOCALE || "en-AU";
const CURRENCY = (import.meta.env.VITE_CURRENCY || "AUD").toUpperCase();

const fmtInt = new Intl.NumberFormat(LOCALE); // 1,234
const fmtMoney = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/* ---------- helpers ---------- */
function idOf(parentLike) {
  // Accept: string | {_id:string} | null/undefined
  if (!parentLike) return null;
  if (typeof parentLike === "string") return parentLike;
  if (typeof parentLike === "object" && parentLike._id) return parentLike._id;
  return null;
}

export default function CategoryManagementPage() {
  /* ---------- state ---------- */
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

  /* ---------- data load ---------- */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- derived sets ---------- */
  const parents = useMemo(() => cats.filter((c) => !idOf(c.parent)), [cats]);

  // Map: parentId -> sum(child.productCount)
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

  /* ---------- actions ---------- */
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

  /* ---------- render ---------- */
  return (
    <>
      {/* header */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h3 className="mb-0">Categories</h3>

        <div className="ms-auto d-flex gap-2">
          <input
            className="form-control"
            placeholder="Search categories"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 260 }}
          />
          <Button onClick={fetchCats} variant="outline-secondary">
            Refresh
          </Button>
          <Button onClick={() => setShowForm(true)} disabled={actionLoading}>
            + Add Category
          </Button>
        </div>
      </div>

      {/* errors */}
      {error && (
        <Alert
          variant="danger"
          className="d-flex justify-content-between align-items-center"
        >
          <span>{error}</span>
          <Button size="sm" variant="outline-dark" onClick={fetchCats}>
            Retry
          </Button>
        </Alert>
      )}

      {/* table */}
      {pageLoading ? (
        <div className="py-5 text-center">
          <Spinner animation="border" />
        </div>
      ) : (
        <div className="table-responsive">
          <Table bordered hover className="align-middle">
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
                        <Button
                          size="sm"
                          onClick={() => openProducts(parent._id)}
                          disabled={actionLoading}
                          title="View products in this category"
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditing(parent);
                            setShowForm(true);
                          }}
                          disabled={actionLoading}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => delCat(parent._id)}
                          disabled={deletingId === parent._id || actionLoading}
                        >
                          {deletingId === parent._id ? (
                            <>
                              <Spinner
                                size="sm"
                                animation="border"
                                className="me-1"
                              />
                              Deleting…
                            </>
                          ) : (
                            "Delete"
                          )}
                        </Button>
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
                            <Button
                              size="sm"
                              onClick={() => openProducts(child._id)}
                              disabled={actionLoading}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setEditing(child);
                                setShowForm(true);
                              }}
                              disabled={actionLoading}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
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
                                  />
                                  Deleting…
                                </>
                              ) : (
                                "Delete"
                              )}
                            </Button>
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
          </Table>
        </div>
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
            <Alert variant="danger">{prodError}</Alert>
          ) : products.length ? (
            <Table bordered hover>
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
            </Table>
          ) : (
            <p className="mb-0">No products found for this category.</p>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
