const socketIO = require('../config/socket');
const logger = require('../utils/loggers');
const Audit = require('../models/Audit');

class SocketService {
  constructor() {
    this.io = null;
  }

  /**
   * Initialise le service de socket
   * @param {Object} server - Serveur HTTP
   */
  initialize(server) {
    this.io = socketIO.init(server);
    
    this.io.on('connection', async (socket) => {
      logger.info(`Client connecté: ${socket.id}`);
      
      // Envoyer les dernières entrées d'audit au client lorsqu'il se connecte
      try {
        const recentAudits = await Audit.getAll(10); // Récupérer les 10 dernières entrées
        socket.emit('recent_audit_events', recentAudits);
      } catch (error) {
        logger.error('Erreur lors de l\'envoi des événements d\'audit récents:', error);
      }
      
      // Gestion des abonnements aux événements spécifiques
      socket.on('subscribe_client_audit', async (clientId) => {
        socket.join(`client_${clientId}`);
        try {
          const clientAudits = await Audit.getByClient(clientId, 10);
          socket.emit('client_audit_history', { clientId, audits: clientAudits });
        } catch (error) {
          logger.error(`Erreur lors de l'abonnement aux audits du client ${clientId}:`, error);
        }
      });
      
      socket.on('subscribe_versement_audit', (versementId) => {
        socket.join(`versement_${versementId}`);
      });
      
      socket.on('unsubscribe_client_audit', (clientId) => {
        socket.leave(`client_${clientId}`);
      });
      
      socket.on('unsubscribe_versement_audit', (versementId) => {
        socket.leave(`versement_${versementId}`);
      });
      
      socket.on('disconnect', () => {
        logger.info(`Client déconnecté: ${socket.id}`);
      });
    });
  }
  
  /**
   * Émet une notification d'audit
   * @param {Object} auditData - Données d'audit à émettre
   */
  emitAuditEvent(auditData) {
    if (!this.io) return;
    
    // Émettre l'événement global
    this.io.emit('audit_event', auditData);
    
    // Émettre des événements spécifiques selon le type d'entité concernée
    if (auditData.client_id) {
      this.io.to(`client_${auditData.client_id}`).emit('client_audit_event', auditData);
    }
    
    if (auditData.versement_id) {
      this.io.to(`versement_${auditData.versement_id}`).emit('versement_audit_event', auditData);
    }
  }
  
  /**
   * Émet une notification lorsqu'un versement est traité
   * @param {Object} versementData - Données du versement traité
   */
  emitVersementProcessed(versementData) {
    if (!this.io) return;
    
    this.io.emit('versement_processed', versementData);
    
    if (versementData.client_id) {
      this.io.to(`client_${versementData.client_id}`).emit('client_versement_processed', versementData);
    }
  }
  
  /**
   * Émet une notification générale 
   * @param {string} type - Type de notification
   * @param {string} message - Message de notification
   * @param {Object} details - Détails supplémentaires
   */
  emitNotification(type, message, details = null) {
    if (!this.io) return;
    
    this.io.emit('notification', {
      type,
      message,
      details,
      timestamp: new Date()
    });
  }
  
  updateAuditCounters() {
    if (!this.io) return;
    
    // Récupérer et émettre les compteurs mis à jour
    Audit.getCounters()
      .then(counters => {
        this.io.emit('audit_counters_updated', counters);
      })
      .catch(error => {
        logger.error('Erreur lors de la mise à jour des compteurs d\'audit:', error);
      });
  }
  /**
   * Renvoie l'instance IO
   * @returns {Object} - Instance Socket.IO
   */
  getIO() {
    return this.io;
  }
}

module.exports = new SocketService();