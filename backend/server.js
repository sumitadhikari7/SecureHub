const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

// 1. Middleware setup
app.use(cors());
app.use(express.json());

// 2. Database configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD, 
  port: process.env.DB_PORT,
});

// 3. Multer configurations for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); 
  }
});
const upload = multer({ storage: storage });

// Serve your image files publicly so React can load them
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🛡️ USER REGISTRATION
app.post('/api/auth/register', async (req, res) => {
  const { firstName, middleName, lastName, phone, email } = req.body;
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

  try {
    const newUser = await pool.query(
      `INSERT INTO users (full_name, email, phone_number, status) 
       VALUES ($1, $2, $3, 'active') RETURNING *`,
      [fullName, email, phone]
    );
    res.status(201).json({ message: "Registration Successful! Switch to login." });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: "Email is already registered." });
    }
    console.error(err);
    res.status(500).json({ message: "Database error!" });
  }
});

// LOGIN MOCK API
app.post('/api/auth/login', (req, res) => {
  res.status(200).json({ message: "OTP sent successfully! (Mocked)" });
});

// DASHBOARD DATA API
app.get('/api/dashboard', async (req, res) => {
  try {
    // 💡 Count BOTH active and upcoming statuses so nothing hides!
    const auctionsCount = await pool.query(
      "SELECT COUNT(*) FROM auctions WHERE status IN ('active', 'upcoming')"
    );
    
    // Fetch the top 3 items to show on the dashboard stream
    const featuredItems = await pool.query(
      "SELECT auction_id, title, starting_price, current_price, image_url FROM auctions WHERE status IN ('active', 'upcoming') LIMIT 3"
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