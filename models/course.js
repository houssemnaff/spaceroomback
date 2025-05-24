const mongoose = require("mongoose");

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  imageurl: { type: String },
  accessKey: { type: String, unique: true, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Créateur du cours
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Étudiants inscrits
  chapters: [{ type: mongoose.Schema.Types.ObjectId, ref: "Chapter" }], // Chapitres du cours
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Course", CourseSchema);
