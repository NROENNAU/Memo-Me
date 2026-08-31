import { requireNativeModule } from 'expo-modules-core';
import { DetectedFace } from './FaceRecognition.types';

interface FaceRecognitionNativeModule {
  detectFaces(localUri: string): Promise<DetectedFace[]>;
  compareFaceEmbeddings(embeddingA: string, embeddingB: string): Promise<number>;
}

export default requireNativeModule<FaceRecognitionNativeModule>('FaceRecognition');
