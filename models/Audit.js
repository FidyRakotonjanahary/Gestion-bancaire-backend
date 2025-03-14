const pool = require('../utils/db');

class Audit {
  static async create(auditData) {
    const { 
      user_id, 
      action,
      entity_type, 
      entity_id, 
      old_values, 
      new_values, 
      client_id = null,
      versement_id = null,
      old_balance = null,
      new_balance = null,
      action_type
    } = auditData;
    
    const query = `
      INSERT INTO audit_versement (
        user_id, action, entity_type, entity_id, old_values, new_values, 
        client_id, versement_id, old_balance, new_balance, action_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, user_id, action, entity_type, entity_id, client_id, versement_id, action_type, created_at
    `;
    
    const values = [
      user_id, 
      action, 
      entity_type, 
      entity_id, 
      old_values, 
      new_values,
      client_id,
      versement_id,
      old_balance,
      new_balance,
      action_type
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getById(id) {
    const query = `
      SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, 
             a.old_values, a.new_values, a.client_id, a.versement_id,
             a.old_balance, a.new_balance, a.action_type, a.created_at,
             u.username as user_username,
             c.name as name,
             c.account_number
      FROM audit_versement a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async getAll(limit = 100) {
    const query = `
      SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, 
             a.old_values, a.new_values, a.client_id, a.versement_id,
             a.old_balance, a.new_balance, a.action_type, a.created_at,
             u.username as user_username,
             c.name as name
      FROM audit_versement a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN clients c ON a.client_id = c.id
      ORDER BY a.created_at DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  static async getByUser(userId, limit = 100) {
    const query = `
      SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, 
             a.old_values, a.new_values, a.client_id, a.versement_id,
             a.old_balance, a.new_balance, a.action_type, a.created_at,
             u.username as user_username,
             c.name as name
      FROM audit_versement a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.user_id = $1
      ORDER BY a.created_at DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  static async getByEntityType(entityType, limit = 100) {
    const query = `
      SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, 
             a.old_values, a.new_values, a.client_id, a.versement_id,
             a.old_balance, a.new_balance, a.action_type, a.created_at,
             u.username as user_username,
             c.name as name
      FROM audit_versement a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.entity_type = $1
      ORDER BY a.created_at DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [entityType, limit]);
    return result.rows;
  }

  static async getByEntity(entityType, entityId, limit = 100) {
    const query = `
      SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, 
             a.old_values, a.new_values, a.client_id, a.versement_id,
             a.old_balance, a.new_balance, a.action_type, a.created_at,
             u.username as user_username,
             c.name as name
      FROM audit_versement a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.entity_type = $1 AND a.entity_id = $2
      ORDER BY a.created_at DESC
      LIMIT $3
    `;
    
    const result = await pool.query(query, [entityType, entityId, limit]);
    return result.rows;
  }

  static async getByClient(clientId, limit = 100) {
    const query = `
      SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, 
             a.old_values, a.new_values, a.client_id, a.versement_id,
             a.old_balance, a.new_balance, a.action_type, a.created_at,
             u.username as user_username
      FROM audit_versement a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.client_id = $1
      ORDER BY a.created_at DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [clientId, limit]);
    return result.rows;
  }

  static async getByVersement(versementId, limit = 100) {
    const query = `
      SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, 
             a.old_values, a.new_values, a.client_id, a.versement_id,
             a.old_balance, a.new_balance, a.action_type, a.created_at,
             u.username as user_username,
             c.name as name
      FROM audit_versement a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.versement_id = $1
      ORDER BY a.created_at DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [versementId, limit]);
    return result.rows;
  }

  static async getByAction(action, limit = 100) {
    const query = `
      SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, 
             a.old_values, a.new_values, a.client_id, a.versement_id,
             a.old_balance, a.new_balance, a.action_type, a.created_at,
             u.username as user_username,
             c.name as name
      FROM audit_versement a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.action = $1
      ORDER BY a.created_at DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [action, limit]);
    return result.rows;
  }

  static async getByActionType(actionType, limit = 100) {
    const query = `
      SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, 
             a.old_values, a.new_values, a.client_id, a.versement_id,
             a.old_balance, a.new_balance, a.action_type, a.created_at,
             u.username as user_username,
             c.name as name
      FROM audit_versement a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.action_type = $1
      ORDER BY a.created_at DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [actionType, limit]);
    return result.rows;
  }

  static async getBalanceChanges(clientId, limit = 100) {
    const query = `
      SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id,
             a.old_balance, a.new_balance, a.action_type, a.created_at,
             u.username as user_username
      FROM audit_versement a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.client_id = $1 AND a.old_balance IS NOT NULL AND a.new_balance IS NOT NULL
      ORDER BY a.created_at DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [clientId, limit]);
    return result.rows;
  }

  static async getStats() {
    const query = `
      SELECT 
        action, 
        COUNT(*) as count,
        action_type,
        COUNT(DISTINCT user_id) as user_count,
        COUNT(DISTINCT client_id) as client_count
      FROM audit_versement
      GROUP BY action, action_type
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
        COUNT(DISTINCT user_id) as total_users,
        COUNT(DISTINCT client_id) as total_clients,
        COUNT(*) as total_records
      FROM audit_versement
    `;
    
    const countResult = await pool.query(countQuery);
    stats.total = parseInt(countResult.rows[0].total_records);
    stats.user_count = parseInt(countResult.rows[0].total_users);
    stats.client_count = parseInt(countResult.rows[0].total_clients);
    
    // Regrouper par action
    result.rows.forEach(row => {
      if (!stats.actions[row.action]) {
        stats.actions[row.action] = 0;
      }
      if (!stats.action_types[row.action_type]) {
        stats.action_types[row.action_type] = 0;
      }
      
      stats.actions[row.action] += parseInt(row.count);
      stats.action_types[row.action_type] += parseInt(row.count);
    });
    
    return stats;
  }

  static async getByDateRange(startDate, endDate, limit = 100) {
    const query = `
      SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, 
             a.old_values, a.new_values, a.client_id, a.versement_id,
             a.old_balance, a.new_balance, a.action_type, a.created_at,
             u.username as user_username,
             c.name as name
      FROM audit_versement a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.created_at BETWEEN $1 AND $2
      ORDER BY a.created_at DESC
      LIMIT $3
    `;
    
    const result = await pool.query(query, [startDate, endDate, limit]);
    return result.rows;
  }
}

module.exports = Audit;