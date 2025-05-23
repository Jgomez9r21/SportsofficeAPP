
"use client";

import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation'; // useRouter from next/navigation
import Link from 'next/link';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldErrors, type UseFormReset, type UseFormTrigger, type UseFormGetValues, type UseFormSetError } from "react-hook-form";
import { z } from "zod";
import Image from 'next/image';
import logoImage from '@/image/iconologo.png';
import logotexto from '@/image/logoo.png';

import Footer from '@/components/ui/footer';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader as DesktopSidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "../components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Toaster } from "@/components/ui/toaster";
import { Home, Settings, CreditCard, CalendarDays, Heart, UploadCloud, Building, LogIn, Menu, ArrowRight, X as XIcon, Eye, EyeOff, CalendarIcon as CalendarDaysIcon, AlertTriangle, UserCircle, Loader2 } from "lucide-react"; // Added Loader2

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent as ShadDialogContent,
  DialogDescription as ShadDialogDescription,
  DialogFooter as ShadDialogFooter,
  DialogHeader as ShadDialogHeader,
  DialogTitle as ShadDialogTitle,
  DialogClose as ShadDialogDialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger as SelectTriggerShad, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger as PopoverTriggerShad } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, getYear } from "date-fns";
import { es } from 'date-fns/locale';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, type ForgotPasswordValues } from '@/context/AuthContext';
import { RecaptchaVerifier, getAuth } from 'firebase/auth';
import { app as firebaseApp } from '@/lib/firebase';


const navegacion = [
  { title: "Servicios Job", href: "/", icon: Home, tooltip: "Explora servicios profesionales" },
  { title: "Espacios Deportivos", href: "/sports-facilities", icon: Building, tooltip: "Encuentra instalaciones deportivas" },
  { title: "Publicar", href: "/post-job", icon: UploadCloud, tooltip: "Publica tus servicios o espacios" },
  { title: "Mis Reservas", href: "/book-service", icon: CalendarDays, tooltip: "Gestiona tus reservas" },
  { title: "Mis Favoritos", href: "/favorites", icon: Heart, tooltip: "Servicios y espacios guardados" },
  { title: "Facturación", href: "/billing", icon: CreditCard, tooltip: "Consulta tu historial de facturación" },
  { title: "Configuración", href: "/settings", icon: Settings, tooltip: "Ajusta tu perfil y preferencias" },
];

// These are used in AuthDialogContent, so keeping them here for now
const countries = [
  { code: "AR", name: "Argentina", flag: "🇦🇷" }, { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "BR", name: "Brasil", flag: "🇧🇷" }, { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" }, { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "CU", name: "Cuba", flag: "🇨🇺" }, { code: "DO", name: "República Dominicana", flag: "🇩🇴" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" }, { code: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "ES", name: "España", flag: "🇪🇸" }, { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "HN", name: "Honduras", flag: "🇭🇳" }, { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮" }, { code: "PA", name: "Panamá", flag: "🇵🇦" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" }, { code: "PE", name: "Perú", flag: "🇵🇪" },
  { code: "PR", name: "Puerto Rico", flag: "🇵🇷" }, { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" }, { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸" },
];
const documentTypes = [
  { value: "cc", label: "Cédula de Ciudadanía" }, { value: "ce", label: "Cédula de Extranjería" },
  { value: "passport", label: "Pasaporte" }, { value: "other", label: "Otro" },
];
const genders = [
  { value: "male", label: "Masculino" }, { value: "female", label: "Femenino" },
  { value: "other", label: "Otro" }, { value: "prefer_not_say", label: "Prefiero no decir" },
];
const profileTypes = [
  { value: "usuario", label: "Usuario (Busco servicios/espacios)" },
  { value: "profesional", label: "Profesional (Ofrezco servicios)" },
  { value: "propietario_espacio", label: "Propietario (Ofrezco espacios deportivos)" },
];
const phoneValidation = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Número inválido. Debe estar en formato E.164 (ej: +573001234567).')
  .optional().or(z.literal(""));

