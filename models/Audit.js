const pool = require('../utils/db');

class Audit {
  static async getById(id) {
    const query = `
      SELECT a.id, a.action_type, a.date_operation, a.numero_versement, 
             a.numero_compte, a.nom_client, a.montant_ancien, a.montant_nouveau, 
             a.utilisateur, a.versement_id, a.client_id
      FROM audit_versement a
      WHERE a.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async getAll(limit = 100) {
    const query = `
      SELECT a.id, a.action_type, a.date_operation, a.numero_versement, 
             a.numero_compte, a.nom_client, a.montant_ancien, a.montant_nouveau, 
             a.utilisateur, a.versement_id, a.client_id
      FROM audit_versement a
      ORDER BY a.date_operation DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  static async getByUser(username, limit = 100) {
    const query = `
      SELECT a.id, a.action_type, a.date_operation, a.numero_versement, 
             a.numero_compte, a.nom_client, a.montant_ancien, a.montant_nouveau, 
             a.utilisateur, a.versement_id, a.client_id
      FROM audit_versement a
      WHERE a.utilisateur = $1
      ORDER BY a.date_operation DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [username, limit]);
    return result.rows;
  }

  // Fonction pour récupérer par entité - non applicable avec le nouveau schéma
  // Nous garderons cette méthode pour compatibilité mais elle renverra un tableau vide
  static async getByEntity(entityType, entityId, limit = 100) {
    return [];
  }

  // Fonction pour récupérer par type d'entité - non applicable avec le nouveau schéma
  // Nous garderons cette méthode pour compatibilité mais elle renverra un tableau vide
  static async getByEntityType(entityType, limit = 100) {
    return [];
  }

  static async getByClient(clientId, limit = 100) {
    const query = `
      SELECT a.id, a.action_type, a.date_operation, a.numero_versement, 
             a.numero_compte, a.nom_client, a.montant_ancien, a.montant_nouveau, 
             a.utilisateur, a.versement_id, a.client_id
      FROM audit_versement a
      WHERE a.client_id = $1
      ORDER BY a.date_operation DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [clientId, limit]);
    return result.rows;
  }

  static async getByVersement(versementId, limit = 100) {
    const query = `
      SELECT a.id, a.action_type, a.date_operation, a.numero_versement, 
             a.numero_compte, a.nom_client, a.montant_ancien, a.montant_nouveau, 
             a.utilisateur, a.versement_id, a.client_id
      FROM audit_versement a
      WHERE a.versement_id = $1
      ORDER BY a.date_operation DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [versementId, limit]);
    return result.rows;
  }

  // Méthode pour la compatibilité avec le service
  static async getByAction(action, limit = 100) {
    // Dans le nouveau schéma, nous utilisons action_type au lieu de action
    return await this.getByActionType(action, limit);
  }

  static async getByActionType(actionType, limit = 100) {
    const query = `
      SELECT a.id, a.action_type, a.date_operation, a.numero_versement, 
             a.numero_compte, a.nom_client, a.montant_ancien, a.montant_nouveau, 
             a.utilisateur, a.versement_id, a.client_id
      FROM audit_versement a
      WHERE a.action_type = $1
      ORDER BY a.date_operation DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [actionType, limit]);
    return result.rows;
  }

  static async getByDateRange(startDate, endDate, limit = 100) {
    const query = `
      SELECT a.id, a.action_type, a.date_operation, a.numero_versement, 
             a.numero_compte, a.nom_client, a.montant_ancien, a.montant_nouveau, 
             a.utilisateur, a.versement_id, a.client_id
      FROM audit_versement a
      WHERE a.date_operation BETWEEN $1 AND $2
      ORDER BY a.date_operation DESC
      LIMIT $3
    `;
    
    const result = await pool.query(query, [startDate, endDate, limit]);
    return result.rows;
  }

  // Adapter cette méthode pour le nouveau schéma
  static async getBalanceChanges(clientId, limit = 100) {
    const query = `
      SELECT a.id, a.action_type, a.date_operation, a.numero_versement, 
             a.numero_compte, a.nom_client, a.montant_ancien, a.montant_nouveau, 
             a.utilisateur, a.versement_id, a.client_id
      FROM audit_versement a
      WHERE a.client_id = $1 AND (a.montant_ancien IS NOT NULL OR a.montant_nouveau IS NOT NULL)
      ORDER BY a.date_operation DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [clientId, limit]);
    return result.rows;
  }

  static async getStats() {
    const query = `
      SELECT 
        action_type, 
        COUNT(*) as count,
        COUNT(DISTINCT utilisateur) as user_count,
        COUNT(DISTINCT client_id) as client_count
      FROM audit_versement
      GROUP BY action_type
      ORDER BY count DESC
    `;
    
    const result = await pool.query(query);
    
    // Transformer en un objet structuré avec des compteurs
    const stats = {
      actions: {},
      action_types: {},
      total: 0,
      user_count: 0,
      client_count: 0
    };
    
    // Requête pour compter les utilisateurs et clients uniques
    const countQuery = `
      SELECT 
        COUNT(DISTINCT utilisateur) as total_users,
        COUNT(DISTINCT client_id) as total_clients,
        COUNT(*) as total_records
      FROM audit_versement
    `;
    
    const countResult = await pool.query(countQuery);
    stats.total = parseInt(countResult.rows[0].total_records);
    stats.user_count = parseInt(countResult.rows[0].total_users);
    stats.client_count = parseInt(countResult.rows[0].total_clients);
    
    // Regrouper par action_type
    result.rows.forEach(row => {
      stats.action_types[row.action_type] = parseInt(row.count);
      // Pour maintenir la compatibilité avec le code existant
      stats.actions[row.action_type] = parseInt(row.count);
    });
    
    return stats;
  }

  static async getCounters() {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT utilisateur) as unique_users,
        COUNT(DISTINCT client_id) as unique_clients,
        COUNT(DISTINCT versement_id) as unique_versements,
        COUNT(CASE WHEN action_type = 'INSERT' THEN 1 END) as inserts,
        COUNT(CASE WHEN action_type = 'UPDATE' THEN 1 END) as updates,
        COUNT(CASE WHEN action_type = 'DELETE' THEN 1 END) as deletes
      FROM audit_versement
    `;
    
    const result = await pool.query(query);
    return result.rows[0];
  }
}

module.exports = Audit;