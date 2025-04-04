DROP TRIGGER IF EXISTS versement_insert_trigger ON versements;
DROP TRIGGER IF EXISTS versement_update_trigger ON versements;
DROP TRIGGER IF EXISTS versement_delete_trigger ON versements;

-- Fonction trigger pour l'insertion d'un versement dans l'audit
CREATE OR REPLACE FUNCTION audit_versement_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_numero_compte VARCHAR(50);
    v_nom_client VARCHAR(100);
    v_username VARCHAR(50);
    v_solde_actuel NUMERIC;
BEGIN
    -- Récupérer les informations du client
    SELECT c.account_number, c.name, c.balance
    INTO v_numero_compte, v_nom_client, v_solde_actuel
    FROM clients c
    WHERE c.id = NEW.client_id;
    
    -- Mettre à jour le solde du client
    UPDATE clients
    SET balance = v_solde_actuel + NEW.amount
    WHERE id = NEW.client_id;
    
    -- Récupérer le nom d'utilisateur
    SELECT username
    INTO v_username
    FROM users
    WHERE id = NEW.created_by;
    
    -- Insérer dans l'audit avec montant_ancien = ancien solde du client
    INSERT INTO audit_versement (
        action_type, 
        numero_versement, 
        numero_compte, 
        nom_client, 
        montant_ancien, 
        montant_nouveau, 
        utilisateur,
        versement_id,
        client_id
    ) VALUES (
        'INSERT', 
        NEW.numero_cheque, 
        v_numero_compte, 
        v_nom_client, 
        COALESCE(v_solde_actuel, 0), -- Utiliser le solde actuel (avant mise à jour) comme montant ancien
        v_solde_actuel + NEW.amount, -- Nouveau solde après versement
        v_username,
        NEW.id,
        NEW.client_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour la mise à jour d'un versement dans l'audit
CREATE OR REPLACE FUNCTION audit_versement_update()
RETURNS TRIGGER AS $$
DECLARE
    v_numero_compte VARCHAR(50);
    v_nom_client VARCHAR(100);
    v_username VARCHAR(50);
    v_solde_actuel NUMERIC;
    v_difference NUMERIC;
BEGIN
    -- Ne faire l'audit que si le montant a changé
    IF NEW.amount = OLD.amount THEN
        RETURN NEW;
    END IF;
    
    -- Calculer la différence entre l'ancien et le nouveau montant
    v_difference := NEW.amount - OLD.amount;
    
    -- Récupérer les informations du client
    SELECT c.account_number, c.name, c.balance
    INTO v_numero_compte, v_nom_client, v_solde_actuel
    FROM clients c
    WHERE c.id = NEW.client_id;
    
    -- Mettre à jour le solde du client avec la différence
    UPDATE clients
    SET balance = v_solde_actuel + v_difference
    WHERE id = NEW.client_id;
    
    -- Récupérer le nom d'utilisateur qui fait la modification
    SELECT username
    INTO v_username
    FROM users
    WHERE id = (SELECT created_by FROM versements WHERE id = NEW.id);
    
    -- Insérer dans l'audit
    INSERT INTO audit_versement (
        action_type, 
        numero_versement, 
        numero_compte, 
        nom_client, 
        montant_ancien, 
        montant_nouveau, 
        utilisateur,
        versement_id,
        client_id
    ) VALUES (
        'UPDATE', 
        NEW.numero_cheque, 
        v_numero_compte, 
        v_nom_client, 
        v_solde_actuel, -- Utiliser le solde actuel avant la mise à jour
        v_solde_actuel + v_difference, -- Nouveau solde après modification
        v_username,
        NEW.id,
        NEW.client_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Modification de la fonction de suppression pour mieux gérer les suppressions en cascade
CREATE OR REPLACE FUNCTION audit_versement_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_numero_compte VARCHAR(50);
    v_nom_client VARCHAR(100);
    v_username VARCHAR(50);
    v_client_id INTEGER;
    v_solde_actuel NUMERIC;
    v_client_record RECORD;
BEGIN
    -- Sauvegarder l'ID du client pour référence
    v_client_id := OLD.client_id;
    
    -- ÉTAPE 1: Essayer de récupérer les informations depuis la table clients
    SELECT c.* INTO v_client_record FROM clients c WHERE c.id = v_client_id;
    
    IF FOUND THEN
        -- Le client existe encore
        v_numero_compte := v_client_record.account_number;
        v_nom_client := v_client_record.name;
        v_solde_actuel := v_client_record.balance;
        
        -- Mettre à jour le solde du client
        UPDATE clients
        SET balance = v_solde_actuel - OLD.amount
        WHERE id = v_client_id;
    ELSE
        -- ÉTAPE 2: Le client n'existe pas, chercher dans deleted_clients
        BEGIN
            SELECT dc.account_number, dc.name, dc.balance 
            INTO v_numero_compte, v_nom_client, v_solde_actuel
            FROM deleted_clients dc
            WHERE dc.original_id = v_client_id;
            
            EXCEPTION WHEN OTHERS THEN
                -- Si cette requête échoue aussi, chercher dans l'audit des versements récents
                BEGIN
                    SELECT numero_compte, nom_client, montant_nouveau 
                    INTO v_numero_compte, v_nom_client, v_solde_actuel
                    FROM audit_versement
                    WHERE client_id = v_client_id
                    ORDER BY date_operation DESC
                    LIMIT 1;
                EXCEPTION WHEN OTHERS THEN
                    -- Si toutes les tentatives échouent, utiliser des valeurs par défaut
                    v_numero_compte := 'Compte inconnu (ID: ' || COALESCE(v_client_id::TEXT, 'N/A') || ')';
                    v_nom_client := 'Client inconnu (ID: ' || COALESCE(v_client_id::TEXT, 'N/A') || ')';
                    v_solde_actuel := OLD.amount; -- Considérer que le solde était exactement le montant du versement
                END;
        END;
    END IF;
    
    -- ÉTAPE 3: Récupérer l'utilisateur qui a effectué la suppression
    BEGIN
        -- Essayer d'abord la variable de session
        SELECT username 
        INTO v_username
        FROM users 
        WHERE id = current_setting('session.current_user_id', true)::INTEGER;
    EXCEPTION WHEN OTHERS THEN
        -- Si la variable de session n'est pas définie, continuer
        NULL;
    END;
    
    -- Si l'utilisateur n'a pas été trouvé via la session, utiliser created_by
    IF v_username IS NULL THEN
        BEGIN
            SELECT username INTO v_username FROM users WHERE id = OLD.created_by;
        EXCEPTION WHEN OTHERS THEN
            -- Si cette requête échoue, utiliser une valeur par défaut
            v_username := 'système';
        END;
    END IF;
    
    -- ÉTAPE 4: Insérer dans l'audit avec toutes les informations disponibles
    INSERT INTO audit_versement (
        action_type, 
        numero_versement, 
        numero_compte, 
        nom_client, 
        montant_ancien, 
        montant_nouveau,
        utilisateur,
        versement_id,
        client_id
    ) VALUES (
        CASE 
            WHEN TG_OP = 'DELETE' THEN 'DELETE'
            ELSE TG_OP -- Pour être flexible si ce trigger est utilisé pour d'autres opérations à l'avenir
        END,
        OLD.numero_cheque, 
        v_numero_compte, 
        v_nom_client, 
        v_solde_actuel, -- Solde avant suppression
        v_solde_actuel - OLD.amount, -- Nouveau solde après suppression
        v_username,
        OLD.id,
        v_client_id
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;



-- Attacher les triggers aux événements correspondants
CREATE TRIGGER versement_insert_trigger
AFTER INSERT ON versements
FOR EACH ROW
EXECUTE FUNCTION audit_versement_insert();

CREATE TRIGGER versement_update_trigger
AFTER UPDATE ON versements
FOR EACH ROW
EXECUTE FUNCTION audit_versement_update();

CREATE TRIGGER versement_delete_trigger
BEFORE DELETE ON versements
FOR EACH ROW
EXECUTE FUNCTION audit_versement_delete();