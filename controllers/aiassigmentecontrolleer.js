const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialiser l'API Google Generative AI avec votre clé
const genAI = new GoogleGenerativeAI("AIzaSyB3A0jsHZIwFSAoovrUWEjjyuxZpjOQ0Uw");

exports.generateAssignmentWithAI = async (req, res) => {
  try {
    const { courseId, subject, difficulty = 'medium', topicDetails, gradeLevel } = req.body;
    
    if (!courseId || !subject) {
      return res.status(400).json({
        success: false,
        message: "Le sujet du devoir et l'ID du cours sont requis"
      });
    }

    // Créer un prompt pour le modèle Gemini
    const prompt = `
    Génère un devoir de niveau ${gradeLevel || 'universitaire'} sur le sujet "${subject}" avec une difficulté ${difficulty}.
    
    Détails supplémentaires sur le sujet: ${topicDetails || 'Aucun détail supplémentaire fourni'}
    
    Le devoir doit inclure:
    1. Un titre pertinent
    2. Une description détaillée du devoir
    3. Des objectifs d'apprentissage clairs
    4. Les instructions pour les étudiants
    5. Une estimation du temps nécessaire pour compléter le devoir
    
    Réponds au format JSON suivant:
    {
      "title": "Titre du devoir",
      "description": "Description détaillée incluant les objectifs d'apprentissage et les instructions",
      "maxPoints": 100,
      "estimatedTime": "Estimation du temps en heures"
    }`;

    // Générer le contenu avec Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Analyser la réponse JSON
    let assignmentData;
    try {
      // Extraire l'objet JSON de la réponse
      const jsonStartIndex = text.indexOf('{');
      const jsonEndIndex = text.lastIndexOf('}') + 1;
      const jsonString = text.substring(jsonStartIndex, jsonEndIndex);
      assignmentData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Échec de l'analyse de la réponse de l'IA:", parseError);
      return res.status(500).json({
        success: false,
        message: "Erreur lors de l'analyse de la réponse de l'IA",
        error: parseError.message
      });
    }
    
    // Ajouter les champs nécessaires aux données du devoir
    assignmentData.courseId = courseId;
    assignmentData.dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Par défaut 1 semaine plus tard
    assignmentData.createdBy = req.user._id;
    
    // Retourner les données générées sans enregistrer (permettre à l'utilisateur de modifier)
    res.status(200).json({
      success: true,
      data: assignmentData
    });
  } catch (error) {
    console.error("Erreur lors de la génération du devoir avec l'IA:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la génération du devoir avec l'IA",
      error: error.message
    });
  }
};