const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportcontroller');
const { adminOnly, protect } = require('../middleware/authMiddleware');

// Routes publiques
router.post('/', protect, supportController.createSupportMessage);
router.get('/my-messages', protect, supportController.getUserSupportMessages);

// Routes admin
router.get('/all', protect, adminOnly, supportController.getAllSupportMessages);
router.put('/:messageId/status', protect,adminOnly, supportController.updateSupportMessageStatus);
router.put('/:messageId/upstatus', protect,adminOnly, supportController.updateStatus);
router.delete('/:messageId', protect, adminOnly, supportController.deleteSupportMessage);

module.exports = router;
