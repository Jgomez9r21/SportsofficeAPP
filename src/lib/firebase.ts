
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore"; // Import Firestore

let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;
let db: Firestore | undefined = undefined;

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Check if essential environment variables are missing
const missingEnvVars = !firebaseConfig.apiKey || !firebaseConfig.projectId;

if (missingEnvVars) {
    console.error(
        "CRITICAL Firebase Configuration Error:\n" +
        "One or more Firebase environment variables (e.g., NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID) are missing.\n" +
        "The application WILL NOT connect to Firebase correctly and will likely fail.\n" +
        "Please create or check your .env.local file in the root of your project and add your Firebase project's configuration."
    );
    // Firebase will not be initialized if critical config is missing
} else {
    if (typeof window !== 'undefined') { // Ensure Firebase is initialized only on the client-side
        if (!getApps().length) {
            try {
                app = initializeApp(firebaseConfig as FirebaseOptions); // Cast because env vars might be undefined initially by TS
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
        if ((error as any).code === 'unavailable' || ((error as Error).message && (error as Error).message.toLowerCase().includes("service firestore is not available"))) {
            console.warn(
                `Firestore might not be enabled for project '${firebaseConfig.projectId}'. Please go to the Firebase console and ensure Firestore (Cloud Firestore) is enabled. Error: ${(error as Error).message}`
            );
        } else {
            console.error("Error initializing Firestore service:", error.message, error.stack);
        }
        db = undefined;
    }
} else {
    if (typeof window !== 'undefined' && !missingEnvVars) { 
      console.error("Firebase app is not initialized (but config was present). Auth and Firestore services cannot be created.");
    } else if (typeof window !== 'undefined' && missingEnvVars) {
      console.error("Firebase app is not initialized due to missing critical configuration. Auth and Firestore services cannot be created.");
    }
}

export { app, auth, db };
