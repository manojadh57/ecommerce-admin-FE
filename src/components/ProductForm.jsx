import { useEffect, useState } from "react";
import api from "../services/api.js";

export default function ProductForm({ initial, onClose, onSuccess }) {
  const isEdit = Boolean(initial);

  //product field//
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    price: initial?.price ?? "",
    stock: initial?.stock ?? "",
    description: initial?.description ?? "",
  });

  const [preview, setPreview] = useState(initial?.images?.[0] || "");
  const [file, setFile] = useState(null);

  //categories states//
  const [categories, setCategories] = useState([]); // all docs
  const [parent, setParent] = useState(""); // chosen parent _id
  const [subCategories, setSubCategories] = useState([]); // children of parent
  const [subCat, setSubCat] = useState(""); // chosen child _id

  const [err, setErr] = useState("");

  //fetch all api
  useEffect(() => {
    api.get("/categories").then(({ data }) => {
      const list = data.categories ?? data; // array
      setCategories(list);

      ///edit the dropdown
      if (isEdit) {
        const catId = initial.category?._id ?? initial.category ?? "";
        const thisCat = list.find((c) => c._id === catId);
        if (thisCat) {
          if (thisCat.parent) {
            // product is under a subcategory
            setParent(thisCat.parent);
            setSubCategories(list.filter((c) => c.parent === thisCat.parent));
            setSubCat(thisCat._id);
          } else {
            //  under a parent category
            setParent(thisCat._id);
          }
        }
      }
    });
  }, []);

  //handler function//
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleParentSelect = (e) => {
    const val = e.target.value;
    setParent(val);
    setSubCategories(categories.filter((c) => c.parent === val));
    setSubCat("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("category", subCat || parent);
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

      onSuccess(); // refresh list in parent page
      onClose(); // close modal
    } catch (error) {
      setErr(error.response?.data?.message || "Save failed");
    }
  };

  //ui//
  return (
    <div className="modal d-block" style={{ background: "#0008" }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {isEdit ? "Edit Product" : "Add Product"}
            </h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="modal-body row g-3">
              {err && <div className="alert alert-danger w-100">{err}</div>}

              <div className="col-md-7">
                <input
                  name="name"
                  className="form-control mb-2"
                  placeholder="Name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  className="form-control mb-2"
                  placeholder="Price"
                  value={form.price}
                  onChange={handleChange}
                  required
                />
                <input
                  name="stock"
                  type="number"
                  className="form-control mb-2"
                  placeholder="Stock"
                  value={form.stock}
                  onChange={handleChange}
                  required
                />
                <textarea
                  name="description"
                  className="form-control mb-2"
                  placeholder="Description"
                  value={form.description}
                  onChange={handleChange}
                />

                <label className="form-label mb-0">Parent Category</label>
                <select
                  className="form-select mb-2"
                  value={parent}
                  onChange={handleParentSelect}
                  required
                >
                  <option value=""> Choose parent </option>
                  {categories
                    .filter((c) => !c.parent)
                    .map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                </select>

                <label className="form-label mb-0">Sub-category</label>
                <select
                  className="form-select mb-2"
                  value={subCat}
                  onChange={(e) => setSubCat(e.target.value)}
                  disabled={!parent}
                >
                  <option value="">
                    {parent
                      ? "-- Choose sub-category --"
                      : "-- Select parent first --"}
                  </option>
                  {subCategories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

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
