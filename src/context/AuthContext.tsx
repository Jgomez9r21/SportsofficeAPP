
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { z } from "zod";
import type { UseFormReset } from 'react-hook-form';
import {
  getAuth,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile as updateFirebaseProfile,
  type User as FirebaseUser,
  onAuthStateChanged
} from 'firebase/auth';
import { auth as firebaseAuthInstance, db, app as firebaseApp, isFirebaseInitialized } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, Timestamp } from "firebase/firestore";
import { AlertTriangle } from 'lucide-react';

interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  initials: string;
  avatarUrl: string;
  email: string;
  phone?: string;
  country?: string;
  dob?: Date | string | null;
  isPhoneVerified?: boolean;
  profileType?: string;
  gender?: string;
  documentType?: string;
  documentNumber?: string;
  createdAt?: Timestamp | null | undefined;
}

const defaultAvatar = "https://i.ibb.co/93cr9Rjd/avatar.png";

const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido.").min(1, "El correo es requerido."),
  password: z.string().min(1, "La contraseña es requerida."),
});
type LoginValues = z.infer<typeof loginSchema>;

const phoneValidation = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Número inválido. Debe estar en formato E.164 (ej: +573001234567).')
  .optional()
  .or(z.literal(""));

const signupStep1Schema = z.object({
  firstName: z.string().min(2, "Nombre debe tener al menos 2 caracteres."),
  lastName: z.string().min(2, "Apellido debe tener al menos 2 caracteres."),
  country: z.string().min(1, "Debes seleccionar un país.").default("CO"),
  phone: phoneValidation,
  profileType: z.string().min(1, "Debes seleccionar un tipo de perfil."),
});

const baseSignupStep2Schema = z.object({
  dob: z.date({ required_error: "La fecha de nacimiento es requerida." }).optional().nullable(),
  gender: z.string().optional(),
  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
  email: z.string().email("Correo electrónico inválido.").min(1, "El correo es requerido."),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres."),
  confirmPassword: z.string().min(6, "Confirmar contraseña debe tener al menos 6 caracteres."),
});

const mergedSignupSchema = signupStep1Schema.merge(baseSignupStep2Schema);

