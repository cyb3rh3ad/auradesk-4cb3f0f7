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

After running `npx cap add android`, you need to replace the default icons:

### App Icon (Required)
Replace the following files in `android/app/src/main/res/` with your icon:
- `mipmap-mdpi/ic_launcher.png` (48x48)
- `mipmap-hdpi/ic_launcher.png` (72x72)
- `mipmap-xhdpi/ic_launcher.png` (96x96)
- `mipmap-xxhdpi/ic_launcher.png` (144x144)
- `mipmap-xxxhdpi/ic_launcher.png` (192x192)

Also replace the round icons:
- `mipmap-mdpi/ic_launcher_round.png` (48x48)
- `mipmap-hdpi/ic_launcher_round.png` (72x72)
- `mipmap-xhdpi/ic_launcher_round.png` (96x96)
- `mipmap-xxhdpi/ic_launcher_round.png` (144x144)
- `mipmap-xxxhdpi/ic_launcher_round.png` (192x192)

**Quick method**: Use the `public/icon.png` (512x512) and resize it for each folder, or use Android Studio's Image Asset Studio:
1. Right-click `res` folder → New → Image Asset
2. Select your icon from `public/icon.png`
3. Android Studio will generate all sizes automatically

### Splash Screen (Required)
Create splash screen images in `android/app/src/main/res/`:
- `drawable/splash.png` (your logo, transparent background recommended)
- `drawable-land/splash.png` (landscape version)

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
