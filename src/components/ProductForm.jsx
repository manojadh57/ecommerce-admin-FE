import { useEffect, useMemo, useState } from "react";
import api from "../services/api.js";

export default function ProductForm({ initial, onClose, onSuccess }) {
  const isEdit = Boolean(initial);

  // form fields
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    price: initial?.price ?? "",
    stock: initial?.stock ?? "",
    description: initial?.description ?? "",
  });

  // category state
  const [categories, setCategories] = useState([]);
  const parents = useMemo(
    () => categories.filter((c) => !c.parent),
    [categories]
  );
  const [parentId, setParentId] = useState("");
  const children = useMemo(
    () => categories.filter((c) => c.parent === parentId),
    [categories, parentId]
  );
  const [childId, setChildId] = useState("");

  // image
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(
    initial?.images?.[0]
      ? initial.images[0].startsWith("http")
        ? initial.images[0]
        : (import.meta.env.VITE_ROOT_URL || "http://localhost:8000") +
          "/" +
          initial.images[0]
      : ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // load categories once
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/categories");
        setCategories(Array.isArray(data) ? data : data?.categories || []);
      } catch (e) {
        setCategories([]);
      }
    })();
  }, []);

  // when categories load in edit mode, infer parent/child selection
  useEffect(() => {
    if (!isEdit || !categories.length || !initial?.category) return;
    const selected = categories.find((c) => c._id === initial.category);
    if (!selected) return;

    if (selected.parent) {
      setParentId(selected.parent);
      setChildId(selected._id);
    } else {
      setParentId(selected._id);
      setChildId("");
    }
  }, [isEdit, categories, initial?.category]);

  // handlers
  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");

      const category = childId || parentId || initial?.category || "";
      if (!category) throw new Error("Please select a category.");

      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("price", String(form.price));
      fd.append("stock", String(form.stock));
      fd.append("description", form.description || "");
      fd.append("category", category);
      if (file) fd.append("image", file); // backend expects single file via multer

      if (isEdit) {
        await api.put(`/products/${initial._id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/products", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100"
      style={{ background: "rgba(0,0,0,0.4)", zIndex: 1050 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="container py-5">
        <div
          className="bg-white rounded-3 shadow p-4 mx-auto"
          style={{ maxWidth: 720 }}
        >
          <h5 className="mb-3">{isEdit ? "Edit product" : "Create product"}</h5>

          {error && <div className="alert alert-danger py-2">{error}</div>}

          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Name</label>
              <input
                className="form-control"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Price</label>
              <input
                className="form-control"
                type="number"
                step="0.01"
                min="0"
                name="price"
                value={form.price}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Stock</label>
              <input
                className="form-control"
                type="number"
                min="0"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-12">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows="3"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Optional"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Parent category</label>
              <select
                className="form-select"
                value={parentId}
                onChange={(e) => {
                  setParentId(e.target.value);
                  setChildId("");
                }}
                required
              >
                <option value="">-- Select parent --</option>
                {parents.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Subcategory (optional)</label>
              <select
                className="form-select"
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                disabled={!parentId || children.length === 0}
              >
                <option value="">-- None --</option>
                {children.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="form-text">
                If selected, product will be saved under the subcategory.
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label">Image</label>
              <input
                className="form-control"
                type="file"
                accept="image/*"
                onChange={handleFile}
              />
              <div className="form-text">JPEG/PNG up to ~5MB.</div>
            </div>

            <div className="col-md-6 d-flex align-items-end">
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="rounded border object-fit-cover"
                  style={{ width: 160, height: 120 }}
                />
              ) : (
                <div className="text-muted">No image selected</div>
              )}
            </div>

            <div className="col-12 d-flex justify-content-end gap-2 pt-3">
              <button type="button" className="btn btn-light" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={saving}>
                {saving
                  ? isEdit
                    ? "Updating..."
                    : "Creating..."
                  : isEdit
                  ? "Update"
                  : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
