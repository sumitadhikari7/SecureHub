import { useState, useEffect } from "react";
import "./Dashboard.css";
import Navbar from "../components/Navbar";

// 🕒 Robust ISO Date Parsing Countdown Component
function AuctionTimer({ endTime }) {
  const calculateTimeLeft = () => {
    if (!endTime) return "No Time Set 🛑";

    try {
      let formattedEndTime = endTime;
      if (typeof endTime === "string") {
        formattedEndTime = endTime.replace(" ", "T");
      } else if (endTime instanceof Date) {
        formattedEndTime = endTime.toISOString();
      }

      const difference = new Date(formattedEndTime) - new Date();
      if (difference <= 0) return "Auction Ended 🛑";

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      return days > 0 
        ? `${days}d ${hours}h ${minutes}m` 
        : `${hours}h ${minutes}m ${seconds}s`;
    } catch (err) {
      return "Format Error ❌";
    }
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  const isEnded = timeLeft === "Auction Ended 🛑" || timeLeft === "No Time Set 🛑";

  return (
    <div className={`timer-badge ${isEnded ? "ended" : "live"}`}>
      {timeLeft === "Auction Ended 🛑" ? "⚠️ Ended" : `⏳ ${timeLeft}`}
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState({ activeAuctions: 0, activeBids: 0, watchlist: 0 });
  const [featuredAuctions, setFeaturedAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidInputs, setBidInputs] = useState({}); 

  // Pull fresh operational datasets instantly from server storage
  const fetchDashboardData = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/dashboard");
      const data = await response.json();
      
      setStats(data.stats);
      setFeaturedAuctions(data.featured);

      const initialBids = {};
      data.featured.forEach((auction) => {
        const currentPriceNum = Number(auction.current_price ?? auction.currentPrice ?? 0);
        const startingPriceNum = Number(auction.starting_price ?? auction.startingPrice ?? 0);
        
        // Start input exactly at starting price if no bids exist, else current high bid + 1
        const dbFloor = currentPriceNum > 0 ? currentPriceNum + 1 : startingPriceNum;
        initialBids[auction.auction_id] = dbFloor;
      });
      setBidInputs(initialBids);
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleIncrement = (id) => {
    setBidInputs((prev) => ({
      ...prev,
      [id]: (Number(prev[id]) || 0) + 1,
    }));
  };

  const handleDecrement = (id, minAllowed) => {
    const currentInputVal = Number(bidInputs[id]) || 0;
    if (currentInputVal > minAllowed) {
      setBidInputs((prev) => ({
        ...prev,
        [id]: currentInputVal - 1,
      }));
    }
  };

  const handleInputChange = (id, value) => {
    const numValue = value === "" ? "" : Number(value);
    setBidInputs((prev) => ({
      ...prev,
      [id]: numValue,
    }));
  };

  const handleInputBlur = (id, minAllowed) => {
    const currentInputVal = Number(bidInputs[id]) || 0;
    if (currentInputVal < minAllowed) {
      setBidInputs((prev) => ({
        ...prev,
        [id]: minAllowed,
      }));
    }
  };

  // 🚀 FIXED: Robust database submission engine with non-JSON string capture
  const handlePlaceBid = async (id, title, minAllowed) => {
    const finalBid = Number(bidInputs[id]);

    if (finalBid < minAllowed) {
      alert(`⚠️ You cannot bid below the minimum required amount of $${minAllowed}!`);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auction_id: id,
          bid_amount: finalBid
        }),
      });

      // ⚡ READ RAW TEXT FIRST to stop JSON parsing crash bugs!
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Server returned non-JSON response payload text:", responseText);
        throw new Error("Server did not return a valid JSON object. Check your backend console!");
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to save bid data to database");
      }

      alert(`🎉 Bid of $${finalBid} successfully placed on "${title}"!`);
      
      // Pull fresh data directly from database to sync all views cleanly
      await fetchDashboardData();
      
    } catch (err) {
      console.error("Failed to post bid:", err);
      alert(`❌ Error saving bid: ${err.message}`);
    }
  };

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
              featuredAuctions.map((auction) => {
                const currentPriceNum = Number(auction.current_price ?? auction.currentPrice ?? 0);
                const startingPriceNum = Number(auction.starting_price ?? auction.startingPrice ?? 0);
                const targetEndTime = auction.end_time ?? auction.endTime ?? auction.ending_at ?? auction.endingAt;

                const displayPrice = currentPriceNum > 0 ? currentPriceNum : startingPriceNum;
                const minAllowedBid = currentPriceNum > 0 ? currentPriceNum + 1 : startingPriceNum;
                const currentInputValue = bidInputs[auction.auction_id] ?? minAllowedBid;

                return (
                  <div className="auction-card" key={auction.auction_id}>
                    <div className="card-media-box">
                      <img 
                        src={auction.image_url ?? auction.imageUrl ?? "https://placehold.co/300x200?text=No+Image"} 
                        alt={auction.title} 
                        className="auction-img" 
                      />
                      <AuctionTimer endTime={targetEndTime} />
                    </div>
                    
                    <div className="auction-info-box">
                      <h3>{auction.title}</h3>
                      
                      <p className="auction-description">
                        {auction.description || "No item summary overview notes provided by the auctioneer."}
                      </p>
                      
                      <div className="price-tag-box">
                        <span className="price-label">
                          {currentPriceNum > 0 ? "Current High Bid" : "Starting Price Floor"}
                        </span>
                        <span className="price-amount">${displayPrice}</span>
                      </div>

                      <div className="bid-controller">
                        <button 
                          className="control-btn minus"
                          onClick={() => handleDecrement(auction.auction_id, minAllowedBid)}
                          disabled={currentInputValue <= minAllowedBid}
                        >
                          -
                        </button>
                        
                        <input
                          type="number"
                          className="bid-number-input"
                          value={currentInputValue}
                          min={minAllowedBid}
                          onChange={(e) => handleInputChange(auction.auction_id, e.target.value)}
                          onBlur={() => handleInputBlur(auction.auction_id, minAllowedBid)}
                        />
                        
                        <button 
                          className="control-btn plus"
                          onClick={() => handleIncrement(auction.auction_id)}
                        >
                          +
                        </button>
                      </div>

                      <button 
                        className="place-bid-btn"
                        onClick={() => handlePlaceBid(auction.auction_id, auction.title, minAllowedBid)}
                      >
                        Submit Bid 🔨
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </>
  );
}

export default Dashboard;