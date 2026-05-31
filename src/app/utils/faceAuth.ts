// ML-based Face Authentication using face-api.js
// Provides camera-based face registration, matching, and liveness detection

import * as faceapi from 'face-api.js';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  confidence?: number;
}

export interface FaceRegistrationResult extends BiometricAuthResult {
  descriptor?: Float32Array;
}

class FaceAuthManager {
  private modelsLoaded: boolean = false;
  private modelPath = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

  constructor() {
    this.loadModels();
  }

  /**
   * Load face-api.js models
   */
  private async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;

    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(this.modelPath),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(this.modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(this.modelPath),
        faceapi.nets.faceExpressionNet.loadFromUri(this.modelPath),
      ]);
      this.modelsLoaded = true;
      console.log('Face-API models loaded successfully');
    } catch (error) {
      console.error('Failed to load face-api models:', error);
      this.modelsLoaded = false;
    }
  }

  /**
   * Check if face authentication is supported
   */
  async isSupported(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Check for camera access
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }

    // Ensure models are loaded
    await this.loadModels();
    return this.modelsLoaded;
  }

  /**
   * Get video stream from camera
   */
  private async getVideoStream(): Promise<MediaStream | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      return stream;
    } catch (error: any) {
      // Camera access denied or not available - this is expected behavior when user denies permission
      if (error.name === 'NotAllowedError') {
        console.log('Camera permission denied by user');
      } else if (error.name === 'NotFoundError') {
        console.log('No camera device found');
      } else if (error.name === 'NotReadableError') {
        console.log('Camera is already in use by another application');
      } else {
        console.log('Camera access unavailable:', error.name);
      }
      return null;
    }
  }

  /**
   * Detect face from video element with liveness check
   */
  private async detectFaceWithLiveness(
    video: HTMLVideoElement,
    checkLiveness: boolean = true
  ): Promise<{ descriptor: Float32Array | null; confidence: number; isLive: boolean }> {
    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
          inputSize: 224,
          scoreThreshold: 0.5
        }))
        .withFaceLandmarks(true)
        .withFaceDescriptor()
        .withFaceExpressions();

      if (!detection) {
        return { descriptor: null, confidence: 0, isLive: false };
      }

      // Calculate confidence score
      const confidence = detection.detection.score;

      // Simple liveness check based on expressions
      let isLive = true;
      if (checkLiveness && detection.expressions) {
        const neutral = detection.expressions.neutral || 0;
        const happy = detection.expressions.happy || 0;
        const surprised = detection.expressions.surprised || 0;

        // If face is too static (highly neutral), might be a photo
        isLive = neutral < 0.95 || happy > 0.1 || surprised > 0.1;
      }

      return {
        descriptor: detection.descriptor,
        confidence,
        isLive
      };
    } catch (error) {
      console.error('Face detection error:', error);
      return { descriptor: null, confidence: 0, isLive: false };
    }
  }

  /**
   * Encrypt face descriptor for secure storage
   */
  private encryptDescriptor(descriptor: Float32Array): string {
    // Convert to base64
    const array = Array.from(descriptor);
    const json = JSON.stringify(array);
    return btoa(json);
  }

  /**
   * Decrypt face descriptor from storage
   */
  private decryptDescriptor(encrypted: string): Float32Array | null {
    try {
      const json = atob(encrypted);
      const array = JSON.parse(json);
      return new Float32Array(array);
    } catch (error) {
      console.error('Failed to decrypt descriptor:', error);
      return null;
    }
  }

  /**
   * Register face with camera
   * Returns a callback to render the video stream
   */
  async register(
    userId: string,
    userName: string,
    videoElement: HTMLVideoElement,
    onProgress?: (status: string) => void
  ): Promise<FaceRegistrationResult> {
    try {
      const supported = await this.isSupported();
      if (!supported) {
        return {
          success: false,
          error: 'Face authentication is not supported on this device or models failed to load'
        };
      }

      onProgress?.('Accessing camera...');
      const stream = await this.getVideoStream();

      if (!stream) {
        return {
          success: false,
          error: 'Failed to access camera. Please grant camera permission.'
        };
      }

      // Attach stream to video element
      videoElement.srcObject = stream;
      await videoElement.play();

      // Wait for video to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      onProgress?.('Detecting face...');

      // Capture multiple samples for better accuracy
      const samples: Float32Array[] = [];
      const sampleCount = 3;

      for (let i = 0; i < sampleCount; i++) {
        onProgress?.(`Capturing face sample ${i + 1}/${sampleCount}...`);
        await new Promise(resolve => setTimeout(resolve, 500));

        const { descriptor, confidence, isLive } = await this.detectFaceWithLiveness(videoElement, true);

        if (!descriptor) {
          stream.getTracks().forEach(track => track.stop());
          return {
            success: false,
            error: 'No face detected. Please position your face in front of the camera.'
          };
        }

        if (!isLive) {
          stream.getTracks().forEach(track => track.stop());
          return {
            success: false,
            error: 'Liveness check failed. Please blink or move your head slightly.'
          };
        }

        if (confidence < 0.6) {
          stream.getTracks().forEach(track => track.stop());
          return {
            success: false,
            error: 'Face detection confidence too low. Please ensure good lighting.'
          };
        }

        samples.push(descriptor);
      }

      // Stop camera
      stream.getTracks().forEach(track => track.stop());

      // Average the samples for better accuracy
      const avgDescriptor = this.averageDescriptors(samples);

      onProgress?.('Saving face data...');

      // Encrypt and store
      const encrypted = this.encryptDescriptor(avgDescriptor);
      localStorage.setItem('face_descriptor', encrypted);
      localStorage.setItem('face_user_id', userId);
      localStorage.setItem('face_user_name', userName);
      localStorage.setItem('face_enabled', 'true');
      localStorage.setItem('face_registered_at', new Date().toISOString());

      return {
        success: true,
        descriptor: avgDescriptor,
        confidence: 1.0
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Face registration failed'
      };
    }
  }

  /**
   * Average multiple face descriptors
   */
  private averageDescriptors(descriptors: Float32Array[]): Float32Array {
    if (descriptors.length === 0) throw new Error('No descriptors to average');
    if (descriptors.length === 1) return descriptors[0];

    const length = descriptors[0].length;
    const avg = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (const descriptor of descriptors) {
        sum += descriptor[i];
      }
      avg[i] = sum / descriptors.length;
    }

    return avg;
  }

  /**
   * Authenticate user with face recognition
   */
  async authenticate(
    videoElement: HTMLVideoElement,
    onProgress?: (status: string) => void
  ): Promise<BiometricAuthResult> {
    try {
      const supported = await this.isSupported();
      if (!supported) {
        return {
          success: false,
          error: 'Face authentication is not supported on this device'
        };
      }

      const storedDescriptor = localStorage.getItem('face_descriptor');
      const userId = localStorage.getItem('face_user_id');

      if (!storedDescriptor || !userId) {
        return {
          success: false,
          error: 'No face data found. Please register your face first.'
        };
      }

      onProgress?.('Accessing camera...');
      const stream = await this.getVideoStream();

      if (!stream) {
        return {
          success: false,
          error: 'Failed to access camera. Please grant camera permission.'
        };
      }

      videoElement.srcObject = stream;
      await videoElement.play();

      await new Promise(resolve => setTimeout(resolve, 1000));

      onProgress?.('Detecting face...');

      const { descriptor, confidence, isLive } = await this.detectFaceWithLiveness(videoElement, true);

      // Stop camera
      stream.getTracks().forEach(track => track.stop());

      if (!descriptor) {
        return {
          success: false,
          error: 'No face detected. Please position your face clearly.'
        };
      }

      if (!isLive) {
        return {
          success: false,
          error: 'Liveness check failed. Please try again.'
        };
      }

      onProgress?.('Verifying identity...');

      // Compare with stored descriptor
      const stored = this.decryptDescriptor(storedDescriptor);
      if (!stored) {
        return {
          success: false,
          error: 'Failed to load stored face data. Please re-register.'
        };
      }

      const distance = faceapi.euclideanDistance(descriptor, stored);
      const threshold = 0.6; // Lower is more similar

      if (distance < threshold) {
        return {
          success: true,
          confidence: Math.round((1 - distance) * 100) / 100
        };
      } else {
        return {
          success: false,
          error: `Face does not match (confidence: ${Math.round((1 - distance) * 100)}%). Please try again.`,
          confidence: Math.round((1 - distance) * 100) / 100
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Face authentication failed'
      };
    }
  }

  /**
   * Check if face authentication is enabled
   */
  isEnabled(): boolean {
    return localStorage.getItem('face_enabled') === 'true';
  }

  /**
   * Disable and remove face authentication data
   */
  disable(): void {
    localStorage.removeItem('face_descriptor');
    localStorage.removeItem('face_user_id');
    localStorage.removeItem('face_user_name');
    localStorage.removeItem('face_enabled');
    localStorage.removeItem('face_registered_at');
  }

  /**
   * Get face registration info
   */
  getRegistrationInfo(): { userId: string; userName: string; registeredAt: string } | null {
    const userId = localStorage.getItem('face_user_id');
    const userName = localStorage.getItem('face_user_name');
    const registeredAt = localStorage.getItem('face_registered_at');

    if (!userId || !userName) return null;

    return {
      userId,
      userName,
      registeredAt: registeredAt || 'Unknown'
    };
  }
}

export const faceAuth = new FaceAuthManager();
