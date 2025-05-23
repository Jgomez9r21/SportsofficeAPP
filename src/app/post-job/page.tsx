
"use client";

import type React from 'react';
import { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import AppLayout from '@/layout/AppLayout';
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Building, DollarSign, X, BarChart, Camera,Edit, Music, Lightbulb, Database, ImageIcon as LucideImageIcon, User as UserIconLucide, Code as CodeIcon, Construction as ConstructionIcon, School2 as School2Icon, Palette as PaletteIcon, HomeIcon as LucideHomeIcon, UploadCloud, Shield } from 'lucide-react'; // Changed ShieldUser to Shield
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HOURLY_RATE_CATEGORIES } from '@/lib/config';
import Image from 'next/image';
import { categoriasDisponibles } from '@/app/sports-facilities/page'; // Import categories

// --- Common Types and Constants ---
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per image
const MAX_IMAGES = 8;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const fileSchema = z.instanceof(File)
  .refine(file => file.size <= MAX_FILE_SIZE, `El tamaño máximo por imagen es 5MB.`)
  .refine(file => ACCEPTED_IMAGE_TYPES.includes(file.type), "Solo se aceptan formatos .jpg, .jpeg, .png y .webp.");

// --- Sports Facility Form: Schema, Types, Component ---
const sportsFacilityFormSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres.").max(100, "El título no puede tener más de 100 caracteres."),
  facilityType: z.string().min(1, "El tipo de espacio es requerido."),
  description: z.string().min(20, "La descripción debe tener al menos 20 caracteres.").max(500, "La descripción no puede tener más de 500 caracteres."),
  rate: z.coerce.number({ invalid_type_error: "La tarifa debe ser un número.", required_error: "La tarifa es requerida." }).positive("La tarifa debe ser un número positivo.").min(1, "La tarifa debe ser al menos 1."),
  amenities: z.string().min(5, "Describe las comodidades (ej: Baños, Duchas, Iluminación).").max(300, "Las comodidades no pueden exceder los 300 caracteres.").optional(),
  availability: z.string().min(5, "Describe tu disponibilidad (ej: Lunes a Viernes 9am-5pm).").max(200, "La disponibilidad no puede exceder los 200 caracteres."),
  location: z.string().min(2, "Ingresa la ubicación o área de servicio.").max(100, "La ubicación no puede tener más de 100 caracteres."),
  images: z.array(fileSchema)
    .max(MAX_IMAGES, `Puedes subir un máximo de ${MAX_IMAGES} imágenes.`)
    .optional()
    .nullable(),
});
type SportsFacilityFormValues = z.infer<typeof sportsFacilityFormSchema>;

const sportsFacilityDefaultValues: Partial<SportsFacilityFormValues> = {
  title: "",
  facilityType: "",
  description: "",
  availability: "",
  amenities: "",
  location: "",
  images: [],
};

