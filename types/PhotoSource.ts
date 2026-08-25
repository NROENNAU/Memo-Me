// Welcher Foto-Pool als Grundlage für eine Quizrunde dient.
export type PhotoSource =
  | { type: 'recent' }
  | { type: 'lastYear' }
  | { type: 'album'; albumId: string; albumTitle: string }
  | { type: 'custom'; description: string };
