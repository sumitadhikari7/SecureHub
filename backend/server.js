require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const http = require('http');              
const { Server } = require('socket.io');   

const authRouter = require('./auth');
const { scoreBid, computeFeatures } = require('./fraudDetection');

const app = express();
const server = http.createServer(app); 

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

// Session Middleware (regular users)
const sessionMiddleware = session({
  store: new pgSession({
    pool: pool,
    tableName: 'session',
  }),
  secret: process.env.SESSION_SECRET || "super-secret-key",
  resave: false,
  saveUninitialized: false,
  name: 'connect.sid',
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false,
  },
});

// Session Middleware (admin) — deliberately a SEPARATE cookie/session store
// from the user one above. Previously both admin and user requests shared
// one session middleware/cookie, so req.session.userId and req.session.adminId
// could end up living in the same session row (e.g. testing both in one
// browser). Force-logging-out a suspended user called session.destroy() on
// that shared row, which wiped the admin's adminId too. Giving admin its own
// cookie name means the two are physically separate rows in the `session`
// table — destroying one can never affect the other.
const adminSessionMiddleware = session({
  store: new pgSession({
    pool: pool,
    tableName: 'session',
  }),
  secret: process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET || "super-secret-admin-key",
  resave: false,
  saveUninitialized: false,
  name: 'admin.sid',
  cookie: {
    maxAge: 8 * 60 * 60 * 1000, // 8h — admin sessions are shorter-lived by default
    httpOnly: true,
    secure: false,
  },
});

// Route by path: /api/admin/* gets its own session entirely; everything
// else (including the socket.io handshake) gets the regular user session.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/admin')) {
    return adminSessionMiddleware(req, res, next);
  }
  return sessionMiddleware(req, res, next);
});

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

// 🔍 GET AUCTION DETAILS
app.get('/api/auctions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const auctionResult = await pool.query(`SELECT *, CASE WHEN NOW() < start_time THEN 'upcoming' WHEN NOW() > end_time THEN 'ended' ELSE 'active' END AS status FROM auctions WHERE auction_id = $1`, [id]);
    
    if (auctionResult.rows.length === 0) return res.status(404).json({ error: "Not found" });

    const topBid = await pool.query(`SELECT b.bid_amount, u.full_name FROM bids b JOIN users u ON u.user_id = b.bidder_id WHERE b.auction_id = $1 ORDER BY b.bid_amount DESC LIMIT 1`, [id]);
    const history = await pool.query(`SELECT b.bid_amount, b.bid_time, u.full_name AS bidder_name FROM bids b JOIN users u ON u.user_id = b.bidder_id WHERE b.auction_id = $1 ORDER BY b.bid_time DESC LIMIT 5`, [id]);

    const bidCountResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM bids WHERE auction_id = $1`,
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
// Collateral rule: only the current highest bidder on an auction has funds
// held (deducted from users.balance). Every new highest bid:
//   1. Refunds the PREVIOUS highest bidder's held amount back to their balance.
//   2. Re-checks the new bidder's balance (which now reflects that refund if
//      they're re-bidding on their own leading bid) against the new amount.
//   3. Holds (deducts) the new amount from the new bidder's balance.
// Because refunds happen the instant someone is outbid - not at auction end -
// anyone who ends up losing has already gotten their money back. The only
// balance still held when an auction closes belongs to the winner, which is
// correct: that's their collateral paying for the win. No end-of-auction
// settlement step is needed for refunds.
app.post('/api/auctions/:id/bid', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Please login" });
  }

  const { id } = req.params;
  const bidderId = req.session.userId;
  const bidAmount = Number(req.body.amount);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const auctionResult = await client.query(
      `SELECT seller_id, current_price, start_time, end_time FROM auctions WHERE auction_id = $1 FOR UPDATE`,
      [id]
    );

    if (auctionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Auction not found" });
    }

    const auction = auctionResult.rows[0];
    const now = new Date();

    if (now < new Date(auction.start_time)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Auction hasn't started yet." });
    }
    if (now > new Date(auction.end_time)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Auction has already ended." });
    }
    if (auction.seller_id === bidderId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: "You cannot bid on your own auction." });
    }
    if (!Number.isFinite(bidAmount) || bidAmount <= Number(auction.current_price)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Bid must be higher than the current price." });
    }

    // Release the current top bidder's held collateral (if there is one) -
    // this happens before the balance check below so a user re-topping their
    // own leading bid sees their previously-held amount as available again.
    const topBidResult = await client.query(
      `SELECT bidder_id, bid_amount FROM bids WHERE auction_id = $1 ORDER BY bid_amount DESC LIMIT 1 FOR UPDATE`,
      [id]
    );

    if (topBidResult.rows.length > 0) {
      const { bidder_id: prevBidderId, bid_amount: prevAmount } = topBidResult.rows[0];
      await client.query(
        `UPDATE users SET balance = COALESCE(balance, 0) + $1 WHERE user_id = $2`,
        [prevAmount, prevBidderId]
      );
    }

    // Lock the bidder's row and confirm they can cover the new bid.
    const bidderResult = await client.query(
      `SELECT balance FROM users WHERE user_id = $1 FOR UPDATE`,
      [bidderId]
    );

    if (bidderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "User not found" });
    }

    const availableBalance = Number(bidderResult.rows[0].balance) || 0;

    if (bidAmount > availableBalance) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Insufficient collateral balance. You have $${availableBalance.toFixed(2)} available - load more collateral to place this bid.`
      });
    }

    // Hold the new bid amount.
    const newBalanceResult = await client.query(
      `UPDATE users SET balance = balance - $1 WHERE user_id = $2 RETURNING balance`,
      [bidAmount, bidderId]
    );

    await client.query(
      `INSERT INTO bids (auction_id, bidder_id, bid_amount, bid_time) VALUES ($1, $2, $3, NOW())`,
      [id, bidderId, bidAmount]
    );

    await client.query(
      `UPDATE auctions SET current_price = $1 WHERE auction_id = $2`,
      [bidAmount, id]
    );

    await client.query('COMMIT');

    const io = req.app.get('io');
    io.to(`auction:${id}`).emit('bidUpdate', {
      auction_id: Number(id),
      current_price: bidAmount,
      bidder_id: bidderId,
    });

    res.json({ success: true, newBalance: newBalanceResult.rows[0].balance });

    // Fraud scoring happens AFTER the response is sent and outside the bid
    // transaction — a scoring error or slow query here must never block or
    // fail an actual bid. See fraudDetection.js for the model and caveats.
    // Fraud scoring happens AFTER the response is sent
