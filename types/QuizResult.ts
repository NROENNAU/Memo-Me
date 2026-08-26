// Die Fragetypen im Quiz: Wann/Wo/Wer wurde das Foto aufgenommen, welche
// Erinnerung passt dazu, das Foto als Puzzle zusammensetzen, oder mehrere
// Fotos in die richtige zeitliche Reihenfolge bringen.
export type QuestionType = 'WANN' | 'WO' | 'WER' | 'ERINNERUNG' | 'PUZZLE' | 'TIMELINE';

// Ergebnis einer einzelnen beantworteten Quizfrage, wie es in der SQLite-Tabelle "QuizErgebnisse" landet.
export interface QuizResult {
  id: number;
  fotoId: number;
  questionType: QuestionType;
  correct: boolean;
  // Zeitpunkt der Beantwortung als Unix-Timestamp (Millisekunden)
  date: number;
}
