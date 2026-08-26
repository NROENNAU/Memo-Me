// Speichert das Ergebnis einer beantworteten Quizfrage in der lokalen Datenbank.
import { getDatabase } from './database';
import { QuestionType } from '../types/QuizResult';

export async function saveQuizResult(
  fotoId: number,
  questionType: QuestionType,
  correct: boolean,
  points: number
): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'INSERT INTO QuizErgebnisse (foto_id, frage_typ, richtig_beantwortet, punkte, datum) VALUES (?, ?, ?, ?, ?)',
    fotoId,
    questionType,
    correct ? 1 : 0,
    points,
    Date.now()
  );
}
