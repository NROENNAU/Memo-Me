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
import { Ionicons } from '@expo/vector-icons';
import { AlbumPickerModal } from '../components/AlbumPickerModal';
import { AnswerOptions } from '../components/AnswerOptions';
import { AudioPlayButton } from '../components/AudioPlayButton';
import { CuriosityPrompt } from '../components/CuriosityPrompt';
import { PhotoActions } from '../components/PhotoActions';
import { PuzzleGame } from '../components/PuzzleGame';
import { PhotoAnswerOptions } from '../components/PhotoAnswerOptions';
import { MemoryGame } from '../components/MemoryGame';
import { MatchGame } from '../components/MatchGame';
import { MapGuessGame } from '../components/MapGuessGame';
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
  buildDateExtremeQuestion,
  buildErinnerungQuestion,
  buildKarteQuestion,
  buildLocationChoiceQuestion,
  buildPaarchenQuestion,
  buildPuzzleQuestion,
  buildWannQuestion,
  buildWerQuestion,
  buildWoQuestion,
  buildZuordnungQuestion,
  MatchPair,
  MemoryCard,
  PhotoChoiceQuestion,
  shuffle,
} from '../services/quizService';
import { classifyPhoto, isJunkLabels, isLikelyScreenshot } from '../services/junkPhotoFilter';
import { matchesDescription, matchesLocation, matchesTags } from '../services/customSourceFilter';
import { findTargetFacesForDescription, matchesNamedFace, saveNamedFaceEmbedding } from '../services/faceMatchingService';
import { ImageLabel } from '../modules/image-classifier/src';
import { DetectedFace } from '../modules/face-recognition/src';
import { setNativeFavorite } from '../modules/media-favorite/src';
import { getNamedFaces, NamedFace } from '../db/faceRepository';
import { CuriosityQuestion, pickCuriosityQuestion, shouldInterject } from '../services/curiosityService';
import { upsertPhoto, savePhotoTags, getPhotoTags, getIsFavorite, setFavorite } from '../db/photoRepository';
import { saveQuizResult } from '../db/quizResultRepository';
import { Memory, saveMemory, getMemoryForPhoto } from '../db/memoryRepository';
import { AlbumAssignment, getCurrentAlbumForPhoto, saveAlbumAssignment } from '../db/albumAssignmentRepository';
import { DEFAULT_PUZZLE_GRID_SIZE, getProfile } from '../db/profileRepository';
import { LibraryPhoto } from '../types/Photo';
import { RootStackParamList } from '../types/navigation';
import { colors, spacing, radius, typography, MIN_TOUCH_TARGET } from '../theme';

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
// Zusätzliche Fotos, die nie als eigene Quizfrage drankommen, sondern nur
// als Distraktoren/Material für Fragen wie "Foto-Auswahl", "Pärchen" und
// "Zuordnung" bereitstehen - dadurch taucht über die ganze Runde hinweg
// kein Foto doppelt auf, weder als Frage noch als Distraktor.
const RESERVOIR_SIZE = 30;

interface QuizPhoto {
  photo: LibraryPhoto;
  locationName: string | null;
  tags: string[] | null;
  memoryText: string | null;
}

interface ReservoirPhoto {
  uri: string;
  locationName: string | null;
  creationTime: number | null;
  tags: string[] | null;
}

type ChoiceQuestionKind = 'WANN' | 'WO' | 'WER' | 'ERINNERUNG';
type QuestionKind =
  | ChoiceQuestionKind
  | 'PUZZLE'
  | 'FOTO_AUSWAHL'
  | 'PAARCHEN'
  | 'ZUORDNUNG'
  | 'KARTE';

interface ChoiceQuestion {
  type: ChoiceQuestionKind;
  options: string[];
  correctOption: string;
}

interface PuzzleQuestionView {
  type: 'PUZZLE';
  photoUri: string;
  gridSize: number;
}

interface PaarchenQuestionView {
  type: 'PAARCHEN';
  cards: MemoryCard[];
}

interface ZuordnungQuestionView {
  type: 'ZUORDNUNG';
  pairs: MatchPair[];
}

interface KarteQuestionView {
  type: 'KARTE';
  photoUri: string;
  targetLatitude: number;
  targetLongitude: number;
}

interface PhotoChoiceQuestionView {
  type: 'FOTO_AUSWAHL';
  prompt: string;
  options: string[];
  correctOption: string;
}

type Question =
  | ChoiceQuestion
  | PuzzleQuestionView
  | PhotoChoiceQuestionView
  | PaarchenQuestionView
  | ZuordnungQuestionView
  | KarteQuestionView;

