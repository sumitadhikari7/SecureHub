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
