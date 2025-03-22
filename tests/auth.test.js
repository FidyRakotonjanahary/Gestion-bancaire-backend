const request = require('supertest');
const { app } = require('../app'); // Importez directement l'app depuis app.js
const pool = require('../config/database');
const db = require('../utils/db');
const bcrypt = require('bcrypt');
// Au début de votre fichier de test, après les imports existants
const authMiddleware = require('../middleware/auth');

// Ajoutez cet import au début de votre fichier
const { clearRevokedTokens } = require('../config/jwt'); // Adaptez le chemin selon votre structure


// Avant de commencer les tests, ajoutez une route de test
app.get('/api/test/admin-only', 
  authMiddleware.verifyToken, 
  authMiddleware.isAdmin, 
  (req, res) => {
    res.status(200).json({ success: true, message: 'Accès administrateur réussi' });
  }
);

describe('Auth Middleware', () => {
  const testAdmin = {
    username: 'adminuser_test',
    email: 'admin_test@example.com',
    password: 'AdminPass123',
    role_id: 1  // ID du rôle admin
  };
  
  const testRegularUser = {
    username: 'regularuser_test',
    email: 'regular_test@example.com',
    password: 'RegularPass123',
    role_id: 2  // ID d'un rôle non-admin
  };
  
  let adminToken, userToken;
  let adminId;
  
  beforeAll(async () => {
    try {
      // Vérifier la connexion à la base de données
      await db.testConnection();
      console.log('Connexion à la base de données de test établie');
      
      // Nettoyer les utilisateurs de test avant de commencer
      await db.query('DELETE FROM users WHERE username = $1 OR username = $2', 
        [testAdmin.username, testRegularUser.username]);
      
      // Créer un utilisateur admin directement dans la base de données
      const hashedPassword = await bcrypt.hash(testAdmin.password, 10);
      const result = await db.query(
        `INSERT INTO users (username, email, password, role_id) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        [testAdmin.username, testAdmin.email, hashedPassword, testAdmin.role_id]
      );
      adminId = result.rows[0].id;
      console.log('Admin user created with ID:', adminId);
      
      // Ensuite, créer l'utilisateur standard normalement
      await request(app)
        .post('/api/auth/register')
        .send(testRegularUser);
          
      // Obtenir les tokens
      const adminResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password
        });
      adminToken = adminResponse.body.data.token;
      console.log('Token administrateur:', adminToken); 
      
      const userResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: testRegularUser.username,
          password: testRegularUser.password
        });
      userToken = userResponse.body.data.token;
      console.log('Token utilisateur standard:', userToken); 

    } catch (error) {
      console.error('Erreur dans beforeAll:', error);
      throw error; // Pour que Jest sache qu'il y a eu une erreur
    }
  }, 15000);
  
  afterAll(async () => {
    try {
      // Nettoyer la base de données après les tests
      await db.query('DELETE FROM users WHERE username = $1 OR username = $2', 
        [testAdmin.username, testRegularUser.username]);
      
      // Fermez les écouteurs de notifications
      const client = await pool.connect();
      await client.query('UNLISTEN audit_changes');
      client.release();
      
      // Fermez le pool
      await pool.end();
      console.log('Connexion à la base de données fermée');
    } catch (error) {
      console.error('Erreur pendant le nettoyage des tests:', error);
    }
  }, 50000);
  
  // Test du middleware verifyToken
  it('should deny access without token', async () => {
    const response = await request(app)
      .get('/api/auth/me');
    
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Aucun token fourni');
  });
  
  it('should deny access with invalid token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalidtoken123');
    
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Non autorisé, token invalide');
  });
  
  it('should deny access with revoked token', async () => {
    // D'abord, déconnectez-vous pour révoquer le token
    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${userToken}`);
    
    // Ensuite, essayez d'utiliser le token révoqué
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Non autorisé, token révoqué');
  });
  
  // Test du middleware isAdmin
  it('should allow admin access to admin-only routes', async () => {
    const response = await request(app)
      .get('/api/test/admin-only')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
  });


  it('should deny regular user access to admin-only routes', async () => {
    // Réinitialiser les tokens révoqués avant ce test
  clearRevokedTokens();
    // Première connexion de l'utilisateur régulier pour obtenir un token frais
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: testRegularUser.username,
        password: testRegularUser.password
      });
    
    console.log('User info in login response:', loginResponse.body.data.user);
    
    // S'assurer que la connexion a réussi
    expect(loginResponse.status).toBe(200);
    
    // Récupérer le nouveau token
    const freshUserToken = loginResponse.body.data.token;
    console.log('Nouveau token utilisateur:', freshUserToken);
    
    // S'assurer que le token est présent
    expect(freshUserToken).toBeTruthy();
    
    // Utiliser le nouveau token pour accéder à la route admin
    const response = await request(app)
      .get('/api/test/admin-only')
      .set('Authorization', `Bearer ${freshUserToken}`);
    
    // Log pour debug
    console.log('Response status:', response.status);
    console.log('Response body:', response.body);
    
    // Vérifier la réponse
    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Nécessite des privilèges administrateur');
  });
});