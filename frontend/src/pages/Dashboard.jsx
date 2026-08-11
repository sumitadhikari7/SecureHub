/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from "react";
import "./Dashboard.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { socket } from "../socket";
import { Link } from "react-router-dom";
// 1. IMPORT TOAST AND TOASTER
import toast, { Toaster } from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function toDate(value) {
  if (!value) return null;
  const normalized =
    typeof value === "string" ? value.replace(" ", "T") : value;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function AuctionTimer({ startTime, endTime, onEnded, onStarted }) {
  const formatMs = (diff) => {
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return days > 0
      ? `${days}d ${hours}h ${minutes}m`
      : `${hours}h ${minutes}m ${seconds}s`;
  };

  const calculateTimeLeft = () => {
    if (!endTime) {
      return { text: "No Time Set", phase: "ended" };
    }

    try {
      const start = toDate(startTime);
      const end = toDate(endTime);

      if (!start || !end) {
        return { text: "Format Error", phase: "ended" };
      }

      const now = new Date();

      if (start > now) {
        return {
          text: formatMs(start - now),
          phase: "upcoming",
        };
      }

      if (end <= now) {
        return {
          text: "Auction Ended",
          phase: "ended",
        };
      }

      return {
        text: formatMs(end - now),
        phase: "live",
      };
    } catch {
      return {
        text: "Format Error",
        phase: "ended",
      };
    }
  };

  const [state, setState] = useState(calculateTimeLeft());
  const prevPhaseRef = useRef(state.phase);

  useEffect(() => {
    const interval = setInterval(() => {
      const value = calculateTimeLeft();
      setState(value);

      if (value.phase !== prevPhaseRef.current) {
        if (value.phase === "ended" && onEnded) {
          onEnded();
        }

        if (value.phase === "live" && onStarted) {
          onStarted();
        }

        prevPhaseRef.current = value.phase;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, endTime]);

  const isEnded = state.phase === "ended";
  const isUpcoming = state.phase === "upcoming";

  return (
    <div
      className={`timer-badge ${
        isEnded ? "ended" : isUpcoming ? "upcoming" : "live"
      }`}
    >
      {isEnded
        ? "Ended"
        : isUpcoming
        ? `Starts In: ${state.text}`
        : `${state.text}`}
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState({
    activeAuctions: 0,
    activeBids: 0,
    watchlist: 0,
  });

  const [featuredAuctions, setFeaturedAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidInputs, setBidInputs] = useState({});
  const [endedAuctions, setEndedAuctions] = useState(() => new Set());
  const [upcomingAuctions, setUpcomingAuctions] = useState(() => new Set());
  const [selectedAuctionId, setSelectedAuctionId] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/dashboard`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || "Failed to load dashboard"
        );
      }

      setStats(data.stats);
      setFeaturedAuctions(data.featured);
      setFetchError(null);

      const initialBids = {};
      const initialUpcoming = new Set();

      data.featured.forEach((auction) => {
        const currentPrice = Number(
          auction.current_price ?? auction.currentPrice ?? 0
        );

        const startingPrice = Number(
          auction.starting_price ?? auction.startingPrice ?? 0
        );

        initialBids[auction.auction_id] =
          currentPrice > 0 ? currentPrice + 1 : startingPrice;

        const start = toDate(auction.start_time ?? auction.startTime);

        if (start && start > new Date()) {
          initialUpcoming.add(auction.auction_id);
        }
      });

      setBidInputs(initialBids);
      setUpcomingAuctions(initialUpcoming);
      setLoading(false);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      setFetchError(error.message || "Failed to load dashboard");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedAuctionId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!featuredAuctions.length) return;

    featuredAuctions.forEach((a) => socket.emit("joinAuction", a.auction_id));

    return () => {
      featuredAuctions.forEach((a) => socket.emit("leaveAuction", a.auction_id));
    };
  }, [featuredAuctions]);

  useEffect(() => {
    const handleBidUpdate = ({ auction_id, current_price }) => {
      setFeaturedAuctions((prev) =>
        prev.map((a) =>
          a.auction_id === auction_id ? { ...a, current_price } : a
        )
      );

      setBidInputs((prev) => ({
        ...prev,
        [auction_id]: current_price + 1,
      }));
    };

    socket.on("bidUpdate", handleBidUpdate);
    return () => socket.off("bidUpdate", handleBidUpdate);
  }, []);

  useEffect(() => {
    const handleNewAuction = (auction) => {
      setFeaturedAuctions((prev) => [auction, ...prev]);

      setBidInputs((prev) => ({
        ...prev,
        [auction.auction_id]: Number(
          auction.starting_price ?? auction.startingPrice ?? 0
        ),
      }));

      const start = toDate(auction.start_time ?? auction.startTime);
      if (start && start > new Date()) {
        setUpcomingAuctions((prev) => new Set(prev).add(auction.auction_id));
      }

      socket.emit("joinAuction", auction.auction_id);
    };

    socket.on("newAuction", handleNewAuction);
    return () => socket.off("newAuction", handleNewAuction);
  }, []);
  
  const markAuctionEnded = (id) => {
    setEndedAuctions((prev) => new Set(prev).add(id));
  };

  const markAuctionStarted = (id) => {
    setUpcomingAuctions((prev) => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
  };

  const handleIncrement = (id) => {
    setBidInputs((prev) => ({
      ...prev,
      [id]: (Number(prev[id]) || 0) + 1,
    }));
  };

  const handleDecrement = (id, min) => {
    const value = Number(bidInputs[id]) || 0;
    if (value > min) {
      setBidInputs((prev) => ({
        ...prev,
        [id]: value - 1,
      }));
    }
  };

  const handleInputChange = (id, value) => {
    setBidInputs((prev) => ({
      ...prev,
      [id]: value === "" ? "" : Number(value),
    }));
  };

  const handleInputBlur = (id, min) => {
    const raw = bidInputs[id];
    const value = raw === "" || raw === undefined ? NaN : Number(raw);

    if (isNaN(value) || value < min) {
      setBidInputs((prev) => ({
        ...prev,
        [id]: min,
      }));
    }
  };

  // 2. REPLACED ALL ALERT() CALLS WITH TOAST NOTIFICATIONS
  const handlePlaceBid = async (id, title, minAllowed) => {
    if (upcomingAuctions.has(id)) {
      toast.error("Bidding has not started yet!");
      return;
    }

    if (endedAuctions.has(id)) {
      toast.error("Auction already ended.");
      return;
    }

    const amount = Number(bidInputs[id]);

    if (isNaN(amount) || amount < minAllowed) {
      toast.error(`Minimum bid is $${minAllowed}`);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auctions/${id}/bid`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Bid failed");
      }

      toast.success(`Bid of $${amount} placed on ${title}`);
      fetchDashboardData();
    } catch (error) {
      console.error(error);
      toast.error(`${error.message}`);
    }
  };

  const renderAuctionBody = (auction, { expanded = false } = {}) => {
    const currentPrice = Number(
      auction.current_price ?? auction.currentPrice ?? 0
    );

    const startingPrice = Number(
      auction.starting_price ?? auction.startingPrice ?? 0
    );

    const minBid = currentPrice > 0 ? currentPrice + 1 : startingPrice;
    const seller = auction.seller_name ?? auction.sellerName ?? "Unknown";
    const inputValue = bidInputs[auction.auction_id] ?? minBid;

    const isEnded = endedAuctions.has(auction.auction_id);
    const isUpcoming = upcomingAuctions.has(auction.auction_id);

    return (
      <>
        <div className="card-media-box">
          <img
            src={
              auction.image_url ??
              auction.imageUrl ??
              "https://placehold.co/300x200"
            }
            alt={auction.title}
            className="auction-img"
          />

          <AuctionTimer
            startTime={auction.start_time ?? auction.startTime}
            endTime={auction.end_time ?? auction.endTime}
            onEnded={() => markAuctionEnded(auction.auction_id)}
            onStarted={() => markAuctionStarted(auction.auction_id)}
          />
        </div>

        <div className="auction-info-box">
          <div className="title-row">
            <h3>{auction.title}</h3>
            <span className="seller-tag">👤 {seller}</span>
          </div>

          <p className={`auction-description ${expanded ? "expanded" : ""}`}>
            {auction.description || "No description available."}
          </p>

          <div
            className="card-interactive"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="price-tag-box">
              <span>
                {currentPrice > 0 ? "Current High Bid" : "Starting Price"}
              </span>
              <strong>${currentPrice || startingPrice}</strong>
            </div>

            <div className="bid-controller">
              <button
                className="control-btn minus"
                disabled={isEnded || isUpcoming || inputValue <= minBid}
                onClick={() => handleDecrement(auction.auction_id, minBid)}
              >
                -
              </button>

              <input
                type="number"
                className="bid-number-input"
                value={inputValue}
                disabled={isEnded || isUpcoming}
                onChange={(e) =>
                  handleInputChange(auction.auction_id, e.target.value)
                }
                onBlur={() => handleInputBlur(auction.auction_id, minBid)}
              />

              <button
                className="control-btn plus"
                disabled={isEnded || isUpcoming}
                onClick={() => handleIncrement(auction.auction_id)}
              >
                +
              </button>
            </div>

            <button
              className="place-bid-btn"
              disabled={isEnded || isUpcoming}
              onClick={() =>
                handlePlaceBid(auction.auction_id, auction.title, minBid)
              }
            >
              {isEnded
                ? "Auction Ended"
                : isUpcoming
                ? "Locked Until Start"
                : "Submit Bid"}
            </button>
          </div>
        </div>
      </>
    );
  };

  const now = new Date();

  const activeAuctions = featuredAuctions.filter((a) => {
    const start = toDate(a.start_time);
    const end = toDate(a.end_time);
    return start && end && start <= now && end > now;
  });

  const upcomingAuctionsList = featuredAuctions.filter((a) => {
    const start = toDate(a.start_time);
    if (!start) return false;
    const minutes = (start - now) / (1000 * 60);
    return minutes > 0 && minutes <= 30;
  });

  const recentlyEndedAuctions = featuredAuctions.filter((a) => {
    const end = toDate(a.end_time);
    if (!end) return false;
    const minutes = (now - end) / (1000 * 60);
    return minutes >= 0 && minutes <= 30;
  });

  if (loading) {
    return <div className="loading">Loading SecureHub Dashboard...</div>;
  }

  const selectedAuction = featuredAuctions.find(
    (a) => a.auction_id === selectedAuctionId
  );

  return (
    <>
      <Navbar />

      {/* 3. TOASTER CONTAINER PLACED HERE */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }} 
      />

      <div className="dashboard">
        <section className="hero">
          <h1>Welcome to SecureHub</h1>
          <p>Secure, transparent and real-time online bidding platform.</p>
          <Link to="/browse-auction" className="hero-cta">Browse Auctions</Link>
        </section>

        {fetchError && (
          <div className="fetch-error-banner">
            {fetchError}! User may not be logged in or session expired. Please log in again.
          </div>
        )}

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
          <h2>Active Auctions</h2>

          <div className="auction-container">
            {activeAuctions.length ? (
              activeAuctions.map((a) => (
                <div
                  key={a.auction_id}
                  className="auction-card"
                  onClick={() => setSelectedAuctionId(a.auction_id)}
                >
                  {renderAuctionBody(a)}
                </div>
              ))
            ) : (
              <p>No active auctions.</p>
            )}
          </div>

          <h2>Starting Soon (30 Minutes)</h2>

          <div className="auction-container">
            {upcomingAuctionsList.map((a) => (
              <div
                key={a.auction_id}
                className="auction-card upcoming"
                onClick={() => setSelectedAuctionId(a.auction_id)}
              >
                {renderAuctionBody(a)}
              </div>
            ))}
          </div>

          <h2>Recently Ended</h2>

          <div className="auction-container">
            {recentlyEndedAuctions.map((a) => (
              <div
                key={a.auction_id}
                className="auction-card ended"
                onClick={() => setSelectedAuctionId(a.auction_id)}
              >
                {renderAuctionBody(a)}
              </div>
            ))}
          </div>
        </section>
      </div>

      {selectedAuction && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedAuctionId(null)}
        >
          <div
            className={`modal-content ${
              endedAuctions.has(selectedAuction.auction_id)
                ? "ended"
                : upcomingAuctions.has(selectedAuction.auction_id)
                ? "upcoming"
                : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedAuctionId(null)}
            >
              ×
            </button>

            {renderAuctionBody(selectedAuction, { expanded: true })}
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

export default Dashboard;