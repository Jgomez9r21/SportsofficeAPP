
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Star, Filter, X, Heart, Building, Users, LayoutGrid, Dumbbell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
// Toaster is likely in AppLayout
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import Image from 'next/image';
import Link from 'next/link';
import { HOURLY_RATE_CATEGORIES } from '@/lib/config';
import { cn } from "@/lib/utils";
import { Waves } from 'lucide-react';

// Define Category type
interface Category {
  name: string;
  icon?: React.ComponentType<{ className?: string }>;
}

// Updated categories for sports facilities - EXPORTED
export const categoriasDisponibles: Category[] = [
    { name: 'Todos', icon: Building },
    { name: 'Canchas de fútbol salón', icon: Building },
    { name: 'Canchas de fútbol', icon: Building },
    { name: 'Canchas de baloncesto', icon: Building },
    { name: 'Canchas de vóleibol', icon: Building },
    { name: 'Canchas múltiples', icon: LayoutGrid },
    { name: 'Gimnasios', icon: Dumbbell },
    { name: 'Salones de yoga, pilates o danza', icon: Users },
    { name: 'Piscinas olímpicas o recreativas', icon: Waves },
    { name: ' entrenamiento funcional o crossfit', icon: Dumbbell },
    { name: 'Canchas de tenis', icon: Building },
    { name: 'Canchas de squash', icon: Building },
    { name: 'Canchas de pádel', icon: Building },
];


// Define SportsFacility interface - EXPORTED
export interface SportsFacility {
  id: string;
  name: string;
  type: string;
  location: string;
  rate: number;
  rating: number;
  category: 'Canchas de fútbol salón' | 'Canchas de fútbol' | 'Canchas múltiples' | 
  'Polideportivos'|'Canchas de baloncesto'|'Gimnasios'| 'Salones de yoga, pilates o danza'|
  'Piscinas olímpicas o recreativas' |' entrenamiento funcional o crossfit' |
  'Canchas de tenis' |'Canchas de squash' |  'Canchas de pádel';// puedes añadir más categorías si es necesario
  description: string;
  image: string;
  dataAiHint: string;
  amenities?: string[];
  availability: Record<number, string[]>; // 0=Sun, 1=Mon...6=Sat
  phone?: string;
  whatsapp?: string;
  imageUrls?: string[];
}

