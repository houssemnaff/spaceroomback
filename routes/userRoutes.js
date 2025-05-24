const express = require("express");
const { getUserById, deleteUserById, updateUserById, getUserByIdparms } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const uploadMiddleware = require("../utils/multerConfig");

const router = express.Router();

router.get("/",protect, getUserById);          // Récupérer un utilisateur par ID
router.get("/:id",protect, getUserByIdparms);   // Récupérer un utilisateur par IDparams
router.delete("/:id",protect, deleteUserById); // Supprimer un utilisateur par ID
router.put("/:id", protect,uploadMiddleware,updateUserById);    // Modifier un utilisateur par ID

module.exports = router;
