import re
import sys
import os
import pytest
# Ensure project package is importable when tests run from test folder
# Dynamically load the anonymizers module from the repository (works in local dev/test)
import importlib.util
an_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'whisper_network', 'whisper_network', 'anonymizers.py'))
spec = importlib.util.spec_from_file_location("whisper_anonymizers", an_path)
_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(_mod)
AnonymizationEngine = _mod.AnonymizationEngine


def test_medical_ref_address_and_phone_handling():
    import asyncio
    engine = AnonymizationEngine()

    text = """Ticket #4571 — 2026-01-10 09:12
Client : Sofia Morel (sofia.morel@clientmail.com) — +33 7 98 12 34 56
Adresse : 7 Impasse des Lilas, 13001 Marseille
Objet : Demande de remboursement — Paiement effectué le 29/12/2025 par carte 5555 4444 3333 2222 (exp: 12/26) — Autorisation : AUTH-99231.
Notes : Le client a joint une pièce d’identité (ID‑num: IDFR‑20260011) et indique un IBAN FR14 2004 1010 0505 0001 3M02 606 pour le remboursement.
Serveur/Device : hostname=client‑pc‑12, mac=00:1A:2B:3C:4D:5E, ipv6=2001:0db8:85a3::8a2e:0370:7334
Remarques médicales (sensible) : Allergie à la pénicilline — dossier médical ref #MED-4432
"""

    settings = {
        "anonymize_email": True,
        "anonymize_phone": True,
        "anonymize_addresses": True,
        "anonymize_medical_data": True,
        "anonymize_names": False,  # disable names to avoid extra replacements
    }

    result = asyncio.run(engine.anonymize(text, settings))
    out = result.anonymized_text

    # Time should NOT be anonymized / removed (should be preserved)
    assert "09:12" in out

    # Phone number should be removed (original not present) and phone token present
    assert "+33 7 98 12 34 56" not in out
    assert re.search(r"\*\*\*PHONE", out)

    # Address should be anonymized and keep surrounding layout
    assert "Impasse des Lilas" not in out
    assert re.search(r"\*\*\*ADDRESS", out)
    # The medical remarks line should still exist after address replacement
    assert "\nRemarques médicales" in out

    # Medical reference identifier should be anonymized (ref #MED-4432 -> MEDREF token)
    assert "MED-4432" not in out
    assert re.search(r"\*\*\*MEDREF", out)