// Datos ficticios de instalaciones deportivas que reflejan nuevas categorías y ubicaciones en Bogotá - EXPORTED
export const dummySportsFacilities: SportsFacility[] = [
  {
    id: 'sf1',
    name: 'Cancha Sintética "La Bombonera"',
    type: 'Fútbol salón techado',
    location: 'Cl. 102a #70B-45, Bogotá, Colombia',
    rate: 80000, rating: 4.7, category: 'Canchas de fútbol salón',
    description: 'Cancha sintética cubierta para fútbol de salón, con iluminación LED y graderías.',
    image: 'https://i.ibb.co/5WYTmDXH/miii.png',
    dataAiHint: "futsal court indoor",
    imageUrls: [
      'https://i.ibb.co/5WYTmDXH/miii.png',
      'https://i.ibb.co/DHZGCbLf/unnamed.png',
      'https://i.ibb.co/8gVnPPMD/mmmp-ng.png'
    ],
    amenities: ['Cubierta', 'Iluminación LED', 'Graderías', 'Baños', 'Fútbol Salón'],
    availability: {
      1: ['07:00', '08:00','09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00' ],
      2: ['07:00', '08:00','09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00' ],
      3: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', ],
      4: ['07:00', '08:00','09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', ],
      5: ['07:00', '08:00','09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', ],
      6: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'],
      0: ['09:00', '10:00', '11:00', '12:00', '14:00','15:00']
    },
    phone: '+573188707260',
    whatsapp: '+573188707260',
  },
  {
    id: 'sf9',
    name: 'Cancha de futbol Parque naacional ',
    type: 'Cancha de fútbol 11, grama natural',
    location: ' Parque naacional,Teusaquillo, Bogotá, Colombia',
    rate: 150000, rating: 4.5, category: 'Canchas de fútbol',
    description: 'Cancha auxiliar de grama natural para fútbol 11, bien mantenida.',
    image: 'https://i.ibb.co/WNcb55TX/Campo-de-F-tbol.png', dataAiHint: "football field grass",
    imageUrls: ['https://i.ibb.co/WNcb55TX/Campo-de-F-tbol.png', 
      'https://i.ibb.co/Xkp886k0/moo.png'],
    amenities: ['Grama Natural', 'Fútbol 11', 'Camerinos', 'Parqueadero'],
    availability: {
      1: [ '14:00', '15:00', '16:00', '17:00'],
      2: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
      3: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
      4: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
      5: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
      6: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
      0: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00']
    },
    phone: '+57601 647 7503',
    whatsapp: '+57311 2953792',
  },
  {
    id: 'sf2',
    name: 'Gimnasio "Músculos de Acero"',
    type: 'Gimnasio completo y funcional cubierto',
    location: 'Ak 7 #43-53, Bogotá, Colombia',
    rate: 15000, rating: 4.9, category: 'Gimnasios',
    description: 'Gimnasio totalmente equipado con máquinas y zona funcional.',
    image: 'https://i.ibb.co/KpX6hKkY/gimn.png', dataAiHint: "gym fitness equipment",
    imageUrls: ['https://ibb.co/dw6QR1Q0', 'https://i.ibb.co/W4FcLqcW/gimn.webp', 'https://i.ibb.co/KpX6hKkY/gimn.png'],
    amenities: ['Máquinas Cardio', 'Pesas Libres', 'Clases Grupales', 'Vestuarios'],
    availability: {
      1: ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'],
      2: ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'],
      3: ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'],
      4: ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'],
      5: ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'],
      6: ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
      0: ['08:00', '09:00', '10:00', '11:00', '12:00'] // Domingo
    },
    phone: undefined,
    whatsapp: '+573201112233',
  },
  {
    id: 'sf3',
    name: 'Piscina Olímpica "El Tritón"',
    type: 'Piscina olímpica al aire libre',
    location: 'Salitre, Bogotá, Colombia',
    rate: 25000, rating: 4.6, category: 'Piscinas olímpicas o recreativas',
    description: 'Piscina de 50 metros, ideal para natación y entrenamiento. Carriles disponibles.',
    image: 'https://i.ibb.co/KxvmdxZx/Piscina-Complejo-Acu-tico.png', dataAiHint: "swimming pool water",
    imageUrls: ['https://i.ibb.co/KxvmdxZx/Piscina-Complejo-Acu-tico.png', 
      'https://i.ibb.co/5hT2pDTb/999p-n.png'],
    amenities: ['Olímpica', 'Carriles de Nado', 'Clases de Natación', 'Lockers'],
    availability: {
      1: [],
      2: ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'],
      3: ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'],
      4: ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'],
      5: ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'],
      6: ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'],
      0: ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
    },
    phone: '+573015557799',
    whatsapp: '+573015557799',
  },
  {
    id: 'sf4',
    name: 'Club de Tenis "El Grand Slam"',
    type: 'Canchas de tenis de arcilla al aire libre',
    location: 'Suba, Bogotá, Colombia',
    rate: 50000, rating: 4.8, category: 'Canchas de tenis',
    description: 'Complejo con 4 canchas de tenis de arcilla. Iluminación nocturna.',
    image: 'https://i.ibb.co/23QqL2VL/studitnmm.png', dataAiHint: "tennis court clay",
    imageUrls: ['https://i.ibb.co/TBT7XGC9/tenis.png'],
    amenities: ['Arcilla', 'Iluminación Nocturna', 'Alquiler de Raquetas', 'Cafetería'],
    availability: {
      1: ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'],
      2: ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'],
      3: ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'],
      4: ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'],
      5: ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'],
      6: ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'],
      0: ['09:00', '10:00', '11:00', '12:00'] // Domingo
    },
    phone: '+573112223344',
    whatsapp: undefined,
  },
  {
    id: 'sf5',
    name: 'Dojo "Bushido"',
    type: 'Tatami para artes marciales (Karate, Judo) interior',
    location: 'Av. Caracas #12-31 sur local 7, Bogotá, Colombia',
    rate: 30000, rating: 4.5, category: 'Canchas múltiples',
    description: 'Espacio tradicional para la práctica de artes marciales, con equipo completo.',
    image: 'https://i.ibb.co/5WqmD4L4/kamm.png', dataAiHint: "dojo martial arts",
    imageUrls: ['https://i.ibb.co/sv1XkGFT/TATAMI-2.png'],
    amenities: ['Tatami', 'Espejos', 'Equipo de protección', 'Vestuarios'],
    availability: {
      1: ['18:00', '19:00', '20:00'],
      2: [],
      3: ['18:00', '19:00', '20:00'],
      4: [],
      5: ['18:00', '19:00', '20:00'],
      6: ['09:00', '10:00', '11:00'],
      0: ['09:00', '10:00', '11:00']
    },
    phone: '+57321 3511122',
    whatsapp: '+57321 3511122',
  },
   {
    id: 'sf6',
    name: 'Estudio "Zen Yoga"',
    type: 'Salón de Yoga y Pilates interior',
    location: 'La Candelaria, Bogotá, Colombia',
    rate: 20000, rating: 4.9, category: 'Salones de yoga, pilates o danza',
    description: 'Ambiente tranquilo y acogedor para clases de yoga, pilates y meditación.',
    image: 'https://i.ibb.co/zVWX2CM9/miiii.png', dataAiHint: "yoga studio zen",
    imageUrls: ['https://placehold.co/400x300.png', 'https://placehold.co/800x450.png?text=Sala+Meditaci%C3%B3n', 'https://placehold.co/800x450.png?text=Clases+Guiadas'],
    amenities: ['Mats de Yoga', 'Bloques', 'Música Ambiental', 'Té de cortesía'],
    availability: {
      1: ['07:00', '08:00', '18:00', '19:00'],
      2: ['07:00', '08:00', '18:00', '19:00'],
      3: ['07:00', '08:00', '18:00', '19:00'],
      4: ['07:00', '08:00', '18:00', '19:00'],
      5: ['07:00', '08:00', '17:00', '18:00'],
      6: ['09:00', '10:00', '11:00'],
      0: []
    },
    phone: undefined,
    whatsapp: '+573187654321',
  },
  {
    id: 'sf8',
    name: 'Polideportivo El Salitre',
    type: 'Canchas múltiples (baloncesto, vóleibol) techado',
    location: 'Salitre, Bogotá, Colombia',
    rate: 60000, rating: 4.5, category: 'Canchas múltiples',
    description: 'Amplio espacio con canchas demarcadas para baloncesto y voleibol, graderías.',
    image: 'https://i.ibb.co/TDCkfG33/7798h.png', dataAiHint: "sports complex indoor",
    imageUrls: ['https://i.ibb.co/xQHyvKB/mm.png' ],
    amenities: ['Techado', 'Graderías', 'Baloncesto', 'Vóleibol', 'Baños'],
    availability: {
      1: ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'],
      2: ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'],
      3: ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'],
      4: ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'],
      5: ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'],
      6: ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'],
      0: ['09:00','10:00','11:00','12:00','13:00','14:00','15:00']
    },
    phone: '+573052468135',
    whatsapp: '+573052468135',
  },
  {
    id: 'sf_new_from_form',
    name: 'Cancha La Publicada',
    type: 'Fútbol 5 Iluminada',
    location: 'Barrio Nuevo, Bogotá',
    rate: 75000,
    rating: 4.2,
    category: 'Canchas de fútbol salón',
    description: 'Esta es una cancha recién publicada desde el formulario de ejemplo. Ideal para partidos nocturnos.',
    image: 'https://i.ibb.co/TqmTn4CV/descargamm.png',
    imageUrls: ['https://i.ibb.co/YwK8gsW/mmm.png', ],
    dataAiHint: 'soccer court night',
    amenities: ['Iluminación LED', 'Parqueadero cercano', 'Mallas nuevas'],
    availability: {
      1: ['18:00', '19:00', '20:00', '21:00'], // Lunes
      2: ['18:00', '19:00', '20:00', '21:00'], // Martes
      3: ['18:00', '19:00', '20:00', '21:00'], // Miércoles
      4: ['18:00', '19:00', '20:00', '21:00'], // Jueves
      5: ['17:00', '18:00', '19:00', '20:00', '21:00', '22:00'], // Viernes
      6: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'], // Sábado
      0: ['9:00','10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'], // Domingo
    },
    phone: '+573012345678',
    whatsapp: '+573012345678',
  }
];