(async () => {
  try {
    const features = await computeFeatures(pool, {
      auctionId: Number(id),
      bidderId
    });

    if (!features) return;

    const fraudScore = scoreBid(features);

    // Debug logs
    console.log("=================================");
    console.log("FRAUD DETECTION");
    console.log("Bidder:", bidderId);
    console.log("Auction:", id);
    console.log("Features:", features);
    console.log("Risk score:", fraudScore);
    console.log(
      "Prediction:",
      fraudScore >= 0.65 ? "Fraudulent" : "Normal"
    );
    console.log("=================================");

    // 🚨 THIS IS THE IF STATEMENT
    if (fraudScore >= 0.65) {
  const prediction = "Fraudulent";

  await pool.query(
    `INSERT INTO fraud_alerts
      (user_id, auction_id, risk_score, prediction, alert_status, features, created_at)
     VALUES
      ($1, $2, $3, $4, 'pending', $5, NOW())`,
    [bidderId, id, fraudScore, prediction, JSON.stringify(features)]
  );

      const io = req.app.get('io');

      io.emit('fraudAlert', {
        bidder_id: bidderId,
        auction_id: Number(id),
        risk_score: fraudScore,
        prediction
      });

      console.log("🚨 FRAUD ALERT CREATED");
    }

  } catch (fraudErr) {
    console.error("Fraud scoring error:", fraudErr.message);
  }
})();

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/users/:userId/bids', async (req, res) => {
  try {
    const { userId } = req.params;

    const query = `
      SELECT
          a.auction_id, a.title, a.image_url, a.current_price, a.starting_price, a.start_time, a.end_time,
          CASE WHEN NOW() < a.start_time THEN 'upcoming' WHEN NOW() > a.end_time THEN 'ended' ELSE 'active' END AS auction_status,
          user_bid.max_amount AS my_bid, top_bid.max_amount AS highest_amount
      FROM auctions a
      JOIN (SELECT auction_id, MAX(bid_amount) AS max_amount FROM bids WHERE bidder_id = $1 GROUP BY auction_id) user_bid ON user_bid.auction_id = a.auction_id
      JOIN (SELECT auction_id, MAX(bid_amount) AS max_amount FROM bids GROUP BY auction_id) top_bid ON top_bid.auction_id = a.auction_id
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
  if(!req.session.userId) return res.status(401).json({ error:"Not logged in" });

  const result = await pool.query(
    `SELECT a.auction_id, a.title, a.image_url, a.current_price, a.end_time, MAX(b.bid_amount) AS my_bid 
     FROM bids b JOIN auctions a ON a.auction_id=b.auction_id WHERE b.bidder_id=$1 GROUP BY a.auction_id`,
    [req.session.userId]
  );
  res.json(result.rows);
});

// 👤 GET PROFILE
app.get('/api/profile/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        u.user_id,
        u.full_name,
        u.email,
        u.phone_number,
        u.address,
        u.dob,
        u.profile_image,
        u.balance,
        COALESCE(
          (SELECT SUM(amount) FROM collateral_requests WHERE user_id = u.user_id AND status = 'approved'),
          0
        ) AS "totalCollateralLoaded"
       FROM users u
       WHERE u.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("Failed to fetch profile:", err);

    res.status(500).json({
      message: "Failed to load profile"
    });
  }
});

// ✏️ UPDATE PROFILE
app.put('/api/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const { full_name, phone_number, address, dob } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users SET full_name = $1, phone_number = $2, address = $3, dob = $4 WHERE user_id = $5 RETURNING user_id, full_name, email, phone_number, address, dob, profile_image`,
      [full_name, phone_number, address, dob || null, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Failed to update profile:", err);
    res.status(500).json({ message: "Failed to save profile" });
  }
});

