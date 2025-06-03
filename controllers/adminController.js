const User = require('../models/user');
const Course = require('../models/course');
const Quiz = require('../models/quizmodelchapitre');
const Meeting = require('../models/meeting');
const Resource = require('../models/ressource');
const Submission = require('../models/Submission');
const Chapter = require('../models/chapter');
const Assignment = require('../models/Assignment');
const QuizAttempt = require('../models/quizattmetpchapitre');
const UserProgress = require('../models/UserProgress');
const ressource = require('../models/ressource');
const meeting = require('../models/meeting');
const Message = require('../models/message');
const { default: mongoose } = require('mongoose');
const notification = require('../models/notification');

// Dashboard Functions
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalAdmins,
      totalCourses,
      totalQuizAttempts,
      completedQuizAttempts,
      publishedCourses
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }), // Tous les utilisateurs normaux
      User.countDocuments({ role: 'admin' }),
      Course.countDocuments(),
      QuizAttempt.countDocuments(),
      QuizAttempt.countDocuments({ completed: true }),
      Course.countDocuments({ isPublished: true })
    ]);

    // Calculate metrics
    const activeUsers = await QuizAttempt.distinct('userId').countDocuments();
    const averageScoreAgg = await QuizAttempt.aggregate([
      { $match: { completed: true } },
      { $group: { _id: null, avgScore: { $avg: "$score" } } }
    ]);
    
    const averageScore = averageScoreAgg.length > 0 
      ? Math.round(averageScoreAgg[0].avgScore)
      : 0;

    const successRate = totalQuizAttempts > 0 
      ? Math.round((completedQuizAttempts / totalQuizAttempts) * 100)
      : 0;

    const courseEngagement = totalUsers > 0 && publishedCourses > 0
      ? Math.min(Math.round((totalQuizAttempts / (totalUsers * publishedCourses)) * 100, 100))
      : 0;

    // Recent activities
    const recentActivities = await QuizAttempt.find()
      .sort({ completedAt: -1 })
      .limit(5)
      .populate('userId', 'name email')
      .populate('quizId', 'title')
      .populate('courseId', 'title');

    res.json({
      stats: {
        totalUsers,
        totalAdmins,
        totalCourses,
        publishedCourses,
        activeUsers,
        totalQuizAttempts,
        completedQuizAttempts,
        averageScore,
        successRate,
        courseEngagement
      },
      recentActivities: recentActivities.map(activity => ({
        userName: activity.userId?.name || 'Deleted User',
        userEmail: activity.userId?.email || '',
        quizTitle: activity.quizId?.title || 'Deleted Quiz',
        courseTitle: activity.courseId?.title || 'Deleted Course',
        score: activity.score,
        date: activity.completedAt
      }))
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
const getStudentEngagement = async (req, res) => {
  try {
    // Get last 7 days of engagement data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    });

    const engagementData = await Promise.all(
      last7Days.map(async (date) => {
        const submissions = await Submission.countDocuments({
          createdAt: {
            $gte: new Date(date),
            $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
          }
        });
        return {
          _id: date,
          engagement: submissions
        };
      })
    );

    res.json(engagementData.reverse());
  } catch (error) {
    console.error('Error fetching student engagement:', error);
    res.status(500).json({ message: 'Error fetching student engagement data' });
  }
};

const getGradeDistribution = async (req, res) => {
  try {
    const gradeRanges = [
      { min: 0, max: 20, label: '0-20' },
      { min: 21, max: 40, label: '21-40' },
      { min: 41, max: 60, label: '41-60' },
      { min: 61, max: 80, label: '61-80' },
      { min: 81, max: 100, label: '81-100' }
    ];

    const distribution = await Promise.all(
      gradeRanges.map(async (range) => {
        const count = await Quiz.countDocuments({
          score: { $gte: range.min, $lte: range.max }
        });
        return {
          _id: range.label,
          count
        };
      })
    );

    res.json(distribution);
  } catch (error) {
    console.error('Error fetching grade distribution:', error);
    res.status(500).json({ message: 'Error fetching grade distribution' });
  }
};

const getActivityHeatmap = async (req, res) => {
  try {
    // Generate sample heatmap data (7 days x 12 hours)
    const heatmapData = Array.from({ length: 7 }, () =>
      Array.from({ length: 12 }, () => Math.floor(Math.random() * 10))
    );

    res.json(heatmapData);
  } catch (error) {
    console.error('Error fetching activity heatmap:', error);
    res.status(500).json({ message: 'Error fetching activity heatmap' });
  }
};

const getPopularCourses = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 3;
    
    const popularCourses = await Course.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'enrolledCourses',
          as: 'enrolledStudents'
        }
      },
      {
        $project: {
          title: 1,
          description: 1,
          owner: 1,
          // Compter le nombre d'étudiants sans compter le propriétaire
          students: {
            $size: {
              $filter: {
                input: "$enrolledStudents",
                as: "student",
                cond: { $ne: ["$$student._id", "$owner"] }
              }
            }
          },
          createdAt: 1
        }
      },
      { $sort: { students: -1 } },
      { $limit: limit }
    ]);

    res.json(popularCourses);
  } catch (error) {
    console.error('Error fetching popular courses:', error);
    res.status(500).json({ message: 'Error fetching popular courses' });
  }
};
const getTopStudents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    // Obtenir tous les quiz completés (QuizAttempt) avec le statut completed=true
    const topStudents = await User.aggregate([
      // Filtre pour ne récupérer que les utilisateurs étudiants
      { $match: { role: 'user' } },
      
      // Récupérer les cours auxquels l'étudiant est inscrit
      {
        $lookup: {
          from: 'courses',
          localField: 'enrolledCourses',
          foreignField: '_id',
          as: 'enrolledCourses'
        }
      },
      
      // Récupérer les tentatives de quiz de l'étudiant
      {
        $lookup: {
          from: 'quizattempts',
          localField: '_id',
          foreignField: 'userId',
          pipeline: [
            { $match: { completed: true } } // Ne récupérer que les quiz complétés
          ],
          as: 'quizAttempts'
        }
      },
      
      // Récupérer les progressions de l'utilisateur
      {
        $lookup: {
          from: 'userprogresses',
          localField: '_id',
          foreignField: 'userId',
          as: 'progressData'
        }
      },
      
      // Ajouter des champs par défaut pour les documents qui n'ont pas ces données
      {
        $addFields: {
          // Si progressData n'existe pas, créer un tableau vide
          progressData: { $ifNull: ['$progressData', []] },
          // Si quizAttempts n'existe pas, créer un tableau vide
          quizAttempts: { $ifNull: ['$quizAttempts', []] },
          // Si enrolledCourses n'existe pas, créer un tableau vide
          enrolledCourses: { $ifNull: ['$enrolledCourses', []] }
        }
      },
      
      // Calculer les métriques importantes
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          imageurl: 1,
          
          // Nombre de cours auxquels l'étudiant est inscrit
          coursesEnrolledCount: { $size: '$enrolledCourses' },
          
          // Quiz complétés
          quizCompletedCount: { $size: '$quizAttempts' },
          
          // Score moyen des quiz
          averageScore: {
            $cond: [
              { $eq: [{ $size: '$quizAttempts' }, 0] },
              0,
              { $avg: '$quizAttempts.score' }
            ]
          },
          
          // Ressources vues
          viewedResourcesCount: {
            $reduce: {
              input: '$progressData',
              initialValue: 0,
              in: { 
                $add: [
                  '$$value', 
                  { $size: { $ifNull: ['$$this.viewedResources', []] } }
                ] 
              }
            }
          },
          
          // Assignments complétés
          completedAssignmentsCount: {
            $reduce: {
              input: '$progressData',
              initialValue: 0,
              in: { 
                $add: [
                  '$$value', 
                  { $size: { $ifNull: ['$$this.completedAssignments', []] } }
                ] 
              }
            }
          },
          
          // Chapitres vus
          viewedChaptersCount: {
            $reduce: {
              input: '$progressData',
              initialValue: 0,
              in: { 
                $add: [
                  '$$value', 
                  { $size: { $ifNull: ['$$this.viewedChapters', []] } }
                ] 
              }
            }
          }
        }
      },
      
      // Calculer un score global de progression
      {
        $addFields: {
          // Score de progression global (personnalisable selon vos besoins)
          progressionScore: {
            $add: [
              // Pondération du score moyen des quiz (40%)
              { $multiply: ['$averageScore', 0.4] },
              
              // Pondération du nombre de quiz complétés (20%)
              { $multiply: [{ $min: [10, '$quizCompletedCount'] }, 2] },
              
              // Pondération des chapitres vus (20%)
              { $multiply: [{ $min: [10, '$viewedChaptersCount'] }, 2] },
              
              // Pondération des assignments complétés (20%)
              { $multiply: [{ $min: [10, '$completedAssignmentsCount'] }, 2] }
            ]
          }
        }
      },
      
      // Trier par score de progression global
      { $sort: { progressionScore: -1, averageScore: -1 } },
      
      // Limiter au nombre demandé
      { $limit: limit },
      
      // Format final de la réponse
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          imageurl: 1,
          averageScore: { $round: ['$averageScore', 2] }, // Arrondir à 2 décimales
          quizCompletedCount: 1,
          coursesEnrolledCount: 1,
          viewedResourcesCount: 1,
          completedAssignmentsCount: 1,
          viewedChaptersCount: 1,
          progressionScore: { $round: ['$progressionScore', 2] } // Arrondir à 2 décimales
        }
      }
    ]);

    res.json(topStudents);
  } catch (error) {
    console.error('Error fetching top students:', error);
    res.status(500).json({ message: 'Error fetching top students', error: error.message });
  }
};


