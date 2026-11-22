#!/usr/bin/env bash
# Сборка APK без Android SDK/AGP (aapt + kotlinc через Gradle + dx + apksigner из Ubuntu).
# Нужно: apt install aapt apksigner zipalign dalvik-exchange android-sdk-platform-23
# Использование: ./build-apk-manual.sh <рабочая_папка> <keystore.jks> <versionCode> <versionName>
set -euo pipefail
OUT=$1; KS=$2; VC=$3; VN=$4
HERE=$(cd "$(dirname "$0")" && pwd); M=$HERE/app/src/main
P=/usr/lib/android-sdk/platforms/android-23/android.jar
rm -rf "$OUT/gen" "$OUT/m" "$OUT/cls" "$OUT/std" "$OUT/kc"; mkdir -p "$OUT"/{gen,m,cls,std,kc}
sed 's|<manifest xmlns:android="http://schemas.android.com/apk/res/android">|<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="app.hardlimiter">|' \
  "$M/AndroidManifest.xml" > "$OUT/m/AndroidManifest.xml"
aapt package -f -m -J "$OUT/gen" -M "$OUT/m/AndroidManifest.xml" -S "$M/res" -I $P \
  --min-sdk-version 28 --target-sdk-version 35 --version-code "$VC" --version-name "$VN" -F "$OUT/res.apk"
cd "$OUT/kc"
echo 'rootProject.name="kc"' > settings.gradle.kts
cat > build.gradle.kts <<G
import org.jetbrains.kotlin.gradle.dsl.JvmTarget
plugins { kotlin("jvm") version "2.0.21" }
repositories { mavenCentral() }
dependencies { compileOnly("org.robolectric:android-all:14-robolectric-10818077") }
java { sourceCompatibility = JavaVersion.VERSION_1_8; targetCompatibility = JavaVersion.VERSION_1_8 }
kotlin { compilerOptions { jvmTarget.set(JvmTarget.JVM_1_8); freeCompilerArgs.addAll("-Xlambdas=class", "-Xsam-conversions=class", "-Xno-param-assertions", "-Xno-call-assertions", "-Xno-receiver-assertions") } }
sourceSets { main { kotlin.srcDirs("$M/java"); java.srcDirs("$OUT/gen") } }
tasks.register<Copy>("stdlib") { from(configurations.runtimeClasspath); into("libs") }
G
gradle classes stdlib -q
cp -r build/classes/kotlin/main/. "$OUT/cls/"; cp -r build/classes/java/main/. "$OUT/cls/"
(cd "$OUT/std" && unzip -q -o "$OUT/kc/libs/kotlin-stdlib-2.0.21.jar" && rm -rf META-INF)
cd "$OUT"
dalvik-exchange --dex --min-sdk-version=26 --output=classes.dex cls std
cp res.apk unsigned.apk && aapt add unsigned.apk classes.dex >/dev/null
zipalign -f -p 4 unsigned.apk aligned.apk
apksigner sign --ks "$KS" --ks-pass pass:hardlimiter --key-pass pass:hardlimiter --out HardLimiter.apk aligned.apk
apksigner verify HardLimiter.apk && echo "OK: $OUT/HardLimiter.apk"
