
"use client";

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Eye, EyeOff, ArrowLeft, CalendarDays as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, getYear } from "date-fns";
import { es } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext';
import { useToast } from "@/hooks/use-toast";
import { RecaptchaVerifier, getAuth } from 'firebase/auth';
import { app as firebaseApp } from '@/lib/firebase';
import Image from 'next/image';
import logoImage from '@/image/logoo.png';

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
const documentTypes = [ { value: "cc", label: "Cédula de Ciudadanía" }, { value: "ce", label: "Cédula de Extranjería" }, { value: "passport", label: "Pasaporte" }, { value: "other", label: "Otro" }];
const genders = [ { value: "male", label: "Masculino" }, { value: "female", label: "Femenino" }, { value: "other", label: "Otro" }, { value: "prefer_not_say", label: "Prefiero no decir" }];
const profileTypes = [ { value: "usuario", label: "Usuario (Busco servicios/espacios)" }, { value: "profesional", label: "Profesional (Ofrezco servicios)" }, { value: "propietario_espacio", label: "Propietario (Ofrezco espacios deportivos)"}];

const phoneValidation = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Número inválido. Debe estar en formato E.164 (ej: +573001234567).').optional().or(z.literal(""));
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

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading: authIsLoading, loginError, sendVerificationCode, verifyCode, isVerificationSent, phoneVerificationError, isVerifyingCode, resetPhoneVerification } = useAuth();
  const { toast } = useToast();
  const [signupStep, setSignupStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const [verificationCode, setVerificationCode] = useState("");

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: "", lastName: "", country: "CO", phone: "", profileType: "", dob: null, gender: "", documentType: "", documentNumber: "", email: "", password: "", confirmPassword: "" },
    mode: "onChange",
  });

  useEffect(() => {
    let verifier: RecaptchaVerifier | null = null;
    if (!firebaseApp) { console.warn("Firebase App not initialized for reCAPTCHA."); return; }
    const authInstance = getAuth(firebaseApp);
    if (recaptchaContainerRef.current && !recaptchaVerifierRef.current && !authIsLoading && authInstance && signupStep === 2 && form.getValues("phone")) {
      try {
        verifier = new RecaptchaVerifier(authInstance, recaptchaContainerRef.current, {
          'size': 'invisible', 'callback': () => {}, 'expired-callback': () => { resetPhoneVerification(); recaptchaVerifierRef.current?.render().catch(console.error); }
        });
        verifier.render().then(() => recaptchaVerifierRef.current = verifier).catch(err => { toast({ title: "Error de reCAPTCHA", description: "No se pudo inicializar reCAPTCHA.", variant: "destructive" }); });
      } catch (error) { toast({ title: "Error de reCAPTCHA", description: "Error creando verificador reCAPTCHA.", variant: "destructive" });}
    }
    return () => { verifier?.clear(); recaptchaVerifierRef.current = null; };
  }, [authIsLoading, resetPhoneVerification, signupStep, toast, form]);

  const handleNextStep = async () => {
    const result = await form.trigger(["firstName", "lastName", "country", "phone", "profileType"]);
    if (result) setSignupStep(2);
    else toast({ title: "Error de Validación", description: "Por favor, corrige los errores del formulario.", variant: "destructive" });
  };
  const handlePrevStep = () => {
    setSignupStep(1);
    // Clear errors for step 2 fields if going back
    form.clearErrors(['dob', 'gender', 'documentType', 'documentNumber', 'email', 'password', 'confirmPassword']);
  };

  const onSubmit = async (data: SignupValues) => {
    try {
      await signup(data);
      toast({ title: "Cuenta Creada", description: `¡Bienvenido/a, ${data.firstName}!` });
      router.push('/');
    } catch (error) {
      console.error("Signup page submission error:", error);
    }
  };

  const handlePhoneSendVerification = async () => {
    const phoneNumber = form.getValues("phone");
    if (!phoneNumber || !phoneValidation.safeParse(phoneNumber).success) {
      form.setError("phone", { type: "manual", message: "Número de teléfono inválido para verificación." }); return;
    }
    if (!recaptchaVerifierRef.current) { toast({ title: "reCAPTCHA no listo", description: "Por favor, espera o recarga la página.", variant: "destructive" }); return; }
    await sendVerificationCode(phoneNumber, recaptchaVerifierRef.current);
  };

  const handlePhoneVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) { toast({ title: "Código inválido", description: "Ingresa un código de 6 dígitos.", variant: "destructive" }); return; }
    await verifyCode(verificationCode);
    if (!phoneVerificationError) setVerificationCode(""); // Clear on success
  };

  const currentYear = getYear(new Date());

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted p-4">
       <div className="absolute top-4 left-4 md:top-8 md:left-8">
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Inicio
          </Link>
        </Button>
      </div>
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <Link href="/" className="inline-block mb-4">
            <Image src={logoImage} alt="Sportoffice Logo" width={180} height={40} priority data-ai-hint="logo sportoffice"/>
          </Link>
          <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
          <CardDescription>Paso {signupStep} de 2.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {signupStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem> <FormLabel>Nombre</FormLabel> <FormControl><Input placeholder="Tu nombre" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem> <FormLabel>Apellido</FormLabel> <FormControl><Input placeholder="Tu apellido" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="country" render={({ field }) => ( <FormItem> <FormLabel>País</FormLabel> <Select onValueChange={field.onChange} value={field.value} defaultValue="CO"> <FormControl><SelectTrigger><SelectValue placeholder="Selecciona tu país" /></SelectTrigger></FormControl> <SelectContent>{countries.map((c) => (<SelectItem key={c.code} value={c.code}><span className="mr-2">{c.flag}</span>{c.name}</SelectItem>))}</SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem> <FormLabel>Teléfono (Opcional)</FormLabel> <FormControl><Input type="tel" placeholder="+573001234567" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                  </div>
                  <FormField control={form.control} name="profileType" render={({ field }) => ( <FormItem> <FormLabel>Tipo de perfil</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Selecciona tu tipo de perfil" /></SelectTrigger></FormControl> <SelectContent>{profileTypes.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                </div>
              )}
              {signupStep === 2 && (
                <div className="space-y-4">
                  <div ref={recaptchaContainerRef} id="recaptcha-container-signup-page"></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="dob" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>Fecha de Nacimiento</FormLabel> <Popover> <PopoverTrigger asChild> <FormControl> <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal",!field.value && "text-muted-foreground")}> <CalendarIcon className="mr-2 h-4 w-4"/> {field.value ? format(new Date(field.value), "PPP", { locale: es }) : <span>Elige una fecha</span>} </Button> </FormControl> </PopoverTrigger> <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} disabled={(d) => d > new Date() || d < new Date("1900-01-01")} initialFocus captionLayout="dropdown-buttons" fromYear={1900} toYear={currentYear} locale={es}/></PopoverContent> </Popover> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem> <FormLabel>Género (Opcional)</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Selecciona tu género" /></SelectTrigger></FormControl> <SelectContent>{genders.map((g) => (<SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>))}</SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="documentType" render={({ field }) => ( <FormItem> <FormLabel>Tipo de documento (Opcional)</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Selecciona tipo" /></SelectTrigger></FormControl> <SelectContent>{documentTypes.map((dt) => (<SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>))}</SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="documentNumber" render={({ field }) => ( <FormItem> <FormLabel>Número de documento (Opcional)</FormLabel> <FormControl><Input placeholder="Número de documento" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                  </div>
                  <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Correo</FormLabel> <FormControl><Input type="email" placeholder="tu@correo.com" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                  <FormField control={form.control} name="password" render={({ field }) => ( <FormItem> <FormLabel>Contraseña</FormLabel> <FormControl><div className="relative"><Input type={showPassword ? "text" : "password"} placeholder="Crea una contraseña (mín. 6 caract.)" {...field} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></FormControl> <FormMessage /> </FormItem> )}/>
                  <FormField control={form.control} name="confirmPassword" render={({ field }) => ( <FormItem> <FormLabel>Confirmar Contraseña</FormLabel> <FormControl><div className="relative"><Input type={showConfirmPassword ? "text" : "password"} placeholder="Confirma tu contraseña" {...field} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={()=>setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></FormControl> <FormMessage /> </FormItem> )}/>
                  {form.getValues("phone") && !isVerificationSent && !(user?.isPhoneVerified && form.getValues("phone") === user?.phone) && ( <Button type="button" variant="outline" className="w-full mt-2" onClick={handlePhoneSendVerification} disabled={authIsLoading || isVerifyingCode}>Enviar código SMS</Button> )}
                  {isVerificationSent && ( <div className="mt-2 space-y-2 p-3 border rounded-md bg-muted/50"> <Label htmlFor="signup-verification-code">Ingresa el código SMS</Label> <div className="flex items-center gap-2"> <Input id="signup-verification-code" type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="123456" maxLength={6} className="flex-1"/> <Button type="button" onClick={handlePhoneVerifyCode} disabled={isVerifyingCode || verificationCode.length !== 6 || authIsLoading}>{isVerifyingCode ? "Verificando..." : "Confirmar"}</Button> </div> {phoneVerificationError && <p className="text-sm font-medium text-destructive mt-1">{phoneVerificationError}</p>} </div> )}
                </div>
              )}
              {loginError && <p className="text-sm font-medium text-destructive pt-1">{loginError}</p>}
              <div className="flex flex-col sm:flex-row justify-between items-center pt-4 gap-2">
                {signupStep === 1 ? (
                  <Button type="button" onClick={handleNextStep} className="w-full sm:w-auto order-last sm:order-last">Siguiente</Button>
                ) : (
                  <Button type="button" variant="outline" onClick={handlePrevStep} className="w-full sm:w-auto order-last sm:order-first">Anterior</Button>
                )}
                {signupStep === 2 && (
                  <Button type="submit" className="w-full sm:w-auto order-first sm:order-last" disabled={form.formState.isSubmitting || authIsLoading}>
                    {form.formState.isSubmitting || authIsLoading ? "Creando..." : "Crear Cuenta"}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center text-sm pt-4 pb-6">
          <p className="text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Button variant="link" className="p-0 h-auto text-primary" asChild>
              <Link href="/login">Ingresar</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
