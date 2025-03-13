const request = require('supertest');
const { app } = require('../app');
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

describe('User API', () => {
  // Données de test pour les utilisateurs
  const testAdmin = {
    username: 'adminuser_test',
    email: 'admin_test@example.com',
    password: 'AdminPass123',
    role_id: 1 // Admin
  };
  
  const testUser = {
    username: 'user_test',
    email: 'user_test@example.com',
    password: 'UserPass123',
    full_name: 'Utilisateur Test',
    role_id: 2 // Rôle utilisateur standard
  };
  
  const newUser = {
    username: 'new_user',
    email: 'new_user@example.com',
    password: 'NewUser123',
    full_name: 'Nouvel Utilisateur',
    role_id: 2
  };
  
  let adminToken, userToken, userId, adminId, regularUserId;
  let poolClosed = false;
  
  beforeAll(async () => {
    // Vérifier la connexion à la base de données
    try {
      // Nettoyer les tables
      await pool.query('TRUNCATE TABLE user_permissions CASCADE');
      await pool.query('TRUNCATE TABLE users CASCADE');
      
      // Créer les utilisateurs de test
      await request(app)
        .post('/api/auth/register')
        .send(testAdmin);
        
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
        
      // Obtenir les tokens
      const adminResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password
        });
      adminToken = adminResponse.body.data.token;
      adminId = adminResponse.body.data.user.id;
      
      const userResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });
      userToken = userResponse.body.data.token;
      regularUserId = userResponse.body.data.user.id;
      
    } catch (error) {
      console.error('Erreur dans beforeAll:', error);
    }
  }, 15000);

  afterAll(async () => {
    if (poolClosed) return;
    
    try {
      // Nettoyer les tables
      await pool.query('TRUNCATE TABLE user_permissions CASCADE');
      await pool.query('TRUNCATE TABLE users CASCADE');
      
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

  // Tests pour la création d'utilisateur
  describe('POST /api/users', () => {
    it('devrait créer un nouvel utilisateur en tant qu\'admin', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('username', newUser.username);
      expect(response.body.data).toHaveProperty('email', newUser.email);
      
      // Stocker l'ID pour les tests suivants
      userId = response.body.data.id;
    });

    it('ne devrait pas créer un utilisateur avec un nom d\'utilisateur existant', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...newUser,
          email: 'different@example.com'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('existe déjà');
    });

    it('ne devrait pas permettre à un utilisateur non-admin de créer un utilisateur', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          username: 'another_user',
          email: 'another@example.com',
          password: 'Another123!',
          full_name: 'Autre Utilisateur',
          role_id: 2
        });
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  // Tests pour la récupération des utilisateurs
  describe('GET /api/users', () => {
    it('devrait récupérer tous les utilisateurs en tant qu\'admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('ne devrait pas permettre à un utilisateur non-admin de récupérer tous les utilisateurs', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  // Tests pour la récupération d'un utilisateur spécifique
  describe('GET /api/users/:id', () => {
    it('devrait récupérer un utilisateur par ID en tant qu\'admin', async () => {
      // Vérification que l'ID est bien défini
      expect(userId).toBeDefined();
      
      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', userId);
      expect(response.body.data).toHaveProperty('username', newUser.username);
      expect(response.body.data).not.toHaveProperty('password'); // S'assurer que le mot de passe n'est pas retourné
    });

    it('devrait retourner 404 pour un ID utilisateur inexistant', async () => {
      const response = await request(app)
        .get('/api/users/9999999')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('non trouvé');
    });

    it('ne devrait pas permettre à un utilisateur non-admin de récupérer un utilisateur par ID', async () => {
      expect(userId).toBeDefined();
      
      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  // Tests pour la mise à jour d'un utilisateur
  describe('PUT /api/users/:id', () => {
    it('devrait mettre à jour un utilisateur en tant qu\'admin', async () => {
      expect(userId).toBeDefined();
      
      const updatedUser = {
        username: newUser.username,
        email: 'updated@example.com',
        full_name: 'Nom Mis à Jour',
        role_id: 2,
        is_active: true
      };
      
      const response = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedUser);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('email', updatedUser.email);
      expect(response.body.data).toHaveProperty('full_name', updatedUser.full_name);
    });

    it('ne devrait pas permettre à un utilisateur non-admin de mettre à jour un utilisateur', async () => {
      expect(userId).toBeDefined();
      
      const response = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          username: newUser.username,
          email: 'another-update@example.com',
          full_name: 'Autre Mise à Jour',
          role_id: 2,
          is_active: true
        });
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  // Tests pour le changement de mot de passe
  describe('PUT /api/users/profile/me/password', () => {
    it('devrait permettre à un utilisateur de changer son propre mot de passe', async () => {
      const newPassword = 'NewPassword123!';
      
      const response = await request(app)
        .put('/api/users/profile/me/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          current_password: testUser.password,
          new_password: newPassword
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('succès');
      
      // Vérifier que l'utilisateur peut se connecter avec le nouveau mot de passe
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: newPassword
        });
      
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('success', true);
      
      // Mettre à jour le token pour les tests suivants
      userToken = loginResponse.body.data.token;
    });

    it('ne devrait pas changer le mot de passe avec un mot de passe actuel incorrect', async () => {
      const response = await request(app)
        .put('/api/users/profile/me/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          current_password: 'WrongPassword',
          new_password: 'AnotherNew123!'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('incorrect');
    });
  });

  // Tests pour la mise à jour du profil utilisateur
  describe('PUT /api/users/profile/me', () => {
    it('devrait permettre à un utilisateur de mettre à jour son propre profil', async () => {
      const updatedProfile = {
        username: testUser.username,
        email: 'updated_user@example.com',
        full_name: 'Profil Mis à Jour'
      };
      
      const response = await request(app)
        .put('/api/users/profile/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updatedProfile);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('email', updatedProfile.email);
      expect(response.body.data).toHaveProperty('full_name', updatedProfile.full_name);
    });
  });

  // Tests pour la gestion des permissions
  describe('PUT /api/users/:id/permissions', () => {
    it('devrait mettre à jour les permissions d\'un utilisateur en tant qu\'admin', async () => {
      expect(userId).toBeDefined();
      
      const permissions = [
        { permission_name: 'client_read', is_granted: true },
        { permission_name: 'client_create', is_granted: false }
      ];
      
      const response = await request(app)
        .put(`/api/users/${userId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('succès');
    });

    it('devrait récupérer les permissions d\'un utilisateur en tant qu\'admin', async () => {
      expect(userId).toBeDefined();
      
      const response = await request(app)
        .get(`/api/users/${userId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
      // Vérifier que les permissions accordées précédemment sont présentes
      const clientReadPerm = response.body.data.find(p => p.permission_name === 'client_read');
      expect(clientReadPerm).toBeDefined();
      expect(clientReadPerm.is_granted).toBe(true);
    });
  });

  // Tests pour la gestion du statut utilisateur
  describe('PATCH /api/users/:id/status', () => {
    it('devrait désactiver un utilisateur en tant qu\'admin', async () => {
      expect(userId).toBeDefined();
      
      const response = await request(app)
        .patch(`/api/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: false });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('is_active', false);
      expect(response.body.message).toContain('désactivé');
    });

    it('devrait réactiver un utilisateur en tant qu\'admin', async () => {
      expect(userId).toBeDefined();
      
      const response = await request(app)
        .patch(`/api/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: true });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('is_active', true);
      expect(response.body.message).toContain('activé');
    });
  });

  // Tests pour l'historique des connexions
  describe('GET /api/users/:id/login-history', () => {
    it('devrait récupérer l\'historique des connexions d\'un utilisateur en tant qu\'admin', async () => {
      expect(userId).toBeDefined();
      
      const response = await request(app)
        .get(`/api/users/${userId}/login-history`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // Tests pour l'historique des permissions
  describe('GET /api/users/:id/permission-history', () => {
    it('devrait récupérer l\'historique des permissions d\'un utilisateur en tant qu\'admin', async () => {
      expect(userId).toBeDefined();
      
      const response = await request(app)
        .get(`/api/users/${userId}/permission-history`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // Tests pour la suppression d'utilisateur
  describe('DELETE /api/users/:id', () => {
    // Créons un utilisateur spécifiquement pour le test de suppression
    let deleteUserId;
    
    beforeAll(async () => {
      try {
        const deleteUserData = {
          username: 'user_to_delete',
          email: 'delete_user@example.com',
          password: 'DeleteUser123',
          full_name: 'Utilisateur à Supprimer',
          role_id: 2
        };
        
        const createResponse = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(deleteUserData);
        
        expect(createResponse.status).toBe(201);
        deleteUserId = createResponse.body.data.id;
        expect(deleteUserId).toBeDefined();
      } catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur à supprimer:', error);
      }
    });
    
    it('ne devrait pas permettre à un utilisateur non-admin de supprimer un utilisateur', async () => {
      expect(deleteUserId).toBeDefined();
      
      const response = await request(app)
        .delete(`/api/users/${deleteUserId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });

    it('devrait supprimer un utilisateur en tant qu\'admin', async () => {
      expect(deleteUserId).toBeDefined();
      
      const response = await request(app)
        .delete(`/api/users/${deleteUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('succès');
      
      // Vérifier que l'utilisateur n'existe plus
      const checkResponse = await request(app)
        .get(`/api/users/${deleteUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(checkResponse.status).toBe(404);
    });
    
    it('devrait retourner 404 pour la suppression d\'un utilisateur inexistant', async () => {
      const response = await request(app)
        .delete('/api/users/9999999')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('non trouvé');
    });
  });
});