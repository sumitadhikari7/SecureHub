require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const http = require('http');              // NEW
const { Server } = require('socket.io');   // NEW

const authRouter = require('./auth');

const app = express();
const server = http.createServer(app); // NEW — Express and Socket.IO now share this

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// Session Middleware
const sessionMiddleware = session({
  store: new pgSession({
    pool: pool,
    tableName: 'session',
  }),
  secret: process.env.SESSION_SECRET || "super-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false,
  },
});

app.use(sessionMiddleware);

// Auth check
app.get("/api/me", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });
  res.json({
    userId: req.session.userId,
    userName: req.session.userName,
    email: req.session.email,
  });
});
app.get("/api/debug-session", (req, res) => {
  res.json(req.session);
});
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage: storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', authRouter);

// 🏁 DASHBOARD
app.get('/api/dashboard', async (req, res) => {

  if (!req.session.userId) {
    return res.status(401).json({message:"Unauthorized"});
  }

  try {

    const statsResult = await pool.query(`
      SELECT
        (
          SELECT COUNT(*)::int
          FROM auctions
          WHERE start_time <= NOW()
          AND end_time > NOW()
        ) AS active_auctions,

        (
          SELECT COUNT(*)::int
          FROM bids
          WHERE bidder_id = $1
        ) AS active_bids
    `,[req.session.userId]);


    const featuredResult = await pool.query(`
      SELECT 
        a.*,
        u.full_name AS seller_name
      FROM auctions a
      LEFT JOIN users u 
      ON a.seller_id = u.user_id
      ORDER BY a.auction_id DESC
      LIMIT 10
    `);


    res.json({
      stats:{
        activeAuctions:
          statsResult.rows[0].active_auctions,

        activeBids:
          statsResult.rows[0].active_bids,

        watchlist:0
      },

      featured:featuredResult.rows
    });


  } catch(err){

    console.error(err);

    res.status(500).json({
      message:"Dashboard failed"
    });
  }

});
// ➕ CREATE AUCTION
app.post('/api/auctions', upload.single('image'), async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
  const { title, description, startingPrice, startTime, endTime } = req.body;
  const imageUrl = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : null;
  try {
    const newAuction = await pool.query(
      `INSERT INTO auctions (seller_id, title, description, starting_price, current_price, start_time, end_time, image_url) VALUES ($1, $2, $3, $4, $4, $5, $6, $7) RETURNING *`,
      [req.session.userId, title, description, parseFloat(startingPrice), startTime, endTime, imageUrl]
    );
    res.status(201).json(newAuction.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Database failure" });
  }
});

