#!/usr/bin/env python3
"""Build a small debug APK with an installed Android SDK; no third-party app libraries."""
from pathlib import Path
import os,subprocess,shutil,zipfile
ROOT=Path(__file__).resolve().parent
SDK=Path(os.environ.get('ANDROID_HOME',str(Path.home()/'Library/Android/sdk')))
JBR=Path('/Applications/Android Studio.app/Contents/jbr/Contents/Home')
JAVA=Path(os.environ.get('JAVA_HOME',str(JBR if JBR.exists() else Path(shutil.which('javac') or '/usr/bin/javac').resolve().parents[1])))
OUT=ROOT/'build';OUT.mkdir(exist_ok=True)
for name in ['classes','generated','dex']:(OUT/name).mkdir(exist_ok=True)
versions=lambda p:tuple(int(x) for x in __import__('re').findall(r'\d+',p.name))
PLATFORM=max((SDK/'platforms').glob('android-*'),key=versions)
TOOLS=max((SDK/'build-tools').iterdir(),key=versions)
JAR=PLATFORM/'android.jar';env={**os.environ,'JAVA_HOME':str(JAVA)}
def run(*args):subprocess.run([str(a) for a in args],check=True,env=env)
manifest=(ROOT/'app/src/main/AndroidManifest.xml').read_text().replace('android:usesCleartextTraffic="false"','android:usesCleartextTraffic="true"')
(OUT/'AndroidManifest.xml').write_text(manifest)
run(TOOLS/'aapt2','compile','--dir',ROOT/'app/src/main/res','-o',OUT/'resources.zip')
run(TOOLS/'aapt2','link','-o',OUT/'resources.apk','--manifest',OUT/'AndroidManifest.xml','-I',JAR,'--java',OUT/'generated',OUT/'resources.zip')
package=OUT/'generated/com/wasteright/helper';package.mkdir(parents=True,exist_ok=True)
(package/'BuildConfig.java').write_text('package com.wasteright.helper; public final class BuildConfig { public static final boolean DEBUG=true; }')
sources=list((ROOT/'app/src/main/java').rglob('*.java'))+list((OUT/'generated').rglob('*.java'))
run(JAVA/'bin/javac','--release','8','-encoding','UTF-8','-classpath',JAR,'-d',OUT/'classes',*sources)
run(TOOLS/'d8','--lib',JAR,'--min-api','26','--output',OUT/'dex',*list((OUT/'classes').rglob('*.class')))
shutil.copyfile(OUT/'resources.apk',OUT/'unsigned.apk')
with zipfile.ZipFile(OUT/'unsigned.apk','a') as z:
 for dex in (OUT/'dex').glob('*.dex'):z.write(dex,dex.name)
run(TOOLS/'zipalign','-f','-p','4',OUT/'unsigned.apk',OUT/'aligned.apk')
key=OUT/'debug.keystore'
if not key.exists():run(JAVA/'bin/keytool','-genkeypair','-keystore',key,'-storepass','android','-keypass','android','-alias','androiddebugkey','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=Android Debug,O=Waste Right,C=IN')
APK=OUT/'waste-right-helper-debug.apk'
run(TOOLS/'apksigner','sign','--ks',key,'--ks-key-alias','androiddebugkey','--ks-pass','pass:android','--key-pass','pass:android','--out',APK,OUT/'aligned.apk')
run(TOOLS/'apksigner','verify','--verbose',APK)
print(f'APK: {APK}\nSize: {APK.stat().st_size:,} bytes')
