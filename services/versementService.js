const db = require('../utils/db');
const logger = require('../utils/loggers');
const clientService = require('./clientService');
const socketService = require('./socketService');

/**
 * Récupère tous les versements
 */
const getAllVersements = async () => {
  try {
    const result = await db.query(
      `SELECT v.id, v.numero_cheque, v.amount as montant, v.created_at as date_creation,
              c.account_number as numero_compte, c.name as nom_client, v.status
       FROM versements v
       JOIN clients c ON v.client_id = c.id
       ORDER BY v.created_at DESC`
    );
    return result.rows;
  } catch (error) {
    logger.error('Erreur lors de la récupération des versements:', error);
    throw error;
  }
};

/**
 * Récupère un versement par son ID
 */
const getVersementById = async (id) => {
  try {
    const result = await db.query(
      `SELECT v.id, v.numero_cheque, v.amount as montant, v.created_at as date_creation,
              c.id as client_id, c.account_number as numero_compte, c.name as nom_client, v.status,
              v.description
       FROM versements v
       JOIN clients c ON v.client_id = c.id
       WHERE v.id = $1`,
      [id]
    );
    return result.rows[0];
  } catch (error) {
    logger.error(`Erreur lors de la récupération du versement ${id}:`, error);
    throw error;
  }
};

/**
 * Crée un nouveau versement
 */
const createVersement = async (versementData, userId) => {
  const { numero_cheque, montant, client_id, description } = versementData;
  
  try {
    const client = await clientService.getClientById(client_id);
    if (!client) {
      throw new Error('Client non trouvé');
    }
    
    // Démarrer une transaction
    await db.query('BEGIN');
    
    // Insérer le versement
    const result = await db.query(
      `INSERT INTO versements
        (numero_cheque, amount, client_id, created_by, description, status)
       VALUES ($1, $2, $3, $4, $5, 'en_attente')
       RETURNING *`,
      [numero_cheque, montant, client_id, userId, description]
    );
    
    // Valider la transaction
    await db.query('COMMIT');
    
    // Émettre un événement pour les mises à jour en temps réel
    socketService.emitAuditUpdate('insert');
    
    return result.rows[0];
  } catch (error) {
    await db.query('ROLLBACK');
    logger.error('Erreur lors de la création du versement:', error);
    throw error;
  }
};

/**
 * Met à jour un versement
 */
