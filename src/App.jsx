import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/AdminLoginPage.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Dashboard from "./pages/AdminDashboardOverview.jsx";
import ProductManagementPage from "./pages/ProductManagementPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        {/* everything below requires JWT */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<ProductManagementPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
