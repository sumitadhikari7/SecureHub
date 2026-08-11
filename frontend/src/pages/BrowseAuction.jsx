import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./BrowseAuction.css";
import toast, { Toaster } from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function BrowseAuction() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // 🆕 Which auction_ids the current user has starred. /api/auctions itself
  // is a public route (no login required to browse), so this is fetched
  // separately via /api/watchlist - if that call 401s (user isn't logged
  // in), it's caught silently and every star just renders unfilled; the
  // toggle endpoint itself is what tells the user to log in if they try to
  // use it while logged out.
  const [watchlistedIds, setWatchlistedIds] = useState(() => new Set());

  // 🆕 Whether the visitor is currently logged in. Defaults to false (the
  // safer assumption) until /api/me confirms otherwise - gates the "View
  // Auction" button below so a logged-out click shows the login prompt
  // instead of navigating straight to a page that would just redirect them
  // to /login anyway.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/me`, {
          credentials: "include",
        });
        setIsLoggedIn(response.ok);
      } catch (err) {
        console.error("Failed to check login status:", err);
        setIsLoggedIn(false);
      }
    };

    checkLoginStatus();
  }, []);

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auctions`);

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();

        console.table(
          data.map((auction) => ({
            title: auction.title,
            start: auction.start_time,
            end: auction.end_time,
            status: auction.status,
          }))
        );

        setAuctions(data);
      } catch (err) {
        console.error("Failed to fetch auctions:", err);
        setError("Couldn't load auctions. Please try again later.");
        toast.error("Failed to load auctions");
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();
  }, []);

  // 🆕 Seed which cards should show a filled star. Logged-out visitors get
  // a 401 here, which is expected and not shown to the user - it just means
  // every star starts unfilled.
  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/watchlist`, {
          credentials: "include",
        });

        if (!response.ok) return; // not logged in, or nothing watchlisted yet

        const data = await response.json();
        setWatchlistedIds(new Set(data.map((a) => a.auction_id)));
      } catch (err) {
        console.error("Failed to fetch watchlist state:", err);
      }
    };

    fetchWatchlist();
  }, []);

  useEffect(() => {
    if (!auctions.length) return;

    auctions.forEach((a) => socket.emit("joinAuction", a.auction_id));

    return () => {
      auctions.forEach((a) => socket.emit("leaveAuction", a.auction_id));
    };
  }, [auctions]);

  useEffect(() => {
    const handleBidUpdate = ({ auction_id, current_price }) => {
      setAuctions((prev) =>
        prev.map((a) =>
          a.auction_id === auction_id ? { ...a, current_price } : a
        )
      );
    };

    socket.on("bidUpdate", handleBidUpdate);

    return () => socket.off("bidUpdate", handleBidUpdate);
  }, []);

  useEffect(() => {
    const handleNewAuction = (auction) => {
      const now = new Date();
      const start = new Date(auction.start_time);
      const end = new Date(auction.end_time);

      const status =
        now < start ? "upcoming" : now > end ? "ended" : "active";

      const withStatus = { ...auction, status };

      setAuctions((prev) => {
        if (prev.some((a) => a.auction_id === withStatus.auction_id)) {
          return prev;
        }
        return [withStatus, ...prev];
      });

      toast.success(`New Auction Created: ${auction.title}`);

      socket.emit("joinAuction", withStatus.auction_id);
    };

    socket.on("newAuction", handleNewAuction);

    return () => {
      socket.off("newAuction", handleNewAuction);
    };
  }, []);

  const handleViewAuction = (auctionId) => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }
    navigate(`/auction/${auctionId}`);
  };

  // 🆕 Add or remove an auction from the watchlist. Stops propagation so a
  // click on the star never also triggers anything on the card itself.
  const handleToggleWatchlist = async (e, auctionId) => {
    e.stopPropagation();

    const wasWatchlisted = watchlistedIds.has(auctionId);

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

      setWatchlistedIds((prev) => {
        const updated = new Set(prev);
        if (data.watchlisted) updated.add(auctionId);
        else updated.delete(auctionId);
        return updated;
      });

      toast.success(
        data.watchlisted ? "Added to your watchlist" : "Removed from watchlist"
      );
    } catch (err) {
      console.error(err);
      // The toggle endpoint returns "Please log in..." when logged out -
      // surface that message directly rather than a generic failure.
      toast.error(
        err.message ||
          (wasWatchlisted
            ? "Failed to remove from watchlist"
            : "Failed to add to watchlist")
      );
    }
  };

  // Filter auctions based on Search input and Status dropdown selection
  const filteredAuctions = auctions.filter((item) => {
    const matchesSearch = item.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort filtered auctions (active/upcoming first, ended last)
  const sortedAuctions = [...filteredAuctions].sort((a, b) => {
    const now = new Date();
    const aEnded = new Date(a.end_time) <= now;
    const bEnded = new Date(b.end_time) <= now;

    if (aEnded && !bEnded) return 1;
    if (!aEnded && bEnded) return -1;

    return new Date(a.end_time) - new Date(b.end_time);
  });

  return (
    <>
      <Navbar />

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

      <div className="browse-page">
        <div className="browse-header">
          <h1>Browse Auctions</h1>
          <p>Discover active auctions and place your bids.</p>
        </div>

        {/* SEARCH & STATUS FILTER ROW */}
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search auctions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Live Auctions</option>
            <option value="upcoming">Upcoming</option>
            <option value="ended">Ended</option>
          </select>
        </div>

        <div className="auction-grid">
          {loading ? (
            <p>Loading auctions...</p>
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : sortedAuctions.length > 0 ? (
            sortedAuctions.map((item) => {
              const isWatchlisted = watchlistedIds.has(item.auction_id);
              // A fresh watchlist add only makes sense for something not
              // yet over - once it's ended there's nothing left to track.
              // Items already watchlisted before ending stay removable.
              const blockNewWatchlist = item.status === "ended" && !isWatchlisted;

              return (
                <div className="auction-card" key={item.auction_id}>
                  <div className="auction-card-media">
                    <button
                      type="button"
                      className={`watchlist-star-btn ${
                        isWatchlisted ? "active" : ""
                      }`}
                      onClick={(e) =>
                        handleToggleWatchlist(e, item.auction_id)
                      }
                      disabled={blockNewWatchlist}
                      aria-label={
                        isWatchlisted
                          ? "Remove from watchlist"
                          : "Add to watchlist"
                      }
                      title={
                        blockNewWatchlist
                          ? "This auction has ended — can't add to watchlist"
                          : isWatchlisted
                          ? "Remove from watchlist"
                          : "Add to watchlist"
                      }
                    >
                      {isWatchlisted ? "★" : "☆"}
                    </button>

                    <img
                      src={
                        item.image_url ||
                        "https://via.placeholder.com/300x200"
                      }
                      alt={item.title}
                    />
                  </div>

                  <h3>{item.title}</h3>

                  <h2>
                    ${item.current_price || item.starting_price}
                  </h2>

                  <span className={`status status-${item.status}`}>
                    {item.status === "active" && "LIVE AUCTION"}
                    {item.status === "upcoming" && "UPCOMING"}
                    {item.status === "ended" && "ENDED"}
                  </span>

                  <div className="dates">
                    <p>
                      <strong>Starts:</strong>{" "}
                      {new Date(item.start_time).toLocaleString()}
                    </p>

                    <p>
                      <strong>Ends:</strong>{" "}
                      {new Date(item.end_time).toLocaleString()}
                    </p>
                  </div>

                  <button onClick={() => handleViewAuction(item.auction_id)}>
                    View Auction
                  </button>
                </div>
              );
            })
          ) : (
            <p>No auctions match your search criteria.</p>
          )}
        </div>
      </div>
      <Footer />

      {/* 🆕 Shown instead of navigating when a logged-out visitor clicks
          "View Auction" - AuctionDetails is now a protected route, so
          letting the click through would just bounce them to /login with
          no context. This gives them the reason first. */}
      {showLoginPrompt && (
        <div
          className="login-prompt-overlay"
          onClick={() => setShowLoginPrompt(false)}
        >
          <div
            className="login-prompt-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Please log in</h3>
            <p>
              You need to be logged in to view auction details and place
              bids.
            </p>
            <div className="login-prompt-actions">
              <button
                className="login-prompt-cancel"
                onClick={() => setShowLoginPrompt(false)}
              >
                Cancel
              </button>
              <button
                className="login-prompt-confirm"
                onClick={() => navigate("/login")}
              >
                Log In
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BrowseAuction;