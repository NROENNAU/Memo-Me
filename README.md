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
| Expo (SDK 57) / React Native | Basis-Framework für die App, läuft auf iOS und Android |
| TypeScript | Typsicherheit, weniger Laufzeitfehler |
| React Navigation | Navigation zwischen den Screens |
| `expo-media-library` | Zugriff auf die Fotobibliothek des Geräts (mit Berechtigungsabfrage) |
| `expo-sqlite` | Lokale Datenhaltung (Fotos, Quiz-Fortschritt) – keine externe Datenbank |

## Projektstruktur

```
screens/      Ganze Bildschirme der App (z. B. der Quiz-Screen)
components/   Wiederverwendbare UI-Bausteine (z. B. die Aktionsleiste)
services/     Anbindung an native Funktionen (z. B. Fotobibliothek)
hooks/        Wiederverwendbare React-Logik (z. B. Berechtigungs-Status)
types/        Gemeinsame TypeScript-Datentypen
db/           SQLite-Datenbankschema und -Initialisierung
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
- ✅ SQLite-Datenbankschema für Fotos (`Fotos`) und Quiz-Ergebnisse (`QuizErgebnisse`)
- ✅ Gemeinsame Design-Grundlage (`theme/`) mit Farben, Schriften und Abständen aus den Mockups
- ✅ Willkommens-Bildschirm (`OnboardingScreen`) mit Privacy-Hinweis und Berechtigungsabfrage,
  inklusive verständlichem Hinweis, falls der Zugriff abgelehnt wurde
- ✅ Echter Zugriff auf die Fotomediathek: neuestes Foto wird mit Aufnahmedatum und
  (falls vorhanden) Ort angezeigt
- ✅ Persistente Aktionsleiste (`ActionBar`) am unteren Rand
- ✅ Navigation: Onboarding nur beim ersten Mal, danach direkt ins Quiz

## Design

Ein Mockup-Sheet als Stil-Referenz (Farben, Typografie, Layout) liegt unter
[`design/mockups/`](./design/mockups/) – siehe dortige README für Details, welche
Screens zum aktuellen MVP gehören und welche zurückgestellt sind. Die daraus
abgeleiteten Farb- und Schriftwerte stehen zentral in [`theme/`](./theme/).

## Was als Nächstes kommt

- Auswahl der Fotoquelle als Quiz-Pool (letzte Fotos, letztes Jahr, Album …)
- Echte Swipe-Quiz-Logik (Frage anzeigen, Antwort erfassen, auswerten)
- Ortsnamen statt Koordinaten für die "Wo"-Frage
- Wikimedia-"On this day"-Integration für historische Fakten
- On-Device-Bildbearbeitung als Proof-of-Concept (z. B. weichgezeichnetes Foto)
- Ergebnis-Bildschirm nach einer Quiz-Runde

## Datenschutz

Memo-Me verarbeitet Fotos ausschließlich lokal auf dem Gerät. Es werden keine
Fotos, Namen oder sonstigen Daten an einen Server übertragen – mit Ausnahme
der geplanten Wikimedia-Anfrage, die nur das Datum eines Fotos (keine
Bilddaten) an die öffentliche Wikimedia-API sendet.
