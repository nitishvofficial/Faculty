/**
 * useFaceRecognition.ts — AM_Faculty
 *
 * Continuous scanning hook for faculty verification.
 * Architecture synchronized with finalized AM_Faculty release.
 */
import {useState, useCallback, useEffect, useRef} from 'react';
import {NativeModules} from 'react-native';
import RNFS from 'react-native-fs';
import {faceService, FaceMatchResult} from '../services/faceService';
import type {Camera} from 'react-native-vision-camera';

const {FaceRecognitionModule} = NativeModules;
const TAG = '[useFaceRecognition]';

export function useFaceRecognition() {
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<FaceMatchResult | null>(null);
  const cameraRef = useRef<Camera>(null);
  const scanningRef = useRef(false);

  // Load TFLite model on mount
  useEffect(() => {
    let mounted = true;
    faceService.initializeModels()
      .then(() => { if (mounted) setIsModelsLoaded(true); })
      .catch((e: any) => { if (mounted) setError(e.message || 'Failed to load model'); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    scanningRef.current = isScanning;
  }, [isScanning]);

  /**
   * Continuous Scan Loop.
   * Runs every 600ms while isScanning is true.
   */
  const startScanLoop = useCallback(async () => {
    while (scanningRef.current) {
      let photoPath: string | null = null;
      try {
        const camera = cameraRef.current;
        if (!camera) {
          setIsScanning(false);
          break;
        }

        setScanResult({success: false, message: 'Capturing...'});

        // 1. Take photo
        const photo = await camera.takePhoto({
          flash: 'off',
          enableShutterSound: false,
          qualityPrioritization: 'speed',
        });

        photoPath = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;

        setScanResult({success: false, message: 'Analyzing...'});

        // 2. Native pipeline (detect -> crop -> resize -> embed -> spoof)
        const nativeResult = await FaceRecognitionModule.recognizeFaceFromFile(photoPath);

        if (nativeResult.isSpoof) {
          setScanResult({
            success: false,
            message: `Security: ${nativeResult.reason || 'Suspicious'}`,
          });
        } else {
          // 3. Match against local cache
          const result = faceService.matchEmbedding(nativeResult.embedding);
          setScanResult(result);

          if (result.success) {
            scanningRef.current = false;
            setIsScanning(false);
            break;
          }
        }
      } catch (err: any) {
        setScanResult({
          success: false,
          message: `System Error`,
        });
      } finally {
        // Cleanup temp photo file
        if (photoPath) {
          const pathForDelete = photoPath.replace('file://', '');
          RNFS.unlink(pathForDelete).catch(() => {});
        }
      }

      // Wait before next frame
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }, []);

  useEffect(() => {
    if (isScanning && isModelsLoaded) {
      startScanLoop();
    }
  }, [isScanning, isModelsLoaded, startScanLoop]);

  return {
    cameraRef,
    isModelsLoaded,
    error,
    isScanning,
    setIsScanning,
    scanResult,
    setScanResult,
  };
}
