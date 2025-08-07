import { useEffect, useState } from "react";
import { Button, Form, FormControl, Table, Image } from "react-bootstrap";
import { Trash } from "react-bootstrap-icons";
import { useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import {
  deleteProductAction,
  getProductsAction,
} from "../redux/product/productActions";

const ProductTable = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { products } = useSelector((state) => state.product);
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  useEffect(() => {
    dispatch(getProductsAction());
  }, [dispatch]);

  const handleDelete = (_id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      dispatch(deleteProductAction(_id));
    }
  };

  const handleCheckboxChange = (productId) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = products.map((product) => product._id);
      setSelectedProductIds(allIds);
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedProductIds.length === 0) return;
    if (window.confirm("Delete selected products?")) {
      selectedProductIds.forEach((id) => dispatch(deleteProductAction(id)));
      setSelectedProductIds([]);
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center m-3">
        <h4>Product List</h4>
        <Button
          variant="primary"
          className="rounded-pill"
          onClick={() => navigate("/admin/new-products")}
        >
          + New Product
        </Button>
      </div>

      <Form className="d-flex justify-content-center gap-2 mb-3">
        <FormControl
          type="text"
          placeholder="Search products..."
          className="w-50 rounded"
        />
        <Button variant="outline-primary">Filter</Button>
        {selectedProductIds.length > 0 && (
          <Button variant="danger" onClick={handleBulkDelete} className="ms-2">
            Delete Selected
          </Button>
        )}
      </Form>

      <Table hover responsive className="text-center align-middle">
        <thead className="table-light">
          <tr>
            <th>
              <input
                type="checkbox"
                onChange={handleSelectAll}
                checked={
                  products.length > 0 &&
                  selectedProductIds.length === products.length
                }
              />
            </th>

            <th>Name</th>
            <th>Price</th>
            <th>Inventory</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.length > 0 ? (
            products.map((product, index) => (
              <tr
                key={product._id || index}
                onClick={(e) => {
                  if (!e.target.closest(".prevent-row-click")) {
                    navigate(`/admin/product/${product._id}`);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <td className="prevent-row-click" style={{ width: "50px" }}>
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(product._id)}
                    onChange={() => handleCheckboxChange(product._id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>

                <td className="d-flex align-items-center gap-3">
                  <Image
                    src={product.thumbnail || product.image || "/default.png"}
                    alt="Product"
                    width="50"
                    height="50"
                    rounded
                  />
                  {product.name}
                </td>

                <td>${product.price}</td>
                <td>{product.stock || 0}</td>

                <td className="prevent-row-click">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(product._id);
                    }}
                    style={{ padding: "8px", cursor: "pointer" }}
                  >
                    <Trash className="text-danger" size={20} />
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center">
                No products found.
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
};

export default ProductTable;