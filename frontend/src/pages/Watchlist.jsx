/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from "react";
// 🆕 Reuses the exact same stylesheet as Dashboard so cards, buttons, the
// modal, and the responsive breakpoints all look and behave identically.
import "./Dashboard.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { socket } from "../socket";
import { Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function toDate(value) {
  if (!value) return null;
  const normalized =
    typeof value === "string" ? value.replace(" ", "T") : value;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

// Same countdown badge component as Dashboard.jsx, kept local to this file
// so this page has no dependency on Dashboard.jsx internals.
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
        return { text: formatMs(start - now), phase: "upcoming" };
      }

      if (end <= now) {
        return { text: "Auction Ended", phase: "ended" };
      }

      return { text: formatMs(end - now), phase: "live" };
    } catch {
      return { text: "Format Error", phase: "ended" };
    }
  };

  const [state, setState] = useState(calculateTimeLeft());
  const prevPhaseRef = useRef(state.phase);

  useEffect(() => {
    const interval = setInterval(() => {
      const value = calculateTimeLeft();
      setState(value);

      if (value.phase !== prevPhaseRef.current) {
        if (value.phase === "ended" && onEnded) onEnded();
        if (value.phase === "live" && onStarted) onStarted();
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

function Watchlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [bidInputs, setBidInputs] = useState({});
  const [endedAuctions, setEndedAuctions] = useState(() => new Set());
  const [upcomingAuctions, setUpcomingAuctions] = useState(() => new Set());
  const [selectedAuctionId, setSelectedAuctionId] = useState(null);

  const fetchWatchlist = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/watchlist`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to load watchlist");
      }

      setItems(data);
      setFetchError(null);

      const initialBids = {};
      const initialUpcoming = new Set();

      data.forEach((auction) => {
        const currentPrice = Number(auction.current_price ?? 0);
        const startingPrice = Number(auction.starting_price ?? 0);

        initialBids[auction.auction_id] =
          currentPrice > 0 ? currentPrice + 1 : startingPrice;

        const start = toDate(auction.start_time);
        if (start && start > new Date()) {
          initialUpcoming.add(auction.auction_id);
        }
      });

      setBidInputs(initialBids);
      setUpcomingAuctions(initialUpcoming);
      setLoading(false);
    } catch (error) {
      console.error("Watchlist fetch error:", error);
      setFetchError(error.message || "Failed to load watchlist");
      setLoading(false);
    }
  };

  useEffect(() => {
    //eslint-disable-next-line
    fetchWatchlist();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedAuctionId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Join the socket room for every watchlisted auction so bid updates on
  // this page are live, exactly like the Dashboard.
  useEffect(() => {
    if (!items.length) return;

    items.forEach((a) => socket.emit("joinAuction", a.auction_id));

    return () => {
      items.forEach((a) => socket.emit("leaveAuction", a.auction_id));
    };
  }, [items]);

  useEffect(() => {
    const handleBidUpdate = ({ auction_id, current_price }) => {
      setItems((prev) =>
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
      setBidInputs((prev) => ({ ...prev, [id]: value - 1 }));
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
      setBidInputs((prev) => ({ ...prev, [id]: min }));
    }
  };

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Bid failed");
      }

      toast.success(`Bid of $${amount} placed on ${title}`);
      fetchWatchlist();
    } catch (error) {
      console.error(error);
      toast.error(`${error.message}`);
    }
  };

  // On this page the star always starts filled (everything here IS
  // watchlisted), and clicking it removes the item from the list entirely.
  const handleRemoveFromWatchlist = async (e, auctionId) => {
    e.stopPropagation();

    try {
      const response = await fetch(
        `${API_BASE}/api/watchlist/${auctionId}/toggle`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update watchlist");
      }

      if (!data.watchlisted) {
        setItems((prev) => prev.filter((a) => a.auction_id !== auctionId));
        if (selectedAuctionId === auctionId) setSelectedAuctionId(null);
        toast.success("Removed from watchlist");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to update watchlist");
    }
  };

  const renderAuctionBody = (auction, { expanded = false } = {}) => {
    const currentPrice = Number(auction.current_price ?? 0);
    const startingPrice = Number(auction.starting_price ?? 0);
    const minBid = currentPrice > 0 ? currentPrice + 1 : startingPrice;
    const seller = auction.seller_name ?? "Unknown";
    const inputValue = bidInputs[auction.auction_id] ?? minBid;

    const isEnded = endedAuctions.has(auction.auction_id);
    const isUpcoming = upcomingAuctions.has(auction.auction_id);

    return (
      <>
        <div className="card-media-box">
          <button
            className="watchlist-toggle-btn active"
            onClick={(e) => handleRemoveFromWatchlist(e, auction.auction_id)}
            aria-label="Remove from watchlist"
            title="Remove from watchlist"
          >
            ★
          </button>

          <img
            src={auction.image_url ?? "https://placehold.co/300x200"}
            alt={auction.title}
            className="auction-img"
          />

          <AuctionTimer
            startTime={auction.start_time}
            endTime={auction.end_time}
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

  if (loading) {
    return <div className="loading">Loading your watchlist...</div>;
  }

  const selectedAuction = items.find(
    (a) => a.auction_id === selectedAuctionId
  );

  return (
    <>
      <Navbar />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { background: "#333", color: "#fff" },
        }}
      />

      <div className="dashboard">
        <section className="hero">
          <h1>My Watchlist</h1>
          <p>Every auction you've starred, in one place.</p>
          <Link to="/dashboard" className="hero-cta">Back to Dashboard</Link>
        </section>

        {fetchError && (
          <div className="fetch-error-banner">
            {fetchError}! User may not be logged in or session expired. Please log in again.
          </div>
        )}

        <section className="featured">
          <h2>Watchlisted Auctions</h2>

          {items.length ? (
            <div className="auction-container">
              {items.map((a) => {
                const isEnded = endedAuctions.has(a.auction_id);
                const isUpcoming = upcomingAuctions.has(a.auction_id);
                return (
                  <div
                    key={a.auction_id}
                    className={`auction-card ${
                      isEnded ? "ended" : isUpcoming ? "upcoming" : ""
                    }`}
                    onClick={() => setSelectedAuctionId(a.auction_id)}
                  >
                    {renderAuctionBody(a)}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="watchlist-empty">
              <h3>Your watchlist is empty</h3>
              <p>
                Tap the star on any auction card to keep an eye on it here.
              </p>
              <Link to="/browse-auction" className="hero-cta">
                Browse Auctions
              </Link>
            </div>
          )}
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

export default Watchlist;