import { useEffect, useMemo, useState } from "react";
import api from "../services/api.js";

// helpers
function toNumber(x, d = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
}
function idOf(userLike) {
  if (!userLike) return null;
  if (typeof userLike === "string") return userLike;
  if (typeof userLike === "object" && userLike._id) return userLike._id;
  return null;
}

export default function AdminDashboardOverview() {
  // state
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("30d"); // "7d" | "30d" | "90d" | "all"

  // ===== Load =====
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");
      const [ordersRes, productsRes, reviewsRes] = await Promise.all([
        api.get("/orders"),
        api.get("/products"),
        api.get("/reviews"),
      ]);
      const ordersData = Array.isArray(ordersRes.data)
        ? ordersRes.data
        : ordersRes.data?.orders || [];
      const productsData = Array.isArray(productsRes.data)
        ? productsRes.data
        : productsRes.data?.products || [];
      const reviewsData = Array.isArray(reviewsRes.data)
        ? reviewsRes.data
        : reviewsRes.data?.reviews || [];
      setOrders(ordersData);
      setProducts(productsData);
      setReviews(reviewsData);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Time range
  const now = useMemo(() => new Date(), []);
  const fromDate = useMemo(() => {
    if (range === "all") return null;
    const d = new Date();
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    d.setDate(d.getDate() - days);
    return d;
  }, [range]);

  const inRange = (iso) => {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return false;
    if (!fromDate) return dt <= now;
    return dt >= fromDate && dt <= now;
  };

  const currentOrders = useMemo(
    () => orders.filter((o) => inRange(o.createdAt)),
    [orders, fromDate, now]
  );

  // Currency & formatting
  const CURRENCY =
    orders[0]?.currency || import.meta.env.VITE_CURRENCY || "AUD";

  const money = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: CURRENCY,
        maximumFractionDigits: 2,
      }),
    [CURRENCY]
  );

  // Revenue order check
  const isRevenueOrder = (o) => {
    const s = String(o.status || "").toLowerCase();
    const p = String(o.paymentStatus || "").toLowerCase();
    const refunded = Boolean(o.refunded) || toNumber(o.refundAmount) > 0;

    const okStatus =
      ["paid", "processing", "shipped", "delivered", "completed"].includes(s) ||
      ["paid", "captured", "succeeded"].includes(p);

    const badStatus = ["cancelled", "canceled", "failed", "refunded"].includes(
      s
    );

    return okStatus && !badStatus && !refunded;
  };

  // Simple order total calculation
  const orderTotal = (o) => {
    const t = toNumber(o.totalAmount);
    if (t > 0) {
      return t >= 1000 ? t / 100 : t;
    }

    // Fallback: compute from items (assumed dollars)
    const items = o.products || o.items || [];
    const itemsTotal = items.reduce((sum, it) => {
      const unit =
        toNumber(it.price) ||
        toNumber(it.unitPrice) ||
        toNumber(it.product?.price);
      const qty = toNumber(it.quantity ?? it.qty, 1);
      return sum + unit * qty;
    }, 0);
    const shipping = toNumber(o.shippingFee ?? o.shipping);
    const tax = toNumber(o.tax ?? o.taxAmount);
    const discount = toNumber(o.discount ?? o.discountAmount);
    return itemsTotal + shipping + tax - discount;
  };

  // Current period revenue & stats
  const revenueOrders = useMemo(
    () => currentOrders.filter(isRevenueOrder),
    [currentOrders]
  );

  const grossRevenue = useMemo(
    () => revenueOrders.reduce((sum, o) => sum + orderTotal(o), 0),
    [revenueOrders]
  );

  // refunds may also be stored in cents; use the same simple rule
  const refunds = useMemo(
    () =>
      currentOrders.reduce((sum, o) => {
        const r = toNumber(o.refundAmount);
        if (!r) return sum;
        return sum + (r >= 1000 ? r / 100 : r);
      }, 0),
    [currentOrders]
  );

  const netRevenue = Math.max(0, grossRevenue - refunds);

  const totalOrders = currentOrders.length;
  const pendingOrders = currentOrders.filter(
    (o) => String(o.status || "").toLowerCase() === "pending"
  ).length;
  const deliveredOrders = currentOrders.filter((o) =>
    ["delivered", "completed"].includes(String(o.status || "").toLowerCase())
  ).length;

  const avgOrderValue =
    revenueOrders.length > 0 ? grossRevenue / revenueOrders.length : 0;

  // Units sold & unique customers
  const unitsSold = useMemo(() => {
    let units = 0;
    for (const o of revenueOrders) {
      const items = o.products || o.items || [];
      for (const it of items) units += toNumber(it.quantity ?? it.qty, 1);
    }
    return units;
  }, [revenueOrders]);

  const uniqueCustomers = useMemo(() => {
    const set = new Set();
    for (const o of currentOrders) {
      const id = idOf(o.userId);
      if (id) set.add(id);
    }
    return set.size;
  }, [currentOrders]);

  // Previous period trend
  const prevOrders = useMemo(() => {
    if (!fromDate) return [];
    const days = Math.ceil((now - fromDate) / (1000 * 60 * 60 * 24));
    const prevStart = new Date(fromDate);
    prevStart.setDate(prevStart.getDate() - days);
    const prevEnd = new Date(fromDate);

    return orders.filter((o) => {
      const dt = new Date(o.createdAt);
      return dt >= prevStart && dt < prevEnd;
    });
  }, [orders, fromDate, now]);

  const prevRevenue = useMemo(
    () =>
      prevOrders
        .filter(isRevenueOrder)
        .reduce((sum, o) => sum + orderTotal(o), 0),
    [prevOrders]
  );

  const revenueDeltaPct =
    prevRevenue > 0 ? ((grossRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  // Other lists
  const lowStockProducts = products.filter(
    (p) => toNumber(p.stock) <= 5 && toNumber(p.stock) > 0
  );
  const outOfStockProducts = products.filter(
    (p) => toNumber(p.stock) === 0
  ).length;

  const recentOrders = useMemo(
    () =>
      [...currentOrders]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5),
    [currentOrders]
  );

  const lowStockList = useMemo(
    () => lowStockProducts.slice(0, 5),
    [lowStockProducts]
  );

  const pendingReviews = reviews.filter((r) => !r.approved).length;

  const getStatusColor = (status) => {
    switch (String(status || "").toLowerCase()) {
      case "pending":
        return "warning";
      case "processing":
      case "shipped":
        return "info";
      case "delivered":
      case "completed":
        return "success";
      case "cancelled":
      case "canceled":
      case "failed":
      case "refunded":
        return "danger";
      default:
        return "secondary";
    }
  };

  return (
    <div className="container-fluid">
      {/* Title + Actions */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <h2 className="mb-0">Admin Dashboard</h2>
        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            aria-label="Select time range"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={loadDashboardData}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible" role="alert">
          <strong>Error:</strong> {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError("")}
          ></button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading dashboard data...</p>
        </div>
      ) : (
        <>
          {/* ===== KPI Row ===== */}
          <div className="row mb-4">
            <div className="col-md-3 mb-3">
              <div className="card text-white bg-primary">
                <div className="card-body">
                  <h5 className="card-title d-flex justify-content-between">
                    <span>Gross Revenue</span>
                    <span className="badge bg-light text-dark">{range}</span>
                  </h5>
                  <h3 className="mb-1">{money.format(grossRevenue)}</h3>
                  <small
                    className={
                      revenueDeltaPct >= 0 ? "text-light" : "text-warning"
                    }
                  >
                    {prevRevenue > 0
                      ? `${revenueDeltaPct >= 0 ? "▲" : "▼"} ${Math.abs(
                          revenueDeltaPct
                        ).toFixed(1)}% vs prev`
                      : "No prior period"}
                  </small>
                </div>
              </div>
            </div>

            <div className="col-md-3 mb-3">
              <div className="card text-white bg-dark">
                <div className="card-body">
                  <h5 className="card-title">Net Revenue</h5>
                  <h3 className="mb-1">{money.format(netRevenue)}</h3>
                  <small>{money.format(refunds)} in refunds</small>
                </div>
              </div>
            </div>

            <div className="col-md-3 mb-3">
              <div className="card text-white bg-success">
                <div className="card-body">
                  <h5 className="card-title">Orders</h5>
                  <h3 className="mb-1">{currentOrders.length}</h3>
                  <small>{pendingOrders} pending</small>
                </div>
              </div>
            </div>

            <div className="col-md-3 mb-3">
              <div className="card text-white bg-info">
                <div className="card-body">
                  <h5 className="card-title">AOV / Units / Customers</h5>
                  <h6 className="mb-1">{money.format(avgOrderValue)} AOV</h6>
                  <small className="d-block">{unitsSold} units sold</small>
                  <small className="d-block">{uniqueCustomers} customers</small>
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-4">
            {/* Order Stats */}
            <div className="col-md-6 mb-3">
              <div className="card">
                <div className="card-header bg-light">
                  <h5 className="mb-0">Order Statistics</h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-6">
                      <p className="mb-2">
                        <strong>Delivered/Completed:</strong>
                        <br />
                        {deliveredOrders} (
                        {totalOrders > 0
                          ? ((deliveredOrders / totalOrders) * 100).toFixed(1)
                          : 0}
                        %)
                      </p>
                      <p className="mb-2">
                        <strong>Pending:</strong>
                        <br />
                        {pendingOrders} (
                        {totalOrders > 0
                          ? ((pendingOrders / totalOrders) * 100).toFixed(1)
                          : 0}
                        %)
                      </p>
                    </div>
                    <div className="col-6">
                      <p className="mb-2">
                        <strong>Gross Revenue:</strong>
                        <br />
                        {money.format(grossRevenue)}
                      </p>
                      <p className="mb-2">
                        <strong>Average Order Value:</strong>
                        <br />
                        {money.format(avgOrderValue)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Stats */}
            <div className="col-md-6 mb-3">
              <div className="card">
                <div className="card-header bg-light">
                  <h5 className="mb-0">Inventory Statistics</h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-6">
                      <p className="mb-2">
                        <strong>Total Products:</strong>
                        <br />
                        {products.length}
                      </p>
                      <p className="mb-2">
                        <strong>In Stock:</strong>
                        <br />
                        {products.length - outOfStockProducts}
                      </p>
                    </div>
                    <div className="col-6">
                      <p className="mb-2">
                        <strong>Low Stock:</strong>
                        <br />
                        <span className="text-warning">
                          {lowStockProducts.length} products
                        </span>
                      </p>
                      <p className="mb-2">
                        <strong>Out of Stock:</strong>
                        <br />
                        <span className="text-danger">
                          {outOfStockProducts} products
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Recent Orders ===== */}
          <div className="row mb-4">
            <div className="col-md-8">
              <div className="card">
                <div className="card-header bg-light d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Recent Orders</h5>
                  <a href="/orders" className="btn btn-sm btn-primary">
                    View All
                  </a>
                </div>
                <div className="card-body">
                  {recentOrders.length === 0 ? (
                    <p className="text-muted text-center">
                      No orders in this range
                    </p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentOrders.map((order) => (
                            <tr key={order._id}>
                              <td>
                                <small>
                                  {order._id.slice(-8).toUpperCase()}
                                </small>
                              </td>
                              <td>
                                <small>{order.userId?.email || "Guest"}</small>
                              </td>
                              <td>
                                <strong>
                                  {money.format(orderTotal(order))}
                                </strong>
                              </td>
                              <td>
                                <span
                                  className={`badge bg-${getStatusColor(
                                    order.status
                                  )}`}
                                >
                                  {order.status}
                                </span>
                              </td>
                              <td>
                                <small>
                                  {new Date(
                                    order.createdAt
                                  ).toLocaleDateString()}
                                </small>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ===== Low Stock Alerts ===== */}
            <div className="col-md-4">
              <div className="card">
                <div className="card-header bg-light d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Low Stock Alert</h5>
                  <a href="/products" className="btn btn-sm btn-warning">
                    Manage
                  </a>
                </div>
                <div className="card-body">
                  {lowStockList.length === 0 ? (
                    <p className="text-muted text-center">
                      All products well stocked!
                    </p>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {lowStockList.map((p) => (
                        <li
                          key={p._id}
                          className="list-group-item d-flex justify-content-between align-items-center px-0"
                        >
                          <span
                            className="text-truncate"
                            style={{ maxWidth: 200 }}
                          >
                            {p.name}
                          </span>
                          <span className="badge bg-warning text-dark rounded-pill">
                            {p.stock} left
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ===== Quick Actions ===== */}
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-header bg-light">
                  <h5 className="mb-0">Quick Actions</h5>
                </div>
                <div className="card-body">
                  <div className="d-flex gap-2 flex-wrap">
                    <a href="/products" className="btn btn-primary">
                      Add New Product
                    </a>
                    <a href="/categories" className="btn btn-secondary">
                      Manage Categories
                    </a>
                    <a href="/orders" className="btn btn-info">
                      View Orders
                    </a>
                    <a href="/reviews" className="btn btn-warning">
                      Moderate Reviews
                    </a>
                    <a href="/users" className="btn btn-success">
                      Manage Users
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
