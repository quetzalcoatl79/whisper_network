# 🔍 Audit Complet - Whisper Network

**Date**: 29 Décembre 2025  
**Version**: 1.0.0  
**État Global**: ⚠️ **70% - En cours de correction**

---

## 📋 Résumé Exécutif

| Domaine | État | Priorité | Travail |
|---------|------|----------|---------|
| **Anonymisation Noms/Prénoms** | 🟡 Partiel | HAUTE | ~3-4h |
| **Anonymisation Adresses** | 🔴 Cassée | CRITIQUE | ~5-6h |
| **Sécurité & RGPD** | 🟢 Bon | MOYEN | ~1-2h |
| **Performances** | 🟢 Bon | BAS | ~0-1h |
| **Tests & Logs** | 🟡 Incomplet | HAUTE | ~4-5h |
| **Infrastructure** | 🟢 Bon | BAS | ~0h |

---

## 🚨 Problèmes Identifiés

### 1. CRITIQUE: Adresses ne fonctionnent plus ❌

**Symptôme**: Les adresses ne sont pas anonymisées malgré la configuration.

**Cause Identifiée**:
```python
# main.py ligne 122: Le setting par défaut a un NOM DIFFÉRENT
"anonymize_address": True  # ← SINGULAR

# Mais en code, le setting attendu est:
settings.anonymize_addresses  # ← PLURAL (anonymizers.py ligne 595)
```

**Impact**: Les adresses ne sont jamais traitées car `anonymize_address` ≠ `anonymize_addresses`.

