
"use client";

import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, getYear } from "date-fns";
import { es } from 'date-fns/locale';
import { Eye, EyeOff, CalendarDays as CalendarIconLucide } from "lucide-react"; // Renamed CalendarDays
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { RecaptchaVerifier, getAuth } from 'firebase/auth';
import { app as firebaseApp } from '@/lib/firebase';

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
];

const genders = [
    { value: "male", label: "Masculino" },
    { value: "female", label: "Femenino" },
    { value: "other", label: "Otro" },
    { value: "prefer_not_say", label: "Prefiero no decir" },
];

const profileTypes = [
    { value: "usuario", label: "Usuario (Busco servicios/espacios)" },
    { value: "profesional", label: "Profesional (Ofrezco servicios)" },
    { value: "propietario_espacio", label: "Propietario (Ofrezco espacios deportivos)"},
];

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

export function SignupForm() {
  const {
    handleSignupSubmit: contextHandleSignupSubmit,
    signupStep,
    handleNextStep: contextHandleNextStep,
    handlePrevStep: contextHandlePrevStep,
    loginError,
    isLoading: authIsLoading,
    isVerificationSent,
    phoneVerificationError,
    isVerifyingCode,
    sendVerificationCode,
    verifyCode,
    resetPhoneVerification,
  } = useAuth();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const [verificationCode, setVerificationCode] = useState("");

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "", lastName: "", country: "CO", phone: "", profileType: "",
      dob: null, gender: "", documentType: "", documentNumber: "",
      email: "", password: "", confirmPassword: "",
    },
    mode: "onChange",
  });

  const onSubmit = (data: SignupValues) => {
    contextHandleSignupSubmit(data, form.reset);
  };

  const handleNextStepClick = async () => {
    await contextHandleNextStep(
      form.getValues,
      form.setError,
      form.formState.errors,
      toast
    );
  };
  
  const currentPhoneNumber = form.watch("phone");
  const isPhoneValidAndPresent = currentPhoneNumber && phoneValidation.safeParse(currentPhoneNumber).success;


  const handlePhoneSendVerification = useCallback(async () => {
    if (!isPhoneValidAndPresent) {
      form.setError("phone", { type: "manual", message: "Número de teléfono inválido para verificación." });
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
    await sendVerificationCode(currentPhoneNumber as string, recaptchaVerifierRef.current);
  }, [form, sendVerificationCode, toast, isPhoneValidAndPresent, currentPhoneNumber]);

  const handlePhoneVerifyCode = useCallback(async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({ title: "Error", description: "Ingresa un código de 6 dígitos.", variant: "destructive" });
      return;
    }
    await verifyCode(verificationCode);
    if (!phoneVerificationError) { // Only clear if verification was successful
        setVerificationCode("");
    }
  }, [verificationCode, verifyCode, toast, phoneVerificationError]);

  useEffect(() => {
    let verifier: RecaptchaVerifier | null = null;
    if (!firebaseApp) return;
    const authInstance = getAuth(firebaseApp);

    if (recaptchaContainerRef.current && !recaptchaVerifierRef.current && !authIsLoading && authInstance && signupStep === 1 && isPhoneValidAndPresent && !isVerificationSent) {
      try {
        verifier = new RecaptchaVerifier(authInstance, recaptchaContainerRef.current, {
          'size': 'invisible',
          'callback': () => { console.log("reCAPTCHA solved for signup phone"); },
          'expired-callback': () => {
            toast({ title: "reCAPTCHA Expirado", description: "Por favor, intenta verificar de nuevo.", variant: "destructive" });
            resetPhoneVerification(); // Reset verification state
            recaptchaVerifierRef.current?.render().catch(err => console.error("reCAPTCHA re-render error:", err));
          }
        });
        verifier.render().then(widgetId => {
          recaptchaVerifierRef.current = verifier;
        }).catch(err => {
          console.error("reCAPTCHA render error (signup):", err);
          toast({ title: "Error de reCAPTCHA", description: "No se pudo inicializar la verificación reCAPTCHA.", variant: "destructive" });
        });
      } catch (error) {
        console.error("Error creating RecaptchaVerifier (signup):", error);
      }
    }
    return () => { verifier?.clear(); recaptchaVerifierRef.current = null; };
  }, [authIsLoading, toast, signupStep, resetPhoneVerification, isPhoneValidAndPresent, isVerificationSent]);
  
  const currentYear = getYear(new Date());

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl md:text-3xl">Crear Cuenta</CardTitle>
        <CardDescription>
          Completa el formulario para crear tu cuenta. Paso {signupStep} de 2.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={recaptchaContainerRef} id="recaptcha-container-signup-page"></div>
        <Form {...form}>
          <form
            onSubmit={signupStep === 2 ? form.handleSubmit(onSubmit) : (e) => e.preventDefault()}
            className="space-y-4"
          >
            {signupStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem> <FormLabel>Nombre</FormLabel> <FormControl><Input placeholder="Tu nombre" {...field} /></FormControl> <FormMessage /> </FormItem>
                  )}/>
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem> <FormLabel>Apellido</FormLabel> <FormControl><Input placeholder="Tu apellido" {...field} /></FormControl> <FormMessage /> </FormItem>
                  )}/>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue="CO">
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona tu país" /></SelectTrigger></FormControl>
                        <SelectContent>{countries.map((country) => (<SelectItem key={country.code} value={country.code}><span className="mr-2">{country.flag}</span>{country.name}</SelectItem>))}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem> <FormLabel>Teléfono (Opcional)</FormLabel> <FormControl><Input type="tel" placeholder="+573001234567" {...field} /></FormControl> <FormMessage /> </FormItem>
                  )}/>
                </div>
                 {isPhoneValidAndPresent && !isVerificationSent && (
                    <Button type="button" variant="outline" className="w-full" onClick={handlePhoneSendVerification} disabled={authIsLoading || isVerifyingCode}>
                        Enviar código SMS para verificar teléfono
                    </Button>
                )}
                {isVerificationSent && (
                    <div className="mt-2 space-y-2 p-3 border rounded-md bg-muted/50">
                        <FormLabel htmlFor="signup-verification-code">Ingresa el código SMS</FormLabel>
                        <div className="flex items-center gap-2">
                        <Input id="signup-verification-code" type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="123456" maxLength={6} className="flex-1"/>
                        <Button type="button" onClick={handlePhoneVerifyCode} disabled={isVerifyingCode || verificationCode.length !== 6 || authIsLoading}>
                            {isVerifyingCode ? "Verificando..." : "Confirmar Código"}
                        </Button>
                        </div>
                        {phoneVerificationError && <p className="text-sm font-medium text-destructive mt-1">{phoneVerificationError}</p>}
                    </div>
                )}
                <FormField control={form.control} name="profileType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de perfil</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecciona tu tipo de perfil" /></SelectTrigger></FormControl>
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
                  <FormField control={form.control} name="dob" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Nacimiento</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                              <CalendarIconLucide className="mr-2 h-4 w-4"/>
                              {field.value ? format(new Date(field.value), "PPP", { locale: es }) : <span>Elige una fecha</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus captionLayout="dropdown-buttons" fromYear={1900} toYear={currentYear} locale={es}/>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="gender" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Género (Opcional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona tu género" /></SelectTrigger></FormControl>
                        <SelectContent>{genders.map((gender) => (<SelectItem key={gender.value} value={gender.value}>{gender.label}</SelectItem>))}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}/>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="documentType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de documento (Opcional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona tipo" /></SelectTrigger></FormControl>
                        <SelectContent>{documentTypes.map((docType) => (<SelectItem key={docType.value} value={docType.value}>{docType.label}</SelectItem>))}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="documentNumber" render={({ field }) => (
                    <FormItem> <FormLabel>Número de documento (Opcional)</FormLabel> <FormControl><Input placeholder="Número de documento" {...field} /></FormControl> <FormMessage /> </FormItem>
                  )}/>
                </div>
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem> <FormLabel>Correo Electrónico</FormLabel> <FormControl><Input type="email" placeholder="tu@correo.com" {...field} /></FormControl> <FormMessage /> </FormItem>
                )}/>
                <FormField control={form.control} name="password" render={({ field }) => (
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
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
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
              </div>
            )}
            {loginError && <p className="text-sm font-medium text-destructive pt-1">{loginError}</p>}
            
            <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4 border-t mt-6">
                {signupStep === 2 && (
                    <Button type="button" variant="outline" onClick={contextHandlePrevStep} className="w-full sm:w-auto order-2 sm:order-1">
                        Anterior
                    </Button>
                )}
                {signupStep === 1 ? (
                    <Button type="button" onClick={handleNextStepClick} className="w-full sm:w-auto order-1 sm:order-2">
                        Siguiente
                    </Button>
                ) : (
                    <Button type="submit" className="w-full sm:w-auto order-1 sm:order-2" disabled={form.formState.isSubmitting || authIsLoading}>
                        {form.formState.isSubmitting || authIsLoading ? "Creando..." : "Crear Cuenta"}
                    </Button>
                )}
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex-col items-center">
        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Ingresar
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
