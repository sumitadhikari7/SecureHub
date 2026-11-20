const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const redis = require('redis');
const nodemailer = require('nodemailer');

// Database Connection Pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Redis Cache Client
const redisClient = redis.createClient();

redisClient.connect().catch((err) => {
  console.error("Redis Connection Error:", err);
});

// Nodemailer Gmail Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

// Shared helper: builds suspension payload / auto-lifts expired suspensions
async function checkAndSyncSuspension(user) {
  if (user.status !== 'suspended') {
    return { suspended: false };
  }

  if (user.suspended_until && new Date(user.suspended_until) <= new Date()) {
    await pool.query(
      `UPDATE users
       SET status = 'active', suspended_at = NULL, suspended_until = NULL, suspension_reason = NULL
       WHERE user_id = $1`,
      [user.user_id]
    );
    return { suspended: false };
  }

  return {
    suspended: true,
    reason: user.suspension_reason || "No reason provided.",
    suspendedUntil: user.suspended_until || null, // null = permanent
  };
}

// -----------------------------------------------------------------------------
// 1. REGISTER STEP 1: Send OTP to Registration Email
// -----------------------------------------------------------------------------
router.post('/register-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email address is required.' });
  }

  try {
    // Check if email already exists in Postgres
    const userCheck = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({
        message: 'Email is already registered.',
      });
    }

    // Generate 6-digit OTP
    const generatedOtp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Store in Redis with prefix `register_otp:` for 5 minutes (300 secs)
    await redisClient.setEx(
      `register_otp:${email}`,
      300,
      generatedOtp
    );

    // Send Mail
    await transporter.sendMail({
      from: `"SecureHub" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'SecureHub Registration Verification Code',
      html: `
        <div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:5px;">
          <h2>SecureHub Account Registration</h2>
          <p>Your verification code is:</p>
          <h1 style="color:#4F46E5;letter-spacing:2px;font-size:32px;">
            ${generatedOtp}
          </h1>
          <p style="font-size:12px;color:#666;">
            This code is valid for 5 minutes.
          </p>
        </div>
      `,
    });

    console.log(`Registration OTP sent to ${email}`);

    res.status(200).json({
      message: 'Verification code sent to your email.',
    });
  } catch (err) {
    console.error('Register OTP Error:', err);
    res.status(500).json({
      message: 'Failed to send verification email.',
    });
  }
});

// -----------------------------------------------------------------------------
// 2. REGISTER STEP 2: Verify OTP & Create User Record
// -----------------------------------------------------------------------------
router.post('/register', async (req, res) => {
  const {
    firstName,
    middleName,
    lastName,
    phone,
    email,
    password,
    otp,
  } = req.body;

  if (!otp) {
    return res.status(400).json({ message: 'Verification OTP is required.' });
  }

  try {
    // Retrieve OTP from Redis
    const storedOtp = await redisClient.get(`register_otp:${email}`);

    if (!storedOtp || storedOtp !== otp) {
      return res.status(400).json({
        message: 'Invalid or expired verification code.',
      });
    }

    const fullName = [firstName, middleName, lastName]
      .filter(Boolean)
      .join(' ');

    // Insert user into PostgreSQL
    await pool.query(
      `
      INSERT INTO users
      (full_name, email, phone_number, password, status)
      VALUES ($1, $2, $3, $4, 'active')
      `,
      [fullName, email, phone, password]
    );

    // Delete registration OTP after successful user insertion
    await redisClient.del(`register_otp:${email}`);

    res.status(201).json({
      message: 'Account verified & created successfully!',
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({
        message: 'Email is already registered.',
      });
    }

    console.error('Registration Insertion Error:', err);

    res.status(500).json({
      message: 'Server database failure during account creation.',
    });
  }
});

// -----------------------------------------------------------------------------
// 3. LOGIN STEP 1 - Verify Password & Send OTP
// -----------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userCheck.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const user = userCheck.rows[0];

    if (!user.password || user.password.trim() !== password.trim()) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const suspensionInfo = await checkAndSyncSuspension(user);
    if (suspensionInfo.suspended) {
      return res.status(403).json({
        message: 'Your account has been suspended.',
        suspended: true,
        reason: suspensionInfo.reason,
        suspendedUntil: suspensionInfo.suspendedUntil,
      });
    }

    const generatedOtp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    await redisClient.setEx(
      `otp:${email}`,
      300,
      generatedOtp
    );

    await transporter.sendMail({
      from: `"SecureHub" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'SecureHub Access Code',
      html: `
        <div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:5px;">
          <h2>SecureHub Verification</h2>
          <p>Your login verification code is:</p>
          <h1 style="color:#4F46E5;letter-spacing:2px;font-size:32px;">
            ${generatedOtp}
          </h1>
          <p style="font-size:12px;color:#666;">
            This code is valid for 5 minutes.
          </p>
        </div>
      `,
    });

    console.log(`Login OTP sent to ${email}`);

    res.status(200).json({
      message: 'Verification code sent to email.',
    });
  } catch (err) {
    console.error('Authentication Error:', err);

    res.status(500).json({
      message: 'Backend error during processing.',
    });
  }
});

// -----------------------------------------------------------------------------
// 4. LOGIN STEP 2 - Verify OTP
// -----------------------------------------------------------------------------
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const storedOtp = await redisClient.get(`otp:${email}`);

    if (!storedOtp || storedOtp !== otp) {
      return res.status(401).json({
        message: 'Invalid or expired code challenge parameters.',
      });
    }

    await redisClient.del(`otp:${email}`);

    const userResult = await pool.query(
      `
      SELECT
        user_id,
        full_name,
        email,
        phone_number,
        status,
        suspended_until,
        suspension_reason
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: 'User account not found.',
      });
    }

    const user = userResult.rows[0];

    const suspensionInfo = await checkAndSyncSuspension(user);
    if (suspensionInfo.suspended) {
      return res.status(403).json({
        message: 'Your account has been suspended.',
        suspended: true,
        reason: suspensionInfo.reason,
        suspendedUntil: suspensionInfo.suspendedUntil,
      });
    }

    req.session.userId = user.user_id;
    req.session.userName = user.full_name;
    req.session.email = user.email;

    res.status(200).json({
      message: "Access granted.",
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        status: user.status,
      },
    });
  } catch (err) {
    console.error('OTP Verification Error:', err);

    res.status(500).json({
      message: 'Verification pipeline process failure.',
    });
  }
});

// -----------------------------------------------------------------------------
// 5. SESSION & AUTH HELPERS
// -----------------------------------------------------------------------------
router.get("/me", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      error: "Not logged in",
    });
  }

  res.json({
    user_id: req.session.userId,
    full_name: req.session.userName,
    email: req.session.email,
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Could not log out" });
    res.clearCookie('connect.sid');
    res.json({ message: "Logged out" });
  });
});

module.exports = router;