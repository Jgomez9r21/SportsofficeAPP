
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

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  firebaseConfigError: boolean;
  loginError: string | null;
  phoneVerificationError: string | null;
  isVerificationSent: boolean;
  isVerifyingCode: boolean;
  login: (credentials: LoginValues) => Promise<void>;
  signup: (details: SignupValues) => Promise<void>;
  logout: () => void;
  updateUser: (data: UpdateProfileData) => Promise<void>;
  sendVerificationCode: (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
  setIsVerificationSent: (sent: boolean) => void;
  resetPhoneVerification: () => void;
  handleForgotPasswordSubmit: (data: ForgotPasswordValues, resetForm: UseFormReset<ForgotPasswordValues>) => Promise<void>;
  redirectToLogin: () => void;
  showLoginDialog: boolean;
  showProfileDialog: boolean;
  currentView: 'login' | 'signup' | 'forgotPassword';
  signupStep: number;
  handleOpenChange: (open: boolean) => void;
  openLoginDialog: () => void;
  openProfileDialog: () => void;
  setCurrentView: (view: 'login' | 'signup' | 'forgotPassword') => void;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseConfigError, setFirebaseConfigError] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { toast } = useToast();

  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneVerificationError, setPhoneVerificationError] = useState<string | null>(null);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  const [hasMounted, setHasMounted] = useState(false);
  const routerRef = useRef<any>(null);

  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [currentView, setCurrentView] = useState<'login' | 'signup' | 'forgotPassword'>('login');
  const [signupStep, setSignupStep] = useState(1);

  useEffect(() => {
    setHasMounted(true);
    if (typeof window !== 'undefined') {
      import('next/navigation').then(mod => {
        routerRef.current = mod.useRouter();
      });
    }
  }, []);

  const redirectToLogin = useCallback(() => {
    if (routerRef.current) routerRef.current.push('/login');
    else console.warn("AuthContext: Router not ready for redirection.");
  }, []);

  useEffect(() => {
    if (!hasMounted) {
      console.log("AuthContext: Waiting for mount to complete.");
      return;
    }
    console.log("AuthContext: Mount complete. Checking Firebase initialization status.");

    if (!isFirebaseInitialized) {
      console.error("AuthContext: CRITICAL - Firebase is NOT initialized (isFirebaseInitialized is false). Auth features disabled.");
      setFirebaseConfigError(true);
      setIsLoading(false);
      setUser(null);
      setIsLoggedIn(false);
      return; // Stop further execution if Firebase isn't ready
    }
    setFirebaseConfigError(false); // Firebase is initialized, clear any previous config error

    const authInstance = firebaseAuthInstance;
    if (!authInstance) {
      console.error("AuthContext: CRITICAL - firebaseAuthInstance is null or undefined even after isFirebaseInitialized is true. This indicates a problem in firebase.ts or its exports.");
      setFirebaseConfigError(true); // Treat as a config error
      setIsLoading(false);
      setUser(null);
      setIsLoggedIn(false);
      return; // Stop further execution
    }

    console.log("AuthContext: Firebase services appear initialized. Setting up onAuthStateChanged listener.");
    setIsLoading(true); // Set loading before attaching listener

    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn("AuthContext: Auth check timed out after 15s. Forcing isLoading to false.");
        setIsLoading(false);
        // Consider setting user to null explicitly if auth state is unknown after timeout
        // setUser(null); setIsLoggedIn(false);
      }
    }, 15000);

    const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
      clearTimeout(loadingTimeout);
      console.log(`AuthContext: onAuthStateChanged fired. User UID: ${firebaseUser?.uid || null}`);
      try {
        if (firebaseUser) {
          if (!db) {
            console.warn("AuthContext: Firestore (db) is not available. Using basic user profile from Auth.");
            const basicUser: User = {
              id: firebaseUser.uid, name: firebaseUser.displayName || "Usuario",
              firstName: firebaseUser.displayName?.split(' ')[0] || "Usuario",
              lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || "",
              initials: ((firebaseUser.displayName?.[0] || "") + (firebaseUser.displayName?.split(' ').slice(1).join(' ')?.[0] || "")).toUpperCase() || "U",
              avatarUrl: firebaseUser.photoURL || "https://i.ibb.co/93cr9Rjd/avatar.png",
              email: firebaseUser.email || "N/A", isPhoneVerified: !!firebaseUser.phoneNumber,
              phone: firebaseUser.phoneNumber || undefined,
            };
            setUser(basicUser); setIsLoggedIn(true);
          } else {
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const userDataFromDb = userDocSnap.data();
              const appUser: User = {
                id: firebaseUser.uid, name: userDataFromDb.name || `${userDataFromDb.firstName} ${userDataFromDb.lastName}` || firebaseUser.displayName || "Usuario",
                firstName: userDataFromDb.firstName || firebaseUser.displayName?.split(' ')[0] || "Usuario",
                lastName: userDataFromDb.lastName || firebaseUser.displayName?.split(' ').slice(1).join(' ') || "",
                initials: ((userDataFromDb.firstName?.[0] || "") + (userDataFromDb.lastName?.[0] || "")).toUpperCase() || "U",
                avatarUrl: userDataFromDb.avatarUrl || firebaseUser.photoURL || "https://i.ibb.co/93cr9Rjd/avatar.png",
                email: firebaseUser.email || userDataFromDb.email || "N/A",
                phone: userDataFromDb.phone || firebaseUser.phoneNumber || undefined,
                country: userDataFromDb.country, dob: userDataFromDb.dob ? (userDataFromDb.dob.toDate ? userDataFromDb.dob.toDate().toISOString() : userDataFromDb.dob) : null,
                isPhoneVerified: userDataFromDb.isPhoneVerified !== undefined ? userDataFromDb.isPhoneVerified : !!firebaseUser.phoneNumber,
                profileType: userDataFromDb.profileType, gender: userDataFromDb.gender,
                documentType: userDataFromDb.documentType, documentNumber: userDataFromDb.documentNumber,
                createdAt: userDataFromDb.createdAt instanceof Timestamp ? userDataFromDb.createdAt : null,
              };
              setUser(appUser); setIsLoggedIn(true);
              console.log("AuthContext: User profile loaded from Firestore:", appUser.id);
            } else {
              console.warn(`AuthContext: User ${firebaseUser.uid} in Auth, not Firestore. Using basic profile.`);
               const basicUser: User = { /* ... as above ... */ 
                id: firebaseUser.uid, name: firebaseUser.displayName || "Usuario",
                firstName: firebaseUser.displayName?.split(' ')[0] || "Usuario",
                lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || "",
                initials: ((firebaseUser.displayName?.[0] || "") + (firebaseUser.displayName?.split(' ').slice(1).join(' ')?.[0] || "")).toUpperCase() || "U",
                avatarUrl: firebaseUser.photoURL || "https://i.ibb.co/93cr9Rjd/avatar.png",
                email: firebaseUser.email || "N/A", isPhoneVerified: !!firebaseUser.phoneNumber,
                phone: firebaseUser.phoneNumber || undefined,
              };
              setUser(basicUser); setIsLoggedIn(true);
            }
          }
        } else {
          setUser(null); setIsLoggedIn(false);
          console.log("AuthContext: No Firebase user (logged out).");
        }
      } catch (error) {
        console.error("AuthContext: Error in onAuthStateChanged or Firestore fetch:", error);
        setUser(null); setIsLoggedIn(false);
      } finally {
        console.log("AuthContext: onAuthStateChanged processing finished. Setting isLoading to false.");
        setIsLoading(false);
      }
    });
    console.log("AuthContext: onAuthStateChanged listener successfully attached.");
    return () => {
      console.log("AuthContext: Cleaning up auth listener and timeout.");
      clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, [hasMounted]); // Depends on hasMounted to ensure routerRef and Firebase checks are safe

  const resetPhoneVerification = useCallback(() => { /* ... */ }, []);
  const login = useCallback(async (credentials: LoginValues) => { /* ... */ setIsLoading(false); }, [toast]);
  const signup = useCallback(async (details: SignupValues) => { /* ... */ setIsLoading(false); }, [toast]);
  const logout = useCallback(async () => { /* ... */ }, [toast]);
  const updateUser = useCallback(async (data: UpdateProfileData) => { /* ... */ setIsLoading(false); }, [user, toast, resetPhoneVerification]);
  const sendVerificationCode = useCallback(async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => { /* ... */ setIsLoading(false); }, [toast]);
  const verifyCode = useCallback(async (code: string) => { /* ... */ setIsLoading(false); }, [confirmationResult, toast, user]);
  const handleForgotPasswordSubmit = useCallback(async (data: ForgotPasswordValues, resetForm: UseFormReset<ForgotPasswordValues>) => { /* ... */ setIsLoading(false); }, [toast]);
  
  // Simplified dialog handlers for page-based auth
  const openLoginDialog = useCallback(() => redirectToLogin(), [redirectToLogin]);
  const openProfileDialog = useCallback(() => {
    if (isLoggedIn && user && routerRef.current) routerRef.current.push('/settings');
    else redirectToLogin();
  }, [isLoggedIn, user, redirectToLogin]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setShowLoginDialog(false); setShowProfileDialog(false);
      resetPhoneVerification();
    }
  }, [resetPhoneVerification]);

  const handleLoginSubmit = useCallback(async (data: LoginValues, resetForm: UseFormReset<LoginValues>) => { await login(data); }, [login]);
  const handleSignupSubmit = useCallback(async (data: SignupValues, resetForm: UseFormReset<SignupValues>) => { await signup(data); }, [signup]);
  const handleNextStep = useCallback(async (getValues: UseFormGetValues<SignupValues>, setError: UseFormSetError<SignupValues>, errors: FieldErrors<SignupValues>, toastFn: ReturnType<typeof useToast>['toast']) => {
    const step1Data = signupStep1Schema.safeParse({
      firstName: getValues("firstName"), lastName: getValues("lastName"), country: getValues("country"),
      phone: getValues("phone") || undefined, profileType: getValues("profileType"),
    });
    if (step1Data.success) setSignupStep(2);
    else {
      step1Data.error.errors.forEach(err => setError(err.path[0] as FieldPath<SignupValues>, { type: "manual", message: err.message }));
      toastFn({ title: "Validación Fallida", description: "Por favor corrige los errores.", variant: "destructive" });
    }
  }, []);
  const handlePrevStep = useCallback(() => setSignupStep(1), []);
  const handleLogout = useCallback(() => logout(), [logout]);

  const value: AuthContextType = {
    user, isLoggedIn, isLoading, firebaseConfigError, loginError, phoneVerificationError,
    isVerificationSent, isVerifyingCode, login, signup, logout, updateUser, sendVerificationCode,
    verifyCode, setIsVerificationSent, resetPhoneVerification, handleForgotPasswordSubmit, redirectToLogin,
    showLoginDialog, showProfileDialog, currentView, signupStep, handleOpenChange, openLoginDialog,
    openProfileDialog, setCurrentView, setSignupStep, handleLoginSubmit, handleSignupSubmit,
    handleNextStep, handlePrevStep, handleLogout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

    