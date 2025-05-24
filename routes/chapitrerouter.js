const express = require("express");
const router = express.Router();

const { updateChapter,deleteChapter, addResourceToChapter} = require("../controllers/chapitreconntroller");
const {addResourceToChapter,updateResource } = require("../controllers/ResourceController");
const { protect } = require("../middleware/authMiddleware");
/*
// Routes pour les chapitresaddChapterToCourse);  // Ajouter un chapitre à un cours
router.put("/chapter/:chapterId", protect,updateChapter);  // Modifier un chapitre
router.delete("/course/:courseId/chapter/:chapterId",protect,deleteChapter);  // Supprimer un chapitre

// Routes pour les ressources
router.post("/chapter/:chapterId/resource",protect,addResourceToChapter);  // Ajouter une ressource à un chapitre
router.put("/resource/:resourceId",protect,updateResource);  // Modifier une ressource
router.delete("/chapter/:chapterId/resource/:resourceId",protect, deleteResource);  // Supprimer une ressource
*/
module.exports = router;
