// Quiz-Bildschirm: zeigt Fotos aus der Mediathek nacheinander, abwechselnd
// mit der "Wann"- und der "Wo"-Frage (Mehrfachauswahl aus vier Optionen).
// Antworten lösen sich beim Antippen sofort auf; weiter geht es per
// Wisch-Geste nach oben (kein Bestätigen-/Überspringen-Button mehr).
// Zwischendurch schiebt curiosityService an zufälligen Punkten eine kurze
// Wissensfrage zum aktuellen Foto ein (siehe goToNextPhoto).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { AlbumPickerModal } from '../components/AlbumPickerModal';
import { AnswerOptions } from '../components/AnswerOptions';
import { AudioPlayButton } from '../components/AudioPlayButton';
import { CuriosityPrompt } from '../components/CuriosityPrompt';
import { PhotoActions } from '../components/PhotoActions';
import { ScoreRing } from '../components/ScoreRing';
import {
  addPhotosToAlbum,
  deleteAsset,
  findAlbumContainingAsset,
  findSimilarPhotos,
  listCandidatePhotos,
  resolvePhotoDetails,
} from '../services/mediaLibraryService';
import { reverseGeocode } from '../services/locationService';
import {
  buildErinnerungQuestion,
  buildWannQuestion,
  buildWerQuestion,
  buildWoQuestion,
  shuffle,
} from '../services/quizService';
import { classifyPhoto, isJunkLabels, isLikelyScreenshot } from '../services/junkPhotoFilter';
import { matchesDescription, matchesLocation, matchesTags } from '../services/customSourceFilter';
import { captureNamedFaces, findTargetFacesForDescription, matchesNamedFace } from '../services/faceMatchingService';
import { ImageLabel } from '../modules/image-classifier/src';
import { NamedFace } from '../db/faceRepository';
import { CuriosityQuestion, pickCuriosityQuestion, shouldInterject } from '../services/curiosityService';
import { upsertPhoto, savePhotoTags, getPhotoTags } from '../db/photoRepository';
import { saveQuizResult } from '../db/quizResultRepository';
import { Memory, saveMemory, getMemoryForPhoto } from '../db/memoryRepository';
import { AlbumAssignment, getCurrentAlbumForPhoto, saveAlbumAssignment } from '../db/albumAssignmentRepository';
import { LibraryPhoto } from '../types/Photo';
import { RootStackParamList } from '../types/navigation';
import { colors, spacing, radius, typography } from '../theme';

// Anzahl Fotos pro Quizrunde.
const QUIZ_LENGTH = 10;
// Größerer Pool, aus dem pro Runde zufällig QUIZ_LENGTH Fotos gezogen
// werden – sonst wäre jede Runde (und jeder Neustart) identisch. Bewusst
// größer als QUIZ_LENGTH, da Screenshots/Belege/Dokumente aus dem Pool
// herausgefiltert werden, bevor QUIZ_LENGTH brauchbare Fotos feststehen.
const FETCH_POOL_SIZE = 80;
// Bei "Eigene Auswahl" trifft eine schmale Beschreibung (z. B. "Hundebilder")
// oft nur einen kleinen Bruchteil der Bibliothek - ein Pool von 80 Fotos
// enthält dann statistisch kaum ein Treffer. Deutlich größerer Pool, dafür
// dauert das Laden hier spürbar länger (siehe LOADING_MESSAGE unten).
const CUSTOM_FETCH_POOL_SIZE = 250;
// Wie viele Fotos gleichzeitig klassifiziert werden, statt strikt
// nacheinander - die on-device Bilderkennung ist der langsamste Schritt
// beim Laden, moderate Parallelität beschleunigt das spürbar.
const CLASSIFICATION_CONCURRENCY = 4;
// Ab dieser vertikalen Strecke (in Pixeln) zählt eine Wisch-nach-oben-Geste.
const SWIPE_UP_THRESHOLD = 60;

interface QuizPhoto {
  photo: LibraryPhoto;
  locationName: string | null;
  tags: string[] | null;
  memoryText: string | null;
}

type QuestionKind = 'WANN' | 'WO' | 'WER' | 'ERINNERUNG';

