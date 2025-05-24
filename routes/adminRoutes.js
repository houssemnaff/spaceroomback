const express = require('express');
const router = express.Router();
const { 
   
  getStudentEngagement,
  getGradeDistribution,
  getActivityHeatmap,
  getPopularCourses,
  getTopStudents,
  getAllCourses,
  getCourseById,
  updateCourse,
  createCourse,
  deleteCourse,
  getCourseStats,
  getAllCoursesWithStats,
  getAllMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getAllResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  getUserStats,
  getAllUsersWithStats,
  enrollInCourse,
  unenrollFromCourse,
  updateUserProgress,
  getUserProgressForCourse,
  getSystemOverview,
  getCategoryDistribution,
  getStudentSkills,
  getCourseCompletionRates,
  getAllChapters,
  getChapterById,
  createChapter,
  updateChapter,
  deleteChapter,
  getAllQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getAllAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getTotalCounts,
  //getDashboardStats
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { deleteUserById } = require('../controllers/usercontroller');

// Dashboard Routes
//router.get('/dashboard/stats', protect, adminOnly, getDashboardStats);
router.get('/dashboard/engagement', protect, adminOnly, getStudentEngagement);
router.get('/dashboard/grades', protect, adminOnly, getGradeDistribution);
router.get('/dashboard/activity', protect, adminOnly, getActivityHeatmap);
router.get('/dashboard/courses/popular', protect, adminOnly, getPopularCourses);
router.get('/dashboard/students/top', protect, adminOnly, getTopStudents);

// Course Routes
router.get('/courses', protect, adminOnly, getAllCourses);
router.get('/courses/:id', protect, adminOnly, getCourseById);
router.post('/courses', protect, adminOnly, createCourse);
router.put('/courses/:id', protect, adminOnly, updateCourse);
router.delete('/courses/:courseId', protect, adminOnly, deleteCourse);

// Course Statistics Routes
router.get('/courses/stats/:id', protect, adminOnly, getCourseStats);
router.get('/courses/all/stats', protect, adminOnly, getAllCoursesWithStats);

// Meeting Routes
router.get('/meetings', protect, adminOnly, getAllMeetings);
router.get('/meetings/:id', protect, adminOnly, getMeetingById);
router.post('/meetings', protect, adminOnly, createMeeting);
router.put('/meetings/:id', protect, adminOnly, updateMeeting);
router.delete('/meetings/:id', protect, adminOnly, deleteMeeting);

// Resource Routes
router.get('/resources', protect, adminOnly, getAllResources);
router.get('/resources/:id', protect, adminOnly, getResourceById);
router.post('/resources', protect, adminOnly, createResource);
router.put('/resources/:id', protect, adminOnly, updateResource);
router.delete('/resources/:id', protect, adminOnly, deleteResource);

// User Routes
router.get('/users/stats/:id', protect, adminOnly, getUserStats);
router.get('/users/all/stats', protect, adminOnly, getAllUsersWithStats);
router.delete("/users/:id",protect, adminOnly,deleteUserById); // Supprimer un utilisateur par ID

// Enrollment Routes
router.post('/enroll', protect, enrollInCourse);
router.delete('/enroll/:id', protect, unenrollFromCourse);

// Progress Routes
router.post('/progress', protect, updateUserProgress);
router.get('/progress/:courseId', protect, getUserProgressForCourse);

// Analytics Routes
router.get('/analytics/overview', protect, adminOnly, getSystemOverview);
router.get('/analytics/categories', protect, adminOnly, getCategoryDistribution);
router.get('/analytics/completion-rates', protect, adminOnly, getCourseCompletionRates);
router.get('/analytics/student-skills/:id', protect, adminOnly, getStudentSkills);

// Chapter Routes
router.get('/chapters', protect, adminOnly, getAllChapters);
router.get('/chapters/:id', protect, adminOnly, getChapterById);
router.post('/chapters', protect, adminOnly, createChapter);
router.put('/chapters/:id', protect, adminOnly, updateChapter);
router.delete('/chapters/:id', protect, adminOnly, deleteChapter);

// Quiz Routes
router.get('/quizzes', protect, adminOnly, getAllQuizzes);
router.get('/quizzes/:id', protect, adminOnly, getQuizById);
router.post('/quizzes', protect, adminOnly, createQuiz);
router.put('/quizzes/:id', protect, adminOnly, updateQuiz);
router.delete('/quizzes/:id', protect, adminOnly, deleteQuiz);

// Assignment Routes
router.get('/assignments', protect, adminOnly, getAllAssignments);
router.get('/assignments/:id', protect, adminOnly, getAssignmentById);
router.post('/assignments', protect, adminOnly, createAssignment);
router.put('/assignments/:id', protect, adminOnly, updateAssignment);
router.delete('/assignments/:id', protect, adminOnly, deleteAssignment);

// Total Counts Route
router.get('/counts', protect, adminOnly, getTotalCounts);

module.exports = router;