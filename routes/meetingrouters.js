const express = require("express");
const router = express.Router();
const meetingController = require("../controllers/meeting");
const { protect } = require("../middleware/authMiddleware");

//

// Créer une nouvelle réunion
router.post("/",protect,meetingController.createMeeting);

// Récupérer toutes les réunions d'un cours
router.get("/course/:courseId",protect, meetingController.getMeetingsByCourse);

// Récupérer les détails d'une réunion spécifique
router.get("/:meetingId",protect, meetingController.getMeetingById);

// Mettre à jour une réunion
router.put("/:meetingId",protect, meetingController.updateMeeting);

// Supprimer une réunion
router.delete("/:meetingId",protect, meetingController.deleteMeeting);

// Rejoindre une réunion (ajouter un participant)
router.post("/:meetingId/join",protect, meetingController.joinMeeting);

// Marquer une réunion comme ayant un enregistrement disponible
router.put("/:meetingId/recording", protect,meetingController.setRecordingAvailable);

module.exports = router;