// 📷 UPLOAD PROFILE PHOTO
app.post('/api/profile/:userId/photo', upload.single('photo'), async (req, res) => {
  const { userId } = req.params;
  if (!req.file) return res.status(400).json({ message: "No photo uploaded" });

  const imagePath = `/uploads/${req.file.filename}`;
  try {
    const result = await pool.query(
      `UPDATE users SET profile_image = $1 WHERE user_id = $2 RETURNING profile_image`,
      [imagePath, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
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
      `UPDATE users SET profile_image = NULL WHERE user_id = $1 RETURNING profile_image`,
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Failed to remove photo:", err);
    res.status(500).json({ message: "Failed to remove photo" });
  }
});

const io = new Server(server, {
  cors: { origin: "http://localhost:5173", credentials: true },
});

io.engine.use(sessionMiddleware);

// 🔌 Track every live socket per logged-in user_id, so we can force-kick a
// user off the app the instant an admin suspends them, and so the
// auto-unsuspend sweep can notify anyone waiting on the login page.
const userSockets = new Map(); // userId -> Set<socket>

function trackSocket(userId, socket) {
  if (!userId) return;
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socket);
}

function untrackSocket(userId, socket) {
  if (!userId || !userSockets.has(userId)) return;
  const set = userSockets.get(userId);
  set.delete(socket);
  if (set.size === 0) userSockets.delete(userId);
}

// Force-kick a user off every live connection and kill their server session,
// so a suspension takes effect immediately even if they're mid-session.
function forceLogoutUser(userId, payload) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  for (const s of sockets) {
    s.emit('forceLogout', payload);
    if (s.request?.session) {
      s.request.session.destroy(() => {});
    }
    s.disconnect(true);
  }
  userSockets.delete(userId);
}

io.on('connection', (socket) => {
  const userId = socket.request.session?.userId;
  trackSocket(userId, socket);

  socket.on('joinAuction', (auctionId) => {
    const uid = socket.request.session?.userId;
    if (!uid) {
      socket.emit('authError', 'Please log in to follow this auction live.');
      return;
    }
    socket.join(`auction:${auctionId}`);
  });

  socket.on('leaveAuction', (auctionId) => {
    socket.leave(`auction:${auctionId}`);
  });

  socket.on('disconnect', () => {
    untrackSocket(userId, socket);
  });
});