interface Question {
  type: QuestionKind;
  options: string[];
  correctOption: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'PhotoSwipe'>;

export function PhotoSwipeScreen({ route, navigation }: Props) {
  const { source } = route.params;
  const [photos, setPhotos] = useState<QuizPhoto[] | null>(null);
  // Wird erst true, wenn der komplette Kandidaten-Pool durchsucht wurde -
  // solange noch danach gesucht wird, ist "Foto-Ende erreicht" nicht
  // gleichbedeutend mit "Runde fertig" (siehe isFinished/isSearching unten).
  const [isSearchComplete, setIsSearchComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [curiosityQuestion, setCuriosityQuestion] = useState<CuriosityQuestion | null>(null);
  const [curiosityFotoId, setCuriosityFotoId] = useState<number | null>(null);
  const [curiosityPhotoUri, setCuriosityPhotoUri] = useState<string | null>(null);
  // Unterscheidet die Zwischenfrage während des Ladens (nutzt die sonst tote
  // Wartezeit, siehe loadQuiz) von der Zwischenfrage während des laufenden
  // Quiz (siehe goToNextPhoto) - entscheidet, ob nach der Antwort der
  // Fotoindex weiterspringen muss oder nicht.
  const [curiosityFromLoading, setCuriosityFromLoading] = useState(false);
  const [revealedMemory, setRevealedMemory] = useState<Memory | null>(null);
  const [isAlbumPickerOpen, setIsAlbumPickerOpen] = useState(false);
  const [currentAlbum, setCurrentAlbum] = useState<AlbumAssignment | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadQuiz = useCallback(async () => {
    setPhotos(null);
    setIsSearchComplete(false);
    setCuriosityQuestion(null);
    setCuriosityFotoId(null);
    setCuriosityPhotoUri(null);
    setErrorMessage(null);

    try {
      // Schritt 1: nur eine schnelle, leichte Liste möglicher Fotos holen
      // (kein Ort, keine Detail-Infos).
      const poolSize = source.type === 'custom' ? CUSTOM_FETCH_POOL_SIZE : FETCH_POOL_SIZE;
      const candidates = await listCandidatePhotos(source, poolSize);
      if (!isMountedRef.current) return;
      // Ohne Aufnahmedatum lässt sich keine "Wann"-Frage stellen. Screenshots
      // lassen sich schon anhand vorhandener Metadaten aussortieren, noch
      // bevor überhaupt Detail-Infos nachgeladen werden.
      const withDate = candidates.filter(
        (candidate) => candidate.creationTime !== null && !isLikelyScreenshot(candidate)
      );
      // Zufällige Reihenfolge, damit nicht jede Runde exakt dieselben
      // (neuesten) Fotos zeigt.
      const shuffled = shuffle(withDate);

      if (shuffled.length === 0) {
        setPhotos([]);
        setIsSearchComplete(true);
        return;
      }

      // Bei "Eigene Auswahl" schon einmal benannte Gesichter (siehe "Wer ist
      // das?") heranziehen, deren Name zur Beschreibung passt (z. B.
      // "Daria") - einmal pro Suche geladen, nicht pro Foto.
      const targetNamedFaces: NamedFace[] =
        source.type === 'custom' ? await findTargetFacesForDescription(source.description) : [];
      if (!isMountedRef.current) return;

      // Schritt 2: Details nachladen (u. a. Ort) und per on-device
      // Bilderkennung Belege/Dokumente aussortieren, bis QUIZ_LENGTH
      // brauchbare Fotos feststehen oder der Pool erschöpft ist. Mehrere
      // Fotos werden gleichzeitig klassifiziert (CLASSIFICATION_CONCURRENCY),
      // da das der langsamste Schritt ist. Sobald das erste brauchbare Foto
      // feststeht, wird die Runde direkt gezeigt - der Rest lädt im
      // Hintergrund weiter nach, während schon gespielt werden kann.
      const quizPhotos: QuizPhoto[] = [];
      let hasCheckedCuriosity = false;
      let hasRevealedQuiz = false;

      for (let i = 0; i < shuffled.length; i += CLASSIFICATION_CONCURRENCY) {
        if (quizPhotos.length >= QUIZ_LENGTH) break;
        if (!isMountedRef.current) return;

        const chunk = shuffled.slice(i, i + CLASSIFICATION_CONCURRENCY);
        const resolved = await Promise.all(
          chunk.map(async (candidate) => {
            const photo = await resolvePhotoDetails(candidate);
            const fotoId = await upsertPhoto(photo);

            // Bei "Eigene Auswahl" zuerst gegen Daten prüfen, die die App
            // schon über das Foto weiß (Personen-Tags, aufgelöster
            // Ortsname) - kein ML nötig, quasi instantan. Erst wenn das
            // nichts ergibt, die deutlich langsamere Bildklassifikation
            // bemühen.
            let locationName: string | null = null;
            let tags: string[] | null = null;
            let matchedByMetadata = false;

            if (source.type === 'custom') {
              [locationName, tags] = await Promise.all([
                photo.coordinates ? reverseGeocode(photo.coordinates) : Promise.resolve(null),
                getPhotoTags(fotoId),
              ]);
              matchedByMetadata =
                matchesTags(tags, source.description) || matchesLocation(locationName, source.description);
              if (!matchedByMetadata && targetNamedFaces.length > 0) {
                matchedByMetadata = await matchesNamedFace(photo.uri, targetNamedFaces);
              }
            }

            const labels: ImageLabel[] = matchedByMetadata ? [] : await classifyPhoto(fotoId, photo.uri);

            return { photo, fotoId, labels, locationName, tags, matchedByMetadata };
          })
        );
        if (!isMountedRef.current) return;

        for (const item of resolved) {
          if (quizPhotos.length >= QUIZ_LENGTH) break;

          const { photo, fotoId, labels, matchedByMetadata } = item;
          let { locationName, tags } = item;

          if (!matchedByMetadata) {
            if (isJunkLabels(labels)) continue;
            if (source.type === 'custom' && !matchesDescription(labels, source.description)) continue;
          }

          if (source.type !== 'custom') {
            [locationName, tags] = await Promise.all([
              photo.coordinates ? reverseGeocode(photo.coordinates) : Promise.resolve(null),
              getPhotoTags(fotoId),
            ]);
            if (!isMountedRef.current) return;
          }

          const memory = await getMemoryForPhoto(fotoId);
          if (!isMountedRef.current) return;

          if (!hasCheckedCuriosity) {
            hasCheckedCuriosity = true;
            const question = await pickCuriosityQuestion(fotoId);
            if (!isMountedRef.current) return;
            if (question) {
              setCuriosityFotoId(fotoId);
              setCuriosityPhotoUri(photo.uri);
              setCuriosityFromLoading(true);
              setCuriosityQuestion(question);
            }
          }

          quizPhotos.push({ photo, locationName, tags, memoryText: memory?.text ?? null });

          if (!hasRevealedQuiz) {
            hasRevealedQuiz = true;
            setCurrentIndex(0);
            setSelectedOption(null);
            setIsRevealed(false);
            setRevealedMemory(null);
            setScore({ correct: 0, total: 0 });
          }
          setPhotos([...quizPhotos]);
        }
      }

      if (!isMountedRef.current) return;
      setIsSearchComplete(true);
      if (quizPhotos.length === 0) {
        setPhotos([]);
      }
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

  // Wählt zufällig aus den Fragetypen, die sich für das aktuelle Foto
  // tatsächlich bilden lassen (Wer/Erinnerung brauchen entsprechende Daten
  // zu diesem Foto) - so variiert die Art der Frage, statt starr zwischen
  // Wann und Wo zu wechseln. Wann geht immer und dient als letzter Rückfall.
  const question: Question | null = useMemo(() => {
    if (!currentItem || !photos) return null;

    const others = photos.filter((_, index) => index !== currentIndex);

    const builders: Array<() => Question | null> = [
      () => {
        const otherPlaces = others.map((item) => item.locationName).filter((place): place is string => place !== null);
        const wo = buildWoQuestion(currentItem.locationName, otherPlaces);
        return wo ? { type: 'WO', options: wo.options, correctOption: wo.correctPlace } : null;
      },
      () => {
        const otherNames = others.flatMap((item) => item.tags ?? []);
        const wer = buildWerQuestion(currentItem.tags, otherNames);
        return wer ? { type: 'WER', options: wer.options, correctOption: wer.correctName } : null;
      },
      () => {
        const otherTexts = others.map((item) => item.memoryText).filter((text): text is string => text !== null);
        const erinnerung = buildErinnerungQuestion(currentItem.memoryText, otherTexts);
        return erinnerung
          ? { type: 'ERINNERUNG', options: erinnerung.options, correctOption: erinnerung.correctText }
          : null;
      },
    ];

    for (const build of shuffle(builders)) {
      const built = build();
      if (built) return built;
    }

    const wann = buildWannQuestion(currentItem.photo);
    if (wann) {
      return { type: 'WANN', options: wann.options.map(String), correctOption: String(wann.correctYear) };
    }
    return null;
  }, [currentItem, photos, currentIndex]);

  // Prüft für das aktuelle Foto, ob es schon einem Album zugeordnet ist –
  // erst der schnelle, eigene Cache (FotoAlben), und nur falls dort nichts
  // bekannt ist, zusätzlich ein echter Abgleich mit allen Alben der
  // Mediathek (deckt auch Zuordnungen ab, die nicht über Memo-Me gemacht
  // wurden). Ein gefundenes Ergebnis wird im Cache abgelegt, damit der
  // langsame Abgleich pro Foto nur einmal nötig ist.
  useEffect(() => {
    if (!currentItem) {
      setCurrentAlbum(null);
      return;
    }
    let isActive = true;

    (async () => {
      try {
        const fotoId = await upsertPhoto(currentItem.photo);
        let assignment = await getCurrentAlbumForPhoto(fotoId);

        if (!assignment) {
          const nativeAlbum = await findAlbumContainingAsset(currentItem.photo.assetId);
          if (!isActive) return;
          if (nativeAlbum) {
            assignment = { albumId: nativeAlbum.id, albumTitle: nativeAlbum.title };
            await saveAlbumAssignment(fotoId, nativeAlbum.id, nativeAlbum.title);
          }
        }

        if (isActive) setCurrentAlbum(assignment);
      } catch (error) {
        console.error('Album-Zuordnung konnte nicht geladen werden:', error);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [currentItem]);

  // Wechselt zum nächsten Foto - schiebt aber zuvor mit einer gewissen
  // Wahrscheinlichkeit eine kurze Wissensfrage zum gerade gezeigten Foto ein
  // (siehe curiosityService). Nur wenn dazu tatsächlich etwas fehlt, wird
  // auch wirklich gefragt.
  async function goToNextPhoto() {
    const finishedItem = currentItem;
    setSelectedOption(null);
    setIsRevealed(false);
    setRevealedMemory(null);

    if (finishedItem && shouldInterject()) {
      try {
        const fotoId = await upsertPhoto(finishedItem.photo);
        if (!isMountedRef.current) return;
        const question = await pickCuriosityQuestion(fotoId);
        if (!isMountedRef.current) return;
        if (question) {
          setCuriosityFotoId(fotoId);
          setCuriosityPhotoUri(finishedItem.photo.uri);
          setCuriosityFromLoading(false);
          setCuriosityQuestion(question);
          return;
        }
      } catch (error) {
        console.error('Wissensfrage konnte nicht vorbereitet werden:', error);
      }
    }

    setCurrentIndex((index) => index + 1);
  }

  function handleCuriositySubmit(answer: { text: string | null; audioUri: string | null }) {
    if (curiosityFotoId !== null && curiosityQuestion) {
      if (curiosityQuestion.kind === 'story') {
        saveMemory(curiosityFotoId, answer).catch((error) => {
          console.error('Erinnerung konnte nicht gespeichert werden:', error);
        });
      } else if (curiosityQuestion.kind === 'who' && answer.text) {
        const names = answer.text
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean);
        if (names.length > 0) {
          savePhotoTags(curiosityFotoId, names).catch((error) => {
            console.error('Namen konnten nicht gespeichert werden:', error);
          });
          if (curiosityPhotoUri) {
            captureNamedFaces(curiosityFotoId, curiosityPhotoUri, names).catch((error) => {
              console.error('Gesicht konnte nicht erfasst werden:', error);
            });
          }
        }
      }
    }
    const wasFromLoading = curiosityFromLoading;
    setCuriosityQuestion(null);
    setCuriosityFotoId(null);
    setCuriosityPhotoUri(null);
    if (!wasFromLoading) {
      setCurrentIndex((index) => index + 1);
    }
  }

  function handleCuriositySkip() {
    const wasFromLoading = curiosityFromLoading;
    setCuriosityQuestion(null);
    setCuriosityFotoId(null);
    setCuriosityPhotoUri(null);
    if (!wasFromLoading) {
      setCurrentIndex((index) => index + 1);
    }
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
      if (isMountedRef.current) setRevealedMemory(memory);
    } catch (error) {
      console.error('Quizergebnis konnte nicht gespeichert werden:', error);
    }
  }

  function handleDeletePhoto() {
    if (!currentItem) return;
    Alert.alert(
      'Foto löschen?',
      'Das Foto wird dauerhaft aus deiner Mediathek gelöscht. Das lässt sich nicht rückgängig machen.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAsset(currentItem.photo.assetId);
              if (isMountedRef.current) goToNextPhoto();
            } catch (error) {
              console.error('Foto konnte nicht gelöscht werden:', error);
            }
          },
        },
      ]
    );
  }

  function handleOpenAlbumPicker() {
    setIsAlbumPickerOpen(true);
  }

  async function handleAlbumAssigned(albumId: string, albumTitle: string) {
    setIsAlbumPickerOpen(false);
    if (!currentItem) return;

    setCurrentAlbum({ albumId, albumTitle });
    try {
      const fotoId = await upsertPhoto(currentItem.photo);
      await saveAlbumAssignment(fotoId, albumId, albumTitle);
    } catch (error) {
      console.error('Album-Zuordnung konnte nicht gespeichert werden:', error);
    }

    try {
      const similar = await findSimilarPhotos(currentItem.photo, currentItem.photo.assetId);
      if (!isMountedRef.current || similar.length === 0) return;

      Alert.alert(
        'Ähnliche Fotos gefunden',
        `${similar.length} weitere Foto${similar.length === 1 ? '' : 's'} vom selben Tag gefunden. Auch zu „${albumTitle}“ hinzufügen?`,
        [
          { text: 'Nein', style: 'cancel' },
          {
            text: 'Ja, alle hinzufügen',
            onPress: async () => {
              try {
                await addPhotosToAlbum(
                  similar.map((candidate) => candidate.assetId),
                  albumId
                );
              } catch (error) {
                console.error('Ähnliche Fotos konnten nicht hinzugefügt werden:', error);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Ähnliche Fotos konnten nicht gesucht werden:', error);
    }
  }

  // Wisch-nach-oben-Geste: nur aktiv, nachdem die Antwort aufgelöst wurde und
  // solange keine Wissensfrage eingeblendet ist (die Refs vermeiden einen
  // veralteten Stand in den Gesten-Callbacks).
  const isRevealedRef = useRef(isRevealed);
  useEffect(() => {
    isRevealedRef.current = isRevealed;
  }, [isRevealed]);

  const isCuriosityActiveRef = useRef(false);
  useEffect(() => {
    isCuriosityActiveRef.current = curiosityQuestion !== null;
  }, [curiosityQuestion]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        isRevealedRef.current &&
        !isCuriosityActiveRef.current &&
        -gestureState.dy > Math.abs(gestureState.dx) &&
        -gestureState.dy > 10,
      onPanResponderRelease: (_, gestureState) => {
        if (isRevealedRef.current && !isCuriosityActiveRef.current && -gestureState.dy > SWIPE_UP_THRESHOLD) {
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

  const isLoading = photos === null && !errorMessage && !curiosityQuestion;
  // Fotoende erreicht, aber der Hintergrund-Suchlauf hat noch nicht
  // fertig durchsucht - kein "Runde fertig", sondern kurz weiter warten.
  const isWaitingForMore =
    photos !== null && !isSearchComplete && currentIndex >= photos.length && !curiosityQuestion;
  const isFinished =
    photos !== null && photos.length > 0 && currentIndex >= photos.length && isSearchComplete;
  const headingByType: Record<QuestionKind, string> = {
    WANN: 'Wann wurde dieses Foto aufgenommen?',
    WO: 'Wo wurde dieses Foto aufgenommen?',
    WER: 'Wer ist auf diesem Foto zu sehen?',
    ERINNERUNG: 'Welche Erinnerung passt zu diesem Foto?',
  };
  const headingText = question ? headingByType[question.type] : '';
  const loadingMessage =
    source.type === 'custom'
      ? `Durchsuche deine Fotos nach „${source.description}“ … Das kann bei einer eigenen Auswahl etwas dauern.`
      : 'Dein Quiz wird vorbereitet …';

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

        {!isLoading && !errorMessage && isSearchComplete && photos?.length === 0 && (
          <Text style={styles.statusText}>
            {source.type === 'custom'
              ? `Keine Fotos zu „${source.description}“ gefunden. Versuch es mit einer anderen Beschreibung.`
              : 'In deiner Mediathek wurden keine passenden Fotos gefunden (mit Aufnahmedatum, ohne Screenshots/Belege).'}
          </Text>
        )}

        {isWaitingForMore && (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.statusText}>Weitere passende Fotos werden gesucht …</Text>
          </>
        )}

        {!isLoading && !errorMessage && curiosityQuestion && curiosityPhotoUri && (
          <CuriosityPrompt
            photoUri={curiosityPhotoUri}
            heading={curiosityQuestion.heading}
            subtitle={curiosityQuestion.subtitle}
            placeholder={curiosityQuestion.placeholder}
            allowVoice={curiosityQuestion.allowVoice}
            onSubmit={handleCuriositySubmit}
            onSkip={handleCuriositySkip}
          />
        )}

        {!isLoading && !errorMessage && !curiosityQuestion && isFinished && (
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

        {!isLoading && !errorMessage && !curiosityQuestion && !isFinished && currentItem && question && (
          <>
            {isRevealed ? (
              <PhotoActions
                onDelete={handleDeletePhoto}
                onAddToAlbum={handleOpenAlbumPicker}
                albumLabel={currentAlbum?.albumTitle}
              />
            ) : (
              <Text style={styles.heading}>{headingText}</Text>
            )}
            <View style={styles.photoWrapper}>
              <Image
                source={{ uri: currentItem.photo.uri }}
                style={styles.photo}
                contentFit="cover"
                accessibilityLabel="Ein Foto aus deiner Mediathek"
              />
              {currentAlbum && (
                <Pressable
                  style={styles.albumBadge}
                  onPress={handleOpenAlbumPicker}
                  accessibilityRole="button"
                  accessibilityLabel={`Album: ${currentAlbum.albumTitle}, zum Umsortieren antippen`}
                >
                  <Text style={styles.albumBadgeText} numberOfLines={1}>
                    {currentAlbum.albumTitle}
                  </Text>
                </Pressable>
              )}
            </View>
            <AnswerOptions
              options={question.options}
              selectedOption={selectedOption}
              correctOption={question.correctOption}
              isRevealed={isRevealed}
              onSelect={handleSelectAnswer}
            />
            {isRevealed && question.type !== 'ERINNERUNG' && revealedMemory && (
              <View style={styles.memoryBox}>
                {revealedMemory.text && <Text style={styles.memoryText}>📝 {revealedMemory.text}</Text>}
                {revealedMemory.audioUri && <AudioPlayButton uri={revealedMemory.audioUri} />}
              </View>
            )}
            {isRevealed && <Text style={styles.hintText}>Nach oben wischen für das nächste Foto</Text>}
          </>
        )}
      </View>

      {currentItem && (
        <AlbumPickerModal
          visible={isAlbumPickerOpen}
          photo={currentItem.photo}
          currentAlbum={currentAlbum}
          onClose={() => setIsAlbumPickerOpen(false)}
          onDone={handleAlbumAssigned}
        />
      )}
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
  photoWrapper: {
    width: '100%',
    flex: 1,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  albumBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    maxWidth: '70%',
    backgroundColor: 'rgba(26,26,46,0.72)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  albumBadgeText: {
    ...typography.caption,
    color: colors.textOnPrimary,
    fontWeight: '600',
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
    gap: spacing.sm,
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
