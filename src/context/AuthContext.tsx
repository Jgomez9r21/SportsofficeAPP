
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
import { auth as firebaseAuthInstance, db as firestoreInstance, app as firebaseApp, isFirebaseInitialized } from '@/lib/firebase';
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
  openLoginDialog: () => void; // Reinstated for AppLayout/other pages if they still use it
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start as true
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

  useEffect(() => {
    if (!hasMounted) {
      console.log("AuthContext: Waiting for mount before checking auth.");
      return;
    }

    console.log("AuthContext: Mount complete. Starting auth check process.");
    setIsLoading(true); // Ensure loading is true at the start of the check

    // Check Firebase initialization status from lib/firebase.ts
    if (!isFirebaseInitialized) {
      console.error("AuthContext: Firebase is NOT initialized (checked via isFirebaseInitialized from lib). Blocking auth operations.");
      setFirebaseConfigError(true);
      setIsLoading(false);
      return;
    }

    if (!firebaseAuthInstance) {
      console.error("AuthContext: firebaseAuthInstance (Auth service) is not available from lib/firebase. This is unexpected. Blocking auth operations.");
      setFirebaseConfigError(true); // Mark as config error if Auth service itself isn't up
      setIsLoading(false);
      return;
    }
    
    console.log("AuthContext: Firebase SDK and Auth service seem initialized. Setting up onAuthStateChanged listener.");
    setFirebaseConfigError(false); // Firebase seems okay at this point

    // Timeout for the entire auth check process
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn("AuthContext: Auth check timed out after 15 seconds. Forcing isLoading to false...");
      if (isLoading) { // Only set if it's still loading
        setIsLoading(false);
         toast({ title: "Error de Conexión", description: "No se pudo verificar la sesión a tiempo. Intenta recargar.", variant: "destructive" });
      }
      loadingTimeoutRef.current = null;
    }, 15000);

    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, async (firebaseUser) => {
      console.log("AuthContext: onAuthStateChanged event received. User UID:", firebaseUser?.uid || "No user");
      try {
        if (firebaseUser) {
          console.log("AuthContext: Firebase user found (UID:", firebaseUser.uid, "). Attempting to fetch/set user data.");
          if (!firestoreInstance) {
            console.error("AuthContext: Firestore service (dbInstance) is not available from lib/firebase. Cannot fetch full profile.");
            // Fallback to basic user from auth
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
            };
            setUser(basicUser);
            setIsLoggedIn(true);
            toast({ title: "Advertencia", description: "No se pudo conectar a la base de datos para cargar el perfil completo. Usando datos básicos.", variant: "default" });
            return; // Exit early from this specific onAuthStateChanged handler
          }

          const userDocRef = doc(firestoreInstance, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userDataFromFirestore = userDocSnap.data() as Partial<Omit<User, 'id'>>;
            const fullUser: User = {
              id: firebaseUser.uid,
              name: `${userDataFromFirestore.firstName || ''} ${userDataFromFirestore.lastName || ''}`.trim() || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "Usuario",
              firstName: userDataFromFirestore.firstName || firebaseUser.displayName?.split(' ')[0] || firebaseUser.email?.split('@')[0] || "Usuario",
              lastName: userDataFromFirestore.lastName || firebaseUser.displayName?.split(' ').slice(1).join(' ') || "",
              initials: ((userDataFromFirestore.firstName?.[0] || firebaseUser.displayName?.[0] || "") + (userDataFromFirestore.lastName?.[0] || firebaseUser.displayName?.split(' ').slice(1).join(' ')?.[0] || (firebaseUser.email?.[0] || ""))).toUpperCase() || "U",
              avatarUrl: userDataFromFirestore.avatarUrl || firebaseUser.photoURL || "https://i.ibb.co/93cr9Rjd/avatar.png",
              email: firebaseUser.email || userDataFromFirestore.email || "No disponible",
              phone: firebaseUser.phoneNumber || userDataFromFirestore.phone || undefined,
              isPhoneVerified: !!firebaseUser.phoneNumber || userDataFromFirestore.isPhoneVerified || false,
              country: userDataFromFirestore.country || undefined,
              dob: userDataFromFirestore.dob ? (typeof userDataFromFirestore.dob === 'string' ? new Date(userDataFromFirestore.dob) : (userDataFromFirestore.dob as Timestamp)?.toDate ? (userDataFromFirestore.dob as Timestamp).toDate() : undefined) : undefined,
              profileType: userDataFromFirestore.profileType || undefined,
              gender: userDataFromFirestore.gender || undefined,
              documentType: userDataFromFirestore.documentType || undefined,
              documentNumber: userDataFromFirestore.documentNumber || undefined,
              createdAt: userDataFromFirestore.createdAt instanceof Timestamp ? userDataFromFirestore.createdAt : undefined,
            };
            setUser(fullUser);
            setIsLoggedIn(true);
            console.log("AuthContext: Full user data set from Firestore:", fullUser);
          } else {
            console.warn(`AuthContext: User document not found in Firestore for UID: ${firebaseUser.uid}. Creating basic profile from Auth data.`);
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
            };
            setUser(basicUser);
            setIsLoggedIn(true);
            toast({ title: "Perfil Incompleto", description: "No se encontró tu perfil completo en la base de datos. Usando información básica.", variant: "default" });
          }
        } else {
          console.log("AuthContext: No Firebase user found after onAuthStateChanged event.");
          setUser(null);
          setIsLoggedIn(false);
        }
      } catch (authProcessingError: any) {
        console.error("AuthContext: Error processing Firebase user state in onAuthStateChanged (outside Firestore fetch):", authProcessingError.message, authProcessingError.stack);
        setUser(null);
        setIsLoggedIn(false);
        toast({ title: "Error de Autenticación", description: "Ocurrió un problema al verificar tu sesión.", variant: "destructive" });
      } finally {
        console.log("AuthContext: onAuthStateChanged processing finished. Setting isLoading to false.");
        setIsLoading(false); // This is crucial
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
  }, [hasMounted, toast, isLoading]); // Added isLoading to dependency for the timeout clearing logic

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
        // onAuthStateChanged will handle setting user state.
        return userCredential.user;
    } catch (error: any) {
        console.error("Error during login:", error);
        let errorMessage = "No se pudo ingresar. Verifica tus credenciales."; let errorTitle = "Error de Ingreso";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') { errorMessage = "Correo electrónico o contraseña incorrectos."; }
        else if (error.code === 'auth/invalid-email') { errorMessage = "El formato del correo electrónico no es válido."; }
        else if (error.code === 'auth/network-request-failed') { errorTitle = "Error de Red"; errorMessage = "Error de red. Verifica tu conexión e inténtalo de nuevo."; }
        setLoginError(errorMessage); toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
        setIsLoading(false); // Set loading false on error
        throw error;
    }
  }, [toast]);

   const signup = useCallback(async (details: SignupValues): Promise<FirebaseUser | null> => {
    setIsLoading(true); setLoginError(null);
    if (!firebaseAuthInstance || !firestoreInstance) {
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
        avatarUrl: "https://i.ibb.co/93cr9Rjd/avatar.png"
      };
      await setDoc(doc(firestoreInstance, "users", firebaseUser.uid), newUserForFirestore);
      // onAuthStateChanged will handle setting user state.
      return firebaseUser;
    } catch (error: any)
      {
      console.error("Error during signup:", error);
      let errorMessage = "No se pudo crear la cuenta. Inténtalo de nuevo."; let errorTitle = "Error al Crear Cuenta";
      if (error.code === 'auth/email-already-in-use') { errorMessage = "Este correo electrónico ya está registrado."; }
      else if (error.code === 'auth/weak-password') { errorMessage = "La contraseña es demasiado débil."; }
      else if (error.code === 'auth/invalid-email') { errorMessage = "El correo electrónico no es válido."; }
      else if (error.code === 'auth/network-request-failed') { errorTitle = "Error de Red"; errorMessage = "Error de red. Verifica tu conexión e inténtalo de nuevo.";}
      setLoginError(errorMessage); toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
      setIsLoading(false); // Set loading false on error
      throw error;
    }
  }, [toast]);

  const logout = useCallback(async () => {
    if (!firebaseAuthInstance) { setUser(null); setIsLoggedIn(false); setIsLoading(false); return; }
    setIsLoading(true);
    try {
        await firebaseAuthInstance.signOut();
        // onAuthStateChanged handles state update and will eventually set isLoading to false.
        toast({ title: "Sesión cerrada" });
    } catch (error) {
        console.error("Error signing out:", error); toast({ title: "Error", description: "No se pudo cerrar la sesión.", variant: "destructive"});
        setIsLoading(false); // Set loading false on error
    }
  }, [toast]);

  const handleLogout = useCallback(() => { logout(); }, [logout]);

  const updateUser = useCallback(async (data: UpdateProfileData) => {
      setIsLoading(true);
      if (!user || !firebaseAuthInstance.currentUser || !firestoreInstance) {
            const missingService = !firebaseAuthInstance.currentUser ? "Usuario no autenticado" : "Base de datos no disponible";
            toast({ title: "Error", description: `No se pudo actualizar el perfil. ${missingService}.`, variant: "destructive", }); setIsLoading(false); return;
      }
      
      let newAvatarUrl = user.avatarUrl;
      if (data.avatarFile) {
          newAvatarUrl = URL.createObjectURL(data.avatarFile); 
          console.warn("AuthContext: Avatar upload to Firebase Storage not yet implemented. Using local preview URL.");
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
            await updateDoc(doc(firestoreInstance, "users", firebaseAuthInstance.currentUser.uid), firestoreUpdatePayload);
          }
          if ((data.firstName || data.lastName) || (newAvatarUrl !== user.avatarUrl && data.avatarFile) ) {
              await updateFirebaseProfile(firebaseAuthInstance.currentUser, {
                  displayName: `${updatedFirstName} ${updatedLastName}`.trim(),
                  ...(data.avatarFile && { photoURL: newAvatarUrl }), 
              });
          }
          setUser(prev => prev ? { ...prev, ...firestoreUpdatePayload, dob: data.dob ? data.dob : prev.dob } as User : null);
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
    // This function might navigate to /login page if dialogs are fully removed.
    // For now, it's here if AppLayout still uses it for some conditional UI.
    console.log("AuthContext: openLoginDialog called. Should navigate to /login or show modal.");
    // Example: router.push('/login'); if you have useRouter here.
  };

  const value: AuthContextType = {
    user, isLoggedIn, isLoading, loginError, phoneVerificationError, isVerificationSent, isVerifyingCode,
    firebaseConfigError,
    login, signup, logout, updateUser, handleLogout, sendVerificationCode, verifyCode,
    setIsVerificationSent, resetPhoneVerification, handleForgotPasswordSubmit, openLoginDialog,
  };

  if (!hasMounted && typeof window !== 'undefined') {
     console.log("AuthContext: Not mounted yet, returning null for SSR safety.");
     return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) { throw new Error('useAuth must be used within an AuthProvider'); }
  return context;
};

