// routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationconntroller");
const { protect } = require("../middleware/authMiddleware");

// Get all notifications for the authenticated user
router.get("/", protect, notificationController.getUserNotifications);

// Mark notifications as read
router.put("/read", protect, notificationController.markAsRead);

// Mark all notifications as read
router.put("/read-all", protect, notificationController.markAllAsRead);

// Delete a notification
router.delete("/:notificationId", protect, notificationController.deleteNotification);

// Delete all notifications
router.delete("/", protect, notificationController.deleteAllNotifications);

// Get unread count
router.get("/unread-count", protect, notificationController.getUnreadCount);

module.exports = router;