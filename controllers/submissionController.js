const Assignment = require('../models/Assignment');
const { markAssignmentCompleted } = require('./userprogressconttroller');
const notificationService = require("../controllers/fonctionnotification");
const User = require("../models/user");
const Course = require("../models/course");
const Submission = require('../models/Submission');
const { uploadFilesToCloudinarysub } = require('../utils/imageUpload');

exports.submitAssignment = async (req, res) => {
  try {
    const { assignmentId, content, courseId } = req.body;
    const userId = req.user.id;

    // Vérifier si le devoir existe
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Devoir non trouvé" });
    }

    // Vérifier si l'utilisateur a déjà soumis ce devoir
    const existingSubmission = await Submission.findOne({ assignmentId, studentId: userId });
    if (existingSubmission) {
      return res.status(400).json({ message: "Vous avez déjà soumis ce devoir" });
    }

    /*Gérer les fichiers joints
    const attachments = req.files ? req.files.map(file => ({
      filename: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size // Ajoutez cette ligne

    })) : [];*/

    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = await uploadFilesToCloudinarysub(req.files);
    }


    // Enregistrer la soumission
    const submission = new Submission({
      assignmentId,
      studentId: userId,
      content,
      submittedAt: new Date(),
      attachments
    });

    await submission.save();

    // Marquer comme complété
    await markAssignmentCompleted(userId, courseId, assignmentId);

    // Récupérer infos supplémentaires
    const student = await User.findById(userId);
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: "Cours non trouvé" });
    }

    // Envoyer notification au professeur (propriétaire du cours)
    await notificationService.createNotification(
      course.owner._id, // ID du propriétaire du cours
      "Nouvelle soumission de devoir",
      `L'étudiant ${student.name} a soumis le devoir "${assignment.title}" dans le cours "${course.title}"`,
      "assignment",
      submission._id,
      courseId
    );

    return res.status(200).json({ message: "Devoir soumis avec succès" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la soumission du devoir" });
  }
};



// Récupérer toutes les soumissions d'un devoir
exports.getSubmissionsByAssignment = async (req, res) => {
  try {
    const submissions = await Submission.find({ assignmentId: req.params.assignmentId }).populate('studentId', 'name email');
    res.status(200).json(submissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération des soumissions" });
  }
};

// Récupérer une soumission spécifique
exports.getSubmissionById = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id).populate('studentId', 'name email');
    if (!submission) {
      return res.status(404).json({ message: "Soumission non trouvée" });
    }
    res.status(200).json(submission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération de la soumission" });
  }
};


// New controller method to get submission by assignment ID
exports.getMySubmissionByAssignmentId = async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId;
    const studentId = req.user.id; // Assuming your protect middleware sets req.user.id

    const submission = await Submission.findOne({
      assignmentId: assignmentId,
      studentId: studentId
    });

    if (!submission) {
      return res.status(404).json({ message: "Soumission non trouvée" });
    }



    res.status(200).json(submission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération de la soumission" });
  }
};


// Mettre à jour une soumission
exports.updateSubmission = async (req, res) => {
  try {
    const { textContent } = req.body;
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: "Soumission non trouvée" });
    }

    if (submission.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier cette soumission" });
    }

    let attachments = submission.attachments;

    // Ajouter de nouvelles pièces jointes
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        filename: file.originalname,
        path: file.path,
        mimetype: file.mimetype
      }));
      attachments = [...attachments, ...newAttachments];
    }

    // Supprimer des pièces jointes si demandé
    if (req.body.removeAttachments) {
      const removeIds = JSON.parse(req.body.removeAttachments);
      attachments = attachments.filter((_, index) => !removeIds.includes(index));
    }

    submission.textContent = textContent || submission.textContent;
    submission.attachments = attachments;
    submission.submittedAt = new Date();

    await submission.save();
    res.status(200).json(submission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la mise à jour de la soumission" });
  }
};

// Supprimer une soumission
exports.deleteSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: "Soumission non trouvée" });
    }

    if (submission.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à supprimer cette soumission" });
    }

    await Submission.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Soumission supprimée avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la suppression de la soumission" });
  }
};


// In your submissionController.js file
exports.gradeSubmission = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { grade, feedback } = req.body;

    // Validate the input
    if (grade === undefined || isNaN(parseFloat(grade))) {
      return res.status(400).json({ message: "Une note valide est requise" });
    }

    // Find and update the submission
    const submission = await Submission.findById(submissionId);

    if (!submission) {
      return res.status(404).json({ message: "Soumission non trouvée" });
    }

    // Update the submission
    submission.grade = parseFloat(grade);
    submission.feedback = feedback || "";
    submission.status = "graded";

    // Save the changes
    await submission.save();

    res.status(200).json(submission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la notation de la soumission" });
  }
};