// GET ALL AUCTIONS
app.get('/api/auctions', async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT 
        a.*,
        u.full_name AS seller_name,

        CASE
          WHEN NOW() < a.start_time THEN 'upcoming'
          WHEN NOW() > a.end_time THEN 'ended'
          ELSE 'active'
        END AS status

      FROM auctions a

      LEFT JOIN users u
      ON a.seller_id = u.user_id

      ORDER BY
        CASE
          WHEN NOW() BETWEEN a.start_time AND a.end_time THEN 1
          WHEN NOW() < a.start_time THEN 2
          ELSE 3
        END,

        a.start_time ASC
    `);


    res.json(result.rows);

  } catch(err){

    console.error("Failed to fetch auctions:", err);

    res.status(500).json({
      error: "Failed to load auctions"
    });

  }
});

// 🔍 GET AUCTION DETAILS (Cleaned up - no body destructuring)
app.get('/api/auctions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const auctionResult = await pool.query(`SELECT *, CASE WHEN NOW() < start_time THEN 'upcoming' WHEN NOW() > end_time THEN 'ended' ELSE 'active' END AS status FROM auctions WHERE auction_id = $1`, [id]);
    
    if (auctionResult.rows.length === 0) return res.status(404).json({ error: "Not found" });

    const topBid = await pool.query(`SELECT b.bid_amount, u.full_name FROM bids b JOIN users u ON u.user_id = b.bidder_id WHERE b.auction_id = $1 ORDER BY b.bid_amount DESC LIMIT 1`, [id]);
    const history = await pool.query(`SELECT b.bid_amount, b.bid_time, u.full_name AS bidder_name FROM bids b JOIN users u ON u.user_id = b.bidder_id WHERE b.auction_id = $1 ORDER BY b.bid_time DESC LIMIT 5`, [id]);

    const bidCountResult = await pool.query(
  `SELECT COUNT(*)::int AS count 
   FROM bids 
   WHERE auction_id = $1`,
  [id]
);


res.json({
  ...auctionResult.rows[0],

  bid_count: bidCountResult.rows[0].count,

  highest_bid: topBid.rows[0]?.bid_amount || null,

  highest_bidder: topBid.rows[0]?.full_name || null,

  recent_bids: history.rows
});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔨 PLACE BID
app.post('/api/auctions/:id/bid', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Please login" });
  }

  const { id } = req.params;
  const { amount } = req.body;

  try {

    const auctionResult = await pool.query(
      `
      SELECT seller_id, current_price, start_time, end_time
      FROM auctions
      WHERE auction_id = $1
      `,
      [id]
    );
    console.log("Seller:", auctionResult.rows[0].seller_id);
    console.log("Bidder:", req.session.userId);

    if (auctionResult.rows.length === 0) {
      return res.status(404).json({
        error: "Auction not found"
      });
    }

    const auction = auctionResult.rows[0];

    if (auction.seller_id === req.session.userId) {
      return res.status(403).json({
        error: "You cannot bid on your own auction."
      });
    }

    if (Number(amount) <= Number(auction.current_price)) {
      return res.status(400).json({
        error: "Bid must be higher than the current price."
      });
    }

    await pool.query('BEGIN');

    await pool.query(
      `
      INSERT INTO bids
      (auction_id, bidder_id, bid_amount, bid_time)
      VALUES ($1, $2, $3, NOW())
      `,
      [id, req.session.userId, amount]
    );

    await pool.query(
      `
      UPDATE auctions
      SET current_price = $1
      WHERE auction_id = $2
      `,
      [amount, id]
    );

    await pool.query('COMMIT');

    res.json({
      success: true
    });

  } catch (err) {

    await pool.query('ROLLBACK');

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// GET all bids placed by a given user, with auction info + winning/outbid/won/lost status
// NOTE: replace :userId usage with real authenticated user id once auth is wired up
app.get('/api/users/:userId/bids', async (req, res) => {
  try {
    const { userId } = req.params;

    const query = `
SELECT
    a.auction_id,
    a.title,
    a.image_url,
    a.current_price,
    a.starting_price,
    a.start_time,
    a.end_time,

    CASE 
      WHEN NOW() < a.start_time THEN 'upcoming'
      WHEN NOW() > a.end_time THEN 'ended'
      ELSE 'active'
    END AS auction_status,

    user_bid.max_amount AS my_bid,
    top_bid.max_amount AS highest_amount

FROM auctions a

JOIN (
    SELECT 
        auction_id, 
        MAX(bid_amount) AS max_amount
    FROM bids
    WHERE bidder_id = $1
    GROUP BY auction_id

) user_bid 
ON user_bid.auction_id = a.auction_id


JOIN (

    SELECT 
        auction_id,
        MAX(bid_amount) AS max_amount
    FROM bids
    GROUP BY auction_id

) top_bid

ON top_bid.auction_id = a.auction_id

ORDER BY a.end_time DESC
`;
    const result = await pool.query(query, [userId]);

    const bids = result.rows.map((row) => {
      const isTopBidder = Number(row.my_bid) === Number(row.highest_amount);
      let status;
      if (row.auction_status === 'ended') {
        status = isTopBidder ? 'Won' : 'Lost';
      } else {
        status = isTopBidder ? 'Winning' : 'Outbid';
      }
      return {
        auction_id: row.auction_id,
        title: row.title,
        image_url: row.image_url,
        my_bid: row.my_bid,
        current_bid: row.current_price || row.starting_price,
        end_time: row.end_time,
        auction_status: row.auction_status,
        status,
      };
    });

    res.json(bids);
  } catch (err) {
    console.error("Failed to fetch user's bids:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/my-bids', async(req,res)=>{

  if(!req.session.userId){
    return res.status(401).json({
      error:"Not logged in"
    });
  }

  const result = await pool.query(
  `
  SELECT
    a.auction_id,
    a.title,
    a.image_url,
    a.current_price,
    a.end_time,
    MAX(b.bid_amount) AS my_bid
  FROM bids b
  JOIN auctions a
  ON a.auction_id=b.auction_id
  WHERE b.bidder_id=$1
  GROUP BY a.auction_id
  `,
  [req.session.userId]
  );

  res.json(result.rows);

});

// 👤 GET PROFILE
app.get('/api/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `SELECT user_id, full_name, email, phone_number, address, dob, profile_image
       FROM users WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Failed to fetch profile:", err);
    res.status(500).json({ message: "Failed to load profile" });
  }
});

// ✏️ UPDATE PROFILE
app.put('/api/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const { full_name, phone_number, address, dob } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users
       SET full_name = $1, phone_number = $2, address = $3, dob = $4
       WHERE user_id = $5
       RETURNING user_id, full_name, email, phone_number, address, dob, profile_image`,
      [full_name, phone_number, address, dob || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Failed to update profile:", err);
    res.status(500).json({ message: "Failed to save profile" });
  }
});

// 📷 UPLOAD PROFILE PHOTO
app.post('/api/profile/:userId/photo', upload.single('photo'), async (req, res) => {
  const { userId } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: "No photo uploaded" });
  }

  const imagePath = `/uploads/${req.file.filename}`;

  try {
    const result = await pool.query(
      `UPDATE users SET profile_image = $1 WHERE user_id = $2
       RETURNING profile_image`,
      [imagePath, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Failed to upload photo:", err);
    res.status(500).json({ message: "Failed to upload photo" });
  }
});

// 🗑️ REMOVE PROFILE PHOTO
app.delete('/api/profile/:userId/photo', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `UPDATE users SET profile_image = NULL WHERE user_id = $1
       RETURNING profile_image`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Failed to remove photo:", err);
    res.status(500).json({ message: "Failed to remove photo" });
  }
});



app.listen(5000, () => console.log("🚀 Server running on port 5000!"));