**Fichiers Affectés**:
- [main.py](main.py#L122) - Mauvaise clé dans les settings par défaut
- [anonymizers.py](whisper_network/anonymizers.py#L595) - Utilise la bonne clé (plural)
- [models.py](whisper_network/models.py#L111) - Accepte les deux noms

**Niveau de Gravité**: 🔴 **CRITIQUE**

---

### 2. HAUTE PRIORITÉ: Noms/Prénoms incomplets 🟡

**Symptôme**: Certains noms passent à la trappe, surtout les prénoms isolés et les noms composés.

**Causes Identifiées**:

#### a) Pattern FRENCH_NAME trop strict (ligne 278-290)
```regex
# Actuel: Accepte SEULEMENT:
# - "Prénom NOM" (ex: Sylvain JOLY)
# - "NOM Prénom" (ex: JOLY Sylvain)
# - "Prénom Nom" (ex: Marie Dupont)

# N'accepte PAS:
# ❌ Prénoms isolés (Jean, Marie seul)
# ❌ Noms isolés en majuscules (DUPONT seul)
# ❌ Noms composés avec tirets (Jean-Pierre, Dupont-Martin)
# ❌ Noms avec apostrophes (D'Artagnan, O'Connor)
# ❌ Accents spéciaux (Léa, Côme)
```

#### b) Fallback NLP limité
- Dépend de spaCy FR (modèle peut ne pas être installé)
- Si spaCy échoue, recours au regex trop strict
- Les modèles NLP ne détectent pas tous les prénoms français courants

#### c) Filtrage trop agressif (lignes 602-615)
- Supprime les matchs de noms qui chevauchent les adresses/emails
- Peut supprimer des vrais noms si une adresse est proche

**Fichiers Affectés**:
- [anonymizers.py](whisper_network/anonymizers.py#L278-L290) - Pattern insuffisant
- [anonymizers.py](whisper_network/anonymizers.py#L950-L1050) - Logique NLP incomplète
- [anonymizers.py](whisper_network/anonymizers.py#L602-L615) - Filtrage trop strict

**Exemple de Cas Manqués**:
```
❌ "Jean" → Pas détecté
❌ "Marie" → Pas détecté  
❌ "Jean-Pierre Dupont" → Partiellement détecté
❌ "D'Artagnan" → Pas détecté
❌ "Léa" → Peut être manqué
```

**Niveau de Gravité**: 🟡 **HAUTE PRIORITÉ**

---

### 3. MOYEN: Performances NLP suboptimales 🟡

**Symptôme**: Lent si les modèles NLP sont chargés.

**Causes**:
- Chargement de multiples modèles spaCy (FR + EN)
- Pas de cache des modèles entre requêtes
- Pas de limitation de la taille des textes
- Pas de timeout pour les analyses NLP

**Fichiers Affectés**:
- [anonymizers.py](whisper_network/anonymizers.py#L373-L395) - Initialisation des modèles

**Niveau de Gravité**: 🟡 **MOYEN**

---

### 4. MOYEN: Tests incomplets 🟡

**Symptôme**: Pas de tests pour valider les patterns et la cohérence.

**Manques**:
- ❌ Tests unitaires des patterns regex
- ❌ Tests d'intégration pour le workflow complet
- ❌ Tests de régression après chaque correction
- ❌ Fixtures de test pour noms/adresses réels
- ❌ Validation des performances

**Fichiers Concernés**: Structure `tests/` supprimée lors du nettoyage

**Niveau de Gravité**: 🟡 **MOYEN**

---

### 5. BAS: Documentation de configuration 📝

**Symptôme**: Les settings par défaut ne sont pas clairs.

**Manques**:
- Quelle clé utiliser: `anonymize_address` ou `anonymize_addresses`?
- Quels settings sont exposés à l'API vs internes?
- Ordre d'exécution des anonymisations (important pour les priorités)

**Fichiers Affectés**:
- [main.py](main.py#L115-L145) - Endpoint `/settings`

**Niveau de Gravité**: 🟢 **BAS**

---

## 📊 Analyse détaillée par composant

### ✅ Points Forts

1. **Architecture modulaire** - Bien séparée (FastAnonymizer, FileHandler, etc.)
2. **Session Management** - Persistance des mappings fonctionnelle
3. **RGPD Compliant** - Validation des préférences en place
4. **Docker Ready** - Infrastructure de déploiement solide
5. **API Bien Structurée** - Endpoints clairs et documentés
6. **Rate Limiting & CORS** - Sécurité en place
7. **Détection Multilingue** - Support FR + EN (en NLP)

### ⚠️ Points À Améliorer

1. **Pattern Matching Régressif** - Plus restrictif après nettoyage
2. **Incohérence Settings** - `address` vs `addresses`
3. **NLP non obligatoire** - Fallback insuffisant
4. **Manque de Logs Détaillés** - Hard à debugger les cas manqués
5. **Pas de Métriques** - Pas de tracking du taux de couverture

---

## 📈 User Stories & Fixes

### 🔴 URGENT - Sprint 1 (1 jour)

#### US-001: Fixer l'incohérence des settings d'adresses
**Estimation**: 30 min

**Description**:
```
EN TANT QUE utilisateur de l'API
JE VEUX que le setting "anonymize_address" marche correctement
AFIN QUE les adresses soient anonymisées
```

**Acceptance Criteria**:
- [ ] Le setting `anonymize_address` et `anonymize_addresses` acceptés (backward compat)
- [ ] Les adresses sont anonymisées dans tous les tests
- [ ] Documentation mise à jour

**Tâches**:
1. Renommer `anonymize_address` → `anonymize_addresses` (ou accepter les deux)
2. Mettre à jour [main.py](main.py#L122) dans `get_default_anonymization_settings()`
3. Ajouter mapping dans [models.py](whisper_network/models.py) pour backward compat
4. Tester avec vraies adresses

---

#### US-002: Améliorer détection des noms simples
**Estimation**: 2-3 heures

**Description**:
```
EN TANT QUE utilisateur
JE VEUX que les noms et prénoms simples soient détectés (Jean, Marie, DUPONT)
AFIN QUE l'anonymisation soit complète
```

**Acceptance Criteria**:
- [ ] Les prénoms courants français sont détectés
- [ ] Les noms isolés en MAJUSCULES sont détectés
- [ ] Les noms composés (Jean-Pierre) sont gérés
- [ ] Les noms avec apostrophes (D'Artagnan) sont gérés
- [ ] 95% des noms communs français détectés

**Tâches**:

**Tâche 2.1: Créer liste de prénoms/noms courants**
```python
FRENCH_FIRST_NAMES = {
    'Jean', 'Marie', 'Pierre', 'Jacques', 'André', 'Michèle', 'Nicole',
    'Alain', 'Anne', 'Dominique', 'Joël', 'Sylvain', 'Léa', 'Côme', ...
}

FRENCH_LAST_NAMES = {
    'Dupont', 'Martin', 'Bernard', 'Thomas', 'Robert', 'Richard', ...
}
```

**Tâche 2.2: Améliorer pattern FRENCH_NAME**
```python
# Ajouter support pour:
# - Prénoms isolés de dictionnaire
# - Noms isolés en MAJUSCULES
# - Noms composés (Jean-Pierre)
# - Apostrophes (D'Artagnan, O'Connor)
# - Accents (Léa, Côme, François)
```

**Tâche 2.3: Ajouter fallback robuste si NLP indisponible**
```python
# Si spaCy non disponible:
# 1. Utiliser dico prénoms/noms
# 2. Puis regex amélioré
# 3. Puis heuristique contextuelle
```

**Tâche 2.4: Créer tests de régression**
```
Cas de test attendus:
✓ "Jean est venu" → anonymisé
✓ "DUPONT et MARTIN" → anonymisés
✓ "Jean-Pierre Dupont" → anonymisé
✓ "D'Artagnan" → anonymisé
✓ "Léa" → anonymisée
```

---

#### US-003: Fixer le filtrage trop agressif des noms
**Estimation**: 1 heure

**Description**:
```
EN TANT QUE utilisateur
JE VEUX que les noms ne soient pas supprimés juste parce qu'une adresse est proche
AFIN QUE le texte soit correctement anonymisé
```

**Acceptance Criteria**:
- [ ] Les noms et adresses peuvent coexister
- [ ] Pas de faux négatifs dues aux overlaps
- [ ] Performance ne dégradée

**Tâches**:
1. Revoir logique de filtrage [anonymizers.py](whisper_network/anonymizers.py#L602-L615)
2. Utiliser interval trees ou smart range checking
3. Tester overlap edge cases

---

### 🟡 IMPORTANT - Sprint 2 (2 jours)

#### US-004: Améliorer performances NLP
**Estimation**: 2-3 heures

**Description**:
```
EN TANT QUE admin de l'API
JE VEUX que les temps de réponse soient < 500ms
AFIN QUE l'API soit utilisable en production
```

**Acceptance Criteria**:
- [ ] Temps moyen anonymisation < 100ms (< 500 chars)
- [ ] Temps moyen anonymisation < 500ms (< 5000 chars)
- [ ] Cache des modèles NLP entre requêtes
- [ ] Métriques de performance disponibles

**Tâches**:
1. Implémenter singleton pour modèles NLP
2. Ajouter limite de taille de texte
3. Ajouter timeout pour analyses NLP
4. Optionnel: Passer à FastText ou DistilBERT (léger)

---

#### US-005: Ajouter tests et métriques
**Estimation**: 4-5 heures

**Description**:
```
EN TANT QUE développeur
JE VEUX avoir une suite de tests robuste
AFIN QUE les changements ne cassent rien
```

**Acceptance Criteria**:
- [ ] Tests unitaires des patterns (>90% couverture)
- [ ] Tests d'intégration du workflow complet
- [ ] Tests de régression pour cas manqués
- [ ] Fixtures avec vrais noms/adresses français
- [ ] Rapport de couverture disponible

**Structure de tests**:
```
tests/
├── unit/
│   ├── test_patterns.py (patterns regex)
│   ├── test_anonymizers.py (logique core)
│   └── test_name_detection.py (détection noms)
├── integration/
│   ├── test_workflow.py (workflow complet)
│   └── test_api_endpoints.py (API routes)
├── fixtures/
│   ├── names.json (noms français)
│   ├── addresses.json (adresses françaises)
│   └── edge_cases.json (cas limites)
└── conftest.py (config pytest)
```

**Tâches**:
1. Créer structure de tests
2. Écrire tests des patterns
3. Écrire tests d'intégration
4. Fixtures de données réelles
5. CI/CD avec pytest + coverage

---

### 🟢 OPPORTUNITÉS - Sprint 3+ (1-2 jours)

#### US-006: Ajouter détection d'autres données sensibles
**Estimation**: 2-3 heures

**Description**:
```
EN TANT QUE entreprise RGPD-compliant
JE VEUX détecter plus de types de données sensibles
AFIN QUE l'anonymisation soit exhaustive
```

**Nouveaux patterns à ajouter**:
- Numéros de dossier (LEGAL_CASE)
- Badges d'accès
- Références de congés
- Codes projet/internes
- Références factures
- Plaques d'immatriculation

---

#### US-007: Ajouter logging détaillé
**Estimation**: 1-2 heures

**Description**:
```
EN TANT QUE admin
JE VEUX voir pourquoi un nom/adresse n'a pas été détecté
AFIN QUE je puisse améliorer les patterns
```

**Improvements**:
- Log chaque match avec confidence score
- Log chaque rejection avec raison
- Métriques par type de données
- Dashboard de monitoring

---

## 🛠️ Plan d'Implémentation Recommandé

### Phase 1: CRITIQUE (1 jour) 🔴
1. **US-001**: Fixer les settings d'adresses (30 min)
2. **US-002**: Améliorer détection noms (2-3h)
3. **US-003**: Fixer filtrage overlaps (1h)

**Résultat**: Adresses et noms fonctionnent correctement

### Phase 2: IMPORTANT (2 jours) 🟡
4. **US-004**: Performances NLP (2-3h)
5. **US-005**: Suite de tests (4-5h)

**Résultat**: Code stable, testable, performant

### Phase 3: OPTIMIZATION (2+ jours) 🟢
6. **US-006**: Données sensibles étendues (2-3h)
7. **US-007**: Logging détaillé (1-2h)

**Résultat**: Production-ready, observable

---

## 📝 Checklist de Validation

### Avant Merge
- [ ] Tous les tests passent
- [ ] Coverage > 85%
- [ ] Pas de warnings/errors
- [ ] Adresses et noms testés
- [ ] Performance < 500ms

### Avant Production
- [ ] Tests de charge
- [ ] Données réelles testées
- [ ] RGPD audit passé
- [ ] Documentation à jour
- [ ] Monitoring en place

---

## 🔗 Ressources Utiles

**Listes de noms/prénoms français**:
- https://data.gouv.fr/ (données publiques)
- `INSEE_prenoms.csv` (répartition prénoms)

**Patterns d'adresses françaises**:
- RFC 4291 (IPv6 dans adresses)
- NF Z 10-011 (norme adresse postale française)

**Tests et Métriques**:
- pytest + pytest-cov
- coverage.py
- Hypothesis (property-based testing)

---

## 📞 Notes de Développement

### Configuration Locale de Test
```bash
# Tester anonymisation adresses
curl -X POST http://localhost:8000/anonymize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Habitant au 42 rue de la Paix, 75000 Paris",
    "settings": {"anonymize_addresses": true}
  }'

# Tester prénoms
curl -X POST http://localhost:8000/anonymize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Jean et Marie sont allés chez Dupont",
    "settings": {"anonymize_names": true}
  }'
```

### Debug des Patterns
```python
import re
from whisper_network.anonymizers import PatternSet

patterns = PatternSet()

# Test pattern d'adresses
test_address = "42 rue de la Paix, 75000 Paris"
print(patterns.FRENCH_COMPLETE_ADDRESS.findall(test_address))

# Test pattern de noms
test_name = "Jean Dupont"
print(patterns.FRENCH_NAME.findall(test_name))
```

---

**Créé par**: Analyse automatisée  
**Dernière mise à jour**: 29 Décembre 2025  
**Prochaine révision**: Après Phase 1 complétée
