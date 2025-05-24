const express = require("express");
const { 
  createCourse, 
  joinCourse, 
  addResource, 
  getMyCourses, 
   
   
  getJoinedCourses,
  getCourseDetails,
  joincourlink,
  deletestudentfromcour,
  getcourstudents,
  inviteStudentToCourse,
  updateCourse
} = require("../controllers/courseController");

const { protect } = require("../middleware/authMiddleware");
const upload = require("../utils/multerConfig");

const { addChapterToCourse, getAllChaptersForCourse, updateChapter, deleteChapterFromCourse, Addressourcetochapitre, Getressourcechapitre, deleteResourceFromChapter } = require("../controllers/chapitreconntroller");
const uploadMiddleware = require("../utils/multerConfig");
const { markResourceViewed, markAssignmentCompleted, getCourseProgress } = require("../controllers/userprogressconttroller");
const { deleteCourse } = require("../controllers/adminController");

const router = express.Router();

router.post('/create', protect, uploadMiddleware,createCourse); // Use the upload middleware here
router.post("/join", protect,joinCourse); // Rejoindre un cours
router.post("/join/:accessKey",protect,joincourlink); // Rejoindre un cours
router.post("/:courseId/add-resource",protect, addResource); // Ajouter une ressource
router.get("/my-courses",protect, getMyCourses); // Récupérer les cours
router.get("/my-join-courses", protect,getJoinedCourses); // Récupérer les cours
router.get("/:courseId",protect, getCourseDetails); // Route pour récupérer les détails d'un cours
router.get("/:courseId/students", protect, getcourstudents);
// Modifiez cette ligne dans votre routeur
router.delete("/:courseId", protect, deleteCourse);
//router.delete("/:courseId/resource/:resourceId",protect, deleteResource); // Supprimer une ressource
router.delete("/:courseId/students/:studentId",protect, deletestudentfromcour); 
router.post("/:courseId/invite", protect,inviteStudentToCourse);
router.put("/:courseId", protect, upload, updateCourse); // Mettre à jour un cours

// chapitre
router.post("/:courseId/add-chapter", addChapterToCourse); // Ajouter un chapitre à un cours
router.get("/:courseId/chapters", getAllChaptersForCourse);
router.delete("/:courseId/chapters/:chapterId", deleteChapterFromCourse);
router.put("/:courseId/chapters/:chapterId",updateChapter);

// ressource
router.post("/:courseId/chapter/:chapterId/resources",protect,uploadMiddleware,Addressourcetochapitre);  // Ajouter une ressource à un chapitre
router.get('/:courseId/chapter/:chapterId/resources', protect,Getressourcechapitre) ;
// Définir la route pour supprimer une ressource d'un chapitre
router.delete("/:courseId/chapter/:chapterId/resources/:resourceId",protect, deleteResourceFromChapter);

// progresss 
router.post("/progress/resource", markResourceViewed);
router.post("/progress/assignment", markAssignmentCompleted);
router.get("/progress/:userId/:courseId", getCourseProgress);
module.exports = router;




