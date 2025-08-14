import { useState, useEffect, Fragment } from "react";
import { Table, Button, Modal, Spinner, Alert } from "react-bootstrap";
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

  const fetchCats = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/categories");
      setCats(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCats();
  }, []);

  const saveCat = async (payload) => {
    editing
      ? await api.put(`/categories/${editing._id}`, payload)
      : await api.post("/categories", payload);

    setShowForm(false);
    setEditing(null);
    fetchCats();
  };

  const delCat = async (id) => {
    if (window.confirm("Delete category?")) {
      await api.delete(`/categories/${id}`);
      fetchCats();
    }
  };

  const openProducts = async (catId) => {
    const { data } = await api.get(`/products?category=${catId}`);
    setProducts(data);
    setProdModal(true);
  };

  const parents = cats.filter((c) => !c.parent);

  const totalForParent = (parent) => {
    const childSum = cats
      .filter((c) => c.parent === parent._id)
      .reduce((sum, c) => sum + (c.productCount || 0), 0);

    return (parent.productCount || 0) + childSum;
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Categories</h3>
        <Button onClick={() => setShowForm(true)}>+ Add Category</Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
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
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {parents.map((parent) => (
                <Fragment key={parent._id}>
                  <tr className="table-primary">
                    <td>
                      <strong>{parent.name}</strong>
                    </td>
                    <td>{totalForParent(parent)}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => openProducts(parent._id)}
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
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => delCat(parent._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {cats
                    .filter((c) => c.parent === parent._id)
                    .map((child) => (
                      <tr key={child._id}>
                        <td className="ps-4">— {child.name}</td>
                        <td>{child.productCount ?? "—"}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => openProducts(child._id)}
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
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => delCat(child._id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </Table>
        </div>
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
            <CategoryForm
              initial={editing}
              parents={parents}
              onSave={saveCat}
            />
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
                    <td>${p.price}</td>
                    <td>{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p>No products found for this category.</p>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
