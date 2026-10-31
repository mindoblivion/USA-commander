import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { signInWithPopup, signOut, User } from 'firebase/auth';
import { db, auth, googleProvider } from './config';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface CommanderAchievement {
  id: string;
  title: string;
  description: string;
  medalIcon: string;
  unlockedAt: string;
}

export interface CloudSaveData {
  userId: string;
  callsign?: string;
  email?: string;
  cash: number;
  totalDevastationCash: number;
  selectedAssetId?: string;
  activeTheaterId?: string;
  unlockedWeapons?: string[];
  achievements?: CommanderAchievement[];
  updatedAt: string;
  createdAt?: string;
}

export interface LeaderboardItem {
  id: string;
  userId: string;
  commanderName: string;
  devastationScore: number;
  highestTheater: string;
  nuclearStrikes: number;
  updatedAt: string;
}

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    return null;
  }
}

/**
 * Sign out
 */
export async function logOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-Out Error:', error);
  }
}

/**
 * Save user campaign progress to Firestore
 */
export async function saveCampaignToCloud(data: CloudSaveData): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  const path = `users/${user.uid}`;
  try {
    await setDoc(doc(db, 'users', user.uid), {
      ...data,
      userId: user.uid,
      email: user.email || data.email || 'commander@usaf.mil',
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Also update public leaderboard entry
    await setDoc(doc(db, 'leaderboard', user.uid), {
      id: user.uid,
      userId: user.uid,
      commanderName: data.callsign || user.displayName || 'US Commander',
      devastationScore: data.totalDevastationCash,
      highestTheater: data.activeTheaterId || 'metropolis_alpha',
      nuclearStrikes: data.unlockedWeapons?.includes('tactical_nuke') ? 1 : 0,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Load user campaign progress from Firestore
 */
export async function loadCampaignFromCloud(userId: string): Promise<CloudSaveData | null> {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      return snap.data() as CloudSaveData;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Fetch top commanders from Firestore leaderboard
 */
export async function fetchGlobalLeaderboard(): Promise<LeaderboardItem[]> {
  const path = 'leaderboard';
  try {
    const q = query(collection(db, 'leaderboard'), orderBy('devastationScore', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as LeaderboardItem);
  } catch (error) {
    // If empty or index building, return safe fallback
    console.warn('Leaderboard fetch note:', error);
    return [];
  }
}
