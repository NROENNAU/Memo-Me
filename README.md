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

## Web-Version zum Testen

Die App läuft aktuell **zusätzlich als Web-App** und ist über GitHub Pages von
jedem internetfähigen Gerät aus testbar, ohne Installation:

**https://nroennau.github.io/Memo-Me/**

Jeder Push auf diesen Branch baut die Web-Version automatisch neu (siehe
`.github/workflows/deploy-web.yml`). Die Web-Version speichert ihre Daten
lokal im Browser (nicht in der SQLite-Datenbank) – Web- und Handy-Version
teilen sich aktuell noch keine Daten.

## Setup & Ausführen

Voraussetzung: [Node.js](https://nodejs.org/) ist installiert.

```bash
npm install
npx expo start
```

Danach öffnet sich ein QR-Code im Terminal/Browser. Auf dem eigenen Smartphone
die **Expo Go**-App installieren (App Store / Play Store) und den QR-Code
scannen – die App startet direkt auf dem Handy.

Für die Web-Version lokal: `npx expo start --web`.

## Aktueller Stand

- ✅ Expo-TypeScript-Projekt mit sauberer Ordnerstruktur
- ✅ SQLite-Datenbankschema für Fotos (`Fotos`) und Quiz-Ergebnisse (`QuizErgebnisse`) – nativ
- ✅ Web-Version über `react-native-web`, Datenhaltung dort über den Browser-Speicher
- ✅ Automatisches Deployment der Web-Version auf GitHub Pages
- ✅ Grundgerüst für die Foto-Berechtigungsabfrage (iOS & Android)
- ✅ Platzhalter-Bildschirm `PhotoSwipeScreen` mit persistenter Aktionsleiste (`ActionBar`) am unteren Rand
- ✅ Navigation zwischen Screens eingerichtet

## Was als Nächstes kommt

- Onboarding-Screen mit Privacy-Hinweis und Berechtigungsanfrage
- Auswahl eines Fotoalbums als Quiz-Pool
- Echte Swipe-Quiz-Logik (Frage anzeigen, Antwort erfassen, auswerten)
- Wikimedia-"On this day"-Integration für historische Fakten
- On-Device-Bildbearbeitung als Proof-of-Concept (z. B. weichgezeichnetes Foto)
- Ergebnis-Bildschirm nach einer Quiz-Runde

## Datenschutz

Memo-Me verarbeitet Fotos ausschließlich lokal auf dem Gerät. Es werden keine
Fotos, Namen oder sonstigen Daten an einen Server übertragen – mit Ausnahme
der geplanten Wikimedia-Anfrage, die nur das Datum eines Fotos (keine
Bilddaten) an die öffentliche Wikimedia-API sendet.
