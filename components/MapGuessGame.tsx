// Karten-Schätzfrage: der Nutzer tippt auf einer (stark vereinfachten)
// Weltkarte an, wo das gezeigte Foto vermutlich aufgenommen wurde. Die Karte
// ist bewusst nur eine grobe Orientierungshilfe (keine exakten Landesgrenzen),
// da es hier um Spielspaß statt Geografie-Präzision geht - ausgewertet wird
// per einfacher Entfernungsschätzung zur echten Koordinate.
import React, { useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { colors, radius, spacing, typography } from '../theme';

interface MapGuessGameProps {
  photoUri: string;
  targetLatitude: number;
  targetLongitude: number;
  onSubmit: (isCorrect: boolean, distanceKm: number) => void;
  disabled?: boolean;
}

// Unterhalb dieser Entfernung zählt der Tipp als richtig - großzügig
// bemessen, da eine kleine, stark vereinfachte Karte keine präzisen Tipps
// erlaubt (und nicht erlauben soll).
const CORRECT_RADIUS_KM = 1000;
// Ab dieser Entfernung gilt der Tipp als "Volltreffer" für die Anzeige.
const BULLSEYE_RADIUS_KM = 100;

// Grobe, stark vereinfachte Kontinent-Silhouetten als [Längengrad,
// Breitengrad]-Punkte - keine exakten Grenzen, nur zur groben Orientierung.
const CONTINENTS: [number, number][][] = [
  // Nordamerika
  [
    [-170, 70], [-155, 70], [-130, 55], [-95, 50], [-75, 45], [-80, 25],
    [-97, 18], [-105, 20], [-117, 32], [-124, 40], [-125, 49], [-140, 60], [-165, 65],
  ],
  // Südamerika
  [
    [-80, 10], [-60, 10], [-35, -5], [-35, -20], [-40, -35], [-58, -52],
    [-68, -52], [-75, -40], [-81, -5],
  ],
  // Europa
  [
    [-10, 60], [20, 65], [40, 60], [40, 45], [28, 42], [15, 38], [-5, 43], [-10, 50],
  ],
  // Afrika
  [
    [-17, 35], [10, 37], [35, 30], [43, 12], [51, 12], [45, -2], [40, -20],
    [35, -35], [18, -35], [12, -18], [9, 4], [-10, 10], [-17, 20],
  ],
  // Asien
  [
    [28, 42], [40, 45], [60, 55], [90, 60], [130, 60], [140, 45], [140, 35],
    [130, 32], [120, 25], [110, 20], [100, 10], [95, 5], [75, 8], [65, 25], [50, 30], [40, 35],
  ],
  // Australien
  [
    [113, -12], [130, -12], [145, -15], [153, -28], [150, -38], [138, -35], [115, -32], [112, -22],
  ],
];

const MAP_VIEWBOX_WIDTH = 360;
const MAP_VIEWBOX_HEIGHT = 180;

function lonToX(lon: number): number {
  return lon + 180;
}

function latToY(lat: number): number {
  return 90 - lat;
}

function continentPath(points: [number, number][]): string {
  return points.map(([lon, lat], index) => `${index === 0 ? 'M' : 'L'} ${lonToX(lon)} ${latToY(lat)}`).join(' ') + ' Z';
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

interface Guess {
  latitude: number;
  longitude: number;
  distanceKm: number;
}

export function MapGuessGame({ photoUri, targetLatitude, targetLongitude, onSubmit, disabled = false }: MapGuessGameProps) {
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [guess, setGuess] = useState<Guess | null>(null);

  const isRevealed = disabled || guess !== null;

  function handleLayout(event: LayoutChangeEvent) {
    setMapSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height });
  }

  function handlePress(event: GestureResponderEvent) {
    if (isRevealed || mapSize.width === 0) return;
    const { locationX, locationY } = event.nativeEvent;
    const fracX = Math.min(1, Math.max(0, locationX / mapSize.width));
    const fracY = Math.min(1, Math.max(0, locationY / mapSize.height));
    const longitude = fracX * 360 - 180;
    const latitude = 90 - fracY * 180;
    const distanceKm = haversineDistanceKm(latitude, longitude, targetLatitude, targetLongitude);
    setGuess({ latitude, longitude, distanceKm });
    onSubmit(distanceKm <= CORRECT_RADIUS_KM, distanceKm);
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
      <Text style={styles.instruction}>
        {isRevealed ? 'So lag dein Tipp:' : 'Tippe auf die Karte, wo das Foto aufgenommen wurde.'}
      </Text>
      <Pressable style={styles.mapWrapper} onPress={handlePress} onLayout={handleLayout} disabled={isRevealed}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${MAP_VIEWBOX_WIDTH} ${MAP_VIEWBOX_HEIGHT}`}>
          <Path d={`M 0 0 H ${MAP_VIEWBOX_WIDTH} V ${MAP_VIEWBOX_HEIGHT} H 0 Z`} fill={colors.background} />
          {CONTINENTS.map((points, index) => (
            <Path key={index} d={continentPath(points)} fill={colors.border} />
          ))}
          {isRevealed && guess && (
            <Line
              x1={lonToX(guess.longitude)}
              y1={latToY(guess.latitude)}
              x2={lonToX(targetLongitude)}
              y2={latToY(targetLatitude)}
              stroke={colors.textSecondary}
              strokeWidth={0.5}
              strokeDasharray="2,2"
            />
          )}
          {isRevealed && (
            <Circle cx={lonToX(targetLongitude)} cy={latToY(targetLatitude)} r={2.5} fill={colors.success} />
          )}
          {guess && (
            <Circle
              cx={lonToX(guess.longitude)}
              cy={latToY(guess.latitude)}
              r={2.5}
              fill={guess.distanceKm <= CORRECT_RADIUS_KM ? colors.success : colors.danger}
            />
          )}
        </Svg>
      </Pressable>
      {guess && (
        <Text style={styles.resultText}>
          {guess.distanceKm <= BULLSEYE_RADIUS_KM
            ? 'Volltreffer!'
            : `${Math.round(guess.distanceKm)} km entfernt vom echten Ort.`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.md,
    alignItems: 'center',
  },
  photo: {
    width: '60%',
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  instruction: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  mapWrapper: {
    width: '100%',
    aspectRatio: MAP_VIEWBOX_WIDTH / MAP_VIEWBOX_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
