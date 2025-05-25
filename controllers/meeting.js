const Meeting = require("../models/meeting");
const Course = require("../models/course");
const User = require("../models/user");
const notificationService = require("../controllers/fonctionnotification");

// Génère un ID de salle unique
const generateRoomID = (courseId) => {
  return `course-${courseId}-meeting-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
};

// Vérifier si l'utilisateur a le droit d'accéder à un cours
const checkCourseAccess = async (userId, courseId) => {
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return { access: false, message: "Cours non trouvé" };
    }
    console.log("owner id  checkCourseAccess ",course.owner._id);
    console.log("user id checkCourseAccess",userId);


    const isOwner = course.owner._id.toString() === userId;
    console.log("isowner",isOwner);
    console.log(course.students);

    const isStudent = course.students.some(student => 
        
        student._id.toString() === userId);
        console.log(isStudent);

    return { 
      access: isOwner || isStudent, 
      isOwner, 
      isStudent, 
      course 
    };
  } catch (error) {
    console.error("Erreur lors de la vérification des accès:", error);
    return { access: false, message: "Erreur lors de la vérification des accès" };
  }
};

// Créer une nouvelle réunion
exports.createMeeting = async (req, res) => {
    console.log("meee");
  try {
    const { 
      courseId, 
      title, 
      date, 
      time, 
      duration, 
      description, 
      location 
    } = req.body;
    
    const userId = req.user.id;
    console.log("meee   time",time);

    
    // Vérifier l'accès au cours
    const accessCheck = await checkCourseAccess(userId, courseId);
    if (!accessCheck.access) {
      return res.status(403).json({ message: accessCheck.message || "Accès non autorisé" });
    }
    
    // Vérifier que l'utilisateur est le propriétaire du cours
    if (!accessCheck.isOwner) {
      return res.status(403).json({ message: "Seul le propriétaire du cours peut créer des réunions" });
    }
    
    // Récupérer les informations de l'utilisateur pour obtenir le nom de l'hôte
    const host = await User.findById(userId);
    if (!host) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    
    // Convertir date et heure en objet Date
    const [year, month, day] = date.split("-").map(Number);
const [hour, minute] = time.split(":").map(Number);
// Créer la date puis soustraire 1 heure (3600000 ms)
const dateTime = new Date(year, month - 1, day, hour, minute);
dateTime.setTime(dateTime.getTime() ); // Soustrait 1 heure    console.log("time date ",dateTime);
    // Créer la réunion
    const newMeeting = new Meeting({
      courseId,
      title,
      startTime: dateTime,
      duration: parseInt(duration),
      description,
      hostId: userId,
      hostName: host.name,
      attendees: [], // Initialement vide
      location: location || "Salle  A",
      roomID: generateRoomID(courseId)
    });
    
    const savedMeeting = await newMeeting.save();
    // Create notifications for all students in the course
    await notificationService.notifyCourseStudents(
        courseId,
        "Nouvelle réunion programmée",
        `${host.name} a programmé une nouvelle réunion: ${title}`,
        "meeting",
        savedMeeting._id,
        courseId
      );
    res.status(201).json({
      success: true,
      meeting: savedMeeting
    });
    
  } catch (error) {
    console.error("Erreur lors de la création de la réunion:", error);
    res.status(500).json({ 
      message: "Erreur lors de la création de la réunion", 
      error: error.message 
    });
  }
};

// Récupérer toutes les réunions d'un cours
exports.getMeetingsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    
    // Vérifier l'accès au cours
    const accessCheck = await checkCourseAccess(userId, courseId);
    if (!accessCheck.access) {
      return res.status(403).json({ message: accessCheck.message || "Accès non autorisé" });
    }
    
    // Récupérer toutes les réunions du cours
    const meetings = await Meeting.find({ courseId })
      .sort({ startTime: 1 }); // Trier par date de début
    
    res.status(200).json({
      success: true,
      meetings,
      isOwner: accessCheck.isOwner,
      isStudent: accessCheck.isStudent
    });
    
  } catch (error) {
    console.error("Erreur lors de la récupération des réunions:", error);
    res.status(500).json({ 
      message: "Erreur lors de la récupération des réunions", 
      error: error.message 
    });
  }
};

// Récupérer les détails d'une réunion spécifique
exports.getMeetingById = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;
    
    // Récupérer la réunion
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: "Réunion non trouvée" });
    }
    
    // Vérifier l'accès au cours associé
    const accessCheck = await checkCourseAccess(userId, meeting.courseId);
    if (!accessCheck.access) {
      return res.status(403).json({ message: accessCheck.message || "Accès non autorisé" });
    }
    
    res.status(200).json({
      success: true,
      meeting,
      isOwner: accessCheck.isOwner,
      isStudent: accessCheck.isStudent
    });
    
  } catch (error) {
    console.error("Erreur lors de la récupération de la réunion:", error);
    res.status(500).json({ 
      message: "Erreur lors de la récupération de la réunion", 
      error: error.message 
    });
  }
};

// Mettre à jour une réunion
exports.updateMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { title, date, time, duration, description, location } = req.body;
    const userId = req.user.id;
    
    // Récupérer la réunion
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: "Réunion non trouvée" });
    }
    
    // Vérifier que l'utilisateur est le propriétaire du cours
    const accessCheck = await checkCourseAccess(userId, meeting.courseId);
    if (!accessCheck.isOwner) {
      return res.status(403).json({ message: "Seul le propriétaire du cours peut modifier les réunions" });
    }
    
    // Mettre à jour les champs de la réunion
    const updates = {};
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (location) updates.location = location;
    if (duration) updates.duration = parseInt(duration);
    
    // Si date ou heure sont modifiées, mettre à jour startTime
    // Dans exports.updateMeeting
if (date || time) {
  let currentDate = new Date(meeting.startTime);
  
  if (date) {
    const [year, month, day] = date.split("-").map(Number);
    currentDate = new Date(year, month - 1, day, currentDate.getHours(), currentDate.getMinutes());
  }
  
  if (time) {
    const [hours, minutes] = time.split(':');
    currentDate.setHours(parseInt(hours), parseInt(minutes));
  }
  
  // Soustraire 1 heure avant sauvegarde
  currentDate.setTime(currentDate.getTime() );
  updates.startTime = currentDate;
}
    
    const updatedMeeting = await Meeting.findByIdAndUpdate(
      meetingId,
      { $set: updates },
      { new: true }
    );
    // Create notifications for all students in the course
    await notificationService.notifyCourseStudents(
        updatedMeeting.courseId,
        "Mise à jour de réunion",
        `La réunion "${updatedMeeting.title}" a été mise à jour`,
        "meeting",
        updatedMeeting._id,
        updatedMeeting.courseId
      );
    
    res.status(200).json({
      success: true,
      meeting: updatedMeeting
    });
    
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la réunion:", error);
    res.status(500).json({ 
      message: "Erreur lors de la mise à jour de la réunion", 
      error: error.message 
    });
  }
};

// Supprimer une réunion
exports.deleteMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;
    
    // Récupérer la réunion
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: "Réunion non trouvée" });
    }
    
    // Vérifier que l'utilisateur est le propriétaire du cours
    const accessCheck = await checkCourseAccess(userId, meeting.courseId);
    if (!accessCheck.isOwner) {
      return res.status(403).json({ message: "Seul le propriétaire du cours peut supprimer les réunions" });
    }
    
    await Meeting.findByIdAndDelete(meetingId);
    
    res.status(200).json({
      success: true,
      message: "Réunion supprimée avec succès"
    });
    
  } catch (error) {
    console.error("Erreur lors de la suppression de la réunion:", error);
    res.status(500).json({ 
      message: "Erreur lors de la suppression de la réunion", 
      error: error.message 
    });
  }
};

// Rejoindre une réunion (ajouter un participant)
exports.joinMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;
    
    // Récupérer la réunion
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: "Réunion non trouvée" });
    }
    console.log("join user id ",userId);
    // Vérifier l'accès au cours associé
    const accessCheck = await checkCourseAccess(userId, meeting.courseId);
    if (!accessCheck.access) {
      return res.status(403).json({ message: "Vous n'êtes pas inscrit à ce cours" });
    }
    
    // Vérifier si l'utilisateur est déjà dans la liste des participants
    const isAlreadyAttendee = meeting.attendees.some(
      attendee => attendee.toString() === userId.toString()
    );
    
    // Si l'utilisateur n'est pas déjà dans la liste, l'ajouter
    if (!isAlreadyAttendee) {
      meeting.attendees.push(userId);
      await meeting.save();
    }
    
    res.status(200).json({
      success: true,
      message: "Vous avez rejoint la réunion",
      roomID: meeting.roomID
    });
    
  } catch (error) {
    console.error("Erreur lors de l'accès à la réunion:", error);
    res.status(500).json({ 
      message: "Erreur lors de l'accès à la réunion", 
      error: error.message 
    });
  }
};

// Marquer une réunion comme ayant un enregistrement disponible
exports.setRecordingAvailable = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { recordingUrl } = req.body;
    const userId = req.user.id;
    
    // Récupérer la réunion
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: "Réunion non trouvée" });
    }
    
    // Vérifier que l'utilisateur est le propriétaire du cours
    const accessCheck = await checkCourseAccess(userId, meeting.courseId);
    if (!accessCheck.isOwner) {
      return res.status(403).json({ message: "Seul le propriétaire du cours peut gérer les enregistrements" });
    }
    
    // Mettre à jour la disponibilité de l'enregistrement
    meeting.recordingAvailable = true;
    meeting.recordingUrl = recordingUrl || "";
    await meeting.save();
    
    res.status(200).json({
      success: true,
      message: "Enregistrement marqué comme disponible",
      meeting
    });
    
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'enregistrement:", error);
    res.status(500).json({ 
      message: "Erreur lors de la mise à jour de l'enregistrement", 
      error: error.message 
    });
  }
};