import { useEffect, useState } from "react";
import api from "../services/api.js";
import ProductForm from "../components/ProductForm.jsx";
import ProductCard from "../components/ProductCard.jsx";

export default function ProductManagementPage() {
  const [items, setItems] = useState([]);
  const [show, setShow] = useState(false);
  const [editItem, setEdit] = useState(null);

  const load = async () => {
    const { data } = await api.get("/products");
    setItems(data.products ?? data);
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id) => {
    if (!window.confirm("Delete product?")) return;
    await api.delete(`/products/${id}`);
    load();
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Products</h2>
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

      <div className="row">
        {items.map((p) => (
          <ProductCard
            key={p._id}
            item={p}
            onEdit={(prod) => {
              setEdit(prod);
              setShow(true);
            }}
            onDelete={onDelete}
          />
        ))}
      </div>

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
