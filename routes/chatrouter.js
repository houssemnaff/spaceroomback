const express = require("express");
const router = express.Router();
const Message = require("../models/message");
const auth = require("../middleware/auth");
const Course = require("../models/course");
const User = require("../models/user");

// Get all chats for a user
router.get("/user-chats", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find all private chats where the user is either sender or receiver
    const privateChats = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: mongoose.Types.ObjectId(userId) },
            { receiver: mongoose.Types.ObjectId(userId) }
          ],
          // Only get messages that have a receiver (private messages)
          receiver: { $exists: true }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", mongoose.Types.ObjectId(userId)] },
              "$receiver",
              "$sender"
            ]
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ["$receiver", mongoose.Types.ObjectId(userId)] },
                    { $eq: ["$read", false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      {
        $unwind: "$userDetails"
      },
      {
        $project: {
          userId: "$_id",
          name: "$userDetails.name",
          imageurl: "$userDetails.imageurl",
          role: "$userDetails.role",
          lastMessage: "$lastMessage.text",
          lastMessageDate: "$lastMessage.createdAt",
          unreadCount: 1
        }
      },
      {
        $sort: { lastMessageDate: -1 }
      }
    ]);
    
    // Find all course chats the user is part of
    const user = await User.findById(userId);
    const courseIds = [
      ...user.enrolledCourses,
      ...user.createdCourses
    ];
    
    const courses = await Course.find({
      _id: { $in: courseIds }
    }).select('_id title imageurl');
    
    const courseChats = courses.map(course => ({
      courseId: course._id,
      name: course.title,
      imageurl: course.imageurl,
      isGroup: true
    }));
    
    res.json({
      privateChats,
      courseChats
    });
    
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get private chat messages between two users
router.get("/private-messages/:receiverId", auth, async (req, res) => {
  try {
    const { receiverId } = req.params;
    const senderId = req.user.id;
    
    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    })
    .sort({ createdAt: 1 });
    
    // Mark messages as read
    await Message.updateMany(
      { sender: receiverId, receiver: senderId, read: false },
      { $set: { read: true } }
    );
    
    res.json(messages);
  } catch (error) {
    console.error("Error fetching private messages:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get available users to chat with in a course
router.get("/course-users/:courseId", auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const course = await Course.findById(courseId)
      .populate("owner", "name imageurl role _id")
      .populate("students", "name imageurl role _id");
    
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    
    // Check if user is part of this course
    const userId = req.user.id;
    const isOwner = course.owner._id.toString() === userId;
    const isStudent = course.students.some(student => student._id.toString() === userId);
    
    if (!isOwner && !isStudent) {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    // Combine owner and students, excluding the current user
    const users = [];
    
    if (course.owner._id.toString() !== userId) {
      users.push({
        _id: course.owner._id,
        name: course.owner.name,
        imageurl: course.owner.imageurl,
        role: course.owner.role,
        isProfessor: true
      });
    }
    
    course.students.forEach(student => {
      if (student._id.toString() !== userId) {
        users.push({
          _id: student._id,
          name: student.name,
          imageurl: student.imageurl,
          role: student.role,
          isProfessor: false
        });
      }
    });
    
    res.json(users);
  } catch (error) {
    console.error("Error fetching course users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;