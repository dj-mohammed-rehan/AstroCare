import { initializeApp } from 'firebase/app';
import {
  getAuth,
  sendEmailVerification,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

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

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export async function sendFirebaseVerificationEmail(firebaseUser: User): Promise<void> {
  try {
    await sendEmailVerification(firebaseUser, {
      url: window.location.origin,
      handleCodeInApp: false,
    });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    // Fallback to default Firebase authDomain action URL if current preview domain is not yet in Authorized Domains
    if (code === 'auth/unauthorized-continue-uri' || code === 'auth/invalid-continue-uri') {
      await sendEmailVerification(firebaseUser);
      return;
    }
    throw err;
  }
}

export function mapFirebaseAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An astronaut account with this email address already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long and sufficiently strong.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email address or password. Please verify your credentials.';
    case 'auth/user-disabled':
      return 'This astronaut account has been disabled.';
    case 'auth/too-many-requests':
      return 'Too many verification or sign-in attempts. Please wait a minute before trying again.';
    case 'auth/network-request-failed':
      return 'Network error communicating with Firebase Authentication. Check your connection and retry.';
    case 'auth/expired-action-code':
      return 'This email verification link has expired. Please request a new verification email.';
    case 'auth/invalid-action-code':
      return 'This email verification link is invalid or has already been used.';
    case 'auth/operation-not-allowed':
      return 'This sign-in provider is currently disabled in Firebase Console. Enable it under Authentication > Sign-in method on your Firebase project.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing authentication.';
    case 'auth/cancelled-popup-request':
      return 'Previous sign-in popup request was cancelled. Please try again.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email address using a different sign-in method.';
    case 'auth/requires-recent-login':
      return 'Please sign out and sign in again to complete this operation.';
    default:
      if (error instanceof Error && error.message) {
        return error.message;
      }
      return 'Authentication request failed. Please try again.';
  }
}
