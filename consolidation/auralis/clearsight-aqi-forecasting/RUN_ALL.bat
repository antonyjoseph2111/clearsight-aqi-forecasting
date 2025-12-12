@echo off
echo =======================================================
echo    🚀 DELHI AQI FORECAST SYSTEM - MASTER CONTROL
echo =======================================================
echo.
echo Input:  CPCB RSS Feed (Live)
echo Model:  Physics-Aware BiLSTM (Trained on 2020-2025)
echo Output: Firebase Web Map
echo.

cd /d "%~dp0\AQI_System"
call run_pipeline.bat
