const User = require("../models/user");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const { admin } = require("../middleware/firebaseAdmin");

// Generate refresh token
const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// Authenticate user with Firebase token
const authenticateUser = async (req, res) => {
  try {
    const { idToken } = req.body;
    console.log("tokennnnn ",idToken);
    
    if (!idToken) {
      return res.status(400).json({ message: "Firebase ID token is required" });
    }

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;
    
    // Check if user exists in your database
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user if they don't exist
      user = new User({
        name: name || email.split('@')[0],
        email: email,
        firebaseUid: uid,
        imageurl: picture || '',
        role: "user",
        refreshToken: generateRefreshToken(),
        createdCourses: [],
        enrolledCourses: []
      });
      
      await user.save();
    } else {
      // Update Firebase UID if it's changed or not set
      if (user.firebaseUid !== uid) {
        user.firebaseUid = uid;
        user.imageurl = picture || user.imageurl; // Update profile pic if available
        
        // Generate a new refresh token on UID change for security
        user.refreshToken = generateRefreshToken();
        await user.save();
      }
    }
    
    // Generate JWT access token (short-lived)
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // Short expiry for security
    );
    
    // Set HTTP-only cookie with refresh token
    res.cookie('refreshToken', user.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Secure in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Send minimal user info and access token
    res.status(200).json({ 
      message: "Authentication successful", 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        imageurl: user.imageurl
      },
      accessToken
    });
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ error: "Authentication failed", message: error.message });
  }
};

// Get user data from token
const getUserData = async (req, res) => {
  try {
    // User should be attached to req by the auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Fetch user from database using ID from JWT token
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Return user data
    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        imageurl: user.imageurl
      }
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Failed to get user data" });
  }
};

// Refresh the access token using refresh token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token is required" });
    }
    
    // Find user with this refresh token
    const user = await User.findOne({ refreshToken });
    
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    
    // Generate new access token
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    // Send minimal user info and new access token
    res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        imageurl: user.imageurl
      }
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json({ message: "Failed to refresh token" });
  }
};

// Logout - invalidate refresh token
const logoutUser = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (refreshToken) {
      // Find user and update refresh token
      const user = await User.findOne({ refreshToken });
      
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }
    
    // Clear the refresh token cookie
    res.clearCookie('refreshToken');
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Logout failed" });
  }
};

module.exports = { 
  authenticateUser, 
  refreshToken, 
  logoutUser,
  getUserData
};