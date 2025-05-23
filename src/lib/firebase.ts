
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore"; // Import Firestore

let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;
let db: Firestore | undefined = undefined; // Explicitly allow db to be undefined

const FALLBACK_API_KEY = "AIzaSyDkjXsZkQtQ9GSbeyMENNm-HLY-gz4Eum8";
const FALLBACK_PROJECT_ID = "sportsofficeapp";

// Firebase configuration
const firebaseConfig: FirebaseOptions = { 
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || FALLBACK_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${FALLBACK_PROJECT_ID}.firebaseapp.com`,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || FALLBACK_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${FALLBACK_PROJECT_ID}.appspot.com`,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1020460978896",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1020460978896:web:b05960f102f3a1e26c45b1",
};

const isUsingFallbackApiKey = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const isUsingFallbackProjectId = !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (isUsingFallbackApiKey && isUsingFallbackProjectId) {
    console.error(
        "CRITICAL Firebase Misconfiguration: BOTH API Key and Project ID are using default/fallback values " +
        "(because NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variables are likely missing). " +
        "Firebase will NOT be initialized. Please set these variables in your .env or .env.local file for your project."
    );
    // app, auth, and db will remain undefined
} else if (!firebaseConfig.projectId) {
    console.error(
        "Firebase projectId is effectively missing even after attempting to use environment variables or fallbacks. " +
        "Please check your environment variables (NEXT_PUBLIC_FIREBASE_PROJECT_ID) or firebaseConfig in src/lib/firebase.ts."
    );
    // app, auth, and db will remain undefined
} else {
    // Proceed with initialization only if not critically misconfigured
    if (typeof window !== 'undefined') { 
        if (isUsingFallbackApiKey) { // Warn if only API key is fallback but project ID might be set
            console.warn(
                "%cFirebase API Key Warning:\n" +
                "%cThe application is using a default/fallback Firebase API key. " +
                "This is likely not what you intend for your project.\n" +
                "Please ensure your Firebase environment variable NEXT_PUBLIC_FIREBASE_API_KEY " +
                "is correctly set in your .env (or .env.local) file.",
                "color: orange; font-weight: bold;",
                "color: orange;"
            );
        }
        if (isUsingFallbackProjectId) { // Warn if only Project ID is fallback but API key might be set
             console.warn(
                "%cFirebase Project ID Warning:\n" +
                "%cThe application is using a default/fallback Firebase Project ID ('sportsofficeapp'). " +
                "If this is not your intended project, please ensure your Firebase environment variable NEXT_PUBLIC_FIREBASE_PROJECT_ID " +
                "is correctly set in your .env (or .env.local) file.",
                "color: orange; font-weight: bold;",
                "color: orange;"
            );
        }


        if (!getApps().length) {
            try {
                app = initializeApp(firebaseConfig);
                console.log("Firebase initialized successfully with client config. Project ID:", app.options.projectId);
            } catch (error: any) {
                console.error("Error initializing Firebase client SDK:", error.message, error.stack);
                app = undefined; 
            }
        } else {
            try {
                app = getApp();
                console.log("Firebase client SDK already initialized. Project ID:", app.options.projectId);
            } catch (error: any) {
                 console.error("Error getting Firebase app instance:", error.message, error.stack);
                 app = undefined; 
            }
        }
    }
}

if (app) {
    try {
        auth = getAuth(app);
        console.log("Firebase Auth service initialized.");
    } catch (error: any) {
        console.error("Error initializing Firebase Auth:", error.message, error.stack);
        auth = undefined;
    }

    try {
        db = getFirestore(app);
        console.log("Firestore service initialized.");
    } catch (error: any) {
        if ((error as any).code === 'unavailable' || ((error as any).message && (error as any).message.toLowerCase().includes("service firestore is not available"))) {
            console.warn(
                `Firestore might not be enabled for project '${firebaseConfig.projectId}'. Please go to the Firebase console and ensure Firestore (Cloud Firestore) is enabled and correctly configured for this project. Error details: ${(error as Error).message}`
            );
        } else {
            console.error("Error initializing Firestore service:", error.message, error.stack);
        }
        db = undefined; 
    }
} else {
    if (typeof window !== 'undefined' && !(isUsingFallbackApiKey && isUsingFallbackProjectId)) { 
      console.error("Firebase app is not initialized (app instance is undefined). Auth and Firestore services cannot be created. This might be due to an earlier initialization error or critical misconfiguration.");
    }
}

export { app, auth, db };
