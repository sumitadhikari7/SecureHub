const express = require('express');
const router = express.Router();
const { Pool } = require('pg'); 
const redis = require('redis');   
const nodemailer = require('nodemailer');

// 1. Setup Database Connection Pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD, 
  port: process.env.DB_PORT,
});

// 2. Setup Redis Cache Client Connection
const redisClient = redis.createClient();
redisClient.connect().catch(console.error);

// 3. Configure Nodemailer Gmail Transporter 📧
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,     
    pass: process.env.GMAIL_APP_PASS, 
  },
});

// ENDPOINT: REGISTER 
router.post('/register', async (req, res) => {
  const { firstName, middleName, lastName, phone, email, password } = req.body;
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

  try {
    const newUser = await pool.query(
      `INSERT INTO users (full_name, email, phone_number, password, status) 
       VALUES ($1, $2, $3, $4, 'active') RETURNING *`,
      [fullName, email, phone, password]
    );
    res.status(201).json({ message: "Registration Successful! Switch to login." });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: "Email is already registered." });
    }
    console.error(err);
    res.status(500).json({ message: "Server database failure." });
  }
});

// ENDPOINT: LOGIN STEP 1 (Verify Password -> Send OTP)
router.post('/login', async (req, res) => {
  const { email, password } = req.body; 

  try {
    // 1. Find user account row
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = userCheck.rows[0];

    // 2. 🔐 Guard gate with .trim() to catch hidden whitespace padding
    if (!user.password || user.password.trim() !== password.trim()) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // 3. Check account status
    if (user.status !== 'active') {
      return res.status(403).json({ message: "Account is suspended or inactive." });
    }

    // 4. Generate 6-digit verification code string
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 5. Store OTP code securely in Redis cache for 5 minutes
    await redisClient.setEx(`otp:${email}`, 300, generatedOtp); 


    // 6. 🚀 Fire OTP out via Nodemailer transporter to ANY email!
    await transporter.sendMail({
      from: `"SecureHub Security 🛡️" <${process.env.GMAIL_USER}>`, 
      to: email, // Can be sumitadhikari972@gmail.com, client emails, anything!
      subject: 'SecureHub Access Code 🛡️',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2>SecureHub Verification</h2>
          <p>Your double-factor login validation verification code is:</p>
          <h1 style="color: #4F46E5; letter-spacing: 2px; font-size: 32px;">${generatedOtp}</h1>
          <p style="font-size: 12px; color: #666;">This security token is valid for 5 minutes.</p>
        </div>
      `
    });

    console.log(`✉️ OTP email dispatched successfully to: ${email}`);
    res.status(200).json({ message: "Verification code sent to email." });
  } catch (err) {
    console.error("Authentication System Failure Error:", err);
    res.status(500).json({ message: "Backend error during processing." });
  }
});

// ENDPOINT: LOGIN STEP 2 (Verify OTP)
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  
  try {
    const storedOtp = await redisClient.get(`otp:${email}`);
    if (!storedOtp || storedOtp !== otp) {
      return res.status(401).json({ message: "Invalid or expired code challenge parameters." });
    }
    
    await redisClient.del(`otp:${email}`); // Burn OTP after verification use
    res.status(200).json({ message: "Access granted.", token: "mock-jwt-token-string" });
  } catch (err) {
    res.status(500).json({ message: "Verification pipeline process failure." });
  }
});

module.exports = router;
