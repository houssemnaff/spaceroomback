const Quiz = require('../models/quizmodelchapitre');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Google Generative AI with your API key
const genAI = new GoogleGenerativeAI("AIzaSyB3A0jsHZIwFSAoovrUWEjjyuxZpjOQ0Uw");

exports.generateQuiz = async (req, res) => {
  try {
    const { topic, courseId, chapterId, numQuestions = 5, difficulty = 'medium' } = req.body;
    
    if (!topic || !courseId || !chapterId) {
      return res.status(400).json({
        success: false,
        message: "Le sujet du quiz, l'ID du cours et l'ID du chapitre sont requis"
      });
    }

    // Create a prompt for the Gemini model
    const prompt = `Génère un quiz de ${numQuestions} questions à choix multiples sur le sujet "${topic}" avec une difficulté ${difficulty}. 
    
    Pour chaque question, fournis:
    1. Le texte de la question
    2. 4 options de réponse
    3. Indique clairement quelle option est correcte
    
    Réponds au format JSON suivant:
    {
      "title": "Quiz sur ${topic}",
      "description": "Une brève description du quiz",
      "questions": [
        {
          "text": "Texte de la question 1",
          "options": [
            {"text": "Option 1", "isCorrect": false},
            {"text": "Option 2", "isCorrect": true},
            {"text": "Option 3", "isCorrect": false},
            {"text": "Option 4", "isCorrect": false}
          ]
        },
        // et ainsi de suite pour les autres questions
      ]
    }`;

    // Generate content with Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    let quizData;
    try {
      // Find the JSON object in the response text
      const jsonStartIndex = text.indexOf('{');
      const jsonEndIndex = text.lastIndexOf('}') + 1;
      const jsonString = text.substring(jsonStartIndex, jsonEndIndex);
      quizData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return res.status(500).json({
        success: false,
        message: "Erreur lors de l'analyse de la réponse de l'IA",
        error: parseError.message
      });
    }
    
    // Add necessary fields to the quiz data
    quizData.courseId = courseId;
    quizData.chapterId = chapterId;
    quizData.availableFrom = new Date();
    quizData.timeLimit = 30;
    quizData.createdBy = req.user._id;
    
    // Return the generated quiz data (don't save it yet, let the user modify it if needed)
    res.status(200).json({
      success: true,
      data: quizData
    });
  } catch (error) {
    console.error("Error generating quiz with AI:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la génération du quiz avec l'IA",
      error: error.message
    });
  }
};

// Controller for performance analysis
exports.analysePerformances = async (req, res) => {
    try {
      const { studentsResults, quizTitle, courseTitle, chapterTitle } = req.body;
      
      if (!studentsResults || !Array.isArray(studentsResults)) {
        return res.status(400).json({
          success: false,
          message: "Les résultats des étudiants sont requis et doivent être un tableau"
        });
      }
      
      // Create a more detailed prompt for better analysis
      const prompt = `
      Analyse les performances des étudiants pour le quiz suivant:
      
      Titre du quiz: ${quizTitle || 'Non spécifié'}
      Cours: ${courseTitle || 'Non spécifié'}
      Chapitre: ${chapterTitle || 'Non spécifié'}
      
      Résultats des étudiants:
      ${JSON.stringify(studentsResults, null, 2)}
      
      Pour ton analyse, inclus:
      1. Un résumé des performances globales (score moyen, taux de réussite, etc.)
      2. Identification des questions ou concepts qui semblent difficiles pour les étudiants
      3. Recommandations pour améliorer la compréhension des étudiants
      4. Toute tendance notable dans les résultats
      
      Format: Fournis une analyse structurée avec des sections claires et des points d'action concrets pour l'enseignant.
      `;
      
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      res.status(200).json({
        success: true,
        analysis: response.text()
      });
    } catch (error) {
      console.error("Error analyzing performances:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de l'analyse des performances",
        error: error.message
      });
    }
  };
  