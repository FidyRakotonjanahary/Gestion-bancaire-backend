const auditService = require('../services/auditService');
const logger = require('../utils/loggers');

/**
 * Middleware pour enregistrer les actions d'audit
 * @param {string} action - Type d'action (CREATE, UPDATE, DELETE, etc.)
 * @param {string} entityType - Type d'entité concernée (versement, client, etc.)
 */
const logAudit = (action, entityType) => {
  return async (req, res, next) => {
    // Stocker les données originales de la réponse
    const originalEnd = res.end;
    const originalJson = res.json;
    
    // Redéfinir la méthode json pour capturer les données de réponse
    res.json = function(data) {
      res.locals.responseData = data;
      return originalJson.call(this, data);
    };
    
    // Redéfinir la méthode end pour finaliser l'audit après l'envoi de la réponse
    res.end = async function(chunk, encoding) {
      // Rétablir la méthode originale
      res.end = originalEnd;
      
      try {
        // Si la requête a réussi (statut 2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const userId = req.user ? req.user.id : null;
          const entityId = req.params.id || null;
          
          // Déterminer l'ID du client et du versement selon le contexte
          let clientId = null;
          let versementId = null;
          
          if (entityType === 'client') {
            clientId = entityId;
          } else if (entityType === 'versement') {
            versementId = entityId;
            // Si disponible, récupérer le client_id associé au versement
            if (req.body.client_id) {
              clientId = req.body.client_id;
            } else if (res.locals.responseData && res.locals.responseData.data) {
              clientId = res.locals.responseData.data.client_id;
            }
          }
          
          // Préparer les anciennes et nouvelles valeurs selon l'action
          let oldValues = null;
          let newValues = null;
          
          if (action === 'UPDATE' && req.body) {
            oldValues = req.locals && req.locals.oldData ? JSON.stringify(req.locals.oldData) : null;
            newValues = JSON.stringify(req.body);
          } else if (action === 'CREATE' && req.body) {
            newValues = JSON.stringify(req.body);
          } else if (action === 'DELETE' && req.locals && req.locals.oldData) {
            oldValues = JSON.stringify(req.locals.oldData);
          }
          
          // Préparer les anciennes et nouvelles valeurs de solde pour les actions impliquant des soldes
          let oldBalance = null;
          let newBalance = null;
          
          if (entityType === 'client' && req.locals && req.locals.oldData && req.locals.oldData.balance !== undefined) {
            oldBalance = req.locals.oldData.balance;
            if (req.body && req.body.balance !== undefined) {
              newBalance = req.body.balance;
            } else if (res.locals.responseData && res.locals.responseData.data && res.locals.responseData.data.balance !== undefined) {
              newBalance = res.locals.responseData.data.balance;
            }
          }
          
          // Créer l'entrée d'audit
          const auditData = {
            user_id: userId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            old_values: oldValues,
            new_values: newValues,
            client_id: clientId,
            versement_id: versementId,
            old_balance: oldBalance,
            new_balance: newBalance,
            action_type: req.method === 'POST' ? 'INSERT' : 
                         req.method === 'PUT' || req.method === 'PATCH' ? 'UPDATE' : 
                         req.method === 'DELETE' ? 'DELETE' : 'OTHER'
          };
          
          await auditService.createAuditEntry(auditData);
        }
      } catch (error) {
        logger.error('Erreur lors de l\'enregistrement de l\'audit:', error);
      }
      
      // Appeler la méthode originale
      return originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
};

/**
 * Middleware pour capturer les données originales avant modification
 * @param {Function} getEntityFn - Fonction pour récupérer l'entité par son ID
 */
const captureOldData = (getEntityFn) => {
  return async (req, res, next) => {
    try {
      // Seulement pour les requêtes UPDATE et DELETE avec un ID
      if ((req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') && req.params.id) {
        const entityId = req.params.id;
        const entity = await getEntityFn(entityId);
        
        if (entity) {
          // Stocker les données originales dans req.locals
          if (!req.locals) req.locals = {};
          req.locals.oldData = entity;
        }
      }
      next();
    } catch (error) {
      logger.error('Erreur lors de la capture des données originales:', error);
      next();
    }
  };
};

module.exports = {
  logAudit,
  captureOldData
};