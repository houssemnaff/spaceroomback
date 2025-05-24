/*const jwt = require("jsonwebtoken");
const courseChatHandler = require("./course-chat");
const privateChatHandler = require("./private-chat");

module.exports = (io) => {
  // Initialize the course chat module and get shared resources
  const { io: configuredIo, typingUsers, onlineUsers } = courseChatHandler(io);
  
  // Initialize the private chat module with shared resources
  privateChatHandler(configuredIo, { typingUsers, onlineUsers });
  
  return configuredIo;
};*/