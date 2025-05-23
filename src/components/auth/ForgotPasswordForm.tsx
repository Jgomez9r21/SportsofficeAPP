
"use client";

import type React from 'react';
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
import { useAuth, type ForgotPasswordValues } from '@/context/AuthContext'; // Ensure ForgotPasswordValues is exported

const forgotPasswordSchema = z.object({
  email: z.string().email("Correo electrónico inválido.").min(1, "El correo es requerido."),
});

export function ForgotPasswordForm() {
  const { handleForgotPasswordSubmit, isLoading: authIsLoading } = useAuth();

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: ForgotPasswordValues) => {
    handleForgotPasswordSubmit(data, form.reset);
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl md:text-3xl">Recuperar Contraseña</CardTitle>
        <CardDescription>
          Ingresa tu correo electrónico para enviarte un enlace de recuperación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="tu@correo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || authIsLoading}>
              {form.formState.isSubmitting || authIsLoading ? "Enviando..." : "Enviar Enlace"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex-col items-center">
        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Recuerdas tu contraseña?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Ingresar
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
