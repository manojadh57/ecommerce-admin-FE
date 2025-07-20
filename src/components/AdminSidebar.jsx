import { NavLink } from "react-router-dom";

const links = [
  ["Dashboard", "/dashboard"],
  ["Products", "/products"],
  ["Categories", "/categories"],
  ["Orders", "/orders"],
  ["Reviews", "/reviews"],
];

export default function AdminSidebar() {
  return (
    <aside className="bg-dark text-white p-3" style={{ width: 220 }}>
      <h4 className="text-center">Admin</h4>
      <ul className="nav flex-column gap-2 mt-4">
        {links.map(([label, path]) => (
          <li key={path}>
            <NavLink
              to={path}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active text-info" : "text-light"}`
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
}
