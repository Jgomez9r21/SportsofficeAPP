
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
import { auth as firebaseAuthInstance, db as firestoreInstance, app as firebaseApp, isFirebaseInitialized } from '@/lib/firebase'; // Renamed for clarity
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

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  loginError: string | null;
  phoneVerificationError: string | null;
  isVerificationSent: boolean;
  isVerifyingCode: boolean;
  firebaseConfigError: boolean; // Added for explicit config error state
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
  openLoginDialog: () => void; // Reinstated for AppLayout compatibility
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
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setHasMounted(true); }, []);

  const checkAuth = useCallback(async () => {
    console.log("AuthContext: checkAuth called. isFirebaseInitialized:", isFirebaseInitialized, "firebaseAuthInstance:", !!firebaseAuthInstance);
    if (!isFirebaseInitialized || !firebaseAuthInstance) {
      console.error("AuthContext: Firebase is NOT initialized or Auth instance is missing. Blocking auth operations.");
      setFirebaseConfigError(true);
      setIsLoading(false);
      return () => {};
    }
    setFirebaseConfigError(false); // Firebase seems initialized

    // Start loading timeout
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn("AuthContext: Auth check timed out after 15 seconds. Forcing isLoading to false...");
      setIsLoading(false);
    }, 15000);

    console.log("AuthContext: firebaseAuthInstance service is available, proceeding to set up onAuthStateChanged.");
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, async (firebaseUser) => {
      console.log("AuthContext: onAuthStateChanged event received. User UID:", firebaseUser?.uid || null);
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current); // Clear timeout if onAuthStateChanged fires

      try {
        if (firebaseUser) {
          console.log("AuthContext: Firebase user found. Attempting to set basic user data.");
          // TEMPORARILY REMOVED Firestore getDoc call. Using only Firebase Auth data.
          const basicUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || `${firebaseUser.email?.split('@')[0] || "Usuario"}`,
            firstName: firebaseUser.displayName?.split(' ')[0] || firebaseUser.email?.split('@')[0] || "Usuario",
            lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || "",
            initials: ((firebaseUser.displayName?.[0] || "") + (firebaseUser.displayName?.split(' ').slice(1).join(' ')?.[0] || (firebaseUser.email?.[0] || ""))).toUpperCase() || "U",
            avatarUrl: firebaseUser.photoURL || "https://i.ibb.co/93cr9Rjd/avatar.png",
            email: firebaseUser.email || "No disponible",
            isPhoneVerified: !!firebaseUser.phoneNumber,
            phone: firebaseUser.phoneNumber || undefined,
            // Fill with undefined for other fields as we are not fetching from Firestore
            country: undefined,
            dob: undefined,
            profileType: undefined,
            gender: undefined,
            documentType: undefined,
            documentNumber: undefined,
            createdAt: undefined,
          };
          setUser(basicUser);
          setIsLoggedIn(true);
          console.log("AuthContext: Basic user data set:", basicUser);
        } else {
          console.log("AuthContext: No Firebase user found.");
          setUser(null);
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error("AuthContext: Error processing user state in onAuthStateChanged:", error);
        setUser(null);
        setIsLoggedIn(false);
        // Optionally, trigger a toast for this specific error
        // toast({ title: "Error de Autenticación", description: "No se pudo verificar tu sesión.", variant: "destructive" });
      } finally {
        console.log("AuthContext: onAuthStateChanged processing finished. Setting isLoading to false.");
        setIsLoading(false);
      }
    });
    console.log("AuthContext: onAuthStateChanged listener attached.");
    return unsubscribe;
  }, [toast]);

  useEffect(() => {
    if (hasMounted) {
      console.log("AuthContext: Mount complete. Setting up auth state listener.");
      setIsLoading(true);
      const unsubscribePromise = checkAuth();
      return () => {
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        unsubscribePromise.then(unsub => unsub && unsub()).catch(err => console.error("AuthContext: Error unsubscribing from auth state changes:", err));
      };
    } else {
      console.log("AuthContext: Waiting for mount.");
    }
  }, [hasMounted, checkAuth]);


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
        // onAuthStateChanged will handle setting user state and isLoading
        return userCredential.user;
    } catch (error: any) {
        setIsLoading(false);
        console.error("Error during login:", error);
        let errorMessage = "No se pudo ingresar. Verifica tus credenciales."; let errorTitle = "Error de Ingreso";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') { errorMessage = "Correo electrónico o contraseña incorrectos."; }
        else if (error.code === 'auth/invalid-email') { errorMessage = "El formato del correo electrónico no es válido."; }
        else if (error.code === 'auth/network-request-failed') { errorTitle = "Error de Red"; errorMessage = "Error de red. Verifica tu conexión e inténtalo de nuevo."; }
        setLoginError(errorMessage); toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
        throw error;
    }
  }, [toast]);

   const signup = useCallback(async (details: SignupValues): Promise<FirebaseUser | null> => {
    setIsLoading(true); setLoginError(null);
    if (!firebaseAuthInstance) {
      setLoginError("Firebase no disponible."); toast({ title: "Error de Autenticación", description: "Servicio no disponible.", variant: "destructive" }); setIsLoading(false);
      throw new Error("Firebase no disponible.");
    }
    if (!firestoreInstance) {
      setLoginError("Base de datos no disponible."); toast({ title: "Error de Base de Datos", description: "No se pueden guardar los datos del perfil.", variant: "destructive" }); setIsLoading(false);
      throw new Error("Base de datos no disponible.");
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, details.email, details.password);
      const firebaseUser = userCredential.user;
      await updateFirebaseProfile(firebaseUser, { displayName: `${details.firstName} ${details.lastName}` });
      const newUserForFirestore = {
        uid: firebaseUser.uid, firstName: details.firstName, lastName: details.lastName, email: details.email, phone: details.phone || "", country: details.country || "",
        dob: details.dob ? details.dob.toISOString() : null, isPhoneVerified: false, profileType: details.profileType || "", gender: details.gender || "",
        documentType: details.documentType || "", documentNumber: details.documentNumber || "", createdAt: serverTimestamp(),
        avatarUrl: "https://i.ibb.co/93cr9Rjd/avatar.png" // Default avatar
      };
      await setDoc(doc(firestoreInstance, "users", firebaseUser.uid), newUserForFirestore);
      // onAuthStateChanged will handle setting user state and isLoading
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
    }
  }, [toast]);

  const logout = useCallback(async () => {
    if (!firebaseAuthInstance) { setUser(null); setIsLoggedIn(false); return; }
    setIsLoading(true);
    try {
        await firebaseAuthInstance.signOut();
        // onAuthStateChanged handles state update and setting isLoading to false eventually
        toast({ title: "Sesión cerrada" });
    } catch (error) {
        console.error("Error signing out:", error); toast({ title: "Error", description: "No se pudo cerrar la sesión.", variant: "destructive"});
        setIsLoading(false); // Ensure loading is false on error here
    }
  }, [toast]);

  const handleLogout = useCallback(() => { logout(); }, [logout]);

  const updateUser = useCallback(async (data: UpdateProfileData) => {
      setIsLoading(true);
      if (!user || !firebaseAuthInstance.currentUser) {
            toast({ title: "Error", description: "No se pudo actualizar el perfil. Usuario no encontrado o no autenticado.", variant: "destructive", }); setIsLoading(false); return;
      }
      if (!firestoreInstance) {
            toast({ title: "Error de Base de Datos", description: "No se pueden guardar los cambios en el servidor.", variant: "destructive" }); setIsLoading(false); return;
      }
      let newAvatarUrl = user.avatarUrl;
      // Simulate avatar upload for now - in real app, upload to Firebase Storage
      if (data.avatarFile) {
          newAvatarUrl = URL.createObjectURL(data.avatarFile);
          // TODO: Implement actual Firebase Storage upload and get URL
          // For now, we'll just update the local state and Firestore with this local URL or a placeholder
      }

      const updatedFirstName = data.firstName !== undefined ? data.firstName : user.firstName;
      const updatedLastName = data.lastName !== undefined ? data.lastName : user.lastName;

      const firestoreUpdatePayload: Partial<User> = {
          name: `${updatedFirstName} ${updatedLastName}`,
          firstName: updatedFirstName,
          lastName: updatedLastName,
          initials: `${updatedFirstName?.[0] ?? ''}${updatedLastName?.[0] ?? ''}`.toUpperCase(),
          phone: data.phone !== undefined ? (data.phone === "" ? "" : data.phone) : user.phone,
          country: data.country !== undefined ? data.country : user.country,
          dob: data.dob !== undefined ? (data.dob instanceof Date ? data.dob.toISOString() : data.dob) : user.dob,
          avatarUrl: newAvatarUrl,
          isPhoneVerified: data.phone === firebaseAuthInstance.currentUser.phoneNumber ? true : user.isPhoneVerified ?? false,
      };
      // Remove undefined fields explicitly if needed by your Firestore rules/setup
      Object.keys(firestoreUpdatePayload).forEach(key => firestoreUpdatePayload[key as keyof User] === undefined && delete firestoreUpdatePayload[key as keyof User]);


      try {
          await updateDoc(doc(firestoreInstance, "users", firebaseAuthInstance.currentUser.uid), firestoreUpdatePayload);
          // Update Firebase Auth profile if name or avatar changed
          if (data.firstName || data.lastName || newAvatarUrl !== user.avatarUrl) {
              await updateFirebaseProfile(firebaseAuthInstance.currentUser, {
                  displayName: `${updatedFirstName} ${updatedLastName}`,
                  photoURL: newAvatarUrl,
              });
          }
          // Re-fetch or optimistically update local user state
          setUser(prev => prev ? { ...prev, ...firestoreUpdatePayload } : null);
          toast({ title: "Perfil Actualizado", description: "Tus datos han sido guardados." });
      } catch (error) {
          console.error("Error updating Firestore/Firebase Profile:", error);
          toast({ title: "Error de Actualización", description:"No se pudieron guardar todos los cambios.", variant: "destructive" });
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
           const verifiedFirebaseUser = credential.user as FirebaseUser;
           if (user && firebaseAuthInstance.currentUser && firestoreInstance) {
                await updateFirebaseProfile(firebaseAuthInstance.currentUser, { phoneNumber: verifiedFirebaseUser.phoneNumber });
                await updateDoc(doc(firestoreInstance, "users", user.id), { phone: verifiedFirebaseUser.phoneNumber, isPhoneVerified: true });
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
      if (error.code === 'auth/user-not-found') { errorMessage = "No existe una cuenta con este correo electrónico."; }
      else if (error.code === 'auth/invalid-email') { errorMessage = "El formato del correo electrónico no es válido."; }
      else if (error.code === 'auth/network-request-failed') { errorTitle = "Error de Red"; errorMessage = "Error de red. Verifica tu conexión e inténtalo de nuevo."; }
      toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Dummy openLoginDialog for AppLayout compatibility
  const openLoginDialog = () => {
    // In a page-based auth flow, this would typically navigate to the login page
    // For now, it does nothing as the dialog is removed from AppLayout
    console.log("openLoginDialog called, but dialog is removed. Navigation should handle this.");
  };

  const value: AuthContextType = {
    user, isLoggedIn, isLoading, loginError, phoneVerificationError, isVerificationSent, isVerifyingCode,
    firebaseConfigError,
    login, signup, logout, updateUser, handleLogout, sendVerificationCode, verifyCode,
    setIsVerificationSent, resetPhoneVerification, handleForgotPasswordSubmit, openLoginDialog,
  };

  if (!hasMounted && typeof window !== 'undefined') { // Only return null if not mounted on client
     console.log("AuthContext: Not mounted yet, returning null to avoid hydration issues.");
     return null;
  }


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) { throw new Error('useAuth must be used within an AuthProvider'); }
  return context;
};

