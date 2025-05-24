const cloudinary = require('../config/cloudinaryConfig');  // Assurez-vous que la config Cloudinary est correcte
const path = require('path');

// Fonction pour uploader l'image sur Cloudinary
const uploadImage = (req) => {
  return new Promise((resolve, reject) => {
    if (req.file) {
      cloudinary.uploader.upload(req.file.path, { 
        public_id: `courses/${req.file.filename}`  // ID personnalisé pour l'image
      })
      .then(uploadResult => {
        resolve(uploadResult.secure_url);  // Retourner l'URL sécurisé de l'image téléchargée
      })
      .catch(err => {
        console.error('Erreur Cloudinary:', err);
        reject({ message: 'Erreur serveur', error: err.message });
      });
    } else {
      reject({ message: 'Aucun fichier téléchargé' });
    }
  });
};


// Fonction pour uploader l'image sur Cloudinary
const uploadImageusers = (req) => {
  return new Promise((resolve, reject) => {
    if (req.file) {
      cloudinary.uploader.upload(req.file.path, { 
        public_id: `users/${req.file.filename}`  // ID personnalisé pour l'image
      })
      .then(uploadResult => {
        resolve(uploadResult.secure_url);  // Retourner l'URL sécurisé de l'image téléchargée
      })
      .catch(err => {
        console.error('Erreur Cloudinary:', err);
        reject({ message: 'Erreur serveur', error: err.message });
      });
    } else {
      reject({ message: 'Aucun fichier téléchargé' });
    }
  });
};

const uploadFilesToCloudinary = async (files) => {
  const uploads = files.map(file =>
    cloudinary.uploader.upload(path.resolve(file.path), {
      resource_type: 'auto',
      folder: 'course/assignments',
    }).then(result => ({
      filename: file.originalname,
      path: result.secure_url,
      mimetype: file.mimetype
    }))
  );

  return Promise.all(uploads);
};



const uploadFilesToCloudinarysub = async (files) => {
  const uploads = files.map(file =>
    cloudinary.uploader.upload(path.resolve(file.path), {
      resource_type: 'auto',
      folder: 'course/subbmision',
    }).then(result => ({
      filename: file.originalname,
      path: result.secure_url,
      mimetype: file.mimetype,
      size: file.size // important pour éviter l'erreur mongoose
    }))
  );

  return Promise.all(uploads);
};

const deleteFromCloudinary = async (filePath) => {
  try {
    // Extraire le public_id depuis l'URL
    const extractPublicId = (url) => {
      const match = url.match(/upload\/(?:v\d+\/)?(.+)\.(jpg|jpeg|png|pdf|docx|webp|png|gif|mp4|mov)/);
      return match ? match[1] : null;
    };

    const publicId = extractPublicId(filePath);

    if (!publicId) {
      throw new Error("public_id introuvable dans l'URL");
    }

    // Supprimer le fichier sur Cloudinary
    await cloudinary.uploader.destroy(publicId);
    console.log(`✅ Fichier supprimé de Cloudinary : ${publicId}`);
  } catch (err) {
    console.error(`❌ Erreur lors de la suppression du fichier Cloudinary :`, err);
  }
};

module.exports = { uploadImage ,uploadImageusers,uploadFilesToCloudinary,deleteFromCloudinary,uploadFilesToCloudinarysub};  // Vérifiez que cette ligne est présente pour exporter la fonction
