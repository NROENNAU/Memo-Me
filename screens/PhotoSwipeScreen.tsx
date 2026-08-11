// Quiz-Bildschirm: zeigt Fotos aus der Mediathek nacheinander, abwechselnd
// mit der "Wann"- und der "Wo"-Frage (Mehrfachauswahl aus vier Optionen).
// Antworten lösen sich beim Antippen sofort auf; weiter geht es per
// Wisch-Geste nach oben (kein Bestätigen-/Überspringen-Button mehr).
// Die Wer-Frage folgt in einem späteren Schritt (braucht erst Personen-Tags).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { AnswerOptions } from '../components/AnswerOptions';
import { MemoryPrompt } from '../components/MemoryPrompt';
import { ScoreRing } from '../components/ScoreRing';
import { listCandidatePhotos, resolvePhotoDetails } from '../services/mediaLibraryService';
import { reverseGeocode } from '../services/locationService';
import { buildWannQuestion, buildWoQuestion, shuffle } from '../services/quizService';
import { upsertPhoto } from '../db/photoRepository';
import { saveQuizResult } from '../db/quizResultRepository';
import { saveMemory, getMemoryForPhoto } from '../db/memoryRepository';
import { LibraryPhoto } from '../types/Photo';
import { RootStackParamList } from '../types/navigation';
import { colors, spacing, radius, typography } from '../theme';

// Anzahl Fotos pro Quizrunde.
const QUIZ_LENGTH = 10;
// Größerer Pool, aus dem pro Runde zufällig QUIZ_LENGTH Fotos gezogen
// werden – sonst wäre jede Runde (und jeder Neustart) identisch.
const FETCH_POOL_SIZE = 40;
// Ab dieser vertikalen Strecke (in Pixeln) zählt eine Wisch-nach-oben-Geste.
const SWIPE_UP_THRESHOLD = 60;

interface QuizPhoto {
  photo: LibraryPhoto;
  locationName: string | null;
}

type Question =
  | { type: 'WANN'; options: string[]; correctOption: string }
  | { type: 'WO'; options: string[]; correctOption: string };

type Props = NativeStackScreenProps<RootStackParamList, 'PhotoSwipe'>;

