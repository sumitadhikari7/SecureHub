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