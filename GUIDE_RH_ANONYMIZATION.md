# 🏢 Guide d'Anonymisation des Données RH

> Comment anonymiser les données RH et entreprise avec Whisper Network

---

## 📊 **Données RH Supportées**

### ✅ **Disponible MAINTENANT (Patterns Regex)**

| Type | Exemples Détectés | Token Généré |
|------|-------------------|--------------|
| **Matricules** | `EMP12345`, `MAT-0001`, `EMPL_ABC123` | `MATRICULE_1` |
| **Salaires** | `3500€ brut`, `2800 EUR net`, `45000€/an` | `SALAIRE_1` |
| **Évaluations** | `Note: A+`, `Performance: 4/5`, `Excellent` | `EVALUATION_1` |
| **Plannings** | `09h00-17h30`, `Shift: Matin`, `Poste: Nuit` | `PLANNING_1` |

### 🔧 **Comment Activer**

#### Dans l'Extension

1. Ouvrir la popup Whisper Network
2. Scroller jusqu'à **"🏢 Données RH / Entreprise"**
3. Cocher les types à anonymiser :
   - ☑️ Matricules employés
   - ☑️ Salaires
   - ☑️ Évaluations RH
   - ☑️ Plannings / Horaires
4. Cliquer **"Sauvegarder"**

#### Via l'API

```python
settings = {
    'anonymize_matricule': True,
    'anonymize_salaire': True,
    'anonymize_evaluation': True,
    'anonymize_planning': True
}

response = requests.post(
    'http://localhost:8001/anonymize',
    json={'text': text, **settings}
)
```

---

## 📝 **Exemples d'Utilisation**

### Exemple 1: Rapport RH

**Texte original** :
```
Rapport RH - Jean DUPONT (EMP12345)
Salaire actuel: 3500€ brut mensuel
Évaluation: Performance A+
Horaire: 09h00-17h30
```

**Texte anonymisé** :
```
Rapport RH - PERSON_1 (MATRICULE_1)
Salaire actuel: SALAIRE_1
Évaluation: EVALUATION_1
Horaire: PLANNING_1
```

### Exemple 2: Email RH Confidentiel

**Texte original** :
```
Bonjour,

Voici les informations pour le nouvel employé:
- Matricule: EMP67890
- Email: nouveau@entreprise.fr
- Téléphone: 01.23.45.67.89
- Salaire: 2800 EUR net mensuel
- Planning: Shift Matin (08h-16h)
```

**Texte anonymisé** :
```
Bonjour,

Voici les informations pour le nouvel employé:
- Matricule: MATRICULE_1
- Email: EMAIL_1
- Téléphone: TEL_1
- Salaire: SALAIRE_1
- Planning: PLANNING_1
```

---

## 🎯 **Formats Détectés**

### Matricules

| Format | Exemple | Détection |
|--------|---------|-----------|
| Préfixe EMP | `EMP12345` | ✅ |
| Préfixe MAT | `MAT-0001` | ✅ |
| Préfixe EMPL | `EMPL_ABC123` | ✅ |
| Préfixe MATR | `MATR9876` | ✅ |
| Préfixe EMPLOYEE | `EMPLOYEE-XYZ` | ✅ |

### Salaires

| Format | Exemple | Détection |
|--------|---------|-----------|
| Euro symbole | `3500€`, `3500.50€` | ✅ |
| EUR | `2800 EUR` | ✅ |
| Avec contexte | `3500€ brut`, `2800 EUR net` | ✅ |
| Périodicité | `45000€/an`, `3000€/mois` | ✅ |
| Dollars | `5000$`, `5000 dollars` | ✅ |

### Évaluations

| Format | Exemple | Détection |
|--------|---------|-----------|
| Notes lettres | `Note: A+`, `A-`, `B` | ✅ |
| Notes chiffrées | `Performance: 4/5`, `3/5` | ✅ |
| Appréciations | `Excellent`, `Très bien`, `Moyen` | ✅ |
| Avec préfixe | `Évaluation: A`, `Appréciation: Bien` | ✅ |

### Plannings

| Format | Exemple | Détection |
|--------|---------|-----------|
| Heures avec h | `09h00-17h30` | ✅ |
| Heures avec : | `9:00-17:00` | ✅ |
| Shifts | `Shift: Matin`, `Poste: Nuit` | ✅ |
| Périodes | `Matin`, `Après-midi`, `Nuit` | ✅ |

---

## 🧪 **Tester les Patterns**

### Backend (Python)

```bash
cd whisper_network
python test_rh_patterns.py
```

### Extension (Chrome)

1. Ouvrir la popup
2. Onglet **"Test en direct"**
3. Coller ce texte :
```
Mon matricule est EMP12345
Mon salaire est 3500€ brut
J'ai eu la note A+ à mon évaluation
Mon horaire est 09h-17h
```
4. Cliquer **"Tester l'anonymisation"**
5. Vérifier le résultat ✅

---

## 🔮 **Future : Fine-tuning spaCy**

Pour détecter **contextuellement** (au lieu de patterns fixes) :

### Avantages du Fine-tuning
- ✅ Détecte "matricule" même sans préfixe EMP
- ✅ Comprend "augmentation de 200€" comme salaire
- ✅ S'adapte aux variations linguistiques
- ✅ Moins de faux positifs

### Quand faire le Fine-tuning ?
- [ ] Quand vous avez 100+ exemples annotés
- [ ] Quand les patterns regex ne suffisent plus
- [ ] Quand vous voulez détecter des formats non-standards

### Comment faire ?
Voir `ROADMAP.md` section **"Fine-tuning & Entraînement du Modèle"**.

---

## ⚠️ **Limitations Actuelles (Regex)**

### Faux Négatifs (Non Détectés)
- ❌ `Matricule sans préfixe : 12345`
- ❌ `Salaire implicite : 3.5K`
- ❌ `Évaluation narrative : "très bon travail"`
- ❌ `Horaires complexes : "flexible"`

### Faux Positifs (Détectés par erreur)
- ⚠️ `3500€` dans "budget de 3500€" → Détecté comme salaire
- ⚠️ `EMP12345` dans "code produit EMP12345" → Détecté comme matricule

**Solution** : Désactiver le type concerné dans les settings si faux positifs fréquents.

---

## 🚀 **Roadmap**

- [x] Patterns Regex RH basiques ✅
- [ ] Fine-tuning spaCy pour détection contextuelle
- [ ] Support communications internes (emails, messages)
- [ ] Détection de documents RH (contrats, fiches paie)
- [ ] Export de rapports d'anonymisation RH

---

## 📞 **Support**

Questions ? Ouvrir une issue GitHub avec le tag `rh-anonymization`.

---

**Dernière mise à jour** : 19 novembre 2025
**Auteur** : Sylvain JOLY, NANO by NXO
