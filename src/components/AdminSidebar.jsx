import { NavLink } from "react-router-dom";
import logo from "/vite.svg";

const links = [
  ["Dashboard", "/dashboard"],
  ["Products", "/products"],
  ["Categories", "/categories"],
  ["Orders", "/orders"],
  ["Users", "/users"], // ← added
  ["Reviews", "/reviews"],
];

export default function AdminSidebar() {
  return (
    <aside className="bg-dark text-white p-3" style={{ width: 220 }}>
      <h4 className="text-center d-flex justify-content-center align-items-center gap-2 mb-0">
        <img src={logo} alt="Admin logo" width="24" height="24" />
        Admin
      </h4>

      <ul className="nav flex-column gap-2 mt-4">
        {links.map(([label, path]) => (
          <li key={path}>
            <NavLink
              to={path}
              end
              className={({ isActive }) =>
                `nav-link ${
                  isActive ? "active fw-bold text-info" : "text-light"
                }`
              }
              style={{ padding: "8px 12px", borderRadius: 8 }}
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
}
