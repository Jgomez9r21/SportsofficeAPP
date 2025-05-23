
"use client";

import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldErrors, type UseFormReset, type UseFormTrigger, type UseFormGetValues, type UseFormSetError } from "react-hook-form";
import { z } from "zod";
import Image from 'next/image';
import logoImage from '@/image/iconologo.png'; 
import logotexto from '@/image/logoo.png';

// ruta footer
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
import { Home, Settings, CreditCard, User as UserIcon, CalendarDays, Heart, UploadCloud, Search as SearchIcon, UserCircle, X as XIcon, Eye, EyeOff, ChevronLeft, ChevronRight, LogIn, Dumbbell, Menu, ArrowRight, Building, Waves, LayoutGrid, FileText, ShieldCheck } from "lucide-react";

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
  {
    title: "Servicios Job",
    href: "/",
    icon: Home,
    tooltip: "Explora servicios profesionales"
  },
  {
    title: "Espacios Deportivos",
    href: "/sports-facilities",
    icon: Building,
    tooltip: "Encuentra instalaciones deportivas"
  },
  {
    title: "Publicar",
    href: "/post-job",
    icon: UploadCloud,
    tooltip: "Publica tus servicios o espacios"
  },
  {
    title: "Mis Reservas",
    href: "/book-service",
    icon: CalendarDays,
    tooltip: "Gestiona tus reservas"
  },
  {
    title: "Mis Favoritos",
    href: "/favorites",
    icon: Heart,
    tooltip: "Servicios y espacios guardados"
  },
  {
    title: "Facturación",
    href: "/billing",
    icon: CreditCard,
    tooltip: "Consulta tu historial de facturación"
  },
  {
    title: "Configuración",
    href: "/settings",
    icon: Settings,
    tooltip: "Ajusta tu perfil y preferencias"
  },
];


const countries = [
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "BR", name: "Brasil", flag: "🇧🇷" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "CU", name: "Cuba", flag: "🇨🇺" },
  { code: "DO", name: "República Dominicana", flag: "🇩🇴" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "ES", name: "España", flag: "🇪🇸" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "PA", name: "Panamá", flag: "🇵🇦" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "PE", name: "Perú", flag: "🇵🇪" },
  { code: "PR", name: "Puerto Rico", flag: "🇵🇷" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸" },
];

const documentTypes = [
    { value: "cc", label: "Cédula de Ciudadanía" },
    { value: "ce", label: "Cédula de Extranjería" },
    { value: "passport", label: "Pasaporte" },
    { value: "other", label: "Otro" },
]

const genders = [
    { value: "male", label: "Masculino" },
    { value: "female", label: "Femenino" },
    { value: "other", label: "Otro" },
    { value: "prefer_not_say", label: "Prefiero no decir" },
]

const profileTypes = [
    { value: "usuario", label: "Usuario (Busco servicios/espacios)" },
    { value: "profesional", label: "Profesional (Ofrezco servicios)" },
    { value: "propietario_espacio", label: "Propietario (Ofrezco espacios deportivos)"},
]


const phoneValidation = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Número inválido. Debe estar en formato E.164 (ej: +573001234567).')
  .optional()
  .or(z.literal(""));


const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido.").min(1, "El correo es requerido."),
  password: z.string().min(1, "La contraseña es requerida."),
});
type LoginValues = z.infer<typeof loginSchema>;

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


