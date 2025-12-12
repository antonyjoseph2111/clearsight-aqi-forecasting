@echo off
cd /d "%~dp0"
echo ========================================================
echo   DELHI AIR QUALITY FORECASTING SYSTEM - PRODUCTION RUN
echo ========================================================
echo.

echo [1/4] Running Data Preparation (Physics Features & Sequences)...
python src_deep_model/01_data_prep.py
if %errorlevel% neq 0 (
    echo [ERROR] Data Preparation Failed!
    pause
    exit /b %errorlevel%
)
echo [OK] Data Prep Complete.
echo.

echo [2/4] Note: Training skipped for Production Inference.
echo       (Using pre-trained model: models_production/best_physics_dl_pm25_model.h5)
echo.



echo [4/4] Running Hybrid Safety Layer (CPCB RSS Only)...
python src_deep_model/04_hybrid_inference.py
if %errorlevel% neq 0 (
    echo [ERROR] Hybrid Safety Layer Failed!
    pause
    exit /b %errorlevel%
)
echo [OK] Hybrid Forecast Generated!
echo.

echo ========================================================
echo   SUCCESS! Output saved to: forecast_safety_hybrid.json
echo ========================================================

echo [5/5] Publishing Data to Website...
python publish_to_web.py
echo [6/6] Deploying to Firebase Hosting...
echo.
cd ..
call firebase deploy --only hosting --project clear-sight-auralis
echo.
echo [OK] Deployment Complete!
echo.

pause
