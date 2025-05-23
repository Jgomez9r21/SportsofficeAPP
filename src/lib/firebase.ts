
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore"; // Import Firestore

let app: FirebaseApp | undefined = undefined;
let authInstance: Auth | undefined = undefined;
let dbInstance: Firestore | undefined = undefined;
export let isFirebaseInitialized = false; // Export this flag

// Directly using the provided Firebase configuration
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyBHA9JdLWXnua3MTg7h1IXEWfZVL-V9Vww",
  authDomain: "sportsoofficeapp.firebaseapp.com",
  projectId: "sportsoofficeapp",
  storageBucket: "sportsoofficeapp.appspot.com", // Corrected from sportsoofficeapp.firebasestorage.app
  messagingSenderId: "517537044482",
  appId: "1:517537044482:web:4753c23d4fecd0da88af1b"
};

console.log("FirebaseLib: Using direct configuration:", firebaseConfig);

const essentialConfigPresent = firebaseConfig.apiKey && firebaseConfig.projectId;

if (!essentialConfigPresent) {
    console.error(
        "CRITICAL Firebase Configuration Error:\n" +
        "The hardcoded Firebase configuration is missing API Key or Project ID.\n" +
        "Firebase WILL NOT be initialized."
    );
    isFirebaseInitialized = false;
} else {
    if (typeof window !== 'undefined') { // Ensure this runs only on the client
        if (!getApps().length) {
            try {
                app = initializeApp(firebaseConfig);
                console.log("FirebaseLib: Firebase app initialized successfully with direct config. Project ID:", app.options.projectId);
            } catch (error: any) {
                console.error("FirebaseLib: Error initializing Firebase app with direct config:", error.message, error.stack);
                app = undefined;
            }
        } else {
            try {
                app = getApp();
                console.log("FirebaseLib: Firebase app already initialized (direct config). Project ID:", app.options.projectId);
            } catch (error: any) {
                 console.error("FirebaseLib: Error getting Firebase app instance (direct config):", error.message, error.stack);
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

            if (app && authInstance && dbInstance) {
                isFirebaseInitialized = true;
                console.log("FirebaseLib: All core Firebase services (App, Auth, Firestore) initialized successfully using direct config. isFirebaseInitialized is true.");
            } else {
                isFirebaseInitialized = false;
                const missingServices = [];
                if (!authInstance) missingServices.push("Auth");
                if (!dbInstance) missingServices.push("Firestore");
                console.error(`FirebaseLib: One or more core Firebase services (${missingServices.join(', ')}) failed to initialize even though the app was created. isFirebaseInitialized is false.`);
            }

        } else {
            isFirebaseInitialized = false;
            console.error("FirebaseLib: Firebase app is NOT initialized using direct config. Auth and Firestore services cannot be created. isFirebaseInitialized is false.");
        }
    }
}

export { app, authInstance as auth, dbInstance as db };
