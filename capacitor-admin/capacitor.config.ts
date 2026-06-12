import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.applenet.admin',
  appName: 'Apple.NET Admin',
  webDir: 'out-admin',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    buildOptions: {
      keystorePath: '../keystore/apple-net-2026.keystore',
      keystoreAlias: 'applenet',
      keystorePassword: 'applenet2026',
      keystoreAliasPassword: 'applenet2026',
    },
    backgroundColor: '#10b981',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#10b981',
      sound: 'default',
    },
    Haptics: {},
    Filesystem: {
      directory: 'Documents',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#10b981',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    BiometricAuth: {
      iosKeychainAccessGroup: 'com.applenet.admin',
    },
  },
};

export default config;
