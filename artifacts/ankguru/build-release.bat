@echo off
echo ============================================
echo AnkGuru Release APK Build
echo ============================================
echo.
echo [Step 1/2] Bundling JavaScript...
echo.

cd /d E:\AnkGuru\artifacts\ankguru

mkdir android\app\build\generated\assets\createBundleReleaseJsAndAssets 2>nul
mkdir android\app\build\generated\res\createBundleReleaseJsAndAssets 2>nul
mkdir android\app\build\intermediates\sourcemaps\react\release 2>nul

call npx expo export:embed --entry-file E:\AnkGuru\artifacts\ankguru\index.js --platform android --dev false --reset-cache --bundle-output android\app\build\generated\assets\createBundleReleaseJsAndAssets\index.android.bundle --assets-dest android\app\build\generated\res\createBundleReleaseJsAndAssets --sourcemap-output android\app\build\intermediates\sourcemaps\react\release\index.android.bundle.packager.map

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] JS bundling failed!
    exit /b 1
)

echo.
echo [Step 2/2] Building APK...
echo.

cd /d E:\AnkGuru\artifacts\ankguru\android
call .\gradlew.bat app:assembleRelease -x lint -x test -x createBundleReleaseJsAndAssets --configure-on-demand --build-cache

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gradle build failed!
    exit /b 1
)

echo.
echo ============================================
echo BUILD SUCCESSFUL!
echo ============================================
echo APK: E:\AnkGuru\artifacts\ankguru\android\app\build\outputs\apk\release\app-release.apk
