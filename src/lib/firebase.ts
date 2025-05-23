
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore"; // Import Firestore

let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;
let db: Firestore | undefined = undefined; // Explicitly allow db to be undefined

const FALLBACK_API_KEY = "AIzaSyBdywe1KJJCIqn7_7og9A1JJPs0eMS8CJA"
// Firebase configuration
const firebaseConfig: FirebaseOptions = { // Make sure this matches your project settings in the Firebase Console
    apiKey: "AIzaSyBdywe1KJJCIqn7_7og9A1JJPs0eMS8CJA",
    authDomain: "sportsofficeex-9wq7y.firebaseapp.com",
    projectId: "sportsofficeex-9wq7y",
    storageBucket: "sportsofficeex-9wq7y.firebasestorage.app",
    messagingSenderId: "527048093802",
    appId: "1:527048093802:web:4d8e9affea5bab23341a13"

if (!firebaseConfig.projectId) {
    console.error(
        "Firebase projectId is missing. Please check your environment variables (NEXT_PUBLIC_FIREBASE_PROJECT_ID) or firebaseConfig in src/lib/firebase.ts."
    );
} else {
    if (typeof window !== 'undefined') { // Ensure Firebase is initialized only on the client-side
        if (firebaseConfig.apiKey === FALLBACK_API_KEY) {
            console.warn(
                "%cFirebase Misconfiguration Warning:\n" +
                "%cThe application is using a default/fallback Firebase API key. " +
                "This is likely not what you intend for your project.\n" +
                "Please ensure your Firebase environment variables (e.g., NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID) " +
                "are correctly set in your .env (or .env.local) file and match your Firebase project's configuration.",
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
                app = undefined; // Ensure app is undefined on error
            }
        } else {
            try {
                app = getApp();
                console.log("Firebase client SDK already initialized. Project ID:", app.options.projectId);
            } catch (error: any) {
                 console.error("Error getting Firebase app instance:", error.message, error.stack);
                 app = undefined; // Ensure app is undefined on error
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
        // Firestore might not be enabled, warn the user.
        if (error.code === 'unavailable' || (error.message && error.message.toLowerCase().includes("service firestore is not available"))) {
            console.warn(
                `Firestore might not be enabled for project '${firebaseConfig.projectId}'. Please go to the Firebase console and ensure Firestore (Cloud Firestore) is enabled and correctly configured for this project. Error details: ${error.message}`
            );
        } else {
            console.error("Error initializing Firestore service:", error.message, error.stack);
        }
        db = undefined; // Ensure db is undefined on error
    }
} else {
    if (typeof window !== 'undefined') { // Log this error only on client-side
      console.error("Firebase app is not initialized. Auth and Firestore services cannot be created.");
    }
}

export { app, auth, db };
