const express = require('express');
const router = express.Router();
const { 
  authenticateUser, 
  refreshToken, 
  logoutUser,
  getUserData 
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/authenticate', authenticateUser);
router.post('/refresh-token', refreshToken);
router.post('/logout', logoutUser);

// Protected routes
router.get('/get-user', protect, getUserData);

module.exports = router;