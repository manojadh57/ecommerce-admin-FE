export default function AdminHeader() {
  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };
  return (
    <header className="d-flex justify-content-end align-items-center shadow-sm p-3">
      <button className="btn btn-outline-danger btn-sm" onClick={logout}>
        Logout
      </button>
    </header>
  );
}
