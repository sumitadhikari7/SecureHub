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

// Shared helper: builds the { suspended, reason, suspendedUntil } payload
// used any time we need to tell someone why/how-long they're suspended.
// If their suspension has actually expired already, lift it right here
// instead of making them wait for the background sweep - this is just a
// safety net for the exact moment the sweep hasn't caught up yet.
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

// REGISTER
router.post('/register', async (req, res) => {
  const {
    firstName,
    middleName,
    lastName,
    phone,
    email,
    password,
  } = req.body;

  const fullName = [firstName, middleName, lastName]
    .filter(Boolean)
    .join(' ');

  try {
    await pool.query(
      `
      INSERT INTO users
      (full_name, email, phone_number, password, status)
      VALUES ($1, $2, $3, $4, 'active')
      `,
      [fullName, email, phone, password]
    );

    res.status(201).json({
      message: 'Registration Successful! Switch to login.',
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({
        message: 'Email is already registered.',
      });
    }

    console.error(err);

    res.status(500).json({
      message: 'Server database failure.',
    });
  }
});

// LOGIN STEP 1 - Verify Password & Send OTP
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

    // Surface exactly why/how-long they're suspended, so the login form can
    // show it in the alert box instead of a generic "inactive" message.
    const suspensionInfo = await checkAndSyncSuspension(user);
    if (suspensionInfo.suspended) {
      return res.status(403).json({
        message: 'Your account has been suspended.',
        suspended: true,
        reason: suspensionInfo.reason,
        suspendedUntil: suspensionInfo.suspendedUntil, // null = permanent
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
      from: `"SecureHub Security 🛡️" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'SecureHub Access Code 🛡️',
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

    console.log(`OTP sent to ${email}`);

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

// LOGIN STEP 2 - Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const storedOtp = await redisClient.get(`otp:${email}`);

    if (!storedOtp || storedOtp !== otp) {
      return res.status(401).json({
        message: 'Invalid or expired code challenge parameters.',
      });
    }

    // Delete OTP after successful verification
    await redisClient.del(`otp:${email}`);

    // Fetch logged-in user
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

    // Re-check suspension here too: the OTP step can happen minutes after
    // step 1, so it's possible an admin suspended them, or a short demo
    // suspension started and ended, in the gap between the two steps.
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

router.get("/me", (req, res) => {
  console.log("SESSION:", req.session);

  // FIX: this used to check req.session.user, which is never set anywhere
  // in the login flow (the session stores userId/userName/email directly) -
  // so this endpoint returned 401 for every logged-in user, always.
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

// In auth.js
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Could not log out" });
    res.clearCookie('connect.sid'); // Clear the session cookie
    res.json({ message: "Logged out" });
  });
});

module.exports = router;