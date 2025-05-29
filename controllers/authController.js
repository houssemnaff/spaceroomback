const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { default: axios } = require("axios");
const sendEmail = require("./emailcontroller");


// Inscription
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const role="user";
    const userExists = await User.findOne({ email });

    if (userExists) return res.status(400).json({ message: "L'utilisateur existe déjà" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, role });

    await newUser.save();
    const user = await User.findOne({ email });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "24h" });

    res.status(201).json({ user: user,token:token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Connexion
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "Email ou mot de passe incorrect" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Email ou mot de passe incorrect" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, user: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Récupérer les utilisateurs (admin uniquement)
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Récupérer les utilisateurs (admin uniquement)
const getUser = async (req, res) => {
  try {
    const user = await User.findOne(req.user.email);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Google Registration
const googleRegister = async (req, res) => {
  try {
    const { token } = req.body;

    // Verify the Google token
    const googleResponse = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);

    const { email, name, picture, sub } = googleResponse.data; // sub = Google ID

    // Check if the user already exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create a new user if they don't exist
      user = new User({
        googleId: sub,
        name,
        email,
        imageurl: picture,
        role: "user", // Default role
      });

      await user.save();
    }

    // Generate a JWT token
    const jwtToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "24h" });

    res.json({ token: jwtToken, user });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Invalid Google token" });
  }
};
/*Auth Google: login or register
const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token manquant" });
    }

    // Vérifier le token Google
    const googleResponse = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const { email, name, picture, sub } = googleResponse.data;

    if (!email || !sub) {
      return res.status(400).json({ message: "Informations Google invalides." });
    }

    // Rechercher l'utilisateur
    let user = await User.findOne({ email });

    if (!user) {
      // Créer un nouvel utilisateur s’il n’existe pas
      user = new User({
        googleId: sub,
        name,
        email,
        imageurl: picture,
        role: "user",
      });

      await user.save();
    }

    // Générer le JWT
    const jwtToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

       res.json({ token: jwtToken, user });

  } catch (error) {
    console.error("Erreur lors de l'auth Google :", error.message);
    res.status(400).json({ message: "Token Google invalide ou erreur interne" });
  }
};*/


const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    // Verify the Google token
    const googleResponse = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);

    const { email, name, picture, sub } = googleResponse.data; // sub = Google ID

    // Check if the user already exists
    const user = await User.findOne({ email });

    if (!user) {
      // If the user doesn't exist, return an error
      return res.status(404).json({ message: "User not found. Please register first." });
    }

    // Generate a JWT token
    const jwtToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "24h" });

    // Return the token and user data
    res.json({ token: jwtToken, user });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Invalid Google token" });
  }
};
// Demande de réinitialisation de mot de passe
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Aucun utilisateur trouvé avec cet email" });
    }

    // Générer un token temporaire
    const resetToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Encoder le token en base64 URL-safe
    const encodedToken = Buffer.from(resetToken)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Construire le lien de réinitialisation avec un slash après l'URL
    const resetLink = `${process.env.FRONTEND_URL}reset-password/${encodedToken}`;

    await sendEmail({
      from: "spaceroomplatform@gmail.com",
      to: email,
      subject: "Réinitialisation de votre mot de passe",
      text: `Pour réinitialiser votre mot de passe, cliquez sur ce lien : ${resetLink}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
                src="https://cdn.builder.io/api/v1/image/assets/d5756f61ad83429b8d94b2f33b9d9ea4/8438fdf3e8149084ed45099b71974cf199e146448a5b977414352412e96ce45b?placeholderIfAbsent=true"
                 alt="Spaceroom Logo" 
                 style="width: 50px; height: 50px; margin-bottom: 10px;">
            <h1 style="color: #4F46E5; margin: 0;">Spaceroom</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Réinitialisation de mot de passe</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">Bonjour ${user.name},</p>
            
            <p style="color: #4b5563; line-height: 1.6;">Vous avez demandé la réinitialisation de votre mot de passe.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="display: inline-block; 
                        padding: 12px 24px; 
                        background-color: #4F46E5; 
                        color: white; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        font-weight: bold;
                        font-size: 16px;">
                Réinitialiser mon mot de passe
              </a>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6; font-size: 14px;">
              Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
              <span style="color: #4F46E5; word-break: break-all;">${resetLink}</span>
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                Ce lien expirera dans 1 heure.<br>
                Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.
              </p>
            </div>
          </div>
        </div>
      `
    });

    res.json({ message: "Email de réinitialisation envoyé avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de l'envoi de l'email de réinitialisation" });
  }
};

// Réinitialisation du mot de passe
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Décoder le token URL-safe base64
    let decodedToken;
    try {
      const base64Token = token
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(token.length + (4 - token.length % 4) % 4, '=');
      
      decodedToken = Buffer.from(base64Token, 'base64').toString('utf-8');
    } catch (decodeError) {
      return res.status(400).json({ message: "Token invalide" });
    }

    // Vérifier le token JWT
    const decoded = jwt.verify(decodedToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Valider le nouveau mot de passe
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères" });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Mot de passe réinitialisé avec succès" });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: "Lien de réinitialisation invalide ou expiré" });
    }
    console.error('Reset password error:', error);
    res.status(500).json({ message: "Erreur lors de la réinitialisation du mot de passe" });
  }
};

module.exports = { 
  registerUser, 
  loginUser, 
  getUsers, 
  googleLogin, 
  googleRegister,
  forgotPassword,
  resetPassword ,
};