function SportsFacilityPublicationForm() {
  const { toast } = useToast();
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const form = useForm<SportsFacilityFormValues>({
    resolver: zodResolver(sportsFacilityFormSchema),
    defaultValues: sportsFacilityDefaultValues,
    mode: "onChange",
  });
  const currentImages = form.watch("images") || [];

  async function onSubmit(data: SportsFacilityFormValues) {
    console.log("Guardando datos del Espacio Deportivo (simulación):", {
        ...data,
        category: 'Instalación Deportiva',
        images: data.images ? data.images.map(img => ({ name: img.name, size: img.size, type: img.type })) : null,
    });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    toast({
        title: "Espacio Deportivo Guardado (Simulación)",
        description: "Tu espacio deportivo ha sido guardado y publicado correctamente (simulación).",
    });
    form.reset();
    setPreviewImages([]);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const existingFiles = form.getValues("images") || [];
    const totalFiles = existingFiles.length + files.length;

    if (totalFiles > MAX_IMAGES) {
        toast({
            title: "Límite de imágenes excedido",
            description: `Solo puedes subir hasta ${MAX_IMAGES} imágenes. Se han ignorado las últimas seleccionadas.`,
            variant: "destructive",
        });
        files.splice(MAX_IMAGES - existingFiles.length);
    }
    const newFiles = [...existingFiles, ...files];
    form.setValue("images", newFiles, { shouldValidate: true });

    const newPreviews: string[] = [];
    Promise.all(newFiles.map(file => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    }))).then(previews => {
        setPreviewImages(previews);
    }).catch(error => {
         console.error("Error generando vistas previas de imágenes:", error);
         toast({ title: "Error", description: "No se pudieron generar las vistas previas de las imágenes.", variant: "destructive" });
    });
  };

  const removeImage = (indexToRemove: number) => {
    const updatedFiles = (form.getValues("images") || []).filter((_, index) => index !== indexToRemove);
    form.setValue("images", updatedFiles, { shouldValidate: true });
    const updatedPreviews = previewImages.filter((_, index) => index !== indexToRemove);
    setPreviewImages(updatedPreviews);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre del Espacio Deportivo</FormLabel>
            <FormControl><Input placeholder="Ej: Cancha de Fútbol La Central" {...field} /></FormControl>
            <FormDescription>Un nombre claro y conciso que describa tu espacio deportivo.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />

        <FormField
          control={form.control}
          name="facilityType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Espacio Deportivo</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} defaultValue="">
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo de espacio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categoriasDisponibles
                    .filter(cat => cat.name !== 'Todos') 
                    .map(cat => (
                      <SelectItem key={cat.name} value={cat.name}>
                        {cat.icon && <cat.icon className="inline-block h-4 w-4 mr-2 text-muted-foreground" />}
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormDescription>Selecciona el tipo específico de tu instalación deportiva.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Descripción Detallada</FormLabel>
            <FormControl><Textarea placeholder="Describe tu espacio, qué incluye (ej: vestuarios, iluminación), dimensiones, etc." className="resize-y min-h-[100px]" {...field} /></FormControl>
            <FormDescription>Explica qué ofreces, las características del espacio y cualquier detalle relevante.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <FormField control={form.control} name="rate" render={({ field }) => (
            <FormItem>
              <FormLabel>Tarifa (por hora)</FormLabel>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl><Input type="number" placeholder="50000" {...field} className="pl-8" onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} /></FormControl>
              </div>
              <FormDescription>Ingresa tu tarifa base por hora para el alquiler del espacio.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem>
              <FormLabel>Ubicación del Espacio</FormLabel>
              <FormControl><Input placeholder="Ej: Calle Falsa 123, Ciudad Capital" {...field} /></FormControl>
              <FormDescription>Especifica la dirección completa de tu espacio deportivo.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="amenities" render={({ field }) => (
          <FormItem>
            <FormLabel>Comodidades (Opcional)</FormLabel>
            <FormControl><Textarea placeholder="Ej: Baños, Duchas, Iluminación LED, Parqueadero, Tienda deportiva. Separa con comas." className="resize-y min-h-[60px]" {...field} /></FormControl>
            <FormDescription>Lista las comodidades principales que ofrece tu espacio, separadas por comas.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="images" render={({ field: { onChange, value, ...rest } }) => (
          <FormItem>
            <FormLabel>Imágenes del Espacio (Opcional, hasta {MAX_IMAGES})</FormLabel>
            <FormControl>
                <div className="flex items-center justify-center w-full">
                    <label
                        htmlFor="facility-image-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition-colors"
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                            <p className="mb-1 text-sm text-muted-foreground">
                                <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
                            </p>
                            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (MAX. {MAX_FILE_SIZE / (1024*1024)}MB por imagen)</p>
                        </div>
                        <Input id="facility-image-upload" type="file" className="hidden" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple onChange={handleFileChange} {...rest} onClick={(event) => { (event.target as HTMLInputElement).value = '' }} />
                    </label>
                </div>
            </FormControl>
             <FormDescription>Sube hasta {MAX_IMAGES} imágenes de tu espacio.</FormDescription>
            {previewImages.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {previewImages.map((src, index) => (
                  <div key={index} className="relative group aspect-video">
                    <Image src={src} alt={`Vista previa ${index + 1}`} layout="fill" objectFit="cover" className="rounded-md shadow-sm" data-ai-hint="sports facility image preview" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-80 group-hover:opacity-100 transition-opacity p-1" onClick={() => removeImage(index)}>
                      <X className="h-3 w-3" /><span className="sr-only">Eliminar imagen {index + 1}</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="availability" render={({ field }) => (
          <FormItem>
            <FormLabel>Disponibilidad y Horarios</FormLabel>
            <FormControl><Textarea placeholder="Ej: Lunes a Viernes 9am-10pm, Sábados y Domingos 8am-11pm." className="resize-y min-h-[60px]" {...field} /></FormControl>
            <FormDescription>Indica los días y horarios generales en que tu espacio deportivo está disponible.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isValid || (currentImages.length > MAX_IMAGES)}>
             {form.formState.isSubmitting ? "Publicando..." : "Publicar Espacio Deportivo"}
        </Button>
      </form>
    </Form>
  );
}

// --- Independent Service Form: Schema, Types, Categories, Component ---
interface IndependentServiceCategory {
  name: string;
  icon?: React.ComponentType<{ className?: string }>;
}
const independentServiceCategories: IndependentServiceCategory[] = [
  { name: 'Tecnología', icon: CodeIcon },
  { name: 'Entrenador Personal', icon: UserIconLucide },
  { name: 'Contratista', icon: ConstructionIcon },
  { name: 'Mantenimiento Hogar', icon: LucideHomeIcon },
  { name: 'Profesores', icon: School2Icon },
  { name: 'Diseñadores', icon: PaletteIcon },
  { name: 'Marketing Digital', icon: BarChart },
  { name: 'Video & Animación', icon: Camera },
  { name: 'Redacción & Traducción', icon: Edit },
  { name: 'Música & Audio', icon: Music },
  { name: 'Finanzas', icon: DollarSign },
  { name: 'Crecimiento Personal', icon: Lightbulb },
  { name: 'Seguridad', icon: Shield}, // Changed ShieldUser to Shield
  { name: 'Fotografía', icon: LucideImageIcon },
];

const independentServiceFormSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres.").max(100, "El título no puede tener más de 100 caracteres."),
  description: z.string().min(20, "La descripción debe tener al menos 20 caracteres.").max(1000, "La descripción no puede tener más de 1000 caracteres."),
  category: z.string().min(1, "Debes seleccionar una categoría."),
  rate: z.coerce.number({ invalid_type_error: "La tarifa debe ser un número.", required_error: "La tarifa es requerida." }).positive("La tarifa debe ser un número positivo.").min(1, "La tarifa debe ser al menos 1."),
  availability: z.string().min(5, "Describe tu disponibilidad (ej: Lunes a Viernes 9am-5pm, fines de semana con previa cita).").max(200, "La disponibilidad no puede exceder los 200 caracteres."),
  location: z.string().min(2, "Ingresa la ubicación, área de servicio o 'Remoto'.").max(100, "La ubicación no puede tener más de 100 caracteres."),
  images: z.array(fileSchema)
    .max(MAX_IMAGES, `Puedes subir un máximo de ${MAX_IMAGES} imágenes.`)
    .optional()
    .nullable(),
});
type IndependentServiceFormValues = z.infer<typeof independentServiceFormSchema>;

const independentServiceDefaultValues: Partial<IndependentServiceFormValues> = {
  title: "",
  description: "",
  category: "",
  availability: "",
  location: "",
  images: [],
};

function IndependentServicePublicationForm() {
  const { toast } = useToast();
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const form = useForm<IndependentServiceFormValues>({
    resolver: zodResolver(independentServiceFormSchema),
    defaultValues: independentServiceDefaultValues,
    mode: "onChange",
  });
  const currentImages = form.watch("images") || [];
  const selectedCategory = form.watch("category");

  async function onSubmit(data: IndependentServiceFormValues) {
    console.log("Guardando datos del Servicio Independiente (simulación):", {
        ...data,
        images: data.images ? data.images.map(img => ({ name: img.name, size: img.size, type: img.type })) : null,
    });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    toast({
        title: "Servicio Independiente Guardado (Simulación)",
        description: "Tu servicio ha sido guardado y publicado correctamente (simulación).",
    });
    form.reset();
    setPreviewImages([]);
  }
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const existingFiles = form.getValues("images") || [];
    const totalFiles = existingFiles.length + files.length;

    if (totalFiles > MAX_IMAGES) {
        toast({
            title: "Límite de imágenes excedido",
            description: `Solo puedes subir hasta ${MAX_IMAGES} imágenes. Se han ignorado las últimas seleccionadas.`,
            variant: "destructive",
        });
        files.splice(MAX_IMAGES - existingFiles.length);
    }
    const newFiles = [...existingFiles, ...files];
    form.setValue("images", newFiles, { shouldValidate: true });

    const newPreviews: string[] = [];
    Promise.all(newFiles.map(file => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    }))).then(previews => {
        setPreviewImages(previews);
    }).catch(error => {
         console.error("Error generando vistas previas de imágenes:", error);
         toast({ title: "Error", description: "No se pudieron generar las vistas previas de las imágenes.", variant: "destructive" });
    });
  };

  const removeImage = (indexToRemove: number) => {
    const updatedFiles = (form.getValues("images") || []).filter((_, index) => index !== indexToRemove);
    form.setValue("images", updatedFiles, { shouldValidate: true });
    const updatedPreviews = previewImages.filter((_, index) => index !== indexToRemove);
    setPreviewImages(updatedPreviews);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Título del Servicio</FormLabel>
            <FormControl><Input placeholder="Ej: Desarrollo Web Frontend Avanzado" {...field} /></FormControl>
            <FormDescription>Un título claro y atractivo para tu servicio.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Descripción Detallada del Servicio</FormLabel>
            <FormControl><Textarea placeholder="Describe tu servicio, qué ofreces, tu experiencia, etc." className="resize-y min-h-[120px]" {...field} /></FormControl>
            <FormDescription>Proporciona detalles completos sobre tu servicio para atraer clientes.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría del Servicio</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger></FormControl>
                <SelectContent>
                  {independentServiceCategories.map(cat => (
                    <SelectItem key={cat.name} value={cat.name}>
                      {cat.icon && <cat.icon className="inline-block h-4 w-4 mr-2 text-muted-foreground" />}
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Elige la categoría que mejor describa tu servicio.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
           <FormField control={form.control} name="rate" render={({ field }) => (
            <FormItem>
              <FormLabel>Tarifa</FormLabel>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl><Input type="number" placeholder="75000" {...field} className="pl-8" onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} /></FormControl>
              </div>
              <FormDescription>
                Ingresa tu tarifa. {selectedCategory && HOURLY_RATE_CATEGORIES.includes(selectedCategory) ? "Esta categoría usualmente es por hora." : "Esta categoría puede ser por proyecto."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="availability" render={({ field }) => (
          <FormItem>
            <FormLabel>Disponibilidad</FormLabel>
            <FormControl><Textarea placeholder="Ej: L-V 9am-6pm, Fines de semana contactar." className="resize-y min-h-[60px]" {...field} /></FormControl>
            <FormDescription>Indica tus horarios y días de trabajo.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="location" render={({ field }) => (
          <FormItem>
            <FormLabel>Ubicación / Área de Servicio</FormLabel>
            <FormControl><Input placeholder="Ej: Remoto, Bogotá, Medellín y alrededores" {...field} /></FormControl>
            <FormDescription>Especifica dónde ofreces tus servicios. Escribe 'Remoto' si aplica.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
         <FormField control={form.control} name="images" render={({ field : { onChange, value, ...rest }}) => (
          <FormItem>
            <FormLabel>Imágenes del Servicio (Opcional, hasta {MAX_IMAGES})</FormLabel>
            <FormControl>
                 <div className="flex items-center justify-center w-full">
                    <label
                        htmlFor="service-image-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition-colors"
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                            <p className="mb-1 text-sm text-muted-foreground">
                                <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
                            </p>
                            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (MAX. {MAX_FILE_SIZE / (1024*1024)}MB por imagen)</p>
                        </div>
                        <Input id="service-image-upload" type="file" className="hidden" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple onChange={handleFileChange} {...rest} onClick={(event) => { (event.target as HTMLInputElement).value = '' }} />
                    </label>
                </div>
            </FormControl>
            <FormDescription>Sube imágenes de trabajos previos, portafolio, etc.</FormDescription>
            {previewImages.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {previewImages.map((src, index) => (
                  <div key={index} className="relative group aspect-video">
                    <Image src={src} alt={`Vista previa ${index + 1}`} layout="fill" objectFit="cover" className="rounded-md shadow-sm" data-ai-hint="service work image preview"/>
                    <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-80 group-hover:opacity-100 transition-opacity p-1" onClick={() => removeImage(index)}>
                      <X className="h-3 w-3" /><span className="sr-only">Eliminar imagen {index + 1}</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isValid || (currentImages.length > MAX_IMAGES)}>
          {form.formState.isSubmitting ? "Publicando Servicio..." : "Publicar Servicio Independiente"}
        </Button>
      </form>
    </Form>
  );
}


// --- Main Page Content ---
const PostJobContent = () => {
  const { isLoggedIn, isLoading, openLoginDialog } = useAuth();

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto flex justify-center items-center h-64">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center border rounded-lg bg-card">
        <UploadCloud className="h-16 w-16 text-muted-foreground/50 mb-6" />
        <h2 className="text-xl font-medium mb-2 text-foreground">Acceso Restringido</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Debes iniciar sesión o crear una cuenta para poder publicar tus servicios o espacios.
        </p>
        <Button onClick={openLoginDialog}>Iniciar Sesión / Crear Cuenta</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-semibold mb-2">Publicar Servicio</h1>
      <p className="text-muted-foreground mb-6 md:mb-8">
        Aquí puedes publicar tus espacios deportivos o servicios profesionales.
      </p>
      <Tabs defaultValue="sports-facility" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 mb-6">
          <TabsTrigger value="sports-facility">
            <Building className="mr-2 h-4 w-4" /> Espacio Deportivo
          </TabsTrigger>
          <TabsTrigger value="independent-service">
            <Briefcase className="mr-2 h-4 w-4" /> Servicio Independiente
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sports-facility">
          <h2 className="text-xl font-semibold mb-1 mt-4">Publicar Espacio Deportivo</h2>
           <p className="text-sm text-muted-foreground mb-6">Detalla la información de tu espacio deportivo para que los usuarios puedan encontrarlo y reservarlo.</p>
          <SportsFacilityPublicationForm />
        </TabsContent>
        <TabsContent value="independent-service">
           <h2 className="text-xl font-semibold mb-1 mt-4">Publicar Servicio Independiente</h2>
           <p className="text-sm text-muted-foreground mb-6">Describe tus servicios profesionales para que los clientes puedan contratarte.</p>
          <IndependentServicePublicationForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const PostJobPage = () => {
  return (
     <AppLayout>
      <PostJobContent />
     </AppLayout>
  );
};

export default PostJobPage;

    