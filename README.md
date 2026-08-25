# Memo-Me

Memo-Me ist eine **privacy-first Foto-Memory-Quiz-App**: Nutzer:innen beantworten
im Swipe-Format Fragen zu ihren eigenen Fotos aus der Gerätebibliothek –
**Wann** wurde das Foto aufgenommen, **Wo**, und **Wer** ist zu sehen.

Alle Daten und alle Verarbeitung bleiben **ausschließlich auf dem Gerät**.
Es gibt kein Backend, keinen Cloud-Sync und keine Nutzerkonten. Die einzige
externe Netzwerkverbindung, die die App später nutzen wird, ist die kostenlose
Wikimedia-"On this day"-API für historische Fakten zum Aufnahmedatum eines
Fotos (noch nicht implementiert, siehe unten).

## Technologie-Stack

| Baustein | Zweck |
|---|---|
| Expo (SDK 54) / React Native | Basis-Framework für die App, läuft auf iOS und Android |
| TypeScript | Typsicherheit, weniger Laufzeitfehler |
| React Navigation | Navigation zwischen den Screens |
| `expo-media-library` | Zugriff auf die Fotobibliothek des Geräts (mit Berechtigungsabfrage) |
| `expo-location` | Reverse-Geocoding: wandelt GPS-Koordinaten eines Fotos in einen Ortsnamen um, komplett auf dem Gerät |
| `expo-sqlite` | Lokale Datenhaltung (Fotos, Quiz-Fortschritt, Erinnerungen, Album-Zuordnungen, Profil) – keine externe Datenbank |
| `react-native-svg` | Kreisdiagramm im Ergebnis-Screen |
| `expo-audio` | Aufnahme und Wiedergabe gesprochener Erinnerungen (bleibt auf dem Gerät) |
| `expo-image-picker` | Auswahl/Aufnahme eines Profilbilds in den Einstellungen |
| `modules/image-classifier` (lokales Modul) | On-device Bildklassifikation (Apple Vision auf iOS, Google ML Kit auf Android) zum Aussortieren von Screenshots/Belegen, kein eigenes Modell, kein Netzwerkzugriff |

## Projektstruktur

```
screens/      Ganze Bildschirme der App (z. B. der Quiz-Screen)
components/   Wiederverwendbare UI-Bausteine (z. B. Antwort-Auswahl, Album-Auswahl)
services/     Anbindung an native Funktionen (z. B. Fotobibliothek, Geocoding)
hooks/        Wiederverwendbare React-Logik (z. B. Berechtigungs-Status)
types/        Gemeinsame TypeScript-Datentypen
db/           SQLite-Datenbankschema, -Initialisierung und Repositories
design/       Mockups als Stil-Referenz für Farben, Typografie und Layout
```

## Setup & Ausführen

