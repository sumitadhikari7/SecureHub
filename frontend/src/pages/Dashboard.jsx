import { useState, useEffect } from "react";
import "./Dashboard.css";
import Navbar from "../components/Navbar";

function Dashboard() {
  const [stats, setStats] = useState({ activeAuctions: 0, activeBids: 0, watchlist: 0 });
  const [featuredAuctions, setFeaturedAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/dashboard");
        const data = await response.json();
        
        setStats(data.stats);
        setFeaturedAuctions(data.featured);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="loading" style={{textAlign: 'center', marginTop: '50px'}}>Loading SecureHub Dashboard...</div>;
  }

  return (
    <>
      <Navbar />
      <div className="dashboard">
        <section className="hero">
          <h1>Welcome to SecureHub</h1>
          <p>Secure, transparent and real-time online bidding platform.</p>
          <button>Browse Auctions</button>
        </section>

        <section className="stats">
          <div className="card">
            <h3>Active Auctions</h3>
            <p>{stats.activeAuctions}</p>
          </div>
          <div className="card">
            <h3>My Active Bids</h3>
            <p>{stats.activeBids}</p>
          </div>
          <div className="card">
            <h3>Watchlist Items</h3>
            <p>{stats.watchlist}</p>
          </div>
        </section>

        <section className="featured">
          <h2>Featured Auctions</h2>
          <div className="auction-container">
            {featuredAuctions.length === 0 ? (
              <p>No active auctions available right now.</p>
            ) : (
              featuredAuctions.map((auction) => (
                <div className="auction-card" key={auction.auction_id}>
                  {/* 👇 Renders the image from the server uploads directory */}
                  <img 
                    src={auction.image_url || "https://placehold.co/300x200?text=No+Image"} 
                    alt={auction.title} 
                    className="auction-img" 
                  />
                  <h3>{auction.title}</h3>
                  <p>Current Price: ${auction.current_price || auction.starting_price}</p>
                  <button>View Details</button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}

export default Dashboard;