// services/notificationService.js
const Notification = require("../models/notification");
const Course = require("../models/course");
const User = require("../models/user");

// Create a notification for a specific user
exports.createNotification = async (userId, title, message, type, relatedId = null, courseId = null) => {
  try {
    const notification = new Notification({
      userId,
      title,
      message,
      type,
      relatedId,
      courseId,
      read: false
    });
    return await notification.save();
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};


// Create a notification for a specific user
exports.createNotificationadmin = async (userId, title, message, type, relatedId = null) => {
  try {
    const notification = new Notification({
      userId,
      title,
      message,
      type,
      relatedId,    
      read: false
    });
    return await notification.save();
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

// Create notifications for all students in a course
exports.notifyCourseStudents = async (courseId, title, message, type, relatedId = null) => {
  try {
    const course = await Course.findById(courseId);
    if (!course) throw new Error("Course not found");
    
    const notifications = [];
    for (const studentId of course.students) {
      const notification = new Notification({
        userId: studentId._id,
        title,
        message,
        type,
        relatedId,
        courseId,
        read: false
      });
      notifications.push(notification);
    }
    
    if (notifications.length > 0) {
      return await Notification.insertMany(notifications);
    }
    return [];
  } catch (error) {
    console.error("Error notifying course students:", error);
    throw error;
  }
};

// Get all notifications for a user
exports.getUserNotifications = async (userId, options = {}) => {
  try {
    const { limit = 10, skip = 0, read, type } = options;
    
    const query = { userId };
    if (read !== undefined) query.read = read;  
    if (type) query.type = type;
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Notification.countDocuments(query);
    
    return { notifications, total };
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    throw error;
  }
};

// Mark notifications as read
exports.markAsRead = async (notificationIds, userId) => {
  try {
    return await Notification.updateMany(
      { _id: { $in: notificationIds }, userId },
      { $set: { read: true } }
    );
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    throw error;
  }
};

// Mark all notifications as read for a user
exports.markAllAsRead = async (userId) => {
  try {
    return await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
};

// Get unread notifications count
exports.getUnreadCount = async (userId) => {
  try {
    return await Notification.countDocuments({ userId, read: false });
  } catch (error) {
    console.error("Error counting unread notifications:", error);
    throw error;
  }
};

// Delete a notification
exports.deleteNotification = async (notificationId, userId) => {
  try {
    return await Notification.findOneAndDelete({ _id: notificationId, userId });
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
};

// Delete all notifications for a user
exports.deleteAllNotifications = async (userId) => {
  try {
    return await Notification.deleteMany({ userId });
  } catch (error) {
    console.error("Error deleting all notifications:", error);
    throw error;
  }
};