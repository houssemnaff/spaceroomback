const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const UserProgress = require('../models/UserProgress');
const { uploadFilesToCloudinary } = require('../utils/imageUpload');
const { updateAllStudentsProgress } = require('./userprogressconttroller');
const cloudinary = require('cloudinary');

// Créer un nouveau devoir
exports.createAssignment = async (req, res) => {
  try {
    const { title, description, courseId, dueDate, maxPoints } = req.body;
console.log("filesssssssssssssssssssssssss",req.files)
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = await uploadFilesToCloudinary(req.files);
    }

    const assignment = new Assignment({
      title,
      description,
      courseId,
      createdBy: req.user.id,
      dueDate,
      maxPoints: maxPoints || 100,
      attachments
    });

    await assignment.save();
    await updateAllStudentsProgress(courseId);

    res.status(201).json(assignment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la création du devoir" });
  }
};

// Récupérer tous les devoirs pour un cours
exports.getAssignmentsByCourse = async (req, res) => {
  try {
    console.log("coursid",req.params.courseId );
    const assignments = await Assignment.find({ courseId: req.params.courseId }).sort({ dueDate: 1 });
    res.status(200).json(assignments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération des devoirs" });
  }
};

// Récupérer un devoir par son ID
exports.getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: "Devoir non trouvé" });
    }
    res.status(200).json(assignment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération du devoir" });
  }
};
exports.updateAssignment = async (req, res) => {
  try {
    const { title, description, dueDate, maxPoints } = req.body;
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: "Devoir non trouvé" });
    }

    if (assignment.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    let attachments = assignment.attachments || [];
    let removeAttachments = [];

    // Traiter removeAttachments qui peut être envoyé comme string JSON
    if (req.body.removeAttachments) {
      try {
        removeAttachments = typeof req.body.removeAttachments === 'string' 
          ? JSON.parse(req.body.removeAttachments) 
          : req.body.removeAttachments;
      } catch (err) {
        console.error("Erreur parsing removeAttachments:", err);
      }
    }

    // Ajouter les nouveaux fichiers
    if (req.files && req.files.length > 0) {
      const newAttachments = await uploadFilesToCloudinary(req.files);
      attachments = [...attachments, ...newAttachments];
    }

    // Supprimer les pièces jointes si demandé
    if (removeAttachments && Array.isArray(removeAttachments) && removeAttachments.length > 0) {
      // Filtrer les attachments
      attachments = attachments.filter(att => !removeAttachments.includes(att.path));
      
      // Supprimer les fichiers de Cloudinary
      await Promise.all(removeAttachments.map(async (path) => {
        try {
          const publicId = path.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error(`Erreur suppression fichier ${path}:`, err);
        }
      }));
    }

    // Mise à jour des autres champs
    assignment.title = title || assignment.title;
    assignment.description = description || assignment.description;
    assignment.dueDate = dueDate || assignment.dueDate;
    assignment.maxPoints = maxPoints || assignment.maxPoints;
    assignment.attachments = attachments;

    await assignment.save();
    res.status(200).json(assignment);
  } catch (error) {
    console.error("Erreur updateAssignment :", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour du devoir" });
  }
};


// Supprimer un devoir
exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({ message: "Devoir non trouvé" });
    }

    if (assignment.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à supprimer ce devoir" });
    }

    // Supprimer les soumissions associées
    await Submission.deleteMany({ assignmentId: req.params.id });

    // Nettoyer les UserProgress
    await UserProgress.updateMany(
      { completedAssignments: req.params.id },
      { $pull: { completedAssignments: req.params.id } }
    );

    // Supprimer le devoir
    await Assignment.findByIdAndDelete(req.params.id);
    await updateAllStudentsProgress(assignment.courseId);


    res.status(200).json({ message: "Devoir supprimé avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la suppression du devoir" });
  }
};
