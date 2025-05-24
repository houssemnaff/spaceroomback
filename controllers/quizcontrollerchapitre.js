// controllers/quizcontroller.js
const Quiz = require('../models/quizmodelchapitre');
const QuizAttempt = require('../models/quizattmetpchapitre');
const mongoose = require('mongoose');
const notificationService = require('./fonctionnotification');
const course = require('../models/course');
const { updateAllStudentsProgress } = require('./userprogressconttroller');
const user = require('../models/user');

// Créer un nouveau quiz
exports.createQuiz = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      questions, 
      courseId, 
      chapterId,
      availableFrom,
      availableUntil,
      timeLimit 
    } = req.body;
    const cc =await course.findById(courseId);

    if (!title || !courseId || !chapterId || !questions || !Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        message: "Données manquantes ou invalides"
      });
    }

    const quiz = await Quiz.create({
      title,
      description,
      courseId,
      chapterId,
      questions,
      availableFrom: availableFrom || new Date(),
      availableUntil: availableUntil || null,
      timeLimit: timeLimit || 30,
      createdBy: req.user._id
    });
   
    // Envoyer une notification à tous les étudiants du cours
    try {
      await notificationService.notifyCourseStudents(
        courseId,
        "Nouveau quiz disponible",
        `Un nouveau quiz "${title}" a été ajouté au cours "${cc.title}".`,
        "assignment",
        quiz._id,
        courseId
      );
    } catch (notificationError) {
      console.error("Erreur lors de l'envoi des notifications:", notificationError);
      // Ne pas bloquer la création du quiz si l'envoi des notifications échoue
    }
    await updateAllStudentsProgress(courseId);


    res.status(201).json(quiz);
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création du quiz"
    });
  }
};

// Récupérer un quiz par ID
exports.getQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({
        success: false,
        message: "ID du quiz invalide"
      });
    }

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz non trouvé"
      });
    }

    res.status(200).json(quiz);
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du quiz"
    });
  }
};

// Récupérer tous les quiz d'un chapitre
exports.getChapterQuizzes = async (req, res) => {
  try {
    const { chapterId, courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chapterId) || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "IDs invalides"
      });
    }

    const quizzes = await Quiz.find({
      chapterId,
      courseId
    })

    res.status(200).json(quizzes);
  } catch (error) {
    console.error("Error fetching chapter quizzes:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des quiz"
    });
  }
};

// Récupérer tous les quiz d'un cours
exports.getCourseQuizzes = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "ID du cours invalide"
      });
    }

    const quizzes = await Quiz.find({ courseId })
      .select('title description availableFrom availableUntil timeLimit');

    res.status(200).json(quizzes);
  } catch (error) {
    console.error("Error fetching course quizzes:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des quiz du cours"
    });
  }
};

// Mettre à jour un quiz
exports.updateQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { 
      title, 
      description, 
      questions,
      availableFrom,
      availableUntil,
      timeLimit 
    } = req.body;

    
    // Validation des questions selon le schéma
    const validatedQuestions = questions.map(q => {
      // S'assurer que chaque question a un texte et des options valides
      return {
        text: q.text,
        options: q.options.map(opt => ({
          text: opt.text,
          isCorrect: opt.isCorrect
        }))
      };
    });
    
    const quiz = await Quiz.findByIdAndUpdate(
      quizId,
      { 
        title, 
        description, 
        questions: validatedQuestions,
        availableFrom: availableFrom || Date.now(),
        availableUntil,
        timeLimit: timeLimit || 30,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz non trouvé"
      });
    }
    
    res.status(200).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error("Error updating quiz:", error);
    res.status(500).json({
      success: false,
      message: "Impossible de mettre à jour le quiz",
      error: error.message
    });
  }
};

