-- Supprimer d'abord les contraintes existantes
ALTER TABLE IF EXISTS versements DROP CONSTRAINT IF EXISTS positive_amount;
ALTER TABLE IF EXISTS clients DROP CONSTRAINT IF EXISTS positive_balance;
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS valid_email;
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS valid_username;
ALTER TABLE IF EXISTS audit_versement DROP CONSTRAINT IF EXISTS check_entity_type_consistency;
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS strong_password;

-- Supprimer d'abord les triggers existants
DROP TRIGGER IF EXISTS update_roles_timestamp ON roles;
DROP TRIGGER IF EXISTS update_users_timestamp ON users;
DROP TRIGGER IF EXISTS update_clients_timestamp ON clients;
DROP TRIGGER IF EXISTS update_versements_timestamp ON versements;
DROP TRIGGER IF EXISTS update_user_permissions_timestamp ON user_permissions;
DROP TRIGGER IF EXISTS versement_after_insert ON versements;
DROP TRIGGER IF EXISTS versement_after_update ON versements;
DROP TRIGGER IF EXISTS versement_before_delete ON versements;
DROP TRIGGER IF EXISTS trigger_update_balance_on_insert ON versements;
DROP TRIGGER IF EXISTS trigger_update_balance_on_update ON versements;
DROP TRIGGER IF EXISTS trigger_update_balance_on_delete ON versements;
DROP TRIGGER IF EXISTS client_before_delete ON clients;

-- Supprimer l'ancienne table d'audit et la table deleted_clients si elle existe
DROP TABLE IF EXISTS audit_versement;
DROP TABLE IF EXISTS deleted_clients;

-- Tables pour la gestion des utilisateurs
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(100),
  role_id INTEGER REFERENCES roles(id) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  last_logout TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  last_failed_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  login_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  action_type VARCHAR(20) NOT NULL
);

-- Table pour stocker les informations des clients supprimés
CREATE TABLE IF NOT EXISTS deleted_clients (
  original_id INTEGER PRIMARY KEY,
  account_number VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tables pour la gestion des clients et versements
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  account_number VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  balance DECIMAL(15, 2) DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS versements (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  numero_cheque VARCHAR(50) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- Nouvelle table d'audit simplifiée
CREATE TABLE IF NOT EXISTS audit_versement (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(50) NOT NULL, -- Type d'action (INSERT, UPDATE, DELETE)
  date_operation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  numero_versement VARCHAR(50), -- Correspond à numero_cheque
  numero_compte VARCHAR(50), -- Correspond à account_number du client
  nom_client VARCHAR(100),
  montant_ancien DECIMAL(15, 2),
  montant_nouveau DECIMAL(15, 2),
  utilisateur VARCHAR(50), -- nom d'utilisateur qui a effectué l'opération
  versement_id INTEGER,
  client_id INTEGER
);

-- Tables pour les permissions
CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  permission_name VARCHAR(50) NOT NULL,
  is_granted BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, permission_name)
);

CREATE TABLE IF NOT EXISTS permission_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  permission_name VARCHAR(50) NOT NULL,
  is_granted BOOLEAN,
  changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Fonction pour préparer la suppression d'un versement
CREATE OR REPLACE FUNCTION prepare_versement_delete(p_versement_id INTEGER, p_user_id INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Définir une variable de session pour stocker l'ID de l'utilisateur
    PERFORM set_config('session.current_user_id', p_user_id::TEXT, false);
    
    -- Vous pouvez ajouter d'autres opérations préparatoires ici si nécessaire
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_versements_client_id ON versements(client_id);
CREATE INDEX IF NOT EXISTS idx_versements_created_by ON versements(created_by);
CREATE INDEX IF NOT EXISTS idx_audit_versement_date ON audit_versement(date_operation);
CREATE INDEX IF NOT EXISTS idx_audit_versement_numero ON audit_versement(numero_versement);
CREATE INDEX IF NOT EXISTS idx_audit_versement_client ON audit_versement(nom_client);
CREATE INDEX IF NOT EXISTS idx_audit_versement_utilisateur ON audit_versement(utilisateur);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_history_user_id ON permission_history(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_deleted_clients_original_id ON deleted_clients(original_id);

-- Ajout de contraintes CHECK pour les amounts positifs
ALTER TABLE versements 
ADD CONSTRAINT positive_amount CHECK (amount > 0);

ALTER TABLE clients 
ADD CONSTRAINT positive_balance CHECK (balance >= 0);

-- Ajout de contraintes de validation pour les emails et noms d'utilisateur
ALTER TABLE users 
ADD CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE users 
ADD CONSTRAINT valid_username CHECK (length(username) >= 3 AND username ~* '^[A-Za-z0-9_]+$');

-- Amélioration de la sécurité du mot de passe
ALTER TABLE users 
ADD CONSTRAINT strong_password CHECK (length(password) >= 60); -- Pour les hash bcrypt