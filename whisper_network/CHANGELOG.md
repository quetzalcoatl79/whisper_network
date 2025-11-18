# Changelog

All notable changes to Whisper Network API will be documented in this file.

## [1.0.0] - 2025-11-17

### Added
- 🎯 **Consistent Token Mapping**: Same values get same tokens across text
  - Names: `Marie Dupont` → `***NAME_1***` everywhere
  - IPs: `192.168.1.200` → `***IP_PRIVEE_1***` everywhere
- 🔍 **Advanced Name Detection**: Hybrid NLP + Regex approach
  - spaCy French model integration
  - Regex fallback for missed entities
  - Support for titles (Mr, Mme, Dr, etc.)
- 🌐 **Intelligent IP Classification**: 
  - Public vs Private IP detection
  - Localhost recognition
  - Consistent token assignment
- ⚡ **High Performance Anonymization Engine**:
  - Async processing
  - Optimized regex patterns
  - Sub-millisecond processing for small texts
- 📊 **Comprehensive Data Type Support**:
  - Names, emails, phones, IPs
  - NIR (French social security)
  - Credit cards, IBAN
  - URLs, addresses
- 🐳 **Docker Integration**:
  - One-command deployment
  - Health checks
  - Auto-restart policies
- 🌍 **CORS Support**: Ready for browser extensions
- 📚 **Auto-generated Documentation**: Swagger/OpenAPI integration
- 🧪 **Complete Test Suite**: Unit tests with pytest

### Technical Details
- **Framework**: FastAPI 0.104+
- **NLP**: spaCy fr_core_news_sm model
- **Python**: 3.8+ support
- **Container**: Docker with multi-stage build
- **Performance**: <10ms average response time

---

**Developed by Sylvain JOLY, NANO by NXO**  
**License**: MIT  
**Repository**: Whisper Network API