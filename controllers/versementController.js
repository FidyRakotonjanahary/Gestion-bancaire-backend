const logger = require('../utils/loggers');
const versementService = require('../services/versementService');
const socketService = require('../services/socketService');
const { v4: uuidv4 } = require('uuid');

exports.createVersement = async (req, res) => {
  const { client_id, numero_cheque, amount, description } = req.body;
  console.log('Requête reçue :', req.body);
  const user_id = req.user.id;
  
  try {
    // Préparer les données pour le service en utilisant les mêmes noms de variables
    const versementData = {
      client_id: client_id,
      numero_cheque: numero_cheque || ('VER-' + uuidv4().substring(0, 8).toUpperCase()), // Génération d'un numéro si non fourni
      amount: amount,  
      description: description
    };
    
    // Appeler le service pour créer le versement
    const newVersement = await versementService.createVersement(versementData, user_id);
    
    // Émettre un événement socket pour mise à jour en temps réel (maintenu pour compatibilité)
    socketService.emitAuditEvent({
      type: 'INSERT',
      versement: newVersement,
      user: req.user.username,
      versement_id: newVersement.id, 
      client_id: client_id 
    });
    
    socketService.updateAuditCounters();
    
    res.status(201).json({
      success: true,
      message: 'Versement créé avec succès',
      data: newVersement
    });
  } catch (error) {
    logger.error('Erreur lors de la création du versement:', error);
    res.status(500).json({
      success: false,
      message: `Erreur lors de la création du versement: ${error.message}`
    });
  }
};

exports.getAllVersements = async (req, res) => {
  try {
    // Récupérer tous les versements via le service
    const versements = await versementService.getAllVersements();
    
    res.status(200).json({
      success: true,
      data: versements
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
    // Récupérer le versement par ID via le service
    const versement = await versementService.getVersementById(id);
    
    if (!versement) {
      return res.status(404).json({
        success: false,
        message: 'Versement non trouvé'
      });
    }
    
    res.status(200).json({
      success: true,
      data: versement
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
  
  try {
    // Vérifier si le versement existe
    const existingVersement = await versementService.getVersementById(id);
    
    if (!existingVersement) {
      return res.status(404).json({
        success: false,
        message: 'Versement non trouvé'
      });
    }
    
    // Préparer les données pour le service - clé de la solution
    const versementData = {};
    
    // Ne récupérer que les champs fournis dans la requête
    if (req.body.numero_cheque !== undefined) versementData.numero_cheque = req.body.numero_cheque;
    if (req.body.amount !== undefined) versementData.amount = req.body.amount;
    if (req.body.description !== undefined) versementData.description = req.body.description;
    
    // Mettre à jour le versement via le service
    // CORRECTION: Enlever le troisième paramètre user_id qui n'est pas attendu par le service
    const updatedVersement = await versementService.updateVersement(id, versementData);
    
    socketService.emitAuditEvent({
      type: 'UPDATE',
      versement: updatedVersement,
      user: req.user.username,
      versement_id: id,
      client_id: existingVersement.client_id // Récupérer client_id du versement existant
    });
    
    socketService.updateAuditCounters();
    
    res.status(200).json({
      success: true,
      message: 'Versement mis à jour avec succès',
      data: updatedVersement
    });
  } catch (error) {
    if (error.message.includes('doit être positif')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    // Ajoutez un cas par défaut pour gérer les autres erreurs
    logger.error('Erreur lors de la mise à jour du versement:', error);
    return res.status(500).json({
      success: false,
      message: `Erreur lors de la mise à jour du versement: ${error.message}`
    });
  }
};

exports.deleteVersement = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  
  try {
    // Vérifier si le versement existe
    const existingVersement = await versementService.getVersementById(id);
    
    if (!existingVersement) {
      return res.status(404).json({
        success: false,
        message: 'Versement non trouvé'
      });
    }
    
    // Supprimer le versement via le service
    const deletedVersement = await versementService.deleteVersement(id, user_id);
    
    // Émettre un événement socket pour mise à jour en temps réel
    socketService.emitAuditEvent({
      type: 'DELETE',
      versement: existingVersement,
      user: req.user.username
    });
    
    socketService.updateAuditCounters();
    
    res.status(200).json({
      success: true,
      message: 'Versement supprimé avec succès',
      data: deletedVersement
    });
  } catch (error) {
    logger.error('Erreur lors de la suppression du versement:', error);
    res.status(500).json({
      success: false,
      message: `Erreur lors de la suppression du versement: ${error.message}`
    });
  }
};

exports.getVersementsByDateRange = async (req, res) => {
  const { start_date, end_date } = req.query;
  console.log('Paramètres reçus:', start_date, end_date);
  try {
    // Utiliser le service implémenté
    const versements = await versementService.getVersementsByDateRange(start_date, end_date);
    console.log('Résultats retournés:', versements);
    res.status(200).json({
      success: true,
      data: versements
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
    // Obtenir les statistiques de versement qui incluent le comptage
    const stats = await versementService.getVersementStats();
    
    res.status(200).json({
      success: true,
      count: stats.total_versements
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
  const { client_id } = req.params;  
  
  try {
    // Utiliser le service implémenté
    const versements = await versementService.getVersementsByClient(client_id);
    
    res.status(200).json({
      success: true,
      data: versements
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des versements du client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des versements du client'
    });
  }
};

// AJOUT: Implémentation manquante pour la récupération de l'historique d'audit
exports.getVersementAuditTrail = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Vérifier si le versement existe
    const existingVersement = await versementService.getVersementById(id);
    
    if (!existingVersement) {
      return res.status(404).json({
        success: false,
        message: 'Versement non trouvé'
      });
    }
    
    // Récupérer l'historique d'audit
    const auditTrail = await versementService.getVersementAuditTrail(id);
    
    res.status(200).json({
      success: true,
      data: auditTrail
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'historique d\'audit:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique d\'audit'
    });
  }
};

module.exports = exports;