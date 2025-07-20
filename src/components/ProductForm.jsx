import { useState } from "react";
import api from "../services/api.js";

export default function ProductForm({ initial, onClose, onSuccess }) {
  const isEdit = Boolean(initial);

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    price: initial?.price ?? "",
    stock: initial?.stock ?? "",
    category: initial?.category ?? "",
    description: initial?.description ?? "",
  });
  const [err, setErr] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.put(`/products/${initial._id}`, form);
      } else {
        await api.post("/products", form);
      }
      onSuccess();
    } catch (error) {
      setErr(error.response?.data?.message || "Save failed");
    }
  };

  return (
    <div
      className="modal d-block"
      tabIndex="-1"
      style={{ background: "#0008" }}
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {isEdit ? "Edit Product" : "Add Product"}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {err && <div className="alert alert-danger">{err}</div>}

              {[
                ["name", "Name"],
                ["price", "Price"],
                ["stock", "Stock"],
                ["category", "Category Id"],
                ["description", "Description"],
              ].map(([key, label]) => (
                <input
                  key={key}
                  name={key}
                  placeholder={label}
                  className="form-control mb-2"
                  value={form[key]}
                  onChange={handleChange}
                />
              ))}
            </div>

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
