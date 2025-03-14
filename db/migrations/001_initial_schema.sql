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

-- Tables pour l'audit et les permissions
CREATE TABLE IF NOT EXISTS audit_versement (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  old_values JSONB,
  new_values JSONB,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  versement_id INTEGER REFERENCES versements(id) ON DELETE SET NULL,
  old_balance DECIMAL(15, 2),
  new_balance DECIMAL(15, 2),
  action_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_versements_client_id ON versements(client_id);
CREATE INDEX IF NOT EXISTS idx_versements_created_by ON versements(created_by);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_versement(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_versement(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_client_id ON audit_versement(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_versement_id ON audit_versement(versement_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_versement(action);
CREATE INDEX IF NOT EXISTS idx_audit_action_type ON audit_versement(action_type);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_history_user_id ON permission_history(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Fonction de mise à jour du timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Déclencheurs pour chaque table avec updated_at
CREATE TRIGGER update_roles_timestamp
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_clients_timestamp
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_versements_timestamp
BEFORE UPDATE ON versements
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_user_permissions_timestamp
BEFORE UPDATE ON user_permissions
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

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

-- Ajout d'une contrainte pour s'assurer de la cohérence entre entity_type et les IDs
ALTER TABLE audit_versement 
ADD CONSTRAINT check_entity_type_consistency 
CHECK (
  (entity_type = 'versement' AND versement_id IS NOT NULL) OR
  (entity_type = 'client' AND client_id IS NOT NULL) OR
  (entity_type NOT IN ('versement', 'client'))
);

-- Amélioration de la sécurité du mot de passe
ALTER TABLE users 
ADD CONSTRAINT strong_password CHECK (length(password) >= 60); -- Pour les hash bcrypt

-- Ajout d'un commentaire explicatif
COMMENT ON COLUMN audit_versement.entity_id IS 'ID de l''entité concernée. Peut être redondant avec versement_id ou client_id selon entity_type';