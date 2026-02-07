# Deep Link Configuration for Google OAuth

## Android Setup

After running `npx cap sync`, you need to add the following intent filter to your Android app's `AndroidManifest.xml` file.

Open `android/app/src/main/AndroidManifest.xml` and add this intent filter inside the `<activity>` tag:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="app.auradesk.mobile" />
</intent-filter>
```

The full activity tag should look something like this:

```xml
<activity
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
    android:name=".MainActivity"
    android:label="@string/title_activity_main"
    android:theme="@style/AppTheme.NoActionBarLaunch"
    android:launchMode="singleTask"
    android:exported="true">
    
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
    
    <!-- Deep link for OAuth callback -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="app.auradesk.mobile" />
    </intent-filter>
</activity>
```

**IMPORTANT:** Make sure `android:launchMode="singleTask"` is set on the activity to prevent duplicate instances when handling deep links.

## iOS Setup

For iOS, you need to add URL schemes to your Info.plist:

1. Open `ios/App/App/Info.plist`
2. Add the following:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>app.auradesk.mobile</string>
        </array>
        <key>CFBundleURLName</key>
        <string>app.auradesk.mobile</string>
    </dict>
</array>
```

## Supabase Dashboard Configuration

You also need to add the redirect URL to your Supabase project:

1. Go to your Supabase Dashboard
2. Navigate to Authentication > URL Configuration
3. Add `app.auradesk.mobile://auth-callback` to the "Redirect URLs" list

## Testing

To test deep links on Android:
```bash
adb shell am start -W -a android.intent.action.VIEW -d "app.auradesk.mobile://auth-callback?test=1" app.auradesk.mobile
```

To test on iOS Simulator:
```bash
xcrun simctl openurl booted "app.auradesk.mobile://auth-callback?test=1"
```