// 🔓 AUTO-UNSUSPEND SWEEP
// Suspensions carry an explicit suspended_until timestamp (NULL means
// permanent and is never touched here). This sweep runs continuously in the
// background and lifts any suspension whose time has passed, independent of
// whether the user ever visits the login page again.
const SUSPENSION_SWEEP_INTERVAL_MS = 15 * 1000; // 15s: fine for demo (1 min) and real (days) durations

async function sweepExpiredSuspensions() {
  try {
    const result = await pool.query(
      `UPDATE users
       SET status = 'active',
           suspended_at = NULL,
           suspended_until = NULL,
           suspension_reason = NULL
       WHERE status = 'suspended'
         AND suspended_until IS NOT NULL
         AND suspended_until <= NOW()
       RETURNING user_id`
    );

    for (const row of result.rows) {
      console.log(`🔓 Auto-reactivated user ${row.user_id} (suspension expired)`);
      const sockets = userSockets.get(row.user_id);
      if (sockets) {
        for (const s of sockets) s.emit('accountReactivated');
      }
    }
  } catch (err) {
    console.error("Suspension sweep error:", err.message);
  }
}

setInterval(sweepExpiredSuspensions, SUSPENSION_SWEEP_INTERVAL_MS);
// Run once at boot too, in case suspensions expired while the server was down.
sweepExpiredSuspensions();

// 🛡️ ADMIN LOGIN
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const adminResult = await pool.query(
      'SELECT * FROM admin WHERE email = $1 AND password = $2', 
      [email, password]
    );
    if (adminResult.rows.length === 0) return res.status(401).json({ message: "Invalid admin credentials" });

    const admin = adminResult.rows[0];
    req.session.adminId = admin.admin_id;
    req.session.adminEmail = admin.email;

    req.session.save((err) => {
      if (err) return res.status(500).json({ message: "Session save failed" });
      res.json({ success: true, message: "Admin login successful" });
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

// 📊 ADMIN STATS
app.get('/api/admin/stats', async (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const userCount = await pool.query('SELECT COUNT(*)::int FROM users');
    const flaggedCount = await pool.query("SELECT COUNT(*)::int FROM fraud_alerts WHERE alert_status = 'pending'");
    const pendingCollateralCount = await pool.query('SELECT COUNT(*) FROM collateral_requests WHERE status = $1', ['pending']);
    const auctionCount = await pool.query('SELECT COUNT(*)::int FROM auctions WHERE end_time > NOW()');
    
    res.json({
      totalUsers: userCount.rows[0].count,
      flaggedAccounts: flaggedCount.rows[0].count,
      pendingCollateral: pendingCollateralCount.rows[0].count,
      activeAuctions: auctionCount.rows[0].count
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// 🚪 ADMIN LOGOUT
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Logout failed" });
    res.clearCookie('admin.sid'); // admin now has its own cookie, not connect.sid
    res.json({ success: true, message: "Logged out successfully" });
  });
});

// 👥 GET ALL USERS FOR ADMIN
app.get('/api/admin/users', async (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ message: "Unauthorized 🛑" });

  try {
    const result = await pool.query(
      'SELECT user_id AS id, full_name AS name, email, status, profile_image AS "profileImage", created_at AS "createdAt" FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// 🔄 UPDATE USER STATUS (Fixed type coercion parameters)
app.patch('/api/admin/users/:id/status', async (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ message: "Unauthorized 🛑" });

  const { id } = req.params;
  const { status } = req.body; 

  try {
    await pool.query(
      `UPDATE users 
       SET status = $1, 
           suspended_at = CASE WHEN $2 = 'suspended' THEN CURRENT_TIMESTAMP ELSE NULL END 
       WHERE user_id = $3`,
      [status, status, id]
    );

    // Manual status changes made outside the fraud-alert flow don't carry a
    // duration/reason, so make sure stale suspension metadata never lingers
    // once an admin flips someone back to active by hand.
    if (status !== 'suspended') {
      await pool.query(
        `UPDATE users SET suspended_until = NULL, suspension_reason = NULL WHERE user_id = $1`,
        [id]
      );
    } else {
      forceLogoutUser(Number(id), {
        reason: "Suspended by admin.",
        suspendedUntil: null,
      });
    }

    res.json({ message: `User status updated to ${status} successfully! 🎉` });
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ message: "Failed to update status" });
  }
});

