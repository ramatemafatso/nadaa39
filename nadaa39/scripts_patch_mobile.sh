#!/usr/bin/env bash
set -euo pipefail
if [ -f android/app/src/main/AndroidManifest.xml ]; then
  grep -q 'android.permission.RECORD_AUDIO' android/app/src/main/AndroidManifest.xml || sed -i '/<manifest /a\    <uses-permission android:name="android.permission.RECORD_AUDIO" />' android/app/src/main/AndroidManifest.xml
fi
if [ -f ios/App/App/Info.plist ]; then
  /usr/libexec/PlistBuddy -c "Add :NSMicrophoneUsageDescription string Nadaa uses your microphone for creator voice verification and Live voice chat." ios/App/App/Info.plist 2>/dev/null || true
fi
