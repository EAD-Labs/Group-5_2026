@echo off
echo ============================================
echo AnkGuru Release APK Build
echo ============================================
echo.

cd /d E:\AnkGuru\artifacts\ankguru\android
echo Running Gradle assembleRelease...
call .\gradlew.bat app:assembleRelease -x lint -x test

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gradle build failed!
    exit /b 1
)

echo.
echo ============================================
echo BUILD SUCCESSFUL!
echo ============================================
echo APK: E:\AnkGuru\artifacts\ankguru\android\app\build\outputs\apk\release\app-release.apk
