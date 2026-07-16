import { useState, useEffect } from "react";
import "./Dashboard.css";
import Navbar from "../components/Navbar";

// 🕒 Robust ISO Date Parsing Countdown Component
// Now handles BOTH upcoming countdowns and live ending clocks cleanly!
function AuctionTimer({ startTime, endTime, onEnded, onStarted }) {
  const calculateTimeLeft = () => {
    if (!endTime) return { text: "No Time Set 🛑", phase: "ended" };

    try {
      let formattedStartTime = startTime;
      let formattedEndTime = endTime;

      if (typeof startTime === "string") formattedStartTime = startTime.replace(" ", "T");
      if (typeof endTime === "string") formattedEndTime = endTime.replace(" ", "T");

      const now = new Date();
      const start = new Date(formattedStartTime);
      const end = new Date(formattedEndTime);

      // ⏳ Phase 1: Not started yet (Upcoming)
      if (start > now) {
        const difference = start - now;
        return { text: formatMs(difference), phase: "upcoming" };
      }

      // 🏃‍♂️ Phase 2: In progress (Live)
      const difference = end - now;
      if (difference <= 0) return { text: "Auction Ended 🛑", phase: "ended" };

      return { text: formatMs(difference), phase: "live" };
    } catch (err) {
      return { text: "Format Error ❌", phase: "ended" };
    }
  };

  // Helper formatter to convert ms to clean layout strings
  const formatMs = (diff) => {
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return days > 0
      ? `${days}d ${hours}h ${minutes}m`
      : `${hours}h ${minutes}m ${seconds}s`;
  };

  const [state, setState] = useState(calculateTimeLeft());

  useEffect(() => {
    const tick = () => {
      const value = calculateTimeLeft();
      setState(value);
      
      if (value.text === "Auction Ended 🛑" && onEnded) {
        onEnded();
      }
      if (value.phase === "live" && onStarted) {
        onStarted(); // Alerts dashboard to unlock input controls!
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, endTime]);

  const isEnded = state.text === "Auction Ended 🛑" || state.text === "No Time Set 🛑";
  const isUpcoming = state.phase === "upcoming";

  return (
    <div className={`timer-badge ${isEnded ? "ended" : isUpcoming ? "upcoming" : "live"}`}>
      {state.text === "Auction Ended 🛑" 
        ? "⚠️ Ended" 
        : isUpcoming 
          ? `⏳ Starts In: ${state.text}` 
          : `⚡ ${state.text}`}
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState({ activeAuctions: 0, activeBids: 0, watchlist: 0 });
  const [featuredAuctions, setFeaturedAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidInputs, setBidInputs] = useState({});
  const [endedAuctions, setEndedAuctions] = useState(() => new Set());
  const [upcomingAuctions, setUpcomingAuctions] = useState(() => new Set()); // 👈 Track upcoming locks

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/dashboard");
      const data = await response.json();

      setStats(data.stats);
      setFeaturedAuctions(data.featured);

      const initialBids = {};
      const initialUpcoming = new Set();

      data.featured.forEach((auction) => {
        const currentPriceNum = Number(auction.current_price ?? auction.currentPrice ?? 0);
        const startingPriceNum = Number(auction.starting_price ?? auction.startingPrice ?? 0);

        const dbFloor = currentPriceNum > 0 ? currentPriceNum + 1 : startingPriceNum;
        initialBids[auction.auction_id] = dbFloor;

        // Check backend calculated payload flags
        if (auction.status === "upcoming" || new Date(auction.start_time ?? auction.startTime) > new Date()) {
          initialUpcoming.add(auction.auction_id);
        }
      });
      
      setBidInputs(initialBids);
      setUpcomingAuctions(initialUpcoming);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const markAuctionEnded = (id) => {
    setEndedAuctions((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const markAuctionStarted = (id) => {
    setUpcomingAuctions((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id); // Unlocks inputs seamlessly!
      return next;
    });
  };

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

  const handlePlaceBid = async (id, title, minAllowed) => {
    if (upcomingAuctions.has(id)) {
      alert("⚠️ Bidding hasn't started yet!");
      return;
    }
    if (endedAuctions.has(id)) {
      alert("⚠️ This auction has already ended.");
      return;
    }

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
          bid_amount: finalBid,
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Server returned non-JSON response payload text:", responseText);
        throw new Error("Server did not return a valid JSON object.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to save bid data to database");
      }

      alert(`🎉 Bid of $${finalBid} successfully placed on "${title}"!`);
      await fetchDashboardData();
    } catch (err) {
      console.error("Failed to post bid:", err);
      alert(`❌ Error saving bid: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="loading" style={{ textAlign: "center", marginTop: "50px" }}>Loading SecureHub Dashboard...</div>;
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
                const targetStartTime = auction.start_time ?? auction.startTime ?? auction.starting_at;
                const targetEndTime = auction.end_time ?? auction.endTime ?? auction.ending_at;
                const sellerName = auction.seller_name ?? auction.sellerName ?? "Unknown Seller";

                const displayPrice = currentPriceNum > 0 ? currentPriceNum : startingPriceNum;
                const minAllowedBid = currentPriceNum > 0 ? currentPriceNum + 1 : startingPriceNum;
                const currentInputValue = bidInputs[auction.auction_id] ?? minAllowedBid;
                
                const hasEnded = endedAuctions.has(auction.auction_id);
                const isUpcoming = upcomingAuctions.has(auction.auction_id);
                const isInteractionDisabled = hasEnded || isUpcoming;

                return (
                  <div className={`auction-card ${hasEnded ? "ended" : isUpcoming ? "upcoming" : ""}`} key={auction.auction_id}>
                    <div className="card-media-box">
                      <img
                        src={auction.image_url ?? auction.imageUrl ?? "https://placehold.co/300x200?text=No+Image"}
                        alt={auction.title}
                        className="auction-img"
                      />
                      <AuctionTimer
                        startTime={targetStartTime}
                        endTime={targetEndTime}
                        onEnded={() => markAuctionEnded(auction.auction_id)}
                        onStarted={() => markAuctionStarted(auction.auction_id)}
                      />
                    </div>

                    <div className="auction-info-box">
                      <div className="title-row">
                        <h3>{auction.title}</h3>
                        <span className="seller-tag">👤 {sellerName}</span>
                      </div>

                      <p className="auction-description">
                        {auction.description || "No item summary overview notes provided by the auctioneer."}
                      </p>

                      <div className="price-tag-box">
                        <span className="price-label">
                          {isUpcoming ? "Starting Price Floor" : currentPriceNum > 0 ? "Current High Bid" : "Starting Price Floor"}
                        </span>
                        <span className="price-amount">${displayPrice}</span>
                      </div>

                      <div className="bid-controller">
                        <button
                          className="control-btn minus"
                          onClick={() => handleDecrement(auction.auction_id, minAllowedBid)}
                          disabled={isInteractionDisabled || currentInputValue <= minAllowedBid}
                        >
                          -
                        </button>

                        <input
                          type="number"
                          className="bid-number-input"
                          value={currentInputValue}
                          min={minAllowedBid}
                          disabled={isInteractionDisabled}
                          onChange={(e) => handleInputChange(auction.auction_id, e.target.value)}
                          onBlur={() => handleInputBlur(auction.auction_id, minAllowedBid)}
                        />

                        <button
                          className="control-btn plus"
                          onClick={() => handleIncrement(auction.auction_id)}
                          disabled={isInteractionDisabled}
                        >
                          +
                        </button>
                      </div>

                      <button
                        className="place-bid-btn"
                        onClick={() => handlePlaceBid(auction.auction_id, auction.title, minAllowedBid)}
                        disabled={isInteractionDisabled}
                      >
                        {hasEnded ? "Auction Ended" : isUpcoming ? "Locked Until Start" : "Submit Bid 🔨"}
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