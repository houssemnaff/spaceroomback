const Course = require("../models/course");
const User = require("../models/user");
const crypto = require("crypto");



const { uploadImage } = require('../utils/imageUpload');  // Adjust the path accordingly
const course = require("../models/course");
const Chapter = require("../models/chapter");
const ressource = require("../models/ressource");
const sendEmail = require("./emailcontroller");
const UserProgress = require("../models/UserProgress");
const { default: mongoose } = require("mongoose");
const QuizAttempt = require("../models/quizattmetpchapitre");
const Submission = require("../models/Submission");

exports.createCourse = async (req, res) => {
    try {
        
        // Ensure title and description are included in the request body
        if (!req.body.title || !req.body.description  ||  req.body.matiere) {
            return res.status(400).json({ message: 'Title and  and matiere are required' });
        }

        // Upload the image and get the URL from Cloudinary
        const imageurl = await uploadImage(req);  // Now returning image URL directly

        if (!imageurl) {
            return res.status(400).json({ message: 'Image upload failed or no image uploaded' });
        }

        // Generate a unique access key for the course
        const accessKey = crypto.randomBytes(4).toString('hex');

        // Create new course with image URL and other details
        const newCourse = new Course({
            title: req.body.title,
            description: req.body.description,
            matiere: req.body.matiere,
            imageurl,  // Image URL from Cloudinary
            accessKey,
            owner: req.user.id  // Assuming the user is authenticated
        });

        await newCourse.save();

        // Update the user's createdCourses list
        await User.findByIdAndUpdate(req.user.id, {
            $push: { createdCourses: newCourse._id }
        });


        res.status(201).json({ message: 'Course created successfully', course: newCourse });
    } catch (error) {
        console.error('Server error: ', error);
        res.status(500).json({ message: 'Server error', error: error.message || error });
    }
};


// 📌 Rejoindre un cours avec une clé d'accès
exports.joinCourse = async (req, res) => {
  console.log("helllllllllllllllllllllllllllllll")
    try {
        const { accessKey } = req.body;
        const course = await Course.findOne({ accessKey });

        if (!course) {
            return res.status(404).json({ message: "Clé d'accès incorrecte ou cours introuvable" });
        }

        if (course.owner.toString() === req.user.id) {
            return res.status(400).json({ message: "Vous ne pouvez pas rejoindre votre propre cours" });
        }

        if (course.students.includes(req.user.id)) {
        
            return res.status(400).json({ message: "Vous avez déjà rejoint ce cours" });
        }

        // Add the user to the course
        course.students.push(req.user.id);
        await course.save();

        // Add the course to the user's enrolled courses
        const user = await User.findById(req.user.id);
        user.enrolledCourses.push(course._id);
        await user.save();

        res.status(200).json({
            message: "Vous avez rejoint le cours avec succès",
        });

    } catch (error) {
        console.error("Erreur serveur : ", error);
        res.status(500).json({ message: "Erreur serveur", error: error.message || error });
    }
};


// 📌 3. Ajouter une ressource à un cours
exports.addResource = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { type, url, name } = req.body;

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: "Cours introuvable" });

        if (course.owner.toString() !== req.user.id)
            return res.status(403).json({ message: "Vous n'êtes pas autorisé à ajouter des ressources" });

        course.resources.push({ type, url, name });
        await course.save();

        res.status(200).json({ message: "Ressource ajoutée", course });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
