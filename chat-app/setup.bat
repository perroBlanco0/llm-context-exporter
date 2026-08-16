@echo off
rem Lanza el setup de Windows (idempotente, se puede correr varias veces)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
pause
