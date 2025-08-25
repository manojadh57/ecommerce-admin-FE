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

  // Search and filter
  const [q, setQ] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // all | low | outOfStock | inStock
  const [sortBy, setSortBy] = useState("name"); // name | price | stock | recent

  // Bulk operations
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);

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
      setSelectedIds(new Set()); // Clear selections on reload
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

  // Toggle selection
  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Select all/none
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p._id)));
    }
  };

  // Bulk delete
  const bulkDelete = async () => {
    if (
      !confirm(
        `Delete ${selectedIds.size} products? This action cannot be undone.`
      )
    )
      return;

    setBulkProcessing(true);
    try {
      const promises = [...selectedIds].map((id) =>
        api.delete(`/products/${id}`)
      );
      const results = await Promise.allSettled(promises);

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      if (failed > 0) {
        alert(`Deleted ${succeeded} products. ${failed} failed.`);
      } else {
        alert(`Successfully deleted ${succeeded} products`);
      }

      setSelectedIds(new Set());
      await load();
    } catch (e) {
      alert("Failed to delete products");
    } finally {
      setBulkProcessing(false);
    }
  };

  // Bulk stock update
  const bulkUpdateStock = async () => {
    const stockChange = prompt("Enter stock adjustment (e.g., +10 or -5):");
    if (!stockChange) return;

    const isIncrease = stockChange.startsWith("+");
    const amount = parseInt(stockChange.replace(/[+-]/g, ""));

    if (isNaN(amount)) {
      alert("Invalid stock adjustment");
      return;
    }

    setBulkProcessing(true);
    try {
      const updates = [...selectedIds].map((id) => {
        const product = items.find((p) => p._id === id);
        if (!product) return Promise.reject();

        const newStock = isIncrease
          ? (product.stock || 0) + amount
          : Math.max(0, (product.stock || 0) - amount);

        // Create FormData for consistency with backend
        const fd = new FormData();
        fd.append("name", product.name);
        fd.append("price", String(product.price));
        fd.append("stock", String(newStock));
        fd.append("description", product.description || "");
        fd.append("category", product.category?._id || product.category || "");

        return api.put(`/products/${id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      });

      const results = await Promise.allSettled(updates);
      const succeeded = results.filter((r) => r.status === "fulfilled").length;

      alert(`Stock updated for ${succeeded} products`);
      setSelectedIds(new Set());
      await load();
    } catch (e) {
      alert("Failed to update stock");
    } finally {
      setBulkProcessing(false);
    }
  };

  // Bulk category update
  const bulkUpdateCategory = async () => {
    const categoryId = prompt("Enter the category ID to assign:");
    if (!categoryId) return;

    setBulkProcessing(true);
    try {
      const updates = [...selectedIds].map((id) => {
        const product = items.find((p) => p._id === id);
        if (!product) return Promise.reject();

        const fd = new FormData();
        fd.append("name", product.name);
        fd.append("price", String(product.price));
        fd.append("stock", String(product.stock));
        fd.append("description", product.description || "");
        fd.append("category", categoryId);

        return api.put(`/products/${id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      });

      await Promise.allSettled(updates);
      alert(`Category updated for ${selectedIds.size} products`);
      setSelectedIds(new Set());
      await load();
    } catch (e) {
      alert("Failed to update categories");
    } finally {
      setBulkProcessing(false);
    }
  };

  // Export selected products
  const exportSelected = () => {
    const toExport =
      selectedIds.size > 0
        ? items.filter((p) => selectedIds.has(p._id))
        : filtered;

    const csv = [
      [
        "ID",
        "Name",
        "Price",
        "Stock",
        "Category",
        "Description",
        "Created Date",
      ].join(","),
      ...toExport.map((p) =>
        [
          p._id,
          `"${(p.name || "").replace(/"/g, '""')}"`,
          p.price || 0,
          p.stock || 0,
          `"${(p.category?.name || "").replace(/"/g, '""')}"`,
          `"${(p.description || "").replace(/"/g, '""')}"`,
          p.createdAt ? new Date(p.createdAt).toISOString() : "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products_export_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Execute bulk action
  const executeBulkAction = () => {
    if (selectedIds.size === 0 && bulkAction !== "export") {
      alert("No products selected");
      return;
    }

    switch (bulkAction) {
      case "delete":
        bulkDelete();
        break;
      case "updateStock":
        bulkUpdateStock();
        break;
      case "updateCategory":
        bulkUpdateCategory();
        break;
      case "export":
        exportSelected();
        break;
      default:
        alert("Please select an action");
    }
    setBulkAction("");
  };

  // Filtering and sorting
  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();

    // First apply text search
    let result = items.filter(
      (p) =>
        !text ||
        (p.name || "").toLowerCase().includes(text) ||
        (p.sku || "").toLowerCase().includes(text) ||
        (p.description || "").toLowerCase().includes(text) ||
        (p.category?.name || "").toLowerCase().includes(text)
    );

    // Then apply stock filter
    switch (stockFilter) {
      case "low":
        result = result.filter((p) => p.stock > 0 && p.stock <= 5);
        break;
      case "outOfStock":
        result = result.filter((p) => p.stock === 0);
        break;
      case "inStock":
        result = result.filter((p) => p.stock > 5);
        break;
    }

    // Finally apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "price":
          return (a.price || 0) - (b.price || 0);
        case "stock":
          return (a.stock || 0) - (b.stock || 0);
        case "recent":
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [items, q, stockFilter, sortBy]);

  // Stats for header
  const stats = useMemo(
    () => ({
      total: items.length,
      lowStock: items.filter((p) => p.stock > 0 && p.stock <= 5).length,
      outOfStock: items.filter((p) => p.stock === 0).length,
      totalValue: items.reduce(
        (sum, p) => sum + (p.price || 0) * (p.stock || 0),
        0
      ),
    }),
    [items]
  );

  const thumbStyle = {
    width: 48,
    height: 48,
    objectFit: "cover",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "#f5f5f5",
    display: "block",
  };

  const getStockBadge = (stock) => {
    if (stock === 0) return { bg: "#dc3545", text: "Out of Stock" };
    if (stock <= 5) return { bg: "#ffc107", text: `Low (${stock})` };
    return { bg: "#28a745", text: stock };
  };

  return (
    <>
      {/* Header */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h3 className="mb-0">Products</h3>

        {/* Stats badges */}
        <div className="d-flex gap-2 ms-3">
          <span className="badge bg-secondary">{stats.total} total</span>
          {stats.outOfStock > 0 && (
            <span className="badge bg-danger">
              {stats.outOfStock} out of stock
            </span>
          )}
          {stats.lowStock > 0 && (
            <span className="badge bg-warning text-dark">
              {stats.lowStock} low stock
            </span>
          )}
        </div>

        <div className="ms-auto d-flex gap-2 flex-wrap">
          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <>
              <span className="badge bg-info align-self-center">
                {selectedIds.size} selected
              </span>
              <select
                className="form-select form-select-sm"
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                style={{ width: 180 }}
                disabled={bulkProcessing}
              >
                <option value="">Bulk actions...</option>
                <option value="delete">Delete selected</option>
                <option value="updateStock">Update stock</option>
                <option value="updateCategory">Change category</option>
                <option value="export">Export selected</option>
              </select>
              <button
                className="btn btn-sm btn-warning"
                onClick={executeBulkAction}
                disabled={bulkProcessing}
              >
                {bulkProcessing ? "Processing..." : "Apply"}
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setSelectedIds(new Set())}
                disabled={bulkProcessing}
              >
                Clear
              </button>
            </>
          )}

          {/* Search and filters */}
          <input
            className="form-control"
            placeholder="Search products..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 200 }}
          />

          <select
            className="form-select"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            title="Filter by stock"
            style={{ width: 140 }}
          >
            <option value="all">All stock</option>
            <option value="inStock">In stock</option>
            <option value="low">Low stock</option>
            <option value="outOfStock">Out of stock</option>
          </select>

          <select
            className="form-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            title="Sort by"
            style={{ width: 120 }}
          >
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="stock">Stock</option>
            <option value="recent">Recent</option>
          </select>

          <button className="btn btn-outline-secondary" onClick={load}>
            Refresh
          </button>

          {items.length > 0 && (
            <button
              className="btn btn-outline-success"
              onClick={exportSelected}
              title="Export all products"
            >
              Export
            </button>
          )}

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
        <div className="py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading products...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-5 text-center text-muted">
          <h5>No products found</h5>
          <p>
            {q || stockFilter !== "all"
              ? "Try adjusting your filters"
              : "Click 'Add Product' to create your first product"}
          </p>
        </div>
      ) : (
        <>
          {/* Summary info */}
          <div className="alert alert-light d-flex justify-content-between align-items-center">
            <span>
              Showing {filtered.length} of {items.length} products
            </span>
            <span>
              Total inventory value:{" "}
              <strong>${stats.totalValue.toFixed(2)}</strong>
            </span>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={
                        filtered.length > 0 &&
                        selectedIds.size === filtered.length
                      }
                      onChange={toggleSelectAll}
                      disabled={bulkProcessing}
                    />
                  </th>
                  <th style={{ width: 60 }}></th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Category</th>
                  <th>Created</th>
                  <th style={{ width: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const firstImg =
                    Array.isArray(p.images) && p.images.length
                      ? p.images[0]
                      : "";
                  const img = firstImg ? normalizeImagePath(firstImg) : "";
                  const stockBadge = getStockBadge(p.stock || 0);

                  return (
                    <tr
                      key={p._id}
                      className={selectedIds.has(p._id) ? "table-active" : ""}
                    >
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedIds.has(p._id)}
                          onChange={() => toggleSelect(p._id)}
                          disabled={bulkProcessing}
                        />
                      </td>

                      <td>
                        <img
                          src={
                            img || "https://placehold.co/96x96?text=No+Image"
                          }
                          alt=""
                          style={thumbStyle}
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://placehold.co/96x96?text=No+Image";
                          }}
                        />
                      </td>

                      <td>
                        <div>
                          <div
                            className="fw-semibold text-truncate"
                            style={{ maxWidth: 280 }}
                          >
                            {p.name || "—"}
                          </div>
                          {p.description && (
                            <small
                              className="text-muted text-truncate d-block"
                              style={{ maxWidth: 280 }}
                            >
                              {p.description}
                            </small>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="fw-semibold">
                          ${Number(p.price || 0).toFixed(2)}
                        </span>
                      </td>

                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: stockBadge.bg,
                            color: "#fff",
                          }}
                        >
                          {stockBadge.text}
                        </span>
                      </td>

                      <td className="text-truncate" style={{ maxWidth: 150 }}>
                        {p.category?.name || "—"}
                      </td>

                      <td>
                        <small className="text-muted">
                          {p.createdAt
                            ? new Date(p.createdAt).toLocaleDateString()
                            : "—"}
                        </small>
                      </td>

                      <td>
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => {
                              setEdit(p);
                              setShow(true);
                            }}
                            title="Edit product"
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => onDelete(p._id)}
                            title="Delete product"
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
        </>
      )}

      {/* Form modal */}
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
