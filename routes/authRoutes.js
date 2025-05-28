const express = require("express");
const { 
  registerUser, 
  googleAuth,
  loginUser, 
  getUsers, 
  googleLogin, 
  googleRegister,
  forgotPassword,
  resetPassword 
} = require("../controllers/authController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const router = express.Router();
router.post("/google-Auth",  googleAuth);
router.post("/google-login", googleLogin);
router.post("/google-register", googleRegister);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/", protect, adminOnly, getUsers);

// Routes pour la réinitialisation du mot de passe
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
