-- Réinitialisation des séquences (optionnel, à utiliser si vous voulez réinitialiser les IDs)
ALTER SEQUENCE roles_id_seq RESTART WITH 1;
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE clients_id_seq RESTART WITH 1;
ALTER SEQUENCE versements_id_seq RESTART WITH 1;
ALTER SEQUENCE user_permissions_id_seq RESTART WITH 1;

-- Insertion des rôles par défaut
INSERT INTO roles (name, description, created_at) VALUES 
('ADMIN', 'Administrateur avec tous les droits', NOW()),
('USER', 'Utilisateur standard avec droits limités', NOW())
ON CONFLICT (name) DO NOTHING;

-- Création d'un utilisateur admin par défaut avec mot de passe hashé 'Admin123'
INSERT INTO users (username, email, password, full_name, role_id, is_active, created_at) VALUES 
('admin', 'admin@example.com', '$2a$12$r.noe1cF.1q9zdB.Sny7f.iTIFcEbkx7FWcvODvEh/xf1.4Nedaqi', 
 'Admin', (SELECT id FROM roles WHERE name = 'ADMIN'), true, NOW())
ON CONFLICT (email) DO NOTHING;

-- -- Insertion de quelques clients pour tester
-- INSERT INTO clients (account_number, name, balance, created_at) VALUES 
-- ('C001', 'Entreprise ABC', 0, NOW()),
-- ('C002', 'Société XYZ', 0, NOW()),
-- ('C003', 'Martin Dupont', 0, NOW())
-- ON CONFLICT (account_number) DO NOTHING;

-- Insertion des permissions par défaut
-- INSERT INTO user_permissions (user_id, permission_name, is_granted, created_at)
-- VALUES 
-- ((SELECT id FROM users WHERE email = 'admin@example.com'), 'client_create', true, NOW()),
-- ((SELECT id FROM users WHERE email = 'admin@example.com'), 'client_read', true, NOW()),
-- ((SELECT id FROM users WHERE email = 'admin@example.com'), 'client_update', true, NOW()),
-- ((SELECT id FROM users WHERE email = 'admin@example.com'), 'client_delete', true, NOW()),
-- ((SELECT id FROM users WHERE email = 'admin@example.com'), 'versement_create', true, NOW()),
-- ((SELECT id FROM users WHERE email = 'admin@example.com'), 'versement_read', true, NOW()),
-- ((SELECT id FROM users WHERE email = 'admin@example.com'), 'versement_update', true, NOW()),
-- ((SELECT id FROM users WHERE email = 'admin@example.com'), 'versement_delete', true, NOW()),
-- ((SELECT id FROM users WHERE email = 'admin@example.com'), 'audit_read', true, NOW()),
-- ((SELECT id FROM users WHERE email = 'admin@example.com'), 'user_manage', true, NOW())
-- ON CONFLICT (user_id, permission_name) DO NOTHING;

-- Ajout d'un utilisateur standard pour tester les différents niveaux d'accès
-- INSERT INTO users (username, email, password, full_name, role_id, is_active, created_at) VALUES 
-- ('user1', 'user1@example.com', '$2a$12$r.noe1cF.1q9zdB.Sny7f.iTIFcEbkx7FWcvODvEh/xf1.4Nedaqi', 
--  'Utilisateur Test', (SELECT id FROM roles WHERE name = 'USER'), true, NOW())
-- ON CONFLICT (email) DO NOTHING;

-- -- Ajouter des permissions limitées à l'utilisateur standard
-- INSERT INTO user_permissions (user_id, permission_name, is_granted, created_at)
-- VALUES 
-- ((SELECT id FROM users WHERE email = 'user1@example.com'), 'client_read', true, NOW()),
-- ((SELECT id FROM users WHERE email = 'user1@example.com'), 'versement_read', true, NOW()),
-- ((SELECT id FROM users WHERE email = 'user1@example.com'), 'versement_create', true, NOW())
-- ON CONFLICT (user_id, permission_name) DO NOTHING;

