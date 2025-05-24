const bcrypt = require("bcryptjs");
const User = require("../models/user");
const { uploadImageusers } = require("../utils/imageUpload");
const support = require("../models/support");
const Submission = require("../models/Submission");
const notification = require("../models/notification");
const QuizAttempt = require("../models/quizattmetpchapitre");
const course = require("../models/course");
const meeting = require("../models/meeting");
const Message = require("../models/message");

// Récupérer un utilisateur par ID
exports.getUserById = async (req, res) => {
    try {
        console.log("user", req.user.id);
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};


// Récupérer un utilisateur par ID
exports.getUserByIdparms = async (req, res) => {
    try {
        console.log("user", req.params);
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.deleteUserById = async (req, res) => {
    const userId = req.params.id;
  
    try {
      // Supprimer l'utilisateur
      const deletedUser = await User.findByIdAndDelete(userId);
      if (!deletedUser) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }
  
      // Supprimer les supports liés
      await support.deleteMany({ userId });
  
      // Supprimer les soumissions liées
      await Submission.deleteMany({ studentId: userId });
  
      // Supprimer les tentatives de quiz
      await QuizAttempt.deleteMany({ userId });
  
      // Supprimer les notifications
      await notification.deleteMany({ userId });
  
      // Supprimer les messages envoyés ou reçus
      await Message.deleteMany({ 
        $or: [{ sender: userId }, { receiver: userId }]
      });
  
      // Supprimer les cours créés par l'utilisateur
      await course.deleteMany({ owner: userId });
  
      // Retirer l'utilisateur de la liste des étudiants dans les cours
      await course.updateMany(
        { students: userId },
        { $pull: { students: userId } }
      );
  
      // Supprimer les réunions créées par cet utilisateur
      await meeting.deleteMany({ hostId: userId });
  
      // Retirer l'utilisateur des participants aux réunions
      await meeting.updateMany(
        { attendees: userId },
        { $pull: { attendees: userId } }
      );
  
      res.status(200).json({ message: "Utilisateur et données associées supprimés avec succès" });
    } catch (error) {
      console.error("Erreur lors de la suppression de l'utilisateur :", error);
      res.status(500).json({ message: "Erreur serveur", error });
    }
  };

// Modifier un utilisateur par ID
exports.updateUserById = async (req, res) => {

    try {
        let updateData = req.body;
        console.log("req id", req.params.id, "body", updateData);

        // Supprimer les champs qui ne doivent pas être modifiés
        if (updateData._id) delete updateData._id;
        if (updateData.createdAt) delete updateData.createdAt;
        if (updateData.updatedAt) delete updateData.updatedAt;
        if (updateData.__v) delete updateData.__v;

        // Si un mot de passe est fourni, le hasher avant de l'enregistrer
        if (updateData.password) {
            try {
                const hashedPassword = await bcrypt.hash(updateData.password, 10);
                updateData.password = hashedPassword;
            } catch (hashError) {
                return res.status(400).json({
                    message: "Erreur lors du hashage du mot de passe",
                    error: hashError.message
                });
            }
        }


        // Si un fichier a été uploadé, ajoutez l'URL de l'image aux données à mettre à jour
        if (req.file) {
            try {
                const imageUrl = await uploadImageusers(req);
                updateData = { ...updateData, imageurl: imageUrl };
            } catch (uploadError) {
                return res.status(400).json({ message: "Erreur lors de l'upload de l'image", error: uploadError });
            }
        }

        // Notez l'utilisation de User (majuscule) au lieu de user (minuscule)
        console.log("req id", req.params.id, "body", updateData);
        const user = await User.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        });

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};