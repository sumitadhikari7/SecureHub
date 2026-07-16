require('dotenv').config(); // Absolute top line so variables load first!

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); 
const multer = require('multer');
const path = require('path');

const authRouter = require('./auth'); // Imports your backend auth routes

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());

// Database configuration for dashboard stats
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD, 
  port: process.env.DB_PORT,
});

// Multer storage engine for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); 
  }
});
const upload = multer({ storage: storage });

// Serve static image uploads folder publicly
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount the Auth Router under the namespace prefix
app.use('/api/auth', authRouter); 

// 🏁 FIXED DASHBOARD DATA API
app.get('/api/dashboard', async (req, res) => {
  try {
    const auctionsCount = await pool.query(
      "SELECT COUNT(*) FROM auctions WHERE status IN ('active', 'upcoming')"
    );
    
    // ⚡ FIX: Added description and end_time so the frontend cards can render them!
    const featuredItems = await pool.query(
      "SELECT auction_id, title, description, starting_price, current_price, end_time, image_url FROM auctions WHERE status IN ('active', 'upcoming') LIMIT 3"
    );

    res.json({
      stats: {
        activeAuctions: parseInt(auctionsCount.rows[0].count) || 0,
        activeBids: 0,
        watchlist: 0
      },
      featured: featuredItems.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching dashboard data" });
  }
}); 

// 🔨 NEW BIDS ENDPOINT (Saves bid values permanently to PostgreSQL)
app.post('/api/bids', async (req, res) => {
  try {
    const { auction_id, bid_amount } = req.body;

    if (!auction_id || !bid_amount) {
      return res.status(400).json({ message: "Missing required auction_id or bid_amount." });
    }

    // Update the high bid value inside your database table row
    const result = await pool.query(
      "UPDATE auctions SET current_price = $1 WHERE auction_id = $2 RETURNING *",
      [parseFloat(bid_amount), auction_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Auction item not found." });
    }

    return res.status(200).json({
      message: "Bid successfully saved to database!",
      auction: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Database failure updating bid value." });
  }
});

// CREATE NEW AUCTION (Handles image upload + text payload fields)
app.post('/api/auctions', upload.single('image'), async (req, res) => {
  console.log("RECEIVED BODY:", req.body);
  const { title, description, startingPrice, endTime, status } = req.body;
  const imageUrl = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : null;
  const sellerId = 1;

  try {
    const newAuction = await pool.query(
      `INSERT INTO auctions (seller_id, title, description, starting_price, current_price, start_time, end_time, status, image_url) 
       VALUES ($1, $2, $3, $4, $4, CURRENT_TIMESTAMP, $5, $6, $7) RETURNING *`,
      [sellerId, title, description, parseFloat(startingPrice), endTime, status === 'in-progress' ? 'active' : 'upcoming', imageUrl]
    );

    res.status(201).json({ message: "Auction created successfully!", auction: newAuction.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database failure creating auction" });
  }
}); 

// Server execution port listener
app.listen(5000, () => {
  console.log("🚀 Backend server running smoothly on port 5000!");
});