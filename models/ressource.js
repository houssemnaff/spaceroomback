const mongoose = require("mongoose");

const ResourceSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter", required: true },
    url: { type: String, required: true }, // URL de la ressource
    name: { type: String, required: true }, // Nom de la ressource
    type: { type: String, enum: ["pdf", "video", "file"], required: true }, // Type de ressource
    

}, { timestamps: true });

module.exports = mongoose.model("Resource", ResourceSchema);

