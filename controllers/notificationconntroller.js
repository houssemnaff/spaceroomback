// controllers/notificationController.js
const notificationService = require("../controllers/fonctionnotification");

// Get all notifications for the authenticated user
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit, skip, read, type } = req.query;
    
    const options = {
      limit: limit ? parseInt(limit) : 10,
      skip: skip ? parseInt(skip) : 0,
      read: read === undefined ? undefined : read === 'true',
      type
    };
    
    const { notifications, total } = await notificationService.getUserNotifications(userId, options);
    
    res.status(200).json({
      success: true,
      notifications,
      total,
      unread: await notificationService.getUnreadCount(userId)
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      message: "Error fetching notifications",
      error: error.message
    });
  }
};

// Mark notifications as read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds } = req.body;
    
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({ message: "notificationIds array is required" });
    }
    
    await notificationService.markAsRead(notificationIds, userId);
    
    res.status(200).json({
      success: true,
      message: "Notifications marked as read",
      unread: await notificationService.getUnreadCount(userId)
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({
      message: "Error marking notifications as read",
      error: error.message
    });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    await notificationService.markAllAsRead(userId);
    
    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      unread: 0
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      message: "Error marking all notifications as read",
      error: error.message
    });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;
    
    await notificationService.deleteNotification(notificationId, userId);
    
    res.status(200).json({
      success: true,
      message: "Notification deleted",
      unread: await notificationService.getUnreadCount(userId)
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      message: "Error deleting notification",
      error: error.message
    });
  }
};

// Delete all notifications
exports.deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    await notificationService.deleteAllNotifications(userId);
    
    res.status(200).json({
      success: true,
      message: "All notifications deleted",
      unread: 0
    });
  } catch (error) {
    console.error("Error deleting all notifications:", error);
    res.status(500).json({
      message: "Error deleting all notifications",
      error: error.message
    });
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const count = await notificationService.getUnreadCount(userId);
    
    res.status(200).json({
      success: true,
      unread: count
    });
  } catch (error) {
    console.error("Error counting unread notifications:", error);
    res.status(500).json({
      message: "Error counting unread notifications",
      error: error.message
    });
  }
};