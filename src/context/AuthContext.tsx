
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { z } from "zod";
import type { FieldErrors, UseFormReset, UseFormTrigger, UseFormGetValues, UseFormSetError, FieldPath } from 'react-hook-form';
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
import { auth as firebaseAuth, db, app as firebaseApp } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, Timestamp } from "firebase/firestore";
import { useRouter } from 'next/navigation';


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

interface AuthDialogState {
  showLoginDialog: boolean;
  showProfileDialog: boolean;
  currentView: 'login' | 'signup' | 'forgotPassword';
}

interface AuthContextType extends AuthDialogState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  signupStep: number;
  loginError: string | null;
  phoneVerificationError: string | null;
  isVerificationSent: boolean;
  isVerifyingCode: boolean;
  login: (credentials: LoginValues) => Promise<void>;
  signup: (details: SignupValues) => Promise<void>;
  logout: () => void;
  updateUser: (data: UpdateProfileData) => Promise<void>;
  setSignupStep: (step: number) => void;
  handleLoginSubmit: (data: LoginValues, resetForm: UseFormReset<LoginValues>) => void;
  handleSignupSubmit: (data: SignupValues, resetForm: UseFormReset<SignupValues>) => void;
  handleNextStep: (
    getValues: UseFormGetValues<SignupValues>,
    setError: UseFormSetError<SignupValues>,
    errors: FieldErrors<SignupValues>,
    toast: ReturnType<typeof useToast>['toast']
  ) => Promise<void>;
  handlePrevStep: () => void;
  handleLogout: () => void;
  sendVerificationCode: (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
  setIsVerificationSent: (sent: boolean) => void;
  resetPhoneVerification: () => void;
  handleForgotPasswordSubmit: (data: ForgotPasswordValues, resetForm: UseFormReset<ForgotPasswordValues>) => Promise<void>;
  
  // Dialog specific handlers
  openLoginDialog: () => void;
  openProfileDialog: () => void;
  handleOpenChange: (open: boolean) => void;
  setCurrentView: (view: AuthDialogState['currentView']) => void;
  redirectToLogin: () => void; 
  redirectToSignup: () => void;
  redirectToForgotPassword: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null); // Renamed to avoid conflict in final log
  const [isLoggedIn, setIsLoggedInState] = useState(false); // Renamed to avoid conflict in final log
  const [isLoading, setIsLoading] = useState(true);
  const [signupStep, setSignupStep] = useState(1);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneVerificationError, setPhoneVerificationError] = useState<string | null>(null);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  const [dialogState, setDialogState] = useState<AuthDialogState>({
    showLoginDialog: false,
    showProfileDialog: false,
    currentView: 'login',
  });

  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);


  useEffect(() => {
    if (!hasMounted) {
      console.log("AuthContext: Waiting for mount.");
      return;
    }

    console.log("AuthContext: Mount complete, checking Firebase Auth service.");
    if (!firebaseAuth) {
      console.error("CRITICAL AuthContext: Firebase Auth service (firebaseAuth) is not available. User will remain logged out. Check Firebase initialization in src/lib/firebase.ts.");
      setUserState(null);
      setIsLoggedInState(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    console.log("AuthContext: Starting auth state listener setup with Firebase Auth.");

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      console.log("AuthContext: onAuthStateChanged event received. User:", firebaseUser ? firebaseUser.uid : 'null');
      try {
        if (firebaseUser) {
          if (!db) {
              console.warn("AuthContext: Firestore (db) not available, cannot fetch full user profile for:", firebaseUser.uid);
              const basicUser: User = {
                  id: firebaseUser.uid,
                  name: firebaseUser.displayName || "Usuario",
                  firstName: firebaseUser.displayName?.split(' ')[0] || "Usuario",
                  lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || "",
                  initials: ((firebaseUser.displayName?.[0] || "") + (firebaseUser.displayName?.split(' ').slice(1).join(' ')?.[0] || "")).toUpperCase() || "U",
                  avatarUrl: firebaseUser.photoURL || "https://i.ibb.co/93cr9Rjd/avatar.png",
                  email: firebaseUser.email || "No disponible",
                  isPhoneVerified: firebaseUser.phoneNumber ? true : false,
                  phone: firebaseUser.phoneNumber || undefined,
              };
              setUserState(basicUser);
              setIsLoggedInState(true);
              console.log("AuthContext: Set basic user due to Firestore unavailability.");
          } else {
              console.log("AuthContext: Firestore (db) service IS available. Attempting to fetch profile for:", firebaseUser.uid);
              try {
                const userDocRef = doc(db, "users", firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                  const userDataFromDb = userDocSnap.data();
                  const appUser: User = {
                    id: firebaseUser.uid,
                    name: userDataFromDb.name || `${userDataFromDb.firstName} ${userDataFromDb.lastName}` || firebaseUser.displayName || "Usuario",
                    firstName: userDataFromDb.firstName || firebaseUser.displayName?.split(' ')[0] || "Usuario",
                    lastName: userDataFromDb.lastName || firebaseUser.displayName?.split(' ').slice(1).join(' ') || "",
                    initials: ((userDataFromDb.firstName?.[0] || "") + (userDataFromDb.lastName?.[0] || "")).toUpperCase() || "U",
                    avatarUrl: userDataFromDb.avatarUrl || firebaseUser.photoURL || "https://i.ibb.co/93cr9Rjd/avatar.png",
                    email: firebaseUser.email || userDataFromDb.email || "No disponible",
                    phone: userDataFromDb.phone || firebaseUser.phoneNumber || undefined,
                    country: userDataFromDb.country || undefined,
                    dob: userDataFromDb.dob || null,
                    isPhoneVerified: userDataFromDb.isPhoneVerified !== undefined ? userDataFromDb.isPhoneVerified : (firebaseUser.phoneNumber ? true : false),
                    profileType: userDataFromDb.profileType || undefined,
                    gender: userDataFromDb.gender || undefined,
                    documentType: userDataFromDb.documentType || undefined,
                    documentNumber: userDataFromDb.documentNumber || undefined,
                    createdAt: userDataFromDb.createdAt instanceof Timestamp ? userDataFromDb.createdAt : null,
                  };
                  setUserState(appUser);
                  setIsLoggedInState(true);
                  console.log("AuthContext: User data fetched from Firestore for", appUser.id);
                } else {
                  console.warn(`AuthContext: User ${firebaseUser.uid} found in Auth but not in Firestore. Creating basic profile.`);
                   const basicUser: User = {
                      id: firebaseUser.uid,
                      name: firebaseUser.displayName || "Usuario",
                      firstName: firebaseUser.displayName?.split(' ')[0] || "Usuario",
                      lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || "",
                      initials: ((firebaseUser.displayName?.[0] || "") + (firebaseUser.displayName?.split(' ').slice(1).join(' ')?.[0] || "")).toUpperCase() || "U",
                      avatarUrl: firebaseUser.photoURL || "https://i.ibb.co/93cr9Rjd/avatar.png",
                      email: firebaseUser.email || "No disponible",
                      isPhoneVerified: firebaseUser.phoneNumber ? true : false,
                      phone: firebaseUser.phoneNumber || undefined,
                  };
                  setUserState(basicUser);
                  setIsLoggedInState(true);
                }
              } catch (error) { // Catches errors from Firestore operations
                console.error("AuthContext: Error fetching user data from Firestore or processing it:", error);
                 const basicUser: User = { // Fallback to basic user
                      id: firebaseUser.uid,
                      name: firebaseUser.displayName || "Usuario",
                      firstName: firebaseUser.displayName?.split(' ')[0] || "Usuario",
                      lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || "",
                      initials: ((firebaseUser.displayName?.[0] || "") + (firebaseUser.displayName?.split(' ').slice(1).join(' ')?.[0] || "")).toUpperCase() || "U",
                      avatarUrl: firebaseUser.photoURL || "https://i.ibb.co/93cr9Rjd/avatar.png",
                      email: firebaseUser.email || "No disponible",
                      isPhoneVerified: firebaseUser.phoneNumber ? true : false,
                      phone: firebaseUser.phoneNumber || undefined,
                  };
                  setUserState(basicUser);
                  setIsLoggedInState(true);
                  console.log("AuthContext: Fallback to basic user due to Firestore error.");
              }
          }
        } else { // firebaseUser is null
          setUserState(null);
          setIsLoggedInState(false);
          console.log("AuthContext: No Firebase user found (firebaseUser is null).");
        }
      } catch (e) { // Catch any unexpected error during the entire if/else block
        console.error("AuthContext: Unexpected error during onAuthStateChanged processing:", e);
        setUserState(null); // Reset to a known safe state
        setIsLoggedInState(false);
      } finally {
        // This block ensures isLoading is always set to false after processing the auth state.
        setIsLoading(false);
        // Logging current state after update for clarity
        console.log(`AuthContext: isLoading set to false. Current User: ${user ? user.id : 'null'}, IsLoggedIn: ${isLoggedIn}`);
      }
    });

    return () => {
      console.log("AuthContext: Unsubscribing from auth state listener.");
      unsubscribe();
    };
  }, [hasMounted]); // Only re-run if hasMounted changes. Other dependencies are handled internally or are stable.


  const resetPhoneVerification = useCallback(() => {
      setConfirmationResult(null);
      setPhoneVerificationError(null);
      setIsVerificationSent(false);
      setIsVerifyingCode(false);
  }, []);

  const login = useCallback(async (credentials: LoginValues) => {
    setLoginError(null);
    setIsLoading(true);

    if (!firebaseAuth) {
        setLoginError("Error de Firebase: Servicio de autenticación no disponible.");
        toast({ title: "Error de Firebase", description: "El servicio de autenticación no está disponible.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    try {
        await signInWithEmailAndPassword(firebaseAuth, credentials.email, credentials.password);
        toast({ title: "Ingreso exitoso", description: `¡Bienvenido/a de vuelta!` });
        setDialogState(prev => ({ ...prev, showLoginDialog: false, currentView: 'login' }));
    } catch (error: any) {
        console.error("Error during login:", error);
        let errorMessage = "No se pudo ingresar. Verifica tus credenciales.";
        let errorTitle = "Error de Ingreso";

        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = "Correo electrónico o contraseña incorrectos.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "El formato del correo electrónico no es válido.";
        } else if (error.code === 'auth/network-request-failed') {
            errorTitle = "Error de Red";
            errorMessage = "Error de red. Verifica tu conexión e inténtalo de nuevo.";
        }
        setLoginError(errorMessage);
        toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

   const signup = useCallback(async (details: SignupValues) => {
    setIsLoading(true);
    setLoginError(null);

    if (!firebaseAuth) {
        setLoginError("Error de Firebase: Servicio de autenticación no disponible.");
        toast({ title: "Error de Firebase", description: "El servicio de autenticación no está disponible.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    if (!db) {
        setLoginError("Error de Base de Datos: Firestore no está disponible.");
        toast({ title: "Error de Base de Datos", description: "No se pueden guardar los datos del perfil.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, details.email, details.password);
      const firebaseUser = userCredential.user;

      await updateFirebaseProfile(firebaseUser, {
        displayName: `${details.firstName} ${details.lastName}`,
      });

      const newUserForFirestore: Omit<User, 'id' | 'initials' | 'name' | 'avatarUrl'> & { uid: string, createdAt: any } = {
        uid: firebaseUser.uid,
        firstName: details.firstName,
        lastName: details.lastName,
        email: details.email,
        phone: details.phone || "",
        country: details.country || "",
        dob: details.dob ? details.dob.toISOString() : null,
        isPhoneVerified: false,
        profileType: details.profileType || "",
        gender: details.gender || "",
        documentType: details.documentType || "",
        documentNumber: details.documentNumber || "",
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", firebaseUser.uid), newUserForFirestore);
      setSignupStep(1);
      toast({ title: "Cuenta Creada", description: `¡Bienvenido/a, ${details.firstName}! Tu cuenta ha sido creada.` });
      setDialogState(prev => ({ ...prev, currentView: 'login' })); 

    } catch (error: any) {
      console.error("Error during signup:", error);
      let errorMessage = "No se pudo crear la cuenta. Inténtalo de nuevo.";
      let errorTitle = "Error al Crear Cuenta";

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Este correo electrónico ya está registrado.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "La contraseña es demasiado débil.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "El correo electrónico no es válido.";
      } else if (error.code === 'auth/network-request-failed') {
        errorTitle = "Error de Red";
        errorMessage = "Error de red. Verifica tu conexión e inténtalo de nuevo.";
      }
      setLoginError(errorMessage);
      toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  const logout = useCallback(async () => {
    if (!firebaseAuth) {
        console.warn("Firebase Auth not available for logout.");
        setUserState(null);
        setIsLoggedInState(false);
        return;
    }
    try {
        await firebaseAuth.signOut();
        toast({ title: "Sesión cerrada" });
        setDialogState(prev => ({...prev, showProfileDialog: false, showLoginDialog: false}));
    } catch (error) {
        console.error("Error signing out:", error);
        toast({ title: "Error", description: "No se pudo cerrar la sesión.", variant: "destructive"});
    }
  }, [toast]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const updateUser = useCallback(async (data: UpdateProfileData) => {
      if (!user || !firebaseAuth.currentUser) {
            toast({
                title: "Error",
                description: "No se pudo actualizar el perfil. Usuario no encontrado o no autenticado.",
                variant: "destructive",
            });
            setIsLoading(false); 
            return;
       }
      if (!db && user.id !== 'usr123') { 
            toast({ title: "Error de Base de Datos", description: "No se pueden guardar los cambios en el servidor.", variant: "destructive" });
            setIsLoading(false); 
            return;
      }

      setIsLoading(true);

      let newAvatarUrl = user.avatarUrl;

      if (data.avatarFile) {
          console.log("Simulating avatar upload for:", data.avatarFile.name);
          try {
              newAvatarUrl = URL.createObjectURL(data.avatarFile);
              await updateFirebaseProfile(firebaseAuth.currentUser, { photoURL: newAvatarUrl }); 
          } catch (error) {
                console.error("Error processing avatar for update:", error);
                 toast({
                    title: "Error de Imagen",
                    description: "No se pudo procesar la imagen para actualizar.",
                    variant: "destructive",
                 });
                 newAvatarUrl = user.avatarUrl; 
          }
      }

      const updatedFirstName = data.firstName !== undefined ? data.firstName : user.firstName;
      const updatedLastName = data.lastName !== undefined ? data.lastName : user.lastName;
      const updatedName = `${updatedFirstName} ${updatedLastName}`;
      const updatedInitials = `${updatedFirstName?.[0] ?? ''}${updatedLastName?.[0] ?? ''}`.toUpperCase();

      const newPhone = data.phone !== undefined ? (data.phone === "" ? "" : data.phone) : user.phone;
      const isPhoneUpdated = newPhone !== user.phone;
      let newPhoneVerifiedStatus = user.isPhoneVerified ?? false;

      if (isPhoneUpdated && newPhone !== firebaseAuth.currentUser.phoneNumber) {
        newPhoneVerifiedStatus = false; 
        resetPhoneVerification(); 
      } else if (isPhoneUpdated && newPhone === firebaseAuth.currentUser.phoneNumber) {
        newPhoneVerifiedStatus = true; 
      }


      const firestoreUpdateData: Partial<Omit<User, 'id' | 'email' | 'createdAt'>> = {
          name: updatedName,
          firstName: updatedFirstName,
          lastName: updatedLastName,
          initials: updatedInitials,
          phone: newPhone || '',
          country: data.country !== undefined ? data.country : user.country,
          dob: data.dob !== undefined ? (data.dob instanceof Date ? data.dob.toISOString() : data.dob) : user.dob,
          avatarUrl: newAvatarUrl, 
          isPhoneVerified: newPhoneVerifiedStatus,
      };

      if (db) { 
        try {
            const userDocRef = doc(db, "users", user.id);
            await updateDoc(userDocRef, firestoreUpdateData);
            setUserState(prevUser => ({ ...prevUser!, ...firestoreUpdateData, avatarUrl: newAvatarUrl }));
        } catch (error) {
            console.error("Error updating user in Firestore:", error);
            toast({ title: "Error de Base de Datos", description: "No se pudieron guardar los cambios en el servidor.", variant: "destructive" });
        }
      }

      toast({
          title: "Perfil Actualizado",
          description: "Tus datos han sido guardados correctamente.",
      });

      setIsLoading(false);
  }, [user, toast, resetPhoneVerification]);

   const sendVerificationCode = useCallback(async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => {
       setPhoneVerificationError(null);
       setIsLoading(true);
       if (!firebaseAuth) {
           setPhoneVerificationError("Error de Firebase: Servicio de autenticación no disponible.");
           toast({ title: "Error de Firebase", description: "El servicio de autenticación no está disponible.", variant: "destructive" });
           setIsLoading(false);
           return;
       }
       try {
           const result = await signInWithPhoneNumber(firebaseAuth, phoneNumber, recaptchaVerifier);
           setConfirmationResult(result);
           setIsVerificationSent(true);
           toast({
               title: "Código Enviado",
               description: `Se envió un código de verificación a ${phoneNumber}.`,
           });
       } catch (error: any) {
           console.error("Error sending verification code:", error);
           let errorMessage = "No se pudo enviar el código de verificación. Inténtalo de nuevo.";
           let errorTitle = "Error al Enviar Código";

           if (error.code === 'auth/invalid-phone-number') {
               errorMessage = "El número de teléfono proporcionado no es válido.";
           } else if (error.code === 'auth/too-many-requests') {
               errorMessage = "Demasiadas solicitudes. Inténtalo más tarde.";
           } else if (error.code === 'auth/missing-phone-number') {
                errorMessage = "Ingresa un número de teléfono.";
           } else if (error.code === 'auth/captcha-check-failed' || error.code === 'auth/missing-recaptcha-token') {
               errorMessage = "Falló la verificación reCAPTCHA. Por favor, recarga la página e inténtalo de nuevo.";
           } else if (error.code === 'auth/network-request-failed') {
               errorTitle = "Error de Red";
               errorMessage = "Error de red. Verifica tu conexión e inténtalo de nuevo.";
           } else if (error.code === 'auth/internal-error') {
               errorTitle = "Error Interno de Firebase";
               errorMessage = "Error interno al verificar el teléfono. Revisa la configuración de Firebase (proveedor de teléfono habilitado, APIs, etc.).";
           }
           setPhoneVerificationError(errorMessage);
           toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
       } finally {
           setIsLoading(false);
       }
   }, [toast]);

   const verifyCode = useCallback(async (code: string) => {
       if (!confirmationResult) {
           setPhoneVerificationError("Error: Intenta enviar el código de nuevo.");
           toast({ title: "Error", description: "Intenta enviar el código de verificación de nuevo.", variant: "destructive" });
           setIsLoading(false);
           return;
       }
       setPhoneVerificationError(null);
       setIsVerifyingCode(true);
       setIsLoading(true);
       try {
           const credential = await confirmationResult.confirm(code);
           const verifiedFirebaseUser = credential.user as FirebaseUser;

           if (user && firebaseAuth.currentUser && db ) { 
                await updateFirebaseProfile(firebaseAuth.currentUser, { phoneNumber: verifiedFirebaseUser.phoneNumber }); 
                await updateDoc(doc(db, "users", user.id), { phone: verifiedFirebaseUser.phoneNumber, isPhoneVerified: true });
                setUserState(prev => prev ? {...prev, phone: verifiedFirebaseUser.phoneNumber || prev.phone, isPhoneVerified: true} : null);
           }

           setConfirmationResult(null);
           setIsVerificationSent(false);
           toast({ title: "Teléfono Verificado", description: "Tu número de teléfono ha sido verificado correctamente." });
       } catch (error: any) {
           console.error("Error verifying code:", error);
           let errorMessage = "El código ingresado es incorrecto o ha expirado.";
           let errorTitle = "Error de Verificación";

            if (error.code === 'auth/invalid-verification-code') {
               errorMessage = "El código de verificación no es válido.";
           } else if (error.code === 'auth/code-expired') {
               errorMessage = "El código de verificación ha expirado. Solicita uno nuevo.";
           } else if (error.code === 'auth/credential-already-in-use') {
               errorMessage = "Este número de teléfono ya está asociado a otra cuenta.";
           } else if (error.code === 'auth/network-request-failed') {
               errorTitle = "Error de Red";
               errorMessage = "Error de red. Verifica tu conexión e inténtalo de nuevo.";
           }
           setPhoneVerificationError(errorMessage);
           toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
       } finally {
           setIsVerifyingCode(false);
           setIsLoading(false);
       }
   }, [confirmationResult, toast, user]);


   const handleLoginSubmit = useCallback(async (data: LoginValues, resetForm: UseFormReset<LoginValues>) => {
        await login(data);
   }, [login]);

   const handleSignupSubmit = useCallback((data: SignupValues, resetForm: UseFormReset<SignupValues>) => {
       signup(data).then(() => {
          resetForm();
       }).catch((err) => {
           console.error("Signup error propagated to submit handler:", err);
       });
   }, [signup]);

    const handleForgotPasswordSubmit = useCallback(async (data: ForgotPasswordValues, resetForm: UseFormReset<ForgotPasswordValues>) => {
    setIsLoading(true);
    if (!firebaseAuth) {
        toast({ title: "Error de Firebase", description: "El servicio de autenticación no está disponible.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    try {
      await sendPasswordResetEmail(firebaseAuth, data.email);
      toast({
        title: "Correo Enviado",
        description: "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.",
      });
      setDialogState(prev => ({ ...prev, currentView: 'login' })); 
      resetForm();
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      let errorMessage = "No se pudo enviar el correo de recuperación. Inténtalo de nuevo.";
      let errorTitle = "Error al Enviar Correo";

      if (error.code === 'auth/user-not-found') {
        errorMessage = "Si tu correo está registrado, recibirás un enlace. Verifica también tu carpeta de spam.";
      } else if (error.code === 'auth/invalid-email') {
         errorMessage = "El formato del correo electrónico no es válido.";
      } else if (error.code === 'auth/network-request-failed') {
        errorTitle = "Error de Red";
        errorMessage = "Error de red. Verifica tu conexión e inténtalo de nuevo.";
      }
      toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

 const handleNextStep = useCallback(async (
    getValues: UseFormGetValues<SignupValues>,
    setError: UseFormSetError<SignupValues>,
    errors: FieldErrors<SignupValues>, 
    toastFn: ReturnType<typeof useToast>['toast']
  ) => {
    const currentStep1Values = {
      firstName: getValues("firstName"),
      lastName: getValues("lastName"),
      country: getValues("country"),
      phone: getValues("phone") || undefined, 
      profileType: getValues("profileType"),
    };

    const validationResult = signupStep1Schema.safeParse(currentStep1Values);

    if (validationResult.success) {
      setSignupStep(2); 
    } else {
      validationResult.error.errors.forEach((err) => {
        if (err.path.length > 0) {
          const fieldName = err.path[0] as FieldPath<SignupValues>; 
          setError(fieldName, {
            type: "manual",
            message: err.message,
          });
        }
      });

      const firstErrorField = validationResult.error.errors[0]?.path[0];
      if (firstErrorField) {
        const errorElement = document.getElementsByName(firstErrorField as string)[0];
        errorElement?.focus();
        toastFn({ title: "Error de Validación", description: "Por favor, corrige los errores en el formulario.", variant: "destructive" });
      } else {
        toastFn({ title: "Error de Validación", description: "Por favor, completa los campos requeridos.", variant: "destructive" });
      }
    }
  }, []);


   const handlePrevStep = useCallback(() => {
       setSignupStep(1);
   }, []);

    const openLoginDialog = () => {
        setDialogState({ showLoginDialog: true, showProfileDialog: false, currentView: 'login' });
        setLoginError(null);
        resetPhoneVerification();
        setSignupStep(1);
    };

    const openProfileDialog = () => {
        setDialogState({ showLoginDialog: false, showProfileDialog: true, currentView: 'login' }); 
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setDialogState({ showLoginDialog: false, showProfileDialog: false, currentView: 'login' });
            setSignupStep(1); 
            setLoginError(null);
            resetPhoneVerification();
        }
    };

    const setCurrentView = (view: AuthDialogState['currentView']) => {
        setDialogState(prev => ({ ...prev, currentView: view, showLoginDialog: true, showProfileDialog: false }));
        setLoginError(null); 
        setSignupStep(1); 
        resetPhoneVerification();
    };
   
    const redirectToLogin = () => { 
      openLoginDialog();
    };
    const redirectToSignup = () => { 
      setCurrentView('signup');
    };
    const redirectToForgotPassword = () => { 
      setCurrentView('forgotPassword');
    };


  const value: AuthContextType = {
    user: user, // Use the renamed state variable
    isLoggedIn: isLoggedIn, // Use the renamed state variable
    isLoading,
    signupStep,
    loginError,
    phoneVerificationError,
    isVerificationSent,
    isVerifyingCode,
    login,
    signup,
    logout,
    updateUser,
    setSignupStep,
    handleLoginSubmit,
    handleSignupSubmit,
    handleNextStep,
    handlePrevStep,
    handleLogout,
    sendVerificationCode,
    verifyCode,
    setIsVerificationSent,
    resetPhoneVerification,
    handleForgotPasswordSubmit,
    ...dialogState,
    openLoginDialog,
    openProfileDialog,
    handleOpenChange,
    setCurrentView,
    redirectToLogin,
    redirectToSignup,
    redirectToForgotPassword,
  };

  if (!hasMounted && typeof window !== 'undefined') {
     return null;
  }


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

