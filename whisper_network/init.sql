-- ============================================
-- 🔐 Whisper Network - Base PostgreSQL
-- ============================================
-- ⚠️ SÉCURITÉ : Stockage UNIQUEMENT des préférences UI
-- ❌ PAS de mappings d'anonymisation (données confidentielles)
-- ✅ Mappings restent en cache Redis (éphémère, TTL)
-- ============================================

-- Extension UUID (si pas déjà activée)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: user_preferences
-- ============================================
-- Stocke UNIQUEMENT les préférences d'interface utilisateur
-- Aucune donnée confidentielle (emails, noms, etc.)
-- ============================================

CREATE TABLE IF NOT EXISTS user_preferences (
    -- Identifiant unique généré par l'extension (anonyme)
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Préférences utilisateur (JSON)
    -- Exemple: {"anonymize_email": true, "anonymize_phone": true, "language": "fr"}
    preferences JSONB NOT NULL DEFAULT '{}'::JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Index pour optimiser les requêtes
-- ============================================

-- Index sur UUID (PK déjà indexé mais explicite pour clarté)
CREATE INDEX IF NOT EXISTS idx_user_preferences_uuid 
ON user_preferences(uuid);

-- Index GIN pour recherches JSON (si besoin de filtrer par préférences)
CREATE INDEX IF NOT EXISTS idx_user_preferences_preferences 
ON user_preferences USING GIN (preferences);

-- Index sur updated_at pour nettoyage des comptes inactifs
CREATE INDEX IF NOT EXISTS idx_user_preferences_updated_at 
ON user_preferences(updated_at);

-- ============================================
-- Trigger pour auto-update du timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Politique de rétention (nettoyage auto)
-- ============================================
-- Supprimer les préférences inactives depuis 1 an (optionnel)
-- À exécuter via CRON job : DELETE FROM user_preferences WHERE updated_at < NOW() - INTERVAL '1 year';

-- ============================================
-- Contraintes de sécurité (RGPD)
-- ============================================
-- ⚠️ Les préférences ne doivent contenir QUE des booléens/strings/nombres
-- ❌ INTERDIT : stocker emails, noms, téléphones, IPs dans `preferences`
-- ✅ AUTORISÉ : {anonymize_email: true, theme: "dark", language: "fr"}

-- Validation basique (JSON bien formé)
ALTER TABLE user_preferences
ADD CONSTRAINT check_preferences_is_object
CHECK (jsonb_typeof(preferences) = 'object');

-- ============================================
-- Exemple de données (pour tests)
-- ============================================
-- INSERT INTO user_preferences (uuid, preferences) VALUES
-- ('550e8400-e29b-41d4-a716-446655440000', '{"anonymize_email": true, "anonymize_phone": true, "anonymize_iban": true, "language": "fr"}'),
-- ('6ba7b810-9dad-11d1-80b4-00c04fd430c8', '{"anonymize_email": false, "anonymize_phone": true, "theme": "dark"}');

-- ============================================
-- Fonction utilitaire : Récupérer préférences
-- ============================================
CREATE OR REPLACE FUNCTION get_user_preferences(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    user_prefs JSONB;
BEGIN
    SELECT preferences INTO user_prefs
    FROM user_preferences
    WHERE uuid = user_uuid;
    
    -- Si aucune préférence trouvée, retourner objet vide
    IF user_prefs IS NULL THEN
        RETURN '{}'::JSONB;
    END IF;
    
    RETURN user_prefs;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Fonction utilitaire : Sauvegarder préférences (UPSERT)
-- ============================================
CREATE OR REPLACE FUNCTION save_user_preferences(user_uuid UUID, user_prefs JSONB)
RETURNS void AS $$
BEGIN
    INSERT INTO user_preferences (uuid, preferences)
    VALUES (user_uuid, user_prefs)
    ON CONFLICT (uuid) DO UPDATE
    SET preferences = EXCLUDED.preferences,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Vue de statistiques (optionnel, pour monitoring)
-- ============================================
CREATE OR REPLACE VIEW user_stats AS
SELECT
    COUNT(*) AS total_users,
    COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '7 days') AS active_7_days,
    COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '30 days') AS active_30_days,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS new_users_7_days
FROM user_preferences;

-- ============================================
-- Logs d'audit (optionnel, si besoin)
-- ============================================
-- CREATE TABLE IF NOT EXISTS audit_log (
--     id SERIAL PRIMARY KEY,
--     uuid UUID REFERENCES user_preferences(uuid) ON DELETE CASCADE,
--     action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
--     old_preferences JSONB,
--     new_preferences JSONB,
--     timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- ============================================
-- ✅ Base de données initialisée
-- ============================================
-- PostgreSQL prêt pour stocker les préférences utilisateur
-- ❌ Aucune donnée confidentielle ne sera stockée ici
-- 🔥 Mappings d'anonymisation restent en Redis (cache éphémère)
-- ============================================
