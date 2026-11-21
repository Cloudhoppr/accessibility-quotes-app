import type { ExpoConfig } from "expo/config";

// APP_VARIANT=development builds a separate app (".dev" bundle ID) so the
// Metro dev client never replaces the Release demo build on the phone.
const IS_DEV = process.env.APP_VARIANT === "development";

const config: ExpoConfig = {
  name: IS_DEV ? "SafeStepDev" : "SafeStep",
  slug: "safestep",
  scheme: "safestep",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: false,
    bundleIdentifier: IS_DEV ? "com.cloudhoppr.safestep.dev" : "com.cloudhoppr.safestep",
    deploymentTarget: "17.0",
    infoPlist: {
      NSCameraUsageDescription:
        "SafeStep uses the camera to scan your room and take photos of your bathroom so it can suggest safety fixtures.",
      NSPhotoLibraryUsageDescription:
        "SafeStep lets you pick existing photos of your bathroom.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  plugins: [
    "expo-font",
    ["expo-build-properties", { ios: {} }],
    [
      "expo-roomplan",
      {
        cameraPermissionText:
          "SafeStep uses the camera to scan your room and take photos of your bathroom so it can suggest safety fixtures.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "SafeStep lets you pick existing photos of your bathroom.",
        cameraPermission:
          "SafeStep uses the camera to take photos of your bathroom so it can suggest safety fixtures.",
      },
    ],
  ],
};

export default config;
