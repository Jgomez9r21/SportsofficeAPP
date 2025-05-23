
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore"; // Import Firestore

let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;
let db: Firestore | undefined = undefined;
let isFirebaseInitialized = false;

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const essentialConfigPresent = firebaseConfig.apiKey && firebaseConfig.projectId;

if (!essentialConfigPresent) {
    console.error(
        "CRITICAL Firebase Configuration Error:\n" +
        "One or more Firebase environment variables (NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID) are missing.\n" +
        "Firebase WILL NOT be initialized. Ensure your .env.local file is correctly set up."
    );
    isFirebaseInitialized = false;
} else {
    if (typeof window !== 'undefined') { // Ensure Firebase is initialized only on the client-side
        if (!getApps().length) {
            try {
                console.log("FirebaseLib: Attempting to initialize Firebase app with config:", firebaseConfig);
                app = initializeApp(firebaseConfig as FirebaseOptions);
                console.log("FirebaseLib: Firebase app initialized successfully. Project ID:", app.options.projectId);
                isFirebaseInitialized = true;
            } catch (error: any) {
                console.error("FirebaseLib CRITICAL: Error initializing Firebase app:", error.message, error.stack);
                app = undefined;
                isFirebaseInitialized = false;
            }
        } else {
            try {
                app = getApp();
                console.log("FirebaseLib: Firebase app already initialized. Project ID:", app.options.projectId);
                isFirebaseInitialized = true;
            } catch (error: any) {
                 console.error("FirebaseLib CRITICAL: Error getting Firebase app instance:", error.message, error.stack);
                 app = undefined;
                 isFirebaseInitialized = false;
            }
        }
    }
}

if (app && isFirebaseInitialized) {
    try {
        auth = getAuth(app);
        console.log("FirebaseLib: Firebase Auth service initialized for project:", app.options.projectId);
    } catch (error: any) {
        console.error("FirebaseLib CRITICAL: Error initializing Firebase Auth:", error.message, error.stack);
        auth = undefined;
    }

    try {
        db = getFirestore(app);
        console.log("FirebaseLib: Firestore service initialized for project:", app.options.projectId);
    } catch (error: any) {
        if ((error as any).code === 'unavailable' || ((error as Error).message && (error as Error).message.toLowerCase().includes("service firestore is not available"))) {
            console.warn(
                `FirebaseLib WARNING: Firestore might not be enabled for project '${firebaseConfig.projectId}'. Please go to the Firebase console and ensure Firestore (Cloud Firestore) is enabled. Error: ${(error as Error).message}`
            );
        } else {
            console.error("FirebaseLib CRITICAL: Error initializing Firestore service:", error.message, error.stack);
        }
        db = undefined; // Set db to undefined if initialization fails for any reason
    }
} else {
    // If app initialization failed or essential config was missing, ensure auth and db are undefined.
    auth = undefined;
    db = undefined;
    if (typeof window !== 'undefined' && essentialConfigPresent && !isFirebaseInitialized) {
      // This case implies app was defined but isFirebaseInitialized somehow became false, or app init logic failed.
      console.error("FirebaseLib CRITICAL: Firebase app is NOT initialized (isFirebaseInitialized is false despite config being present). Auth and Firestore services will be unavailable.");
      isFirebaseInitialized = false; // Explicitly set to false
    } else if (typeof window !== 'undefined' && !essentialConfigPresent) {
      // This case implies essentialConfigPresent was false. isFirebaseInitialized is already false.
      console.error("FirebaseLib CRITICAL: Firebase app is NOT initialized due to missing critical configuration. Auth and Firestore services will be unavailable.");
    }
}

export { app, auth, db, isFirebaseInitialized };
