require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("@config/db");

// Initialize Express app
const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// Custom middleware to handle multipart requests
app.use((req, res, next) => {
  const contentType = req.get('Content-Type');
  console.log('=== MIDDLEWARE DEBUG ===');
  console.log('Content-Type:', contentType);
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('=== END MIDDLEWARE DEBUG ===');
  
  // Skip JSON parsing for multipart requests
  if (contentType && contentType.includes('multipart/form-data')) {
    console.log('Skipping JSON parsing for multipart request');
    return next();
  }
  
  // Parse JSON for other requests
  express.json({ limit: '10mb' })(req, res, next);
});

// URL encoded parsing for non-multipart requests
app.use((req, res, next) => {
  const contentType = req.get('Content-Type');
  if (contentType && contentType.includes('multipart/form-data')) {
    return next();
  }
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});

// Routes
const routes = require('./routes');
routes(app);

// Health Check Route
app.get("/", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

module.exports = app;