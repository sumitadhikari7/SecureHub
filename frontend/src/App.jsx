import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Authentication from "./pages/Authentication";
import CreateAuction from "./pages/CreateAuction";
import BrowseAuction from "./pages/BrowseAuction";
import Profile from "./pages/Profile";
import MyBids from "./pages/MyBids";
import AuctionDetails from "./pages/AuctionDetails";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Authentication />} />
      <Route path="/login" element={<Authentication />} />
      <Route path="/browse-auction" element={<BrowseAuction />} />
      <Route path="/auction/:id" element={<AuctionDetails />} />

      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/create-auction" element={
        <ProtectedRoute>
          <CreateAuction />
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      
      <Route path="/my-bids" element={
        <ProtectedRoute>
          <MyBids />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;