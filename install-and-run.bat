@echo off
echo ============================================
echo Installing AnkGuru Standalone APK to Phone...
echo ============================================

set "PATH=C:\Users\HP\AppData\Local\Android\Sdk\platform-tools;%PATH%"

echo Checking connected device...
adb devices

echo Installing APK...
adb install -r -d "E:\AnkGuru\artifacts\ankguru\android\app\build\outputs\apk\release\app-release.apk"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Installation failed!
    pause
    exit /b 1
)

echo Launching AnkGuru...
adb shell am start -n com.thunder25beast.ankguru/.MainActivity

echo.
echo ============================================
echo SUCCESS! AnkGuru is running on your phone.
echo You can now unplug the USB cable anytime!
echo ============================================
pause
