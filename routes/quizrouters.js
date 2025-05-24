// routes/quizRoutes.js
const express = require("express");
const router = express.Router();
const quizController = require("../controllers/quizconttroller");
const { protect } = require("../middleware/authMiddleware");

// Quiz creation and management
router.post("/", protect, quizController.createQuiz);
router.get("/my-quizzes", protect, quizController.getUserQuizzes);
router.get("/joined-quizzes", protect, quizController.getJoinedQuizzes);
router.get("/course/:courseId", protect, quizController.getCourseQuizzes);
router.get("/:quizId", protect, quizController.getQuiz);
router.put("/:quizId", protect, quizController.updateQuiz);
router.delete("/:quizId", protect, quizController.deleteQuiz);
router.post("/:quizId/associate/:courseId", protect, quizController.associateQuizToCourse);

// Join quiz with access key
router.post("/join", protect, quizController.joinQuizWithAccessKey);

// Question management
router.post("/:quizId/questions", protect, quizController.addQuestion);

// Quiz participation
router.post("/:quizId/start", protect, quizController.startQuiz);
router.post("/:quizId/submit", protect, quizController.submitQuiz);
router.get("/:quizId/results", protect, quizController.getQuizResults);
// Get all submissions for a quiz (for quiz owner)
router.get("/:quizId/submissions", protect, quizController.getQuizSubmissions);

module.exports = router;