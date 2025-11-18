#!/usr/bin/env python3
# Script de test pour anonymisation
# Auteur: Jean Dupont <jean.dupont@example.com>

def main():
    # Configuration
    email = "admin@company.fr"
    phone = "+33 1 23 45 67 89"
    
    print(f"Contact: {email}")
    print(f"Téléphone: {phone}")
    
    # Adresse du serveur
    server = "192.168.1.100"
    api_url = "https://api.example.com/v1/users"
    
    return True

if __name__ == "__main__":
    main()
