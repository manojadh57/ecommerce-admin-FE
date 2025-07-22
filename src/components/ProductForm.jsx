import { useEffect, useState } from "react";
import api from "../services/api.js";

export default function ProductForm({ initial, onClose, onSuccess }) {
  const isEdit = Boolean(initial);

  /* ------------ local state ------------ */
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    price: initial?.price ?? "",
    stock: initial?.stock ?? "",
    category: initial?.category?._id ?? initial?.category ?? "",
    description: initial?.description ?? "",
  });
  const [preview, setPreview] = useState(initial?.images?.[0] || "");
  const [file, setFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [err, setErr] = useState("");

  /* ------------ fetch categories once ------------ */
  useEffect(() => {
    api
      .get("/categories")
      .then(({ data }) => setCategories(data.categories ?? data));
  }, []);

  /* ------------ handlers ------------ */
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append("image", file);

      if (isEdit) {
        await api.put(`/products/${initial._id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/products", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      onSuccess(); // refresh list in parent
      onClose();
    } catch (error) {
      setErr(error.response?.data?.message || "Save failed");
    }
  };

  /* ------------ UI ------------ */
  return (
    <div className="modal d-block" style={{ background: "#0008" }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          {/* header */}
          <div className="modal-header">
            <h5 className="modal-title">
              {isEdit ? "Edit Product" : "Add Product"}
            </h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          {/* form */}
          <form onSubmit={handleSubmit}>
            <div className="modal-body row g-3">
              {err && <div className="alert alert-danger w-100">{err}</div>}

              {/* left column */}
              <div className="col-md-7">
                {/* name */}
                <input
                  name="name"
                  className="form-control mb-2"
                  placeholder="Name"
                  value={form.name}
                  onChange={handleChange}
                />
                {/* price */}
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  className="form-control mb-2"
                  placeholder="Price"
                  value={form.price}
                  onChange={handleChange}
                />
                {/* stock */}
                <input
                  name="stock"
                  type="number"
                  className="form-control mb-2"
                  placeholder="Stock"
                  value={form.stock}
                  onChange={handleChange}
                />
                {/* description */}
                <textarea
                  name="description"
                  className="form-control mb-2"
                  placeholder="Description"
                  value={form.description}
                  onChange={handleChange}
                />

                {/* category dropdown */}
                <select
                  name="category"
                  className="form-select mb-2"
                  value={form.category}
                  onChange={handleChange}
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* right column: image */}
              <div className="col-md-5 text-center">
                <img
                  src={preview || "https://via.placeholder.com/250x180"}
                  className="img-fluid mb-2 border"
                  style={{ height: 180, objectFit: "cover" }}
                />
                <input
                  type="file"
                  accept="image/*"
                  className="form-control"
                  onChange={handleFile}
                />
              </div>
            </div>

            {/* footer */}
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button className="btn btn-primary">
                {isEdit ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
