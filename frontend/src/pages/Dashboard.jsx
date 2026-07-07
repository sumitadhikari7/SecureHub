import "./Dashboard.css";
import Navbar from "../components/Navbar";
function Dashboard() {
  return (
    <>
    <Navbar />
    <div className="dashboard">

      <section className="hero">
        <h1>Welcome to SecureHub</h1>
        <p>
          Secure, transparent and real-time online bidding platform.
        </p>

        <button>Browse Auctions</button>
      </section>

      <section className="stats">

        <div className="card">
          <h3>Active Auctions</h3>
          <p>24</p>
        </div>

        <div className="card">
          <h3>My Active Bids</h3>
          <p>8</p>
        </div>

        <div className="card">
          <h3>Watchlist Items</h3>
          <p>12</p>
        </div>

      </section>

      <section className="featured">
        <h2>Featured Auctions</h2>

        <div className="auction-container">

          <div className="auction-card">
            <h3>Gaming Laptop</h3>
            <p>Current Bid: $550</p>
            <button>View Details</button>
          </div>

          <div className="auction-card">
            <h3>iPhone 15 Pro</h3>
            <p>Current Bid: $780</p>
            <button>View Details</button>
          </div>

          <div className="auction-card">
            <h3>PlayStation 5</h3>
            <p>Current Bid: $420</p>
            <button>View Details</button>
          </div>

        </div>
      </section>

    </div>
    </>
  );
}

export default Dashboard;