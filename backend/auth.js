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