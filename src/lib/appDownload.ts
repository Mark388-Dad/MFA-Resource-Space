/**
 * App Launcher & Package Downloader
 * Delivers valid, verified installers for macOS (.zip with .app, .webloc), iPads (.mobileconfig),
 * and Windows (.url, PWA) without disk image corruption errors.
 */

/**
 * Downloads the verified Apple macOS Disk Image (.dmg)
 * containing MFA Reading Challenge.app, Applications shortcut, and Web launcher.
 */
export function downloadMacDmg(appName = "MFA-Reading-Challenge"): string {
  const fileName = `${appName}.dmg`;
  const link = document.createElement("a");
  link.href = "/downloads/MFA-Reading-Challenge.dmg";
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return fileName;
}

/**
 * Downloads the verified Apple macOS Application Archive (.zip)
 * containing MFA Reading Challenge.app for direct extraction & drag-and-drop.
 */
export function downloadMacZip(appName = "MFA-Reading-Challenge-Mac"): string {
  const fileName = `${appName}.zip`;
  const link = document.createElement("a");
  link.href = "/downloads/MFA-Reading-Challenge-Mac.zip";
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return fileName;
}

/**
 * Downloads the official Apple WebClip configuration profile (.mobileconfig)
 * dynamically generated with the current active domain and valid Apple plist schema.
 */
export function downloadIpadApp(appName = "MFA-Reading-Challenge"): string {
  const fileName = `${appName}.mobileconfig`;
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "https://mfareadingchallenge.ac.ke";

  const profileXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>PayloadContent</key>
\t<array>
\t\t<dict>
\t\t\t<key>FullScreen</key>
\t\t\t<true/>
\t\t\t<key>IsRemovable</key>
\t\t\t<true/>
\t\t\t<key>Label</key>
\t\t\t<string>MFA Reading Challenge</string>
\t\t\t<key>PayloadDescription</key>
\t\t\t<string>Installs the M-PESA Foundation Academy 45-Book Reading Challenge app directly onto your iPad home screen.</string>
\t\t\t<key>PayloadDisplayName</key>
\t\t\t<string>MFA Reading Challenge</string>
\t\t\t<key>PayloadIdentifier</key>
\t\t\t<string>ke.ac.mpesafoundationacademy.readingchallenge.webclip</string>
\t\t\t<key>PayloadType</key>
\t\t\t<string>com.apple.webClip.managed</string>
\t\t\t<key>PayloadUUID</key>
\t\t\t<string>76D74386-3532-47C0-B955-44CA861B8282</string>
\t\t\t<key>PayloadVersion</key>
\t\t\t<integer>1</integer>
\t\t\t<key>Precomposed</key>
\t\t\t<true/>
\t\t\t<key>URL</key>
\t\t\t<string>${appOrigin}</string>
\t\t</dict>
\t</array>
\t<key>PayloadDescription</key>
\t<string>Direct iPad installation for M-PESA Foundation Academy Reading Challenge.</string>
\t<key>PayloadDisplayName</key>
\t<string>MFA Reading Challenge Web App</string>
\t<key>PayloadIdentifier</key>
\t<string>ke.ac.mpesafoundationacademy.readingchallenge</string>
\t<key>PayloadOrganization</key>
\t<string>M-PESA Foundation Academy</string>
\t<key>PayloadRemovalDisallowed</key>
\t<false/>
\t<key>PayloadType</key>
\t<string>Configuration</string>
\t<key>PayloadUUID</key>
\t<string>D9581A07-44DE-45AE-B647-759FFDF26A74</string>
\t<key>PayloadVersion</key>
\t<integer>1</integer>
</dict>
</plist>
`;

  const blob = new Blob([profileXml], {
    type: "application/x-apple-aspen-config;charset=utf-8",
  });

  triggerBrowserDownload(blob, fileName);
  return fileName;
}

/**
 * Downloads a valid Apple Web Location (.webloc) file for macOS.
 * Opens directly in Finder with zero disk mounting errors.
 */
export function downloadMacWebloc(appName = "MFA-Reading-Challenge"): string {
  const fileName = `${appName}.webloc`;
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "https://mfareadingchallenge.ac.ke";

  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>URL</key>
\t<string>${appOrigin}</string>
</dict>
</plist>
`;

  const blob = new Blob([plistContent], {
    type: "application/xml;charset=utf-8",
  });

  triggerBrowserDownload(blob, fileName);
  return fileName;
}

/**
 * Downloads a macOS Terminal Command launcher (.command).
 */
export function downloadMacCommandLauncher(appName = "MFA-Reading-Challenge"): string {
  const fileName = `${appName}.command`;
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "https://mfareadingchallenge.ac.ke";

  const scriptContent = `#!/usr/bin/env bash
# ====================================================================
# M-PESA FOUNDATION ACADEMY READING CHALLENGE
# macOS Desktop Launcher
# ====================================================================
echo "Launching M-Pesa Foundation Academy Reading Challenge..."
open "${appOrigin}" 2>/dev/null || xdg-open "${appOrigin}" 2>/dev/null
`;

  const blob = new Blob([scriptContent], {
    type: "text/plain;charset=utf-8",
  });

  triggerBrowserDownload(blob, fileName);
  return fileName;
}

/**
 * Downloads a valid Windows Internet Shortcut (.url).
 */
export function downloadWindowsShortcut(appName = "MFA-Reading-Challenge"): string {
  const fileName = `${appName}.url`;
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "https://mfareadingchallenge.ac.ke";

  const shortcutContent = `[{000214A0-0000-0000-C000-000000000046}]
Prop3=19,0
[InternetShortcut]
IDList=
URL=${appOrigin}
IconIndex=0
`;

  const blob = new Blob([shortcutContent], {
    type: "text/plain;charset=utf-8",
  });

  triggerBrowserDownload(blob, fileName);
  return fileName;
}

/**
 * Platform-aware launcher downloader
 */
export function downloadNativeAppPackage(deviceType = "mac"): string {
  if (deviceType === "ipad" || deviceType === "ios") {
    return downloadIpadApp();
  }
  if (deviceType === "mac") {
    return downloadMacDmg();
  }
  if (deviceType === "windows") {
    return downloadWindowsShortcut();
  }
  return downloadMacWebloc();
}

/**
 * Helper to trigger file download in browser
 */
function triggerBrowserDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
