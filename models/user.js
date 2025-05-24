const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: function() { return !this.googleId; } }, 
  role: { type: String, enum: ["user", "admin"], default: "user" },
  googleId: { type: String },
  imageurl: { type: String },
  createdCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }], // Cours créés
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }] // Cours où l'utilisateur est inscrit
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