-- -- Ajouter des historiques de connexion pour les utilisateurs
-- INSERT INTO login_history (user_id, ip_address, user_agent, login_time, action_type) VALUES
-- ((SELECT id FROM users WHERE email = 'admin@example.com'), '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '2 days', 'LOGIN'),
-- ((SELECT id FROM users WHERE email = 'admin@example.com'), '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '2 days' + INTERVAL '2 hours', 'LOGOUT'),
-- ((SELECT id FROM users WHERE email = 'admin@example.com'), '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '1 day', 'LOGIN'),
-- ((SELECT id FROM users WHERE email = 'admin@example.com'), '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '1 day' + INTERVAL '3 hours', 'LOGOUT'),
-- ((SELECT id FROM users WHERE email = 'user1@example.com'), '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', NOW() - INTERVAL '1 day', 'LOGIN'),
-- ((SELECT id FROM users WHERE email = 'user1@example.com'), '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', NOW() - INTERVAL '1 day' + INTERVAL '1 hour', 'LOGOUT');

-- -- Ajouter des versements pour chaque client
-- INSERT INTO versements (client_id, numero_cheque, amount, description, created_by, created_at) VALUES
-- ((SELECT id FROM clients WHERE account_number = 'C001'), 'CHQ001', 1500.00, 'Premier versement', 
--  (SELECT id FROM users WHERE email = 'admin@example.com'), NOW() - INTERVAL '5 days'),
-- ((SELECT id FROM clients WHERE account_number = 'C001'), 'CHQ002', 2500.00, 'Deuxième versement', 
--  (SELECT id FROM users WHERE email = 'admin@example.com'), NOW() - INTERVAL '3 days'),
-- ((SELECT id FROM clients WHERE account_number = 'C002'), 'CHQ003', 3000.00, 'Versement initial', 
--  (SELECT id FROM users WHERE email = 'admin@example.com'), NOW() - INTERVAL '4 days'),
-- ((SELECT id FROM clients WHERE account_number = 'C003'), 'CHQ004', 750.00, 'Petit versement', 
--  (SELECT id FROM users WHERE email = 'user1@example.com'), NOW() - INTERVAL '2 days'),
-- ((SELECT id FROM clients WHERE account_number = 'C003'), 'CHQ005', 1250.00, 'Versement complémentaire', 
--  (SELECT id FROM users WHERE email = 'user1@example.com'), NOW() - INTERVAL '1 day');

-- -- Simuler quelques modifications de permissions pour l'historique
-- INSERT INTO permission_history (user_id, permission_name, is_granted, changed_by, changed_at)
-- VALUES
-- ((SELECT id FROM users WHERE email = 'user1@example.com'), 'client_update', false, 
--  (SELECT id FROM users WHERE email = 'admin@example.com'), NOW() - INTERVAL '5 days'),
-- ((SELECT id FROM users WHERE email = 'user1@example.com'), 'client_update', true, 
--  (SELECT id FROM users WHERE email = 'admin@example.com'), NOW() - INTERVAL '2 days'),
-- ((SELECT id FROM users WHERE email = 'user1@example.com'), 'versement_update', true, 
--  (SELECT id FROM users WHERE email = 'admin@example.com'), NOW() - INTERVAL '2 days');

-- -- Simuler une mise à jour d'un versement pour tester le trigger d'update
-- DO $$
-- BEGIN
--   PERFORM set_config('session.current_user_id', (SELECT id::text FROM users WHERE email = 'admin@example.com'), true);
--   UPDATE versements SET amount = 1600.00
--   WHERE numero_cheque = 'CHQ001';
-- END $$;

-- -- Simuler une suppression de versement pour tester le trigger de delete
-- DO $$
-- BEGIN
--   PERFORM set_config('session.current_user_id', (SELECT id::text FROM users WHERE email = 'admin@example.com'), true);
--   DELETE FROM versements 
--   WHERE numero_cheque = 'CHQ005' 
--   AND client_id = (SELECT id FROM clients WHERE account_number = 'C003');
-- END $$;