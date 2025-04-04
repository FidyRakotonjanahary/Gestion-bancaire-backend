const pool = require('../utils/db');

class Permission {
  static async create(permissionData) {
    const { userId, permissionName, isGranted } = permissionData;
    
    const query = `
      INSERT INTO user_permissions (user_id, permission_name, is_granted, created_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, permission_name, is_granted, created_at
    `;
    
    const values = [userId, permissionName, isGranted, new Date()];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getByUserId(userId) {
    const query = `
      SELECT id, user_id, permission_name, is_granted, created_at, updated_at
      FROM user_permissions
      WHERE user_id = $1
      ORDER BY permission_name ASC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async getUserPermission(userId, permissionName) {
    const query = `
      SELECT id, user_id, permission_name, is_granted, created_at, updated_at
      FROM user_permissions
      WHERE user_id = $1 AND permission_name = $2
    `;
    
    const result = await pool.query(query, [userId, permissionName]);
    return result.rows[0] || null;
  }

  static async updatePermission(id, isGranted, changedBy) {
    const client = await pool.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Mettre à jour la permission
      const updateQuery = `
        UPDATE user_permissions
        SET is_granted = $1, updated_at = $2
        WHERE id = $3
        RETURNING id, user_id, permission_name, is_granted, updated_at
      `;
      
      const values = [isGranted, new Date(), id];
      
      const result = await client.query(updateQuery, values);
      
      if (result.rows.length === 0) {
        throw new Error('Permission not found');
      }
      
      // Ajouter à l'historique
      const historyQuery = `
        INSERT INTO permission_history (user_id, permission_name, is_granted, changed_by, changed_at)
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      const historyValues = [
        result.rows[0].user_id, 
        result.rows[0].permission_name, 
        isGranted, 
        changedBy || result.rows[0].user_id,
        new Date()
      ];
      
      await client.query(historyQuery, historyValues);
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateUserPermissions(userId, permissions, changedBy) {
    // Commencer une transaction
    const client = await pool.getClient();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      
      for (const perm of permissions) {
        const { permissionName, isGranted } = perm;
        
        // Vérifier si la permission existe déjà
        const existingPermQuery = `
          SELECT id FROM user_permissions
          WHERE user_id = $1 AND permission_name = $2
        `;
        
        const existingPermResult = await client.query(existingPermQuery, [userId, permissionName]);
        
        if (existingPermResult.rows.length > 0) {
          // Mettre à jour la permission existante
          const updateQuery = `
            UPDATE user_permissions
            SET is_granted = $1, updated_at = $2
            WHERE id = $3
            RETURNING id, user_id, permission_name, is_granted, updated_at
          `;
          
          const updateValues = [isGranted, new Date(), existingPermResult.rows[0].id];
          const updateResult = await client.query(updateQuery, updateValues);
          
          results.push(updateResult.rows[0]);
        } else {
          // Créer une nouvelle permission
          const insertQuery = `
            INSERT INTO user_permissions (user_id, permission_name, is_granted, created_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id, user_id, permission_name, is_granted, created_at
          `;
          
          const insertValues = [userId, permissionName, isGranted, new Date()];
          const insertResult = await client.query(insertQuery, insertValues);
          
          results.push(insertResult.rows[0]);
        }
        
        // Enregistrer l'historique du changement de permission
        const historyQuery = `
          INSERT INTO permission_history (user_id, permission_name, is_granted, changed_by, changed_at)
          VALUES ($1, $2, $3, $4, $5)
        `;
        
        const historyValues = [userId, permissionName, isGranted, changedBy || userId, new Date()];
        await client.query(historyQuery, historyValues);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getPermissionHistory(userId) {
    const query = `
      SELECT ph.id, ph.user_id, ph.permission_name, ph.is_granted, 
             ph.changed_by, ph.changed_at,
             u.username as changed_by_username
      FROM permission_history ph
      LEFT JOIN users u ON ph.changed_by = u.id
      WHERE ph.user_id = $1
      ORDER BY ph.changed_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async checkPermission(userId, permissionName) {
    // Vérifier d'abord si l'utilisateur est un administrateur
    const userQuery = `
      SELECT u.id, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1 AND u.is_active = true
    `;
    
    const userResult = await pool.query(userQuery, [userId]);
    
    if (!userResult.rows.length) {
      return false; // Utilisateur non trouvé ou inactif
    }
    
    if (userResult.rows[0].role_name === 'ADMIN') {
      return true; // Les administrateurs ont toutes les permissions
    }
    
    // Vérifier la permission spécifique
    const permQuery = `
      SELECT is_granted FROM user_permissions
      WHERE user_id = $1 AND permission_name = $2
    `;
    
    const permResult = await pool.query(permQuery, [userId, permissionName]);
    
    if (!permResult.rows.length) {
      return false; // Permission non trouvée
    }
    
    return permResult.rows[0].is_granted;
  }
  
  static async deletePermission(id) {
    const query = `
      DELETE FROM user_permissions
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
  
  static async getAllPermissionNames() {
    const query = `
      SELECT DISTINCT permission_name
      FROM user_permissions
      ORDER BY permission_name ASC
    `;
    
    const result = await pool.query(query);
    return result.rows.map(row => row.permission_name);
  }
}

module.exports = Permission;