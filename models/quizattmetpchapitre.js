// models/QuizAttempt.js
const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionIndex: {
    type: Number,
    required: true
  },
  selectedOption: {
    type: Number,
    required: true
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  selectedAnswer: {
    type: String,
    required: true
  },
  correctAnswer: {
    type: String,
    required: true
  }
});

const quizAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  totalQuestions: {
    type: Number,
    required: true,
    min: 1
  },
  completed: {
    type: Boolean,
    default: false
  },
  answers: {
    type: [answerSchema],
    //required: true,
    validate: {
      validator: function(answers) {
        return Array.isArray(answers) && answers.length > 0;
      },
      message: 'Au moins une réponse est requise'
    }
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
});

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

module.exports = QuizAttempt;