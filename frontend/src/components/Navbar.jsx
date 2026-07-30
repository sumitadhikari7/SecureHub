import "./Navbar.css";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

function Navbar() {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if the user is logged in
    fetch("http://localhost:5000/api/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.userId) {
          setUser(data);
        }
      })
      .catch((err) => console.error("Auth check failed", err));
  }, []);

  const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Browse Auctions", path: "/browse-auction" },
    { label: "Create Auction", path: "/create-auction" },
    { label: "My Bids", path: "/my-bids" },
  ];

  return (
    <nav className="navbar">
      <div className="logo">
        <Link to="/dashboard">
          <h2>SecureHub</h2>
        </Link>
      </div>

      <ul className="nav-links">
        {navItems.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={location.pathname === item.path ? "active" : ""}
            >
              {item.label}
            </Link>
          </li>
        ))}
        
        {/* User Profile / Auth Toggle */}
        <li className="auth-link">
          {user ? (
            <Link to="/profile" className={location.pathname === "/profile" ? "active" : ""}>
              {user.userName}
            </Link>
          ) : (
            <Link to="/login" className={location.pathname === "/login" ? "active" : ""}>
              Login
            </Link>
          )}
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;