// Course Management Functions
const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des cours' });
  }
};

const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('students', 'name email');
    
    if (!course) {
      return res.status(404).json({ message: 'Cours non trouvé' });
    }
    
    res.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du cours' });
  }
};

const createCourse = async (req, res) => {
  try {
    const { title, description, category, level, price } = req.body;
    
    course = new Course({
      title,
      description,
      category,
      level,
      price,
      owner: req.user._id,
      accessKey: generateRandomKey() // Function to generate a random access key
    });

    function generateRandomKey() {
      return Math.random().toString(36).substring(2, 10);
    }
    
    await course.save();
    
    // Add course to owner's createdCourses
    await User.findByIdAndUpdate(req.user._id, {
      $push: { createdCourses: course._id }
    });
    
    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Erreur lors de la création du cours' });
  }
};

const updateCourse = async (req, res) => {
  try {
    const { title, description, category, level, price } = req.body;
    
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Cours non trouvé' });
    }
    
    // Check if user is the owner
    if (course.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Non autorisé à modifier ce cours' });
    }
    
    course.title = title || course.title;
    course.description = description || course.description;
    course.category = category || course.category;
    course.level = level || course.level;
    course.price = price || course.price;
    
    await course.save();
    res.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du cours' });
  }
};

const deleteCourse = async (req, res) => {

  try {
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
    
      return res.status(404).json({ message: 'Cours non trouvé' });
    }
    
    // Vérifier si l'utilisateur est admin ou propriétaire du cours
    const isAdmin = req.user.role === 'admin';
    const isOwner = course.owner.toString() === req.user.id;
    if (!isAdmin && !isOwner) {
     
      return res.status(403).json({ message: 'Non autorisé à supprimer ce cours' });
    }

    // 1. Supprimer toutes les données associées au cours
    // Chapitres et ressources
   
    await ressource.deleteMany({ courseId: course._id });
    await Chapter.deleteMany({ courseId: course._id });
    
    // Quiz et tentatives
    await Quiz.deleteMany({ courseId: course._id });
    await QuizAttempt.deleteMany({ courseId: course._id });
    
    // Devoirs
    await Assignment.deleteMany({ courseId: course._id });
    
    // Réunions
    await meeting.deleteMany({ courseId: course._id });
    
    // Messages
    await Message.deleteMany({ courseId: course._id });
    
    // Notifications
    await notification.deleteMany({ courseId: course._id });
    
    // Progrès utilisateur
    await UserProgress.deleteMany({ courseId: course._id });

    // 2. Mettre à jour les utilisateurs
    // Retirer le cours des createdCourses du propriétaire
    await User.findByIdAndUpdate(
      course.owner,
      { $pull: { createdCourses: course._id } },
      
    );
    
    // Retirer le cours des enrolledCourses de tous les étudiants
    await User.updateMany(
      { enrolledCourses: course._id },
      { $pull: { enrolledCourses: course._id } },
     
    );

    // 3. Finalement supprimer le cours lui-même
    await Course.findByIdAndDelete(course._id);

    res.json({ message: 'Cours et toutes ses données associées supprimés avec succès' });
  } catch (error) {

    console.error('Error deleting course:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression du cours',
      error: error.message 
    });
  } 
};