// Supprimer un quiz
exports.deleteQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({
        success: false,
        message: "ID du quiz invalide"
      });
    }

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz non trouvé"
      });
    }
    await updateAllStudentsProgress(quiz.courseId);

    // Supprimer le quiz et toutes ses tentatives
    await Promise.all([
      Quiz.findByIdAndDelete(quizId),
      QuizAttempt.deleteMany({ quizId })
    ]);

    res.status(200).json({
      success: true,
      message: "Quiz et tentatives supprimés avec succès"
    });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression du quiz"
    });
  }
};
// Sauvegarder la progression d'un quiz
exports.saveQuizProgress = async (req, res) => {
    try {
      
      const { quizId, courseId, chapterId, score, totalQuestions, answers, completed } = req.body;
      const userId = req.user.id;
  
      if (!mongoose.Types.ObjectId.isValid(quizId) || 
          !mongoose.Types.ObjectId.isValid(courseId) || 
          !mongoose.Types.ObjectId.isValid(chapterId)) {
        return res.status(400).json({
          success: false,
          message: "IDs invalides"
        });
      }
      const cc = await course.findById(courseId).populate("owner");
      const quiz = await Quiz.findById(quizId);
      const student = await user.findById(userId);
  
      // Valider que les réponses correspondent au schéma attendu avec tous les champs requis
      const validatedAnswers = answers.map(answer => ({
        questionIndex: answer.questionIndex,
        selectedOption: answer.selectedOption,
        isCorrect: answer.isCorrect,
        question: answer.question,           // Ajout du champ requis
        selectedAnswer: answer.selectedAnswer, // Ajout du champ requis
        correctAnswer: answer.correctAnswer    // Ajout du champ requis
      }));
  
      // Vérifier si une tentative existe déjà
      let attempt = await QuizAttempt.findOne({ userId, quizId });
  
      if (attempt) {
        // Mettre à jour la tentative existante
        attempt.score = score;
        attempt.totalQuestions = totalQuestions;
        attempt.answers = validatedAnswers;
        attempt.completed = completed;
        attempt.completedAt = new Date();
        await attempt.save();
      } else {
        // Créer une nouvelle tentative
        attempt = await QuizAttempt.create({
          userId,
          quizId,
          courseId,
          chapterId,
          score,
          totalQuestions,
          answers: validatedAnswers,
          completed,
          completedAt: new Date()
        });
      }
     
      // Envoyer notification au professeur (propriétaire du cours)
      await notificationService.createNotification(
        cc.owner._id, // Professeur
        "Nouvelle soumission de quiz",
        `L'étudiant ${student.name} a soumis le quiz "${quiz.title}" dans le cours "${cc.title}"`,
        "assignment",
        quizId,
        courseId
      );
  
      res.status(200).json(attempt);
      
    } catch (error) {
      console.error("Error saving quiz progress:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la sauvegarde de la progression",
        details: error.message
      });
    }
  };
// Récupérer toutes les tentatives d'un quiz (pour les enseignants)
exports.getAllAttempts = async (req, res) => {
  try {
    const { quizId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({
        success: false,
        message: "ID du quiz invalide"
      });
    }

    const attempts = await QuizAttempt.find({ quizId })
      .populate('userId', 'name email')
      .sort('-completedAt');

    res.status(200).json(attempts);
  } catch (error) {
    console.error("Error fetching quiz attempts:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des tentatives"
    });
  }
};

// Récupérer les tentatives d'un étudiant
exports.getStudentAttempts = async (req, res) => {
  try {
    const { quizId, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(quizId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "IDs invalides"
      });
    }

    const attempts = await QuizAttempt.find({ quizId, userId })
      .sort('-completedAt');

    res.status(200).json(attempts);
  } catch (error) {
    console.error("Error fetching student attempts:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des tentatives de l'étudiant"
    });
  }
};

// Récupérer la progression d'un quiz
exports.getQuizProgress = async (req, res) => {
  try {
    const { quizId, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(quizId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "IDs invalides"
      });
    }

    const attempt = await QuizAttempt.findOne({ quizId, userId })
      .sort('-completedAt');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Aucune tentative trouvée"
      });
    }

    res.status(200).json(attempt);
  } catch (error) {
    console.error("Error fetching quiz progress:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la progression"
    });
  }
};