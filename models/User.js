const pool = require('../utils/db');
const bcrypt = require('bcrypt');

class User {
  static async create(userData) {
    const { username, password, email, full_name, role_id } = userData;
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = `
      INSERT INTO users (username, password, email, full_name, role_id, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING id, username, email, full_name, role_id, is_active, created_at
    `;
    
    const values = [username, hashedPassword, email, full_name, role_id, true];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getById(id) {
    const query = `
      SELECT u.id, u.username, u.email, u.full_name, u.role_id, r.name as role_name, 
             u.is_active, u.created_at, u.updated_at, u.last_logout, u.failed_login_attempts, u.last_failed_login
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async getByUsername(username) {
    const query = `
      SELECT u.id, u.username, u.password, u.email, u.full_name, u.role_id, r.name as role_name, 
             u.is_active, u.created_at, u.updated_at, u.last_logout, u.failed_login_attempts, u.last_failed_login
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.username = $1
    `;
    
    const result = await pool.query(query, [username]);
    return result.rows[0] || null;
  }

  static async getAll() {
    const query = `
      SELECT u.id, u.username, u.email, u.full_name, u.role_id, r.name as role_name, 
             u.is_active, u.created_at, u.updated_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id, userData) {
    const { username, email, full_name, role_id, is_active } = userData;
    
    const query = `
      UPDATE users
      SET username = $1, email = $2, full_name = $3, role_id = $4, is_active = $5
      WHERE id = $6
      RETURNING id, username, email, full_name, role_id, is_active, updated_at
    `;
    
    const values = [username, email, full_name, role_id, is_active, id];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updatePassword(id, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = `
      UPDATE users
      SET password = $1
      WHERE id = $2
      RETURNING id
    `;
    
    const values = [hashedPassword, id];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = `
      DELETE FROM users
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async logLogin(userId, ipAddress, userAgent, actionType) {
    const query = `
      INSERT INTO login_history (user_id, ip_address, user_agent, login_time, action_type)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
      RETURNING id
    `;
    
    const values = [userId, ipAddress, userAgent, actionType];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getLoginHistory(userId) {
    const query = `
      SELECT id, ip_address, user_agent, login_time, action_type
      FROM login_history
      WHERE user_id = $1
      ORDER BY login_time DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async updateLoginAttempts(id, failedAttempt) {
    const query = failedAttempt 
      ? `
        UPDATE users
        SET failed_login_attempts = failed_login_attempts + 1, last_failed_login = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, failed_login_attempts
      `
      : `
        UPDATE users
        SET failed_login_attempts = 0
        WHERE id = $1
        RETURNING id, failed_login_attempts
      `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateLogout(id) {
    const query = `
      UPDATE users
      SET last_logout = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getUserPermissions(userId) {
    const query = `
      SELECT permission_name, is_granted
      FROM user_permissions
      WHERE user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async grantPermission(userId, permissionName, grantedBy) {
    const client = await pool.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Insérer ou mettre à jour la permission
      const grantQuery = `
        INSERT INTO user_permissions (user_id, permission_name, is_granted)
        VALUES ($1, $2, TRUE)
        ON CONFLICT (user_id, permission_name)
        DO UPDATE SET is_granted = TRUE
        RETURNING id
      `;
      
      const grantResult = await client.query(grantQuery, [userId, permissionName]);
      
      // Enregistrer l'historique
      const historyQuery = `
        INSERT INTO permission_history (user_id, permission_name, is_granted, changed_by)
        VALUES ($1, $2, TRUE, $3)
      `;
      
      await client.query(historyQuery, [userId, permissionName, grantedBy]);
      
      await client.query('COMMIT');
      return grantResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async revokePermission(userId, permissionName, revokedBy) {
    const client = await pool.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Insérer ou mettre à jour la permission
      const revokeQuery = `
        INSERT INTO user_permissions (user_id, permission_name, is_granted)
        VALUES ($1, $2, FALSE)
        ON CONFLICT (user_id, permission_name)
        DO UPDATE SET is_granted = FALSE
        RETURNING id
      `;
      
      const revokeResult = await client.query(revokeQuery, [userId, permissionName]);
      
      // Enregistrer l'historique
      const historyQuery = `
        INSERT INTO permission_history (user_id, permission_name, is_granted, changed_by)
        VALUES ($1, $2, FALSE, $3)
      `;
      
      await client.query(historyQuery, [userId, permissionName, revokedBy]);
      
      await client.query('COMMIT');
      return revokeResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getPermissionHistory(userId) {
    const query = `
      SELECT ph.permission_name, ph.is_granted, ph.changed_at,
             u.username as changed_by_username
      FROM permission_history ph
      LEFT JOIN users u ON ph.changed_by = u.id
      WHERE ph.user_id = $1
      ORDER BY ph.changed_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }
}

module.exports = User;