import { useState, useEffect, Fragment } from "react";
import { Table, Button, Modal, Spinner, Alert } from "react-bootstrap";
import api from "../services/api";
// CategoryForm is not needed for Order Management. Removed.

export default function OrderManagementPage() {
  // states
  const [orders, setOrders] = useState([]); // Corrected to setOrders for consistency
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // showForm and editing states are not needed as there's no add/edit form. Removed.

  const [showOrderItemsModal, setShowOrderItemsModal] = useState(false);
  const [selectedOrderItems, setSelectedOrderItems] = useState([]); // To display items within an order

  // fetch api
  const fetchOrders = async () => { 
    try {
      setLoading(true);
      const { data } = await api.get("/orders");
      console.log("data:", data)
      setOrders(data.orders); // Using setOrders
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // CRUD operations
  // saveOrder function is not needed as there's no add/edit functionality. Removed.

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [newStatus, setNewStatus] = useState("");



  // The UI
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Order </h3> 
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <Spinner animation="border" />
      ) : (
        <Table bordered hover responsive>
          <thead>
            <tr>
                <th>Order ID</th>
                <th>Customer Id</th>
                <th>Total Amount</th>
                <th style={{ width: 250 }}>Status</th>
                <th>Order Date</th>
                <th style={{ width: 250 }}>Actions</th> {/* Adjusted width as 'Edit' is gone */}
            </tr>
          </thead>

          <tbody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order._id}>
                  <td>{order._id}</td>
                  <td>{order.userId?.fName} {order.userId?.lName}</td>
                  <td>${order.totalAmount ? order.totalAmount.toFixed(2) : "0.00"}</td>{" "}
                  {/* This is a button that changes the status of the order */}
                  <td>
                      <Button
                      size="sm"
                      variant="info"
                      onClick={() => {
                        setSelectedOrderId(order._id);
                        setNewStatus(order.status || "pending");
                        setShowStatusModal(true);
                      }}
                    >
                      {order.status || "Pending"}
                    </Button>
                    </td>{" "}
                   
                  <td>
                    {order.orderDate
                      ? new Date(order.orderDate).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td>
                    <Button
                        size="sm"
                        onClick={() => {
                        setSelectedOrderId(order._id);
                        setNewStatus(order.status || "pending");
                        setShowOrderItemsModal(true);
                      }}
                    >
                      View Items
                    </Button>{" "}

                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}

      {/* The Order item Modal*/}

      <Modal
        size="lg"
        show={showOrderItemsModal}
        onHide={() => setShowOrderItemsModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Order Items</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrderItems.length ? (
            <Table bordered>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Quantity</th>
                  <th>Price per Item</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrderItems.map((item, index) => (
                  <tr key={index}>
                    <td>{item.productName || "N/A"}</td>{" "}
                    <td>{item.quantity || 0}</td>{" "}
                    <td>${item.price ? item.price.toFixed(2) : "0.00"}</td>{" "}
                    <td>
                      $
                      {(item.quantity && item.price
                        ? item.quantity * item.price
                        : 0
                      ).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p>No items found for this order.</p>
          )}
        </Modal.Body>
      </Modal>


{/* Order status changing modal  */}
      <Modal
        show={showStatusModal}
        onHide={() => setShowStatusModal(false)}
      >
      <Modal.Header closeButton>
      <Modal.Title>Change Order Status</Modal.Title>
      </Modal.Header>
       <Modal.Body>
          <div className="mb-3">
            <label>Select new status:</label>
            <select
              className="form-control"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={async () => {
           try {
             await api.put(`/orders/${selectedOrderId}/status`, { status: newStatus });
             setShowStatusModal(false);
             fetchOrders();
            } catch (err) {
              setError(err.response?.data?.message || err.message);
            }
         }}
         >
         Save
        </Button>
      </Modal.Footer>
      </Modal>

    </>
  );
}