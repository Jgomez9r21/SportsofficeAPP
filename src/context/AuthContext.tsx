
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { z } from "zod";
import type { UseFormReset } from 'react-hook-form';
import {
  getAuth, // Keep this for RecaptchaVerifier
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
// Import the renamed instances and isFirebaseInitialized
import { auth as firebaseAuthInstance, db, app as firebaseApp, isFirebaseInitialized } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, Timestamp } from "firebase/firestore";

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

type AuthDialogView = 'login' | 'signup' | 'forgotPassword' | 'profile';

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  loginError: string | null;
  phoneVerificationError: string | null;
  isVerificationSent: boolean;
  isVerifyingCode: boolean;
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
  showLoginDialog: boolean;
  showProfileDialog: boolean;
  currentView: AuthDialogView;
  openLoginDialog: () => void;
  openProfileDialog: () => void;
  closeDialogs: () => void;
  setCurrentView: (view: AuthDialogView) => void;
  firebaseConfigError: boolean;
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

  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [currentView, setCurrentView] = useState<AuthDialogView>('login');

  useEffect(() => {
    console.log("AuthContext: Component mounted.");
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) {
      console.log("AuthContext: Waiting for mount before checking Firebase status.");
      return;
    }
    console.log("AuthContext: Mount complete. Checking Firebase initialization status from firebase.ts...");

    if (!isFirebaseInitialized) {
        console.error("AuthContext: Firebase is NOT initialized according to firebase.ts. Auth setup aborted. Setting firebaseConfigError to true.");
        setFirebaseConfigError(true);
        setIsLoading(false);
        setUser(null);
        setIsLoggedIn(false);
        return;
    }
    setFirebaseConfigError(false); // Clear any previous config error
    console.log("AuthContext: Firebase IS initialized according to firebase.ts. Proceeding with auth state listener setup.");


    if (!firebaseAuthInstance) {
      // This case should ideally be covered by isFirebaseInitialized being false, but as a safeguard:
      console.warn("AuthContext: Firebase Auth instance (firebaseAuthInstance from lib/firebase) not available, though isFirebaseInitialized was true. This is unexpected. User remains logged out.");
      setUser(null);
      setIsLoggedIn(false);
      setIsLoading(false);
      setFirebaseConfigError(true); // Indicate a problem
      return;
    }
    console.log("AuthContext: firebaseAuthInstance service is available, proceeding to set up onAuthStateChanged.");

    let unsubscribe: (() => void) | null = null;
    const loadingTimeout = setTimeout(() => {
        if (isLoading) {
            console.warn("AuthContext: Auth check timed out after 15 seconds. Forcing isLoading to false. This might indicate issues with onAuthStateChanged firing or Firestore connectivity.");
            setIsLoading(false);
            if (!user) {
                setUser(null);
                setIsLoggedIn(false);
            }
        }
    }, 15000);

    try {
        unsubscribe = onAuthStateChanged(firebaseAuthInstance, async (firebaseUser) => {
          console.log(`AuthContext: onAuthStateChanged event received. User UID: ${firebaseUser?.uid || 'null'}`);
          clearTimeout(loadingTimeout);

          try {
            if (firebaseUser) {
              if (!db) {
                  console.warn("AuthContext: Firestore (db from lib/firebase) not available, cannot fetch full user profile for:", firebaseUser.uid);
                  const basicUser: User = {
                      id: firebaseUser.uid, name: firebaseUser.displayName || "Usuario", firstName: firebaseUser.displayName?.split(' ')[0] || "Usuario",
                      lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || "", initials: ((firebaseUser.displayName?.[0] || "") + (firebaseUser.displayName?.split(' ').slice(1).join(' ')?.[0] || "")).toUpperCase() || "U",
                      avatarUrl: firebaseUser.photoURL || "https://i.ibb.co/93cr9Rjd/avatar.png", email: firebaseUser.email || "No disponible", isPhoneVerified: !!firebaseUser.phoneNumber, phone: firebaseUser.phoneNumber || undefined,
                  };
                  setUser(basicUser); setIsLoggedIn(true);
                  return; // Early return for basic user
              }
              console.log("AuthContext: Firebase user found. Fetching profile from Firestore for UID:", firebaseUser.uid);
              const userDocRef = doc(db, "users", firebaseUser.uid);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const dbData = userDocSnap.data();
                const dobFromDb = dbData.dob;
                let dobValue: Date | string | null = null;
                if (dobFromDb) {
                  if (dobFromDb instanceof Timestamp) { dobValue = dobFromDb.toDate(); }
                  else if (typeof dobFromDb === 'string') { dobValue = new Date(dobFromDb); }
                  else if (dobFromDb.seconds && typeof dobFromDb.seconds === 'number') { dobValue = new Timestamp(dobFromDb.seconds, dobFromDb.nanoseconds || 0).toDate(); }
                }
                const appUser: User = {
                  id: firebaseUser.uid, name: dbData.name || `${dbData.firstName} ${dbData.lastName}` || firebaseUser.displayName || "Usuario",
                  firstName: dbData.firstName || firebaseUser.displayName?.split(' ')[0] || "Usuario", lastName: dbData.lastName || firebaseUser.displayName?.split(' ').slice(1).join(' ') || "",
                  initials: ((dbData.firstName?.[0] || "") + (dbData.lastName?.[0] || "")).toUpperCase() || "U", avatarUrl: dbData.avatarUrl || firebaseUser.photoURL || "https://i.ibb.co/93cr9Rjd/avatar.png",
                  email: firebaseUser.email || dbData.email || "No disponible", phone: dbData.phone || firebaseUser.phoneNumber || undefined, country: dbData.country || undefined,
                  dob: dobValue,
                  isPhoneVerified: dbData.isPhoneVerified !== undefined ? dbData.isPhoneVerified : !!firebaseUser.phoneNumber,
                  profileType: dbData.profileType || undefined, gender: dbData.gender || undefined, documentType: dbData.documentType || undefined, documentNumber: dbData.documentNumber || undefined,
                  createdAt: dbData.createdAt instanceof Timestamp ? dbData.createdAt : null,
                };
                setUser(appUser); setIsLoggedIn(true);
                console.log("AuthContext: User profile loaded from Firestore:", appUser);
              } else {
                 console.warn(`AuthContext: User ${firebaseUser.uid} in Auth but not Firestore. Using basic profile.`);
                 toast({
                    title: "Perfil Incompleto",
                    description: "No se encontró tu perfil completo en la base de datos. Usando información básica.",
                    variant: "default",
                  });
                 const basicUser: User = {
                    id: firebaseUser.uid, name: firebaseUser.displayName || "Usuario", firstName: firebaseUser.displayName?.split(' ')[0] || "Usuario",
                    lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || "", initials: ((firebaseUser.displayName?.[0] || "") + (firebaseUser.displayName?.split(' ').slice(1).join(' ')?.[0] || "")).toUpperCase() || "U",
                    avatarUrl: firebaseUser.photoURL || "https://i.ibb.co/93cr9Rjd/avatar.png", email: firebaseUser.email || "No disponible", isPhoneVerified: !!firebaseUser.phoneNumber, phone: firebaseUser.phoneNumber || undefined,
                 };
                 setUser(basicUser); setIsLoggedIn(true);
              }
            } else {
              console.log("AuthContext: No Firebase user found. Setting user to null.");
              setUser(null); setIsLoggedIn(false);
            }
          } catch (error) {
            console.error("AuthContext: Error processing user data or fetching from Firestore:", error);
            toast({
              title: "Error al Cargar Perfil",
              description: "No se pudo cargar tu información de perfil desde la base de datos. Intenta recargar.",
              variant: "destructive",
            });
            setUser(null); setIsLoggedIn(false);
          } finally {
            setIsLoading(false);
            console.log("AuthContext: isLoading set to false in onAuthStateChanged finally block.");
          }
        });
        console.log("AuthContext: onAuthStateChanged listener attached.");
    } catch (error) {
        console.error("AuthContext: Error setting up onAuthStateChanged listener:", error);
        clearTimeout(loadingTimeout);
        setIsLoading(false);
        setUser(null);
        setIsLoggedIn(false);
    }

    return () => {
      clearTimeout(loadingTimeout);
      if (unsubscribe) {
        console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
        unsubscribe();
      }
    };
  }, [hasMounted, toast]); // Dependency on isFirebaseInitialized removed as it's checked at the start of the effect.

  const resetPhoneVerification = useCallback(() => {
      setConfirmationResult(null); setPhoneVerificationError(null); setIsVerificationSent(false); setIsVerifyingCode(false);
  }, []);

  const login = useCallback(async (credentials: LoginValues): Promise<FirebaseUser | null> => {
    setLoginError(null); setIsLoading(true);
    if (!firebaseAuthInstance) {
      setLoginError("Firebase no disponible."); toast({ title: "Error de Autenticación", description: "El servicio de autenticación no está disponible.", variant: "destructive" }); setIsLoading(false);
      throw new Error("Firebase no disponible.");
    }
    try {
        const userCredential = await signInWithEmailAndPassword(firebaseAuthInstance, credentials.email, credentials.password);
        return userCredential.user;
    } catch (error: any) {
        console.error("Error during login:", error);
        let errorMessage = "No se pudo ingresar. Verifica tus credenciales."; let errorTitle = "Error de Ingreso";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') { errorMessage = "Correo electrónico o contraseña incorrectos."; }
        else if (error.code === 'auth/invalid-email') { errorMessage = "El formato del correo electrónico no es válido."; }
        else if (error.code === 'auth/network-request-failed') { errorTitle = "Error de Red"; errorMessage = "Error de red. Verifica tu conexión e inténtalo de nuevo."; }
        setLoginError(errorMessage); toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
        throw error;
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

   const signup = useCallback(async (details: SignupValues): Promise<FirebaseUser | null> => {
    setIsLoading(true); setLoginError(null);
    if (!firebaseAuthInstance) {
      setLoginError("Firebase no disponible."); toast({ title: "Error de Autenticación", description: "Servicio no disponible.", variant: "destructive" }); setIsLoading(false);
      throw new Error("Firebase no disponible.");
    }
    if (!db) {
      setLoginError("Base de datos no disponible."); toast({ title: "Error de Base de Datos", description: "No se pueden guardar los datos del perfil.", variant: "destructive" }); setIsLoading(false);
      throw new Error("Base de datos no disponible.");
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, details.email, details.password);
      const firebaseUser = userCredential.user;
      await updateFirebaseProfile(firebaseUser, { displayName: `${details.firstName} ${details.lastName}` });
      const newUserForFirestore = {
        uid: firebaseUser.uid, firstName: details.firstName, lastName: details.lastName, name: `${details.firstName} ${details.lastName}`, email: details.email, phone: details.phone || "", country: details.country || "",
        dob: details.dob ? details.dob.toISOString() : null, isPhoneVerified: false, profileType: details.profileType || "", gender: details.gender || "",
        documentType: details.documentType || "", documentNumber: details.documentNumber || "", createdAt: serverTimestamp(),
        avatarUrl: "https://i.ibb.co/93cr9Rjd/avatar.png",
        initials: ((details.firstName?.[0] || "") + (details.lastName?.[0] || "")).toUpperCase() || "U",
      };
      await setDoc(doc(db, "users", firebaseUser.uid), newUserForFirestore);
      return firebaseUser;
    } catch (error: any) {
      setIsLoading(false);
      console.error("Error during signup:", error);
      let errorMessage = "No se pudo crear la cuenta. Inténtalo de nuevo."; let errorTitle = "Error al Crear Cuenta";
      if (error.code === 'auth/email-already-in-use') { errorMessage = "Este correo electrónico ya está registrado."; }
      else if (error.code === 'auth/weak-password') { errorMessage = "La contraseña es demasiado débil."; }
      else if (error.code === 'auth/invalid-email') { errorMessage = "El correo electrónico no es válido."; }
      else if (error.code === 'auth/network-request-failed') { errorTitle = "Error de Red"; errorMessage = "Error de red. Verifica tu conexión e inténtalo de nuevo.";}
      setLoginError(errorMessage); toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
      throw error;
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  const logout = useCallback(async () => {
    if (!firebaseAuthInstance) { setUser(null); setIsLoggedIn(false); return; }
    setIsLoading(true);
    try {
        await firebaseAuthInstance.signOut();
        toast({ title: "Sesión cerrada" });
    } catch (error) {
        console.error("Error signing out:", error); toast({ title: "Error", description: "No se pudo cerrar la sesión.", variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleLogout = useCallback(() => { logout(); }, [logout]);

  const updateUser = useCallback(async (data: UpdateProfileData) => {
      setIsLoading(true);
      if (!user || !firebaseAuthInstance?.currentUser) {
            toast({ title: "Error", description: "No se pudo actualizar el perfil. Usuario no encontrado o no autenticado.", variant: "destructive", }); setIsLoading(false); return;
      }
      if (!db && user.id !== 'usr123') {
            toast({ title: "Error de Base de Datos", description: "No se pueden guardar los cambios en el servidor.", variant: "destructive" }); setIsLoading(false); return;
      }
      let newAvatarUrl = user.avatarUrl;
      if (data.avatarFile) {
          try {
              // Simulating URL. In a real app, you'd upload to Firebase Storage and get a downloadURL.
              newAvatarUrl = URL.createObjectURL(data.avatarFile);
          } catch (error) { console.error("Error processing avatar:", error); newAvatarUrl = user.avatarUrl; }
      }
      const updatedFirstName = data.firstName !== undefined ? data.firstName : user.firstName;
      const updatedLastName = data.lastName !== undefined ? data.lastName : user.lastName;
      const firestoreUpdateData: Partial<Omit<User, 'id' | 'email' | 'createdAt'>> = {
          name: `${updatedFirstName} ${updatedLastName}`, firstName: updatedFirstName, lastName: updatedLastName,
          initials: `${updatedFirstName?.[0] ?? ''}${updatedLastName?.[0] ?? ''}`.toUpperCase(),
          phone: data.phone !== undefined ? (data.phone === "" ? "" : data.phone) : user.phone,
          country: data.country !== undefined ? data.country : user.country,
          dob: data.dob !== undefined ? (data.dob instanceof Date ? data.dob.toISOString() : data.dob) : user.dob,
          avatarUrl: newAvatarUrl,
          // Logic for isPhoneVerified should be tied to actual Firebase phone verification status
          isPhoneVerified: data.phone === firebaseAuthInstance.currentUser.phoneNumber ? true : user.isPhoneVerified ?? false,
      };
      // Update Firestore if db and currentUser exist
      if (db && firebaseAuthInstance.currentUser) {
        try {
            await updateDoc(doc(db, "users", firebaseAuthInstance.currentUser.uid), firestoreUpdateData);
             // Re-fetch or merge to update local user state correctly
             const updatedUserDoc = await getDoc(doc(db, "users", firebaseAuthInstance.currentUser.uid));
             if (updatedUserDoc.exists()) {
                const dbData = updatedUserDoc.data();
                 const dobFromDb = dbData.dob;
                 let dobValue: Date | string | null = null;
                 if (dobFromDb) {
                    if (dobFromDb instanceof Timestamp) { dobValue = dobFromDb.toDate(); }
                    else if (typeof dobFromDb === 'string') { dobValue = new Date(dobFromDb); }
                 }
                setUser(prev => ({
                    ...prev!, ...dbData,
                    name: dbData.name || `${dbData.firstName} ${dbData.lastName}`,
                    initials: `${dbData.firstName?.[0] ?? ''}${dbData.lastName?.[0] ?? ''}`.toUpperCase(),
                    avatarUrl: dbData.avatarUrl || newAvatarUrl, // Prioritize dbData.avatarUrl
                    dob: dobValue,
                 }));
             }
        } catch (error) { console.error("Error updating Firestore:", error); toast({ title: "Error de Base de Datos", description:"No se pudieron guardar algunos cambios.", variant: "destructive" }); }
      }
      toast({ title: "Perfil Actualizado", description: "Tus datos han sido guardados." });
      setIsLoading(false);
  }, [user, toast]); // Removed isFirebaseInitialized from deps as it's handled at the top

   const sendVerificationCode = useCallback(async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => {
       setPhoneVerificationError(null); setIsLoading(true);
       if (!firebaseAuthInstance) { // Check the service instance
           setPhoneVerificationError("Firebase no disponible."); toast({ title: "Error de Autenticación", description: "Servicio no disponible.", variant: "destructive" }); setIsLoading(false); return;
       }
       try {
           const result = await signInWithPhoneNumber(firebaseAuthInstance, phoneNumber, recaptchaVerifier);
           setConfirmationResult(result); setIsVerificationSent(true);
           toast({ title: "Código Enviado", description: `Se envió un código de verificación a ${phoneNumber}.` });
       } catch (error: any) {
           console.error("Error sending verification code:", error);
           let errorMessage = "No se pudo enviar el código de verificación. Inténtalo de nuevo."; let errorTitle = "Error al Enviar Código";
           if (error.code === 'auth/invalid-phone-number') { errorMessage = "El número de teléfono proporcionado no es válido."; }
           else if (error.code === 'auth/too-many-requests') { errorMessage = "Demasiadas solicitudes. Inténtalo más tarde."; }
           else if (error.code === 'auth/missing-phone-number') { errorMessage = "Ingresa un número de teléfono."; }
           else if (error.code === 'auth/captcha-check-failed' || error.code === 'auth/missing-recaptcha-token') { errorMessage = "Falló la verificación reCAPTCHA. Por favor, recarga la página e inténtalo de nuevo."; }
           else if (error.code === 'auth/network-request-failed') { errorTitle = "Error de Red"; errorMessage = "Error de red. Verifica tu conexión e inténtalo de nuevo.";}
           else if (error.code === 'auth/internal-error') { errorTitle = "Error Interno Firebase"; errorMessage = "Verifica la configuración de Firebase (proveedor de teléfono habilitado, APIs, etc.)."; }
           setPhoneVerificationError(errorMessage); toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
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
           const verifiedFirebaseUser = credential.user as FirebaseUser; // User from phone credential
           // Update the main Firebase user profile and Firestore
           if (user && firebaseAuthInstance?.currentUser && db) { // Check firebaseAuthInstance.currentUser
                // Link phone credential to the current user if different or update phone number
                await updateFirebaseProfile(firebaseAuthInstance.currentUser, { phoneNumber: verifiedFirebaseUser.phoneNumber });
                // Update Firestore
                await updateDoc(doc(db, "users", user.id), { phone: verifiedFirebaseUser.phoneNumber, isPhoneVerified: true });
                // Update local state
                setUser(prev => prev ? {...prev, phone: verifiedFirebaseUser.phoneNumber || prev.phone, isPhoneVerified: true} : null);
           }
           setConfirmationResult(null); setIsVerificationSent(false);
           toast({ title: "Teléfono Verificado", description: "Tu número de teléfono ha sido verificado correctamente." });
       } catch (error: any) {
           console.error("Error verifying code:", error);
           let errorMessage = "El código ingresado es incorrecto o ha expirado."; let errorTitle = "Error de Verificación";
            if (error.code === 'auth/invalid-verification-code') { errorMessage = "El código de verificación no es válido."; }
           else if (error.code === 'auth/code-expired') { errorMessage = "El código de verificación ha expirado. Solicita uno nuevo."; }
           else if (error.code === 'auth/credential-already-in-use') { errorMessage = "Este número de teléfono ya está asociado a otra cuenta."; }
           else if (error.code === 'auth/network-request-failed') { errorTitle = "Error de Red"; errorMessage = "Error de red. Verifica tu conexión e inténtalo de nuevo."; }
           setPhoneVerificationError(errorMessage); toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
       } finally {
           setIsVerifyingCode(false); setIsLoading(false);
       }
   }, [confirmationResult, toast, user]);

  const handleForgotPasswordSubmit = useCallback(async (data: ForgotPasswordValues, resetForm: UseFormReset<ForgotPasswordValues>) => {
    setIsLoading(true);
    if (!firebaseAuthInstance) { // Check the service instance
        toast({ title: "Error de Firebase", description: "El servicio de autenticación no está disponible.", variant: "destructive" }); setIsLoading(false); return;
    }
    try {
      await sendPasswordResetEmail(firebaseAuthInstance, data.email);
      toast({ title: "Correo Enviado", description: "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña." });
      resetForm();
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      let errorMessage = "No se pudo enviar el correo de recuperación. Inténtalo de nuevo."; let errorTitle = "Error al Enviar Correo";
      if (error.code === 'auth/user-not-found') { errorMessage = "No existe una cuenta con este correo electrónico."; }
      else if (error.code === 'auth/invalid-email') { errorMessage = "El formato del correo electrónico no es válido."; }
      else if (error.code === 'auth/network-request-failed') { errorTitle = "Error de Red"; errorMessage = "Error de red. Verifica tu conexión e inténtalo de nuevo."; }
      toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const openLoginDialog = () => { setCurrentView('login'); setShowLoginDialog(true); setShowProfileDialog(false); };
  const openProfileDialog = () => { setCurrentView('profile'); setShowProfileDialog(true); setShowLoginDialog(false); };
  const closeDialogs = () => { setShowLoginDialog(false); setShowProfileDialog(false); };

  const value: AuthContextType = {
    user, isLoggedIn, isLoading, loginError, phoneVerificationError, isVerificationSent, isVerifyingCode,
    login, signup, logout, updateUser, handleLogout, sendVerificationCode, verifyCode,
    setIsVerificationSent, resetPhoneVerification, handleForgotPasswordSubmit,
    showLoginDialog, showProfileDialog, currentView, openLoginDialog, openProfileDialog, closeDialogs, setCurrentView,
    firebaseConfigError
  };

  if (!hasMounted) return null; // Or a minimal loader

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) { throw new Error('useAuth must be used within an AuthProvider'); }
  return context;
};

// Helper function to get RecaptchaVerifier (useful if needed outside AuthContext)
// Ensure firebaseApp is initialized before calling this
export const getRecaptchaVerifier = (containerId: string): RecaptchaVerifier | null => {
  if (!firebaseApp) {
    console.error("Firebase app not initialized. Cannot create RecaptchaVerifier.");
    return null;
  }
  const authService = getAuth(firebaseApp); // Use getAuth from firebase/auth
  try {
    return new RecaptchaVerifier(authService, containerId, {
      'size': 'invisible',
      'callback': (response: any) => { console.log("reCAPTCHA solved:", response); },
      'expired-callback': () => { console.log("reCAPTCHA expired."); }
    });
  } catch (error) {
    console.error("Error creating RecaptchaVerifier:", error);
    return null;
  }
};
