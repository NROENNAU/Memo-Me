// Liste aller Screens der App-Navigation und deren Übergabe-Parameter.
import { PhotoSource } from './PhotoSource';

export type RootStackParamList = {
  Onboarding: undefined;
  PhotoSource: undefined;
  PhotoSwipe: { source: PhotoSource };
};