// 🚨 GET ALL FLAGGED / SUSPENDED ACCOUNTS
app.get('/api/admin/flagged-accounts', async (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ message: "Unauthorized 🛑" });

  try {
    const result = await pool.query(
      `SELECT user_id AS id, full_name AS name, email, status, suspended_at AS "suspendedAt" 
       FROM users 
       WHERE status = 'suspended' 
       ORDER BY suspended_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch flagged accounts error:", err);
    res.status(500).json({ message: "Failed to load flagged accounts" });
  }
});

// 🟢 UNSUSPEND A SPECIFIC USER ACCOUNT
app.patch('/api/admin/users/:id/unsuspend', async (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ message: "Unauthorized 🛑" });

  const { id } = req.params;

  try {
    await pool.query(
      `UPDATE users SET status = 'active', suspended_at = NULL, suspended_until = NULL, suspension_reason = NULL WHERE user_id = $1`,
      [id]
    );
    res.json({ message: "User unsuspended successfully! 🎉" });
  } catch (err) {
    console.error("Unsuspend error:", err);
    res.status(500).json({ message: "Failed to unsuspend user" });
  }
});

// 💸 USER SUBMIT COLLATERAL / DEPOSIT REQUEST
app.post('/api/user/collateral-request', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized 🛑" });
  }

  const { amount, transactionId } = req.body;

  if (!amount || !transactionId) {
    return res.status(400).json({ message: "Amount and Transaction ID are required! ⚠️" });
  }

  try {
    const userResult = await pool.query(
      `SELECT balance FROM users WHERE user_id = $1`,
      [req.session.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentBalance = userResult.rows[0].balance || 0;

    await pool.query(
      `INSERT INTO collateral_requests (user_id, amount, current_balance, transaction_id, status, created_at)
       VALUES ($1, $2, $3, $4, 'pending', NOW())`,
      [req.session.userId, amount, currentBalance, transactionId]
    );

    return res.setHeader('Content-Type', 'application/json').status(201).json({ message: "Collateral request submitted successfully! 🚀" });
  } catch (err) {
    console.error("Submit collateral request error:", err);
    return res.setHeader('Content-Type', 'application/json').status(500).json({ message: "Failed to submit collateral request" });
  }
});

// 📋 GET ALL PENDING COLLATERAL REQUESTS
app.get('/api/admin/collateral-requests', async (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ message: "Unauthorized 🛑" });

  try {
    const result = await pool.query(
      `SELECT r.request_id AS id, r.user_id AS "userId", u.full_name AS name, u.email, 
              r.amount, r.current_balance AS "currentBalance", r.transaction_id AS "transactionId", r.status, r.created_at AS "submittedAt"
       FROM collateral_requests r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.status = 'pending'
       ORDER BY r.created_at DESC`
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Fetch collateral requests error:", err);
    res.status(500).json({ message: "Failed to load collateral requests" });
  }
});

// 🔍 GET SINGLE COLLATERAL REQUEST BY ID
app.get('/api/admin/collateral-requests/:id', async (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ message: "Unauthorized 🛑" });

  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT r.request_id AS id, r.user_id AS "userId", u.full_name AS name, u.email, 
              r.amount, r.current_balance AS "currentBalance", r.transaction_id AS "transactionId", r.status, r.created_at AS "submittedAt"
       FROM collateral_requests r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.request_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Collateral request not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Fetch single collateral request error:", err);
    res.status(500).json({ message: "Failed to load request details" });
  }
});

// ✅ APPROVE COLLATERAL REQUEST
// Approval always adds the EXACT requested amount to the user's balance.
// There is deliberately no way to pass a custom balance here (no
// req.body.balance is read at all) - an admin's only choices are approve
// (grants the requested amount, verified against the transaction ID) or
// reject (grants nothing). This keeps "Total Collateral" (sum of approved
// request amounts) and a user's real balance ceiling from ever drifting
// apart, which is what happens if an admin can type an arbitrary number.
app.post('/api/admin/collateral-requests/:id/approve', async (req, res) => {
  if (!req.session.adminId) {
    return res.status(401).json({ message: "Unauthorized 🛑" });
  }

  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const requestResult = await client.query(
      `SELECT request_id, user_id, amount, status
       FROM collateral_requests
       WHERE request_id = $1
       FOR UPDATE`,
      [id]
    );

    if (requestResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Collateral request not found" });
    }

    const request = requestResult.rows[0];

    if (request.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: `This request has already been ${request.status}.` });
    }

    const userId = request.user_id;
    const amount = Number(request.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid collateral amount" });
    }

    const balanceResult = await client.query(
      `UPDATE users SET balance = COALESCE(balance, 0) + $1 WHERE user_id = $2 RETURNING balance`,
      [amount, userId]
    );

    if (balanceResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "User not found" });
    }

    const newBalance = balanceResult.rows[0].balance;

    await client.query(
      `UPDATE collateral_requests
       SET status = 'approved'
       WHERE request_id = $1`,
      [id]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Collateral approved successfully! 🎉",
      amountAdded: amount,
      newBalance
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Approve collateral error:", err);
    res.status(500).json({ message: "Failed to approve collateral request" });
  } finally {
    client.release();
  }
});

// ❌ REJECT COLLATERAL REQUEST
app.post('/api/admin/collateral-requests/:id/reject', async (req, res) => {
  if (!req.session.adminId) {
    return res.status(401).json({ message: "Unauthorized 🛑" });
  }

  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE collateral_requests
       SET status = 'rejected'
       WHERE request_id = $1
       AND status = 'pending'
       RETURNING request_id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Pending collateral request not found" });
    }

    res.json({ success: true, message: "Collateral request rejected successfully!" });
  } catch (err) {
    console.error("Reject collateral error:", err);
    res.status(500).json({ message: "Failed to reject collateral request" });
  }
});

// 👤 GET CURRENT ADMIN SESSION INFO
app.get('/api/admin/me', async (req, res) => {
  if (!req.session.adminId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const adminResult = await pool.query(
      'SELECT full_name AS name, email FROM admin WHERE admin_id = $1',
      [req.session.adminId]
    );

    if (adminResult.rows.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json(adminResult.rows[0]);
  } catch (err) {
    console.error("Fetch admin session error:", err);
    res.status(500).json({ message: "Failed to fetch admin info" });
  }
});

// 🕵️ GET FRAUD ALERTS — now includes suspension state for review UI
app.get('/api/admin/fraud-alerts', async (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ message: "Unauthorized 🛑" });

  try {
    const result = await pool.query(
      `SELECT
          f.alert_id AS id,
          f.user_id AS "userId",
          u.full_name AS name,
          u.email,
          u.status AS "userStatus",
          u.suspended_until AS "suspendedUntil",

          f.auction_id AS "auctionId",
          a.title AS "auctionTitle",

          f.risk_score AS "riskScore",
          f.prediction,
          f.alert_status AS "alertStatus",
          f.action_taken AS "actionTaken",
          f.suspension_duration_days AS "suspensionDurationDays",
          u.suspension_reason AS "suspensionReason",

          f.reviewed_by AS "reviewedBy",
          admin.full_name AS "reviewedByName",
          f.reviewed_at AS "reviewedAt",
          f.created_at AS "createdAt"

       FROM fraud_alerts f
       JOIN users u ON u.user_id = f.user_id
       LEFT JOIN auctions a ON a.auction_id = f.auction_id
       LEFT JOIN admin ON admin.admin_id = f.reviewed_by
       ORDER BY f.created_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch fraud alerts error:", err);
    res.status(500).json({ message: "Failed to load fraud alerts" });
  }
});

