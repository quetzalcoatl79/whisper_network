"""
Version optimisée du moteur d'anonymisation pour modèles locaux
Priorité: rapidité et faible consommation mémoire
"""

import re
import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import hashlib


@dataclass
class FastAnonymizationResult:
    """Résultat d'anonymisation optimisé."""
    success: bool
    original_text: str
    anonymized_text: str
    anonymizations_count: int
    processing_time_ms: float
    errors: List[str] = None
    mapping_summary: Optional[Dict[str, Dict[str, str]]] = None


class FastAnonymizer:
    """
    Moteur d'anonymisation rapide utilisant uniquement des regex optimisées.
    Conçu pour les environnements avec ressources limitées.
    """
    
    def __init__(self):
        self.consistency_map = {}
        self.pattern_cache = {}
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Compile une seule fois tous les patterns regex pour de meilleures performances."""
        
        # Email - Pattern simple et rapide
        self.pattern_cache['email'] = re.compile(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        )
        
        # Téléphone - Support international optimisé
        self.pattern_cache['phone'] = re.compile(
            r'''(?x)
            (?<!\d)  # Ne pas suivre un chiffre
            (?:
                # Format international avec parenthèses optionnelles
                (?:\+|00)\d{1,3}[\s\-\.]*
                (?:\(\d{1,4}\)[\s\-\.]*)?  # Ex: +1 (555)
                (?:\(0\)[\s\-\.]*)?
                \d{1,4}(?:[\s\-\.]\d{2,4}){1,4}
                |
                # Format français national
                0[1-9][\s\-]?(?:\d{2}[\s\-]?){4}
                |
                # Format US : (XXX) XXX-XXXX ou XXX-XXX-XXXX
                (?:\(\d{3}\)|\d{3})[\s\-\.]?\d{3}[\s\-\.]\d{4}
                |
                # Format générique
                (?:\d{2,4}[\s\-]\d{2,4}[\s\-]\d{2,4}(?:[\s\-]\d{2,4})*)
            )
            (?![\.\d])  # Éviter les IP
            '''
        )
        
        # Adresses IP
        self.pattern_cache['ip'] = re.compile(
            r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'
        )
        
        # Cartes de crédit - Formats principaux
        self.pattern_cache['credit_card'] = re.compile(
            r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b'
        )
        
        # IBAN français (27 caractères : FR + 2 chiffres clé + 23 chiffres)
        # Accepte espaces/tirets optionnels entre groupes
        self.pattern_cache['iban'] = re.compile(
            r'\b[A-Z]{2}[\s-]?[0-9]{2}(?:[\s-]?[0-9]){23}\b',
            re.IGNORECASE
        )
        
        # NIR (Numéro de sécurité sociale français)
        self.pattern_cache['nir'] = re.compile(
            r'\b[12][0-9]{2}(0[1-9]|1[0-2])[0-9]{2}[0-9]{3}[0-9]{3}[0-9]{2}\b'
        )
        
        # URLs - Pattern optimisé
        self.pattern_cache['url'] = re.compile(
            r'https?://(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?)?'
        )
        
        # ========================================
        # 🆕 PATTERNS RH / ENTREPRISE
        # ========================================
        
        # Matricules employés (formats courants)
        # EMP12345, MAT-0001, EMPL_ABC123, etc.
        self.pattern_cache['matricule'] = re.compile(
            r'\b(?:EMP|MAT|EMPL|MATR|EMPLOYEE)[-_]?[A-Z0-9]{4,10}\b',
            re.IGNORECASE
        )
        
        # Salaires (montants avec devise)
        # 3500€ brut, 2800 EUR net, 45000€/an, etc.
        self.pattern_cache['salaire'] = re.compile(
            r'\b\d{3,6}(?:[,\.]\d{2})?\s*(?:€|EUR|euros?|dollars?|\$)\s*(?:brut|net|mensuel|annuel|/an|/mois)?\b',
            re.IGNORECASE
        )
        
        # Évaluations / Notes RH
        # Note: A+, Performance: 4/5, Évaluation: Excellent, etc.
        self.pattern_cache['evaluation'] = re.compile(
            r'\b(?:note|évaluation|performance|appréciation)\s*:?\s*(?:[A-E][+-]?|[0-5]/[0-5]|excellent|très bien|bien|moyen|insuffisant)\b',
            re.IGNORECASE
        )
        
        # Plannings / Horaires
        # 09h00-17h30, 9:00-17:00, Shift: Matin, etc.
        self.pattern_cache['planning'] = re.compile(
            r'\b(?:horaire|planning|shift|poste)\s*:?\s*(?:\d{1,2}[h:]\d{2}[-–]\d{1,2}[h:]\d{2}|matin|après-midi|nuit|jour)\b',
            re.IGNORECASE
        )
    
    def _get_consistent_token(self, category: str, original: str, base_token: str) -> str:
        """
        Génère un token cohérent et lisible basé sur un compteur par catégorie.
        
        Exemples:
        - IP 192.168.1.1 → IP_1
        - IP 192.168.1.1 (réutilisé) → IP_1
        - IP 192.168.1.200 → IP_2
        - Email test@example.com → EMAIL_1
        - Nom Dupont → NOM_1
        """
        if category not in self.consistency_map:
            self.consistency_map[category] = {}
        
        if original not in self.consistency_map[category]:
            # Compteur simple pour chaque catégorie
            counter = len(self.consistency_map[category]) + 1
            self.consistency_map[category][original] = f"{base_token}_{counter}"
        
        return self.consistency_map[category][original]
    
    async def anonymize_fast(self, text: str, settings: Dict[str, bool]) -> FastAnonymizationResult:
        """
        Anonymisation rapide utilisant uniquement des regex pré-compilées.
        """
        start_time = time.time()
        
        try:
            anonymized_text = text
            total_replacements = 0
            mapping_summary = {}
            
            # Anonymisation par ordre de priorité (plus rapide en premier)
            anonymization_steps = [
                ('anonymize_email', 'email', 'EMAIL'),
                ('anonymize_phone', 'phone', 'TEL'),  
                ('anonymize_ip', 'ip', 'IP'),
                ('anonymize_credit_cards', 'credit_card', 'CB'),
                ('anonymize_iban', 'iban', 'IBAN'),
                ('anonymize_nir', 'nir', 'NIR'),
                ('anonymize_urls', 'url', 'URL'),
                # 🆕 Patterns RH/Entreprise
                ('anonymize_matricule', 'matricule', 'MATRICULE'),
                ('anonymize_salaire', 'salaire', 'SALAIRE'),
                ('anonymize_evaluation', 'evaluation', 'EVALUATION'),
                ('anonymize_planning', 'planning', 'PLANNING')
            ]
            
            for setting_key, pattern_key, token_base in anonymization_steps:
                if settings.get(setting_key, False):
                    if pattern_key in self.pattern_cache:
                        pattern = self.pattern_cache[pattern_key]
                        matches = pattern.findall(anonymized_text)
                        
                        if matches:
                            category_mappings = {}
                            
                            for match in matches:
                                consistent_token = self._get_consistent_token(
                                    pattern_key, match, token_base
                                )
                                anonymized_text = anonymized_text.replace(match, consistent_token)
                                category_mappings[match] = consistent_token
                                total_replacements += 1
                            
                            if category_mappings:
                                mapping_summary[pattern_key] = category_mappings
            
            # Anonymisation simple des noms (sans spaCy pour la performance)
            if settings.get('anonymize_names', False):
                # Pattern pour les noms de famille français courants (commence par majuscule)
                common_lastnames = [
                    r'\b(?:Martin|Bernard|Thomas|Petit|Robert|Richard|Durand|Dubois|Moreau|Laurent|Simon|Michel|Lefebvre|Leroy|Roux|David|Bertrand|Morel|Fournier|Girard|Bonnet|Dupont|Lambert|Fontaine|Rousseau|Vincent|Muller|Lefevre|Faure|Andre|Mercier|Blanc|Guerin|Boyer|Garnier|Chevalier|Francois|Legrand|Gauthier|Garcia|Perrin|Robin|Clement|Morin|Nicolas|Henry|Roussel|Mathieu|Gautier|Masson|Marchand|Duval|Denis|Dumont|Marie|Lemaire|Noel|Meyer|Dufour|Meunier|Brun|Blanchard|Giraud|Joly|Riviere|Lucas|Brunet|Gaillard|Barbier|Arnaud|Martinez|Gerard|Roche|Renard|Schmitt|Roy|Leroux|Colin|Vidal|Caron|Picard|Roger|Fabre|Aubert|Lemoine|Renaud|Dumas|Lacroix|Olivier|Philippe|Bourgeois|Pierre|Benoit|Rey|Leclerc|Payet|Rolland|Leclercq|Guillaume|Lecomte|Lopez|Jean|Dupuy|Guillot|Hubert|Berger|Carpentier|Sanchez|Dupuis|Moulin|Louis|Deschamps|Huet|Vasseur|Perez|Boucher|Fleury|Royer|Klein|Jacquet|Adam|Paris|Poirier|Marty|Aubry|Guyot|Carre|Charles|Renault|Charpentier|Menard|Maillard|Baron|Bertin|Bailly|Herve|Schneider|Fernandez|Le Gall|Collet|Leger|Bouvier|Julien|Prevost|Millet|Perrot|Daniel|Le Roux|Cousin|Germain|Breton|Besson|Langlois|Remy|Le Goff|Pelletier|Leveque|Perrier|Leblanc|Barre|Lebrun|Marchal|Weber|Mallet|Hamon|Boulanger|Jacob|Monnier|Michaud|Rodriguez|Guichard|Gillet|Etienne|Grondin|Poulain|Tessier|Chevallier|Collin|Chauvin|Da Silva|Bouchet|Gay|Lemaitre|Benard|Marechal|Humbert|Reynaud|Antoine|Hoarau|Perret|Barthelemy|Cordier|Pichon|Lejeune|Gilbert|Lamy|Delaunay|Pasquier|Carlier|Laporte|Machin)\b'
                ]
                
                # Pattern pour les prénoms français courants
                common_firstnames = [
                    r'\b(?:Jean|Pierre|Michel|André|Philippe|Alain|Bernard|Christian|Daniel|François|Henri|Jacques|Louis|Marcel|Maurice|Paul|René|Robert|Roger|Serge|Claude|Guy|Gérard|Gilbert|Laurent|Pascal|Patrick|Stéphane|Thierry|Vincent|Nicolas|Julien|Olivier|Christophe|David|Frédéric|Sébastien|Eric|Fabrice|Jérôme|Antoine|Maxime|Thomas|Alexandre|Benjamin|Florian|Romain|Kevin|Mickael|Jonathan|Yann|Mathieu|Cédric|Ludovic|Anthony|Damien|Cyril|Grégoire)\b',
                    r'\b(?:Marie|Jeanne|Françoise|Monique|Catherine|Nathalie|Jacqueline|Isabelle|Sylvie|Marie-Christine|Véronique|Nicole|Martine|Brigitte|Annie|Chantal|Christiane|Patricia|Sophie|Sandrine|Valérie|Céline|Stéphanie|Laurence|Carole|Virginie|Caroline|Claire|Dominique|Sabine|Corinne|Pascale|Hélène|Florence|Agnès|Karine|Julie|Audrey|Laetitia|Marine|Emilie|Manon|Charlotte|Camille|Sarah|Laura|Léa|Clara|Emma|Jade|Lola|Chloé|Inès|Maëlys|Océane|Lisa|Eva|Romane|Margot|Louise|Juliette|Zoé|Alice|Pauline|Anaïs|Lucie)\b'
                ]
                
                # D'abord les noms de famille (pour éviter confusion avec prénoms)
                for lastname_pattern in common_lastnames:
                    pattern = re.compile(lastname_pattern, re.IGNORECASE)
                    matches = pattern.findall(anonymized_text)
                    
                    if matches:
                        for match in matches:
                            token = self._get_consistent_token('lastnames', match.upper(), 'NOM')
                            anonymized_text = re.sub(
                                r'\b' + re.escape(match) + r'\b', 
                                token, 
                                anonymized_text, 
                                flags=re.IGNORECASE
                            )
                            total_replacements += 1
                
                # Ensuite les prénoms
                for firstname_pattern in common_firstnames:
                    pattern = re.compile(firstname_pattern, re.IGNORECASE)
                    matches = pattern.findall(anonymized_text)
                    
                    if matches:
                        for match in matches:
                            token = self._get_consistent_token('firstnames', match.upper(), 'PRENOM')
                            anonymized_text = re.sub(
                                r'\b' + re.escape(match) + r'\b',
                                token, 
                                anonymized_text, 
                                flags=re.IGNORECASE
                            )
                            total_replacements += 1
            
            processing_time = (time.time() - start_time) * 1000
            
            return FastAnonymizationResult(
                success=True,
                original_text=text,
                anonymized_text=anonymized_text,
                anonymizations_count=total_replacements,
                processing_time_ms=processing_time,
                mapping_summary=mapping_summary
            )
            
        except Exception as e:
            processing_time = (time.time() - start_time) * 1000
            return FastAnonymizationResult(
                success=False,
                original_text=text,
                anonymized_text=text,
                anonymizations_count=0,
                processing_time_ms=processing_time,
                errors=[str(e)]
            )