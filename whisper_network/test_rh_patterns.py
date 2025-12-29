"""
Test des patterns RH/Entreprise pour l'anonymisation
"""

import asyncio
from whisper_network.fast_anonymizer import FastAnonymizer

async def test_rh_patterns():
    anonymizer = FastAnonymizer()
    
    # Texte de test contenant des données RH
    test_text = """
    Rapport RH Confidentiel
    
    Employé: Jean DUPONT
    Matricule: EMP12345
    Email: jean.dupont@entreprise.fr
    Téléphone: 01.23.45.67.89
    
    Évaluation annuelle:
    - Performance: A+
    - Note globale: 4.5/5
    - Appréciation: Excellent travail cette année
    
    Rémunération:
    - Salaire actuel: 3500€ brut mensuel
    - Prime annuelle: 5000 EUR
    - Augmentation proposée: 3800€/mois
    
    Planning:
    - Horaire: 09h00-17h30
    - Shift: Matin (lundi-vendredi)
    - Poste: Jour
    
    Autres données:
    - IBAN: FR76 1234 5678 9012 3456 7890 123
    - NIR: 187069912345678
    - Adresse: 123 rue de la Paix, 75001 Paris
    """
    
    settings = {
        'anonymize_names': True,
        'anonymize_email': True,
        'anonymize_phone': True,
        'anonymize_address': True,
        'anonymize_nir': True,
        'anonymize_iban': True,
        'anonymize_matricule': True,
        'anonymize_salaire': True,
        'anonymize_evaluation': True,
        'anonymize_planning': True
    }
    
    result = await anonymizer.anonymize_fast(test_text, settings)
    
    print("=" * 80)
    print("TEXTE ORIGINAL:")
    print("=" * 80)
    print(test_text)
    print("\n" + "=" * 80)
    print("TEXTE ANONYMISÉ:")
    print("=" * 80)
    print(result.anonymized_text)
    print("\n" + "=" * 80)
    print("STATISTIQUES:")
    print("=" * 80)
    print(f"Temps de traitement: {result.processing_time_ms:.2f}ms")
    print(f"Éléments anonymisés: {result.anonymizations_count}")
    print(f"\nDétails par catégorie:")
    for category, count in result.mapping_summary.items():
        print(f"  - {category}: {count}")
    
    print("\n" + "=" * 80)
    print("MAPPINGS POUR RESTAURATION:")
    print("=" * 80)
    for original, replacement in result.detailed_mappings.items():
        print(f"  {original} → {replacement}")

if __name__ == "__main__":
    asyncio.run(test_rh_patterns())
