const mongoose = require("mongoose");

const MeetingSchema = new mongoose.Schema({
  courseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Course", 
    required: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  startTime: { 
    type: Date, 
    required: true 
  },
  duration: { 
    type: Number, 
    required: true, 
    min: 15, 
    max: 180 
  },
  description: { 
    type: String 
  },
  hostId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  hostName: { 
    type: String, 
    required: true 
  },
  attendees: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],
  location: { 
    type: String, 
    default: "Salle virtuelle A" 
  },
  roomID: { 
    type: String, 
    required: true, 
    unique: true 
  },
  recordingAvailable: { 
    type: Boolean, 
    default: false 
  },
  recordingUrl: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model("Meeting", MeetingSchema);