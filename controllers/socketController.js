const jwt = require("jsonwebtoken");
const Message = require("../models/message");
const User = require("../models/user");

module.exports = (io) => {
  // Track typing users
  const typingUsers = new Map(); // roomId -> Map of typing user objects
  
  // Track online users
  const onlineUsers = new Map(); // userId -> socketId

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: Token missing"));
      }

      const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
      if (!decoded) {
        return next(new Error("Authentication error: Invalid token"));
      }

      socket.userId = decoded.id;
      
      // Fetch minimal user data
      const user = await User.findById(decoded.id).select('name role');
      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }
      
      socket.user = {
        _id: user._id,
        name: user.name,
        role: user.role
      };
      
      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId || socket.id}`);
    
    // Add user to online users if authenticated
    if (socket.userId) {
      onlineUsers.set(socket.userId, socket.id);
      
      // Let other users know this user is now online
      io.emit("user_status_update", {
        userId: socket.userId,
        status: "online"
      });
    }

    // Join course room
    socket.on("join_course", async (courseId) => {
      try {
        if (!courseId) {
          socket.emit("error", { message: "Invalid courseId" });
          return;
        }
        
        const roomId = `course:${courseId}`;
        socket.join(roomId);
        console.log(`User ${socket.userId || socket.id} joined room ${roomId}`);

        // Load existing messages
        const messages = await Message.find({ 
          courseId: courseId,
          receiver: { $exists: false } // Only global course messages
        })
        .sort({ createdAt: 1 })
        .limit(100);

        socket.emit("existing_messages", messages);
      } catch (error) {
        console.error("Error joining course:", error);
        socket.emit("error", { message: "Failed to join course chat" });
      }
    });
    
    // Join private chat, now with courseId parameter
    socket.on("join_private_chat", async ({ receiverId, courseId }) => {
      try {
        if (!receiverId || !courseId) {
          socket.emit("error", { message: "Invalid receiverId or courseId" });
          return;
        }
        
        // Create a unique room ID for the private chat that includes courseId
        // Sort user IDs to ensure consistency regardless of who initiates
        const participants = [socket.userId, receiverId].sort();
        const roomId = `private:${courseId}:${participants[0]}:${participants[1]}`;
        
        socket.join(roomId);
        console.log(`User ${socket.userId} joined private room ${roomId}`);
        
        // Load existing messages with courseId condition
        const messages = await Message.find({
          courseId: courseId,
          $or: [
            { sender: socket.userId, receiver: receiverId },
            { sender: receiverId, receiver: socket.userId }
          ]
        })
        .sort({ createdAt: 1 })
        .limit(100);
        
        socket.emit("private_existing_messages", messages);
        
        // Mark messages as read
        await Message.updateMany(
          { 
            courseId: courseId,
            sender: receiverId, 
            receiver: socket.userId, 
            read: false 
          },
          { $set: { read: true } }
        );
        
        // Notify the sender that messages have been read
        if (onlineUsers.has(receiverId)) {
          io.to(onlineUsers.get(receiverId)).emit("messages_read", {
            chatPartnerId: socket.userId,
            courseId: courseId
          });
        }
      } catch (error) {
        console.error("Error joining private chat:", error);
        socket.emit("error", { message: "Failed to join private chat" });
      }
    });

    // Send message to course
    socket.on("send_message", async (data) => {
      try {
        const { courseId, text } = data;
        
        // Validate required fields
        if (!courseId || !text || !socket.userId) {
          socket.emit("message_error", { message: "Missing required message properties" });
          return;
        }
        
        // When user sends a message, they're no longer typing
        const courseRoomId = `course:${courseId}`;
        if (typingUsers.has(courseRoomId)) {
          const roomTypingUsers = typingUsers.get(courseRoomId);
          if (roomTypingUsers.has(socket.userId)) {
            roomTypingUsers.delete(socket.userId);
            // Broadcast updated typing users
            socket.to(courseRoomId).emit("typing_users", Array.from(roomTypingUsers.values()));
          }
        }
        
        // Create and save the message (with courseId)
        const message = new Message({
          courseId,
          text,
          sender: socket.userId
        });
        
        await message.save();
        
        // Broadcast to everyone in the room
        io.to(courseRoomId).emit("receive_message", {
          _id: message._id,
          courseId: message.courseId,
          text: message.text,
          sender: message.sender,
          createdAt: message.createdAt
        });
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("message_error", { message: "Failed to send message", originalMessage: data });
      }
    });
    
    // Send private message (now with courseId)
    socket.on("send_private_message", async (data) => {
      try {
        const { receiverId, courseId, text } = data;
        
        if (!receiverId || !courseId || !text) {
          return socket.emit("message_error", { message: "Missing required parameters" });
        }
        
        // Check if receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
          return socket.emit("message_error", { message: "Receiver not found" });
        }
        
        // Create and save the message with courseId
        const message = new Message({
          text,
          courseId,
          sender: socket.userId,
          receiver: receiverId,
          read: false
        });
        
        await message.save();
        
        // Create the private room ID with courseId
        const participants = [socket.userId, receiverId].sort();
        const roomId = `private:${courseId}:${participants[0]}:${participants[1]}`;
        
        // Send to everyone in the private room
        io.to(roomId).emit("receive_private_message", {
          _id: message._id,
          text: message.text,
          courseId: message.courseId,
          sender: message.sender,
          receiver: message.receiver,
          createdAt: message.createdAt,
          read: message.read
        });
        
        // If receiver is not in the room, send notification
        if (onlineUsers.has(receiverId)) {
          const receiverSocketId = onlineUsers.get(receiverId);
          const receiverSocket = io.sockets.sockets.get(receiverSocketId);
          
          if (receiverSocket && !receiverSocket.rooms.has(roomId)) {
            io.to(receiverSocketId).emit("new_message_notification", {
              messageId: message._id,
              courseId: courseId,
              senderId: socket.userId,
              senderName: socket.user.name,
              message: text
            });
          }
        }
      } catch (error) {
        console.error("Error sending private message:", error);
        socket.emit("message_error", { message: "Failed to send private message" });
      }
    });

    // Handle typing events (updated with courseId)
    socket.on("typing", (data) => {
      const { courseId, isTyping } = data;
      
      // Ensure we have a userId (either from auth or passed in data)
      const userId = socket.userId || data.userId;
      const userName = socket.user?.name || data.userName;
      
      if (!userId || !userName || !courseId) {
        return;
      }
      
      const courseRoomId = `course:${courseId}`;
      
      // Initialize typing users for this room if it doesn't exist
      if (!typingUsers.has(courseRoomId)) {
        typingUsers.set(courseRoomId, new Map());
      }
      
      const roomTypingUsers = typingUsers.get(courseRoomId);
      
      if (isTyping) {
        // Add user to typing users
        roomTypingUsers.set(userId, {
          userId,
          userName,
          timestamp: Date.now()
        });
      } else {
        // Remove user from typing users
        roomTypingUsers.delete(userId);
      }
      
      // Convert to array for broadcasting
      const typingUsersArray = Array.from(roomTypingUsers.values());
      
      // Broadcast to everyone except the sender
      socket.to(courseRoomId).emit("typing_users", typingUsersArray);
    });
    
    // Handle private typing events (updated with courseId)
    socket.on("typing_private", (data) => {
      const { receiverId, courseId, isTyping } = data;
      
      if (!receiverId || !courseId) {
        return;
      }
      
      // Get the private room ID with courseId
      const participants = [socket.userId, receiverId].sort();
      const roomId = `private:${courseId}:${participants[0]}:${participants[1]}`;
      
      // Initialize typing users for this room if it doesn't exist
      if (!typingUsers.has(roomId)) {
        typingUsers.set(roomId, new Map());
      }
      
      const roomTypingUsers = typingUsers.get(roomId);
      
      if (isTyping) {
        // Add user to typing users
        roomTypingUsers.set(socket.userId, {
          userId: socket.userId,
          userName: socket.user.name,
          timestamp: Date.now()
        });
      } else {
        // Remove user from typing users
        roomTypingUsers.delete(socket.userId);
      }
      
      // Convert to array for broadcasting
      const typingUsersArray = Array.from(roomTypingUsers.values());
      
      // Broadcast to everyone except the sender
      socket.to(roomId).emit("typing_users_private", typingUsersArray);
    });

    // Mark messages as read (updated with courseId)
    socket.on("mark_messages_read", async ({ chatPartnerId, courseId }) => {
      try {
        if (!chatPartnerId || !courseId) {
          return;
        }
        
        // Update in database with courseId condition
        await Message.updateMany(
          {
            courseId: courseId,
            sender: chatPartnerId,
            receiver: socket.userId,
            read: false
          },
          { $set: { read: true } }
        );

        // Send confirmation to sender
        if (onlineUsers.has(chatPartnerId)) {
          io.to(onlineUsers.get(chatPartnerId)).emit("messages_read_confirmation", {
            readerId: socket.userId,
            courseId: courseId
          });
        }
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });
    
    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.userId || socket.id}`);
      
      if (socket.userId) {
        // Remove from online users
        onlineUsers.delete(socket.userId);
        
        // Let others know user is offline
        io.emit("user_status_update", {
          userId: socket.userId,
          status: "offline"
        });
      }
      
      // Remove from all typing lists
      for (const [roomId, typingMap] of typingUsers.entries()) {
        if (socket.userId && typingMap.has(socket.userId)) {
          typingMap.delete(socket.userId);
          
          // Broadcast updated typing users
          const typingUsersArray = Array.from(typingMap.values());
          io.to(roomId).emit("typing_users", typingUsersArray);
        }
      }
    });
  });
  
  // Cleanup stale typing indicators (run every 5 seconds)
  setInterval(() => {
    const now = Date.now();
    
    for (const [roomId, typingMap] of typingUsers.entries()) {
      for (const [userId, userInfo] of typingMap.entries()) {
        // Remove typing status if it's older than 5 seconds
        if (userInfo.timestamp && now - userInfo.timestamp > 5000) {
          typingMap.delete(userId);
          // Broadcast updated typing users
          io.to(roomId).emit("typing_users", Array.from(typingMap.values()));
        }
      }
    }
  }, 5000);

  return io;
};