// This file contains the initialization and configuration for the Firebase Admin SDK.

import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import { applicationDefault, initializeApp as initializeAdminApp, getApp as getAdminApp } from 'firebase-admin/app';

// Make all fields optional for initial checking, but ServiceAccount from firebase-admin expects them.
type OptionalServiceAccount = Partial<ServiceAccount>;

const serviceAccountConfig: OptionalServiceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  // You might need to add other fields from your service account key if present,
  // like clientX509CertUrl, etc., though projectId, privateKey, and clientEmail are common.
};

let adminAppInstance: admin.app.App | null = null;

if (admin.apps.length > 0) {
  try {
    adminAppInstance = getAdminApp();
    console.log('Firebase Admin SDK already initialized.');
  } catch (error: any) {
    console.error('Error getting existing Firebase Admin app instance:', error.message);
    adminAppInstance = null;
  }
} else {
  const hasServiceAccountDetails =
    serviceAccountConfig.projectId &&
    serviceAccountConfig.privateKey &&
    serviceAccountConfig.clientEmail;

  if (hasServiceAccountDetails) {
    try {
      adminAppInstance = initializeAdminApp({
        credential: admin.credential.cert(serviceAccountConfig as ServiceAccount),
        // Optionally add databaseURL if needed for Realtime Database and projectId is available
        // ...(serviceAccountConfig.projectId && { databaseURL: `https://${serviceAccountConfig.projectId}.firebaseio.com` })
      });
      console.log('Firebase Admin SDK initialized successfully with service account credentials.');
    } catch (error: any) {
      console.error('Firebase Admin SDK initialization error with service account:', error.message);
      adminAppInstance = null;
    }
  } else {
    console.warn(
      'Firebase Admin SDK service account details (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_PRIVATE_KEY, FIREBASE_ADMIN_CLIENT_EMAIL) ' +
      'are missing or incomplete in environment variables. Attempting to initialize with Application Default Credentials (ADC).'
    );
    try {
      adminAppInstance = initializeAdminApp({
        credential: applicationDefault(),
      });
      console.log('Firebase Admin SDK initialized successfully with Application Default Credentials.');
    } catch (error: any) {
      console.error(
        'Firebase Admin SDK initialization error with Application Default Credentials. ' +
        'Ensure ADC are set up in your environment (e.g., by running `gcloud auth application-default login`) OR ' +
        'provide all required service account key details in environment variables. Error:',
        error.message
      );
      adminAppInstance = null;
    }
  }
}

if (!adminAppInstance && admin.apps.length === 0) { // Only log critical if it truly failed to initialize and no app exists
    console.error(
      "CRITICAL: Firebase Admin SDK failed to initialize. " +
      "Genkit flows and other server-side Firebase functionalities will likely not work. " +
      "Please check your environment variables for Firebase Admin (e.g., FIREBASE_ADMIN_PROJECT_ID) " +
      "OR ensure Application Default Credentials are correctly configured if service account keys are not provided."
    );
}

export const adminApp = adminAppInstance;
// You might also want to export specific services like auth or firestore:
// export const adminAuth = adminAppInstance ? adminAppInstance.auth() : null;
// export const adminDb = adminAppInstance ? adminAppInstance.firestore() : null;
