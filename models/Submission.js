// models/Submission.js
const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: [true, 'Assignment ID is required']
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required']
  },
  content: {
    type: String,
    trim: true
  },
  attachments: [{
    filename: {
      type: String,
      required: [true, 'Filename is required']
    },
    path: {
      type: String,
      required: [true, 'File path is required']
    },
    mimetype: {
      type: String,
      required: [true, 'Mimetype is required']
    },
    size: {
      type: Number,
      required: [true, 'File size is required']
    }
  }],
  grade: {
    type: Number,
    min: [0, 'Grade cannot be negative'],
    max: [100, 'Grade cannot exceed 100'],
    default: null
  },
  feedback: {
    type: String,
    trim: true,
    default: ''
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: {
      values: ['submitted', 'late', 'graded'],
      message: '{VALUE} is not a valid status'
    },
    default: 'submitted'
  }
}, {
  timestamps: true, // Ajoute automatiquement createdAt et updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Solution pour éviter OverwriteModelError
module.exports = mongoose.models?.Submission || 
                 mongoose.model('Submission', SubmissionSchema);