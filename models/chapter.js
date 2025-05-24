const mongoose = require("mongoose");

const ChapterSchema = new mongoose.Schema({
  number:{type:String},
  title: { type: String, required: true },  
  description: { type: String }, 
  resources: [{ type: mongoose.Schema.Types.ObjectId, ref: "Resource" }], 
  createdAt: { type: Date, default: Date.now }, 
});

// Vérifier si le modèle existe déjà pour éviter OverwriteModelError
const Chapter = mongoose.models.Chapter || mongoose.model("Chapter", ChapterSchema);

module.exports = Chapter;
