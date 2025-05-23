
"use client";

import type React from 'react';
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
import { ArrowLeft } from "lucide-react";
import { useAuth } from '@/context/AuthContext'; // Removed type ForgotPasswordValues as it's inferred
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import logoImage from '@/image/logoo.png';

const forgotPasswordSchema = z.object({
  email: z.string().email("Correo electrónico inválido.").min(1, "El correo es requerido."),
});
type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;


export default function ForgotPasswordPage() {
  const router = useRouter();
  const { handleForgotPasswordSubmit, isLoading, loginError } = useAuth();
  const { toast } = useToast();

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordValues) => {
    try {
      await handleForgotPasswordSubmit(data, form.reset);
      // User feedback is handled in AuthContext
      // Navigation to login page can be done here or after a toast
      toast({ title: "Solicitud Enviada", description: "Si el correo existe, recibirás un enlace." });
      router.push('/login'); // Navigate to login after submission
    } catch (error) {
      console.error("Forgot password page submission error:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted p-4">
      <div className="absolute top-4 left-4 md:top-8 md:left-8">
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Inicio
          </Link>
        </Button>
      </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
           <Link href="/" className="inline-block mb-4">
            <Image src={logoImage} alt="Sportoffice Logo" width={180} height={40} priority data-ai-hint="logo sportoffice"/>
          </Link>
          <CardTitle className="text-2xl">Recuperar Contraseña</CardTitle>
          <CardDescription>
            Ingresa tu correo para enviarte un enlace de recuperación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              {loginError && <p className="text-sm font-medium text-destructive pt-1">{loginError}</p>}
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || isLoading}>
                {form.formState.isSubmitting || isLoading ? "Enviando..." : "Enviar Enlace"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center text-sm pt-4 pb-6">
          <Button variant="link" className="p-0 h-auto text-primary" asChild>
            <Link href="/login">Volver a Ingresar</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
