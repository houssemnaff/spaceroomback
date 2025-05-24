const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const assignmentController = require('../controllers/assignmentController');
const { protect } = require('../middleware/authMiddleware');
const { generateAssignmentWithAI } = require('../controllers/aiassigmentecontrolleer');

// Configuration de stockage pour multer
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/assignments/');
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|json|csv/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Type de fichier non supporté"));
  }
});

// Routes
router.post('/', protect, upload.array('attachments', 5), assignmentController.createAssignment);
router.get('/course/:courseId', protect, assignmentController.getAssignmentsByCourse);
router.get('/:id', protect, assignmentController.getAssignmentById);
router.post('/generate', protect, generateAssignmentWithAI);
router.put('/:id', protect,  upload.array('attachments', 5), assignmentController.updateAssignment);
router.delete('/:id', protect, assignmentController.deleteAssignment);

module.exports = router;
