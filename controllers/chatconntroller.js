/*const Message = require("../models/message");
const User = require("../models/user");

module.exports = (io, { typingUsers, onlineUsers }) => {
  io.on("connection", (socket) => {
    // Join private chat
    socket.on("join_private_chat", async (receiverId) => {
      try {
        // Create a unique room ID for the private chat
        // Sort IDs to ensure consistency regardless of who initiates
        const participants = [socket.userId, receiverId].sort();
        const roomId = `private:${participants[0]}:${participants[1]}`;
        
        socket.join(roomId);
        console.log(`User ${socket.userId} joined private room ${roomId}`);
        
        // Load existing messages
        const messages = await Message.find({
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
          { sender: receiverId, receiver: socket.userId, read: false },
          { $set: { read: true } }
        );
        
        // Notify the sender that messages have been read
        if (onlineUsers.has(receiverId)) {
          io.to(onlineUsers.get(receiverId)).emit("messages_read", {
            chatPartnerId: socket.userId
          });
        }
      } catch (error) {
        console.error("Error joining private chat:", error);
        socket.emit("error", { message: "Failed to join private chat" });
      }
    });
    
    // Send private message
    socket.on("send_private_message", async (data) => {
      try {
        const { receiverId, text } = data;
        
        // Check if receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
          return socket.emit("message_error", { message: "Receiver not found" });
        }
        
        // Create and save the message
        const message = new Message({
          text,
          sender: socket.userId,
          receiver: receiverId,
          read: false
        });
        
        await message.save();
        
        // Create the private room ID (sorted to ensure consistency)
        const participants = [socket.userId, receiverId].sort();
        const roomId = `private:${participants[0]}:${participants[1]}`;
        
        // Send to everyone in the private room
        io.to(roomId).emit("receive_private_message", {
          _id: message._id,
          text: message.text,
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
    
    // Handle private typing events
    socket.on("typing_private", (data) => {
      const { receiverId, isTyping } = data;
      
      // Get the private room ID
      const participants = [socket.userId, receiverId].sort();
      const roomId = `private:${participants[0]}:${participants[1]}`;
      
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
    
    // Handle disconnect for private chats
    socket.on("disconnect", () => {
      // Remove from all typing lists for private chats
      for (const [roomId, typingMap] of typingUsers.entries()) {
        // Only process private rooms in this module
        if (!roomId.startsWith('private:')) continue;
        
        if (socket.userId && typingMap.has(socket.userId)) {
          typingMap.delete(socket.userId);
          
          // Broadcast updated typing users
          const typingUsersArray = Array.from(typingMap.values());
          io.to(roomId).emit("typing_users_private", typingUsersArray);
        }
      }
    });
  });
  
  // Cleanup stale typing indicators for private chat (run every 5 seconds)
  setInterval(() => {
    const now = Date.now();
    
    for (const [roomId, typingMap] of typingUsers.entries()) {
      // Only process private rooms in this module
      if (!roomId.startsWith('private:')) continue;
      
      for (const [userId, userInfo] of typingMap.entries()) {
        // Remove typing status if it's older than 5 seconds
        if (userInfo.timestamp && now - userInfo.timestamp > 5000) {
          typingMap.delete(userId);
          // Broadcast updated typing users
          io.to(roomId).emit("typing_users_private", Array.from(typingMap.values()));
        }
      }
    }
  }, 5000);
};*/