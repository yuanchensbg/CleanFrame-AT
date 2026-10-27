# CleanFrame AT

Minimalistischer TV-Launcher für den Fire TV Stick im Stil von CleanFrame.
Die Oberfläche liegt auf GitHub Pages. Änderungen an den Dateien sind beim nächsten Start auf dem TV, ohne die App neu zu installieren.

## Funktionen

- Dock mit Lieblings-Apps; nicht installierte Apps öffnen ihre Seite im Amazon Appstore
- Art Mode: Landschaftsbilder im Vollbild, startet nach Inaktivität, Links/Rechts blättert, jede andere Taste führt zurück
- Alle installierten Apps als Raster
- Smart Home: Ambilight, Shelly, Govee
- Netzwerkstatus, Einstellungen, Live-Wetter, Navigationston

## Anpassen

| Datei | Inhalt |
|---|---|
| `apps.json` | Apps im Dock (Name, Logo, Android-Paketname) |
| `config.js` | Stadt fürs Wetter, Art-Mode-Zeiten, Hintergrundbilder, Töne |
| `smarthome.json` | Smart-Home-Geräte und Govee-API-Key |
| `ambilight.js` | IP-Adresse des Philips-TVs |

## Auf dem Fire TV installieren

Die App wird bei jeder Änderung im Ordner `android/` automatisch von GitHub gebaut.

1. Fire TV: Einstellungen → Mein Fire TV → Entwickleroptionen → **Apps unbekannter Herkunft** erlauben
   (Entwickleroptionen erscheinen nach 7× Klicken auf „Info“ → Name des Fire TV)
2. Im Amazon Appstore die App **Downloader** installieren
3. In Downloader diese Adresse eingeben:
   `https://github.com/yuanchensbg/CleanFrame-AT/releases/latest/download/cleanframe.apk`
4. Installieren, danach erscheint **CleanFrame** in „Deine Apps“
5. CleanFrame an die erste Stelle der App-Reihe verschieben

Hinweis: Amazon erlaubt auf aktuellen Fire-OS-Versionen nicht, den Home-Bildschirm dauerhaft zu ersetzen. Die Home-Taste führt deshalb weiter zum Amazon-Startbildschirm, CleanFrame startest du aus der App-Reihe.