const updateVersement = async (id, versementData, userId) => {
  const { numero_cheque, montant, description, status } = versementData;
  
  try {
    // Récupérer d'abord le versement existant
    const existingVersement = await getVersementById(id);
    if (!existingVersement) {
      throw new Error('Versement non trouvé');
    }
    
    // Démarrer une transaction
    await db.query('BEGIN');
    
    // Mettre à jour le versement
    const result = await db.query(
      `UPDATE versements
       SET numero_cheque = $1, amount = $2, description = $3, status = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [numero_cheque, montant, description, status || existingVersement.status, id]
    );
    
    // Valider la transaction
    await db.query('COMMIT');
    
    // Émettre un événement pour les mises à jour en temps réel
    socketService.emitAuditUpdate('update');
    
    return result.rows[0];
  } catch (error) {
    await db.query('ROLLBACK');
    logger.error(`Erreur lors de la mise à jour du versement ${id}:`, error);
    throw error;
  }
};

/**
 * Supprime un versement
 */
const deleteVersement = async (id, userId) => {
  try {
    // Récupérer d'abord le versement existant
    const existingVersement = await getVersementById(id);
    if (!existingVersement) {
      throw new Error('Versement non trouvé');
    }
    
    // Démarrer une transaction
    await db.query('BEGIN');
    
    // Enregistrer l'audit avant la suppression
    await db.query(
      `INSERT INTO audit_versement
        (user_id, action, entity_type, entity_id, client_id, versement_id, 
         old_values, action_type, old_balance, new_balance)
       VALUES ($1, 'delete', 'versement', $2, $3, $2, 
              $4, 'suppression_versement', 
              (SELECT balance FROM clients WHERE id = $3),
              (SELECT balance FROM clients WHERE id = $3) - $5)`,
      [
        userId, 
        id, 
        existingVersement.client_id, 
        JSON.stringify(existingVersement),
        existingVersement.montant
      ]
    );
    
    // Supprimer le versement
    const result = await db.query(
      'DELETE FROM versements WHERE id = $1 RETURNING *',
      [id]
    );
    
    // Valider la transaction
    await db.query('COMMIT');
    
    // Émettre un événement pour les mises à jour en temps réel
    socketService.emitAuditUpdate('delete');
    
    return result.rows[0];
  } catch (error) {
    await db.query('ROLLBACK');
    logger.error(`Erreur lors de la suppression du versement ${id}:`, error);
    throw error;
  }
};

/**
 * Récupère les statistiques des versements
 */
const getVersementStats = async () => {
  try {
    const result = await db.query(`
      SELECT COUNT(*) as total_versements, SUM(amount) as montant_total
      FROM versements
    `);
    return result.rows[0];
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques de versements:', error);
    throw error;
  }
};

/**
 * Valide un versement
 */
const validateVersement = async (id, userId) => {
  try {
    // Démarrer une transaction
    await db.query('BEGIN');
    
    // Mettre à jour le statut du versement
    const result = await db.query(
      `UPDATE versements
       SET status = 'validé', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    // Enregistrer l'audit
    await db.query(
      `INSERT INTO audit_versement
        (user_id, action, entity_type, entity_id, client_id, versement_id, 
         old_values, new_values, action_type)
       VALUES ($1, 'update', 'versement', $2, $3, $2, 
              $4, $5, 'validation_versement')`,
      [
        userId, 
        id, 
        result.rows[0].client_id, 
        JSON.stringify({status: 'en_attente'}),
        JSON.stringify({status: 'validé'})
      ]
    );
    
    // Valider la transaction
    await db.query('COMMIT');
    
    // Émettre un événement pour les mises à jour en temps réel
    socketService.emitAuditUpdate('update');
    
    return result.rows[0];
  } catch (error) {
    await db.query('ROLLBACK');
    logger.error(`Erreur lors de la validation du versement ${id}:`, error);
    throw error;
  }
};

/**
 * Rejette un versement
 */
const rejectVersement = async (id, userId, reason) => {
  try {
    // Démarrer une transaction
    await db.query('BEGIN');
    
    // Mettre à jour le statut du versement
    const result = await db.query(
      `UPDATE versements
       SET status = 'rejeté', description = COALESCE(description, '') || ' | Rejeté: ' || $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, reason || 'Aucune raison fournie']
    );
    
    // Enregistrer l'audit
    await db.query(
      `INSERT INTO audit_versement
        (user_id, action, entity_type, entity_id, client_id, versement_id, 
         old_values, new_values, action_type)
       VALUES ($1, 'update', 'versement', $2, $3, $2, 
              $4, $5, 'rejet_versement')`,
      [
        userId, 
        id, 
        result.rows[0].client_id, 
        JSON.stringify({status: 'en_attente'}),
        JSON.stringify({status: 'rejeté', reason: reason || 'Aucune raison fournie'})
      ]
    );
    
    // Valider la transaction
    await db.query('COMMIT');
    
    // Émettre un événement pour les mises à jour en temps réel
    socketService.emitAuditUpdate('update');
    
    return result.rows[0];
  } catch (error) {
    await db.query('ROLLBACK');
    logger.error(`Erreur lors du rejet du versement ${id}:`, error);
    throw error;
  }
};

module.exports = {
  getAllVersements,
  getVersementById,
  createVersement,
  updateVersement,
  deleteVersement,
  getVersementStats,
  validateVersement,
  rejectVersement
};