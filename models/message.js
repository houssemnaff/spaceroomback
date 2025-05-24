const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // For private messages
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true }, // Course the message belongs to
  roomId: { type: String }, // Optional socket room identifier (for more specific grouping)
  read: { type: Boolean, default: false } // For private messages
}, { timestamps: true });

// Add indexes for faster queries
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ courseId: 1 });
messageSchema.index({ roomId: 1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;