Voraussetzung: [Node.js](https://nodejs.org/) ist installiert.

```bash
npm install
npx expo start
```

Danach öffnet sich ein QR-Code im Terminal/Browser. Auf dem eigenen Smartphone
die **Expo Go**-App installieren (App Store / Play Store) und den QR-Code
scannen – die App startet direkt auf dem Handy.

## Testen auf dem Handy

Die eigentliche Weiterentwicklung findet im Browser-Chat statt. Zum Testen auf
einem echten iPhone/iPad wird kurz zu einer Mac-Terminal-Unterhaltung
gewechselt (dort sind Node.js, Git, GitHub-Login und Claude Code bereits
eingerichtet, verbunden über `claude --teleport`). Dort reicht eine einfache
Bitte in normaler Sprache wie "hol den neuesten Stand und starte den Server
zum Testen" – im Hintergrund läuft dann:

1. `git pull` – neuesten Code holen
2. `npm install` – falls sich Abhängigkeiten geändert haben
3. `npx expo start` – kein Tunnel nötig, da Mac und Handy im selben WLAN sind
4. QR-Code im Terminal erscheint → mit Expo Go scannen

Ein direkter Tunnel-Test aus der Cloud-Umgebung heraus (ohne Mac) ist aktuell
nicht möglich – die Sicherheitsschicht dieser Cloud-Session blockiert
Tunnel-Dienste wie ngrok/Cloudflare Tunnel grundsätzlich.

## Aktueller Stand

- ✅ Expo-TypeScript-Projekt mit sauberer Ordnerstruktur
- ✅ SQLite-Datenbankschema für Fotos (`Fotos`), Quiz-Ergebnisse (`QuizErgebnisse`),
  Erinnerungen (`Erinnerungen`), Album-Zuordnungen (`FotoAlben`), Profil (`Profil`) und
  einen Cache für die Bildklassifikation (`FotoKlassifikation`)
- ✅ Gemeinsame Design-Grundlage (`theme/`) mit Farben, Schriften und Abständen aus den Mockups
- ✅ Willkommens-Bildschirm (`OnboardingScreen`) mit Privacy-Hinweis und Berechtigungsabfrage,
  inklusive verständlichem Hinweis, falls der Zugriff abgelehnt wurde
- ✅ Fotoquellen-Auswahl (`PhotoSourceScreen`, "Dein Erinnerungsdeck"): letzte Fotos,
  letztes Jahr oder ein eigenes Album als Quiz-Pool – eine Quelle muss aktiv gewählt werden
- ✅ Der Fotopool für eine Runde wird über den gesamten Zeitraum der Quelle durchmischt
  (nicht nur die neuesten Fotos) und schließt Screenshots (Metadaten) sowie Belege/Dokumente
  (on-device Bildklassifikation, siehe `modules/image-classifier`) automatisch aus
- ✅ Echte Quiz-Logik: Wann- und Wo-Frage (Mehrfachauswahl, wechselt pro Foto), Ortsnamen
  statt Koordinaten via Reverse-Geocoding, Ergebnisse werden in `QuizErgebnisse` gespeichert
- ✅ Gestensteuerung statt Buttons: Antwort löst sich beim Antippen sofort auf, nach oben
  wischen geht zum nächsten Foto
- ✅ Wissensfragen zwischendurch (`CuriosityPrompt`, `services/curiosityService.ts`): an
  zufälligen Punkten im Quiz fragt die App etwas zum gerade gezeigten Foto - welche Frage
  das ist (Geschichte/Name oder "Wer ist zu sehen?"), entscheidet sie danach, was zu diesem
  Foto noch fehlt. Antworten landen als Erinnerung bzw. als Personen-Tag am Foto
- ✅ Foto-Organisation nach dem Beantworten einer Frage: Foto löschen oder einem Album
  zuordnen (inkl. Vorschlag, neues Album anzulegen, und Erkennung bereits bestehender
  Album-Zuordnungen), Fotos werden dabei über ihre stabile Asset-ID identifiziert
- ✅ Einstellungen-Screen (`SettingsScreen`) für Spitzname und Profilbild
- ✅ Ergebnis-Screen mit Kreisdiagramm nach Abschluss einer Runde, plus "Nochmal spielen"
  und "Anderes Quiz starten"
- ✅ Navigation: Onboarding nur beim ersten Mal, danach Fotoquelle → Quiz → Ergebnis,
  Einstellungen als Modal erreichbar

## Design

Ein Mockup-Sheet als Stil-Referenz (Farben, Typografie, Layout) liegt unter
[`design/mockups/`](./design/mockups/) – siehe dortige README für Details, welche
Screens zum aktuellen MVP gehören und welche zurückgestellt sind. Die daraus
abgeleiteten Farb- und Schriftwerte stehen zentral in [`theme/`](./theme/).

## Was als Nächstes kommt

- Echte Wer-Frage im Quiz, sobald genug Fotos über die Wissensfragen zwischendurch
  Personen-Tags gesammelt haben
- Wikimedia-"On this day"-Integration für historische Fakten
- On-Device-Bildbearbeitung als Proof-of-Concept (z. B. weichgezeichnetes Foto)

## Datenschutz

Memo-Me verarbeitet Fotos ausschließlich lokal auf dem Gerät. Es werden keine
Fotos, Namen oder sonstigen Daten an einen Server übertragen – mit Ausnahme
der geplanten Wikimedia-Anfrage, die nur das Datum eines Fotos (keine
Bilddaten) an die öffentliche Wikimedia-API sendet. Die Umwandlung von
GPS-Koordinaten in Ortsnamen für die "Wo"-Frage läuft über den
betriebssystemeigenen Geocoder (`expo-location`) – auch das bleibt komplett
auf dem Gerät.
