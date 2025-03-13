const db = require('../utils/db');
const logger = require('../utils/loggers');

/**
 * Récupère tous les clients
 */
const getAllClients = async () => {
  try {
    const result = await db.query(
      'SELECT id, account_number, name, balance, created_at, updated_at FROM clients ORDER BY name'
    );
    return result.rows;
  } catch (error) {
    logger.error('Erreur lors de la récupération des clients:', error);
    throw error;
  }
};

/**
 * Récupère un client par son ID
 */
const getClientById = async (id) => {
  try {
    const result = await db.query(
      'SELECT id, account_number, name, balance, created_at, updated_at FROM clients WHERE id = $1',
      [id]
    );
    return result.rows[0];
  } catch (error) {
    logger.error(`Erreur lors de la récupération du client ${id}:`, error);
    throw error;
  }
};

/**
 * Récupère un client par son numéro de compte
 */
const getClientByAccountNumber = async (accountNumber) => {
  try {
    const result = await db.query(
      'SELECT id, account_number, name, balance, created_at, updated_at FROM clients WHERE account_number = $1',
      [accountNumber]
    );
    return result.rows[0];
  } catch (error) {
    logger.error(`Erreur lors de la récupération du client avec le numéro de compte ${accountNumber}:`, error);
    throw error;
  }
};

/**
 * Crée un nouveau client
 */
const createClient = async (clientData) => {
  const { account_number, name, balance = 0 } = clientData;
  
  try {
    const result = await db.query(
      'INSERT INTO clients (account_number, name, balance) VALUES ($1, $2, $3) RETURNING id, account_number, name, balance, created_at',
      [account_number, name, balance]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Erreur lors de la création du client:', error);
    throw error;
  }
};

/**
 * Met à jour un client
 */
const updateClient = async (id, clientData) => {
  const { name, account_number } = clientData;
  
  try {
    const result = await db.query(
      'UPDATE clients SET name = $1, account_number = $2 WHERE id = $3 RETURNING id, account_number, name, balance, updated_at',
      [name, account_number, id]
    );
    return result.rows[0];
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour du client ${id}:`, error);
    throw error;
  }
};

/**
 * Met à jour le solde d'un client
 */
const updateClientBalance = async (id, newBalance, userId, action, transactionId = null) => {
  // Utilisation d'une transaction pour assurer la cohérence
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Récupérer le solde actuel pour enregistrer l'audit
    const currentBalanceResult = await client.query(
      'SELECT balance FROM clients WHERE id = $1',
      [id]
    );
    
    const oldBalance = currentBalanceResult.rows[0].balance;
    
    // Mise à jour du solde
    const updateResult = await client.query(
      'UPDATE clients SET balance = $1 WHERE id = $2 RETURNING id, account_number, name, balance, updated_at',
      [newBalance, id]
    );
    
    // Enregistrement de l'audit
    await client.query(
      `INSERT INTO audit_versement (
        user_id, action, entity_type, entity_id, 
        old_values, new_values, client_id, 
        versement_id, old_balance, new_balance, action_type
      )
      VALUES (
        $1, $2, 'client', $3, 
        jsonb_build_object('balance', $4), 
        jsonb_build_object('balance', $5), 
        $3, $6, $4, $5, $7
      )`,
      [
        userId, 
        action, 
        id, 
        oldBalance, 
        newBalance, 
        transactionId, 
        action
      ]
    );
    
    await client.query('COMMIT');
    return updateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Erreur lors de la mise à jour du solde du client ${id}:`, error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Supprime un client
 */
const deleteClient = async (id) => {
  try {
    // Vérifier d'abord si le client a des versements
    const versements = await db.query(
      'SELECT COUNT(*) FROM versements WHERE client_id = $1',
      [id]
    );
    
    if (parseInt(versements.rows[0].count) > 0) {
      throw new Error('Impossible de supprimer un client avec des versements existants');
    }
    
    const result = await db.query(
      'DELETE FROM clients WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  } catch (error) {
    logger.error(`Erreur lors de la suppression du client ${id}:`, error);
    throw error;
  }
};

/**
 * Récupère le solde d'un client
 */
const getClientBalance = async (id) => {
  try {
    const result = await db.query(
      'SELECT balance FROM clients WHERE id = $1',
      [id]
    );
    return result.rows[0] ? result.rows[0].balance : null;
  } catch (error) {
    logger.error(`Erreur lors de la récupération du solde du client ${id}:`, error);
    throw error;
  }
};

/**
 * Récupère les transactions d'un client
 */
const getClientTransactions = async (id) => {
  try {
    const result = await db.query(
      `SELECT v.id, v.numero_cheque, v.amount, v.description, v.status, 
              v.created_at, v.updated_at, 
              u.username as created_by_username
       FROM versements v
       LEFT JOIN users u ON v.created_by = u.id
       WHERE v.client_id = $1
       ORDER BY v.created_at DESC`,
      [id]
    );
    return result.rows;
  } catch (error) {
    logger.error(`Erreur lors de la récupération des transactions du client ${id}:`, error);
    throw error;
  }
};

/**
 * Récupère l'historique d'audit d'un client
 */
const getAuditTrail = async (id) => {
  try {
    const result = await db.query(
      `SELECT a.id, a.action, a.old_values, a.new_values, 
              a.old_balance, a.new_balance, a.action_type, a.created_at,
              u.username as performed_by
       FROM audit_versement a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.client_id = $1
       ORDER BY a.created_at DESC`,
      [id]
    );
    return result.rows;
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'audit du client ${id}:`, error);
    throw error;
  }
};

module.exports = {
  getAllClients,
  getClientById,
  getClientByAccountNumber,
  createClient,
  updateClient,
  updateClientBalance,
  deleteClient,
  getClientBalance,
  getClientTransactions,
  getAuditTrail
};