// 📌 4. Récupérer les cours créés par un utilisateur
exports.getMyCourses = async (req, res) => {
    try {
        // Trouver uniquement les cours où l'utilisateur est le propriétaire
        const courses = await Course.find({ owner: req.user.id }).populate("owner", "name email");
       
        res.status(200).json({ courses });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};


// 📌 Récupérer les cours rejoints par l'utilisateur
exports.getJoinedCourses = async (req, res) => {
    try {
        const joinedCourses = await Course.find({ students: req.user.id }).populate("owner", "name email");
        res.status(200).json({ joinedCourses });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};



/*
exports.deleteResource = async (req, res) => {
  console.log("resourceId");
  try {
    const { courseId, resourceId } = req.params;
    console.log("resourceId",resourceId);

    // Vérifie si le cours existe
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Cours introuvable" });
    }

    // Vérifie que l'utilisateur est bien le propriétaire
    if (course.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    // Supprime la ressource du tableau `resources` du cours
    course.resources = course.resources.filter(
      (resource) => resource._id.toString() !== resourceId
    );
    await course.save();

    // Supprime l'objet Resource de la collection
    await Resource.findByIdAndDelete(resourceId);

   // 🔥 Très important : convertir resourceId en ObjectId
   const resourceObjectId = new mongoose.Types.ObjectId(resourceId);
console.log("resourceId",resourceId);
console.log("resourceObjectId",resourceObjectId);

   // Supprimer la ressource dans UserProgress de tous les étudiants
   await UserProgress.updateMany(
     { courseId },
     { $pull: { viewedResources: resourceObjectId } }
   );

    res.status(200).json({ message: "Ressource supprimée et progression mise à jour", course });

  } catch (error) {
    console.error("Erreur lors de la suppression de la ressource:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};
*/


exports.getCourseDetails = async (req, res) => {
    console.log("Fonction getCourseDetails appelée"); // Log pour vérifier que la fonction est appelée

    try {
        const { courseId } = req.params; // Récupérer le courseId depuis les paramètres de l'URL
        console.log("ID du cours reçu :", courseId); // Log pour vérifier l'ID reçu

        if (!courseId) {
            return res.status(400).json({ message: "courseId est requis" });
        }

        // Trouver le cours par ID et peupler les informations du propriétaire et des étudiants
        const course = await Course.findById(courseId)
            .populate("owner", "name email") // Peupler les informations du propriétaire
            .populate("students", "name email"); // Peupler les informations des étudiants

        if (!course) {
            return res.status(404).json({ message: "Cours non trouvé" });
        }

        res.status(200).json({ message: "Détails du cours récupérés avec succès", course });
    } catch (error) {
        console.error("Erreur serveur : ", error);
        res.status(500).json({ message: "Erreur serveur", error: error.message || error });
    }
};
// 🔹 Récupérer la liste des étudiants inscrits à un cours
exports.getcourstudents = async (req, res) => {
    try {
      const course = await Course.findById(req.params.courseId).populate("students", "name email");
      if (!course) return res.status(404).json({ message: "Cours non trouvé" });
  
      res.json({ students: course.students });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  };
  
  exports.deletestudentfromcour = async (req, res) => {
    const { courseId, studentId } = req.params;
    const userId = req.user.id; // ID du professeur qui fait la requête
  
    // Vérification des ObjectId
    if (!mongoose.Types.ObjectId.isValid(courseId) || 
        !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "ID de cours ou étudiant invalide" });
    }
  
    try {
      // 1. Vérifier que le cours existe et que l'utilisateur est le propriétaire
      const course = await Course.findOne({ 
        _id: courseId, 
        owner: userId 
      });
  
      if (!course) {
        return res.status(404).json({ 
          message: "Cours non trouvé ou vous n'êtes pas le propriétaire" 
        });
      }
  
      // 2. Retirer l'étudiant du cours
      await Course.updateOne(
        { _id: courseId },
        { $pull: { students: studentId } }
      );
  
      // 3. Retirer le cours de la liste des cours suivis par l'étudiant
      await User.updateOne(
        { _id: studentId },
        { $pull: { enrolledCourses: courseId } }
      );
       
  
      // 4. Supprimer les soumissions de l'étudiant pour CE COURS seulement
      await Submission.deleteMany({ 
        course: courseId,
        student: studentId 
      });
  
      // 5. Supprimer la progression de l'étudiant pour CE COURS
      await UserProgress.deleteOne({ 
        courseId,
        userId: studentId 
      });
  
      // 6. Supprimer les résultats de quiz pour CE COURS seulement
      await QuizAttempt.deleteMany({ 
        courseId,
        userId: studentId 
      });
  
      
      res.json({ 
        success: true,
        message: "Étudiant supprimé du cours avec nettoyage complet des données associées",
        courseId,
        studentId
      });
  
    } catch (error) {
      console.error("Erreur lors de la suppression de l'étudiant:", error);
      res.status(500).json({ 
        success: false,
        message: "Erreur lors de la suppression de l'étudiant du cours",
        error: error.message
      });
    }
  };

  exports.joincourlink = async (req, res) => {
    try {
      const accessKey = req.params.accessKey;
  
      if (!accessKey) {
        return res.status(400).json({ message: "La clé d'accès est requise" });
      }
  
      const course = await Course.findOne({ accessKey });
  
      if (!course) {
        return res.status(404).json({ message: "Cours introuvable" });
      }
  
      if (course.owner.toString() === req.user.id.toString()) {
        return res.status(400).json({ message: "Vous ne pouvez pas rejoindre votre propre cours" });
      }
  
      // Vérification plus robuste de l'inscription existante
      const alreadyJoined = course.students.some(studentId => 
        studentId.toString() === req.user.id.toString()
      );
  
      if (alreadyJoined) {
        return res.status(200).json({ 
          message: "Vous êtes déjà inscrit à ce cours", 
          course,
          alreadyJoined: true // Ajout d'un flag pour le frontend
        });
      }
  
      // Utilisation de $addToSet pour éviter les doublons côté base de données
      const updatedCourse = await Course.findOneAndUpdate(
        { _id: course._id, students: { $ne: req.user.id } },
        { $addToSet: { students: req.user.id } },
        { new: true }
      );
  
      if (!updatedCourse) {
        return res.status(200).json({ 
          message: "Vous êtes déjà inscrit à ce cours",
          course
        });
      }
  
      await User.findByIdAndUpdate(req.user.id, {
        $addToSet: { enrolledCourses: course._id }
      });
  
      return res.status(200).json({
        message: "Vous avez rejoint le cours avec succès",
        course: updatedCourse
      });
    } catch (error) {
      console.error("Erreur serveur : ", error);
      res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
  };
  

// Ajouter cette fonction dans le fichier controllers/courseController.js


// 🔹 Inviter un étudiant par email à rejoindre un cours
exports.inviteStudentToCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "L'adresse email est requise" });
    }

    // Vérifier le format de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Format d'email invalide" });
    }

    // Trouver le cours
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Cours introuvable" });
    }

    // Vérifier que l'utilisateur est le propriétaire du cours
    if (course.owner.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: "Vous n'êtes pas autorisé à inviter des étudiants à ce cours" 
      });
    }

    // Trouver l'information du propriétaire (professeur)
    const professor = await User.findById(req.user.id, "name email");
    if (!professor) {
      return res.status(404).json({ message: "Informations du professeur introuvables" });
    }

    // Créer le lien d'invitation avec la clé d'accès du cours
    const inviteLink = `${process.env.FRONTEND_URL }/course/join/${course.accessKey}`;
    
    // Préparer le contenu de l'email
    const emailContent = {
      from: `"${professor.name}" <${professor.email}>`,
      to: email,
      subject: `Invitation à rejoindre le cours "${course.title}"`,
      text: `
Bonjour,

Vous avez été invité(e) par ${professor.name} (${professor.email}) à rejoindre le cours "${course.title}".

Pour rejoindre ce cours, veuillez cliquer sur le lien suivant:
${inviteLink}

Cordialement,
L'équipe de la plateforme de cours
      `,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4A90E2; color: white; padding: 10px 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .button { background-color: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; border-radius: 5px; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Invitation à rejoindre un cours</h2>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Vous avez été invité(e) par <strong>${professor.name}</strong> (<a href="mailto:${professor.email}">${professor.email}</a>) à rejoindre le cours :</p>
      <h3>"${course.title}"</h3>
      <p>Pour accéder à ce cours, veuillez cliquer sur le bouton ci-dessous :</p>
      <p style="text-align: center;">
        <a href="${inviteLink}" class="button">Rejoindre le cours</a>
      </p>
      <p>Ou copiez et collez ce lien dans votre navigateur :</p>
      <p>${inviteLink}</p>
    </div>
    <div class="footer">
      <p>Ceci est un message automatique, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>
      `
    };

    // Envoyer l'email
    await sendEmail(emailContent);

    res.status(200).json({ 
      message: "Invitation envoyée avec succès",
      inviteLink
    });
    
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'invitation:", error);
    res.status(500).json({ 
      message: "Erreur lors de l'envoi de l'invitation", 
      error: error.message || error 
    });
  }
};
// 📌 Mettre à jour un cours
exports.updateCourse = async (req, res) => {
    try {
      const { courseId } = req.params;
      
     
      
      // Récupérer le title et description du formulaire 
      // ou utiliser les valeurs existantes si non fournis
      const title = req.body.title;
      const description = req.body.description;
      
      
      // Vérifier si le cours existe
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Cours introuvable" });
      }
      
      // Vérifier si l'utilisateur est le propriétaire du cours
      if (course.owner.toString() !== req.user.id) {
        return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier ce cours" });
      }
      
      // Préparer les données de mise à jour en utilisant les valeurs existantes 
      // si les nouvelles ne sont pas fournies
      const updateData = {};
      
      // N'ajouter que les champs qui sont définis
      if (title !== undefined) {
        updateData.title = title;
      }
      
      if (description !== undefined) {
        updateData.description = description;
      }
      
      // Si une nouvelle image est fournie, la télécharger
      if (req.file) {
        const imageurl = await uploadImage(req);
        if (imageurl) {
          updateData.imageurl = imageurl;
        }
      }
      
      console.log("Données finales pour mise à jour:", updateData);
      
      // Mettre à jour le cours seulement avec les champs qui ont été fournis
      const updatedCourse = await Course.findByIdAndUpdate(
        courseId,
        updateData,
        { new: true }
      ).populate("owner", "name email");
      
      res.status(200).json({
        message: "Cours mis à jour avec succès",
        course: updatedCourse
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du cours :", error);
      res.status(500).json({ message: "Erreur serveur", error: error.message || error });
    }
  };