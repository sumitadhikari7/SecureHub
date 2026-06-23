import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">
        <h2>SecureHub</h2>
      </div>

      <ul className="nav-links">
        <li>Dashboard</li>
        <li>Auctions</li>
        <li>Create Auction</li>
        <li>My Bids</li>
        <li>Profile</li>
      </ul>
    </nav>
  );
}

export default Navbar;