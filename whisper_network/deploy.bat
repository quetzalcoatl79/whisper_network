@echo off
REM ############################################################################
REM Whisper Network - Script de deploiement Docker (Windows)
REM Auteur: Sylvain JOLY, NANO by NXO
REM ############################################################################

setlocal enabledelayedexpansion

set IMAGE_NAME=whisper-network
set CONTAINER_NAME=whisper-network
set HOST_PORT=8001
set CONTAINER_PORT=8000

echo.
echo ================================================================
echo            WHISPER NETWORK - DEPLOIEMENT DOCKER
echo ================================================================
echo.

REM Verifier que Docker est disponible
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Docker n'est pas installe ou n'est pas dans le PATH
    exit /b 1
)

REM Verifier que nous sommes dans le bon repertoire
if not exist "Dockerfile" (
    echo [ERREUR] Dockerfile non trouve
    echo Executez ce script depuis le repertoire whisper_network
    exit /b 1
)

echo [1/6] Nettoyage des conteneurs existants...
echo.

REM Arreter le conteneur s'il tourne
docker ps -q -f name=%CONTAINER_NAME% >nul 2>&1
if not errorlevel 1 (
    echo Arret du conteneur %CONTAINER_NAME%...
    docker stop %CONTAINER_NAME% >nul 2>&1
)

REM Supprimer le conteneur s'il existe
docker ps -aq -f name=%CONTAINER_NAME% >nul 2>&1
if not errorlevel 1 (
    echo Suppression du conteneur %CONTAINER_NAME%...
    docker rm %CONTAINER_NAME% >nul 2>&1
)

echo.
echo [2/6] Build de l'image Docker...
echo.

docker build -t %IMAGE_NAME%:latest .
if errorlevel 1 (
    echo [ERREUR] Echec du build de l'image
    exit /b 1
)

echo.
echo [3/6] Demarrage du conteneur...
echo.

docker run -d --name %CONTAINER_NAME% -p %HOST_PORT%:%CONTAINER_PORT% --restart unless-stopped %IMAGE_NAME%:latest
if errorlevel 1 (
    echo [ERREUR] Echec du demarrage du conteneur
    exit /b 1
)

echo Conteneur demarre sur le port %HOST_PORT%

echo.
echo [4/6] Attente du demarrage du service...
echo.

set /a attempt=0
set /a max_attempts=30

:wait_loop
curl -sf http://localhost:%HOST_PORT%/health >nul 2>&1
if not errorlevel 1 goto service_ready

set /a attempt+=1
if %attempt% geq %max_attempts% (
    echo [ERREUR] Le service n'a pas demarre dans les temps
    docker logs %CONTAINER_NAME% --tail 20
    exit /b 1
)

timeout /t 1 /nobreak >nul
goto wait_loop

:service_ready
echo Service operationnel !

echo.
echo [5/6] Verification de la sante du service...
echo.

curl -s http://localhost:%HOST_PORT%/health

echo.
echo.
echo [6/6] Test d'anonymisation...
echo.

docker exec %CONTAINER_NAME% python -c "import requests; text = 'Jean Dupont - jean@test.fr - 192.168.1.100'; r = requests.post('http://localhost:%CONTAINER_PORT%/anonymize/fast', json={'text': text}); result = r.json(); print(f\"Original: {result['original_text']}\"); print(f\"Anonymise: {result['anonymized_text']}\"); print(f\"{result['anonymizations_count']} elements en {result['processing_time_ms']:.2f}ms\")"

echo.
echo ================================================================
echo                        INFORMATIONS
echo ================================================================
echo.
echo   API URL:          http://localhost:%HOST_PORT%
echo   Health Check:     http://localhost:%HOST_PORT%/health
echo   Documentation:    http://localhost:%HOST_PORT%/docs
echo   ReDoc:            http://localhost:%HOST_PORT%/redoc
echo.
echo   Commandes utiles:
echo     docker logs %CONTAINER_NAME% -f         Voir les logs
echo     docker exec -it %CONTAINER_NAME% bash   Shell interactif
echo     docker stop %CONTAINER_NAME%            Arreter
echo     docker restart %CONTAINER_NAME%         Redemarrer
echo.
echo ================================================================
echo          DEPLOIEMENT TERMINE AVEC SUCCES ! [OK]
echo ================================================================
echo.

pause
