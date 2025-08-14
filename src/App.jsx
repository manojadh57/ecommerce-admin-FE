import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/AdminLoginPage.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Dashboard from "./pages/AdminDashboardOverview.jsx";
import ProductManagementPage from "./pages/ProductManagementPage.jsx";
import CategoryManagementPage from "./pages/CategoryManagementPage.jsx";
import ReviewManagementPage from "./pages/ReviewManagementPage.jsx";
import "./App.css";
import OrderManagementPage from "./pages/OrderManagementPage.jsx";
import UsersManagementPage from "./pages/UsersManagementPage.jsx";

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
            <Route path="/categories" element={<CategoryManagementPage />} />
            <Route path="/reviews" element={<ReviewManagementPage />} />
            <Route path="/orders" element={<OrderManagementPage />} />
            <Route path="/users" element={<UsersManagementPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
