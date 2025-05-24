const express = require('express');
const router = express.Router();
const Pusher = require('pusher');
const { protect } = require('../middleware/authMiddleware');

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

// Pusher authentication endpoint
router.post('/auth', protect, (req, res) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  const userId = req.user.id;

  // Verify the user can access their own channel
  if (channel !== `user-${userId}`) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const auth = pusher.authenticate(socketId, channel);
  res.send(auth);
});

module.exports = router;