// Ein einzelnes Klassifikations-Label mit Konfidenz (0-1), wie es das native
// Bilderkennungs-Framework liefert (Apple Vision auf iOS, ML Kit auf Android).
export interface ImageLabel {
  identifier: string;
  confidence: number;
}
