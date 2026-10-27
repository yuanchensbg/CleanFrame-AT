# CleanFrame AT

Minimalistischer TV-Launcher für Fire TV Stick — inspiriert von Apple TV.  
Optimiert für Österreich. Läuft über GitHub Pages, Updates ohne APK-Neubau.

## Wie Updates funktionieren

1. Datei auf GitHub bearbeiten (z.B. `apps.json`)
2. Speichern / Commit
3. Beim nächsten TV-Start lädt der Launcher automatisch die neue Version

## Apps anpassen (`apps.json`)

Jeder Eintrag hat:
- `name` — Anzeigename
- `icon` — Zeichen oder Buchstabe
- `color` — Farbe des Icons (Hex)
- `package` — Android Package-Name der App

Häufige Package-Namen:
```
Netflix:      com.netflix.ninja
YouTube:      com.google.android.youtube.tv
Prime Video:  com.amazon.avod.thirdpartyclient
Disney+:      com.disney.disneyplus
ORF ON:       at.orf.tvthek
Kodi:         org.xbmc.kodi
Spotify:      com.spotify.tv.android
```

## Ambilight einrichten (`ambilight.js`)

1. IP-Adresse deines Philips TVs herausfinden (Router → verbundene Geräte)
2. In `ambilight.js` ganz oben eintragen:
   ```js
   const PHILIPS_TV_IP = '192.168.1.XXX';
   ```
3. Auf GitHub speichern

## APK einmalig bauen und installieren

**Voraussetzungen:**
- Android Studio installiert
- Fire TV Stick: Einstellungen → Mein Fire TV → Entwickleroptionen → ADB-Debugging AN

**Schritte:**
```bash
# Im android/ Ordner:
./gradlew assembleDebug

# APK auf Fire TV Stick installieren (IP des Sticks aus Router holen):
adb connect 192.168.1.XXX
adb install app/build/outputs/apk/debug/app-debug.apk
```

**Als Standard-Launcher setzen:**  
Nach der Installation fragt der Fire TV Stick welcher Launcher genutzt werden soll → CleanFrame wählen → "Immer".

## GitHub Pages einrichten

1. Repo auf GitHub erstellen
2. Settings → Pages → Source: main branch / root
3. URL (`https://dein-name.github.io/CleanFrame-AT/`) in `MainActivity.kt` eintragen
4. APK neu bauen und installieren (nur dieses eine Mal nötig)
