// Die Fragetypen im Quiz: Wann/Wo/Wer wurde das Foto aufgenommen, welche
// Erinnerung passt dazu, das Foto als Puzzle zusammensetzen, das
// älteste/neueste bzw. zu einem Ort passende/nicht passende Foto antippen,
// Bildpaare mit gemeinsamem Merkmal finden, Fotos und Namen zuordnen, oder
// den Aufnahmeort auf einer Karte schätzen.
export type QuestionType =
  | 'WANN'
  | 'WO'
  | 'WER'
  | 'ERINNERUNG'
  | 'PUZZLE'
  | 'FOTO_AUSWAHL'
  | 'PAARCHEN'
  | 'ZUORDNUNG'
  | 'KARTE';

// Ergebnis einer einzelnen beantworteten Quizfrage, wie es in der SQLite-Tabelle "QuizErgebnisse" landet.
export interface QuizResult {
  id: number;
  fotoId: number;
  questionType: QuestionType;
  correct: boolean;
  // Erzielte Punkte, siehe calculateAnswerPoints in services/quizService.ts
  points: number;
  // Zeitpunkt der Beantwortung als Unix-Timestamp (Millisekunden)
  date: number;
}
