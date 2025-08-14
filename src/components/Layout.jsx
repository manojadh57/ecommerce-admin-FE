import AdminSidebar from "./AdminSidebar.jsx";
import AdminHeader from "./Adminheader.jsx";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      <AdminSidebar />
      <div className="flex-grow-1">
        <AdminHeader />
        <main className="p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
