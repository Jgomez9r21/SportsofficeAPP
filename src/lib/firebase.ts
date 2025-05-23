
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore"; // Import Firestore

let app: FirebaseApp | undefined = undefined;
let authInstance: Auth | undefined = undefined; // Renamed to avoid conflict if 'auth' is used elsewhere
let dbInstance: Firestore | undefined = undefined; // Renamed
export let isFirebaseInitialized = false; // Export this flag

const FALLBACK_API_KEY = "AIzaSyBdywe1KJJCIqn7_7og9A1JJPs0eMS8CJA"; // Example, replace if you have a real fallback for some reason

const firebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const essentialConfigPresent = firebaseConfig.apiKey && firebaseConfig.apiKey !== FALLBACK_API_KEY && firebaseConfig.projectId;

if (!essentialConfigPresent) {
    console.error(
        "CRITICAL Firebase Configuration Error:\n" +
        "One or more Firebase environment variables (NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID) are missing or using fallback values.\n" +
        "Firebase WILL NOT be initialized. Ensure your .env.local file is correctly set up and you have restarted your development server."
    );
    isFirebaseInitialized = false;
} else {
    if (typeof window !== 'undefined') {
        if (!getApps().length) {
            try {
                app = initializeApp(firebaseConfig);
                console.log("FirebaseLib: Firebase app initialized successfully. Project ID:", app.options.projectId);
            } catch (error: any) {
                console.error("FirebaseLib: Error initializing Firebase app:", error.message, error.stack);
                app = undefined;
            }
        } else {
            try {
                app = getApp();
                console.log("FirebaseLib: Firebase app already initialized. Project ID:", app.options.projectId);
            } catch (error: any) {
                 console.error("FirebaseLib: Error getting Firebase app instance:", error.message, error.stack);
                 app = undefined;
            }
        }

        if (app) {
            try {
                authInstance = getAuth(app);
                console.log("FirebaseLib: Firebase Auth service initialized.");
            } catch (error: any) {
                console.error("FirebaseLib: Error initializing Firebase Auth:", error.message, error.stack);
                authInstance = undefined;
            }

            try {
                dbInstance = getFirestore(app);
                console.log("FirebaseLib: Firestore service initialized.");
            } catch (error: any) {
                if (error.code === 'unavailable' || (error.message && error.message.toLowerCase().includes("service firestore is not available"))) {
                    console.warn(
                        `FirebaseLib: Firestore might not be enabled for project '${firebaseConfig.projectId}'. Please ensure Firestore is enabled. Error: ${error.message}`
                    );
                } else {
                    console.error("FirebaseLib: Error initializing Firestore service:", error.message, error.stack);
                }
                dbInstance = undefined;
            }

            // Only set to true if all critical services are initialized
            if (app && authInstance && dbInstance) {
                isFirebaseInitialized = true;
                console.log("FirebaseLib: All core Firebase services (App, Auth, Firestore) initialized successfully.");
            } else {
                isFirebaseInitialized = false;
                console.error("FirebaseLib: One or more core Firebase services (Auth, Firestore) failed to initialize even though the app was created.");
            }

        } else {
            isFirebaseInitialized = false;
            console.error("FirebaseLib: Firebase app is NOT initialized. Auth and Firestore services cannot be created.");
        }
    }
}

export { app, authInstance as auth, dbInstance as db };
