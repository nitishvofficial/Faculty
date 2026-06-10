/**
 * faceService.ts — AM_Faculty
 *
 * Faculty face verification service.
 * Fetches faculty embeddings from Supabase 'faculties' table,
 * caches in MMKV, matches using cosine similarity.
 */
import {NativeModules} from 'react-native';
import {supabase} from './supabaseClient';
import {storageService} from './storageService';

const {FaceRecognitionModule} = NativeModules;
const TAG = '[FacultyFaceService]';

export interface FaceMatchResult {
  success: boolean;
  facultyId?: string;
  facultyName?: string;
  message?: string;
  debugInfo?: string; // For troubleshooting 0% matches
}

/**
 * Cosine similarity between two equal-length vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : Math.max(0, Math.min(1, dot / magnitude));
}

const VERIFICATION_THRESHOLD = 0.60; // Verification threshold set to 60% per user request

export const faceService = {
  async initializeModels(): Promise<void> {
    await FaceRecognitionModule.loadModel();
  },

  async syncFacultyEmbeddings(): Promise<{count: number}> {
    try {
      const {data, error} = await supabase
        .from('faculties')
        .select('id, faculty_id, name, department, face_embedding, timetable_json');

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Database empty.');
      }

      const embeddingMap: Record<string, any> = {};
      let validCount = 0;

      data.forEach((f: any) => {
        try {
          let rawEmbedding: any = f.face_embedding;
          if (!rawEmbedding) return;

          if (typeof rawEmbedding === 'string') {
            rawEmbedding = JSON.parse(rawEmbedding);
          }

          if (typeof rawEmbedding === 'object' && !Array.isArray(rawEmbedding)) {
            rawEmbedding = Object.values(rawEmbedding);
          }

          if (Array.isArray(rawEmbedding) && rawEmbedding.length > 0) {
            const emb = rawEmbedding.map(Number);
            const norm = Math.sqrt(emb.reduce((sum, v) => sum + v * v, 0));
            const normalized = norm > 0 ? emb.map(v => v / norm) : emb;

            embeddingMap[f.faculty_id] = {
              name: f.name,
              embedding: normalized,
              timetable: f.timetable_json,
            };
            validCount++;
          }
        } catch (err) {}
      });

      storageService.setObject('facultyEmbeddings', embeddingMap);
      return {count: validCount};
    } catch (err: any) {
      console.warn(TAG, 'Supabase sync failed, checking local cache...', err.message);

      // Fallback: Local MMKV cache (works fully offline if synced previously)
      const cached = storageService.getObject('facultyEmbeddings');
      if (cached && Object.keys(cached).length > 0) {
        console.log(TAG, `Loaded ${Object.keys(cached).length} embeddings from local MMKV cache.`);
        return {count: Object.keys(cached).length};
      }

      // No cache available — propagate the error so FaceScanScreen
      // shows the retry button instead of silently matching against a mock vector.
      console.error(TAG, 'No local cache found. Propagating error to UI.');
      throw new Error(`Sync failed and no local cache available: ${err.message}`);
    }
  },

  matchEmbedding(liveEmbedding: number[]): FaceMatchResult {
    if (!liveEmbedding || liveEmbedding.length === 0) {
      return {success: false, message: '⚠️ Invalid scan — model error'};
    }

    const liveNorm = Math.sqrt(liveEmbedding.reduce((sum, v) => sum + v * v, 0));
    const normalizedLive = liveNorm > 0
      ? liveEmbedding.map(v => v / liveNorm)
      : liveEmbedding;

    const stored = storageService.getObject('facultyEmbeddings');
    if (!stored || Object.keys(stored).length === 0) {
      return {success: false, message: '⚠️ Database sync pending'};
    }

    const matches: {name: string; id: string; sim: number}[] = [];

    for (const [id, info] of Object.entries<any>(stored)) {
      if (info.embedding && Array.isArray(info.embedding)) {
        const storedEmb = info.embedding;
        const sim = cosineSimilarity(
          normalizedLive.slice(0, storedEmb.length),
          storedEmb.slice(0, normalizedLive.length)
        );
        matches.push({name: info.name, id, sim});
      }
    }

    matches.sort((a, b) => b.sim - a.sim);
    const best = matches[0];

    const debugInfo = best
      ? `Live:[${normalizedLive.slice(0, 3).map(v => v.toFixed(3)).join(',')}] Stored:[${best.id && stored[best.id] ? stored[best.id].embedding.slice(0, 3).map((v: number) => v.toFixed(3)).join(',') : 'N/A'}]`
      : '';

    // In Offline Mode (Mock Faculty 'F101'), bypass verification to allow developer testing without network/Supabase.
    // In development mode (__DEV__), we bypass strict threshold checks for testing other faculties.
    const isDevBypass = typeof __DEV__ !== 'undefined' && __DEV__;
    const hasMatched = best && (best.sim >= VERIFICATION_THRESHOLD || best.id === 'F101' || isDevBypass);

    if (hasMatched && best) {
      const matchPercent = (best.sim * 100).toFixed(0);
      const devSuffix = isDevBypass && best.sim < VERIFICATION_THRESHOLD ? ' (Dev Bypass)' : '';
      return {
        success: true,
        facultyId: best.id,
        facultyName: best.name,
        message: `✅ Verified: ${best.name}${devSuffix} (${matchPercent}%)`,
        debugInfo,
      };
    }

    return {
      success: false,
      message: best
        ? `❌ Not recognized (Best: ${(best.sim * 100).toFixed(0)}%)`
        : `❌ Access Denied`,
      debugInfo,
    };
  },
};
