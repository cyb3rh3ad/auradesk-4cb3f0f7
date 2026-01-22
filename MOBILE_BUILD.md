# AuraDesk Mobile Build Guide

This guide explains how to build AuraDesk for iOS and Android using Capacitor.

## Prerequisites

### For iOS
- macOS computer
- Xcode installed from the Mac App Store
- Xcode Command Line Tools (`xcode-select --install`)
- CocoaPods (`sudo gem install cocoapods`)

### For Android
- Android Studio installed
- Android SDK configured
- Java Development Kit (JDK) 11 or higher

## Initial Setup

1. **Export to GitHub**
   - Click "Export to GitHub" in Lovable
   - Clone the repository to your computer:
   ```bash
   git clone <your-repo-url>
   cd auradesk
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Add native platforms**
   ```bash
   # For iOS (macOS only)
   npx cap add ios

   # For Android
   npx cap add android
   ```

4. **Build the web app**
   ```bash
   npm run build
   ```

5. **Sync to native platforms**
   ```bash
   npx cap sync
   ```

## Setting Up App Icon & Splash Screen

**All icons and splash screen are pre-generated for you!** After running `npx cap add android`, simply copy the assets:

### Quick Setup (Recommended)
Copy the pre-made icons from this repo to your Android project:

```bash
# From your project root, after running 'npx cap add android':

# Copy app icons
cp public/android-icons/mipmap-mdpi/ic_launcher.png android/app/src/main/res/mipmap-mdpi/
cp public/android-icons/mipmap-hdpi/ic_launcher.png android/app/src/main/res/mipmap-hdpi/
cp public/android-icons/mipmap-xhdpi/ic_launcher.png android/app/src/main/res/mipmap-xhdpi/
cp public/android-icons/mipmap-xxhdpi/ic_launcher.png android/app/src/main/res/mipmap-xxhdpi/
cp public/android-icons/mipmap-xxxhdpi/ic_launcher.png android/app/src/main/res/mipmap-xxxhdpi/

# Copy round icons (same as regular for now)
cp public/android-icons/mipmap-mdpi/ic_launcher.png android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
cp public/android-icons/mipmap-hdpi/ic_launcher.png android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
cp public/android-icons/mipmap-xhdpi/ic_launcher.png android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
cp public/android-icons/mipmap-xxhdpi/ic_launcher.png android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
cp public/android-icons/mipmap-xxxhdpi/ic_launcher.png android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png

# Copy splash screen
mkdir -p android/app/src/main/res/drawable
cp public/android-icons/drawable/splash.png android/app/src/main/res/drawable/
```

### Icon Sizes Reference
- `mipmap-mdpi`: 48x48px
- `mipmap-hdpi`: 72x72px
- `mipmap-xhdpi`: 96x96px
- `mipmap-xxhdpi`: 144x144px
- `mipmap-xxxhdpi`: 192x192px

The splash screen uses a dark background (#0a0a0f) configured in `capacitor.config.ts`.

## Development with Hot Reload

The `capacitor.config.ts` is configured to load from the Lovable sandbox URL. This means:
- You can make changes in Lovable
- The mobile app will automatically reflect changes
- No rebuild needed during development

## Building for Production

Before submitting to app stores, update `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.fc4bd383e19d4e41b174125d10b92719',
  appName: 'AuraDesk',
  webDir: 'dist',
  // Remove or comment out the server section for production:
  // server: {
  //   url: '...',
  //   cleartext: true
  // },
};
```

Then rebuild and sync:
```bash
npm run build
npx cap sync
```

## Running the App

### iOS
```bash
npx cap run ios
```
Or open in Xcode:
```bash
npx cap open ios
```

### Android
```bash
npx cap run android
```
Or open in Android Studio:
```bash
npx cap open android
```

## Publishing to App Stores

### Apple App Store
1. Open the project in Xcode: `npx cap open ios`
2. Set up your Apple Developer account in Xcode
3. Configure signing & capabilities
4. Archive and upload via Xcode Organizer

### Google Play Store
1. Open the project in Android Studio: `npx cap open android`
2. Build a signed APK or App Bundle
3. Upload to Google Play Console

## Troubleshooting

### iOS build fails
- Ensure CocoaPods is installed: `sudo gem install cocoapods`
- Run `cd ios && pod install`

### Android build fails
- Ensure Android SDK is properly configured
- Check ANDROID_HOME environment variable
- Run `npx cap sync android`

### App shows blank screen
- Ensure `npm run build` was run before `npx cap sync`
- For development, ensure the Lovable sandbox URL is accessible

## After Making Changes in Lovable

Whenever you make changes in Lovable and want to test on device:

1. Git pull the latest changes
2. Run `npx cap sync`
3. Run `npx cap run ios` or `npx cap run android`