export function PhotoSwipeScreen({ route, navigation }: Props) {
  const { source } = route.params;
  const [photos, setPhotos] = useState<QuizPhoto[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [promptPhotoUri, setPromptPhotoUri] = useState<string | null>(null);
  const [memoryPromptFotoId, setMemoryPromptFotoId] = useState<number | null>(null);
  const [isPromptDone, setIsPromptDone] = useState(false);
  const [revealedMemoryText, setRevealedMemoryText] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadQuiz = useCallback(async () => {
    setPhotos(null);
    setPromptPhotoUri(null);
    setMemoryPromptFotoId(null);
    setIsPromptDone(false);
    setErrorMessage(null);

    try {
      // Schritt 1: nur eine schnelle, leichte Liste möglicher Fotos holen
      // (kein Ort, keine Detail-Infos) – das ist der einzige Schritt, bevor
      // das erste Foto angezeigt werden kann.
      const candidates = await listCandidatePhotos(source, FETCH_POOL_SIZE);
      if (!isMountedRef.current) return;
      // Ohne Aufnahmedatum lässt sich keine "Wann"-Frage stellen.
      const withDate = candidates.filter((candidate) => candidate.creationTime !== null);
      // Zufällige Auswahl aus dem Pool, damit nicht jede Runde exakt
      // dieselben (neuesten) Fotos zeigt.
      const selected = shuffle(withDate).slice(0, QUIZ_LENGTH);

      if (selected.length === 0) {
        setPhotos([]);
        setIsPromptDone(true);
        return;
      }

      // Erstes Foto sofort für die Erinnerungs-Frage zeigen – noch bevor die
      // teureren Detail-Infos (Ort) für die Runde nachgeladen werden. So
      // überbrückt die Frage die sonst tote Ladezeit, statt davor zu stehen.
      const firstPhoto = selected[0];
      const firstFotoId = await upsertPhoto(firstPhoto);
      if (!isMountedRef.current) return;
      const existingMemory = await getMemoryForPhoto(firstFotoId);
      if (!isMountedRef.current) return;
      if (existingMemory) {
        setIsPromptDone(true);
      } else {
        setMemoryPromptFotoId(firstFotoId);
        setPromptPhotoUri(firstPhoto.uri);
      }

      // Schritt 2: erst jetzt für die ausgewählten Fotos die vollen Details
      // (u. a. Ort) nachladen – nacheinander, nicht parallel, um den
      // Geocoding-Dienst nicht mit gleichzeitigen Anfragen zu überlasten.
      const quizPhotos: QuizPhoto[] = [];
      for (const candidate of selected) {
        if (!isMountedRef.current) return;
        const photo = await resolvePhotoDetails(candidate);
        if (!isMountedRef.current) return;
        const locationName = photo.coordinates ? await reverseGeocode(photo.coordinates) : null;
        quizPhotos.push({ photo, locationName });
      }

      if (!isMountedRef.current) return;
      setPhotos(quizPhotos);
      setCurrentIndex(0);
      setSelectedOption(null);
      setIsRevealed(false);
      setRevealedMemoryText(null);
      setScore({ correct: 0, total: 0 });
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Fotos konnten nicht geladen werden:', error);
      setErrorMessage('Deine Fotos konnten nicht geladen werden.');
    }
  }, [source]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const currentItem = photos?.[currentIndex] ?? null;

  // Wechselt pro Foto zwischen "Wann" und "Wo". Lässt sich eine Wo-Frage
  // nicht bilden (kein Ort bekannt), wird stattdessen die Wann-Frage gestellt.
  const question: Question | null = useMemo(() => {
    if (!currentItem || !photos) return null;

    const preferWo = currentIndex % 2 === 1;
    if (preferWo) {
      const otherPlaces = photos
        .filter((_, index) => index !== currentIndex)
        .map((item) => item.locationName)
        .filter((place): place is string => place !== null);
      const wo = buildWoQuestion(currentItem.locationName, otherPlaces);
      if (wo) return { type: 'WO', options: wo.options, correctOption: wo.correctPlace };
    }

    const wann = buildWannQuestion(currentItem.photo);
    if (wann) {
      return { type: 'WANN', options: wann.options.map(String), correctOption: String(wann.correctYear) };
    }
    return null;
  }, [currentItem, photos, currentIndex]);

  function goToNextPhoto() {
    setSelectedOption(null);
    setIsRevealed(false);
    setRevealedMemoryText(null);
    setCurrentIndex((index) => index + 1);
  }

  function handleMemorySubmit(text: string) {
    if (memoryPromptFotoId !== null) {
      saveMemory(memoryPromptFotoId, text).catch((error) => {
        console.error('Erinnerung konnte nicht gespeichert werden:', error);
      });
    }
    setIsPromptDone(true);
  }

  function handleMemorySkip() {
    setIsPromptDone(true);
  }

  // Beim Antippen einer Option löst sich die Antwort sofort auf – kein
  // zusätzlicher Bestätigen-Schritt mehr.
  async function handleSelectAnswer(option: string) {
    if (!currentItem || !question || isRevealed) return;

    setSelectedOption(option);
    const isCorrect = option === question.correctOption;
    setIsRevealed(true);
    setScore((previous) => ({
      correct: previous.correct + (isCorrect ? 1 : 0),
      total: previous.total + 1,
    }));

    try {
      const fotoId = await upsertPhoto(currentItem.photo);
      await saveQuizResult(fotoId, question.type, isCorrect);
      // Falls zu diesem Foto schon eine eigene Geschichte hinterlegt ist,
      // zeigen wir sie jetzt als kleines Extra zur Antwort.
      const memory = await getMemoryForPhoto(fotoId);
      if (isMountedRef.current) setRevealedMemoryText(memory);
    } catch (error) {
      console.error('Quizergebnis konnte nicht gespeichert werden:', error);
    }
  }

  // Wisch-nach-oben-Geste: nur aktiv, nachdem die Antwort aufgelöst wurde
  // (isRevealedRef vermeidet einen veralteten Stand in den Gesten-Callbacks).
  const isRevealedRef = useRef(isRevealed);
  useEffect(() => {
    isRevealedRef.current = isRevealed;
  }, [isRevealed]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        isRevealedRef.current && -gestureState.dy > Math.abs(gestureState.dx) && -gestureState.dy > 10,
      onPanResponderRelease: (_, gestureState) => {
        if (isRevealedRef.current && -gestureState.dy > SWIPE_UP_THRESHOLD) {
          goToNextPhoto();
        }
      },
    })
  ).current;

  function restartQuiz() {
    loadQuiz();
  }

  function startDifferentQuiz() {
    navigation.replace('PhotoSource');
  }

  const showMemoryPrompt = promptPhotoUri !== null && !isPromptDone;
  const isLoading = photos === null && !errorMessage && !showMemoryPrompt;
  const loadingMessage = isPromptDone ? 'Fast fertig …' : 'Dein Quiz wird vorbereitet …';
  const isFinished = photos !== null && photos.length > 0 && currentIndex >= photos.length;
  const headingText =
    question?.type === 'WO' ? 'Wo wurde dieses Foto aufgenommen?' : 'Wann wurde dieses Foto aufgenommen?';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.content} {...panResponder.panHandlers}>
        {isLoading && (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.statusText}>{loadingMessage}</Text>
          </>
        )}

        {!isLoading && errorMessage && <Text style={styles.statusText}>{errorMessage}</Text>}

        {!isLoading && !errorMessage && photos?.length === 0 && (
          <Text style={styles.statusText}>
            In deiner Mediathek wurden keine Fotos mit Aufnahmedatum gefunden.
          </Text>
        )}

        {!isLoading && !errorMessage && showMemoryPrompt && promptPhotoUri && (
          <MemoryPrompt
            photoUri={promptPhotoUri}
            onSubmit={handleMemorySubmit}
            onSkip={handleMemorySkip}
          />
        )}

        {!isLoading && !errorMessage && !showMemoryPrompt && isFinished && (
          <>
            <Text style={styles.heading}>Großartig!</Text>
            <Text style={styles.statusText}>Du hast das Quiz abgeschlossen.</Text>
            <ScoreRing correct={score.correct} total={score.total} />
            <Pressable
              style={styles.restartButton}
              onPress={restartQuiz}
              accessibilityRole="button"
              accessibilityLabel="Quiz nochmal spielen"
            >
              <Text style={styles.restartButtonText}>Nochmal spielen</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={startDifferentQuiz}
              accessibilityRole="button"
              accessibilityLabel="Anderes Quiz starten, zurück zur Fotoquellen-Auswahl"
            >
              <Text style={styles.secondaryButtonText}>Anderes Quiz starten</Text>
            </Pressable>
          </>
        )}

        {!isLoading && !errorMessage && !showMemoryPrompt && !isFinished && currentItem && question && (
          <>
            <Text style={styles.heading}>{headingText}</Text>
            <Image
              source={{ uri: currentItem.photo.uri }}
              style={styles.photo}
              contentFit="cover"
              accessibilityLabel="Ein Foto aus deiner Mediathek"
            />
            <AnswerOptions
              options={question.options}
              selectedOption={selectedOption}
              correctOption={question.correctOption}
              isRevealed={isRevealed}
              onSelect={handleSelectAnswer}
            />
            {isRevealed && revealedMemoryText && (
              <View style={styles.memoryBox}>
                <Text style={styles.memoryText}>📝 {revealedMemoryText}</Text>
              </View>
            )}
            {isRevealed && <Text style={styles.hintText}>Nach oben wischen für das nächste Foto</Text>}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  statusText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  heading: {
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  photo: {
    width: '100%',
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  hintText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  memoryBox: {
    width: '100%',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  memoryText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  restartButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  restartButtonText: {
    ...typography.button,
    color: colors.textOnPrimary,
  },
  secondaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.primary,
  },
});
