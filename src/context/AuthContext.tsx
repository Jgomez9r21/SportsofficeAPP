
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
import { auth as firebaseAuthInstance, db as firestoreService, app as firebaseApp, isFirebaseInitialized } from '@/lib/firebase';
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
  firebaseConfigError: boolean;
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
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log("AuthContext: Component has mounted.");
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) {
      console.log("AuthContext: Waiting for mount before checking auth.");
      return;
    }

    console.log("AuthContext: Mount complete. Starting auth check process.");
    setIsLoading(true); // Ensure loading is true at the start of the check
    setFirebaseConfigError(false); // Reset config error at the start of a check

    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn("AuthContext: Auth check timed out after 15 seconds. Forcing isLoading to false.");
      if (isLoading) {
        setIsLoading(false);
        toast({ title: "Error de Conexión", description: "La verificación de sesión tardó demasiado. Intenta recargar.", variant: "destructive" });
      }
      loadingTimeoutRef.current = null;
    }, 15000);

    if (!isFirebaseInitialized) {
      console.error("AuthContext: Firebase IS NOT INITIALIZED (from lib/firebase). Setting firebaseConfigError.");
      setFirebaseConfigError(true);
      setIsLoading(false);
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      return;
    }

    if (!firebaseAuthInstance) {
      console.error("AuthContext: firebaseAuthInstance is NOT available (from lib/firebase) even though isFirebaseInitialized was true. This is unexpected. Setting firebaseConfigError.");
      setFirebaseConfigError(true);
      setIsLoading(false);
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      return;
    }
    
    console.log("AuthContext: Firebase is initialized and Auth instance exists. Setting up onAuthStateChanged listener.");

    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (firebaseUser) => {
      console.log("AuthContext: onAuthStateChanged event received. User UID:", firebaseUser?.uid || "No user");
      try {
        if (firebaseUser) {
          console.log("AuthContext: Firebase user found (UID:", firebaseUser.uid, "). Creating basic user object (NO Firestore fetch in this version).");
          
          const firstName = firebaseUser.displayName?.split(' ')[0] || firebaseUser.email?.split('@')[0] || "Usuario";
          const lastName = firebaseUser.displayName?.split(' ').slice(1).join(' ') || "";
          const initials = ((firstName[0] || "") + (lastName[0] || (firebaseUser.email?.[0] || ""))).toUpperCase() || "U";

          const basicUser: User = {
            id: firebaseUser.uid,
            name: `${firstName} ${lastName}`.trim() || "Usuario",
            firstName: firstName,
            lastName: lastName,
            initials: initials,
            avatarUrl: firebaseUser.photoURL || "https://i.ibb.co/93cr9Rjd/avatar.png", // Default avatar
            email: firebaseUser.email || "No disponible",
            isPhoneVerified: !!firebaseUser.phoneNumber,
            phone: firebaseUser.phoneNumber || undefined,
            // Other fields will be undefined as we are not fetching from Firestore
          };
          setUser(basicUser);
          setIsLoggedIn(true);
          console.log("AuthContext: Basic user data set (no Firestore). User ID:", basicUser.id);
        } else {
          console.log("AuthContext: No Firebase user found by onAuthStateChanged.");
          setUser(null);
          setIsLoggedIn(false);
        }
      } catch (authProcessingError: any) {
        console.error("AuthContext: Error processing Firebase user state in onAuthStateChanged (basic version):", authProcessingError.message, authProcessingError.stack);
        setUser(null);
        setIsLoggedIn(false);
        toast({ title: "Error de Autenticación", description: "Ocurrió un problema al verificar tu sesión (basic).", variant: "destructive" });
      } finally {
        console.log("AuthContext: onAuthStateChanged processing finished (basic version). Setting isLoading to false.");
        setIsLoading(false); // Crucial: set loading to false here
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
  }, [hasMounted, toast]); // Removed isLoading from dependency array

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
        // onAuthStateChanged will handle setting user and isLoggedIn
        console.log("AuthContext Login: Successful Firebase sign-in for", userCredential.user.email);
        return userCredential.user;
    } catch (error: any) {
        console.error("Error during login:", error);
        let errorMessage = "No se pudo ingresar. Verifica tus credenciales."; let errorTitle = "Error de Ingreso";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') { errorMessage = "Correo electrónico o contraseña incorrectos."; }
        else if (error.code === 'auth/invalid-email') { errorMessage = "El formato del correo electrónico no es válido."; }
        else if (error.code === 'auth/network-request-failed') { errorTitle = "Error de Red"; errorMessage = "Error de red. Verifica tu conexión e inténtalo de nuevo."; }
        setLoginError(errorMessage); toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
        setIsLoading(false); // Ensure loading is false on error
        throw error;
    }
  }, [toast]);

   const signup = useCallback(async (details: SignupValues): Promise<FirebaseUser | null> => {
    setIsLoading(true); setLoginError(null);
    if (!firebaseAuthInstance || !firestoreService) {
      const serviceMissing = !firebaseAuthInstance ? "Autenticación" : "Base de datos";
      setLoginError(`${serviceMissing} no disponible.`); toast({ title: `Error de ${serviceMissing}`, description: "Servicio no disponible.", variant: "destructive" }); setIsLoading(false);
      throw new Error(`${serviceMissing} no disponible.`);
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, details.email, details.password);
      const firebaseUser = userCredential.user;
      await updateFirebaseProfile(firebaseUser, { displayName: `${details.firstName} ${details.lastName}` });
      
      console.log("AuthContext Signup: Firebase user created. Now creating Firestore document.");
      const newUserForFirestore = {
        uid: firebaseUser.uid, firstName: details.firstName, lastName: details.lastName, email: details.email, phone: details.phone || "", country: details.country || "",
        dob: details.dob ? Timestamp.fromDate(details.dob) : null, isPhoneVerified: false, profileType: details.profileType || "", gender: details.gender || "",
        documentType: details.documentType || "", documentNumber: details.documentNumber || "", createdAt: serverTimestamp(),
        avatarUrl: "https://i.ibb.co/93cr9Rjd/avatar.png" // Default avatar
      };
      await setDoc(doc(firestoreService, "users", firebaseUser.uid), newUserForFirestore);
      console.log("AuthContext Signup: Firestore document created for UID:", firebaseUser.uid);
      // onAuthStateChanged will handle setting the user state based on this new user
      return firebaseUser;
    } catch (error: any) {
      console.error("Error during signup:", error);
      let errorMessage = "No se pudo crear la cuenta. Inténtalo de nuevo."; let errorTitle = "Error al Crear Cuenta";
      if (error.code === 'auth/email-already-in-use') { errorMessage = "Este correo electrónico ya está registrado."; }
      else if (error.code === 'auth/weak-password') { errorMessage = "La contraseña es demasiado débil."; }
      else if (error.code === 'auth/invalid-email') { errorMessage = "El correo electrónico no es válido."; }
      else if (error.code === 'auth/network-request-failed') { errorTitle = "Error de Red"; errorMessage = "Error de red. Verifica tu conexión e inténtalo de nuevo.";}
      setLoginError(errorMessage); toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
      setIsLoading(false); // Ensure loading is false on error
      throw error;
    }
  }, [toast]);

  const logout = useCallback(async () => {
    if (!firebaseAuthInstance) { setUser(null); setIsLoggedIn(false); setIsLoading(false); return; }
    setIsLoading(true); // Set loading true before sign out
    try {
        await firebaseAuthInstance.signOut();
        // onAuthStateChanged will set user to null, isLoggedIn to false, and isLoading to false
        toast({ title: "Sesión cerrada" });
        console.log("AuthContext Logout: Firebase sign-out successful.");
    } catch (error) {
        console.error("Error signing out:", error); toast({ title: "Error", description: "No se pudo cerrar la sesión.", variant: "destructive"});
        setIsLoading(false); // Ensure loading is false on error
    }
  }, [toast]);

  const handleLogout = useCallback(() => { logout(); }, [logout]);

  const updateUser = useCallback(async (data: UpdateProfileData) => {
      setIsLoading(true);
      if (!user || !firebaseAuthInstance?.currentUser || !firestoreService) {
            const missingService = !firebaseAuthInstance?.currentUser ? "Usuario no autenticado" : "Base de datos no disponible";
            toast({ title: "Error", description: `No se pudo actualizar el perfil. ${missingService}.`, variant: "destructive", }); setIsLoading(false); return;
      }
      
      let newAvatarUrl = user.avatarUrl;
      if (data.avatarFile) {
          // Simulating avatar upload for now as actual upload to Firebase Storage is not implemented here
          newAvatarUrl = URL.createObjectURL(data.avatarFile); 
          console.warn("AuthContext updateUser: Avatar upload to Firebase Storage not yet implemented. Using local preview URL.");
      }

      const updatedFirstName = data.firstName !== undefined ? data.firstName : user.firstName;
      const updatedLastName = data.lastName !== undefined ? data.lastName : user.lastName;

      const firestoreUpdatePayload: Partial<User> = {};
      if (data.firstName !== undefined) firestoreUpdatePayload.firstName = data.firstName;
      if (data.lastName !== undefined) firestoreUpdatePayload.lastName = data.lastName;
      firestoreUpdatePayload.name = `${updatedFirstName} ${updatedLastName}`.trim();
      firestoreUpdatePayload.initials = `${updatedFirstName?.[0] ?? ''}${updatedLastName?.[0] ?? ''}`.toUpperCase();
      if (data.phone !== undefined) firestoreUpdatePayload.phone = data.phone === "" ? "" : data.phone;
      if (data.country !== undefined) firestoreUpdatePayload.country = data.country;
      if (data.dob !== undefined) firestoreUpdatePayload.dob = data.dob ? Timestamp.fromDate(data.dob) : null;
      if (newAvatarUrl !== user.avatarUrl) firestoreUpdatePayload.avatarUrl = newAvatarUrl;
      
      if (data.phone === firebaseAuthInstance.currentUser.phoneNumber && firebaseAuthInstance.currentUser.phoneNumber) {
        firestoreUpdatePayload.isPhoneVerified = true;
      } else if (data.phone !== user.phone) { 
        firestoreUpdatePayload.isPhoneVerified = false;
      }

      try {
          if (Object.keys(firestoreUpdatePayload).length > 0) {
            console.log("AuthContext updateUser: Updating Firestore document for UID:", firebaseAuthInstance.currentUser.uid, "with payload:", firestoreUpdatePayload);
            await updateDoc(doc(firestoreService, "users", firebaseAuthInstance.currentUser.uid), firestoreUpdatePayload);
          }
          if ((data.firstName || data.lastName) || (newAvatarUrl !== user.avatarUrl && data.avatarFile) ) {
              console.log("AuthContext updateUser: Updating Firebase Auth profile.");
              await updateFirebaseProfile(firebaseAuthInstance.currentUser, {
                  displayName: `${updatedFirstName} ${updatedLastName}`.trim(),
                  ...(data.avatarFile && { photoURL: newAvatarUrl }), 
              });
          }
          // Update local user state - ensure dob is handled correctly as Date or null
          const newDob = data.dob === undefined ? user.dob : (data.dob ? (data.dob instanceof Date ? data.dob : Timestamp.fromDate(data.dob).toDate()) : null);
          setUser(prev => prev ? { ...prev, ...firestoreUpdatePayload, dob: newDob } as User : null);
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
           console.log("AuthContext sendVerificationCode: Sending SMS to", phoneNumber);
           const result = await signInWithPhoneNumber(firebaseAuthInstance, phoneNumber, recaptchaVerifier);
           setConfirmationResult(result); setIsVerificationSent(true);
           toast({ title: "Código Enviado", description: `Se envió un código de verificación a ${phoneNumber}.` });
       } catch (error: any) {
           console.error("Error sending verification code:", error);
           let errorMessage = "No se pudo enviar el código de verificación. Inténtalo de nuevo."; let errorTitle = "Error al Enviar Código";
           if (error.code === 'auth/invalid-phone-number') { errorMessage = "El número de teléfono proporcionado no es válido."; }
           else if (error.code === 'auth/too-many-requests') { errorMessage = "Demasiadas solicitudes. Inténtalo más tarde."; }
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
           console.log("AuthContext verifyCode: Verifying code", code);
           const credential = await confirmationResult.confirm(code);
           const verifiedFirebaseUser = credential.user as FirebaseUser; // Cast to FirebaseUser
           
           if (user && firebaseAuthInstance?.currentUser && firestoreService) { // Ensure firebaseAuthInstance.currentUser exists
                console.log("AuthContext verifyCode: Updating Firebase Auth profile and Firestore document for phone verification.");
                await updateFirebaseProfile(firebaseAuthInstance.currentUser, { phoneNumber: verifiedFirebaseUser.phoneNumber });
                await updateDoc(doc(firestoreService, "users", user.id), { phone: verifiedFirebaseUser.phoneNumber, isPhoneVerified: true });
                setUser(prev => prev ? {...prev, phone: verifiedFirebaseUser.phoneNumber || prev.phone, isPhoneVerified: true} : null);
           }
           setConfirmationResult(null); setIsVerificationSent(false);
           toast({ title: "Teléfono Verificado", description: "Tu número de teléfono ha sido verificado correctamente." });
       } catch (error: any) {
           console.error("Error verifying code:", error);
           let errorMessage = "El código ingresado es incorrecto o ha expirado."; let errorTitle = "Error de Verificación";
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
      console.log("AuthContext handleForgotPasswordSubmit: Sending password reset email to", data.email);
      await sendPasswordResetEmail(firebaseAuthInstance, data.email);
      toast({ title: "Correo Enviado", description: "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña." });
      resetForm();
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      let errorMessage = "No se pudo enviar el correo de recuperación. Inténtalo de nuevo."; let errorTitle = "Error al Enviar Correo";
      toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const openLoginDialog = () => {
    console.log("AuthContext: openLoginDialog called. Consider navigating to /login page instead or ensure dialog logic is present in AppLayout.");
    // This function is now a placeholder as we've moved to page-based auth.
    // If dialogs are still needed, AppLayout would manage their visibility.
  };

  const value: AuthContextType = {
    user, isLoggedIn, isLoading, loginError, phoneVerificationError, isVerificationSent, isVerifyingCode,
    firebaseConfigError,
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