// Helper function to match facility type with filter category
const typeMatchesFilter = (facilityType: string, filterCategory: string): boolean => {
    const typeLower = facilityType.toLowerCase();
    const filterLower = filterCategory.toLowerCase();

    if (filterLower === 'todos') return true;

    const categoryKeywords: Record<string, string[]> = {
        'canchas de fútbol salón': ['fútbol salón', 'futbol sala', 'futsal', 'microfutbol', 'fútbol de salón'],
        'canchas de fútbol': ['fútbol', 'futbol', 'soccer', 'cancha de 11', 'cancha de 7', 'cancha de 9', 'football', 'grama natural', 'grama sintética'],
        'canchas de baloncesto': ['baloncesto', 'basketball', 'basket'],
        'canchas de vóleibol': ['vóleibol', 'voleibol', 'volleyball'],
        'canchas múltiples': ['múltiple', 'multiuso', 'polivalente', 'multifuncional', 'polideportivo'],
        'gimnasios cubiertos': ['gimnasio', 'gym', 'fitness center'],
        'salones de yoga, pilates o danza': ['yoga', 'pilates', 'danza', 'baile', 'meditación'],
        'piscinas olímpicas o recreativas': ['piscina', 'swimming', 'nado', 'acuático', 'olímpica', 'recreativa'],
        'estudios de entrenamiento funcional o crossfit': ['funcional', 'crossfit', 'hiit', 'entrenamiento en circuito', 'training studio'],
        'canchas de tenis': ['tenis', 'tennis', 'campo de tenis'],
        'canchas de squash': ['squash', 'cancha de squash'],
        'canchas de pádel': ['pádel', 'padel', 'cancha de pádel'],
    };

    const keywords = categoryKeywords[filterCategory];
    if (keywords) {
        return keywords.some(keyword => typeLower.includes(keyword.toLowerCase()));
    }

    const firstFilterWord = filterLower.split(' ')[0];
    return typeLower.includes(firstFilterWord);
};