const AuthDialogContent = () => {
  const {
    user,
    isLoggedIn,
    isLoading: authIsLoading,
    currentView,
    loginError,
    handleLoginSubmit: contextHandleLoginSubmit,
    signupStep,
    handleSignupSubmit: contextHandleSignupSubmit,
    handleNextStep: contextHandleNextStep,
    handlePrevStep: contextHandlePrevStep,
    isVerificationSent,
    phoneVerificationError,
    isVerifyingCode,
    resetPhoneVerification,
    sendVerificationCode,
    verifyCode,
    handleForgotPasswordSubmit: contextHandleForgotPasswordSubmit,
    setCurrentView,
    handleLogout,
    handleOpenChange, 
    openLoginDialog, 
    openProfileDialog, 
   } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const { toast } = useToast();


  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      country: "CO",
      phone: "",
      profileType: "",
      dob: null,
      gender: "",
      documentType: "",
      documentNumber: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const forgotPasswordForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });


   const handleLoginSubmit = (data: LoginValues) => {
     contextHandleLoginSubmit(data, loginForm.reset);
   };

    const handleSignupSubmit = (data: SignupValues) => {
      contextHandleSignupSubmit(data, signupForm.reset);
    };

    const handleNextStepClick = async () => {
      await contextHandleNextStep(
        signupForm.getValues,
        signupForm.setError,
        signupForm.formState.errors,
        toast
      );
    };

     const handlePrevStep = () => {
       contextHandlePrevStep();
       signupForm.clearErrors(['dob', 'gender', 'documentType', 'documentNumber', 'email', 'password', 'confirmPassword']);
   };

   const handleForgotPasswordSubmit = (data: ForgotPasswordValues) => {
    contextHandleForgotPasswordSubmit(data, forgotPasswordForm.reset);
  };

  const handlePhoneSendVerification = useCallback(async () => {
    const phoneNumber = signupForm.getValues("phone");
    if (!phoneNumber || !phoneValidation.safeParse(phoneNumber).success) {
      signupForm.setError("phone", { type: "manual", message: "Número de teléfono inválido para verificación." });
      return;
    }
    if (!firebaseApp) {
      toast({ title: "Error de Firebase", description: "La aplicación Firebase no está inicializada.", variant: "destructive" });
      return;
    }
    if (!recaptchaVerifierRef.current) {
      toast({ title: "Error de reCAPTCHA", description: "reCAPTCHA no está listo. Intenta de nuevo.", variant: "destructive" });
      return;
    }
    await sendVerificationCode(phoneNumber, recaptchaVerifierRef.current);
  }, [signupForm, sendVerificationCode, toast]);

  const handlePhoneVerifyCode = useCallback(async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({ title: "Error", description: "Ingresa un código de 6 dígitos.", variant: "destructive" });
      return;
    }
    await verifyCode(verificationCode);
    setVerificationCode("");
  }, [verificationCode, verifyCode, toast]);


  useEffect(() => {
    let verifier: RecaptchaVerifier | null = null;
    if (!firebaseApp) {
        console.warn("Firebase App (firebaseApp) is not initialized. Cannot set up reCAPTCHA for login/signup dialog.");
        return;
    }
    const authInstance = getAuth(firebaseApp);

    if (recaptchaContainerRef.current && !recaptchaVerifierRef.current && !authIsLoading && authInstance && (currentView === 'signup' && signupStep === 2)) {
      try {
        verifier = new RecaptchaVerifier(authInstance, recaptchaContainerRef.current, {
          'size': 'invisible',
          'callback': (response: any) => { console.log("reCAPTCHA solved:", response); },
          'expired-callback': () => {
            console.log("reCAPTCHA expired");
            toast({ title: "reCAPTCHA Expirado", description: "Por favor, intenta verificar de nuevo.", variant: "destructive" });
            resetPhoneVerification();
            recaptchaVerifierRef.current?.render().catch(err => console.error("reCAPTCHA re-render error:", err));
          }
        });
        verifier.render().then(widgetId => {
          console.log("reCAPTCHA rendered, widgetId:", widgetId);
          recaptchaVerifierRef.current = verifier;
        }).catch(err => {
          console.error("reCAPTCHA render error:", err);
          toast({ title: "Error de reCAPTCHA", description: "No se pudo inicializar la verificación reCAPTCHA.", variant: "destructive" });
        });
      } catch (error) {
        console.error("Error creating RecaptchaVerifier:", error);
        toast({ title: "Error de reCAPTCHA", description: "Error al crear el verificador reCAPTCHA.", variant: "destructive" });
      }
    }
    return () => { verifier?.clear(); recaptchaVerifierRef.current = null; };
  }, [authIsLoading, toast, resetPhoneVerification, currentView, signupStep]);

 
  const router = useRouter();

  const goToSettings = () => {
      handleOpenChange(false);
      router.push('/settings');
  };

   const currentYear = getYear(new Date());

  if (isLoggedIn && user) {
    return (
      <ShadDialogContent className="p-0 overflow-hidden w-[calc(100%-2rem)] max-w-sm">
         <ScrollArea className="max-h-[85vh] p-6">
          <div>
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
              <p><span className="font-medium text-muted-foreground">Fecha de Nacimiento:</span> {user.dob ? format(new Date(user.dob), "PPP", {locale: es}) : 'No especificada'}</p>
              {user.profileType && <p><span className="font-medium text-muted-foreground">Tipo de Perfil:</span> {profileTypes.find(p => p.value === user.profileType)?.label || user.profileType}</p>}
            </div>
            <ShadDialogFooter className="mt-6 pt-4 border-t flex-col sm:flex-row sm:justify-between gap-2">
              <Button variant="outline" onClick={goToSettings} className="w-full sm:w-auto">Configuración</Button>
               <ShadDialogDialogClose asChild>
                  <Button variant="destructive" onClick={handleLogout} className="w-full sm:w-auto">Cerrar Sesión</Button>
               </ShadDialogDialogClose>
            </ShadDialogFooter>
          </div>
        </ScrollArea>
      </ShadDialogContent>
    );
  }

  return (
      <ShadDialogContent className="p-0 overflow-hidden w-[calc(100%-2rem)] max-w-sm">
         <ScrollArea className="max-h-[85vh] p-4 sm:p-6"> 
           <div>
              {currentView === 'login' && (
                <>
                  <ShadDialogHeader className="mb-4 text-center">
                    <ShadDialogTitle className="text-2xl">Ingresar</ShadDialogTitle>
                    <ShadDialogDescription>
                      Ingresa tu correo y contraseña para continuar.
                    </ShadDialogDescription>
                  </ShadDialogHeader>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Correo</FormLabel>
                            <FormControl>
                              <Input placeholder="tu@correo.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                             <FormControl>
                              <div className="relative">
                                  <Input type={showPassword ? "text" : "password"} placeholder="Ingresar la contraseña" {...field} />
                                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                      <span className="sr-only">{showPassword ? "Ocultar" : "Mostrar"} contraseña</span>
                                  </Button>
                              </div>
                            </FormControl>
                            {loginError && <p className="text-sm font-medium text-destructive pt-1">{loginError}</p>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <Button type="button" variant="link" onClick={() => { setCurrentView('forgotPassword'); loginForm.reset(); resetPhoneVerification(); }} className="p-0 h-auto text-sm text-primary">
                          ¿Olvidaste tu contraseña?
                        </Button>
                      <ShadDialogFooter className="flex flex-row justify-between items-center pt-4 border-t mt-6">
                        <Button type="button" variant="link" onClick={() => { setCurrentView('signup'); signupForm.reset(); resetPhoneVerification(); }} className="p-0 h-auto text-sm">
                          ¿No tienes cuenta? Crear una
                        </Button>
                        <Button type="submit" disabled={loginForm.formState.isSubmitting || authIsLoading}>
                          {loginForm.formState.isSubmitting || authIsLoading ? "Ingresando..." : "Ingresar"}
                        </Button>
                      </ShadDialogFooter>
                    </form>
                  </Form>
                </>
              )}
              {currentView === 'signup' && (
                <>
                  <ShadDialogHeader className="mb-4 text-center">
                    <ShadDialogTitle className="text-2xl">Crear Cuenta</ShadDialogTitle>
                     <ShadDialogDescription>
                       Completa el formulario para crear tu cuenta. Paso {signupStep} de 2.
                     </ShadDialogDescription>
                  </ShadDialogHeader>
                  <div ref={recaptchaContainerRef} id="recaptcha-container-signup"></div>
                  <Form {...signupForm}>
                     <form
                        onSubmit={signupStep === 2 ? signupForm.handleSubmit(handleSignupSubmit) : (e) => e.preventDefault()}
                        className="space-y-4"
                      >
                         {signupStep === 1 && (
                           <div className="space-y-4">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <FormField control={signupForm.control} name="firstName" render={({ field }) => (
                                 <FormItem> <FormLabel>Nombre</FormLabel> <FormControl><Input placeholder="Tu nombre" {...field} /></FormControl> <FormMessage /> </FormItem>
                               )}/>
                               <FormField control={signupForm.control} name="lastName" render={({ field }) => (
                                 <FormItem> <FormLabel>Apellido</FormLabel> <FormControl><Input placeholder="Tu apellido" {...field} /></FormControl> <FormMessage /> </FormItem>
                               )}/>
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <FormField control={signupForm.control} name="country" render={({ field }) => (
                                 <FormItem>
                                  <FormLabel>País</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value} defaultValue="CO">
                                     <FormControl>
                                          <SelectTriggerShad><SelectValue placeholder="Selecciona tu país" /></SelectTriggerShad>
                                     </FormControl>
                                      <SelectContent>{countries.map((country) => (<SelectItem key={country.code} value={country.code}><span className="mr-2">{country.flag}</span>{country.name}</SelectItem>))}</SelectContent>
                                    </Select>
                                  <FormMessage />
                                 </FormItem>
                               )}/>
                               <FormField control={signupForm.control} name="phone" render={({ field }) => (
                                 <FormItem> <FormLabel>Teléfono (Opcional)</FormLabel> <FormControl><Input type="tel" placeholder="+573001234567" {...field} /></FormControl> <FormMessage /> </FormItem>
                               )}/>
                             </div>
                             <FormField control={signupForm.control} name="profileType" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de perfil</FormLabel>
                                     <Select onValueChange={field.onChange} value={field.value}>
                                         <FormControl>
                                             <SelectTriggerShad><SelectValue placeholder="Selecciona tu tipo de perfil" /></SelectTriggerShad>
                                         </FormControl>
                                         <SelectContent>{profileTypes.map((type) => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}</SelectContent>
                                     </Select>
                                    <FormMessage />
                                </FormItem>
                             )}/>
                           </div>
                         )}

                         {signupStep === 2 && (
                           <div className="space-y-4">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <FormField control={signupForm.control} name="dob" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                  <FormLabel>Fecha de Nacimiento</FormLabel>
                                  <Popover>
                                      <PopoverTriggerShad asChild>
                                          <FormControl>
                                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                              <CalendarDays className="mr-2 h-4 w-4"/>
                                              {field.value ? format(new Date(field.value), "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                            </Button>
                                          </FormControl>
                                      </PopoverTriggerShad>
                                      <PopoverContent className="w-auto p-0" align="start">
                                          <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus captionLayout="dropdown-buttons" fromYear={1900} toYear={currentYear} locale={es}/>
                                      </PopoverContent>
                                  </Popover>
                                  <FormMessage />
                                </FormItem>
                               )}/>
                               <FormField control={signupForm.control} name="gender" render={({ field }) => (
                                 <FormItem>
                                  <FormLabel>Género (Opcional)</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                     <FormControl>
                                          <SelectTriggerShad><SelectValue placeholder="Selecciona tu género" /></SelectTriggerShad>
                                     </FormControl>
                                      <SelectContent>{genders.map((gender) => (<SelectItem key={gender.value} value={gender.value}>{gender.label}</SelectItem>))}</SelectContent>
                                    </Select>
                                  <FormMessage />
                                 </FormItem>
                               )}/>
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <FormField control={signupForm.control} name="documentType" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tipo de documento (Opcional)</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                     <FormControl>
                                          <SelectTriggerShad><SelectValue placeholder="Selecciona tipo" /></SelectTriggerShad>
                                     </FormControl>
                                      <SelectContent>{documentTypes.map((docType) => (<SelectItem key={docType.value} value={docType.value}>{docType.label}</SelectItem>))}</SelectContent>
                                    </Select>
                                  <FormMessage />
                                 </FormItem>
                               )}/>
                               <FormField control={signupForm.control} name="documentNumber" render={({ field }) => (
                                 <FormItem> <FormLabel>Número de documento (Opcional)</FormLabel> <FormControl><Input placeholder="Número de documento" {...field} /></FormControl> <FormMessage /> </FormItem>
                               )}/>
                             </div>
                             <FormField control={signupForm.control} name="email" render={({ field }) => (
                               <FormItem> <FormLabel>Correo</FormLabel> <FormControl><Input type="email" placeholder="tu@correo.com" {...field} /></FormControl> <FormMessage /> </FormItem>
                             )}/>
                              <FormField control={signupForm.control} name="password" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Contraseña</FormLabel>
                                      <FormControl>
                                          <div className="relative">
                                              <Input type={showPassword ? "text" : "password"} placeholder="Crea una contraseña (mín. 6 caract.)" {...field} />
                                              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                              </Button>
                                          </div>
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}/>

                              <FormField control={signupForm.control} name="confirmPassword" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Confirmar Contraseña</FormLabel>
                                      <FormControl>
                                           <div className="relative">
                                              <Input type={showConfirmPassword ? "text" : "password"} placeholder="Confirma tu contraseña" {...field} />
                                              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                              </Button>
                                          </div>
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}/>
                               {signupForm.getValues("phone") && !isVerificationSent && !(user?.isPhoneVerified && signupForm.getValues("phone") === user?.phone) && (
                                 <Button type="button" variant="outline" className="w-full mt-2" onClick={handlePhoneSendVerification} disabled={authIsLoading || isVerifyingCode}>
                                   Enviar código SMS para verificar teléfono
                                 </Button>
                               )}
                               {isVerificationSent && (
                                 <div className="mt-2 space-y-2 p-3 border rounded-md bg-muted/50">
                                   <Label htmlFor="signup-verification-code">Ingresa el código SMS</Label>
                                   <div className="flex items-center gap-2">
                                     <Input id="signup-verification-code" type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="123456" maxLength={6} className="flex-1"/>
                                     <Button type="button" onClick={handlePhoneVerifyCode} disabled={isVerifyingCode || verificationCode.length !== 6 || authIsLoading}>
                                       {isVerifyingCode ? "Verificando..." : "Confirmar"}
                                     </Button>
                                   </div>
                                   {phoneVerificationError && <p className="text-sm font-medium text-destructive mt-1">{phoneVerificationError}</p>}
                                 </div>
                               )}
                           </div>
                         )}
                          {loginError && <p className="text-sm font-medium text-destructive pt-1">{loginError}</p>}

                          <ShadDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between items-center pt-4 border-t mt-6">
                             <Button type="button" variant="link" onClick={() => { setCurrentView('login'); signupForm.reset(); resetPhoneVerification(); }} className="p-0 h-auto text-sm order-2 sm:order-1">
                                ¿Ya tienes cuenta? Ingresar
                             </Button>
                             <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
                                 {signupStep === 2 && (
                                     <Button type="button" variant="outline" onClick={handlePrevStep} className="w-full sm:w-auto">
                                         Anterior
                                     </Button>
                                 )}
                                 {signupStep === 1 ? (
                                     <Button type="button" onClick={handleNextStepClick} className="w-full sm:w-auto">
                                         Siguiente
                                     </Button>
                                 ) : (
                                     <Button type="submit" className="w-full sm:w-auto" disabled={signupForm.formState.isSubmitting || authIsLoading}>
                                         {signupForm.formState.isSubmitting || authIsLoading ? "Creando..." : "Crear Cuenta"}
                                     </Button>
                                 )}
                             </div>
                          </ShadDialogFooter>
                    </form>
                    </Form>
                </>
              )}

              {currentView === 'forgotPassword' && (
                <>
                  <ShadDialogHeader className="mb-4 text-center">
                    <ShadDialogTitle className="text-2xl">Recuperar Contraseña</ShadDialogTitle>
                    <ShadDialogDescription>
                      Ingresa tu correo electrónico para enviarte un enlace de recuperación.
                    </ShadDialogDescription>
                  </ShadDialogHeader>
                   <Form {...forgotPasswordForm}>
                     <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPasswordSubmit)} className="space-y-4">
                       <FormField
                         control={forgotPasswordForm.control}
                         name="email"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Correo</FormLabel>
                             <FormControl>
                               <Input placeholder="tu@correo.com" {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                       <ShadDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between items-center pt-4 border-t mt-6">
                         <Button type="button" variant="link" onClick={() => { setCurrentView('login'); forgotPasswordForm.reset(); }} className="p-0 h-auto text-sm order-2 sm:order-1">
                           Volver a Ingresar
                         </Button>
                         <Button type="submit" className="order-1 sm:order-2 w-full sm:w-auto" disabled={forgotPasswordForm.formState.isSubmitting || authIsLoading}>
                           {forgotPasswordForm.formState.isSubmitting || authIsLoading ? "Enviando..." : "Enviar Enlace"}
                         </Button>
                       </ShadDialogFooter>
                     </form>
                   </Form>
                </>
              )}
             </div>
       </ScrollArea>
     </ShadDialogContent>
  );
};


