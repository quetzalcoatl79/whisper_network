import re

# Read the file
with open("E:/Documents/NXO/PROJETS/R&D/whisper_network/whisper_network/whisper_network/anonymizers.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add CamemBERT import after spacy import
old_import = """try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    spacy = None"""

new_import = """try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    spacy = None

# CamemBERT NER for advanced French entity detection
try:
    from .camembert_ner import get_camembert_ner, is_camembert_available, NEREntityType
    CAMEMBERT_AVAILABLE = is_camembert_available()
except ImportError:
    CAMEMBERT_AVAILABLE = False
    get_camembert_ner = None"""

content = content.replace(old_import, new_import)

# 2. Add CamemBERT initialization in __init__
old_init = """        if SPACY_AVAILABLE:
            # Load French model
            try:
                self.nlp_fr = spacy.load("fr_core_news_sm")
                self.nlp = self.nlp_fr  # Default to French
                logger.info("spaCy French model loaded successfully")"""

new_init = """        # Initialize CamemBERT NER (preferred for French)
        self.camembert_ner = None
        if CAMEMBERT_AVAILABLE:
            try:
                self.camembert_ner = get_camembert_ner(confidence_threshold=0.7)
                if self.camembert_ner.is_available:
                    logger.info("CamemBERT NER loaded - using advanced French detection")
                else:
                    logger.warning("CamemBERT NER not available, falling back to spaCy")
                    self.camembert_ner = None
            except Exception as e:
                logger.warning(f"CamemBERT NER initialization failed: {e}")
                self.camembert_ner = None
        
        if SPACY_AVAILABLE:
            # Load French model
            try:
                self.nlp_fr = spacy.load("fr_core_news_sm")
                self.nlp = self.nlp_fr  # Default to French
                logger.info("spaCy French model loaded successfully")"""

content = content.replace(old_init, new_init)

# Write the file back
with open("E:/Documents/NXO/PROJETS/R&D/whisper_network/whisper_network/whisper_network/anonymizers.py", "w", encoding="utf-8") as f:
    f.write(content)

print("OK - CamemBERT integration added to anonymizers.py")
