import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import './AuctionDetails.css';

function AuctionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [bidAmount, setBidAmount] = useState("");
  const [bidStatus, setBidStatus] = useState(null); // { type: 'success' | 'error', message }
  const [submitting, setSubmitting] = useState(false);

  const fetchAuction = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/auctions/${id}`);
      if (!response.ok) {
        throw new Error(
          response.status === 404 ? "Auction not found" : `Server responded with ${response.status}`
        );
      }
      const data = await response.json();
      setAuction(data);
    } catch (err) {
      console.error("Failed to fetch auction:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    setBidStatus(null);

    if (!bidAmount || isNaN(bidAmount)) {
      setBidStatus({ type: "error", message: "Enter a valid bid amount." });
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`http://localhost:5000/api/auctions/${id}/bid`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(bidAmount),
          // TODO: replace with the actual logged-in user's id once auth is wired up
        }),
      });