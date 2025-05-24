
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore"; // Import Firestore

let app: FirebaseApp | undefined = undefined;
let authInstance: Auth | undefined = undefined;
let dbInstance: Firestore | undefined = undefined;
export let isFirebaseInitialized = false;

// Your web app's Firebase configuration
// 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
// WARNING: Hardcoding Firebase config like this is NOT recommended for production.
// This was done for specific debugging purposes.
// For production, ALWAYS use environment variables (e.g., .env.local)
// and access them via process.env.NEXT_PUBLIC_FIREBASE_API_KEY, etc.
//
// Example using environment variables (RECOMMENDED APPROACH):
// const firebaseConfig: FirebaseOptions = {
//   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
//   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
// };
// 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
const firebaseConfig: FirebaseOptions = {
    apiKey: "AIzaSyBHA9JdLWXnua3MTg7h1IXEWfZVL-V9Vww",
    authDomain: "sportsoofficeapp.firebaseapp.com",
    projectId: "sportsoofficeapp",
    storageBucket: "sportsoofficeapp.appspot.com", // Corrected from .firebasestorage.app
    messagingSenderId: "517537044482",
    appId: "1:517537044482:web:4753c23d4fecd0da88af1b" // Assuming this was the intended App ID
};

console.log("FirebaseLib: Attempting to initialize with direct configuration:", firebaseConfig);

const essentialConfigPresent = firebaseConfig.apiKey && firebaseConfig.projectId;

if (!essentialConfigPresent) {
    console.error(
        "CRITICAL Firebase Configuration Error:\n" +
        "The Firebase configuration (hardcoded or from env vars) is missing API Key or Project ID.\n" +
        "Firebase WILL NOT be initialized."
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

            if (authInstance && dbInstance) { // Check if app, auth AND db are initialized
                isFirebaseInitialized = true;
                console.log("FirebaseLib: All core Firebase services (App, Auth, Firestore) initialized successfully. isFirebaseInitialized is true.");
            } else {
                isFirebaseInitialized = false;
                const missingServices = [];
                if (!authInstance) missingServices.push("Auth");
                if (!dbInstance) missingServices.push("Firestore");
                console.error(`FirebaseLib: One or more core Firebase services (${missingServices.join(', ')}) failed to initialize even though the app was created. isFirebaseInitialized is false.`);
            }
        } else {
            isFirebaseInitialized = false;
            console.error("FirebaseLib: Firebase app is NOT initialized. Auth and Firestore services cannot be created. isFirebaseInitialized is false.");
        }
    }
}

// Export the initialized services and the flag
export { app, authInstance as auth, dbInstance as db };
