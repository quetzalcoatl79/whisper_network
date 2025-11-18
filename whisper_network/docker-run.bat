@echo off
REM Whisper Network - Container Management Script for Windows
REM Usage: docker-run.bat [build|start|stop|restart|logs|shell]

set PROJECT_NAME=whisper-network
set IMAGE_NAME=whisper-network-api

if "%1"=="build" goto build
if "%1"=="start" goto start
if "%1"=="stop" goto stop
if "%1"=="restart" goto restart
if "%1"=="logs" goto logs
if "%1"=="shell" goto shell
if "%1"=="status" goto status
if "%1"=="cleanup" goto cleanup
goto usage

:build
echo 🔨 Building Docker image...
docker build -t %IMAGE_NAME% .
goto end

:start
echo 🚀 Starting Whisper Network API...
docker-compose up -d
echo ✅ API is running at http://localhost:8001
echo 📚 Documentation available at http://localhost:8001/docs
goto end

:stop
echo 🛑 Stopping Whisper Network API...
docker-compose down
goto end

:restart
echo 🔄 Restarting Whisper Network API...
docker-compose restart
goto end

:logs
echo 📋 Showing logs...
docker-compose logs -f whisper-network
goto end

:shell
echo 🐚 Accessing container shell...
docker-compose exec whisper-network /bin/bash
goto end

:status
echo 📊 Container status:
docker-compose ps
goto end

:cleanup
echo 🧹 Cleaning up...
docker-compose down --volumes --remove-orphans
docker image prune -f
goto end

:usage
echo Usage: %0 {build^|start^|stop^|restart^|logs^|shell^|status^|cleanup}
echo.
echo Commands:
echo   build    - Build the Docker image
echo   start    - Start the API container
echo   stop     - Stop the API container
echo   restart  - Restart the API container
echo   logs     - Show container logs
echo   shell    - Access container shell
echo   status   - Show container status
echo   cleanup  - Clean up containers and images

:end