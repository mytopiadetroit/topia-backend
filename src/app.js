require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const connectDB = require('@config/db')

// Initialize Express app
const app = express()


connectDB()

// Middleware
app.use(cors())
app.use(helmet())
app.use(morgan('dev'))

// Standard middleware for parsing JSON and URL encoded data
// These will be skipped automatically for multipart/form-data requests
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Debug middleware to log request details
app.use((req, res, next) => {
  const contentType = req.get('Content-Type')
  console.log('=== MIDDLEWARE DEBUG ===')
  console.log('Content-Type:', contentType)
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  console.log('=== END MIDDLEWARE DEBUG ===')
  next()
})

// Routes
const routes = require('./routes')
routes(app)

// Health Check Route
app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK' })
})

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

module.exports = app
