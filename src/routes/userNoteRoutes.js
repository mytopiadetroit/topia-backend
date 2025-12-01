const express = require('express');
const router = express.Router();
const {
  getUserNotes,
  createUserNote,
  updateUserNote,
  deleteUserNote
} = require('../controllers/userNoteController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authMiddleware.authenticate);

// Get all notes for a user
router.get('/:userId', getUserNotes);

// Create a new note for a user
router.post('/:userId', createUserNote);

// Update a note
router.put('/:noteId', updateUserNote);

// Delete a note
router.delete('/:noteId', deleteUserNote);

module.exports = router;