const loginSchema = z.object({ email: z.string().email("Correo inválido.").min(1, "Requerido."), password: z.string().min(1, "Requerido.") });
type LoginValues = z.infer<typeof loginSchema>;
const signupStep1Schema = z.object({
  firstName: z.string().min(2, "Mín. 2 caracteres."), lastName: z.string().min(2, "Mín. 2 caracteres."),
  country: z.string().min(1, "Selecciona país.").default("CO"), phone: phoneValidation,
  profileType: z.string().min(1, "Selecciona tipo."),
});
const baseSignupStep2Schema = z.object({
  dob: z.date({ required_error: "Requerido." }).optional().nullable(), gender: z.string().optional(),
  documentType: z.string().optional(), documentNumber: z.string().optional(),
  email: z.string().email("Correo inválido.").min(1, "Requerido."),
  password: z.string().min(6, "Mín. 6 caracteres."), confirmPassword: z.string().min(6, "Mín. 6 caracteres."),
});
const signupSchema = signupStep1Schema.merge(baseSignupStep2Schema)
  .refine(data => data.password === data.confirmPassword, { message: "Contraseñas no coinciden.", path: ["confirmPassword"] });
type SignupValues = z.infer<typeof signupSchema>;
const forgotPasswordSchema = z.object({ email: z.string().email("Correo inválido.").min(1, "Requerido.") });

