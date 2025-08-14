import { useEffect, useMemo, useState } from "react";
import api from "../services/api.js";

/* ---------- formatters ---------- */
const moneyAUD = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  });

const fmtInt = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });

/* ---------- date helpers ---------- */
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

/* ---------- small SVG helpers ---------- */
function LineChart({
  data,
  height = 140,
  stroke = "#0d6efd",
  fill = "#0d6efd14",
}) {
  // data: [{label, value}]
  const w = Math.max(260, data.length * 42);
  const pad = 24;
  const max = Math.max(...data.map((d) => d.value), 1);

  const pts = data.map((d, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
    const y = pad + (1 - d.value / max) * (height - pad * 2);
    return [x, y];
  });

  const path = pts
    .map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`))
    .join(" ");

  // area fill
  const area = `${path} L ${pts[pts.length - 1][0]} ${height - pad} L ${
    pts[0][0]
  } ${height - pad} Z`;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={w} height={height} role="img">
        <rect x="0" y="0" width={w} height={height} fill="white" />
        <path d={area} fill={fill} stroke="none" />
        <path d={path} stroke={stroke} strokeWidth="2" fill="none" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={stroke} />
        ))}
        {/* x labels */}
        {data.map((d, i) => {
          const x = pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
          return (
            <text
              key={i}
              x={x}
              y={height - 6}
              textAnchor="middle"
              fontSize="11"
              fill="#6c757d"
            >
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function BarChart({
  data, // [{ label, value }]
  height = 180,
  barColor = "#198754",
  minColWidth = 88, // <- keep bars readable
  rotateLabels = true,
  valueFormatter = (v) => v, // e.g. n => n.toLocaleString()
  maxLabelChars = 16, // truncation length for label text
}) {
  const pad = 28; // chart padding
  const n = Math.max(data.length, 1);
  const innerW = Math.max(n * minColWidth, 260);
  const w = innerW + pad * 2;

  const max = Math.max(...data.map((d) => Number(d.value || 0)), 1);
  const slotW = innerW / n;
  const barW = Math.max(slotW * 0.6, 24); // bar takes ~60% of its slot

  const gridSteps = 4;
  const grid = Array.from(
    { length: gridSteps + 1 },
    (_, i) => (i / gridSteps) * max
  );

  const truncate = (s) =>
    s.length > maxLabelChars ? s.slice(0, maxLabelChars - 1) + "…" : s;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={w} height={height} role="img">
        <rect x="0" y="0" width={w} height={height} fill="#fff" />

        {/* horizontal gridlines */}
        {grid.map((val, i) => {
          const y = pad + (1 - val / max) * (height - pad * 2);
          return (
            <g key={`g${i}`}>
              <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#e9ecef" />
              {i > 0 && i < gridSteps && (
                <text
                  x={pad - 6}
                  y={y}
                  fontSize="10"
                  fill="#6c757d"
                  textAnchor="end"
                  dy="3"
                >
                  {valueFormatter(Math.round(val))}
                </text>
              )}
            </g>
          );
        })}

        {/* bars */}
        {data.map((d, i) => {
          const value = Number(d.value || 0);
          const h = (value / max) * (height - pad * 2);
          const x = pad + i * slotW + (slotW - barW) / 2;
          const y = height - pad - h;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                fill={barColor + "55"}
                stroke={barColor + "99"}
                rx="8"
              />
              {/* value badge */}
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#343a40"
              >
                {valueFormatter(value)}
              </text>

              {/* x label */}
              {rotateLabels ? (
                <text
                  transform={`translate(${x + barW / 2}, ${
                    height - 6
                  }) rotate(-35)`}
                  textAnchor="end"
                  fontSize="11"
                  fill="#6c757d"
                >
                  <title>{d.label}</title>
                  {truncate(String(d.label))}
                </text>
              ) : (
                <text
                  x={x + barW / 2}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6c757d"
                >
                  <title>{d.label}</title>
                  {truncate(String(d.label))}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Donut({ valueMap }) {
  // valueMap: [{label, value, color}]
  const total = valueMap.reduce((s, x) => s + (x.value || 0), 0) || 1;
  const radius = 56;
  const stroke = 20;
  const cx = 70;
  const cy = 70;
  let acc = 0;

  const segs = valueMap.map((s, idx) => {
    const frac = (s.value || 0) / total;
    const dash = frac * (2 * Math.PI * radius);
    const gap = 2;
    const seg = (
      <circle
        key={idx}
        r={radius}
        cx={cx}
        cy={cy}
        fill="transparent"
        stroke={s.color}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${2 * Math.PI * radius}`}
        strokeDashoffset={-acc}
      />
    );
    acc += dash + gap;
    return seg;
  });

  return (
    <div className="d-flex align-items-center gap-3">
      <svg width="140" height="140" role="img">
        <circle
          r={radius}
          cx={cx}
          cy={cy}
          fill="transparent"
          stroke="#e9ecef"
          strokeWidth={stroke}
        />
        {segs}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fontWeight="700"
        >
          {Math.round(
            ((valueMap.find((v) => v.label === "delivered")?.value || 0) /
              total) *
              100
          ) || 0}
          %
        </text>
      </svg>
      <div>
        {valueMap.map((s) => (
          <div key={s.label} className="d-flex align-items-center gap-2 mb-1">
            <span
              style={{
                width: 12,
                height: 12,
                background: s.color,
                borderRadius: 3,
                display: "inline-block",
              }}
            />
            <span style={{ minWidth: 90 }}>{s.label}</span>
            <strong>{fmtInt(s.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- main ---------- */
export default function AdminDashboardOverview() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [range, setRange] = useState("7"); // 7 | 30

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const [o, p, r] = await Promise.all([
        api.get("/orders"),
        api.get("/products"),
        api.get("/reviews"),
      ]);

      const O = Array.isArray(o.data)
        ? o.data
        : Array.isArray(o.data?.orders)
        ? o.data.orders
        : [];
      const P = Array.isArray(p.data)
        ? p.data
        : Array.isArray(p.data?.products)
        ? p.data.products
        : [];
      const R = Array.isArray(r.data)
        ? r.data
        : Array.isArray(r.data?.reviews)
        ? r.data.reviews
        : [];

      setOrders(O);
      setProducts(P);
      setReviews(R);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
      setOrders([]);
      setProducts([]);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ----- computed metrics -----
  const now = new Date();
  const daysBack = Number(range);
  const fromDate = startOfDay(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack + 1)
  );

  const ordersInRange = useMemo(
    () =>
      orders.filter((o) => {
        const d = new Date(o.createdAt || 0);
        return d >= fromDate && d <= now;
      }),
    [orders, range]
  );

  const revenueAll = useMemo(
    () => orders.reduce((s, o) => s + Number(o.totalAmount || 0), 0),
    [orders]
  );

  const revenueRange = useMemo(
    () => ordersInRange.reduce((s, o) => s + Number(o.totalAmount || 0), 0),
    [ordersInRange]
  );

  const totalOrders = orders.length;
  const totalOrdersRange = ordersInRange.length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const pendingReviews = reviews.filter((r) => !r.approved).length;

  const lowStock = useMemo(
    () => products.filter((p) => Number(p.stock || 0) <= 5).slice(0, 6),
    [products]
  );

  // timeline labels (N days)
  const N = Number(range);
  const days = Array.from({ length: N }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (N - 1 - i));
    return startOfDay(d);
  });

  // series: revenue by day & orders by day
  const revenueSeries = days.map((d) => {
    const sum = orders
      .filter((o) => sameDay(new Date(o.createdAt || 0), d))
      .reduce((acc, o) => acc + Number(o.totalAmount || 0), 0);
    return {
      label: d.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
      }),
      value: sum,
    };
    // label example: 14 Aug
  });

  const ordersSeries = days.map((d) => {
    const count = orders.filter((o) =>
      sameDay(new Date(o.createdAt || 0), d)
    ).length;
    return {
      label: d.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
      }),
      value: count,
    };
  });

  // donut: order statuses
  const statusCount = (s) => ordersInRange.filter((o) => o.status === s).length;
  const donutData = [
    { label: "pending", value: statusCount("pending"), color: "#ffc107" },
    { label: "shipped", value: statusCount("shipped"), color: "#0dcaf0" },
    { label: "delivered", value: statusCount("delivered"), color: "#20c997" },
    { label: "cancelled", value: statusCount("cancelled"), color: "#dc3545" },
  ];

  // top products by quantity sold in range
  const qtyByProduct = new Map();
  ordersInRange.forEach((o) => {
    (o.products || []).forEach((it) => {
      const pid =
        typeof it.productId === "object"
          ? it.productId?._id || it.productId?.id
          : it.productId;
      const name =
        (typeof it.productId === "object" &&
          (it.productId?.name || it.productId?.title)) ||
        String(pid || "Unknown");
      const qty = Number(it.quantity || 0);
      const prev = qtyByProduct.get(name) || 0;
      qtyByProduct.set(name, prev + qty);
    });
  });
  const topProducts = [...qtyByProduct.entries()]
    .map(([label, value]) => ({ label: label.toString().slice(0, 18), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // chip style
  const chip = (bg, color = "#000") => ({
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 8,
    fontWeight: 700,
    lineHeight: 1,
    background: bg,
    color,
    textTransform: "capitalize",
  });

  const badgeFor = (status) => {
    switch (status) {
      case "pending":
        return chip("#fff3cd", "#663c00");
      case "shipped":
        return chip("#cfe8ff", "#084298");
      case "delivered":
        return chip("#d1fae5", "#065f46");
      case "cancelled":
        return chip("#f8d7da", "#842029");
      default:
        return chip("#e9ecef", "#212529");
    }
  };

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 6),
    [orders]
  );

  return (
    <>
      {/* Header */}
      <div
        className="d-flex flex-wrap gap-2 align-items-center mb-3"
        style={{ rowGap: 8 }}
      >
        <h3 className="mb-0">Dashboard</h3>
        <div className="ms-auto d-flex gap-2">
          <select
            className="form-select"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            style={{ width: 180 }}
            title="Time range"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
          <button className="btn btn-outline-secondary" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      {loading ? (
        <div className="py-5 text-center">Loading…</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="p-3 border rounded-3 bg-white h-100">
                <div className="text-muted">Revenue ({range}d)</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>
                  {moneyAUD(revenueRange)}
                </div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  All‑time: {moneyAUD(revenueAll)}
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="p-3 border rounded-3 bg-white h-100">
                <div className="text-muted">Orders ({range}d)</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>
                  {fmtInt(totalOrdersRange)}
                </div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  All‑time: {fmtInt(totalOrders)}
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="p-3 border rounded-3 bg-white h-100">
                <div className="text-muted">Pending Orders</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>
                  {fmtInt(pendingOrders)}
                </div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Update in Orders page
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="p-3 border rounded-3 bg-white h-100">
                <div className="text-muted">Reviews Awaiting</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>
                  {fmtInt(pendingReviews)}
                </div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Moderate in Reviews page
                </div>
              </div>
            </div>
          </div>

          {/* Charts row 1: Revenue trend + Orders per day */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-lg-7">
              <div className="p-3 border rounded-3 bg-white h-100">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>Revenue trend (AUD)</strong>
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    Total:{" "}
                    {moneyAUD(revenueSeries.reduce((s, d) => s + d.value, 0))}
                  </span>
                </div>
                <LineChart data={revenueSeries} />
              </div>
            </div>

            <div className="col-12 col-lg-5">
              <div className="p-3 border rounded-3 bg-white h-100">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>Orders per day</strong>
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    Total:{" "}
                    {fmtInt(ordersSeries.reduce((s, d) => s + d.value, 0))}
                  </span>
                </div>
                <BarChart data={ordersSeries} barColor="#6f42c1" />
              </div>
            </div>
          </div>

          {/* Charts row 2: Status donut + Top products */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-lg-5">
              <div className="p-3 border rounded-3 bg-white h-100">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>Order status ({range}d)</strong>
                </div>
                <Donut valueMap={donutData} />
              </div>
            </div>

            <div className="col-12 col-lg-7">
              <div className="p-3 border rounded-3 bg-white h-100">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>Top products by qty ({range}d)</strong>
                </div>
                {topProducts.length ? (
                  <BarChart data={topProducts} barColor="#fd7e14" />
                ) : (
                  <div className="text-muted py-4 text-center">
                    No product sales in range.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom row: Recent orders + Low stock */}
          <div className="row g-3">
            <div className="col-12 col-lg-7">
              <div className="p-3 border rounded-3 bg-white h-100">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>Recent orders</strong>
                  <a href="/orders" className="link-primary">
                    View all
                  </a>
                </div>
                {recentOrders.length === 0 ? (
                  <div className="text-muted py-4 text-center">
                    No recent orders.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>User</th>
                          <th>Total (AUD)</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((o) => (
                          <tr key={o._id}>
                            <td
                              className="text-truncate"
                              style={{ maxWidth: 240 }}
                            >
                              {o.userId?.email || "—"}
                            </td>
                            <td>{moneyAUD(o.totalAmount)}</td>
                            <td>
                              <span style={badgeFor(o.status)}>{o.status}</span>
                            </td>
                            <td>
                              {o.createdAt
                                ? new Date(o.createdAt).toLocaleDateString()
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="col-12 col-lg-5">
              <div className="p-3 border rounded-3 bg-white h-100">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>Low stock (≤5)</strong>
                  <a href="/products" className="link-primary">
                    Manage
                  </a>
                </div>
                {lowStock.length === 0 ? (
                  <div className="text-muted py-4 text-center">
                    Inventory looks healthy.
                  </div>
                ) : (
                  <ul className="list-group">
                    {lowStock.map((p) => (
                      <li
                        key={p._id}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        <span
                          className="text-truncate"
                          style={{ maxWidth: 260 }}
                        >
                          {p.name}
                        </span>
                        <span className="badge bg-warning text-dark rounded-pill">
                          {p.stock ?? 0}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
