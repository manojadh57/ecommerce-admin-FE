import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import logo from "/vite.svg";
import "./admin-sidebar.css";

const Icon = {
  Dashboard: (props) => (
    <svg viewBox="0 0 24 24" className="icon" {...props}>
      <path
        fill="currentColor"
        d="M11 3H5a2 2 0 0 0-2 2v6h8V3Zm10 8V5a2 2 0 0 0-2-2h-6v8h8Zm0 2h-8v8h6a2 2 0 0 0 2-2v-6ZM11 13H3v6a2 2 0 0 0 2 2h6v-8Z"
      />
    </svg>
  ),
  Products: (props) => (
    <svg viewBox="0 0 24 24" className="icon" {...props}>
      <path
        fill="currentColor"
        d="M21 7.5 12 2 3 7.5l9 5.5 9-5.5Zm-9 7-9-5.5V19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9L12 14.5Z"
      />
    </svg>
  ),
  Categories: (props) => (
    <svg viewBox="0 0 24 24" className="icon" {...props}>
      <path
        fill="currentColor"
        d="M3 3h8v8H3V3Zm10 0h8v8h-8V3ZM3 13h8v8H3v-8Zm10 0h8v8h-8v-8Z"
      />
    </svg>
  ),
  Orders: (props) => (
    <svg viewBox="0 0 24 24" className="icon" {...props}>
      <path
        fill="currentColor"
        d="M7 4h10l1 3h3v2h-2l-2.2 8.1A3 3 0 0 1 13 19H9a3 3 0 0 1-2.9-2.2L4 6H2V4h5Zm2 13h4a1 1 0 0 0 1-.7L15.8 9H6.2l1.4 7.3A1 1 0 0 0 9 17Z"
      />
    </svg>
  ),
  Users: (props) => (
    <svg viewBox="0 0 24 24" className="icon" {...props}>
      <path
        fill="currentColor"
        d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm-9 9a8 8 0 0 1 16 0H3Z"
      />
    </svg>
  ),
  Reviews: (props) => (
    <svg viewBox="0 0 24 24" className="icon" {...props}>
      <path
        fill="currentColor"
        d="m12 17.3 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.76L5.82 21z"
      />
    </svg>
  ),
  Chevron: (props) => (
    <svg viewBox="0 0 24 24" className="icon" {...props}>
      <path fill="currentColor" d="M9 6l6 6-6 6" />
    </svg>
  ),
};

const NAV = [
  { label: "Dashboard", path: "/dashboard", Icon: Icon.Dashboard },
  { label: "Products", path: "/products", Icon: Icon.Products },
  { label: "Categories", path: "/categories", Icon: Icon.Categories },
  { label: "Orders", path: "/orders", Icon: Icon.Orders },
  { label: "Users", path: "/users", Icon: Icon.Users },
  { label: "Reviews", path: "/reviews", Icon: Icon.Reviews },
];

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  // persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("adminSidebarCollapsed");
    if (saved != null) setCollapsed(saved === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem("adminSidebarCollapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const classes = useMemo(
    () =>
      `admin-sidebar bg-dark text-white d-flex flex-column ${
        collapsed ? "collapsed" : ""
      }`,
    [collapsed]
  );

  return (
    <aside className={classes} role="navigation" aria-label="Admin sidebar">
      {/* Header / brand + collapse button */}
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="brand">
          <img src={logo} alt="Admin" className="logo" />
          <span className="title label">Admin</span>
        </div>
        <button
          type="button"
          className="toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <Icon.Chevron />
        </button>
      </div>

      {/* Quick hint (hidden when collapsed) */}
      <div className="hint ms-1">Manage</div>

      {/* Nav */}
      <nav className="nav-area">
        <ul className="nav flex-column gap-1">
          {NAV.map(({ label, path, Icon: I }) => (
            <li key={path} className="nav-item">
              <NavLink
                to={path}
                end
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
                title={collapsed ? label : undefined}
              >
                <I />
                <span className="label">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="footer">
        <div className="d-flex align-items-center gap-2 mb-2">
          <span className="dot" />
          <span className="hint label">You’re in admin mode</span>
        </div>
        <div className="d-flex flex-column gap-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            title={collapsed ? "Back to dashboard" : undefined}
          >
            <Icon.Dashboard />
            <span className="label">Dashboard</span>
          </NavLink>
        </div>
      </div>
    </aside>
  );
}
