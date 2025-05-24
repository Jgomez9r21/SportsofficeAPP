
"use client";


import type React from 'react';
import { useState } from 'react';
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
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import logoImage from '@/image/logoo.png';

/**
 * Nombre del archivo: LoginPage.tsx
 *
 * Propósito:
 * Este componente representa la pantalla de inicio de sesión de la aplicación.
 * Permite al usuario ingresar su correo electrónico y contraseña, y maneja el proceso
 * de autenticación con validaciones y mensajes de error o éxito.
 *
 * Autores:
 * - Kevin Lopez
 * - Vanesa Caminos
 * - Juan Pablo Gomez
 */

// Definición del esquema de validación con Zod
const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido.").min(1, "El correo es requerido."),
  password: z.string().min(1, "La contraseña es requerida."),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, loginError } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  // Configuración del formulario con React Hook Form y resolución mediante Zod
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  /**
   * Nombre del método: onSubmit
   *
   * Propósito:
   * Manejar la lógica de inicio de sesión cuando el usuario envía el formulario.
   * Valida las credenciales, autentica al usuario mediante el contexto de autenticación,
   * y redirige a la página principal si el inicio es exitoso. Muestra notificaciones
   * según el resultado de la operación.
   *
   * Variables utilizadas:
   * - data: objeto con email y contraseña ingresados por el usuario (LoginValues)
   * - login: función del contexto de autenticación para iniciar sesión
   * - toast: función para mostrar mensajes de éxito/error
   * - router: para la navegación después del inicio exitoso
   *
   * Precondición:
   * - El formulario debe haber sido correctamente llenado y validado usando Zod/React Hook Form.
   * - La función 'login' del AuthContext debe estar definida y funcional.
   *
   * Postcondición:
   * - Si las credenciales son válidas y el inicio es exitoso:
   *   - Se muestra un mensaje de éxito.
   *   - Se redirige al usuario a la página principal ('/').
   * - Si ocurre un error durante el inicio:
   *   - Se muestra un mensaje de error mediante 'toast'.
   *   - No se realiza ninguna redirección.
   */
  const onSubmit = async (data: LoginValues) => {
    try {
      await login(data);
      toast({ title: "Ingreso exitoso", description: "Redirigiendo..." });
      router.push('/');
    } catch (error) {
      // Error ya manejado y mostrado en el contexto de autenticación
      console.error("Login page submission error:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted p-4">
      {/* Botón de regreso al inicio */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8">
        <Button variant="outline" size="icon" asChild aria-label="Volver a Inicio">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Tarjeta del formulario de inicio de sesión */}
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          {/* Logo de la aplicación */}
          <Link href="/" className="inline-block mb-4">
            <Image src={logoImage} alt="Sportoffice Logo" width={180} height={40} priority data-ai-hint="logo sportoffice"/>
          </Link>
          <CardTitle className="text-2xl">Centro</CardTitle>
          <CardDescription>
            Ingresa tu correo y contraseña para continuar.
          </CardDescription>
        </CardHeader>

        {/* Contenido del formulario */}
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Campo de correo electrónico */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="tu@correo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo de contraseña */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Ingresar la contraseña"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Mensaje de error general del login */}
              {loginError && (
                <p className="text-sm font-medium text-destructive pt-1">{loginError}</p>
              )}

              {/* Enlace de recuperación de contraseña */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto text-sm text-primary"
                  asChild
                >
                  <Link href="/forgot-password">¿Olvidaste tu contraseña?</Link>
                </Button>
              </div>

              {/* Botón de envío del formulario */}
              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting || isLoading}
              >
                {form.formState.isSubmitting || isLoading ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>
          </Form>
        </CardContent>

        {/* Pie de tarjeta con opción de registro */}
        <CardFooter className="flex flex-col items-center justify-center text-sm pt-4 pb-6">
          <p className="text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Button
              variant="link"
              className="p-0 h-auto text-primary"
              asChild
            >
              <Link href="/signup">Crear una</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
