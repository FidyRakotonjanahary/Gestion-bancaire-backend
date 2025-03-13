const db = require('../utils/db');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/loggers');
const auditService = require('../services/auditService');
const socketService = require('../services/socketService');

exports.createVersement = async (req, res) => {
  const { client_id, cheque_number, amount } = req.body;
  const user_id = req.user.id;
  
  try {
    // Vérifier si le client existe
    const clientCheck = await db.query(
      'SELECT * FROM clients WHERE id = $1',
      [client_id]
    );
    
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }
    
    // Générer un numéro de versement unique
    const versement_number = 'VER-' + uuidv4().substring(0, 8).toUpperCase();
    
    // Obtenir le solde actuel du client
    const oldBalance = parseFloat(clientCheck.rows[0].balance) || 0;
    
    // Calculer le nouveau solde
    const newBalance = oldBalance + parseFloat(amount);
    
    // Insérer le versement
    const result = await db.query(
      `INSERT INTO versements (versement_number, cheque_number, client_id, amount, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [versement_number, cheque_number, client_id, amount, user_id]
    );
    
    // Mettre à jour le solde du client
    await db.query(
      `UPDATE clients SET balance = $1, updated_at = NOW() WHERE id = $2`,
      [newBalance, client_id]
    );
    
    // Enregistrer l'audit
    await auditService.createAudit({
      action_type: 'INSERT',
      versement_id: result.rows[0].id,
      old_balance: oldBalance,
      new_balance: newBalance,
      user_id: user_id
    });
    
    // Émettre un événement socket pour mise à jour en temps réel
    socketService.emitAuditEvent({
      type: 'INSERT',
      versement: result.rows[0],
      user: req.user.username
    });
    
    socketService.updateAuditCounters();
    
    res.status(201).json({
      success: true,
      message: 'Versement créé avec succès',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Erreur lors de la création du versement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du versement'
    });
  }
};

exports.getAllVersements = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT v.*, c.name, c.account_number, u.username as created_by_user
       FROM versements v
       JOIN clients c ON v.client_id = c.id
       LEFT JOIN users u ON v.created_by = u.id
       ORDER BY v.created_at DESC`
    );
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des versements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des versements'
    });
  }
};

exports.getVersementById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await db.query(
      `SELECT v.*, c.name, c.account_number, u.username as created_by_user
       FROM versements v
       JOIN clients c ON v.client_id = c.id
       LEFT JOIN users u ON v.created_by = u.id
       WHERE v.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Versement non trouvé'
      });
    }
    
    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du versement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du versement'
    });
  }
};

exports.updateVersement = async (req, res) => {
  const { id } = req.params;
  const { cheque_number, amount } = req.body;
  const user_id = req.user.id;
  
  try {
    // Vérifier si le versement existe et récupérer l'ancien montant
    const versementCheck = await db.query(
      `SELECT v.*, c.balance as client_balance, c.id as client_id
       FROM versements v
       JOIN clients c ON v.client_id = c.id
       WHERE v.id = $1`,
      [id]
    );
    
    if (versementCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Versement non trouvé'
      });
    }
    
    const oldVersement = versementCheck.rows[0];
    const oldAmount = parseFloat(oldVersement.amount);
    const newAmount = parseFloat(amount);
    const clientId = oldVersement.client_id;
    const oldBalance = parseFloat(oldVersement.client_balance);
    
    // Calculer le nouveau solde du client
    // nouveau solde = ancien solde + nouveau montant - ancien montant
    const newBalance = oldBalance + newAmount - oldAmount;
    
    // Mettre à jour le versement
    const result = await db.query(
      `UPDATE versements
       SET cheque_number = $1, amount = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [cheque_number, newAmount, id]
    );
    
    // Mettre à jour le solde du client
    await db.query(
      `UPDATE clients SET balance = $1, updated_at = NOW() WHERE id = $2`,
      [newBalance, clientId]
    );
    
    // Enregistrer l'audit
    await auditService.createAudit({
      action_type: 'UPDATE',
      versement_id: id,
      old_balance: oldBalance,
      new_balance: newBalance,
      user_id: user_id
    });
    
    // Émettre un événement socket pour mise à jour en temps réel
    socketService.emitAuditEvent({
      type: 'UPDATE',
      versement: result.rows[0],
      user: req.user.username
    });
    
    socketService.updateAuditCounters();
    
    res.status(200).json({
      success: true,
      message: 'Versement mis à jour avec succès',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du versement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du versement'
    });
  }
};

exports.deleteVersement = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  
  try {
    // Vérifier si le versement existe
    const versementCheck = await db.query(
      `SELECT v.*, c.balance as client_balance, c.id as client_id
       FROM versements v
       JOIN clients c ON v.client_id = c.id
       WHERE v.id = $1`,
      [id]
    );
    
    if (versementCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Versement non trouvé'
      });
    }
    
    const oldVersement = versementCheck.rows[0];
    const amount = parseFloat(oldVersement.amount);
    const clientId = oldVersement.client_id;
    const oldBalance = parseFloat(oldVersement.client_balance);
    
    // Calculer le nouveau solde du client (après suppression)
    const newBalance = oldBalance - amount;
    
    // Supprimer le versement
    const result = await db.query(
      'DELETE FROM versements WHERE id = $1 RETURNING *',
      [id]
    );
    
    // Mettre à jour le solde du client
    await db.query(
      `UPDATE clients SET balance = $1, updated_at = NOW() WHERE id = $2`,
      [newBalance, clientId]
    );
    
    // Enregistrer l'audit
    await auditService.createAudit({
      action_type: 'DELETE',
      versement_id: id,
      old_balance: oldBalance,
      new_balance: newBalance,
      user_id: user_id
    });
    
    // Émettre un événement socket pour mise à jour en temps réel
    socketService.emitAuditEvent({
      type: 'DELETE',
      versement: oldVersement,
      user: req.user.username
    });
    
    socketService.updateAuditCounters();
    
    res.status(200).json({
      success: true,
      message: 'Versement supprimé avec succès',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Erreur lors de la suppression du versement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du versement'
    });
  }
};

exports.getVersementsByDateRange = async (req, res) => {
  const { start_date, end_date } = req.query;
  
  try {
    const result = await db.query(
      `SELECT v.*, c.name, c.account_number, u.username as created_by_user
       FROM versements v
       JOIN clients c ON v.client_id = c.id
       LEFT JOIN users u ON v.created_by = u.id
       WHERE v.created_at BETWEEN $1 AND $2
       ORDER BY v.created_at DESC`,
      [start_date, end_date]
    );
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des versements par plage de dates:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des versements par plage de dates'
    });
  }
};

exports.getVersementCount = async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) FROM versements');
    
    res.status(200).json({
      success: true,
      count: parseInt(result.rows[0].count)
    });
  } catch (error) {
    logger.error('Erreur lors du comptage des versements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du comptage des versements'
    });
  }
};

exports.getVersementsByClient = async (req, res) => {
  const { clientId } = req.params;
  
  try {
    const result = await db.query(
      `SELECT v.*, c.name, c.account_number, u.username as created_by_user
       FROM versements v
       JOIN clients c ON v.client_id = c.id
       LEFT JOIN users u ON v.created_by = u.id
       WHERE v.client_id = $1
       ORDER BY v.created_at DESC`,
      [clientId]
    );
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des versements du client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des versements du client'
    });
  }
};

module.exports = exports;