// Mischt die Fragetyp-Kandidaten zufällig und sortiert sie danach stabil
// nach ihrer bisherigen Häufigkeit in dieser Runde (aufsteigend) - seltener
// gestellte Typen werden also zuerst versucht. Array.prototype.sort ist in
// JS stabil, daher bleibt die zufällige Reihenfolge innerhalb gleich
// häufiger Typen erhalten, statt beim Sortieren wieder verloren zu gehen.
function orderByFairness<T extends { type: QuestionKind }>(
  candidates: T[],
  counts: Record<QuestionKind, number>
): T[] {
  return shuffle(candidates).sort((a, b) => counts[a.type] - counts[b.type]);
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
  // Bei der "Wer ist das?"-Frage: die noch abzufragenden Gesichter dieses
  // Fotos (mehrere bei Gruppenfotos) und die dafür schon gesammelten Namen -
  // so wird nacheinander pro Gesicht gefragt, statt blind zu raten, welcher
  // Name zu welcher Person gehört.
  const [curiosityFaceQueue, setCuriosityFaceQueue] = useState<DetectedFace[]>([]);
  const [curiosityFaceTotal, setCuriosityFaceTotal] = useState(0);
  const [curiosityCollectedNames, setCuriosityCollectedNames] = useState<string[]>([]);
  const [revealedMemory, setRevealedMemory] = useState<Memory | null>(null);
  const [isAlbumPickerOpen, setIsAlbumPickerOpen] = useState(false);
  const [currentAlbum, setCurrentAlbum] = useState<AlbumAssignment | null>(null);
  // TEMPORÄR zum Debuggen der Gesichtserkennung ohne Mac/Xcode - danach
  // wieder entfernen.
  const [debugFaceInfo, setDebugFaceInfo] = useState<string | null>(null);
  // Timer pro Quizfrage, Dauer aus den Nutzereinstellungen (Profil). null =
  // noch nicht geladen; 0 = in den Einstellungen abgeschaltet.
  const [timerDuration, setTimerDuration] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  // Erhöht sich bei jedem (Neu-)Start einer Runde, damit der Timer auch dann
  // zurückgesetzt wird, wenn currentIndex zufällig schon 0 war.
  const [quizRunId, setQuizRunId] = useState(0);
  // Raster-Größe fürs Foto-Puzzle, ebenfalls aus den Nutzereinstellungen.
  const [puzzleGridSize, setPuzzleGridSize] = useState(DEFAULT_PUZZLE_GRID_SIZE);
  // Fotos, die nie selbst Frage-Gegenstand werden, sondern nur als
  // Distraktoren für "Foto-Auswahl" dienen (siehe RESERVOIR_SIZE oben).
  const [reservoirPhotos, setReservoirPhotos] = useState<ReservoirPhoto[]>([]);
  // Merkt sich, welche Reservoir-Fotos in dieser Runde schon als Distraktor
  // gezeigt wurden, damit auch innerhalb des Reservoirs kein Foto zweimal auftaucht.
  const usedReservoirUrisRef = useRef<Set<string>>(new Set());
  // Zählt pro Fragetyp, wie oft er in dieser Runde schon gestellt wurde -
  // Grundlage für die faire Reihenfolge unten (siehe orderByFairness). Ohne
  // das würden Typen, die praktisch immer gelingen (z. B. Puzzle), Typen mit
  // oft fehlenden Daten (Wo/Wer/Erinnerung/...) systematisch verdrängen.
  const questionTypeCountsRef = useRef<Record<QuestionKind, number>>({
    WANN: 0,
    WO: 0,
    WER: 0,
    ERINNERUNG: 0,
    PUZZLE: 0,
    FOTO_AUSWAHL: 0,
    PAARCHEN: 0,
    ZUORDNUNG: 0,
    KARTE: 0,
  });
  const [isCurrentFavorite, setIsCurrentFavorite] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    getProfile().then((profile) => {
      if (!isMountedRef.current) return;
      setTimerDuration(profile.timerSeconds);
      setPuzzleGridSize(profile.puzzleGridSize);
    });
  }, []);

  // Aktiviert eine Wissensfrage (siehe curiosityService) und richtet bei der
  // "Wer ist das?"-Frage gleich die Gesichter-Warteschlange ein, falls
  // mehrere Personen auf dem Foto erkannt wurden.
  function activateCuriosityQuestion(
    fotoId: number,
    photoUri: string,
    question: CuriosityQuestion,
    fromLoading: boolean
  ) {
    setCuriosityFotoId(fotoId);
    setCuriosityPhotoUri(photoUri);
    setCuriosityFromLoading(fromLoading);
    setCuriosityQuestion(question);
    const faces = question.kind === 'who' ? question.faces ?? [] : [];
    setCuriosityFaceQueue(faces);
    setCuriosityFaceTotal(faces.length);
    setCuriosityCollectedNames([]);
  }

  const loadQuiz = useCallback(async () => {
    setPhotos(null);
    setIsSearchComplete(false);
    setCuriosityQuestion(null);
    setCuriosityFotoId(null);
    setCuriosityPhotoUri(null);
    setErrorMessage(null);
    setDebugFaceInfo(null);
    setQuizRunId((id) => id + 1);
    setReservoirPhotos([]);
    usedReservoirUrisRef.current = new Set();
    questionTypeCountsRef.current = {
      WANN: 0,
      WO: 0,
      WER: 0,
      ERINNERUNG: 0,
      PUZZLE: 0,
      FOTO_AUSWAHL: 0,
      PAARCHEN: 0,
      ZUORDNUNG: 0,
      KARTE: 0,
    };

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
      let targetNamedFaces: NamedFace[] = [];
      if (source.type === 'custom') {
        const [allNamedFaces, filtered] = await Promise.all([
          getNamedFaces(),
          findTargetFacesForDescription(source.description),
        ]);
        targetNamedFaces = filtered;
        // TEMPORÄR zum Debuggen der Gesichtserkennung ohne Mac/Xcode - danach
        // wieder entfernen.
        setDebugFaceInfo(
          `Debug: ${allNamedFaces.length} bekannte Gesichter insgesamt, ${filtered.length} passend zu „${source.description}“.`
        );
      }
      if (!isMountedRef.current) return;

      // Schritt 2: Details nachladen (u. a. Ort) und per on-device
      // Bilderkennung Belege/Dokumente aussortieren, bis QUIZ_LENGTH
      // brauchbare Fotos feststehen oder der Pool erschöpft ist. Danach wird
      // weitergesucht, bis zusätzlich RESERVOIR_SIZE weitere, noch nirgends
      // verwendete Fotos als Distraktor-Reservoir für "Foto-Auswahl"
      // feststehen (siehe oben) - so taucht kein Foto zweimal in derselben
      // Runde auf. Mehrere Fotos werden gleichzeitig klassifiziert
      // (CLASSIFICATION_CONCURRENCY), da das der langsamste Schritt ist.
      // Sobald das erste brauchbare Foto feststeht, wird die Runde direkt
      // gezeigt - der Rest lädt im Hintergrund weiter nach.
      const quizPhotos: QuizPhoto[] = [];
      const reservoir: ReservoirPhoto[] = [];
      let hasCheckedCuriosity = false;
      let hasRevealedQuiz = false;

      for (let i = 0; i < shuffled.length; i += CLASSIFICATION_CONCURRENCY) {
        if (quizPhotos.length >= QUIZ_LENGTH && reservoir.length >= RESERVOIR_SIZE) break;
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
          if (quizPhotos.length >= QUIZ_LENGTH && reservoir.length >= RESERVOIR_SIZE) break;

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

          // Runde noch nicht voll: dieses Foto wird eine eigene Quizfrage.
          if (quizPhotos.length < QUIZ_LENGTH) {
            const memory = await getMemoryForPhoto(fotoId);
            if (!isMountedRef.current) return;

            // Für dasselbe Foto geprüft und (falls vorhanden) aktiviert,
            // das direkt danach auch quizPhotos[0] wird - beides passiert
            // dadurch im selben synchronen Durchlauf, ohne await dazwischen.
            // Ein Check erst beim zweiten Foto sah zwar sauberer aus, hatte
            // aber einen await (getMemoryForPhoto/pickCuriosityQuestion) für
            // das erste Foto schon dazwischen - das erste Foto wurde also
            // kurz sichtbar, bevor die Wissensfrage es überraschend ersetzte.
            if (!hasCheckedCuriosity) {
              hasCheckedCuriosity = true;
              const question = await pickCuriosityQuestion(fotoId, photo.uri);
              if (!isMountedRef.current) return;
              if (question) {
                activateCuriosityQuestion(fotoId, photo.uri, question, true);
              }
            }

            quizPhotos.push({
              photo,
              locationName,
              tags,
              memoryText: memory?.text ?? null,
            });

            if (!hasRevealedQuiz) {
              hasRevealedQuiz = true;
              setCurrentIndex(0);
              setSelectedOption(null);
              setIsRevealed(false);
              setRevealedMemory(null);
              setScore({ correct: 0, total: 0 });
            }
            setPhotos([...quizPhotos]);
          } else if (reservoir.length < RESERVOIR_SIZE) {
            // Runde schon voll: dieses Foto wird nie selbst gefragt, dient
            // nur noch als frischer Distraktor/Material für Fragen wie
            // "Foto-Auswahl", "Pärchen" und "Zuordnung".
            reservoir.push({ uri: photo.uri, locationName, creationTime: photo.creationTime, tags });
          }
        }
      }

      if (!isMountedRef.current) return;
      setReservoirPhotos(reservoir);
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

  // Wählt aus den Fragetypen, die sich für das aktuelle Foto tatsächlich
  // bilden lassen (Wer/Erinnerung brauchen entsprechende Daten zu diesem
  // Foto). Statt einfach zufällig zu mischen und den ersten erfolgreichen
  // Versuch zu nehmen, wird nach Häufigkeit sortiert: Fragetypen, die in
  // dieser Runde schon öfter drankamen, werden hintenangestellt (siehe
  // orderByFairness unten). Sonst würden Typen wie Puzzle oder die
  // Datum-Variante von Foto-Auswahl - die praktisch immer gelingen, weil
  // jedes Foto ein Aufnahmedatum hat - Typen wie Wo/Wer/Erinnerung/Pärchen/
  // Zuordnung/Karte verdrängen, die oft an fehlenden Daten (Ort, Namen, GPS)
  // scheitern und dadurch seltener zum Zug kämen.
  const question: Question | null = useMemo(() => {
    if (!currentItem || !photos) return null;

    const others = photos.filter((_, index) => index !== currentIndex);

    const builders: Array<{ type: QuestionKind; build: () => Question | null }> = [
      {
        type: 'WO',
        build: () => {
          const otherPlaces = others.map((item) => item.locationName).filter((place): place is string => place !== null);
          const wo = buildWoQuestion(currentItem.locationName, otherPlaces);
          return wo ? { type: 'WO', options: wo.options, correctOption: wo.correctPlace } : null;
        },
      },
      {
        type: 'WER',
        build: () => {
          const otherNames = others.flatMap((item) => item.tags ?? []);
          const wer = buildWerQuestion(currentItem.tags, otherNames);
          return wer ? { type: 'WER', options: wer.options, correctOption: wer.correctName } : null;
        },
      },
      {
        type: 'ERINNERUNG',
        build: () => {
          const otherTexts = others.map((item) => item.memoryText).filter((text): text is string => text !== null);
          const erinnerung = buildErinnerungQuestion(currentItem.memoryText, otherTexts);
          return erinnerung
            ? { type: 'ERINNERUNG', options: erinnerung.options, correctOption: erinnerung.correctText }
            : null;
        },
      },
      {
        type: 'PUZZLE',
        build: () => {
          const puzzle = buildPuzzleQuestion(currentItem.photo, puzzleGridSize);
          return { type: 'PUZZLE', photoUri: puzzle.photoUri, gridSize: puzzle.gridSize };
        },
      },
      {
        type: 'FOTO_AUSWAHL',
        build: () => {
          // Alle vier "Foto-Auswahl"-Varianten zählen hier als EIN Los im
          // Fragetyp-Lostopf (nicht vier) - sonst würde dieser Fragetyp allein
          // durch seine vier Untervarianten viel häufiger gezogen als alle
          // anderen, die nur eine Variante haben. Innerhalb dieses einen Loses
          // wird zufällig unter den vier Varianten probiert.
          //
          // Distraktoren kommen aus dem Reservoir statt aus den anderen Fotos
          // dieser Runde, damit über die ganze Runde hinweg kein Foto doppelt
          // gezeigt wird (siehe RESERVOIR_SIZE oben) - schon genutzte
          // Reservoir-Fotos scheiden dafür aus.
          const fotoAuswahlVarianten: Array<() => PhotoChoiceQuestion | null> = [
            () => {
              const availableReservoir = reservoirPhotos.filter((item) => !usedReservoirUrisRef.current.has(item.uri));
              return buildDateExtremeQuestion(currentItem.photo, availableReservoir, 'oldest');
            },
            () => {
              const availableReservoir = reservoirPhotos.filter((item) => !usedReservoirUrisRef.current.has(item.uri));
              return buildDateExtremeQuestion(currentItem.photo, availableReservoir, 'newest');
            },
            () => {
              const availableReservoir = reservoirPhotos.filter((item) => !usedReservoirUrisRef.current.has(item.uri));
              const candidates = [{ uri: currentItem.photo.uri, locationName: currentItem.locationName }, ...availableReservoir];
              return buildLocationChoiceQuestion(candidates, 'match');
            },
            () => {
              const availableReservoir = reservoirPhotos.filter((item) => !usedReservoirUrisRef.current.has(item.uri));
              const candidates = [{ uri: currentItem.photo.uri, locationName: currentItem.locationName }, ...availableReservoir];
              return buildLocationChoiceQuestion(candidates, 'mismatch');
            },
          ];

          for (const variant of shuffle(fotoAuswahlVarianten)) {
            const photoChoice = variant();
            if (photoChoice) {
              photoChoice.options.forEach((uri) => usedReservoirUrisRef.current.add(uri));
              return {
                type: 'FOTO_AUSWAHL',
                prompt: photoChoice.prompt,
                options: photoChoice.options,
                correctOption: photoChoice.correctUri,
              };
            }
          }
          return null;
        },
      },
      {
        type: 'PAARCHEN',
        build: () => {
          const availableReservoir = reservoirPhotos.filter((item) => !usedReservoirUrisRef.current.has(item.uri));
          const paarchen = buildPaarchenQuestion(availableReservoir);
          if (!paarchen) return null;
          paarchen.cards.forEach((card) => usedReservoirUrisRef.current.add(card.uri));
          return { type: 'PAARCHEN', cards: paarchen.cards };
        },
      },
      {
        type: 'ZUORDNUNG',
        build: () => {
          const availableReservoir = reservoirPhotos.filter((item) => !usedReservoirUrisRef.current.has(item.uri));
          const zuordnung = buildZuordnungQuestion(availableReservoir);
          if (!zuordnung) return null;
          zuordnung.pairs.forEach((pair) => usedReservoirUrisRef.current.add(pair.uri));
          return { type: 'ZUORDNUNG', pairs: zuordnung.pairs };
        },
      },
      {
        type: 'KARTE',
        build: () => {
          const karte = buildKarteQuestion(currentItem.photo);
          return karte
            ? {
                type: 'KARTE',
                photoUri: karte.photoUri,
                targetLatitude: karte.targetLatitude,
                targetLongitude: karte.targetLongitude,
              }
            : null;
        },
      },
      {
        // Läuft in der fairen Reihenfolge wie jeder andere Typ mit, statt wie
        // früher ausschließlich als starrer letzter Rückfall - sonst käme
        // Wann praktisch nie dran, weil Puzzle/Foto-Auswahl vorher schon fast
        // immer erfolgreich sind (siehe Kommentar oben).
        type: 'WANN',
        build: () => {
          const wann = buildWannQuestion(currentItem.photo);
          return wann ? { type: 'WANN', options: wann.options.map(String), correctOption: String(wann.correctYear) } : null;
        },
      },
    ];

    for (const candidate of orderByFairness(builders, questionTypeCountsRef.current)) {
      const built = candidate.build();
      if (built) {
        questionTypeCountsRef.current[candidate.type] += 1;
        return built;
      }
    }
    return null;
  }, [currentItem, photos, currentIndex, puzzleGridSize, reservoirPhotos]);

  // Ob gerade tatsächlich eine unbeantwortete Frage sichtbar ist - der Timer
  // (siehe unten) läuft nur währenddessen, nicht beim Laden, während einer
  // Zwischenfrage oder nachdem schon geantwortet wurde.
  const isQuestionActive =
    photos !== null && !errorMessage && !curiosityQuestion && currentItem !== null && question !== null && !isRevealed;

  // Setzt den Timer auf die eingestellte Dauer zurück, sobald eine neue
  // Frage drankommt (neuer Fotoindex oder komplett neue Runde). timerDuration
  // 0 bedeutet "kein Timer" (siehe Einstellungen).
  useEffect(() => {
    if (timerDuration === null) return;
    setTimeLeft(timerDuration > 0 ? timerDuration : null);
  }, [currentIndex, quizRunId, timerDuration]);

  // Zählt jede Sekunde herunter, aber nur während die Frage aktiv ist -
  // dadurch pausiert der Timer automatisch beim Laden oder nach dem Antworten.
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || !isQuestionActive) return;
    const timeout = setTimeout(() => {
      setTimeLeft((previous) => (previous !== null ? previous - 1 : previous));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [timeLeft, isQuestionActive]);

  // Läuft die Zeit ab, ohne dass geantwortet wurde, zählt das als falsch.
  useEffect(() => {
    if (timeLeft === 0 && isQuestionActive) {
      handleTimeout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // Prüft für das aktuelle Foto, ob es schon einem Album zugeordnet ist –
  // erst der schnelle, eigene Cache (FotoAlben), und nur falls dort nichts
  // bekannt ist, zusätzlich ein echter Abgleich mit allen Alben der
  // Mediathek (deckt auch Zuordnungen ab, die nicht über Memo-Me gemacht
  // wurden). Ein gefundenes Ergebnis wird im Cache abgelegt, damit der
  // langsame Abgleich pro Foto nur einmal nötig ist. Lädt im selben Zug den
  // Favoriten-Status, da beides an denselben Fotowechsel gekoppelt ist.
  useEffect(() => {
    if (!currentItem) {
      setCurrentAlbum(null);
      setIsCurrentFavorite(false);
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

        const isFavorite = await getIsFavorite(fotoId);
        if (isActive) setIsCurrentFavorite(isFavorite);
      } catch (error) {
        console.error('Album-Zuordnung/Favorit konnte nicht geladen werden:', error);
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
        const question = await pickCuriosityQuestion(fotoId, finishedItem.photo.uri);
        if (!isMountedRef.current) return;
        if (question) {
          activateCuriosityQuestion(fotoId, finishedItem.photo.uri, question, false);
          return;
        }
      } catch (error) {
        console.error('Wissensfrage konnte nicht vorbereitet werden:', error);
      }
    }

    setCurrentIndex((index) => index + 1);
  }

  // Beendet die aktuelle Wissensfrage komplett (alle Gesichter dieses Fotos
  // abgefragt oder übersprungen) und schaltet den Fotoindex weiter, falls
  // die Frage nicht während des Ladens, sondern zwischen zwei Fotos kam.
  function finishCuriosity() {
    const wasFromLoading = curiosityFromLoading;
    setCuriosityQuestion(null);
    setCuriosityFotoId(null);
    setCuriosityPhotoUri(null);
    setCuriosityFaceQueue([]);
    setCuriosityCollectedNames([]);
    if (!wasFromLoading) {
      setCurrentIndex((index) => index + 1);
    }
  }

  function handleCuriositySubmit(answer: { text: string | null; audioUri: string | null }) {
    if (curiosityFotoId === null || !curiosityQuestion) {
      finishCuriosity();
      return;
    }

    if (curiosityQuestion.kind === 'story') {
      saveMemory(curiosityFotoId, answer).catch((error) => {
        console.error('Erinnerung konnte nicht gespeichert werden:', error);
      });
      finishCuriosity();
      return;
    }

    // kind === 'who': immer genau ein Name für das aktuell angezeigte
    // Gesicht (siehe curiosityFaceQueue) - bei mehreren Personen auf dem
    // Foto wird direkt danach nach dem nächsten Gesicht gefragt.
    const name = answer.text?.trim() || null;
    const face = curiosityFaceQueue[0] ?? null;
    const collectedNames = name ? [...curiosityCollectedNames, name] : curiosityCollectedNames;

    if (name && face) {
      saveNamedFaceEmbedding(curiosityFotoId, name, face.embedding)
        .then((saved) => {
          // TEMPORÄR zum Debuggen der Gesichtserkennung ohne Mac/Xcode -
          // danach wieder entfernen.
          Alert.alert(
            'Debug: Gesichtserkennung',
            saved
              ? `Fingerabdruck für „${name}“ gespeichert.`
              : `Kein Fingerabdruck für „${name}“ gespeichert (auf Android aktuell nicht möglich).`
          );
        })
        .catch((error) => {
          console.error('Gesicht konnte nicht gespeichert werden:', error);
        });
    }

    const remainingFaces = curiosityFaceQueue.slice(1);
    if (remainingFaces.length > 0) {
      setCuriosityFaceQueue(remainingFaces);
      setCuriosityCollectedNames(collectedNames);
      return;
    }

    if (collectedNames.length > 0) {
      savePhotoTags(curiosityFotoId, collectedNames).catch((error) => {
        console.error('Namen konnten nicht gespeichert werden:', error);
      });
    }
    finishCuriosity();
  }

  function handleCuriositySkip() {
    if (curiosityQuestion?.kind === 'who') {
      const remainingFaces = curiosityFaceQueue.slice(1);
      if (remainingFaces.length > 0) {
        // Nur diese eine Person überspringen - bei weiteren Gesichtern auf
        // demselben Foto trotzdem weiterfragen.
        setCuriosityFaceQueue(remainingFaces);
        return;
      }
      if (curiosityFotoId !== null && curiosityCollectedNames.length > 0) {
        savePhotoTags(curiosityFotoId, curiosityCollectedNames).catch((error) => {
          console.error('Namen konnten nicht gespeichert werden:', error);
        });
      }
    }
    finishCuriosity();
  }

  // Gemeinsame Logik nach jeder Antwort, egal welcher Fragetyp: Ergebnis
  // merken, in der Datenbank speichern und eine evtl. hinterlegte Erinnerung
  // zum Foto nachladen (wird bei Multiple-Choice-Fragen als Extra gezeigt).
  async function finalizeAnswer(questionType: QuestionKind, isCorrect: boolean) {
    if (!currentItem) return;
    setIsRevealed(true);
    setScore((previous) => ({
      correct: previous.correct + (isCorrect ? 1 : 0),
      total: previous.total + 1,
    }));

    try {
      const fotoId = await upsertPhoto(currentItem.photo);
      await saveQuizResult(fotoId, questionType, isCorrect);
      const memory = await getMemoryForPhoto(fotoId);
      if (isMountedRef.current) setRevealedMemory(memory);
    } catch (error) {
      console.error('Quizergebnis konnte nicht gespeichert werden:', error);
    }
  }

  // Beim Antippen einer Option löst sich die Antwort sofort auf – kein
  // zusätzlicher Bestätigen-Schritt mehr. Gilt sowohl für Text-Optionen
  // (Wann/Wo/Wer/Erinnerung) als auch für Foto-Optionen (Foto-Auswahl), die
  // beide options/correctOption gleich behandeln.
  async function handleSelectAnswer(option: string) {
    if (!currentItem || !question || isRevealed) return;
    if (
      question.type !== 'WANN' &&
      question.type !== 'WO' &&
      question.type !== 'WER' &&
      question.type !== 'ERINNERUNG' &&
      question.type !== 'FOTO_AUSWAHL'
    ) {
      return;
    }

    setSelectedOption(option);
    await finalizeAnswer(question.type, option === question.correctOption);
  }

  // Das Puzzle hat keine falsche Lösung - sobald es gelöst ist, zählt es als
  // richtig beantwortet.
  function handlePuzzleSolved() {
    if (!currentItem || isRevealed) return;
    finalizeAnswer('PUZZLE', true);
  }

  // Das Pärchen-Memory wertet sich selbst aus (siehe MemoryGame) und meldet
  // hier nur noch, ob alle Paare gefunden wurden.
  function handleMemoryComplete(isCorrect: boolean) {
    if (!currentItem || isRevealed) return;
    finalizeAnswer('PAARCHEN', isCorrect);
  }

  // Die Zuordnung wertet sich selbst aus (siehe MatchGame) und meldet hier
  // nur noch, ob alle Fotos dem richtigen Namen zugeordnet wurden.
  function handleMatchComplete(isCorrect: boolean) {
    if (!currentItem || isRevealed) return;
    finalizeAnswer('ZUORDNUNG', isCorrect);
  }

  // Die Karten-Schätzfrage wertet sich selbst aus (siehe MapGuessGame) und
  // meldet hier nur noch, ob der Tipp nah genug am echten Ort lag.
  function handleMapGuessSubmit(isCorrect: boolean) {
    if (!currentItem || isRevealed) return;
    finalizeAnswer('KARTE', isCorrect);
  }

  // Läuft der Timer ab, ohne dass geantwortet wurde, zählt die Frage als
  // falsch beantwortet - unabhängig vom Fragetyp.
  function handleTimeout() {
    if (!currentItem || !question || isRevealed) return;
    finalizeAnswer(question.type, false);
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

  async function handleToggleFavorite() {
    if (!currentItem) return;
    const next = !isCurrentFavorite;
    setIsCurrentFavorite(next);
    try {
      const fotoId = await upsertPhoto(currentItem.photo);
      await setFavorite(fotoId, next);
    } catch (error) {
      console.error('Favorit konnte nicht gespeichert werden:', error);
      if (isMountedRef.current) setIsCurrentFavorite(!next);
      return;
    }

    // Zusätzlich in der Apple Fotos-App markieren (bestes Bemühen - schlägt
    // das fehl, bleibt der App-eigene Favoritenstatus trotzdem gesetzt).
    try {
      await setNativeFavorite(currentItem.photo.assetId, next);
    } catch (error) {
      console.error('Favorit konnte nicht in der Fotos-App gesetzt werden:', error);
    }
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

  // Auch für den "Quiz beenden"-Button oben im Screen genutzt - Ergebnisse
  // werden schon pro Frage gespeichert (siehe finalizeAnswer), beim
  // Verlassen geht also nichts verloren.
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
  const headingByType: Record<Exclude<QuestionKind, 'FOTO_AUSWAHL'>, string> = {
    WANN: 'Wann wurde dieses Foto aufgenommen?',
    WO: 'Wo wurde dieses Foto aufgenommen?',
    WER: 'Wer ist auf diesem Foto zu sehen?',
    ERINNERUNG: 'Welche Erinnerung passt zu diesem Foto?',
    PUZZLE: 'Setze das Foto wieder zusammen!',
    PAARCHEN: 'Finde die Bildpaare!',
    ZUORDNUNG: 'Wer gehört zu wem?',
    KARTE: 'Wo wurde das Foto aufgenommen?',
  };
  // Bei "Foto-Auswahl" ist die Überschrift dynamisch (z. B. "Welches Foto
  // ist aus Barcelona?"), bei allen anderen Fragetypen fest.
  const headingText = !question ? '' : question.type === 'FOTO_AUSWAHL' ? question.prompt : headingByType[question.type];
  // Bei "Wer ist das?" mit mehreren Personen: statt des ganzen Fotos wird
  // der Ausschnitt des gerade abgefragten Gesichts gezeigt, damit eindeutig
  // ist, welche Person gemeint ist.
  const currentCuriosityFace = curiosityQuestion?.kind === 'who' ? curiosityFaceQueue[0] ?? null : null;
  const curiosityDisplayUri = currentCuriosityFace?.thumbnail
    ? `data:image/jpeg;base64,${currentCuriosityFace.thumbnail}`
    : curiosityPhotoUri;
  const curiositySubtitle =
    curiosityQuestion?.kind === 'who' && curiosityFaceTotal > 1
      ? `${curiosityQuestion.subtitle} (Person ${curiosityFaceTotal - curiosityFaceQueue.length + 1} von ${curiosityFaceTotal})`
      : curiosityQuestion?.subtitle ?? '';
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
          <>
            <Text style={styles.statusText}>
              {source.type === 'custom'
                ? `Keine Fotos zu „${source.description}“ gefunden. Versuch es mit einer anderen Beschreibung.`
                : 'In deiner Mediathek wurden keine passenden Fotos gefunden (mit Aufnahmedatum, ohne Screenshots/Belege).'}
            </Text>
            {debugFaceInfo && <Text style={styles.statusText}>{debugFaceInfo}</Text>}
          </>
        )}

        {isWaitingForMore && (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.statusText}>Weitere passende Fotos werden gesucht …</Text>
          </>
        )}

        {!isLoading && !errorMessage && curiosityQuestion && curiosityDisplayUri && (
          <CuriosityPrompt
            // key sorgt für einen frischen Zustand (leeres Textfeld) beim
            // Wechsel zum nächsten Gesicht auf demselben Foto.
            key={`${curiosityFotoId}-${curiosityFaceQueue.length}`}
            photoUri={curiosityDisplayUri}
            heading={curiosityQuestion.heading}
            subtitle={curiositySubtitle}
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
            {timeLeft !== null && (
              <Text style={[styles.timerText, timeLeft <= 5 && styles.timerTextUrgent]}>⏱ {timeLeft}s</Text>
            )}
            {question.type === 'PUZZLE' ? (
              <>
                <Text style={styles.heading}>{headingText}</Text>
                <PuzzleGame
                  key={currentItem.photo.uri}
                  photoUri={question.photoUri}
                  gridSize={question.gridSize}
                  onSolved={handlePuzzleSolved}
                  disabled={isRevealed}
                />
                {isRevealed && (
                  <PhotoActions
                    onDelete={handleDeletePhoto}
                    onAddToAlbum={handleOpenAlbumPicker}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorite={isCurrentFavorite}
                    albumLabel={currentAlbum?.albumTitle}
                  />
                )}
                {isRevealed && <Text style={styles.hintText}>Nach oben wischen für das nächste Foto</Text>}
              </>
            ) : question.type === 'FOTO_AUSWAHL' ? (
              <>
                <Text style={styles.heading}>{headingText}</Text>
                <PhotoAnswerOptions
                  options={question.options}
                  selectedOption={selectedOption}
                  correctOption={question.correctOption}
                  isRevealed={isRevealed}
                  onSelect={handleSelectAnswer}
                />
                {isRevealed && <Text style={styles.hintText}>Nach oben wischen für das nächste Foto</Text>}
              </>
            ) : question.type === 'PAARCHEN' ? (
              <>
                <Text style={styles.heading}>{headingText}</Text>
                <MemoryGame
                  key={currentIndex}
                  cards={question.cards}
                  onComplete={handleMemoryComplete}
                  disabled={isRevealed}
                />
                {isRevealed && <Text style={styles.hintText}>Nach oben wischen für das nächste Foto</Text>}
              </>
            ) : question.type === 'ZUORDNUNG' ? (
              <>
                <Text style={styles.heading}>{headingText}</Text>
                <MatchGame
                  key={currentIndex}
                  pairs={question.pairs}
                  onComplete={handleMatchComplete}
                  disabled={isRevealed}
                />
                {isRevealed && <Text style={styles.hintText}>Nach oben wischen für das nächste Foto</Text>}
              </>
            ) : question.type === 'KARTE' ? (
              <>
                <Text style={styles.heading}>{headingText}</Text>
                <MapGuessGame
                  key={currentItem.photo.uri}
                  photoUri={question.photoUri}
                  targetLatitude={question.targetLatitude}
                  targetLongitude={question.targetLongitude}
                  onSubmit={handleMapGuessSubmit}
                  disabled={isRevealed}
                />
                {isRevealed && <Text style={styles.hintText}>Nach oben wischen für das nächste Foto</Text>}
              </>
            ) : (
              <>
                {isRevealed ? (
                  <PhotoActions
                    onDelete={handleDeletePhoto}
                    onAddToAlbum={handleOpenAlbumPicker}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorite={isCurrentFavorite}
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
          </>
        )}
      </View>

      <Pressable
        style={styles.exitButton}
        onPress={startDifferentQuiz}
        accessibilityRole="button"
        accessibilityLabel="Quiz beenden"
        hitSlop={{ top: spacing.md, bottom: spacing.md, left: spacing.md, right: spacing.md }}
      >
        <Ionicons name="close" size={20} color={colors.textPrimary} />
        <Text style={styles.exitButtonText}>Beenden</Text>
      </Pressable>

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
  exitButton: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.lg,
    zIndex: 20,
    elevation: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  exitButtonText: {
    ...typography.button,
    fontSize: 14,
    color: colors.textPrimary,
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
  timerText: {
    ...typography.heading,
    color: colors.primary,
    textAlign: 'center',
  },
  timerTextUrgent: {
    color: colors.danger,
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
