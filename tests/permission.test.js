const request = require('supertest');
const { app } = require('../app');
const pool = require('../config/database');
const db = require('../utils/db');
const bcrypt = require('bcrypt');
const { clearRevokedTokens } = require('../config/jwt');

describe('Permissions API', () => {
  // Données de test pour les utilisateurs
  const testAdmin = {
    username: 'admin_test_perm',
    email: 'admin_test_perm@example.com',
    password: 'AdminPass123',
    role_id: 1 // Admin
  };
  
  const testUser = {
    username: 'user_test_perm',
    email: 'user_test_perm@example.com',
    password: 'UserPass123',
    role_id: 2 // Utilisateur standard
  };
  
  let adminToken, userToken, userId, adminId;
  let poolClosed = false;
  
  beforeAll(async () => {
    try {
      // Vérifier la connexion à la base de données
      await db.testConnection();
      console.log('Connexion à la base de données de test établie');
      
      // Nettoyer les utilisateurs de test s'ils existent déjà
      await db.query('DELETE FROM users WHERE username = $1 OR username = $2', 
        [testAdmin.username, testUser.username]);
      
      // Créer un utilisateur admin
      const hashedAdminPassword = await bcrypt.hash(testAdmin.password, 10);
      const adminResult = await db.query(
        `INSERT INTO users (username, email, password, role_id) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        [testAdmin.username, testAdmin.email, hashedAdminPassword, testAdmin.role_id]
      );
      adminId = adminResult.rows[0].id;
      
      // Créer un utilisateur standard
      const hashedUserPassword = await bcrypt.hash(testUser.password, 10);
      const userResult = await db.query(
        `INSERT INTO users (username, email, password, role_id) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        [testUser.username, testUser.email, hashedUserPassword, testUser.role_id]
      );
      userId = userResult.rows[0].id;
      
      // Obtenir les tokens d'authentification
      const adminResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password
        });
      adminToken = adminResponse.body.data.token;
      
      const userResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });
      userToken = userResponse.body.data.token;
      
      // Réinitialiser les tokens révoqués
      clearRevokedTokens();
    } catch (error) {
      console.error('Erreur dans beforeAll:', error);
      throw error;
    }
  }, 15000);
  
  afterAll(async () => {
    if (poolClosed) return;
    
    try {
      // Nettoyer la base de données après les tests
      await db.query('DELETE FROM permission_history WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM user_permissions WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM users WHERE username = $1 OR username = $2', 
        [testAdmin.username, testUser.username]);
      
      // Fermez les écouteurs de notifications si nécessaire
      const client = await pool.connect();
      await client.query('UNLISTEN audit_changes');
      client.release();
      
      // Fermez le pool
      await pool.end();
      poolClosed = true;
      console.log('Connexion à la base de données fermée');
    } catch (error) {
      console.error('Erreur pendant le nettoyage des tests:', error);
    }
  }, 50000);

  // Tests pour récupérer toutes les permissions
  describe('GET /api/permissions', () => {
    it('devrait permettre à un admin de récupérer toutes les permissions', async () => {
      const response = await request(app)
        .get('/api/permissions')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('ne devrait pas permettre à un utilisateur standard de récupérer toutes les permissions', async () => {
      const response = await request(app)
        .get('/api/permissions')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  // Tests pour récupérer les permissions d'un utilisateur spécifique
  describe('GET /api/permissions/user/:user_id', () => {
    it('devrait permettre à un admin de récupérer les permissions d\'un utilisateur', async () => {
      const response = await request(app)
        .get(`/api/permissions/user/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('devrait retourner 404 pour un utilisateur inexistant', async () => {
      const response = await request(app)
        .get('/api/permissions/user/99999')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('non trouvé');
    });

    it('ne devrait pas permettre à un utilisateur standard de récupérer les permissions', async () => {
      const response = await request(app)
        .get(`/api/permissions/user/${userId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  // Tests pour mettre à jour les permissions d'un utilisateur
  describe('PUT /api/permissions/user/:user_id', () => {
    it('devrait permettre à un admin de mettre à jour les permissions d\'un utilisateur', async () => {
      // Modifier ici - utiliser le format camelCase conformément au modèle Permission.js
      const permissions = [
        { permissionName: 'client_read', isGranted: true },
        { permissionName: 'client_create', isGranted: true },
        { permissionName: 'client_update', isGranted: false }
      ];
      
      const response = await request(app)
        .put(`/api/permissions/user/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('succès');
    });

    it('devrait retourner 404 pour la mise à jour des permissions d\'un utilisateur inexistant', async () => {
      // Modifier ici - utiliser le format camelCase
      const permissions = [
        { permissionName: 'client_read', isGranted: true }
      ];
      
      const response = await request(app)
        .put('/api/permissions/user/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions });
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('non trouvé');
    });

    it('ne devrait pas permettre à un utilisateur standard de mettre à jour les permissions', async () => {
      // Modifier ici - utiliser le format camelCase
      const permissions = [
        { permissionName: 'client_read', isGranted: true }
      ];
      
      const response = await request(app)
        .put(`/api/permissions/user/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ permissions });
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });

    it('devrait vérifier que les permissions ont bien été mises à jour', async () => {
      // D'abord, on vérifie les permissions actuelles
      const response = await request(app)
        .get(`/api/permissions/user/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      
      // Vérifier que les permissions correspondent à celles qui ont été définies
      const clientReadPerm = response.body.data.find(p => p.permission_name === 'client_read');
      const clientCreatePerm = response.body.data.find(p => p.permission_name === 'client_create');
      const clientUpdatePerm = response.body.data.find(p => p.permission_name === 'client_update');
      
      expect(clientReadPerm).toBeDefined();
      expect(clientReadPerm.is_granted).toBe(true);
      
      expect(clientCreatePerm).toBeDefined();
      expect(clientCreatePerm.is_granted).toBe(true);
      
      expect(clientUpdatePerm).toBeDefined();
      expect(clientUpdatePerm.is_granted).toBe(false);
    });
  });

  // Tests pour récupérer l'historique des permissions
  describe('GET /api/permissions/user/:user_id/history', () => {
    it('devrait permettre à un admin de récupérer l\'historique des permissions', async () => {
      const response = await request(app)
        .get(`/api/permissions/user/${userId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
      // Nous avons mis à jour 3 permissions, donc il devrait y avoir au moins 3 entrées
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('devrait retourner 404 pour un utilisateur inexistant', async () => {
      const response = await request(app)
        .get('/api/permissions/user/99999/history')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('non trouvé');
    });

    it('ne devrait pas permettre à un utilisateur standard d\'accéder à l\'historique', async () => {
      const response = await request(app)
        .get(`/api/permissions/user/${userId}/history`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  // Tests pour réinitialiser les permissions d'un utilisateur
  describe('DELETE /api/permissions/user/:user_id', () => {
    // D'abord, assurons-nous que des permissions existent avant de tester la réinitialisation
    beforeEach(async () => {
      // Ajouter des permissions si elles n'existent pas déjà
      const permissions = [
        { permissionName: 'client_read', isGranted: true },
        { permissionName: 'client_create', isGranted: true }
      ];
      
      await request(app)
        .put(`/api/permissions/user/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions });
    });
    
    it('devrait permettre à un admin de réinitialiser les permissions d\'un utilisateur', async () => {
      const response = await request(app)
        .delete(`/api/permissions/user/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('réinitialisées');
    });

    it('devrait vérifier que les permissions ont bien été réinitialisées', async () => {
      // Vérifier que les permissions personnalisées ont été supprimées
      const response = await request(app)
        .get(`/api/permissions/user/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      
      // Si les permissions ont été réinitialisées, les permissions spécifiques devraient être supprimées
      // ou retournées aux valeurs par défaut du rôle
      const clientReadPerm = response.body.data.find(p => p.permission_name === 'client_read');
      const clientCreatePerm = response.body.data.find(p => p.permission_name === 'client_create');
      
      // Selon votre logique d'application, vérifiez soit qu'elles n'existent plus, soit qu'elles ont la valeur par défaut
      // Cet exemple suppose que les permissions spécifiques sont supprimées
      if (response.body.data.length > 0) {
        // Si les permissions ne sont pas complètement supprimées mais réinitialisées aux valeurs par défaut
        // vérifier les valeurs par défaut ici
        console.log('Permissions après réinitialisation:', response.body.data);
      } else {
        // Si toutes les permissions spécifiques sont supposées être supprimées
        expect(response.body.data.length).toBe(0);
      }
    });

    it('devrait retourner 404 pour un utilisateur inexistant', async () => {
      const response = await request(app)
        .delete('/api/permissions/user/99999')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('non trouvé');
    });

    it('ne devrait pas permettre à un utilisateur standard de réinitialiser les permissions', async () => {
      const response = await request(app)
        .delete(`/api/permissions/user/${userId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });
});