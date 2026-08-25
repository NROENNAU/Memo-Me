// Die Fragetypen im Quiz: Wann/Wo/Wer wurde das Foto aufgenommen, oder
// welche Erinnerung passt zu diesem Foto.
export type QuestionType = 'WANN' | 'WO' | 'WER' | 'ERINNERUNG';

// Ergebnis einer einzelnen beantworteten Quizfrage, wie es in der SQLite-Tabelle "QuizErgebnisse" landet.
export interface QuizResult {
  id: number;
  fotoId: number;
  questionType: QuestionType;
  correct: boolean;
  // Zeitpunkt der Beantwortung als Unix-Timestamp (Millisekunden)
  date: number;
}
