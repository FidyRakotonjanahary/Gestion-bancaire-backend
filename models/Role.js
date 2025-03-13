const pool = require('../utils/db');

class Role {
  static async getAll() {
    const query = `
      SELECT id, name, description, created_at
      FROM roles
      ORDER BY name ASC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  static async getById(id) {
    const query = `
      SELECT id, name, description, created_at
      FROM roles
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async getByName(name) {
    const query = `
      SELECT id, name, description, created_at
      FROM roles
      WHERE name = $1
    `;
    
    const result = await pool.query(query, [name]);
    return result.rows[0] || null;
  }

  static async create(roleData) {
    const { name, description } = roleData;
    
    const query = `
      INSERT INTO roles (name, description, created_at)
      VALUES ($1, $2, $3)
      RETURNING id, name, description, created_at
    `;
    
    const values = [name, description, new Date()];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async update(id, roleData) {
    const { name, description } = roleData;
    
    const query = `
      UPDATE roles
      SET name = $1, description = $2, updated_at = $3
      WHERE id = $4
      RETURNING id, name, description, updated_at
    `;
    
    const values = [name, description, new Date(), id];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = `
      DELETE FROM roles
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Role;