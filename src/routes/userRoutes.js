const express = require('express');
const router = express.Router();
const { 
  getAllUsers, 
  getUserById, 
  updateUser, 
  deleteUser,
  getLoginStats
} = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

// Get all users
router.get('/', getAllUsers);

// Get user by ID
router.get('/:id', getUserById);

// Update user
router.put('/:id', updateUser);

// Delete user
router.delete('/:id', deleteUser);

// Admin: login stats for last 7 days
router.get('/admin/login-stats/last7', authMiddleware.authenticate, authMiddleware.authorizationRole('admin'), getLoginStats);

module.exports = router;
