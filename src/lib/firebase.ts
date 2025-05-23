
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;
let db: Firestore | undefined = undefined;
let isFirebaseInitialized = false; // Default to false

const FALLBACK_API_KEY = "AIzaSyDkjXsZkQtQ9GSbeyMENNm-HLY-gz4Eum8"; // Placeholder, should be overwritten by env

const firebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || FALLBACK_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sportsofficeapp.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sportsofficeapp",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sportsofficeapp.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1020460978896",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1020460978896:web:b05960f102f3a1e26c45b1",
};

const essentialConfigPresent =
    firebaseConfig.apiKey && firebaseConfig.apiKey !== FALLBACK_API_KEY &&
    firebaseConfig.projectId && firebaseConfig.projectId !== "sportsofficeapp"; // Check against default/placeholder

if (!essentialConfigPresent) {
    console.error(
        "CRITICAL Firebase Configuration Error:\n" +
        "One or more Firebase environment variables (NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID) are missing or using default/placeholder values.\n" +
        "Firebase WILL NOT be initialized. Ensure your .env.local file is correctly set up with your project's actual credentials and you have restarted the server."
    );
    isFirebaseInitialized = false;
} else {
    if (typeof window !== 'undefined') {
        if (!getApps().length) {
            try {
                app = initializeApp(firebaseConfig);
                console.log("FirebaseLib: Firebase app initialized successfully. Project ID:", app.options.projectId);
            } catch (error: any) {
                console.error("FirebaseLib: CRITICAL - Error initializing Firebase app:", error.message, error.stack);
                app = undefined;
            }
        } else {
            try {
                app = getApp();
                console.log("FirebaseLib: Firebase app already initialized. Project ID:", app.options.projectId);
            } catch (error: any) {
                 console.error("FirebaseLib: CRITICAL - Error getting Firebase app instance:", error.message, error.stack);
                 app = undefined;
            }
        }

        if (app) {
            try {
                auth = getAuth(app);
                console.log("FirebaseLib: Firebase Auth service initialized.");
            } catch (error: any) {
                console.error("FirebaseLib: CRITICAL - Error initializing Firebase Auth:", error.message, error.stack);
                auth = undefined;
            }

            try {
                db = getFirestore(app);
                console.log("FirebaseLib: Firestore service initialized.");
            } catch (error: any) {
                if ((error as any).code === 'unavailable' || ((error as any).message && (error as any).message.toLowerCase().includes("service firestore is not available"))) {
                    console.warn(
                        `FirebaseLib: Firestore might not be enabled for project '${firebaseConfig.projectId}'. Please check Firebase console. Error: ${(error as any).message}`
                    );
                } else {
                    console.error("FirebaseLib: CRITICAL - Error initializing Firestore service:", error.message, error.stack);
                }
                db = undefined;
            }

            // Only set to true if app, auth, AND db are successfully initialized
            if (app && auth && db) {
                isFirebaseInitialized = true;
                console.log("FirebaseLib: All core Firebase services (App, Auth, Firestore) initialized successfully.");
            } else {
                isFirebaseInitialized = false;
                console.error("FirebaseLib: CRITICAL - One or more core Firebase services (Auth, Firestore) failed to initialize even if Firebase App was created.");
            }

        } else {
            console.error("FirebaseLib: CRITICAL - Firebase app is not initialized. Auth and Firestore services cannot be created.");
            isFirebaseInitialized = false;
        }
    }
}

export { app, auth, db, isFirebaseInitialized };
