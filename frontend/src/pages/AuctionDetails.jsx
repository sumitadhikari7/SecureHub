import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import Navbar from "../components/Navbar";
import "./AuctionDetails.css";
// 1. IMPORT TOAST & TOASTER
import toast, { Toaster } from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function AuctionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [bidAmount, setBidAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;

    const fetchAuction = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/api/auctions/${id}`);
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Auction not found"
              : `Server responded with ${response.status}`
          );
        }
        const data = await response.json();
        if (!ignore) {
          setAuction(data);
        }
      } catch (err) {
        console.error("Failed to fetch auction:", err);
        if (!ignore) {
          setError(err.message);
          toast.error(err.message || "Failed to load auction");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchAuction();

    return () => {
      ignore = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    socket.emit("joinAuction", id);

    return () => {
      socket.emit("leaveAuction", id);
    };
  }, [id]);

  useEffect(() => {
    const handleBidUpdate = (payload) => {
      if (String(payload.auction_id) !== String(id)) return;

      setAuction((prev) =>
        prev
          ? {
              ...prev,
              current_price: payload.current_price ?? prev.current_price,
              highest_bidder: payload.highest_bidder ?? prev.highest_bidder,
              highest_bid: payload.highest_bid ?? prev.highest_bid,
              bid_count: payload.bid_count ?? prev.bid_count,
              recent_bids: payload.recent_bids ?? prev.recent_bids,
            }
          : prev
      );

      // Real-time toast alert when a new higher bid arrives via WebSocket
      if (payload.highest_bidder && payload.current_price) {
        toast(`New High Bid: $${payload.current_price} by ${payload.highest_bidder}!`, {
          icon: "⚡",
        });
      }
    };

    socket.on("bidUpdate", handleBidUpdate);

    return () => socket.off("bidUpdate", handleBidUpdate);
  }, [id]);

  const refetchAuction = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auctions/${id}`);
      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "Auction not found"
            : `Server responded with ${response.status}`
        );
      }
      const data = await response.json();
      setAuction(data);
    } catch (err) {
      console.error("Failed to refresh auction:", err);
    }
  };

  // 2. REPLACED LOCAL STATE MESSAGES WITH TOAST NOTIFICATIONS
  const handleBidSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    if (!bidAmount || isNaN(bidAmount)) {
      toast.error("Please enter a valid bid amount.");
      return;
    }

    if (Number(bidAmount) <= Number(currentPrice)) {
      toast.error(`Bid must be strictly more than $${currentPrice}`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/auctions/${id}/bid`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(bidAmount),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(`${result.error || result.message || "Bid failed."}`);
      } else {
        toast.success(`🎉 Bid of $${bidAmount} placed successfully!`);
        setBidAmount("");
        refetchAuction();
      }
    } catch (err) {
      console.error("Failed to place bid:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="auction-details-page">
          <p>Loading auction...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="auction-details-page">
          <p className="error-message">{error}</p>
          <button onClick={() => navigate("/browse")}>Back to Browse</button>
        </div>
      </>
    );
  }

  const currentPrice = auction.current_price || auction.starting_price;
  const hasBids = auction.bid_count > 0;

  return (
    <>
      <Navbar />

      {/* 3. TOAST CONTAINER */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 3500,
          style: {
            background: "#1e293b",
            color: "#fff",
            borderRadius: "8px",
          },
        }} 
      />

      <div className="auction-details-page">
        <button className="back-button" onClick={() => navigate(-1)}>
          &larr; Back
        </button>

        <div className="auction-details-card">
          <img
            src={auction.image_url || "https://via.placeholder.com/500x350"}
            alt={auction.title}
            className="auction-details-image"
          />

          <div className="auction-details-info">
            <span className={`status status-${auction.status}`}>
              {auction.status === "active"
                ? "Active"
                : auction.status === "upcoming"
                ? "Upcoming"
                : "Ended"}
            </span>

            <h1>{auction.title}</h1>
            <p className="description">{auction.description}</p>

            <div className="price-block">
              <span className="label">
                {auction.status === "ended" ? "Final Price" : "Current Price"}
              </span>
              <span className="price">${currentPrice}</span>
            </div>

            {/* Winner / highest bidder / bid stats */}
            {auction.status === "ended" ? (
              <div
                className={`result-block ${
                  auction.highest_bidder ? "won" : "no-winner"
                }`}
              >
                {auction.highest_bidder ? (
                  <>
                    <span className="label">Winner</span>
                    <span className="winner-name">
                      🏆 {auction.highest_bidder}
                    </span>
                    <span className="sub-detail">
                      Winning bid: ${auction.highest_bid}
                    </span>
                  </>
                ) : (
                  <span className="sub-detail">
                    No bids were placed — auction ended with no winner.
                  </span>
                )}
              </div>
            ) : hasBids ? (
              <div className="result-block leading">
                <span className="label">Highest Bidder</span>
                <span className="winner-name">{auction.highest_bidder}</span>
                <span className="sub-detail">
                  Highest bid: ${auction.highest_bid}
                </span>
              </div>
            ) : (
              <p className="notice">No bids yet — be the first to bid.</p>
            )}

            <div className="stats-row">
              <div>
                <span className="label">Starting Price</span>
                <span className="value">${auction.starting_price}</span>
              </div>
              <div>
                <span className="label">Total Bids</span>
                <span className="value">{auction.bid_count}</span>
              </div>
            </div>

            <div className="dates">
              <p>
                <strong>Starts:</strong>{" "}
                {new Date(auction.start_time).toLocaleString()}
              </p>
              <p>
                <strong>Ends:</strong>{" "}
                {new Date(auction.end_time).toLocaleString()}
              </p>
            </div>

            {auction.status === "active" && (
              <form className="bid-form" onSubmit={handleBidSubmit}>
                <label htmlFor="bidAmount">
                  Your bid (must be more than ${currentPrice})
                </label>
                <div className="bid-input-row">
                  <input
                    id="bidAmount"
                    type="number"
                    step="0.01"
                    min={Number(currentPrice) + 0.01}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`> $${currentPrice}`}
                    required
                  />
                  <button type="submit" disabled={submitting}>
                    {submitting ? "Placing bid..." : "Place Bid"}
                  </button>
                </div>
              </form>
            )}

            {auction.status === "upcoming" && (
              <p className="notice">
                This auction hasn't started yet — check back soon.
              </p>
            )}

            {/* Recent bid history */}
            {auction.recent_bids && auction.recent_bids.length > 0 && (
              <div className="bid-history">
                <h3>Recent Bids</h3>
                <ul>
                  {auction.recent_bids.map((bid) => (
                    <li
                      key={bid.bid_id ?? `${bid.bidder_name}-${bid.bid_time}`}
                    >
                      <span className="bidder">{bid.bidder_name}</span>
                      <span className="amount">${bid.bid_amount}</span>
                      <span className="time">
                        {new Date(bid.bid_time).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default AuctionDetails;