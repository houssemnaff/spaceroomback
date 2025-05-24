const cloudinary = require('cloudinary').v2;  // Use CommonJS style

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME || "dmo9p642p",  // Make sure to use env variables for sensitive info
    api_key: process.env.API_KEY || "454846233269344" ,
    api_secret: process.env.API_SECRET || "NIZHBoDiprovJ5N-GkoTcjRlqmY"
  });

module.exports = cloudinary;  // Export using CommonJS
