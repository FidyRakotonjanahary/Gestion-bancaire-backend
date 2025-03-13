-- Insertion des rôles par défaut
INSERT INTO roles (name, description, created_at) VALUES 
('ADMIN', 'Administrateur avec tous les droits', NOW()),
('USER', 'Utilisateur standard avec droits limités', NOW())
ON CONFLICT (name) DO NOTHING;

-- Création d'un utilisateur admin par défaut avec mot de passe hashé 'admin123'
INSERT INTO users (username, email, password, full_name, role_id, is_active, created_at) VALUES 
('admin', 'admin@example.com', '$2a$10$XDCGmvZlMtgUYR5TI5U4/.uF7qRnEmP1ErA8w1a5gQ2aznQGjXKZK', 
 'Admin', (SELECT id FROM roles WHERE name = 'ADMIN'), true, NOW())
ON CONFLICT (email) DO NOTHING;

-- Insertion de quelques clients pour tester
INSERT INTO clients (account_number, name, balance, created_at) VALUES 
('C001', 'Entreprise ABC', 0, NOW()),
('C002', 'Société XYZ', 0, NOW()),
('C003', 'Martin Dupont', 0, NOW())
ON CONFLICT (account_number) DO NOTHING;

-- Insertion des permissions par défaut
INSERT INTO user_permissions (user_id, permission_name, is_granted, created_at)
VALUES 
((SELECT id FROM users WHERE email = 'admin@example.com'), 'client_create', true, NOW()),
((SELECT id FROM users WHERE email = 'admin@example.com'), 'client_read', true, NOW()),
((SELECT id FROM users WHERE email = 'admin@example.com'), 'client_update', true, NOW()),
((SELECT id FROM users WHERE email = 'admin@example.com'), 'client_delete', true, NOW()),
((SELECT id FROM users WHERE email = 'admin@example.com'), 'versement_create', true, NOW()),
((SELECT id FROM users WHERE email = 'admin@example.com'), 'versement_read', true, NOW()),
((SELECT id FROM users WHERE email = 'admin@example.com'), 'versement_update', true, NOW()),
((SELECT id FROM users WHERE email = 'admin@example.com'), 'versement_delete', true, NOW()),
((SELECT id FROM users WHERE email = 'admin@example.com'), 'audit_read', true, NOW()),
((SELECT id FROM users WHERE email = 'admin@example.com'), 'user_manage', true, NOW())
ON CONFLICT (user_id, permission_name) DO NOTHING;