// 🚫 SUSPEND ACCOUNT FROM A FRAUD ALERT
app.post('/api/admin/fraud-alerts/:id/suspend', async (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ message: "Unauthorized 🛑" });

  const { id } = req.params;
  const { durationValue, durationUnit, permanent, reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: "A review reason is required." });
  }

  const allowedUnits = ["minutes", "days"];
  if (!permanent) {
    if (!allowedUnits.includes(durationUnit) || !Number.isFinite(Number(durationValue)) || Number(durationValue) <= 0) {
      return res.status(400).json({ message: "Provide a valid suspension length or mark it permanent." });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const alertResult = await client.query(
      `SELECT alert_id, user_id, alert_status FROM fraud_alerts WHERE alert_id = $1 FOR UPDATE`,
      [id]
    );
    if (alertResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Fraud alert not found" });
    }

    const alert = alertResult.rows[0];
    if (alert.alert_status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: `This alert has already been ${alert.alert_status}.` });
    }

    const value = permanent ? null : Math.floor(Number(durationValue));
    const unit = permanent ? null : durationUnit; // 'minutes' | 'days'

    // suspension_duration_days stays in days for reporting; minutes-based
    // demo suspensions are recorded as 0 there (their real length lives in
    // suspended_until, which is unit-correct regardless).
    const durationDaysForRecord = unit === "days" ? value : unit === "minutes" ? 0 : null;

    // FIX: the previous version cast $2 to ::int and then tried `::int || ' '`,
    // which is not a valid Postgres operator (integer || text does not
    // exist) and silently rolled back this ENTIRE transaction on every call
    // — nothing was ever actually saved. Casting both sides to ::text fixes it.
    const updatedUser = await client.query(
      `UPDATE users
       SET status = 'suspended',
           suspended_at = NOW(),
           suspended_until = CASE
             WHEN $1::text IS NULL THEN NULL
             ELSE NOW() + ($2::text || ' ' || $1::text)::interval
           END,
           suspension_reason = $3
       WHERE user_id = $4
       RETURNING suspended_until`,
      [unit, value, reason.trim(), alert.user_id]
    );

    const updatedAlert = await client.query(
      `UPDATE fraud_alerts
       SET alert_status = 'reviewed',
           action_taken = 'suspended',
           suspension_duration_days = $1,
           reviewed_by = $2,
           reviewed_at = NOW()
       WHERE alert_id = $3
       RETURNING alert_id AS id, alert_status AS "alertStatus", action_taken AS "actionTaken",
                 suspension_duration_days AS "suspensionDurationDays", reviewed_by AS "reviewedBy",
                 reviewed_at AS "reviewedAt"`,
      [durationDaysForRecord, req.session.adminId, id]
    );

    await client.query("COMMIT");

    const suspendedUntil = updatedUser.rows[0].suspended_until; // real DB value, not a client-side guess

    // Kick the user off immediately if they're currently logged in anywhere.
    forceLogoutUser(alert.user_id, {
      reason: reason.trim(),
      suspendedUntil,
    });

    res.json({
      success: true,
      message: "Account suspended and alert marked as reviewed.",
      alert: {
        ...updatedAlert.rows[0],
        suspendedUntil,
        suspensionReason: reason.trim(),
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Suspend from fraud alert error:", err);
    res.status(500).json({ message: "Failed to suspend account" });
  } finally {
    client.release();
  }
});

// ✅ DISMISS A FRAUD ALERT (reviewed as false positive, no action taken)
app.post('/api/admin/fraud-alerts/:id/dismiss', async (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ message: "Unauthorized 🛑" });

  const { id } = req.params;
  const { reason } = req.body;

  try {
    const result = await pool.query(
      `UPDATE fraud_alerts
       SET alert_status = 'dismissed',
           action_taken = 'dismissed',
           reviewed_by = $1,
           reviewed_at = NOW()
       WHERE alert_id = $2 AND alert_status = 'pending'
       RETURNING alert_id AS id, alert_status AS "alertStatus", action_taken AS "actionTaken",
                 reviewed_by AS "reviewedBy", reviewed_at AS "reviewedAt"`,
      [req.session.adminId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Pending fraud alert not found" });
    }

    res.json({
      success: true,
      message: "Alert dismissed as false positive.",
      alert: { ...result.rows[0], suspensionReason: reason || null },
    });
  } catch (err) {
    console.error("Dismiss fraud alert error:", err);
    res.status(500).json({ message: "Failed to dismiss alert" });
  }
});

app.set('io', io);
server.listen(5000, () => console.log("🚀 Server running on port 5000!"));