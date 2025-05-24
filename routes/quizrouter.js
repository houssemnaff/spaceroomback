// routes/quizRoutes.js
/*
const express = require("express");
const router = express.Router();
const quizController = require("../controllers/quizconttroller");
const authMiddleware = require("../middleware/authMiddleware");



// Création et gestion des quiz
router.post("/", authMiddleware.protect,quizController.createQuiz);
router.get("/user", authMiddleware.protect,quizController.getUserQuizzes);
router.post("/:quizId/associate/:courseId",authMiddleware.protect, quizController.associateQuizToCourse);
router.get("/course/:courseId", authMiddleware.protect,quizController.getCourseQuizzes);

// Gestion des questions
router.post("/:quizId/questions",authMiddleware.protect, quizController.addQuestion);

// Soumission des quiz
router.post("/:quizId/submit", authMiddleware.protect,quizController.submitQuiz);

module.exports = router;*/