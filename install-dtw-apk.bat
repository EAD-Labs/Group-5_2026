@echo off
echo ========================================================
echo Installing AnkGuru v2.1-DTW (Option 1 Acoustic Engine)
echo ========================================================
set "PATH=C:\Users\HP\AppData\Local\Android\Sdk\platform-tools;%PATH%"

echo Checking connected device...
adb devices

echo Installing DTW APK...
adb install -r -d "E:\AnkGuru\AnkGuru-v2.1-DTW.apk"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Installation failed! Check USB debugging.
    pause
    exit /b 1
)

echo Launching AnkGuru v2.1-DTW...
adb shell am force-stop com.thunder25beast.ankguru
adb shell am start -n com.thunder25beast.ankguru/.MainActivity

echo.
echo ========================================================
echo SUCCESS! AnkGuru v2.1-DTW is running on your phone.
echo Mode 3 (Look & Speak) now uses Option 1: Acoustic DTW!
echo ========================================================
pause
