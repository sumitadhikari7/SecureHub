import { Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Authentication from "./pages/Authentication";
import CreateAuction from "./pages/CreateAuction";
import BrowseAuction from "./pages/BrowseAuction";
import AuctionDetails from "./pages/AuctionDetails";
import Profile from "./pages/Profile";
import MyBids from "./pages/MyBids";
import MyCollateral from "./pages/MyCollateral";
import About from "./pages/About";
import AdminAuthentication from "./pages/AdminAuthentiction";
import AdminDashboard from "./pages/AdminDashboard";
import AdminManageUsers from "./pages/AdminManageUsers";
import AdminFraudUsers from "./pages/AdminFraudUsers";
import AdminCollateralRequests from "./pages/AdminCollateralRequest";
import AdminManageCollateral from "./pages/AdminManageCollateral";

import AdminLayout from "./components/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminFraudAccounts from "./pages/AdminFraudAccounts";

function App() {
  return (
    <Routes>

      {/* Public Routes */}
      <Route path="/" element={<Dashboard />} />
      <Route path="/login" element={<Authentication />} />
      <Route path="/browse-auction" element={<BrowseAuction />} />
      <Route path="/about" element={<About />} />
      <Route path="/auction/:id" element={<AuctionDetails />} />

      {/* Admin auth stays outside the layout — it has its own look
          before the admin session exists */}
      <Route path="/admin-authentication" element={<AdminAuthentication />} />

      {/* Admin section — AdminLayout stays mounted across all of these,
          so the dark background never unmounts and there's no white
          flash when navigating between admin pages */}
      <Route element={<AdminLayout />}>
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin-manage-users" element={<AdminManageUsers />} />
        <Route path="/admin-fraud-accounts" element={<AdminFraudUsers />} />
        <Route path="/admin-collateral-requests" element={<AdminCollateralRequests />} />
        <Route path="/admin-manage-collateral" element={<AdminManageCollateral />} />
        <Route path="/admin-manage-collateral/:id" element={<AdminManageCollateral />} />
        <Route path="/admin-flagged-accounts/" element={<AdminFraudAccounts />} />
      </Route>

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/create-auction"
        element={
          <ProtectedRoute>
            <CreateAuction />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-bids"
        element={
          <ProtectedRoute>
            <MyBids />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-collateral"
        element={
          <ProtectedRoute>
            <MyCollateral />
          </ProtectedRoute>
        }
      />


    </Routes>
  );
}

export default App;