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