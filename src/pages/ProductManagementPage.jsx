import { useEffect, useState } from "react";
import api from "../services/api.js";
import ProductForm from "../components/ProductForm.jsx";

export default function ProductManagementPage() {
  const [products, setProducts] = useState([]);
  const [show, setShow] = useState(false);
  const [editItem, setEdit] = useState(null);

  /** load products from API */
  const fetchProducts = async () => {
    const { data } = await api.get("/products"); // adjust if your backend wraps result
    setProducts(data.products ?? data); // graceful fallback
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onDelete = async (id) => {
    if (!window.confirm("Delete product?")) return;
    await api.delete(`/products/${id}`);
    fetchProducts();
  };

  const onSaveSuccess = () => {
    setShow(false);
    setEdit(null);
    fetchProducts();
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

      <table className="table table-striped">
        <thead>
          <tr>
            <th>Name</th>
            <th>Price ($)</th>
            <th>Stock</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p._id}>
              <td>{p.name}</td>
              <td>{p.price}</td>
              <td>{p.stock}</td>
              <td>
                <button
                  className="btn btn-sm btn-outline-info me-2"
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {show && (
        <ProductForm
          initial={editItem}
          onClose={() => {
            setShow(false);
            setEdit(null);
          }}
          onSuccess={onSaveSuccess}
        />
      )}
    </>
  );
}
