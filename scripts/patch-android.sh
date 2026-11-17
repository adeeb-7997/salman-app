#!/usr/bin/env bash
# تعديلات على مشروع أندرويد بعد إنشائه (يشغّلها GitHub Actions تلقائياً)
set -e

MANIFEST=android/app/src/main/AndroidManifest.xml
GRADLE=android/app/build.gradle

# 1) صلاحيات الميكروفون (لتسجيل أصوات العائلة)
add_perm() {
  if ! grep -q "$1" "$MANIFEST"; then
    sed -i "s#</manifest>#    <uses-permission android:name=\"$1\" />\n</manifest>#" "$MANIFEST"
    echo "added $1"
  fi
}
add_perm android.permission.RECORD_AUDIO
add_perm android.permission.MODIFY_AUDIO_SETTINGS

# 2) رقم الإصدار يزيد مع كل بناء (حتى يتحدث التطبيق فوق القديم)
if [ -n "$BUILD_NUMBER" ]; then
  sed -i "s/versionCode [0-9]*/versionCode $BUILD_NUMBER/" "$GRADLE"
  sed -i "s/versionName \"[^\"]*\"/versionName \"1.0.$BUILD_NUMBER\"/" "$GRADLE"
  echo "version 1.0.$BUILD_NUMBER"
fi

# 3) مفتاح توقيع ثابت (إذا موجود) حتى تقدر تحدّث التطبيق بدون حذف بيانات العائلة
if [ -f "$HOME/.android/salman.keystore" ]; then
  cat >> "$GRADLE" <<'EOF'

android {
    signingConfigs {
        debug {
            storeFile file(System.getProperty("user.home") + "/.android/salman.keystore")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }
    }
}
EOF
  echo "fixed signing key enabled"
fi
