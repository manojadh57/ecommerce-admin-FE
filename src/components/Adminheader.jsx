// src/components/AdminHeader.jsx
import "./admin-header.css";

export default function AdminHeader() {
  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <header className="admin-header">
      <div className="ah-title">Welcome to Admin Portal</div>
      <button className="btn btn-outline-danger btn-sm" onClick={logout}>
        Logout
      </button>
    </header>
  );
}
