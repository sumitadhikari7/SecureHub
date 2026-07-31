import "./Navbar.css";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

function Navbar() {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/me", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.userId) {
          setUser(data);
        }
      })
      .catch((err) => console.error("Auth check failed:", err));
  }, []);

  const navItems = [
    { label: "Dashboard", path: "/dashboard", protected: true },
    { label: "Browse Auctions", path: "/browse-auction", protected: false },
    { label: "Create Auction", path: "/create-auction", protected: true },
    { label: "My Bids", path: "/my-bids", protected: true },
    { label: "My Collateral", path: "/my-collateral", protected: true },
    { label: "Profile", path: "/profile", protected: true },
  ];

  return (
    <nav className="navbar">

      <div className="logo">
        <Link to={user ? "/dashboard" : "/"}>
          <h2>SecureHub</h2>
        </Link>
      </div>

      <ul className="nav-links">
        {navItems
          .filter((item) => !item.protected || user)
          .map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={
                  location.pathname === item.path ? "active" : ""
                }
              >
                {item.label}
              </Link>
            </li>
          ))}

        <li className="auth-link">
          {user ? (
            <Link
              to="/profile"
              className={
                location.pathname === "/profile" ? "active" : ""
              }
            >
              {user.userName}
            </Link>
          ) : (
            <Link
              to="/login"
              className={
                location.pathname === "/login" ? "active" : ""
              }
            >
              Login
            </Link>
          )}
        </li>
      </ul>

    </nav>
  );
}

export default Navbar;