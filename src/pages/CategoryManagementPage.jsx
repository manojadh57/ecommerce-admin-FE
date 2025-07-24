import { useEffect, useState } from "react";
import { Table, Spinner, Button, Modal, Alert } from "react-bootstrap";
import api from "../services/api";
import CategoryForm from "../components/CategoryForm";

export default function CategoryManagementPage() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [prodModal, setProdModal] = useState(false);
  const [products, setProducts] = useState([]);

  const getCats = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/categories");
      setCats(Array.isArray(data) ? data : data.categories || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCats();
  }, []);

  const saveCat = async (payload) => {
    try {
      editing
        ? await api.put(`/categories/${editing._id}`, payload)
        : await api.post("/categories", payload);

      setShowForm(false);
      setEditing(null);
      getCats();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const delCat = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    await api.delete(`/categories/${id}`);
    getCats();
  };

  const openProducts = async (id) => {
    const { data } = await api.get(`/products?category=${id}`);
    setProducts(Array.isArray(data) ? data : data.products || []);
    setProdModal(true);
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Categories</h3>
        <Button onClick={() => setShowForm(true)}>+ Add Category</Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <Spinner animation="border" />
      ) : (
        <Table hover bordered responsive>
          <thead>
            <tr>
              <th>Name</th>
              <th># Products</th>
              <th style={{ width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c._id}>
                <td>{c.name}</td>
                <td>{c.productCount ?? "—"}</td>
                <td>
                  <Button
                    size="sm"
                    variant="info"
                    onClick={() => openProducts(c._id)}
                  >
                    View
                  </Button>{" "}
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditing(c);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </Button>{" "}
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => delCat(c._id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

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
            <CategoryForm initial={editing} onSave={saveCat} />
          </Modal.Body>
        </Modal>
      )}

      <Modal size="lg" show={prodModal} onHide={() => setProdModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Products in Category</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {products.length ? (
            <Table bordered>
              <thead>
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
                    <td>${p.price}</td>
                    <td>{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p>No products found.</p>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
