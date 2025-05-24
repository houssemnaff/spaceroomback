// controllers/socketController.js
const User = require("../models/User");
const Meeting = require("../models/Meeting");
const jwt = require("jsonwebtoken");

module.exports = (io) => {
  // Stockage des utilisateurs connectés par meetingId
  const meetingRooms = {};

  // Middleware d'authentification pour Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentification requise"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      
      if (!user) {
        return next(new Error("Utilisateur non trouvé"));
      }

      socket.user = {
        id: user._id.toString(),
        name: user.name,
        imageUrl: user.imageurl || ""
      };
      
      next();
    } catch (error) {
      console.error("Erreur d'authentification socket:", error);
      next(new Error("Token invalide ou expiré"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`⚡ Socket connecté: ${socket.id}`);

    // Rejoindre une salle de réunion
    socket.on("join-meeting", async ({ meetingId, roomId }) => {
      try {
        // Vérifier si la réunion existe
        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
          socket.emit("meeting-error", { message: "Réunion non trouvée" });
          return;
        }

        // Rejoindre la salle Socket.IO
        socket.join(roomId);
        
        // Initialiser la liste des participants si nécessaire
        if (!meetingRooms[roomId]) {
          meetingRooms[roomId] = [];
        }

        // Ajouter l'utilisateur à la liste des participants
        const participant = {
          socketId: socket.id,
          userId: socket.user.id,
          name: socket.user.name,
          imageUrl: socket.user.imageUrl,
          isHost: meeting.hostId.toString() === socket.user.id,
          joinedAt: new Date()
        };
        
        meetingRooms[roomId].push(participant);

        // Informer les autres participants
        socket.to(roomId).emit("user-joined", participant);
        
        // Envoyer la liste des participants au nouvel arrivant
        socket.emit("meeting-participants", {
          participants: meetingRooms[roomId],
          hostId: meeting.hostId.toString()
        });
        
        console.log(`👤 Utilisateur ${socket.user.name} a rejoint la réunion ${roomId}`);
      } catch (error) {
        console.error("Erreur lors de la connexion à la réunion:", error);
        socket.emit("meeting-error", { message: "Erreur de connexion à la réunion" });
      }
    });

    // Quitter une salle de réunion
    socket.on("leave-meeting", ({ roomId }) => {
      if (meetingRooms[roomId]) {
        // Supprimer l'utilisateur de la liste des participants
        const index = meetingRooms[roomId].findIndex(
          participant => participant.socketId === socket.id
        );
        
        if (index !== -1) {
          const participant = meetingRooms[roomId][index];
          meetingRooms[roomId].splice(index, 1);
          
          // Informer les autres participants
          socket.to(roomId).emit("user-left", {
            userId: participant.userId,
            name: participant.name
          });
          
          console.log(`👋 Utilisateur ${participant.name} a quitté la réunion ${roomId}`);
        }
        
        // Si la salle est vide, la supprimer
        if (meetingRooms[roomId].length === 0) {
          delete meetingRooms[roomId];
          console.log(`🚪 Salle de réunion fermée: ${roomId}`);
        }
      }
      
      socket.leave(roomId);
    });

    // Gestion des messages de chat dans la réunion
    socket.on("send-message", ({ roomId, message }) => {
      const sender = meetingRooms[roomId]?.find(
        participant => participant.socketId === socket.id
      );
      
      if (sender) {
        const chatMessage = {
          id: Date.now().toString(),
          senderId: sender.userId,
          senderName: sender.name,
          senderImageUrl: sender.imageUrl,
          message,
          timestamp: new Date()
        };
        
        // Envoyer le message à tous les participants (y compris l'expéditeur)
        io.to(roomId).emit("new-message", chatMessage);
      }
    });

    // Gestion des commandes de contrôle de réunion (pour l'hôte)
    socket.on("host-command", async ({ roomId, command, targetUserId }) => {
      try {
        const participant = meetingRooms[roomId]?.find(
          p => p.socketId === socket.id
        );
        
        if (!participant || !participant.isHost) {
          socket.emit("meeting-error", { message: "Vous n'êtes pas autorisé à effectuer cette action" });
          return;
        }
        
        switch (command) {
          case "mute-all":
            io.to(roomId).emit("mute-command", { muteAll: true });
            break;
            
          case "mute-user":
            io.to(roomId).emit("mute-command", { userId: targetUserId });
            break;
            
          case "remove-user":
            const targetParticipant = meetingRooms[roomId]?.find(
              p => p.userId === targetUserId
            );
            
            if (targetParticipant) {
              // Envoyer une commande d'expulsion à l'utilisateur ciblé
              io.to(targetParticipant.socketId).emit("kick-from-meeting");
              
              // Supprimer l'utilisateur de la liste des participants
              const index = meetingRooms[roomId].indexOf(targetParticipant);
              if (index !== -1) {
                meetingRooms[roomId].splice(index, 1);
              }
              
              // Informer les autres participants
              io.to(roomId).emit("user-removed", { userId: targetUserId });
            }
            break;
            
          case "end-meeting":
            // Envoyer une commande de fin de réunion à tous les participants
            io.to(roomId).emit("meeting-ended", { 
              endedBy: participant.name 
            });
            
            // Supprimer la salle
            delete meetingRooms[roomId];
            break;
            
          default:
            socket.emit("meeting-error", { message: "Commande non reconnue" });
        }
      } catch (error) {
        console.error("Erreur lors de l'exécution de la commande:", error);
        socket.emit("meeting-error", { message: "Erreur lors de l'exécution de la commande" });
      }
    });

    // Gestion de la déconnexion
    socket.on("disconnect", () => {
      console.log(`🔌 Socket déconnecté: ${socket.id}`);
      
      // Trouver toutes les salles où l'utilisateur était présent
      Object.keys(meetingRooms).forEach(roomId => {
        const index = meetingRooms[roomId].findIndex(
          participant => participant.socketId === socket.id
        );
        
        if (index !== -1) {
          const participant = meetingRooms[roomId][index];
          meetingRooms[roomId].splice(index, 1);
          
          // Informer les autres participants
          socket.to(roomId).emit("user-left", {
            userId: participant.userId,
            name: participant.name
          });
          
          // Si la salle est vide, la supprimer
          if (meetingRooms[roomId].length === 0) {
            delete meetingRooms[roomId];
          }
        }
      });
    });
  });
};