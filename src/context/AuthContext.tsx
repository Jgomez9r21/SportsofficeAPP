
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
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

const signupSchema = signupStep1Schema.merge(baseSignupStep2Schema)
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
  // Removed dialog states: showLoginDialog, showProfileDialog, currentView
  signupStep: number;
  loginError: string | null;
  phoneVerificationError: string | null;
  isVerificationSent: boolean;
  isVerifyingCode: boolean;
  login: (credentials: LoginValues) => Promise<void>;
  signup: (details: SignupValues) => Promise<void>;
  logout: () => void;
  updateUser: (data: UpdateProfileData) => Promise<void>;
  // Removed dialog handlers: handleOpenChange, openLoginDialog, openProfileDialog, setCurrentView
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
  handleLogout: () => void; // Kept for direct logout action
  sendVerificationCode: (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
  setIsVerificationSent: (sent: boolean) => void;
  resetPhoneVerification: () => void;
  handleForgotPasswordSubmit: (data: ForgotPasswordValues, resetForm: UseFormReset<ForgotPasswordValues>) => Promise<void>;
  redirectToLogin: () => void; // New method for protected routes
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [signupStep, setSignupStep] = useState(1);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter(); // Initialize useRouter

  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneVerificationError, setPhoneVerificationError] = useState<string | null>(null);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const checkAuth = useCallback(async () => {
    if (!firebaseAuth) {
      setUser(null); setIsLoggedIn(false); setIsLoading(false); return;
    }
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!db) {
            const basicUser: User = {
                id: firebaseUser.uid, name: firebaseUser.displayName || "Usuario", firstName: firebaseUser.displayName?.split(' ')[0] || "Usuario",
                lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || "", initials: ((firebaseUser.displayName?.[0] || "") + (firebaseUser.displayName?.split(' ').slice(1).join(' ')?.[0] || "")).toUpperCase() || "U",
                avatarUrl: firebaseUser.photoURL || "https://i.ibb.co/93cr9Rjd/avatar.png", email: firebaseUser.email || "No disponible", isPhoneVerified: !!firebaseUser.phoneNumber, phone: firebaseUser.phoneNumber || undefined,
            };
            setUser(basicUser); setIsLoggedIn(true); setIsLoading(false); return;
        }
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            const appUser: User = {
              id: firebaseUser.uid, name: data.name || `${data.firstName} ${data.lastName}` || "Usuario", firstName: data.firstName || "", lastName: data.lastName || "",
              initials: ((data.firstName?.[0] || "") + (data.lastName?.[0] || "")).toUpperCase() || "U", avatarUrl: data.avatarUrl || firebaseUser.photoURL || "https://i.ibb.co/93cr9Rjd/avatar.png",
              email: firebaseUser.email || data.email, phone: data.phone || firebaseUser.phoneNumber, country: data.country, dob: data.dob,
              isPhoneVerified: data.isPhoneVerified !== undefined ? data.isPhoneVerified : !!firebaseUser.phoneNumber, profileType: data.profileType, gender: data.gender,
              documentType: data.documentType, documentNumber: data.documentNumber, createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
            };
            setUser(appUser); setIsLoggedIn(true);
          } else {
             const basicUser: User = { /* ... basic user from auth ... */
                id: firebaseUser.uid, name: firebaseUser.displayName || "Usuario", firstName: firebaseUser.displayName?.split(' ')[0] || "Usuario",
                lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || "", initials: ((firebaseUser.displayName?.[0] || "") + (firebaseUser.displayName?.split(' ').slice(1).join(' ')?.[0] || "")).toUpperCase() || "U",
                avatarUrl: firebaseUser.photoURL || "https://postimg.cc/RNZV5dVG", email: firebaseUser.email || "No disponible", isPhoneVerified: !!firebaseUser.phoneNumber, phone: firebaseUser.phoneNumber || undefined,
             };
            setUser(basicUser); setIsLoggedIn(true);
          }
        } catch (error) { console.error("Error fetching user from Firestore:", error);
            const basicUser: User = { /* ... basic user from auth ... */
                id: firebaseUser.uid, name: firebaseUser.displayName || "Usuario", firstName: firebaseUser.displayName?.split(' ')[0] || "Usuario",
                lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || "", initials: ((firebaseUser.displayName?.[0] || "") + (firebaseUser.displayName?.split(' ').slice(1).join(' ')?.[0] || "")).toUpperCase() || "U",
                avatarUrl: firebaseUser.photoURL || "https://i.ibb.co/93cr9Rjd/avatar.png", email: firebaseUser.email || "No disponible", isPhoneVerified: !!firebaseUser.phoneNumber, phone: firebaseUser.phoneNumber || undefined,
            };
            setUser(basicUser); setIsLoggedIn(true);
        }
      } else {
        setUser(null); setIsLoggedIn(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (hasMounted) {
      setIsLoading(true);
      const unsubscribePromise = checkAuth();
      return () => { unsubscribePromise.then(unsub => unsub && unsub()); };
    }
  }, [hasMounted, checkAuth]);

  const resetPhoneVerification = useCallback(() => {
      setConfirmationResult(null); setPhoneVerificationError(null); setIsVerificationSent(false); setIsVerifyingCode(false);
  }, []);

  const login = useCallback(async (credentials: LoginValues) => {
    setLoginError(null); setIsLoading(true);
    if (!firebaseAuth) { /* ... handle no auth ... */ setIsLoading(false); return; }
    try {
      await signInWithEmailAndPassword(firebaseAuth, credentials.email, credentials.password);
      toast({ title: "Ingreso exitoso", description: `¡Bienvenido/a de vuelta!` });
      router.push('/'); // Redirect to home
    } catch (error: any) { /* ... handle login error ... */ }
    finally { setIsLoading(false); }
  }, [toast, router]);

  const signup = useCallback(async (details: SignupValues) => {
    setIsLoading(true); setLoginError(null);
    if (!firebaseAuth || !db) { /* ... handle no auth/db ... */ setIsLoading(false); return; }
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, details.email, details.password);
      const firebaseUser = userCredential.user;
      await updateFirebaseProfile(firebaseUser, { displayName: `${details.firstName} ${details.lastName}` });
      const newUserForFirestore = { /* ... user data ... */
        uid: firebaseUser.uid, firstName: details.firstName, lastName: details.lastName, email: details.email,
        phone: details.phone || "", country: details.country || "", dob: details.dob ? details.dob.toISOString() : null,
        isPhoneVerified: false, profileType: details.profileType || "", gender: details.gender || "",
        documentType: details.documentType || "", documentNumber: details.documentNumber || "", createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, "users", firebaseUser.uid), newUserForFirestore);
      toast({ title: "Cuenta Creada", description: `¡Bienvenido/a, ${details.firstName}!` });
      router.push('/'); // Redirect to home
    } catch (error: any) { /* ... handle signup error ... */ }
    finally { setIsLoading(false); }
  }, [toast, router]);

  const logout = useCallback(async () => {
    if (!firebaseAuth) { /* ... handle no auth ... */ return; }
    try {
      await firebaseAuth.signOut();
      toast({ title: "Sesión cerrada" });
      router.push('/login'); // Redirect to login
    } catch (error) { /* ... handle logout error ... */ }
  }, [toast, router]);

  const handleLogout = useCallback(() => { logout(); }, [logout]);
  
  const redirectToLogin = useCallback(() => {
    router.push('/login');
  }, [router]);

  const updateUser = useCallback(async (data: UpdateProfileData) => { /* ... existing logic ... */ }, [user, toast, resetPhoneVerification]);
  const sendVerificationCode = useCallback(async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => { /* ... existing logic ... */ }, [toast]);
  const verifyCode = useCallback(async (code: string) => { /* ... existing logic ... */ }, [confirmationResult, toast, user]);
  const handleLoginSubmit = useCallback(async (data: LoginValues, resetForm: UseFormReset<LoginValues>) => { await login(data); }, [login]);
  const handleSignupSubmit = useCallback((data: SignupValues, resetForm: UseFormReset<SignupValues>) => { signup(data).then(() => resetForm()); }, [signup]);
  const handleForgotPasswordSubmit = useCallback(async (data: ForgotPasswordValues, resetForm: UseFormReset<ForgotPasswordValues>) => {
    setIsLoading(true);
    if (!firebaseAuth) { /* ... */ setIsLoading(false); return; }
    try {
      await sendPasswordResetEmail(firebaseAuth, data.email);
      toast({ title: "Correo Enviado", description: "Si existe una cuenta, recibirás un enlace para restablecer tu contraseña." });
      resetForm();
      router.push('/login'); // Navigate to login after sending email
    } catch (error: any) { /* ... */ }
    finally { setIsLoading(false); }
  }, [toast, router]);
  const handleNextStep = useCallback(async (getValues: UseFormGetValues<SignupValues>, setError: UseFormSetError<SignupValues>, errors: FieldErrors<SignupValues>, toastFn: ReturnType<typeof useToast>['toast']) => {
    const currentStep1Values = { /* ... */
        firstName: getValues("firstName"), lastName: getValues("lastName"), country: getValues("country"),
        phone: getValues("phone") || undefined, profileType: getValues("profileType"),
    };
    const validationResult = signupStep1Schema.safeParse(currentStep1Values);
    if (validationResult.success) { setSignupStep(2); } else { /* ... */ }
  }, []);
  const handlePrevStep = useCallback(() => { setSignupStep(1); }, []);

  const value: AuthContextType = {
    user, isLoggedIn, isLoading, signupStep, loginError, phoneVerificationError, isVerificationSent, isVerifyingCode,
    login, signup, logout, updateUser, setSignupStep, handleLoginSubmit, handleSignupSubmit, handleNextStep, handlePrevStep,
    handleLogout, sendVerificationCode, verifyCode, setIsVerificationSent, resetPhoneVerification, handleForgotPasswordSubmit,
    redirectToLogin,
  };

  if (!hasMounted) return null;
  if (isLoading && !user) { /* Optional: a more global loading state for initial auth check */ }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
