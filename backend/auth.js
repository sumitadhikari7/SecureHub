const express = require('express');
const router = express.Router();
const { Pool } = require('pg'); 
const redis = require('redis');   
const nodemailer = require('nodemailer');

