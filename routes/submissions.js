const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const submissionController = require('../controllers/submissionController');
const { protect } = require('../middleware/authMiddleware');

// Configuration de stockage pour multer
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/submissions/');
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|zip/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Type de fichier non supporté"));
  }
});

// Routes
router.post('/', protect, upload.array('attachments', 5),submissionController.submitAssignment);
router.get('/assignment/:assignmentId', protect, submissionController.getSubmissionsByAssignment);
router.get('/my/:id', protect, submissionController.getSubmissionById);
router.get('/my/assignment/:assignmentId', protect, submissionController.getMySubmissionByAssignmentId);
router.put('/grade/:id', protect, submissionController.gradeSubmission);
router.put('/:id', protect, upload.array('newAttachments', 5), submissionController.updateSubmission);
router.delete('/:id', protect,  submissionController.deleteSubmission);

module.exports = router;
