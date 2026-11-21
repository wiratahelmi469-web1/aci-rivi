import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export interface PelangganProfile {
  uid: string;
  nama: string;
  email: string;
  nomorWhatsApp: string;
}

const COLLECTION = 'pelanggan';

function isPermissionError(error: unknown): boolean {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  const msg = error instanceof Error ? error.message : String(error);
  return (
    code === 'permission-denied' ||
    msg.toLowerCase().includes('insufficient permissions')
  );
}

export async function getPelangganProfile(
  uid: string
): Promise<PelangganProfile | null> {
  const path = `${COLLECTION}/${uid}`;
  try {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid: String(data.uid || uid),
      nama: String(data.nama || ''),
      email: String(data.email || ''),
      nomorWhatsApp: String(data.nomorWhatsApp || ''),
    };
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.GET, path);
    }
    throw error;
  }
}

export async function createPelangganProfile(
  input: PelangganProfile
): Promise<void> {
  const path = `${COLLECTION}/${input.uid}`;
  try {
    await setDoc(doc(db, COLLECTION, input.uid), {
      uid: input.uid,
      nama: input.nama.trim(),
      email: input.email.trim(),
      nomorWhatsApp: input.nomorWhatsApp.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
    throw error;
  }
}

export async function updatePelangganProfile(
  uid: string,
  input: { nama: string; nomorWhatsApp: string }
): Promise<void> {
  const path = `${COLLECTION}/${uid}`;
  try {
    await updateDoc(doc(db, COLLECTION, uid), {
      nama: input.nama.trim(),
      nomorWhatsApp: input.nomorWhatsApp.trim(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    throw error;
  }
}