export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const {
    user,
    isLoggedIn,
    showLoginDialog,
    showProfileDialog,
    handleOpenChange,
    openLoginDialog,
    openProfileDialog,
   } = useAuth();
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  
  const handleMobileSheetOpenChange = (open: boolean) => {
    setIsMobileSheetOpen(open);
  };

  return (
      <>
          <div className="flex h-screen overflow-hidden">
            <Sidebar className="hidden lg:flex flex-col flex-shrink-0 border-r bg-sidebar text-sidebar-foreground" side="left" variant="sidebar" collapsible="icon">
               <DesktopSidebarHeader className="p-2 border-b flex items-center gap-2 justify-start group-data-[collapsible=icon]:justify-center flex-shrink-0 h-14">
                  <Image
                      src={logotexto}
                      alt="Sportoffice Logo"
                      className="h-8 w-auto group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-auto transition-all"
                      data-ai-hint="sportoffice logo"
                      priority
                  />
                
              </DesktopSidebarHeader>
              <SidebarContent className="flex-grow p-2 overflow-y-auto">
                <SidebarMenu>
                  {navegacion.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        href={item.href}
                        isActive={pathname === item.href}
                        tooltip={item.tooltip}
                        className={cn(
                           "h-10 p-2 text-sidebar-foreground",
                           pathname === item.href
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "hover:bg-sidebar-accent/10"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                         <span className="overflow-hidden whitespace-nowrap transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:sr-only">
                            {item.title}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarContent>
              <SidebarFooter className="p-2 border-t flex flex-col gap-2 flex-shrink-0">
                {isLoggedIn && user ? (
                  <Button variant="ghost" onClick={openProfileDialog} className="flex items-center gap-2 cursor-pointer hover:bg-sidebar-accent/10 p-1 rounded-md overflow-hidden w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:rounded-md">
                    <Avatar className="h-8 w-8 flex-shrink-0 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.name} data-ai-hint="user avatar placeholder" />
                      <AvatarFallback>{user.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col text-sm text-left transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:sr-only">
                      <span className="font-semibold truncate">{user.name}</span>
                    </div>
                  </Button>
                ) : (
                   <Button
                     onClick={openLoginDialog}
                     variant="accent"
                     className="w-full justify-start text-sm h-10 px-3 py-2 bg-accent text-accent-foreground hover:bg-accent/90 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:justify-center"
                   >
                     <ArrowRight className="mr-2 h-4 w-4 group-data-[collapsible=icon]:mr-0" />
                     <span className="overflow-hidden whitespace-nowrap transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:sr-only">
                       Ingresar / Crear Cuenta
                     </span>
                     <span className="sr-only group-data-[collapsible!=icon]:hidden">
                       Ingresar
                     </span>
                   </Button>
                )}
              </SidebarFooter>
            </Sidebar>

            <div className="flex flex-col flex-1 overflow-hidden">
               <header className="sticky top-0 z-10 flex h-14 items-center justify-start border-b bg-background px-3 sm:px-4 lg:hidden flex-shrink-0">
                  <Sheet open={isMobileSheetOpen} onOpenChange={handleMobileSheetOpenChange}>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="-ml-2 sm:ml-0">
                           <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
                          <span className="sr-only">Alternar menú</span>
                        </Button>
                      </SheetTrigger>
                       <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
                          <Image
                            src={logoImage}
                            alt="Sportoffice Logo"
                            className="h-7 sm:h-8 w-auto"
                            data-ai-hint="sportoffice logo small"
                            priority
                          />
                           <h3 className="font-semibold text-primary text-base sm:text-lg leading-none">Sportoffice</h3>
                      </div>
                      <SheetContent side="left" className="w-60 p-0 bg-sidebar text-sidebar-foreground flex flex-col">
                           <SheetHeader className="p-4 border-b flex items-center justify-between h-14 flex-shrink-0">
                               <div className="flex items-center gap-2">
                                <Image src={logoImage} alt="Sportoffice Logo" className="h-8 w-auto" data-ai-hint="sportoffice logo menu" priority />
                                 <SheetTitle className="text-lg font-semibold text-primary">Sportoffice</SheetTitle>
                               </div>
                               <SheetClose asChild>
                                  <Button variant="ghost" size="icon" className="text-sidebar-foreground">
                                    <XIcon className="h-5 w-5" />
                                    <span className="sr-only">Cerrar menú</span>
                                  </Button>
                                </SheetClose>
                          </SheetHeader>
                          <ScrollArea className="flex-grow">
                              <SidebarContent className="p-2">
                                   <SidebarMenu>
                                      {navegacion.map((item) => (
                                      <SidebarMenuItem key={item.title}>
                                          <SidebarMenuButton
                                              href={item.href}
                                              isActive={pathname === item.href}
                                              onClick={() => setIsMobileSheetOpen(false)}
                                              className={cn(
                                                "text-sm h-10 px-3 text-sidebar-foreground",
                                                 pathname === item.href ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/10"
                                              )}
                                          >
                                              <item.icon className="h-4 w-4" />
                                              {item.title}
                                          </SidebarMenuButton>
                                      </SidebarMenuItem>
                                      ))}
                                   </SidebarMenu>
                              </SidebarContent>
                          </ScrollArea>
                           <SidebarFooter className="p-2 border-t flex-shrink-0">
                               {isLoggedIn && user ? (
                                    <Button variant="ghost" onClick={() => { openProfileDialog(); setIsMobileSheetOpen(false); }} className="flex items-center gap-2 p-1 rounded-md w-full justify-start">
                                        <Avatar className="h-8 w-8"><AvatarImage src={user.avatarUrl || undefined} alt={user.name} data-ai-hint="user avatar small" /><AvatarFallback>{user.initials}</AvatarFallback></Avatar>
                                        <span className="font-medium truncate">{user.name}</span>
                                    </Button>
                                ) : (
                                    <Button
                                      onClick={() => { openLoginDialog(); setIsMobileSheetOpen(false); }}
                                      variant="accent"
                                      className="w-full justify-start h-10 px-3 bg-accent text-accent-foreground hover:bg-accent/90"
                                    >
                                       <ArrowRight className="mr-2 h-4 w-4" /> Ingresar / Crear Cuenta
                                    </Button>
                                )}
                           </SidebarFooter>
                      </SheetContent>
                  </Sheet>
               </header>

              <SidebarInset className="flex-1 overflow-auto flex flex-col">
                  <div className="flex-grow">
                    {children}
                  </div>
               {/*footer*/}
               <Footer /> 
              </SidebarInset>
            </div>
          </div>
          <Dialog open={(showLoginDialog || showProfileDialog)} onOpenChange={handleOpenChange}>
            <AuthDialogContent />
          </Dialog>
          <Toaster />
      </>
  );
}
