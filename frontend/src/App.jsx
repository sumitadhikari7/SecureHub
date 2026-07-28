import { Routes, Route } from "react-router-dom"
import Dashboard from "./pages/Dashboard";
import Authentication from "./pages/Authentication";
import CreateAuction from "./pages/CreateAuction";
import BrowseAuction from "./pages/BrowseAuction";
import Profile from "./pages/Profile";
import MyBids from "./pages/MyBids";
import MyCollateral from "./pages/MyCollateral";
import About from "./pages/About";
function App() {
  return (
    <Routes>
      <Route path="/" element={<Authentication />}/>
      <Route path="/dashboard" element={<Dashboard />}/>
      <Route path="/create-auction" element={<CreateAuction />}/>
      <Route path="/create-auction" element={<CreateAuction />}/>
      <Route path="/browse-auction" element={<BrowseAuction />}/>
      <Route path="/profile" element={<Profile />}/>
      <Route path="/my-bids" element={<MyBids />}/>
      <Route path="/my-collateral" element={<MyCollateral />}/>
      <Route path="/about" element={<About />}/>
    </Routes>
  );
}

export default App;