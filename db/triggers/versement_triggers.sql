-- Supprimer les triggers existants s'ils existent
DROP TRIGGER IF EXISTS trigger_update_balance_on_insert ON versements;
DROP TRIGGER IF EXISTS trigger_update_balance_on_update ON versements;
DROP TRIGGER IF EXISTS trigger_update_balance_on_delete ON versements;

-- Trigger pour mettre à jour automatiquement le solde client lors de l'insertion d'un versement
CREATE OR REPLACE FUNCTION update_client_balance_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour le solde du client
  UPDATE clients
  SET balance = balance + NEW.amount,
      updated_at = NOW()
  WHERE id = NEW.client_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_balance_on_insert
AFTER INSERT ON versements
FOR EACH ROW
EXECUTE FUNCTION update_client_balance_on_insert();

-- Trigger pour mettre à jour automatiquement le solde client lors de la mise à jour d'un versement
CREATE OR REPLACE FUNCTION update_client_balance_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour le solde du client selon la formule:
  -- nouveau solde = ancien solde + montant nouveau - montant ancien
  UPDATE clients
  SET balance = balance + (NEW.amount - OLD.amount),
      updated_at = NOW()
  WHERE id = NEW.client_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_balance_on_update
AFTER UPDATE ON versements
FOR EACH ROW
WHEN (OLD.amount IS DISTINCT FROM NEW.amount)
EXECUTE FUNCTION update_client_balance_on_update();

-- Trigger pour mettre à jour automatiquement le solde client lors de la suppression d'un versement
CREATE OR REPLACE FUNCTION update_client_balance_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Réduire le solde du client du montant du versement supprimé
  UPDATE clients
  SET balance = balance - OLD.amount,
      updated_at = NOW()
  WHERE id = OLD.client_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_balance_on_delete
AFTER DELETE ON versements
FOR EACH ROW
EXECUTE FUNCTION update_client_balance_on_delete();