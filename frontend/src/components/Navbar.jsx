import "./Navbar.css";
import { Link, useLocation } from "react-router-dom";

function Navbar() {
  const location = useLocation();

  const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Auctions", path: "/auctions" },
    { label: "Create Auction", path: "/create-auction" },
    { label: "My Bids", path: "/my-bids" },
    { label: "Profile", path: "/profile" },
  ];

  return (
    <nav className="navbar">
      <div className="logo">
        <h2>SecureHub</h2>
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
      </ul>
    </nav>
  );
}

export default Navbar;