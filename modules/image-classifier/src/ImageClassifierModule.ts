import { requireNativeModule } from 'expo-modules-core';
import { ImageLabel } from './ImageClassifier.types';

interface ImageClassifierNativeModule {
  classifyImage(localUri: string): Promise<ImageLabel[]>;
}

export default requireNativeModule<ImageClassifierNativeModule>('ImageClassifier');