const signupSchema = mergedSignupSchema
  .refine(data => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

type SignupValues = z.infer<typeof signupSchema>;

const forgotPasswordSchema = z.object({
  email: z.string().email("Correo electrónico inválido.").min(1, "El correo es requerido."),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export type UpdateProfileData = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  dob?: Date | null;
  avatarFile?: File | null;
};

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  loginError: string | null;
  phoneVerificationError: string | null;
  isVerificationSent: boolean;
  isVerifyingCode: boolean;
  firebaseConfigError: boolean;
  isFirestoreOffline: boolean;
  login: (credentials: LoginValues) => Promise<FirebaseUser | null>;
  signup: (details: SignupValues) => Promise<FirebaseUser | null>;
  logout: () => Promise<void>;
  updateUser: (data: UpdateProfileData) => Promise<void>;
  handleLogout: () => void;
  sendVerificationCode: (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
  setIsVerificationSent: (sent: boolean) => void;
  resetPhoneVerification: () => void;
  handleForgotPasswordSubmit: (data: ForgotPasswordValues, resetForm: UseFormReset<ForgotPasswordValues>) => Promise<void>;
  openLoginDialog: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { toast } = useToast();

  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneVerificationError, setPhoneVerificationError] = useState<string | null>(null);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [firebaseConfigError, setFirebaseConfigError] = useState(false);
  const [isFirestoreOffline, setIsFirestoreOffline] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log("AuthContext: Component has mounted.");
    setHasMounted(true);
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasMounted) {
      console.log("AuthContext: Waiting for mount before checking auth.");
      return;
    }
    console.log("AuthContext: Mount complete. Starting auth check process.");

    if (!isFirebaseInitialized) {
      console.error("AuthContext: Firebase client SDK is NOT initialized (checked via isFirebaseInitialized from lib/firebase). Aborting auth check.");
      setFirebaseConfigError(true);
      setIsLoading(false);
      return;
    }
    setFirebaseConfigError(false);

    if (!firebaseAuthInstance) {
      console.error("AuthContext: firebaseAuthInstance is NOT available from lib/firebase, even though isFirebaseInitialized was true. This is unexpected.");
      setFirebaseConfigError(true);
      setIsLoading(false);
      return;
    }
    
    console.log("AuthContext: Firebase is initialized and Auth instance exists. Setting up onAuthStateChanged listener.");
    setIsLoading(true);
    setIsFirestoreOffline(false); // Reset offline status on new auth check

    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn("AuthContext: Auth check timed out after 15 seconds. Forcing isLoading to false.");
      if (isLoading) { // Only act if still loading
        setIsLoading(false);
        toast({ title: "Tiempo de Espera Excedido", description: "La verificación de sesión tardó demasiado. Intenta recargar.", variant: "destructive" });
      }
      loadingTimeoutRef.current = null; // Clear ref after execution
    }, 15000);

    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, async (firebaseUser) => {
      console.log("AuthContext: onAuthStateChanged event received. User UID:", firebaseUser?.uid || "No user");
      try {
        if (firebaseUser) {
          if (db) { // Ensure Firestore instance is available
            try {
              console.log("AuthContext: Fetching user document from Firestore for UID:", firebaseUser.uid);
              const userDocRef = doc(db, "users", firebaseUser.uid);
              const userDoc = await getDoc(userDocRef);

              if (userDoc.exists()) {
                const userData = userDoc.data() as Omit<User, 'id' | 'initials' | 'name'>;
                const combinedUser: User = {
                  id: firebaseUser.uid,
                  name: `${userData.firstName || firebaseUser.displayName?.split(' ')[0] || ''} ${userData.lastName || firebaseUser.displayName?.split(' ').slice(1).join(' ') || ''}`.trim() || "Usuario",
                  firstName: userData.firstName || firebaseUser.displayName?.split(' ')[0] || '',
                  lastName: userData.lastName || firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
                  initials: ((userData.firstName?.[0] || '') + (userData.lastName?.[0] || '')).toUpperCase() || "U",
                  avatarUrl: userData.avatarUrl || firebaseUser.photoURL || defaultAvatar,
                  email: firebaseUser.email || userData.email || '',
                  phone: userData.phone || firebaseUser.phoneNumber || undefined,
                  country: userData.country || undefined,
                  dob: userData.dob ? (userData.dob instanceof Timestamp ? userData.dob.toDate() : new Date(userData.dob as string) ) : undefined,
                  isPhoneVerified: userData.isPhoneVerified || !!firebaseUser.phoneNumber,
                  profileType: userData.profileType || undefined,
                  gender: userData.gender || undefined,
                  documentType: userData.documentType || undefined,
                  documentNumber: userData.documentNumber || undefined,
                  createdAt: userData.createdAt || null,
                };
                setUser(combinedUser);
                setIsLoggedIn(true);
                setIsFirestoreOffline(false); // Firestore operation succeeded
                console.log("AuthContext: User profile fetched from Firestore for UID:", firebaseUser.uid);
              } else {
                console.warn(`AuthContext: No Firestore document found for UID: ${firebaseUser.uid}. Creating basic profile from Auth data.`);
                toast({ title: "Perfil Incompleto", description: "No se encontró tu perfil completo en la base de datos. Usando información básica.", variant: "default" });
                const firstName = firebaseUser.displayName?.split(' ')[0] || firebaseUser.email?.split('@')[0] || "Usuario";
                const lastName = firebaseUser.displayName?.split(' ').slice(1).join(' ') || "";
                const initials = ((firstName[0] || "") + (lastName[0] || (firebaseUser.email?.[0] || ""))).toUpperCase() || "U";
                const basicUser: User = { id: firebaseUser.uid, name: `${firstName} ${lastName}`.trim(), firstName, lastName, initials, avatarUrl: firebaseUser.photoURL || defaultAvatar, email: firebaseUser.email || "No disponible", isPhoneVerified: !!firebaseUser.phoneNumber, phone: firebaseUser.phoneNumber || undefined };
                setUser(basicUser);
                setIsLoggedIn(true);
                setIsFirestoreOffline(false);
              }
            } catch (firestoreError: any) {
              console.error("AuthContext: Error fetching user document from Firestore for UID:", firebaseUser.uid, firestoreError); // This is line 227
              let firestoreErrorTitle = "Error al Cargar Perfil";
              let firestoreErrorMessage = "No se pudo cargar tu información de perfil. Usando datos básicos.";
              if (firestoreError.code === 'unavailable') {
                firestoreErrorTitle = "Firestore Desconectado";
                firestoreErrorMessage = "El cliente de Firestore está desconectado. No se pueden cargar/guardar datos de perfil. Usando datos básicos.";
                setIsFirestoreOffline(true); 
              } else {
                setIsFirestoreOffline(false);
              }
              toast({ title: firestoreErrorTitle, description: firestoreErrorMessage, variant: "destructive" });
              // Fallback to basic user info from Firebase Auth if Firestore fails
              const firstName = firebaseUser.displayName?.split(' ')[0] || firebaseUser.email?.split('@')[0] || "Usuario";
              const lastName = firebaseUser.displayName?.split(' ').slice(1).join(' ') || "";
              const initials = ((firstName[0] || "") + (lastName[0] || (firebaseUser.email?.[0] || ""))).toUpperCase() || "U";
              const basicUser: User = { id: firebaseUser.uid, name: `${firstName} ${lastName}`.trim(), firstName, lastName, initials, avatarUrl: firebaseUser.photoURL || defaultAvatar, email: firebaseUser.email || "No disponible", isPhoneVerified: !!firebaseUser.phoneNumber, phone: firebaseUser.phoneNumber || undefined };
              setUser(basicUser);
              setIsLoggedIn(true); // Still logged in with Firebase Auth, just Firestore profile is missing/failed
            }
          } else { // Firestore instance (db) not available
            console.error("AuthContext: Firestore service (db) is not available from lib/firebase. Cannot fetch user profile.");
            toast({ title: "Error Crítico de Configuración", description: "El servicio de base de datos (Firestore) no está inicializado. Usando datos básicos.", variant: "destructive" });
            setFirebaseConfigError(true);
            setIsFirestoreOffline(true);
            const firstName = firebaseUser.displayName?.split(' ')[0] || firebaseUser.email?.split('@')[0] || "Usuario";
            const lastName = firebaseUser.displayName?.split(' ').slice(1).join(' ') || "";
            const initials = ((firstName[0] || "") + (lastName[0] || (firebaseUser.email?.[0] || ""))).toUpperCase() || "U";
            const basicUser: User = { id: firebaseUser.uid, name: `${firstName} ${lastName}`.trim(), firstName, lastName, initials, avatarUrl: firebaseUser.photoURL || defaultAvatar, email: firebaseUser.email || "No disponible", isPhoneVerified: !!firebaseUser.phoneNumber, phone: firebaseUser.phoneNumber || undefined };
            setUser(basicUser);
            setIsLoggedIn(true);
          }
        } else { // No Firebase user
          console.log("AuthContext: No Firebase user found by onAuthStateChanged.");
          setUser(null);
          setIsLoggedIn(false);
          setIsFirestoreOffline(false);
        }
      } catch (authProcessingError: any) {
        console.error("AuthContext: Error processing Firebase user state in onAuthStateChanged:", authProcessingError.message, authProcessingError.stack);
        toast({ title: "Error de Autenticación", description: "Ocurrió un problema al verificar tu sesión.", variant: "destructive" });
        setUser(null);
        setIsLoggedIn(false);
        setIsFirestoreOffline(false);
      } finally {
        console.log("AuthContext: onAuthStateChanged processing finished. Setting isLoading to false.");
        setIsLoading(false);
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      }
    });

    console.log("AuthContext: onAuthStateChanged listener attached.");
    return () => {
      console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      unsubscribe();
    };
  }, [hasMounted, toast]);

  const resetPhoneVerification = useCallback(() => {
      setConfirmationResult(null); setPhoneVerificationError(null); setIsVerificationSent(false); setIsVerifyingCode(false);
  }, []);

  const login = useCallback(async (credentials: LoginValues): Promise<FirebaseUser | null> => {
    setLoginError(null); setIsLoading(true); setIsFirestoreOffline(false);
    if (!firebaseAuthInstance) {
      setLoginError("Firebase no disponible."); toast({ title: "Error de Autenticación", description: "El servicio de autenticación no está disponible.", variant: "destructive" }); setIsLoading(false);
      throw new Error("Firebase no disponible.");
    }
    try {
        const userCredential = await signInWithEmailAndPassword(firebaseAuthInstance, credentials.email, credentials.password);
        console.log("AuthContext Login: Successful Firebase sign-in for", userCredential.user.email);
        // onAuthStateChanged will handle fetching profile and setting isLoading to false
        return userCredential.user;
    } catch (error: any) {
        console.error("Error during login:", error);
        let errorMessage = "No se pudo ingresar. Verifica tus credenciales."; let errorTitle = "Error de Ingreso";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') { errorMessage = "Correo electrónico o contraseña incorrectos."; }
        else if (error.code === 'auth/invalid-email') { errorMessage = "El formato del correo electrónico no es válido."; }
        else if (error.code === 'auth/network-request-failed') { errorTitle = "Error de Red"; errorMessage = "Error de red. Verifica tu conexión e inténtalo de nuevo."; }
        setLoginError(errorMessage); toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
        setIsLoading(false);
        throw error;
    }
  }, [toast]);

   const signup = useCallback(async (details: SignupValues): Promise<FirebaseUser | null> => {
    setIsLoading(true); setLoginError(null); setIsFirestoreOffline(false);
    if (!firebaseAuthInstance || !db) {
      const serviceMissing = !firebaseAuthInstance ? "Autenticación" : "Base de datos";
      setLoginError(`${serviceMissing} no disponible.`); toast({ title: `Error de ${serviceMissing}`, description: "Servicio no disponible.", variant: "destructive" }); setIsLoading(false);
      throw new Error(`${serviceMissing} no disponible.`);
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, details.email, details.password);
      const firebaseUser = userCredential.user;
      await updateFirebaseProfile(firebaseUser, { displayName: `${details.firstName} ${details.lastName}` });
      
      const newUserForFirestore = {
        uid: firebaseUser.uid, firstName: details.firstName, lastName: details.lastName, email: details.email, phone: details.phone || "", country: details.country || "",
        dob: details.dob ? Timestamp.fromDate(details.dob) : null, isPhoneVerified: false, profileType: details.profileType || "", gender: details.gender || "",
        documentType: details.documentType || "", documentNumber: details.documentNumber || "", createdAt: serverTimestamp(),
        avatarUrl: defaultAvatar
      };
      await setDoc(doc(db, "users", firebaseUser.uid), newUserForFirestore);
      // onAuthStateChanged will handle fetching this new profile and setting isLoading to false
      return firebaseUser;
    } catch (error: any) {
      console.error("Error during signup:", error);
      let errorMessage = "No se pudo crear la cuenta. Inténtalo de nuevo."; let errorTitle = "Error al Crear Cuenta";
      if (error.code === 'auth/email-already-in-use') { errorMessage = "Este correo electrónico ya está registrado."; }
      else if (error.code === 'auth/weak-password') { errorMessage = "La contraseña es demasiado débil."; }
      else if (error.code === 'auth/invalid-email') { errorMessage = "El correo electrónico no es válido."; }
      else if (error.code === 'auth/network-request-failed') { errorTitle = "Error de Red"; errorMessage = "Error de red. Verifica tu conexión e inténtalo de nuevo.";}
      setLoginError(errorMessage); toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
      setIsLoading(false);
      throw error;
    }
  }, [toast]);

  const logout = useCallback(async () => {
    if (!firebaseAuthInstance) { setUser(null); setIsLoggedIn(false); setIsLoading(false); setIsFirestoreOffline(false); return; }
    setIsLoading(true);
    try {
        await firebaseAuthInstance.signOut();
        toast({ title: "Sesión cerrada" });
        // onAuthStateChanged will set user to null, isLoggedIn to false, and isLoading to false.
    } catch (error) {
        console.error("Error signing out:", error); toast({ title: "Error", description: "No se pudo cerrar la sesión.", variant: "destructive"});
        setIsLoading(false);
    }
  }, [toast]);

  const handleLogout = useCallback(() => { logout(); }, [logout]);

  const updateUser = useCallback(async (data: UpdateProfileData) => {
      setIsLoading(true); setIsFirestoreOffline(false);
      if (!user || !firebaseAuthInstance?.currentUser || !db) {
            const missingService = !firebaseAuthInstance?.currentUser ? "Usuario no autenticado" : "Base de datos no disponible";
            toast({ title: "Error", description: `No se pudo actualizar el perfil. ${missingService}.`, variant: "destructive", }); setIsLoading(false); return;
      }
      
      let newAvatarUrl = user.avatarUrl;
      if (data.avatarFile) {
          // For now, using a local object URL for preview.
          // In a real app, you'd upload to Firebase Storage here and get the downloadURL.
          newAvatarUrl = URL.createObjectURL(data.avatarFile); 
          console.warn("AuthContext updateUser: Avatar upload to Firebase Storage not yet implemented. Using local preview URL.");
          // TODO: Implement actual upload to Firebase Storage and get downloadURL
      }

      const updatedFirstName = data.firstName !== undefined ? data.firstName : user.firstName;
      const updatedLastName = data.lastName !== undefined ? data.lastName : user.lastName;

      const firestoreUpdatePayload: Partial<User> = {};
      if (data.firstName !== undefined) firestoreUpdatePayload.firstName = data.firstName;
      if (data.lastName !== undefined) firestoreUpdatePayload.lastName = data.lastName;
      firestoreUpdatePayload.name = `${updatedFirstName} ${updatedLastName}`.trim();
      firestoreUpdatePayload.initials = `${updatedFirstName?.[0] ?? ''}${updatedLastName?.[0] ?? ''}`.toUpperCase();
      if (data.phone !== undefined) firestoreUpdatePayload.phone = data.phone === "" ? "" : data.phone; // Allow clearing phone
      if (data.country !== undefined) firestoreUpdatePayload.country = data.country;
      if (data.dob !== undefined) firestoreUpdatePayload.dob = data.dob ? Timestamp.fromDate(data.dob) : null; // Handle null for clearing DOB
      if (newAvatarUrl !== user.avatarUrl) firestoreUpdatePayload.avatarUrl = newAvatarUrl; // Only update if changed
      
      // Phone verification status update logic
      if (data.phone === firebaseAuthInstance.currentUser.phoneNumber && firebaseAuthInstance.currentUser.phoneNumber) {
        // If the new phone number matches the one verified in Firebase Auth
        firestoreUpdatePayload.isPhoneVerified = true;
      } else if (data.phone !== user.phone) { 
        // If the phone number changed and doesn't match the verified one in Firebase Auth (or if it's cleared)
        firestoreUpdatePayload.isPhoneVerified = false;
      }
      // If data.phone is undefined, isPhoneVerified status remains unchanged unless explicitly handled

      try {
          if (Object.keys(firestoreUpdatePayload).length > 0) {
            await updateDoc(doc(db, "users", firebaseAuthInstance.currentUser.uid), firestoreUpdatePayload);
          }
          // Update Firebase Auth profile (displayName, photoURL) if they changed
          if ((data.firstName || data.lastName) || (newAvatarUrl !== user.avatarUrl && data.avatarFile) ) { // avatarFile check ensures it's a new file
              await updateFirebaseProfile(firebaseAuthInstance.currentUser, {
                  displayName: `${updatedFirstName} ${updatedLastName}`.trim(),
                  ...(data.avatarFile && { photoURL: newAvatarUrl }), // This should ideally be the Firebase Storage URL
              });
          }
          // Update local state after successful updates
          const newDob = data.dob === undefined ? user.dob : (data.dob ? (data.dob instanceof Date ? data.dob : Timestamp.fromDate(data.dob).toDate()) : null);
          setUser(prev => prev ? { ...prev, ...firestoreUpdatePayload, dob: newDob } as User : null);
          toast({ title: "Perfil Actualizado", description: "Tus datos han sido guardados." });
          setIsFirestoreOffline(false); // Firestore operation succeeded
      } catch (error:any) {
          console.error("Error updating Firestore/Firebase Profile:", error);
          if (error.code === 'unavailable') {
            setIsFirestoreOffline(true);
            toast({ title: "Firestore Desconectado", description:"El cliente de Firestore está desconectado. No se pudieron guardar los cambios. Usando datos básicos.", variant: "destructive" });
          } else {
            setIsFirestoreOffline(false);
            toast({ title: "Error de Actualización", description:"No se pudieron guardar todos los cambios.", variant: "destructive" });
          }
      } finally {
          setIsLoading(false);
      }
  }, [user, toast]);

   const sendVerificationCode = useCallback(async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => {
       setPhoneVerificationError(null); setIsLoading(true);
       if (!firebaseAuthInstance) {
           setPhoneVerificationError("Firebase no disponible."); toast({ title: "Error de Autenticación", description: "Servicio no disponible.", variant: "destructive" }); setIsLoading(false); return;
       }
       try {
           console.log("AuthContext: Attempting to send verification code to:", phoneNumber);
           const result = await signInWithPhoneNumber(firebaseAuthInstance, phoneNumber, recaptchaVerifier);
           setConfirmationResult(result); setIsVerificationSent(true);
           toast({ title: "Código Enviado", description: `Se envió un código de verificación a ${phoneNumber}.` });
       } catch (error: any) {
           console.error("AuthContext: Error sending verification code:", error.code, error.message);
           let errorMessage = "No se pudo enviar el código de verificación. Inténtalo de nuevo."; let errorTitle = "Error al Enviar Código";
           if (error.code === 'auth/invalid-phone-number') { errorMessage = "El número de teléfono proporcionado no es válido."; }
           else if (error.code === 'auth/too-many-requests') { errorMessage = "Demasiadas solicitudes. Inténtalo más tarde."; }
           else if (error.code === 'auth/network-request-failed') { errorTitle = "Error de Red"; errorMessage = "Verifica tu conexión. ReCAPTCHA también pudo fallar.";}
           else if (error.code === 'auth/internal-error') {errorTitle = "Error Interno de Auth"; errorMessage = "Error interno al verificar el teléfono. Asegúrate que la verificación telefónica esté habilitada en Firebase y que el reCAPTCHA se cargó correctamente.";}
           setPhoneVerificationError(errorMessage); toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
           recaptchaVerifier.clear(); // Attempt to clear the verifier for a fresh start on next attempt
       } finally {
          setIsLoading(false);
       }
   }, [toast]);

   const verifyCode = useCallback(async (code: string) => {
       if (!confirmationResult) {
           setPhoneVerificationError("Error: Intenta enviar el código de nuevo."); toast({ title: "Error", description: "Intenta enviar el código de verificación de nuevo.", variant: "destructive" }); setIsLoading(false); return;
       }
       setPhoneVerificationError(null); setIsVerifyingCode(true); setIsLoading(true);
       try {
           const credential = await confirmationResult.confirm(code);
           const verifiedFirebaseUser = credential.user as FirebaseUser; 
           
           if (user && firebaseAuthInstance?.currentUser && db) {
                // Link phone number to existing Firebase Auth user (if different) or update custom claims (advanced)
                // For simplicity here, we assume the goal is to verify the phone for the current user's profile.
                await updateFirebaseProfile(firebaseAuthInstance.currentUser, { phoneNumber: verifiedFirebaseUser.phoneNumber });
                await updateDoc(doc(db, "users", user.id), { phone: verifiedFirebaseUser.phoneNumber, isPhoneVerified: true });
                setUser(prev => prev ? {...prev, phone: verifiedFirebaseUser.phoneNumber || prev.phone, isPhoneVerified: true} : null);
           }
           setConfirmationResult(null); setIsVerificationSent(false);
           toast({ title: "Teléfono Verificado", description: "Tu número de teléfono ha sido verificado correctamente." });
       } catch (error: any) {
           console.error("Error verifying code:", error);
           let errorMessage = "El código ingresado es incorrecto o ha expirado."; let errorTitle = "Error de Verificación";
           // Add more specific error handling if needed
           setPhoneVerificationError(errorMessage); toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
       } finally {
           setIsVerifyingCode(false); setIsLoading(false);
       }
   }, [confirmationResult, toast, user]); // Added user to dependency array

  const handleForgotPasswordSubmit = useCallback(async (data: ForgotPasswordValues, resetForm: UseFormReset<ForgotPasswordValues>) => {
    setIsLoading(true);
    if (!firebaseAuthInstance) {
        toast({ title: "Error de Firebase", description: "El servicio de autenticación no está disponible.", variant: "destructive" }); setIsLoading(false); return;
    }
    try {
      await sendPasswordResetEmail(firebaseAuthInstance, data.email);
      toast({ title: "Correo Enviado", description: "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña." });
      resetForm();
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      let errorMessage = "No se pudo enviar el correo de recuperación. Inténtalo de nuevo."; let errorTitle = "Error al Enviar Correo";
      // Add more specific error handling if needed
      toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Placeholder for actual dialog opening logic if needed, or can be removed if navigation handles this.
  const openLoginDialog = () => {
    console.log("AuthContext: openLoginDialog called. User should be navigated to /login page.");
    // If using a router, this would be: router.push('/login');
  };

  const value: AuthContextType = {
    user, isLoggedIn, isLoading, loginError, phoneVerificationError, isVerificationSent, isVerifyingCode,
    firebaseConfigError, isFirestoreOffline,
    login, signup, logout, updateUser, handleLogout, sendVerificationCode, verifyCode,
    setIsVerificationSent, resetPhoneVerification, handleForgotPasswordSubmit, openLoginDialog,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) { throw new Error('useAuth must be used within an AuthProvider'); }
  return context;
};

    