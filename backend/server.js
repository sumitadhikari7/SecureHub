require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');

const authRouter = require('./auth');

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', authRouter);

// 🏁 DYNAMIC DASHBOARD: Sorted by urgency, expanded visibility
app.get('/api/dashboard', async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM auctions WHERE start_time <= NOW() AND end_time > NOW()) AS active_auctions,
        (SELECT COUNT(*)::int FROM bids b
           JOIN auctions a ON a.auction_id = b.auction_id
           WHERE a.start_time <= NOW() AND a.end_time > NOW()) AS active_bids
    `);

    const featuredResult = await pool.query(`
      SELECT
        a.auction_id,
        a.title,
        a.description,
        a.starting_price,
        a.current_price,
        a.start_time,
        a.end_time,
        a.image_url,
        u.full_name AS seller_name,
        CASE 
          WHEN a.start_time > NOW() THEN 'upcoming'
          WHEN a.start_time <= NOW() AND a.end_time > NOW() THEN 'active'
          ELSE 'ended'
        END as status
      FROM auctions a
      LEFT JOIN users u ON a.seller_id = u.user_id
      WHERE 
        -- 1. Ended: Show items that finished in the last 15 minutes
        a.end_time >= NOW() - INTERVAL '15 minutes'
        OR 
        -- 2. Upcoming: Show items starting in the next 30 minutes (OR FARTHER)
        -- Removing the upper bound on start_time makes all future items visible!
        a.start_time > NOW()
      ORDER BY 
        -- Priority Sort: Active (1) > Upcoming (2) > Ended (3)
        CASE 
          WHEN a.start_time <= NOW() AND a.end_time > NOW() THEN 1
          WHEN a.start_time > NOW() THEN 2
          ELSE 3
        END ASC,
        -- Secondary Sort: Proximity
        CASE 
          WHEN a.start_time > NOW() THEN a.start_time
          ELSE a.end_time 
        END ASC
      LIMIT 10 -- Increased limit so you can see all your products!
    `);

    res.json({
      stats: {
        activeAuctions: statsResult.rows[0].active_auctions || 0,
        activeBids: statsResult.rows[0].active_bids || 0,
        watchlist: 0,
      },
      featured: featuredResult.rows || [],
    });
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).json({ message: "Failed to load dashboard data" });
  }
});

// 🔨 BIDS ENDPOINT
app.post('/api/bids', async (req, res) => {
  const { auction_id, bid_amount, bidder_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const auctionResult = await client.query(
      `SELECT current_price, starting_price, start_time, end_time FROM auctions WHERE auction_id = $1 FOR UPDATE`,
      [auction_id]
    );
    if (auctionResult.rows.length === 0) throw new Error("Auction not found");
    
    const auction = auctionResult.rows[0];
    if (new Date(auction.start_time) > new Date()) throw new Error("Auction not started");
    if (new Date(auction.end_time) <= new Date()) throw new Error("Auction ended");

    await client.query(`INSERT INTO bids (auction_id, bidder_id, bid_amount, bid_time) VALUES ($1, $2, $3, NOW())`,
      [auction_id, bidder_id ?? 1, bid_amount]);
    await client.query(`UPDATE auctions SET current_price = $1 WHERE auction_id = $2`,
      [bid_amount, auction_id]);
    await client.query("COMMIT");
    res.status(201).json({ message: "Bid placed successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ➕ CREATE NEW AUCTION
app.post('/api/auctions', upload.single('image'), async (req, res) => {
  const { title, description, startingPrice, startTime, endTime } = req.body;
  const imageUrl = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : null;
  const sellerId = 1;

  try {
    const newAuction = await pool.query(
      `INSERT INTO auctions (seller_id, title, description, starting_price, current_price, start_time, end_time, image_url, status) 
       VALUES ($1, $2, $3, $4, $4, $5, $6, $7, 
         CASE WHEN CAST($5 AS TIMESTAMPTZ) > NOW() THEN 'upcoming' ELSE 'active' END
       ) RETURNING *`,
      [sellerId, title, description, parseFloat(startingPrice), startTime, endTime, imageUrl]
    );
    res.status(201).json({ message: "Auction created successfully!", auction: newAuction.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database failure creating auction" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}!`);
});