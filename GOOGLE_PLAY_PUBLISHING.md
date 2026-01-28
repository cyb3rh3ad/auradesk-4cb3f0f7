# AuraDesk Google Play Publishing Guide

This guide walks you through publishing AuraDesk to the Google Play Store.

## Prerequisites

1. **Google Play Developer Account** ($25 one-time fee)
   - Sign up at [Google Play Console](https://play.google.com/console)
   - Complete identity verification (may take 48 hours)

2. **App Signing Key (Keystore)**
   - You'll need to create a keystore for signing your app
   - Keep this file safe - you'll need it for all future updates!

3. **Required Assets**
   - App icon: 512x512 PNG (already have in `public/icon.png`)
   - Feature graphic: 1024x500 PNG
   - Screenshots: At least 2 phone screenshots
   - Privacy Policy URL (hosted online)

## Step 1: Create Your Signing Keystore

Run this command to create a new keystore:

```bash
keytool -genkey -v -keystore auradesk-release.keystore -alias auradesk -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted for:
- Keystore password (remember this!)
- Key password (can be same as keystore)
- Your name, organization, city, country

**⚠️ IMPORTANT: Back up your keystore file and passwords! If lost, you cannot update your app.**

## Step 2: Configure GitHub Secrets for Signed Builds

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

1. `KEYSTORE_BASE64` - Your keystore file encoded as base64:
   ```bash
   base64 -i auradesk-release.keystore
   ```

2. `KEYSTORE_PASSWORD` - Your keystore password

3. `KEY_ALIAS` - `auradesk` (or your chosen alias)

4. `KEY_PASSWORD` - Your key password

## Step 3: Update the Build Workflow

Replace the `Build release APK` step in `.github/workflows/build-android.yml` with:

```yaml
- name: Decode Keystore
  if: github.event_name != 'pull_request'
  run: |
    echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/app/auradesk-release.keystore

- name: Build signed release AAB
  if: github.event_name != 'pull_request'
  working-directory: android
  run: |
    ./gradlew bundleRelease --no-daemon \
      -Pandroid.injected.signing.store.file=$PWD/app/auradesk-release.keystore \
      -Pandroid.injected.signing.store.password=${{ secrets.KEYSTORE_PASSWORD }} \
      -Pandroid.injected.signing.key.alias=${{ secrets.KEY_ALIAS }} \
      -Pandroid.injected.signing.key.password=${{ secrets.KEY_PASSWORD }}

- name: Prepare AAB for release
  if: github.event_name != 'pull_request'
  run: |
    mkdir -p release
    cp android/app/build/outputs/bundle/release/app-release.aab release/AuraDesk.aab
```

## Step 4: Create Your Google Play Listing

1. Go to [Google Play Console](https://play.google.com/console)
2. Click "Create app"
3. Fill in:
   - **App name**: AuraDesk
   - **Default language**: English (US)
   - **App or game**: App
   - **Free or paid**: Free (or Paid if applicable)

4. Complete the **Store listing**:
   - Short description (max 80 chars): "Team collaboration with chat, video calls, and AI assistant"
   - Full description (max 4000 chars): Detailed app description
   - Upload screenshots and graphics

5. Complete **App content** questionnaire:
   - Privacy policy URL
   - Content rating
   - Target audience
   - Data safety section

## Step 5: Upload Your App

1. Go to **Production** → **Create new release**
2. Upload the signed `.aab` file
3. Add release notes
4. Review and roll out

## Step 6: App Review

Google typically reviews apps within 1-7 days. You'll receive an email when:
- Your app is approved and published
- There are issues that need addressing

## Required Store Assets

### Screenshots (Phone)
- Minimum 2, maximum 8
- JPEG or 24-bit PNG
- Minimum dimension: 320px
- Maximum dimension: 3840px
- Aspect ratio between 16:9 and 9:16

### Feature Graphic
- 1024 x 500 PNG or JPEG
- Used for promotional display

### App Icon
- 512 x 512 PNG with alpha
- Already created at `public/icon.png`

## Privacy Policy

Your privacy policy must be hosted publicly. Include:
- What data you collect
- How data is used
- Data sharing practices
- User rights and deletion requests
- Contact information

The app already has a Privacy page at `/privacy` - you can host this or create a standalone page.

## Data Safety Section

Google requires you to declare:
- Data types collected (account info, messages, files)
- How data is used
- Data sharing practices
- Security practices (encryption)

For AuraDesk, you'll need to declare:
- ✅ Account info (email, name)
- ✅ User-generated content (messages, files)
- ✅ Device IDs (for push notifications)
- ✅ Data is encrypted in transit
- ✅ Users can request data deletion

## Troubleshooting

### "App not installed" on device
- Uninstall any existing debug version first
- Enable "Install unknown apps" in device settings

### Build fails with signing error
- Verify keystore file is not corrupted
- Check that all GitHub secrets are set correctly
- Ensure key alias matches exactly

### App rejected by Google Play
- Read the rejection reason carefully
- Common issues: metadata policy, privacy policy requirements
- Fix issues and resubmit

## Maintaining Your App

1. **Version Updates**: Increment `versionCode` and `versionName` in `android/app/build.gradle`
2. **Release Notes**: Write clear, user-friendly update notes
3. **Staged Rollouts**: Use staged rollouts to catch issues early
4. **Monitor Reviews**: Respond to user feedback promptly

## Support

For publishing support, contact: info.auradesk@gmail.com