const AuthDialogContent = () => {
  const {
    user, isLoggedIn, isLoading: authIsLoading, currentView, loginError,
    handleLoginSubmit: contextHandleLoginSubmit, signupStep,
    handleSignupSubmit: contextHandleSignupSubmit, handleNextStep: contextHandleNextStep,
    handlePrevStep: contextHandlePrevStep, isVerificationSent, phoneVerificationError,
    isVerifyingCode, resetPhoneVerification, sendVerificationCode, verifyCode,
    handleForgotPasswordSubmit: contextHandleForgotPasswordSubmit, setCurrentView, handleLogout,
    handleOpenChange
  } = useAuth();
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const { toast } = useToast();

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "", lastName: "", country: "CO", phone: "", profileType: "",
      dob: null, gender: "", documentType: "", documentNumber: "", email: "", password: "", confirmPassword: "",
    },
    mode: "onChange",
  });
  const forgotPasswordForm = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  const onLoginSubmit = (data: LoginValues) => contextHandleLoginSubmit(data, loginForm.reset);
  const onSignupSubmit = (data: SignupValues) => contextHandleSignupSubmit(data, signupForm.reset);
  const onNextStepClick = async () => contextHandleNextStep(signupForm.getValues, signupForm.setError, signupForm.formState.errors, toast);
  const onForgotPasswordSubmit = (data: ForgotPasswordValues) => contextHandleForgotPasswordSubmit(data, forgotPasswordForm.reset);

  useEffect(() => {
    let verifier: RecaptchaVerifier | null = null;
    if (currentView === 'signup' && signupStep === 2 && firebaseApp && recaptchaContainerRef.current && !recaptchaVerifierRef.current && !authIsLoading) {
      const authInstance = getAuth(firebaseApp);
      try {
        verifier = new RecaptchaVerifier(authInstance, recaptchaContainerRef.current, { size: 'invisible' });
        verifier.render().then(() => recaptchaVerifierRef.current = verifier);
      } catch (e) { console.error("reCAPTCHA render error (dialog):", e); }
    }
    return () => { verifier?.clear(); recaptchaVerifierRef.current = null; };
  }, [authIsLoading, currentView, signupStep]);

  const handlePhoneSendVerification = async () => {
    const phoneNumber = signupForm.getValues("phone");
    if (!phoneNumber || !phoneValidation.safeParse(phoneNumber).success) {
      signupForm.setError("phone", { type: "manual", message: "Número inválido." }); return;
    }
    if (!recaptchaVerifierRef.current) { toast({ title: "reCAPTCHA no listo.", variant: "destructive" }); return; }
    await sendVerificationCode(phoneNumber, recaptchaVerifierRef.current);
  };
  const handlePhoneVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) { toast({ title: "Código de 6 dígitos requerido.", variant: "destructive" }); return; }
    await verifyCode(verificationCode); setVerificationCode("");
  };

  if (isLoggedIn && user) {
    return (
      <ShadDialogContent className="p-0 overflow-hidden w-[calc(100%-2rem)] max-w-sm">
        <ScrollArea className="max-h-[85vh] p-6">
          <ShadDialogHeader className="text-center mb-4">
            <div className="flex flex-col items-center mb-3">
              <Avatar className="h-20 w-20 mb-2 border-2 border-primary">
                <AvatarImage src={user.avatarUrl || undefined} alt={user.name} data-ai-hint="user avatar large" />
                <AvatarFallback className="text-2xl">{user.initials ?? 'U'}</AvatarFallback>
              </Avatar>
              <ShadDialogTitle className="text-xl">{user.name}</ShadDialogTitle>
              <ShadDialogDescription className="text-sm">{user.email}</ShadDialogDescription>
            </div>
          </ShadDialogHeader>
          <div className="py-2 space-y-1 text-sm">
            <p><span className="font-medium text-muted-foreground">País:</span> {countries.find(c => c.code === user.country)?.name || user.country || 'No especificado'}</p>
            <p><span className="font-medium text-muted-foreground">Teléfono:</span> {user.phone || 'No especificado'} {user.phone && (user.isPhoneVerified ? <span className="text-green-600 text-xs ml-1">(Verificado)</span> : <span className="text-orange-600 text-xs ml-1">(No verificado)</span>)}</p>
            <p><span className="font-medium text-muted-foreground">Nacimiento:</span> {user.dob ? format(new Date(user.dob), "PPP", { locale: es }) : 'N/A'}</p>
            {user.profileType && <p><span className="font-medium text-muted-foreground">Perfil:</span> {profileTypes.find(p => p.value === user.profileType)?.label || user.profileType}</p>}
          </div>
          <ShadDialogFooter className="mt-6 pt-4 border-t flex-col sm:flex-row sm:justify-between gap-2">
            <Button variant="outline" onClick={() => { handleOpenChange(false); router.push('/settings'); }} className="w-full sm:w-auto">Configuración</Button>
            <ShadDialogDialogClose asChild><Button variant="destructive" onClick={handleLogout} className="w-full sm:w-auto">Cerrar Sesión</Button></ShadDialogDialogClose>
          </ShadDialogFooter>
        </ScrollArea>
      </ShadDialogContent>
    );
  }
  return (
    <ShadDialogContent className="p-0 overflow-hidden w-[calc(100%-2rem)] max-w-sm">
      <ScrollArea className="max-h-[85vh] p-4 sm:p-6">
        {currentView === 'login' && (
          <>
            <ShadDialogHeader className="mb-4 text-center"><ShadDialogTitle className="text-2xl">Ingresar</ShadDialogTitle><ShadDialogDescription>Correo y contraseña para continuar.</ShadDialogDescription></ShadDialogHeader>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField control={loginForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Correo</FormLabel><FormControl><Input placeholder="tu@correo.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={loginForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Contraseña</FormLabel><FormControl><div className="relative"><Input type={showPassword ? "text" : "password"} placeholder="Contraseña" {...field} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></FormControl>{loginError && <p className="text-sm text-destructive pt-1">{loginError}</p>}<FormMessage /></FormItem>)} />
                <Button type="button" variant="link" onClick={() => { setCurrentView('forgotPassword'); loginForm.reset(); resetPhoneVerification(); }} className="p-0 h-auto text-sm text-primary">¿Olvidaste contraseña?</Button>
                <ShadDialogFooter className="flex-row justify-between items-center pt-4 border-t mt-6">
                  <Button type="button" variant="link" onClick={() => { setCurrentView('signup'); signupForm.reset(); resetPhoneVerification(); }} className="p-0 h-auto text-sm">Crear cuenta</Button>
                  <Button type="submit" disabled={loginForm.formState.isSubmitting || authIsLoading}>{authIsLoading ? "Ingresando..." : "Ingresar"}</Button>
                </ShadDialogFooter>
              </form>
            </Form>
          </>
        )}
        {currentView === 'signup' && (
          <>
            <ShadDialogHeader className="mb-4 text-center"><ShadDialogTitle className="text-2xl">Crear Cuenta</ShadDialogTitle><ShadDialogDescription>Paso {signupStep} de 2.</ShadDialogDescription></ShadDialogHeader>
            <div ref={recaptchaContainerRef} id="recaptcha-container-dialog-signup"></div>
            <Form {...signupForm}>
              <form onSubmit={signupStep === 2 ? signupForm.handleSubmit(onSignupSubmit) : (e) => e.preventDefault()} className="space-y-4">
                {signupStep === 1 && (<div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={signupForm.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Tu nombre" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={signupForm.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Apellido</FormLabel><FormControl><Input placeholder="Tu apellido" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={signupForm.control} name="country" render={({ field }) => (<FormItem><FormLabel>País</FormLabel><Select onValueChange={field.onChange} value={field.value} defaultValue="CO"><FormControl><SelectTriggerShad><SelectValue placeholder="Selecciona país" /></SelectTriggerShad></FormControl><SelectContent>{countries.map(c => <SelectItem key={c.code} value={c.code}><span className="mr-2">{c.flag}</span>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={signupForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Teléfono (Opcional)</FormLabel><FormControl><Input type="tel" placeholder="+573001234567" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <FormField control={signupForm.control} name="profileType" render={({ field }) => (<FormItem><FormLabel>Tipo de perfil</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTriggerShad><SelectValue placeholder="Selecciona tipo" /></SelectTriggerShad></FormControl><SelectContent>{profileTypes.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                </div>)}
                {signupStep === 2 && (<div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={signupForm.control} name="dob" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha de Nacimiento</FormLabel><Popover><PopoverTriggerShad asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarDaysIcon className="mr-2 h-4 w-4" />{field.value ? format(new Date(field.value), "PPP", { locale: es }) : <span>Elige fecha</span>}</Button></FormControl></PopoverTriggerShad><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} disabled={d => d > new Date() || d < new Date("1900-01-01")} initialFocus captionLayout="dropdown-buttons" fromYear={1900} toYear={getYear(new Date())} locale={es} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                    <FormField control={signupForm.control} name="gender" render={({ field }) => (<FormItem><FormLabel>Género (Opcional)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTriggerShad><SelectValue placeholder="Selecciona género" /></SelectTriggerShad></FormControl><SelectContent>{genders.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={signupForm.control} name="documentType" render={({ field }) => (<FormItem><FormLabel>Tipo doc. (Opcional)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTriggerShad><SelectValue placeholder="Tipo" /></SelectTriggerShad></FormControl><SelectContent>{documentTypes.map(dt => <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={signupForm.control} name="documentNumber" render={({ field }) => (<FormItem><FormLabel>Num. doc. (Opcional)</FormLabel><FormControl><Input placeholder="Número" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <FormField control={signupForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Correo</FormLabel><FormControl><Input type="email" placeholder="tu@correo.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={signupForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Contraseña</FormLabel><FormControl><div className="relative"><Input type={showPassword ? "text" : "password"} placeholder="Mín. 6 caracteres" {...field} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={signupForm.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirmar Contraseña</FormLabel><FormControl><div className="relative"><Input type={showConfirmPassword ? "text" : "password"} placeholder="Confirma contraseña" {...field} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></FormControl><FormMessage /></FormItem>)} />
                  {signupForm.getValues("phone") && !isVerificationSent && <Button type="button" variant="outline" className="w-full mt-2" onClick={handlePhoneSendVerification} disabled={authIsLoading || isVerifyingCode}>Verificar teléfono</Button>}
                  {isVerificationSent && (<div className="mt-2 space-y-2 p-3 border rounded-md"><Label htmlFor="dialog-signup-vcode">Código SMS</Label><div className="flex gap-2"><Input id="dialog-signup-vcode" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} placeholder="123456" maxLength={6} /><Button type="button" onClick={handlePhoneVerifyCode} disabled={isVerifyingCode || verificationCode.length !== 6 || authIsLoading}>{isVerifyingCode ? "Verificando..." : "Confirmar"}</Button></div>{phoneVerificationError && <p className="text-sm text-destructive">{phoneVerificationError}</p>}</div>)}
                </div>)}
                {loginError && <p className="text-sm text-destructive pt-1">{loginError}</p>}
                <ShadDialogFooter className="flex-col sm:flex-row justify-between items-center pt-4 border-t mt-6">
                  <Button type="button" variant="link" onClick={() => { setCurrentView('login'); signupForm.reset(); resetPhoneVerification(); }} className="p-0 h-auto text-sm order-2 sm:order-1">¿Ya tienes cuenta?</Button>
                  <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
                    {signupStep === 2 && <Button type="button" variant="outline" onClick={contextHandlePrevStep} className="w-full sm:w-auto">Anterior</Button>}
                    {signupStep === 1 ? <Button type="button" onClick={onNextStepClick} className="w-full sm:w-auto">Siguiente</Button>
                                       : <Button type="submit" className="w-full sm:w-auto" disabled={signupForm.formState.isSubmitting || authIsLoading}>{authIsLoading ? "Creando..." : "Crear Cuenta"}</Button>}
                  </div>
                </ShadDialogFooter>
              </form>
            </Form>
          </>
        )}
        {currentView === 'forgotPassword' && (
          <>
            <ShadDialogHeader className="mb-4 text-center"><ShadDialogTitle className="text-2xl">Recuperar Contraseña</ShadDialogTitle><ShadDialogDescription>Ingresa tu correo para enviarte un enlace.</ShadDialogDescription></ShadDialogHeader>
            <Form {...forgotPasswordForm}>
              <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
                <FormField control={forgotPasswordForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Correo</FormLabel><FormControl><Input placeholder="tu@correo.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <ShadDialogFooter className="flex-col sm:flex-row justify-between items-center pt-4 border-t mt-6">
                  <Button type="button" variant="link" onClick={() => { setCurrentView('login'); forgotPasswordForm.reset(); }} className="p-0 h-auto text-sm order-2 sm:order-1">Volver a Ingresar</Button>
                  <Button type="submit" className="order-1 sm:order-2 w-full sm:w-auto" disabled={forgotPasswordForm.formState.isSubmitting || authIsLoading}>{authIsLoading ? "Enviando..." : "Enviar Enlace"}</Button>
                </ShadDialogFooter>
              </form>
            </Form>
          </>
        )}
      </ScrollArea>
    </ShadDialogContent>
  );
};


export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user, isLoggedIn, isLoading: authContextIsLoading, firebaseConfigError,
    showLoginDialog, showProfileDialog, handleOpenChange, openLoginDialog,
    redirectToLogin
  } = useAuth();
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  // Combine firebaseConfigError and initial auth loading for a unified loading/error state
  const displayCriticalError = firebaseConfigError;
  const displayLoadingScreen = authContextIsLoading && !firebaseConfigError;

  if (displayCriticalError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-4 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">Error Crítico de Configuración</h1>
        <p className="mb-1">Firebase no se ha inicializado correctamente.</p>
        <p className="mb-4 text-muted-foreground max-w-md">
          Asegúrate de que las variables de entorno de Firebase (<code>NEXT_PUBLIC_FIREBASE_API_KEY</code>, <code>NEXT_PUBLIC_FIREBASE_PROJECT_ID</code>, etc.)
          estén correctamente configuradas en tu archivo <code>.env.local</code> y que hayas reiniciado el servidor de desarrollo.
        </p>
        <Button onClick={() => window.location.reload()}>Intentar Recargar</Button>
        <p className="text-xs mt-4 text-muted-foreground">Consulta la consola del navegador para más detalles.</p>
      </div>
    );
  }

  if (displayLoadingScreen) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-lg font-medium text-primary">Cargando Sportoffice...</p>
        </div>
      </div>
    );
  }

  // If neither critical error nor loading, render the app layout
  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <Sidebar className="hidden lg:flex flex-col flex-shrink-0 border-r bg-sidebar text-sidebar-foreground" side="left" variant="sidebar" collapsible="icon">
          <DesktopSidebarHeader className="p-2 border-b flex items-center gap-2 justify-start group-data-[collapsible=icon]:justify-center flex-shrink-0 h-14">
            <Image src={logotexto} alt="Sportoffice Logo" className="h-8 w-auto group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-auto transition-all" data-ai-hint="sportoffice logo" priority />
          </DesktopSidebarHeader>
          <SidebarContent className="flex-grow p-2 overflow-y-auto">
            <SidebarMenu>
              {navegacion.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton href={item.href} isActive={pathname === item.href} tooltip={item.tooltip}
                    className={cn("h-10 p-2 text-sidebar-foreground", pathname === item.href ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/10")}>
                    <item.icon className="h-4 w-4" />
                    <span className="overflow-hidden whitespace-nowrap transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:sr-only">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-2 border-t flex flex-col gap-2 flex-shrink-0">
            {isLoggedIn && user ? (
              <Button variant="ghost" onClick={() => router.push('/settings')} className="flex items-center gap-2 cursor-pointer hover:bg-sidebar-accent/10 p-1 rounded-md overflow-hidden w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:rounded-md">
                <Avatar className="h-8 w-8 flex-shrink-0 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.name} data-ai-hint="user avatar placeholder" />
                  <AvatarFallback>{user.initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-sm text-left transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:sr-only">
                  <span className="font-semibold truncate">{user.name}</span>
                </div>
              </Button>
            ) : (
              <Button onClick={redirectToLogin} variant="accent"
                className="w-full justify-start text-sm h-10 px-3 py-2 bg-accent text-accent-foreground hover:bg-accent/90 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:justify-center">
                <LogIn className="mr-2 h-4 w-4 group-data-[collapsible=icon]:mr-0" />
                <span className="overflow-hidden whitespace-nowrap transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:sr-only">Ingresar</span>
                <span className="sr-only group-data-[collapsible!=icon]:hidden">Ingresar</span>
              </Button>
            )}
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-3 sm:px-4 lg:hidden flex-shrink-0">
            <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon" className="-ml-2 sm:ml-0"><Menu className="h-5 w-5 sm:h-6 sm:w-6" /><span className="sr-only">Alternar menú</span></Button></SheetTrigger>
              {/* Removed the centered logo from here, it's now inside SheetHeader */}
              <SheetContent side="left" className="w-60 p-0 bg-sidebar text-sidebar-foreground flex flex-col">
                <SheetHeader className="p-4 border-b flex items-center justify-between h-14 flex-shrink-0">
                  <div className="flex items-center gap-2"><Image src={logotexto} alt="Sportoffice Logo" className="h-7 w-auto" data-ai-hint="sportoffice logo menu" priority /><SheetTitle className="text-lg font-semibold text-primary sr-only">Sportoffice</SheetTitle></div>
                  <SheetClose asChild><Button variant="ghost" size="icon" className="text-sidebar-foreground"><XIcon className="h-5 w-5" /><span className="sr-only">Cerrar</span></Button></SheetClose>
                </SheetHeader>
                <ScrollArea className="flex-grow">
                  <SidebarContent className="p-2">
                    <SidebarMenu>
                      {navegacion.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton href={item.href} isActive={pathname === item.href} onClick={() => setIsMobileSheetOpen(false)}
                            className={cn("text-sm h-10 px-3 text-sidebar-foreground", pathname === item.href ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/10")}>
                            <item.icon className="h-4 w-4" />{item.title}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarContent>
                </ScrollArea>
                <SidebarFooter className="p-2 border-t flex-shrink-0">
                  {isLoggedIn && user ? (
                    <Button variant="ghost" onClick={() => { router.push('/settings'); setIsMobileSheetOpen(false); }} className="flex items-center gap-2 p-1 rounded-md w-full justify-start">
                      <Avatar className="h-8 w-8"><AvatarImage src={user.avatarUrl || undefined} alt={user.name} data-ai-hint="user avatar small" /><AvatarFallback>{user.initials}</AvatarFallback></Avatar>
                      <span className="font-medium truncate">{user.name}</span>
                    </Button>
                  ) : (
                    <Button onClick={() => { redirectToLogin(); setIsMobileSheetOpen(false); }} variant="accent" className="w-full justify-start h-10 px-3 bg-accent text-accent-foreground hover:bg-accent/90">
                      <LogIn className="mr-2 h-4 w-4" /> Ingresar / Crear Cuenta
                    </Button>
                  )}
                </SidebarFooter>
              </SheetContent>
            </Sheet>
             {/* Centered logo for mobile header - shown when sheet is closed */}
             {!isMobileSheetOpen && (
                <div className="flex-grow flex justify-center items-center">
                   <Link href="/" className="flex items-center gap-2" onClick={() => setIsMobileSheetOpen(false)}>
                    <Image src={logoImage} alt="Sportoffice Logo" className="h-7 sm:h-8 w-auto" data-ai-hint="sportoffice logo small" priority />
                    <h3 className="font-semibold text-primary text-base sm:text-lg leading-none sr-only sm:not-sr-only">Sportoffice</h3>
                  </Link>
                </div>
             )}
             {/* Spacer to balance the trigger button on the left, if logo is centered and sheet trigger is present */}
             <div className="w-8 h-8 sm:w-10 sm:h-10"></div>


          </header>
          <SidebarInset className="flex-1 overflow-auto flex flex-col">
            <div className="flex-grow">{children}</div>
            <Footer />
          </SidebarInset>
        </div>
      </div>
      <Dialog open={(showLoginDialog || showProfileDialog) && !isLoggedIn} onOpenChange={handleOpenChange}>
        <AuthDialogContent />
      </Dialog>
      <Toaster />
    </>
  );
}

    