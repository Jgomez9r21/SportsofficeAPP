
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
  dob?: Date | string | null; // Keep allowing string for flexibility if data source provides it
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
  openLoginDialog: () => void; // Kept for now, can be removed if AppLayout dialogs are fully page-based.
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
      return () => { if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current); };
    }

    console.log("AuthContext: Mount complete. Starting auth check process.");
    setIsLoading(true);
    setFirebaseConfigError(!isFirebaseInitialized); // Set based on imported flag

    if (!isFirebaseInitialized) {
      console.error("AuthContext: Firebase is NOT initialized (checked via isFirebaseInitialized from lib/firebase). Aborting auth check.");
      setIsLoading(false);
      return () => { if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current); };
    }

    if (!firebaseAuthInstance) {
      console.error("AuthContext: firebaseAuthInstance is NOT available, even though isFirebaseInitialized was true. This is unexpected.");
      setFirebaseConfigError(true);
      setIsLoading(false);
      return () => { if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current); };
    }
    
    console.log("AuthContext: Firebase is initialized and Auth instance exists. Setting up onAuthStateChanged listener.");

    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn("AuthContext: Auth check timed out after 15 seconds. Forcing isLoading to false.");
      if (isLoading) setIsLoading(false); // Ensure isLoading is true before setting to false
      loadingTimeoutRef.current = null;
    }, 15000);

    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, async (firebaseUser) => {
      console.log("AuthContext: onAuthStateChanged event received. User UID:", firebaseUser?.uid || "No user");
      try {
        if (firebaseUser) {
          if (firestoreService) { // Check if Firestore service is available
            try {
              const userDocRef = doc(firestoreService, "users", firebaseUser.uid);
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                const userData = userDoc.data() as Omit<User, 'id' | 'initials' | 'name'>; // Firestore data
                const combinedUser: User = {
                  id: firebaseUser.uid,
                  name: `${userData.firstName || firebaseUser.displayName?.split(' ')[0] || ''} ${userData.lastName || firebaseUser.displayName?.split(' ').slice(1).join(' ') || ''}`.trim() || "Usuario",
                  firstName: userData.firstName || firebaseUser.displayName?.split(' ')[0] || '',
                  lastName: userData.lastName || firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
                  initials: ((userData.firstName?.[0] || '') + (userData.lastName?.[0] || '')).toUpperCase() || "U",
                  avatarUrl: userData.avatarUrl || firebaseUser.photoURL || defaultAvatar,
                  email: firebaseUser.email || userData.email || '', // Prefer Firebase Auth email
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
              }
            } catch (firestoreError: any) {
              console.error("AuthContext: Error fetching user document from Firestore for UID:", firebaseUser.uid, firestoreError);
              toast({ title: "Error al Cargar Perfil", description: "No se pudo cargar tu información de perfil. Usando datos básicos.", variant: "destructive" });
              const firstName = firebaseUser.displayName?.split(' ')[0] || firebaseUser.email?.split('@')[0] || "Usuario";
              const lastName = firebaseUser.displayName?.split(' ').slice(1).join(' ') || "";
              const initials = ((firstName[0] || "") + (lastName[0] || (firebaseUser.email?.[0] || ""))).toUpperCase() || "U";
              const basicUser: User = { id: firebaseUser.uid, name: `${firstName} ${lastName}`.trim(), firstName, lastName, initials, avatarUrl: firebaseUser.photoURL || defaultAvatar, email: firebaseUser.email || "No disponible", isPhoneVerified: !!firebaseUser.phoneNumber, phone: firebaseUser.phoneNumber || undefined };
              setUser(basicUser);
              setIsLoggedIn(true);
            }
          } else {
            console.warn("AuthContext: Firestore service not available. Using basic profile from Firebase Auth data.");
            const firstName = firebaseUser.displayName?.split(' ')[0] || firebaseUser.email?.split('@')[0] || "Usuario";
            const lastName = firebaseUser.displayName?.split(' ').slice(1).join(' ') || "";
            const initials = ((firstName[0] || "") + (lastName[0] || (firebaseUser.email?.[0] || ""))).toUpperCase() || "U";
            const basicUser: User = { id: firebaseUser.uid, name: `${firstName} ${lastName}`.trim(), firstName, lastName, initials, avatarUrl: firebaseUser.photoURL || defaultAvatar, email: firebaseUser.email || "No disponible", isPhoneVerified: !!firebaseUser.phoneNumber, phone: firebaseUser.phoneNumber || undefined };
            setUser(basicUser);
            setIsLoggedIn(true);
          }
        } else {
          console.log("AuthContext: No Firebase user found by onAuthStateChanged.");
          setUser(null);
          setIsLoggedIn(false);
        }
      } catch (authProcessingError: any) {
        console.error("AuthContext: Error processing Firebase user state in onAuthStateChanged:", authProcessingError.message, authProcessingError.stack);
        setUser(null);
        setIsLoggedIn(false);
        toast({ title: "Error de Autenticación", description: "Ocurrió un problema al verificar tu sesión.", variant: "destructive" });
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
    setLoginError(null); setIsLoading(true);
    if (!firebaseAuthInstance) {
      setLoginError("Firebase no disponible."); toast({ title: "Error de Autenticación", description: "El servicio de autenticación no está disponible.", variant: "destructive" }); setIsLoading(false);
      throw new Error("Firebase no disponible.");
    }
    try {
        const userCredential = await signInWithEmailAndPassword(firebaseAuthInstance, credentials.email, credentials.password);
        console.log("AuthContext Login: Successful Firebase sign-in for", userCredential.user.email);
        // onAuthStateChanged will handle setting user and isLoggedIn, and then isLoading will be false
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
      
      const newUserForFirestore = {
        uid: firebaseUser.uid, firstName: details.firstName, lastName: details.lastName, email: details.email, phone: details.phone || "", country: details.country || "",
        dob: details.dob ? Timestamp.fromDate(details.dob) : null, isPhoneVerified: false, profileType: details.profileType || "", gender: details.gender || "",
        documentType: details.documentType || "", documentNumber: details.documentNumber || "", createdAt: serverTimestamp(),
        avatarUrl: defaultAvatar
      };
      await setDoc(doc(firestoreService, "users", firebaseUser.uid), newUserForFirestore);
      // onAuthStateChanged will handle setting the user state
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
    if (!firebaseAuthInstance) { setUser(null); setIsLoggedIn(false); setIsLoading(false); return; }
    setIsLoading(true);
    try {
        await firebaseAuthInstance.signOut();
        toast({ title: "Sesión cerrada" });
        // onAuthStateChanged will set user to null, isLoggedIn to false, and eventually isLoading to false.
    } catch (error) {
        console.error("Error signing out:", error); toast({ title: "Error", description: "No se pudo cerrar la sesión.", variant: "destructive"});
        setIsLoading(false);
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
            await updateDoc(doc(firestoreService, "users", firebaseAuthInstance.currentUser.uid), firestoreUpdatePayload);
          }
          if ((data.firstName || data.lastName) || (newAvatarUrl !== user.avatarUrl && data.avatarFile) ) {
              await updateFirebaseProfile(firebaseAuthInstance.currentUser, {
                  displayName: `${updatedFirstName} ${updatedLastName}`.trim(),
                  ...(data.avatarFile && { photoURL: newAvatarUrl }), 
              });
          }
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
           const credential = await confirmationResult.confirm(code);
           const verifiedFirebaseUser = credential.user as FirebaseUser; 
           
           if (user && firebaseAuthInstance?.currentUser && firestoreService) {
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
      toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const openLoginDialog = () => {
    // Placeholder, as auth is now page-based.
    // Could navigate to '/login' if a direct action is needed here.
    console.log("AuthContext: openLoginDialog called. Navigating to /login is typically handled by UI components.");
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