// Meeting Management
const getAllMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find()
      .populate('hostId', 'name email')
      .populate('attendees', 'name email')
      .populate('courseId', 'title')
      .sort({ startTime: -1 });

    res.status(200).json(meetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ message: "Erreur lors de la récupération des réunions" });
  }
};

const getMeetingById = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('hostId', 'name email')
      .populate('attendees', 'name email')
      .populate('courseId', 'title');

    if (!meeting) {
      return res.status(404).json({ message: "Réunion non trouvée" });
    }

    res.status(200).json(meeting);
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ message: "Erreur lors de la récupération de la réunion" });
  }
};

const createMeeting = async (req, res) => {
  try {
    const { 
      courseId, 
      title, 
      startTime, 
      duration, 
      description, 
      location, 
      attendees 
    } = req.body;
    
    // Générer un ID de salle unique
    const roomID = `meeting-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const meeting = new Meeting({
      courseId,
      title,
      startTime,
      duration,
      description,
      hostId: req.user._id,
      hostName: req.user.name || req.user.username,
      attendees: attendees || [],
      location: location || "Salle virtuelle A",
      roomID
    });

    await meeting.save();
    res.status(201).json(meeting);
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ message: "Erreur lors de la création de la réunion" });
  }
};

const updateMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({ message: "Réunion non trouvée" });
    }

    // Vérifier que l'utilisateur est l'hôte de la réunion
    if (meeting.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Non autorisé à modifier cette réunion" });
    }

    const updatedMeeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.status(200).json(updatedMeeting);
  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(500).json({ message: "Erreur lors de la mise à jour de la réunion" });
  }
};

const deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    // Récupérer la réunion
    if (!meeting) {
      return res.status(404).json({ message: "Réunion non trouvée" });
    }
    
    
    
    await Meeting.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Réunion supprimée avec succès" });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ message: "Erreur lors de la suppression de la réunion" });
  }
};

// Resource Management
const getAllResources = async (req, res) => {
  try {
    const resources = await Resource.find()
    .sort({ _id: -1 })
    .populate({
      path: 'courseId',
      select: 'title' // uniquement le champ title du cours
    });
  

    res.status(200).json(resources);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ message: "Erreur lors de la récupération des ressources" });
  }
};

const getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('courseId', 'title')
      .populate('chapterId', 'title');

    if (!resource) {
      return res.status(404).json({ message: "Ressource non trouvée" });
    }

    res.status(200).json(resource);
  } catch (error) {
    console.error('Error fetching resource:', error);
    res.status(500).json({ message: "Erreur lors de la récupération de la ressource" });
  }
};

const createResource = async (req, res) => {
  try {
    const { courseId, chapterId, name, type, url } = req.body;
    
    const resource = new Resource({
      courseId,
      chapterId,
      name,
      type,
      url
    });

    await resource.save();
    res.status(201).json(resource);
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ message: "Erreur lors de la création de la ressource" });
  }
};

const updateResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ message: "Ressource non trouvée" });
    }

    const updatedResource = await Resource.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.status(200).json(updatedResource);
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({ message: "Erreur lors de la mise à jour de la ressource" });
  }
};

const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ message: "Ressource non trouvée" });
    }

    await Resource.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Ressource supprimée avec succès" });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ message: "Erreur lors de la suppression de la ressource" });
  }
};

// NEW FUNCTIONS

// Get comprehensive stats for a specific course
const getCourseStats = async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Cours non trouvé' });
    }
    
    // Get all stats related to this course
    const [
      enrolledStudents,
      chapters,
      resources,
      quizzes,
      meetings,
      assignments,
      quizAttempts,
      submissions
    ] = await Promise.all([
      User.find({ enrolledCourses: courseId }).select('name email').lean(),
      Chapter.find({ _id: { $in: course.chapters } }).lean(),
      Resource.find({ courseId }).lean(),
      Quiz.find({ courseId }).lean(),
      Meeting.find({ courseId }).lean(),
      Assignment.find({ courseId }).lean(),
      QuizAttempt.find({ courseId }).lean(),
      Submission.find({ assignmentId: { $in: assignments.map(a => a._id) } }).lean()
    ]);
    
    // Calculate various metrics
    const totalStudents = enrolledStudents.length;
    const totalChapters = chapters.length;
    const totalResources = resources.length;
    const totalQuizzes = quizzes.length;
    const totalMeetings = meetings.length;
    const totalAssignments = assignments.length;
    
    // Calculate average quiz score
    const averageQuizScore = quizAttempts.length > 0 
      ? quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / quizAttempts.length 
      : 0;
    
    // Calculate completion rate
    const completionRate = totalStudents > 0 
      ? quizAttempts.filter(attempt => attempt.completed).length / (totalStudents * totalQuizzes) * 100 
      : 0;
    
    // Calculate submission rate
    const submissionRate = totalStudents > 0 && totalAssignments > 0
      ? submissions.length / (totalStudents * totalAssignments) * 100
      : 0;
      
    // Calculate activity distribution
    const activityDistribution = {
      resourcesViewed: 0,
      quizzesAttempted: quizAttempts.length,
      assignmentsSubmitted: submissions.length,
      meetingsAttended: 0 // Would need additional tracking in your model
    };
    
    // Get top-performing students in this course
    const topStudents = await User.aggregate([
      { $match: { enrolledCourses: mongoose.Types.ObjectId(courseId) } },
      {
        $lookup: {
          from: 'quizattempts',
          let: { userId: '$_id' },
          pipeline: [
            { 
              $match: { 
                $expr: { 
                  $and: [
                    { $eq: ['$userId', '$$userId'] },
                    { $eq: ['$courseId', mongoose.Types.ObjectId(courseId)] }
                  ]
                }
              }
            }
          ],
          as: 'quizAttempts'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          averageScore: { $avg: '$quizAttempts.score' },
          attemptsCount: { $size: '$quizAttempts' }
        }
      },
      { $sort: { averageScore: -1 } },
      { $limit: 5 }
    ]);
    
    res.json({
      courseInfo: {
        _id: course._id,
        title: course.title,
        description: course.description,
        imageurl: course.imageurl,
        accessKey: course.accessKey,
        createdAt: course.createdAt
      },
      metrics: {
        totalStudents,
        totalChapters,
        totalResources,
        totalQuizzes,
        totalMeetings,
        totalAssignments,
        averageQuizScore,
        completionRate,
        submissionRate
      },
      activityDistribution,
      topStudents,
      recentActivity: {
        quizAttempts: quizAttempts.slice(0, 5),
        submissions: submissions.slice(0, 5),
        meetings: meetings.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Error fetching course stats:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques du cours' });
  }
};

// Get comprehensive stats for a specific user
const getUserStats = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Get all enrolled courses
    const enrolledCourses = await Course.find({ _id: { $in: user.enrolledCourses } })
      .select('title description imageurl')
      .lean();
    
    // Get all created courses if the user is an instructor/admin
    const createdCourses = await Course.find({ _id: { $in: user.createdCourses } })
      .select('title description imageurl students')
      .lean();
    
    // Get quiz attempts by this user
    const quizAttempts = await QuizAttempt.find({ userId })
      .populate('quizId', 'title')
      .populate('courseId', 'title')
      .lean();
    
    // Get submissions by this user
    const submissions = await Submission.find({ studentId: userId })
      .populate('assignmentId', 'title dueDate maxPoints')
      .lean();
    
    // Get user progress data
    const userProgress = await UserProgress.find({ userId })
      .populate('courseId', 'title')
      .lean();
    
    // Calculate metrics
    const coursesEnrolled = enrolledCourses.length;
    const coursesCreated = createdCourses.length;
    const quizzesCompleted = quizAttempts.filter(attempt => attempt.completed).length;
    const quizzesTotal = quizAttempts.length;
    
    // Calculate average score across all quizzes
    const averageQuizScore = quizzesTotal > 0
      ? quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / quizzesTotal
      : 0;
    
    // Calculate submissions metrics
    const submissionsOnTime = submissions.filter(sub => sub.status !== 'late').length;
    const submissionsLate = submissions.filter(sub => sub.status === 'late').length;
    const submissionsTotal = submissions.length;
    
    // Calculate average grade on submissions
    const averageGrade = submissionsTotal > 0
      ? submissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) / submissionsTotal
      : 0;
    
    // Calculate course progress
    const courseProgress = userProgress.map(progress => {
      return {
        courseId: progress.courseId._id,
        courseTitle: progress.courseId.title,
        resourcesViewed: progress.viewedResources ? progress.viewedResources.length : 0,
        chaptersViewed: progress.viewedChapters ? progress.viewedChapters.length : 0,
        assignmentsCompleted: progress.completedAssignments ? progress.completedAssignments.length : 0
      };
    });
    
    // Get meetings the user is attending
    const meetings = await Meeting.find({ attendees: userId })
      .populate('courseId', 'title')
      .select('title startTime duration description recordingAvailable')
      .lean();
    
    res.json({
      userInfo: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        imageurl: user.imageurl,
        createdAt: user.createdAt
      },
      metrics: {
        coursesEnrolled,
        coursesCreated,
        quizzesCompleted,
        quizzesTotal,
        averageQuizScore,
        submissionsOnTime,
        submissionsLate,
        submissionsTotal,
        averageGrade
      },
      courseProgress,
      enrolledCourses,
      createdCourses,
      recentActivity: {
        quizAttempts: quizAttempts.slice(0, 5),
        submissions: submissions.slice(0, 5),
        meetings: meetings.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques utilisateur' });
  }
};

// Get all users with basic stats
const getAllUsersWithStats = async (req, res) => {
  try {
    const users = await User.aggregate([
      // Cours créés
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: 'owner',
          as: 'createdCourses'
        }
      },
      // Cours inscrits
      {
        $lookup: {
          from: 'courses',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$$userId', '$students'] }
              }
            }
          ],
          as: 'enrolledCourses'
        }
      },
      // Quiz Attempts
      {
        $lookup: {
          from: 'quizattempts',
          localField: '_id',
          foreignField: 'userId',
          as: 'quizAttempts'
        }
      },
      // Submissions
      {
        $lookup: {
          from: 'submissions',
          localField: '_id',
          foreignField: 'studentId',
          as: 'submissions'
        }
      },
      // Format final
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          imageurl: 1,
          createdAt: 1,
          enrolledCourses: { $size: '$enrolledCourses' },
          createdCourses: { $size: '$createdCourses' },
          quizAttempts: { $size: '$quizAttempts' },
          submissions: { $size: '$submissions' },
          averageScore: {
            $cond: [
              { $gt: [{ $size: '$quizAttempts' }, 0] },
              { $avg: '$quizAttempts.score' },
              0
            ]
          },
          lastActive: {
            $max: [
              { $max: '$quizAttempts.completedAt' },
              { $max: '$submissions.submittedAt' },
              '$createdAt'
            ]
          }
        }
      },
      { $sort: { lastActive: -1 } }
    ]);

    res.json(users);
  } catch (error) {
    console.error('Error fetching all users with stats:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques de tous les utilisateurs' });
  }
};




const getAllCoursesWithStats = async (req, res) => {
  try {
    const courses = await Course.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'ownerInfo'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'students',
          foreignField: '_id',
          as: 'enrolledStudents'
        }
      },
      {
        $lookup: {
          from: 'chapters',
          localField: 'chapters',
          foreignField: '_id',
          as: 'courseChapters'
        }
      },
      {
        $lookup: {
          from: 'quizzes',
          localField: '_id',
          foreignField: 'courseId',
          as: 'courseQuizzes'
        }
      },
      {
        $lookup: {
          from: 'assignments',
          localField: '_id',
          foreignField: 'courseId',
          as: 'courseAssignments'
        }
      },
      {
        $lookup: {
          from: 'meetings',
          localField: '_id',
          foreignField: 'courseId',
          as: 'courseMeetings'
        }
      },
      {
        $lookup: {
          from: 'quizattempts',
          localField: '_id',
          foreignField: 'courseId',
          as: 'quizAttempts'
        }
      },
      {
        $project: {
          title: 1,
          description: 1,
          category: 1,
          level: 1,
          price: 1,
          imageurl: 1,
          accessKey: 1,
          createdAt: 1,
          owner: { $arrayElemAt: ['$ownerInfo', 0] },
          studentCount: { $size: '$enrolledStudents' },
          chapterCount: { $size: '$courseChapters' },
          quizCount: { $size: '$courseQuizzes' },
          assignmentCount: { $size: '$courseAssignments' },
          meetingCount: { $size: '$courseMeetings' },
          activityCount: { $size: '$quizAttempts' },
          averageScore: {
            $cond: [
              { $gt: [{ $size: '$quizAttempts' }, 0] },
              { $avg: '$quizAttempts.score' },
              0
            ]
          },
          lastActivity: {
            $max: [
              { $max: '$quizAttempts.completedAt' },
              { $max: '$courseMeetings.startTime' },
              '$createdAt'
            ]
          }
        }
      },
      { $sort: { lastActivity: -1 } }
    ]);

    // Formater les résultats pour inclure seulement le nom du propriétaire si nécessaire
    const formattedCourses = courses.map(course => ({
      ...course,
      owner: course.owner ? course.owner.name || course.owner.username || course.owner.email : null
    }));

    res.json(formattedCourses);
  } catch (error) {
    console.error('Error fetching all courses with stats:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques de tous les cours' });
  }
};

// Student Enrollment Functions
const enrollInCourse = async (req, res) => {
  try {
    const { courseId, accessKey } = req.body;
    const userId = req.user._id;

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Cours non trouvé' });
    }

    // Verify access key if provided
    if (course.accessKey && course.accessKey !== accessKey) {
      return res.status(403).json({ message: 'Clé d\'accès invalide' });
    }

    // Check if student is already enrolled
    const user = await User.findById(userId);
    if (user.enrolledCourses.includes(courseId)) {
      return res.status(400).json({ message: 'Déjà inscrit à ce cours' });
    }

    // Add student to course and course to student
    await Promise.all([
      Course.findByIdAndUpdate(courseId, {
        $push: { students: userId }
      }),
      User.findByIdAndUpdate(userId, {
        $push: { enrolledCourses: courseId }
      })
    ]);

    // Initialize progress tracking for the student in this course
    const userProgress = new UserProgress({
      userId,
      courseId,
      viewedChapters: [],
      viewedResources: [],
      completedAssignments: [],
      completedQuizzes: [],
      overallProgress: 0
    });
    await userProgress.save();

    res.status(200).json({ message: 'Inscription au cours réussie' });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ message: 'Erreur lors de l\'inscription au cours' });
  }
};

const unenrollFromCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user._id;

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Cours non trouvé' });
    }

    // Remove student from course and course from student
    await Promise.all([
      Course.findByIdAndUpdate(courseId, {
        $pull: { students: userId }
      }),
      User.findByIdAndUpdate(userId, {
        $pull: { enrolledCourses: courseId }
      })
    ]);

    // Remove progress tracking for this course
    await UserProgress.findOneAndDelete({ userId, courseId });

    res.status(200).json({ message: 'Désinscription du cours réussie' });
  } catch (error) {
    console.error('Error unenrolling from course:', error);
    res.status(500).json({ message: 'Erreur lors de la désinscription du cours' });
  }
};

// Progress Tracking Functions
const updateUserProgress = async (req, res) => {
  try {
    const { courseId, chapterId, resourceId, assignmentId, quizId, action } = req.body;
    const userId = req.user._id;

    // Find existing progress or create new
    let progress = await UserProgress.findOne({ userId, courseId });
    
    if (!progress) {
      progress = new UserProgress({
        userId,
        courseId,
        viewedChapters: [],
        viewedResources: [],
        completedAssignments: [],
        completedQuizzes: [],
        overallProgress: 0
      });
    }

    // Update based on action
    switch (action) {
      case 'viewChapter':
        if (chapterId && !progress.viewedChapters.includes(chapterId)) {
          progress.viewedChapters.push(chapterId);
        }
        break;
      case 'viewResource':
        if (resourceId && !progress.viewedResources.includes(resourceId)) {
          progress.viewedResources.push(resourceId);
        }
        break;
      case 'completeAssignment':
        if (assignmentId && !progress.completedAssignments.includes(assignmentId)) {
          progress.completedAssignments.push(assignmentId);
        }
        break;
      case 'completeQuiz':
        if (quizId && !progress.completedQuizzes.includes(quizId)) {
          progress.completedQuizzes.push(quizId);
        }
        break;
      default:
        return res.status(400).json({ message: 'Action non reconnue' });
    }

    // Calculate overall progress
    // Get total counts of chapters, resources, assignments, quizzes
    const [
      { chapterCount = 0 } = {},
      { resourceCount = 0 } = {},
      { assignmentCount = 0 } = {},
      { quizCount = 0 } = {}
    ] = await Promise.all([
      Chapter.countDocuments({ courseId }),
      Resource.countDocuments({ courseId }),
      Assignment.countDocuments({ courseId }),
      Quiz.countDocuments({ courseId })
    ]);

    const totalItems = chapterCount + resourceCount + assignmentCount + quizCount;
    const completedItems = progress.viewedChapters.length + 
                          progress.viewedResources.length + 
                          progress.completedAssignments.length + 
                          progress.completedQuizzes.length;

    progress.overallProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    await progress.save();

    res.status(200).json(progress);
  } catch (error) {
    console.error('Error updating user progress:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la progression' });
  }
};

const getUserProgressForCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    // Find progress
    const progress = await UserProgress.findOne({ userId, courseId })
      .populate('viewedChapters', 'title')
      .populate('viewedResources', 'name type')
      .populate('completedAssignments', 'title dueDate')
      .populate('completedQuizzes', 'title');

    if (!progress) {
      return res.status(404).json({ message: 'Aucune progression trouvée pour ce cours' });
    }

    // Get total counts to calculate percentages
    const [
      { chapterCount = 0 } = {},
      { resourceCount = 0 } = {},
      { assignmentCount = 0 } = {},
      { quizCount = 0 } = {}
    ] = await Promise.all([
      Chapter.countDocuments({ courseId }),
      Resource.countDocuments({ courseId }),
      Assignment.countDocuments({ courseId }),
      Quiz.countDocuments({ courseId })
    ]);

    // Calculate percentages
    const chapterProgress = chapterCount > 0 ? (progress.viewedChapters.length / chapterCount) * 100 : 0;
    const resourceProgress = resourceCount > 0 ? (progress.viewedResources.length / resourceCount) * 100 : 0;
    const assignmentProgress = assignmentCount > 0 ? (progress.completedAssignments.length / assignmentCount) * 100 : 0;
    const quizProgress = quizCount > 0 ? (progress.completedQuizzes.length / quizCount) * 100 : 0;

    res.status(200).json({
      overallProgress: progress.overallProgress,
      chapterProgress,
      resourceProgress,
      assignmentProgress,
      quizProgress,
      detailedProgress: {
        viewedChapters: progress.viewedChapters,
        viewedResources: progress.viewedResources,
        completedAssignments: progress.completedAssignments,
        completedQuizzes: progress.completedQuizzes
      },
      totalCounts: {
        chapterCount,
        resourceCount,
        assignmentCount,
        quizCount
      }
    });
  } catch (error) {
    console.error('Error getting user progress:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de la progression' });
  }
};

// Analytics Functions
const getSystemOverview = async (req, res) => {
  try {
    const [
      userCount,
      courseCount,
      quizCount,
      assignmentCount,
      resourceCount,
      meetingCount,
      quizAttemptCount,
      submissionCount
    ] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Quiz.countDocuments(),
      Assignment.countDocuments(),
      Resource.countDocuments(),
      Meeting.countDocuments(),
      QuizAttempt.countDocuments(),
      Submission.countDocuments()
    ]);

    // Get user role distribution
    const userRoles = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Get course category distribution
    const courseCategories = await Course.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Get daily activity trends for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const quizActivityTrend = await QuizAttempt.aggregate([
      { $match: { completedAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const submissionActivityTrend = await Submission.aggregate([
      { $match: { submittedAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      counts: {
        users: userCount,
        courses: courseCount,
        quizzes: quizCount,
        assignments: assignmentCount,
        resources: resourceCount,
        meetings: meetingCount,
        quizAttempts: quizAttemptCount,
        submissions: submissionCount
      },
      distributions: {
        userRoles,
        courseCategories
      },
      trends: {
        quizActivity: quizActivityTrend,
        submissionActivity: submissionActivityTrend
      }
    });
  } catch (error) {
    console.error('Error getting system overview:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'aperçu du système' });
  }
};

// Get category distribution statistics
const getCategoryDistribution = async (req, res) => {
  try {
    const categoryStats = await Course.aggregate([
      {
        $group: {
          _id: '$category',
          value: { $sum: 1 }
        }
      },
      {
        $project: {
          name: '$_id',
          value: 1,
          _id: 0
        }
      },
      {
        $sort: { value: -1 }
      }
    ]);

    res.json(categoryStats);
  } catch (error) {
    console.error('Error fetching category distribution:', error);
    res.status(500).json({ message: 'Error fetching category statistics' });
  }
};

// Get student skills radar data
const getStudentSkills = async (req, res) => {
  try {
    const studentId = req.params.id;
    
    // Get student's quiz attempts
    const quizAttempts = await QuizAttempt.find({ userId: studentId })
      .populate('quizId')
      .populate('courseId');

    // Get student's submissions
    const submissions = await Submission.find({ studentId })
      .populate('assignmentId')
      .populate('courseId');

    // Get student's progress
    const progress = await UserProgress.find({ userId: studentId })
      .populate('courseId');

    // Calculate skills based on different metrics
    const skills = [
      {
        subject: 'Théorie',
        A: calculateTheoryScore(quizAttempts),
        B: 150,
        fullMark: 150
      },
      {
        subject: 'Pratique',
        A: calculatePracticalScore(submissions),
        B: 150,
        fullMark: 150
      },
      {
        subject: 'Projet',
        A: calculateProjectScore(submissions),
        B: 150,
        fullMark: 150
      },
      {
        subject: 'Quiz',
        A: calculateQuizScore(quizAttempts),
        B: 150,
        fullMark: 150
      },
      {
        subject: 'Participation',
        A: calculateParticipationScore(progress),
        B: 150,
        fullMark: 150
      },
      {
        subject: 'Documentation',
        A: calculateDocumentationScore(progress),
        B: 150,
        fullMark: 150
      }
    ];

    res.json(skills);
  } catch (error) {
    console.error('Error fetching student skills:', error);
    res.status(500).json({ message: 'Error fetching student skills' });
  }
};

// Get course completion rates
const getCourseCompletionRates = async (req, res) => {
  try {
    const completionRates = await Course.aggregate([
      {
        $lookup: {
          from: 'userprogress',
          localField: '_id',
          foreignField: 'courseId',
          as: 'progress'
        }
      },
      {
        $project: {
          name: '$title',
          completionRate: {
            $cond: [
              { $gt: [{ $size: '$progress' }, 0] },
              {
                $multiply: [
                  {
                    $avg: {
                      $map: {
                        input: '$progress',
                        as: 'p',
                        in: '$$p.overallProgress'
                      }
                    }
                  },
                  100
                ]
              },
              0
            ]
          }
        }
      },
      {
        $sort: { completionRate: -1 }
      }
    ]);

    res.json(completionRates);
  } catch (error) {
    console.error('Error fetching course completion rates:', error);
    res.status(500).json({ message: 'Error fetching course completion rates' });
  }
};

// Helper functions for skill calculations
const calculateTheoryScore = (quizAttempts) => {
  if (!quizAttempts.length) return 0;
  const theoryQuizzes = quizAttempts.filter(q => q.quizId.type === 'theory');
  return theoryQuizzes.length ? 
    Math.min(150, Math.round(theoryQuizzes.reduce((sum, q) => sum + q.score, 0) / theoryQuizzes.length * 1.5)) : 0;
};

const calculatePracticalScore = (submissions) => {
  if (!submissions.length) return 0;
  const practicalSubmissions = submissions.filter(s => s.assignmentId.type === 'practical');
  return practicalSubmissions.length ?
    Math.min(150, Math.round(practicalSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / practicalSubmissions.length * 1.5)) : 0;
};

const calculateProjectScore = (submissions) => {
  if (!submissions.length) return 0;
  const projectSubmissions = submissions.filter(s => s.assignmentId.type === 'project');
  return projectSubmissions.length ?
    Math.min(150, Math.round(projectSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / projectSubmissions.length * 1.5)) : 0;
};

const calculateQuizScore = (quizAttempts) => {
  if (!quizAttempts.length) return 0;
  return Math.min(150, Math.round(quizAttempts.reduce((sum, q) => sum + q.score, 0) / quizAttempts.length * 1.5));
};

const calculateParticipationScore = (progress) => {
  if (!progress.length) return 0;
  const participationRate = progress.reduce((sum, p) => 
    sum + (p.viewedResources?.length || 0) / (p.courseId.resources?.length || 1), 0) / progress.length;
  return Math.min(150, Math.round(participationRate * 150));
};

const calculateDocumentationScore = (progress) => {
  if (!progress.length) return 0;
  const documentationRate = progress.reduce((sum, p) => 
    sum + (p.viewedResources?.filter(r => r.type === 'documentation')?.length || 0) / 
    (p.courseId.resources?.filter(r => r.type === 'documentation')?.length || 1), 0) / progress.length;
  return Math.min(150, Math.round(documentationRate * 150));
};

// Chapter Management Functions
const getAllChapters = async (req, res) => {
  try {
    const chapters = await Chapter.find()
      .populate('courseId', 'title')
      .sort({ createdAt: -1 });
    res.json(chapters);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des chapitres' });
  }
};

const getChapterById = async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id)
      .populate('courseId', 'title');
    
    if (!chapter) {
      return res.status(404).json({ message: 'Chapitre non trouvé' });
    }
    
    res.json(chapter);
  } catch (error) {
    console.error('Error fetching chapter:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du chapitre' });
  }
};

const createChapter = async (req, res) => {
  try {
    const { title, description, courseId, order } = req.body;
    
    const chapter = new Chapter({
      title,
      description,
      courseId,
      order
    });
    
    await chapter.save();
    
    // Add chapter to course's chapters array
    await Course.findByIdAndUpdate(courseId, {
      $push: { chapters: chapter._id }
    });
    
    res.status(201).json(chapter);
  } catch (error) {
    console.error('Error creating chapter:', error);
    res.status(500).json({ message: 'Erreur lors de la création du chapitre' });
  }
};

const updateChapter = async (req, res) => {
  try {
    const { title, description, order } = req.body;
    
    const chapter = await Chapter.findById(req.params.id);
    
    if (!chapter) {
      return res.status(404).json({ message: 'Chapitre non trouvé' });
    }
    
    chapter.title = title || chapter.title;
    chapter.description = description || chapter.description;
    chapter.order = order || chapter.order;
    
    await chapter.save();
    res.json(chapter);
  } catch (error) {
    console.error('Error updating chapter:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du chapitre' });
  }
};

const deleteChapter = async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id);
    
    if (!chapter) {
      return res.status(404).json({ message: 'Chapitre non trouvé' });
    }
    
    // Remove chapter from course's chapters array
    await Course.findByIdAndUpdate(chapter.courseId, {
      $pull: { chapters: chapter._id }
    });
    
    await Chapter.findByIdAndDelete(req.params.id);
    res.json({ message: 'Chapitre supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du chapitre' });
  }
};

// Quiz Management Functions
const getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find()
      .populate('courseId', 'title')
      .populate('chapterId', 'title')
      .sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des quiz' });
  }
};

const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('courseId', 'title')
      .populate('chapterId', 'title');
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz non trouvé' });
    }
    
    res.json(quiz);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du quiz' });
  }
};

const createQuiz = async (req, res) => {
  try {
    const { title, description, courseId, chapterId, questions, timeLimit } = req.body;
    
    const quiz = new Quiz({
      title,
      description,
      courseId,
      chapterId,
      questions,
      timeLimit
    });
    
    await quiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ message: 'Erreur lors de la création du quiz' });
  }
};

const updateQuiz = async (req, res) => {
  try {
    const { title, description, questions, timeLimit } = req.body;
    
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz non trouvé' });
    }
    
    quiz.title = title || quiz.title;
    quiz.description = description || quiz.description;
    quiz.questions = questions || quiz.questions;
    quiz.timeLimit = timeLimit || quiz.timeLimit;
    
    await quiz.save();
    res.json(quiz);
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du quiz' });
  }
};

const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz non trouvé' });
    }
    
    await Quiz.findByIdAndDelete(req.params.id);
    res.json({ message: 'Quiz supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du quiz' });
  }
};

// Assignment Management Functions
const getAllAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find()
      .populate('courseId', 'title')
      .populate('chapterId', 'title')
      .sort({ createdAt: -1 });
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des devoirs' });
  }
};

const getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('courseId', 'title')
      .populate('chapterId', 'title');
    
    if (!assignment) {
      return res.status(404).json({ message: 'Devoir non trouvé' });
    }
    
    res.json(assignment);
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du devoir' });
  }
};

const createAssignment = async (req, res) => {
  try {
    const { title, description, courseId, chapterId, dueDate, maxPoints } = req.body;
    
    const assignment = new Assignment({
      title,
      description,
      courseId,
      chapterId,
      dueDate,
      maxPoints
    });
    
    await assignment.save();
    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ message: 'Erreur lors de la création du devoir' });
  }
};

const updateAssignment = async (req, res) => {
  try {
    const { title, description, dueDate, maxPoints } = req.body;
    
    const assignment = await Assignment.findById(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({ message: 'Devoir non trouvé' });
    }
    
    assignment.title = title || assignment.title;
    assignment.description = description || assignment.description;
    assignment.dueDate = dueDate || assignment.dueDate;
    assignment.maxPoints = maxPoints || assignment.maxPoints;
    
    await assignment.save();
    res.json(assignment);
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du devoir' });
  }
};

const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({ message: 'Devoir non trouvé' });
    }
    
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Devoir supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du devoir' });
  }
};

// Get total counts for all models
const getTotalCounts = async (req, res) => {
  try {
    const [
      totalUsers,
      totalCourses,
      totalChapters,
      totalQuizzes,
      totalAssignments,
      totalResources,
      totalMeetings,
      totalSubmissions,
      totalQuizAttempts
    ] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Chapter.countDocuments(),
      Quiz.countDocuments(),
      Assignment.countDocuments(),
      Resource.countDocuments(),
      Meeting.countDocuments(),
      Submission.countDocuments(),
      QuizAttempt.countDocuments()
    ]);

    res.json({
      users: totalUsers,
      courses: totalCourses,
      chapters: totalChapters,
      quizzes: totalQuizzes,
      assignments: totalAssignments,
      resources: totalResources,
      meetings: totalMeetings,
      submissions: totalSubmissions,
      quizAttempts: totalQuizAttempts
    });
  } catch (error) {
    console.error('Error fetching total counts:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des totaux' });
  }
};
const createCourseWithOwner = async (req, res) => {
  try {
    const { title, description, matiere, imageurl, ownerId } = req.body;
    
    // Vérifier si l'utilisateur existe
    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Créer le cours
    const course = new Course({
      title,
      description,
      matiere,
      imageurl,
      owner: ownerId,
      accessKey: Math.random().toString(36).substring(2, 10)
    });
    
    await course.save();
    
    // Ajouter le cours aux cours créés de l'utilisateur
    await User.findByIdAndUpdate(ownerId, {
      $push: { createdCourses: course._id }
    });
    
    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course with owner:', error);
    res.status(500).json({ message: 'Erreur lors de la création du cours' });
  }
};


module.exports = {
  // Dashboard Functions
  getDashboardStats,
  getStudentEngagement,
  getGradeDistribution,
  getActivityHeatmap,
  getPopularCourses,
  getTopStudents,
  
  // Course Management Functions
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  createCourseWithOwner,
  
  // Meeting Management 
  getAllMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  
  // Resource Management
  getAllResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  
  // New Functions
  getCourseStats,
  getUserStats,
  getAllUsersWithStats,
  getAllCoursesWithStats,
  
  // Student Enrollment Functions
  enrollInCourse,
  unenrollFromCourse,
  
  // Progress Tracking Functions
  updateUserProgress,
  getUserProgressForCourse,
  
  // Analytics Functions
  getSystemOverview,
  getCategoryDistribution,
  getStudentSkills,
  getCourseCompletionRates,
  
  // Chapter Management
  getAllChapters,
  getChapterById,
  createChapter,
  updateChapter,
  deleteChapter,
  
  // Quiz Management
  getAllQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  
  // Assignment Management
  getAllAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  
  // Total Counts
  getTotalCounts
};