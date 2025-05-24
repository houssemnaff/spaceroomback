// routes/quizRoutes.js
const express = require('express');
const { 
  createQuiz, 
  getQuiz, 
  getChapterQuizzes, 
  getCourseQuizzes,
  updateQuiz, 
  deleteQuiz, 
  saveQuizProgress, 
  getQuizProgress, 
  getAllAttempts, 
  getStudentAttempts 
} = require('../controllers/quizcontrollerchapitre');
const { protect } = require('../middleware/authMiddleware');
const { generateQuiz, analysePerformances } = require('../controllers/aiquizgenerate');

const router = express.Router();

// Routes publiques (avec protection d'authentification)
router.post('/', protect, createQuiz);
router.get('/:quizId', protect, getQuiz);
router.get('/chapter/:chapterId/course/:courseId', protect, getChapterQuizzes);
router.get('/course/:courseId', protect, getCourseQuizzes);
router.put('/:quizId', protect, updateQuiz);
router.delete('/:quizId', protect, deleteQuiz);

// Routes pour les tentatives de quiz
router.post('/progress', protect, saveQuizProgress);
router.get('/progress/:quizId/:userId', protect, getQuizProgress);
router.get('/attempts/:quizId', protect, getAllAttempts);
router.get('/attempts/student/:quizId/:userId', protect, getStudentAttempts);
router.post('/generate', protect, generateQuiz);
router.post('/analyse-performances', protect, analysePerformances);

module.exports = router;