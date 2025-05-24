const multer = require('multer');
const path = require('path');

// Configuration de Multer pour gérer l'upload des fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Définir le dossier où les fichiers seront stockés temporairement
    cb(null, 'uploads/');  // Dossier temporaire local
  },
  filename: (req, file, cb) => {
    // Nom unique pour chaque fichier (date + extension)
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Configurer Multer avec le stockage défini
const upload = multer({ 
  storage, 
  limits: { fileSize: 5 * 1024 * 1024 } // Limite la taille des fichiers à 5 Mo
}).single('file');  // Le champ 'image' dans le formulaire HTML (modifiez si nécessaire)


////fi!e

// Filtrer les types de fichiers
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/octet-stream',
    'application/json',
    'image/svg+xml',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
    // 
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'), false);
    }
  };

  
// Configurer Multer avec le stockage défini
const uploadfile = multer({ 
    storage, 
    fileFilter,
    limits: { 
      fileSize: 5 * 1024 * 1024 // Limite la taille des fichiers à 5 Mo
    }
  }).single('file');  // Le champ 'file' dans le formulaire
  
  // Middleware de gestion des erreurs Multer
  const uploadMiddleware = (req, res, next) => {
    uploadfile(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            message: 'Fichier trop volumineux. La taille maximale autorisée est de 5 Mo.'
          });
        }
        return res.status(400).json({ 
          message: err.message || 'Erreur de téléchargement de fichier' 
        });
      } else if (err) {
        // Autres erreurs
        return res.status(500).json({ 
          message: err.message || 'Erreur lors du téléchargement' 
        });
      }
      next();
    });
  };



module.exports = upload;  // Exporter la fonction pour l'utiliser dans d'autres fichiers
module.exports = uploadMiddleware;  // Exporter la fonction pour l'utiliser dans d'autres fichiers
