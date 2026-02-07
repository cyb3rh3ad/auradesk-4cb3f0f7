import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.auradesk.mobile',
  appName: 'AuraDesk',
  webDir: 'dist',
  // Remove server config for production - app loads from bundled assets, not web
  // This makes it a TRUE native app, not a web wrapper
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // We handle splash screen in React
      launchAutoHide: true,
      backgroundColor: '#0c0a14',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#0c0a14',
    // Configure URL schemes for deep linking
    scheme: 'app.auradesk.mobile',
  },
  android: {
    allowMixedContent: false, // Security: don't allow mixed HTTP/HTTPS
    backgroundColor: '#0c0a14',
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'AAB',
    },
  },
};

export default config;
