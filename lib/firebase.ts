import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

if (typeof window !== 'undefined') {
  void setPersistence(auth, browserLocalPersistence).catch(() => {
    // Abaikan jika browser membatasi persistence
  });

  // Validasi koneksi awal ke Firestore
  void getDocFromServer(doc(db, 'test', 'connection')).catch((error) => {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Periksa konfigurasi Firebase Anda (client is offline).');
    }
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function terjemahkanErrorFirebase(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  const msg = error instanceof Error ? error.message : String(error);

  if (code === 'auth/email-already-in-use') {
    return 'Email ini sudah terdaftar, silakan masuk';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return 'Email atau kata sandi salah';
  }
  if (code === 'auth/invalid-email') {
    return 'Format email tidak valid';
  }
  if (code === 'auth/weak-password') {
    return 'Kata sandi minimal 6 karakter';
  }
  if (code === 'auth/too-many-requests') {
    return 'Terlalu banyak percobaan, coba lagi nanti';
  }
  if (
    code === 'auth/network-request-failed' ||
    code === 'unavailable' ||
    msg.includes('offline') ||
    msg.includes('network')
  ) {
    return 'Koneksi bermasalah, coba lagi';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Masuk dengan email dan kata sandi belum diaktifkan di Firebase Console';
  }

  return 'Terjadi kendala, coba lagi';
}
