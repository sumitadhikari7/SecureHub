import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./MyBids.css";



function MyBids() {
  const navigate = useNavigate();

  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");

  useEffect(() => {
    const fetchBids = async () => {
      try {
        const userId = localStorage.getItem("userId");

        const response = await fetch(
          `http://localhost:5000/api/users/${userId}/bids`,
          {
            credentials: "include",
          }
        );
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        const data = await response.json();
        setBids(data);
      } catch (err) {
        console.error("Failed to fetch bids:", err);
        setError("Couldn't load your bids. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchBids();
  }, []);

  const getStatusClass = (status) => {
    switch (status) {
      case "Winning": return "status winning";
      case "Outbid": return "status outbid";
      case "Won": return "status won";
      case "Lost": return "status lost";
      default: return "status";
    }
  };

  const filteredBids = useMemo(() => {
    return bids.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "All Status" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bids, searchTerm, statusFilter]);

  const handleViewAuction = (auctionId) => {
    navigate(`/auction/${auctionId}`);
  };

  return (
    <>
      <Navbar />
      <div className="mybids-page">

        <div className="mybids-header">
          <h1>My Bids</h1>
          <p>Track the auctions you've participated in.</p>
        </div>

        <div className="mybids-search-filter">
          <input
            type="text"
            placeholder="Search your bids..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All Status</option>
            <option>Winning</option>
            <option>Outbid</option>
            <option>Won</option>
            <option>Lost</option>
          </select>
        </div>

        <div className="mybids-grid">
          {loading ? (
            <p>Loading your bids...</p>
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : filteredBids.length > 0 ? (
            filteredBids.map((item) => (
              <div className="mybids-card" key={item.auction_id}>
                <img
                  src={item.image_url || "https://via.placeholder.com/300x200"}
                  alt={item.title}
                />

                <h3>{item.title}</h3>
                <h2>${item.current_bid}</h2>

                <span className={getStatusClass(item.status)}>
                  {item.status}
                </span>

                <div className="dates">
                  <p><strong>My Bid:</strong> ${item.my_bid}</p>
                  <p><strong>Ends:</strong> {new Date(item.end_time).toLocaleDateString()}</p>
                </div>

                <button onClick={() => handleViewAuction(item.auction_id)}>
                  View Auction
                </button>
              </div>
            ))
          ) : (
            <p>
              {bids.length === 0
                ? "You haven't placed any bids yet."
                : "No bids match your search/filter."}
            </p>
          )}
        </div>

      </div>
    </>
  );
}

export default MyBids;