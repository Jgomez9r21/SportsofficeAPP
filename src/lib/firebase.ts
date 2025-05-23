
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore"; // Import Firestore

let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;
let db: Firestore | undefined = undefined;
let isFirebaseInitialized = false;

const FALLBACK_API_KEY = "AIzaSyDkjXsZkQtQ9GSbeyMENNm-HLY-gz4Eum8"; // Default, likely incorrect for any real project

// Firebase configuration
const firebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || FALLBACK_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sportsofficeapp.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sportsofficeapp",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sportsofficeapp.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1020460978896",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1020460978896:web:b05960f102f3a1e26c45b1",
};

const essentialConfigPresent =
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== FALLBACK_API_KEY &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== "sportsofficeapp"; // Check against default/placeholder projectId

if (!essentialConfigPresent) {
    console.error(
        "CRITICAL Firebase Configuration Error:\n" +
        "One or more Firebase environment variables (NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID) are missing or using placeholder values.\n" +
        "Firebase WILL NOT be initialized. Ensure your .env.local file is correctly set up with your project's actual credentials and that you have restarted your development server."
    );
    isFirebaseInitialized = false;
} else {
    if (typeof window !== 'undefined') {
        if (!getApps().length) {
            try {
                app = initializeApp(firebaseConfig);
                console.log("FirebaseLib: Firebase app initialized successfully. Project ID:", app.options.projectId);
                isFirebaseInitialized = true;
            } catch (error: any) {
                console.error("FirebaseLib: CRITICAL - Error initializing Firebase app:", error.message, error.stack);
                app = undefined;
                isFirebaseInitialized = false;
            }
        } else {
            try {
                app = getApp();
                console.log("FirebaseLib: Firebase app already initialized. Project ID:", app.options.projectId);
                isFirebaseInitialized = true; // Assume if getApp() succeeds, it was initialized properly before
            } catch (error: any) {
                 console.error("FirebaseLib: CRITICAL - Error getting Firebase app instance:", error.message, error.stack);
                 app = undefined;
                 isFirebaseInitialized = false;
            }
        }

        if (app) {
            try {
                auth = getAuth(app);
                console.log("FirebaseLib: Firebase Auth service initialized.");
            } catch (error: any) {
                console.error("FirebaseLib: Error initializing Firebase Auth:", error.message, error.stack);
                auth = undefined;
            }

            try {
                db = getFirestore(app);
                console.log("FirebaseLib: Firestore service initialized.");
            } catch (error: any) {
                if (error.code === 'unavailable' || (error.message && error.message.toLowerCase().includes("service firestore is not available"))) {
                    console.warn(
                        `FirebaseLib: Firestore might not be enabled for project '${firebaseConfig.projectId}'. Please go to the Firebase console and ensure Firestore (Cloud Firestore) is enabled. Error: ${error.message}`
                    );
                } else {
                    console.error("FirebaseLib: Error initializing Firestore service:", error.message, error.stack);
                }
                db = undefined;
            }
        } else {
          // If app itself is not initialized, isFirebaseInitialized is already false.
          // Log specific services couldn't be initialized.
          if (typeof window !== 'undefined') {
            console.error("FirebaseLib: Firebase app is not initialized. Auth and Firestore services cannot be created.");
          }
        }
    }
}

export { app, auth, db, isFirebaseInitialized };