// Component for Filter Controls
const FiltersContent = ({
    currentFilterCategory, setCurrentFilterCategory,
    currentFilterLocation, setCurrentFilterLocation,
    currentFilterMinRating, setCurrentFilterMinRating,
    currentFilterMaxRate, setCurrentFilterMaxRate,
    onApplyFilters,
}: {
    currentFilterCategory: string; setCurrentFilterCategory: (cat: string) => void;
    currentFilterLocation: string; setCurrentFilterLocation: (loc: string) => void;
    currentFilterMinRating: number; setCurrentFilterMinRating: (rate: number) => void;
    currentFilterMaxRate: number; setCurrentFilterMaxRate: (rate: number) => void;
    onApplyFilters: () => void;
}) => {
    return (
     <div className="space-y-6 p-4 h-full flex flex-col">
         <div className="space-y-2">
             <Label htmlFor="category-select">Categoría</Label>
             <Select value={currentFilterCategory} onValueChange={setCurrentFilterCategory}>
                 <SelectTrigger id="category-select">
                     <SelectValue placeholder="Selecciona un tipo de instalación" />
                 </SelectTrigger>
                 <SelectContent>
                     {categoriasDisponibles.map(category => (
                         <SelectItem key={category.name} value={category.name}>
                            {category.icon && <category.icon className="inline-block h-4 w-4 mr-2 text-muted-foreground" />}
                            {category.name}
                         </SelectItem>
                     ))}
                 </SelectContent>
             </Select>
         </div>

         <div className="space-y-2">
             <Label htmlFor="location-input">Ubicación</Label>
             <div className="relative">
                 <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input
                     id="location-input"
                     placeholder="Ej: Chapinero, Bogotá"
                     value={currentFilterLocation}
                     onChange={(e) => setCurrentFilterLocation(e.target.value)}
                     className="pl-9"
                 />
             </div>
         </div>

         <div className="space-y-2">
             <Label htmlFor="rating-slider">Valoración Mínima</Label>
              <div className="flex items-center gap-2">
                 <Star className="h-5 w-5 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                 <Slider
                     id="rating-slider"
                     min={0}
                     max={5}
                     step={0.1}
                     value={[currentFilterMinRating]}
                     onValueChange={(value) => setCurrentFilterMinRating(value[0])}
                     className="flex-grow"
                 />
                 <span className="text-sm font-medium w-8 text-right">{currentFilterMinRating.toFixed(1)}</span>
             </div>
         </div>

         <div className="space-y-2">
             <Label htmlFor="rate-slider">Tarifa Máxima (/hr)</Label>
             <div className="flex items-center gap-2">
                <Slider
                    id="rate-slider"
                    min={0}
                    max={200000} // Example max rate
                    step={5000}
                    value={[currentFilterMaxRate]}
                    onValueChange={(value) => setCurrentFilterMaxRate(value[0])}
                    className="flex-grow"
                />
                <span className="text-sm font-medium w-24 text-right">
                    {currentFilterMaxRate.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                </span>
             </div>
          </div>

          <div className="mt-auto pt-6 border-t">
            <SheetClose asChild>
                <Button className="w-full" onClick={onApplyFilters}>Mostrar Resultados</Button>
            </SheetClose>
         </div>
     </div>
    );
};

const SportsFacilitiesContent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [favoritedItems, setFavoritedItems] = useState<Set<string>>(new Set());

  const [currentFilterCategory, setCurrentFilterCategory] = useState('Todos');
  const [currentFilterLocation, setCurrentFilterLocation] = useState('');
  const [currentFilterMinRating, setCurrentFilterMinRating] = useState(0);
  const [currentFilterMaxRate, setCurrentFilterMaxRate] = useState(200000);

  const [appliedFilters, setAppliedFilters] = useState({
    category: 'Todos',
    location: '',
    rating: 0,
    rate: 200000,
  });

  useEffect(() => {
    setCurrentFilterCategory(appliedFilters.category);
    setCurrentFilterLocation(appliedFilters.location);
    setCurrentFilterMinRating(appliedFilters.rating);
    setCurrentFilterMaxRate(appliedFilters.rate);
  }, [appliedFilters]);

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({
      category: currentFilterCategory,
      location: currentFilterLocation,
      rating: currentFilterMinRating,
      rate: currentFilterMaxRate,
    });
    setIsSheetOpen(false);
  }, [currentFilterCategory, currentFilterLocation, currentFilterMinRating, currentFilterMaxRate]);


  const filteredFacilities = dummySportsFacilities.filter(facility => {
    const validSportsCategories = [
 'Canchas de fútbol salón',
 'Canchas de fútbol',
 'Canchas múltiples',
 'Polideportivos',
 'Canchas de baloncesto',
 'Gimnasios',
 'Salones de yoga, pilates o danza',
 'Piscinas olímpicas o recreativas',
 ' entrenamiento funcional o crossfit',
 'Canchas de tenis',
 'Canchas de squash',
 'Canchas de pádel',
 ];
    const facilityIsSportsFacility = validSportsCategories.includes(facility.category);
    const matchesCategory = appliedFilters.category === 'Todos' || typeMatchesFilter(facility.type, appliedFilters.category);
    const matchesLocation = appliedFilters.location === '' || facility.location.toLowerCase().includes(appliedFilters.location.toLowerCase());
    const matchesRating = facility.rating >= appliedFilters.rating;
    const matchesRate = facility.rate <= appliedFilters.rate;
    const matchesSearch = searchQuery === '' ||
                          facility.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          facility.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (facility.amenities && facility.amenities.some(amenity => amenity.toLowerCase().includes(searchQuery.toLowerCase())));

    return facilityIsSportsFacility && matchesCategory && matchesLocation && matchesRating && matchesRate && matchesSearch;
  });

  const toggleFavorite = (itemId: string) => {
    setFavoritedItems(prevFavorites => {
      const newFavorites = new Set(prevFavorites);
      if (newFavorites.has(itemId)) {
        newFavorites.delete(itemId);
      } else {
        newFavorites.add(itemId);
      }
      return newFavorites;
    });
  };

  return (
    <div className="flex flex-col h-full">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4 sm:px-6 flex-shrink-0">
            <h1 className="text-lg font-semibold mr-auto">Espacios Deportivos</h1>

            <div className="relative w-full max-w-xs sm:max-w-sm ml-auto">
                <Input
                    type="search"
                    placeholder="Buscar espacios..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-md shadow-sm pr-10 h-9 text-sm w-full"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                  <Button variant="outline" className="flex-shrink-0 h-9 text-xs px-3">
                      <Filter className="mr-2 h-4 w-4" /> Filtros
                  </Button>
              </SheetTrigger>
              <SheetContent className="p-0 w-[85%] sm:w-[320px] flex flex-col">
                  <SheetHeader className="p-4 border-b">
                      <SheetTitle>Filtros</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="flex-grow">
                      <FiltersContent
                          currentFilterCategory={currentFilterCategory} setCurrentFilterCategory={setCurrentFilterCategory}
                          currentFilterLocation={currentFilterLocation} setCurrentFilterLocation={setCurrentFilterLocation}
                          currentFilterMinRating={currentFilterMinRating} setCurrentFilterMinRating={setCurrentFilterMinRating}
                          currentFilterMaxRate={currentFilterMaxRate} setCurrentFilterMaxRate={setCurrentFilterMaxRate}
                          onApplyFilters={handleApplyFilters}
                      />
                  </ScrollArea>
              </SheetContent>
           </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        {filteredFacilities.length > 0 ? (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {filteredFacilities.map(facility => (
                <Card key={facility.id} className="flex flex-col overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 bg-card">
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                        <Image
                            src={facility.image || `https://placehold.co/400x300.png`}
                            alt={facility.name}
                            fill
                            style={{ objectFit: "cover" }}
                            data-ai-hint={facility.dataAiHint}
                        />
                    </div>
                    <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start gap-2">
                            <div className="flex-grow">
                                <CardTitle className="text-lg font-semibold">
                                    {facility.name}
                                </CardTitle>
                                <CardDescription className="text-sm text-muted-foreground line-clamp-1">{facility.type}</CardDescription>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive flex-shrink-0 -mt-1 -mr-1"
                              onClick={() => toggleFavorite(facility.id)}
                              aria-label={favoritedItems.has(facility.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
                            >
                              <Heart className={cn("h-5 w-5", favoritedItems.has(facility.id) && "fill-destructive text-destructive")} />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow p-4 pt-0 space-y-1.5">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                            {facility.description}
                        </p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                            <span>{facility.location}</span>
                        </div>
                        {facility.amenities && facility.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                                {facility.amenities.slice(0,3).map(amenity => (
                                    <Badge key={amenity} variant="secondary" className="text-xs">{amenity}</Badge>
                                ))}
                            </div>
                        )}
                        <div className="flex items-center gap-1 text-sm">
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                            <span className="font-semibold text-foreground">{facility.rating.toFixed(1)}</span>
                        </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-2 border-t mt-auto bg-muted/30">
                        <div className="flex justify-between items-center w-full">
                             <p className="text-sm">
                                Tarifa: <span className="font-bold text-lg text-primary">${facility.rate.toLocaleString('es-CO')}</span>
                                {HOURLY_RATE_CATEGORIES.includes('Instalación Deportiva') ? <span className="text-xs text-muted-foreground">/hr</span> : ''}
                            </p>
                            <Button size="sm" className="h-8 text-xs sm:text-sm" asChild>
                                <Link href={`/facility/${facility.id}`}>Ver Detalles</Link>
                            </Button>
                        </div>
                    </CardFooter>
              </Card>
            ))}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-center p-8 border rounded-lg bg-card mt-6">
            <Search className="h-12 w-12 mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium">No se encontraron espacios deportivos</p>
            <p className="text-sm">Intenta ajustar tu búsqueda o los filtros.</p>
            </div>
        )}
        </main>
    </div>
  );
};

const SportsFacilitiesPage = () => {
  return (
     <AppLayout>
       <SportsFacilitiesContent />
     </AppLayout>
  );
};

export default SportsFacilitiesPage;