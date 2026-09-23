@echo off
echo ============================================
echo AnkGuru Release APK Build
echo ============================================
echo.

if not defined JAVA_HOME (
    if exist "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot" (
        set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
    )
)
if defined JAVA_HOME (
    set "PATH=%JAVA_HOME%\bin;%PATH%"
)

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
