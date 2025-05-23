/** @format */
"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import AppLayout from '@/layout/AppLayout';
import { Heart, MapPin, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import type { ServiceListing } from '@/services/service-listings';
import type { SportsFacility } from '@/app/sports-facilities/page'; 
import { HOURLY_RATE_CATEGORIES } from '@/lib/config';
import { Badge } from '@/components/ui/badge'; // Import Badge

// Combined type for favorited items
type FavoriteItem = (ServiceListing & { itemType: 'service' }) | (SportsFacility & { itemType: 'facility' });

// Updated mock data to match the image
const mockFavoritedItemsData: FavoriteItem[] = [
  {
    itemType: 'service',
    id: '2', 
    title: 'Desarrollo Web Frontend',
    description: 'Creación de interfaces de usuario interactivas y responsivas para tu sitio web.', 
    rate: 75000,
    availability: { 1: ["09:00", "10:00"], 2: ["14:00"] }, 
    category: 'Tecnología',
    location: 'Remoto',
    imageUrl: 'https://i.ibb.co/RTqtCwHP/96df4a87-dcb2-43be-bc13-6923c168f9e5.png', 
    dataAiHint: 'web development code',
    professionalName: "Carlos Rodriguez",
    rating: 4.7,
  },
  {
    itemType: 'service',
    id: '3', 
    title: 'Entrenamiento Fitness Personalizado',
    description: 'Planes personalizados para tus objetivos de fitness. Sesiones individuales/grupales.', 
    rate: 50000,
    availability: { 1: ["07:00", "18:00"], 6: ["09:00"] }, 
    category: 'Entrenador Personal',
    location: 'Gimnasio Local Central, Bogotá', 
    imageUrl: 'https://i.ibb.co/RpPLR1vt/Leonardo-Phoenix-09-A-vibrant-and-energetic-advertisement-feat-1.png', 
    dataAiHint: 'personal training workout',
    professionalName: "Ana García",
    rating: 4.9,
  },
  {
    itemType: 'facility',
    id: 'sf1',
    name: 'Cancha Sintética "La Bombonera"',
    type: 'Fútbol salón techado',
    location: 'Chapinero Alto, Bogotá, Colombia',
    rate: 80000, rating: 4.7, category: 'Instalación Deportiva', // category is part of SportsFacility
    description: 'Cancha sintética cubierta para fútbol de salón, con iluminación LED y graderías.',
    image: 'https://placehold.co/400x300.png', 
    dataAiHint: "futsal court indoor",
    amenities: ['Cubierta', 'Iluminación LED', 'Graderías', 'Baños', 'Fútbol Salón'],
    availability: {}, // Not directly used in favorite card, but part of type
  },
  {
    itemType: 'facility',
    id: 'sf9',
    name: 'Estadio El Campín (Cancha Auxiliar)',
    type: 'Cancha de fútbol 11, grama natural',
    location: 'Teusaquillo, Bogotá, Colombia',
    rate: 150000, rating: 4.5, category: 'Instalación Deportiva', // category is part of SportsFacility
    description: 'Cancha auxiliar de grama natural para fútbol 11, bien mantenida.',
    image: 'https://placehold.co/400x300.png', 
    dataAiHint: "football field grass",
    amenities: ['Grama Natural', 'Fútbol 11', 'Camerinos', 'Parqueadero'],
    availability: {}, // Not directly used in favorite card, but part of type
  },
];


const FavoritesContent = () => {
  const [favoritedItems, setFavoritedItems] = useState<FavoriteItem[]>(mockFavoritedItemsData);
  const [toggledFavorites, setToggledFavorites] = useState<Set<string>>(() => {
    const initialFavorites = new Set<string>();
    mockFavoritedItemsData.forEach(item => initialFavorites.add(item.id));
    return initialFavorites;
  });

  const toggleFavorite = (itemId: string) => {
    setToggledFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(itemId)) {
        newFavorites.delete(itemId);
        setFavoritedItems(currentItems => currentItems.filter(item => item.id !== itemId));
      } else {
        // Adding back not implemented here, only removal from view.
      }
      return newFavorites;
    });
  };

  const isEmpty = favoritedItems.length === 0;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold flex items-center">
          <Heart className="mr-3 h-7 w-7 text-primary" />
          Mis Favoritos
        </h1>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-15rem)] text-center border rounded-lg bg-card p-8">
          <Heart className="h-16 w-16 text-muted-foreground/50 mb-6" />
          <h2 className="text-xl font-medium mb-2 text-foreground">No tienes favoritos todavía</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Marca tus servicios independientes y espacios deportivos preferidos con el ícono de corazón para verlos aquí.
          </p>
          <div className="flex gap-4">
            <Button asChild>
              <Link href="/">Explorar Servicios Independientes</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/sports-facilities">Explorar Espacios Deportivos</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {favoritedItems.map((item) => (
            <Card key={item.id} className="flex flex-col overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 bg-card">
              <Link href={item.itemType === 'service' ? `/service/${item.id}` : `/facility/${item.id}`} passHref>
                <div className="relative aspect-[4/3] w-full overflow-hidden cursor-pointer">
                  <Image
                    src={(item.itemType === 'service' ? item.imageUrl : item.image) || `https://placehold.co/400x300.png`}
                    alt={item.itemType === 'service' ? item.title : item.name}
                    fill
                    style={{ objectFit: "cover" }}
                    data-ai-hint={item.dataAiHint || (item.itemType === 'service' ? `${(item as ServiceListing).category} service` : "sports facility")}
                  />
                </div>
              </Link>
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-grow">
                    <CardTitle className="text-lg font-semibold">
                      <Link href={item.itemType === 'service' ? `/service/${item.id}` : `/facility/${item.id}`} className="hover:underline">
                        {item.itemType === 'service' ? item.title : item.name}
                      </Link>
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground line-clamp-1">
                      {item.itemType === 'service' ? (item as ServiceListing).category : (item as SportsFacility).type}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive flex-shrink-0 -mt-1 -mr-1"
                    onClick={() => toggleFavorite(item.id)}
                    aria-label={toggledFavorites.has(item.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
                  >
                    <Heart className={cn("h-5 w-5", toggledFavorites.has(item.id) && "fill-destructive text-destructive")} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-grow p-4 pt-0 space-y-1.5">
                {item.itemType === 'facility' && item.description && (
                     <p className="text-xs text-muted-foreground line-clamp-2 pt-1">
                        {item.description}
                     </p>
                )}
                {item.itemType === 'service' && item.description && ( // Optionally show description for services too
                     <p className="text-xs text-muted-foreground line-clamp-2 pt-1">
                        {item.description}
                     </p>
                )}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  <span>{item.location}</span>
                </div>
                {item.itemType === 'facility' && (item as SportsFacility).amenities && (item as SportsFacility).amenities!.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                        {(item as SportsFacility).amenities!.slice(0, 3).map(amenity => (
                            <Badge key={amenity} variant="secondary" className="text-xs">{amenity}</Badge>
                        ))}
                    </div>
                )}
                {item.rating !== undefined && (
                   <div className="flex items-center gap-1 text-sm">
                     <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                     <span className="font-semibold text-foreground">{item.rating.toFixed(1)}</span>
                   </div>
                )}
                 <p className="text-sm">
                    <span className="text-muted-foreground">Tarifa: </span>
                    <span className="font-medium text-foreground">${item.rate.toLocaleString('es-CO')}</span>
                    {(item.itemType === 'service' && HOURLY_RATE_CATEGORIES.includes((item as ServiceListing).category)) || (item.itemType === 'facility' && HOURLY_RATE_CATEGORIES.includes('Instalación Deportiva')) ? <span className="text-xs text-muted-foreground"> por hora</span> : ''}
                </p>
                {item.itemType === 'service' && (item as ServiceListing).professionalName && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Profesional: </span>
                    <span className="text-foreground">{(item as ServiceListing).professionalName}</span>
                  </p>
                )}
              </CardContent>
              <CardFooter className="p-4 pt-2 border-t mt-auto bg-muted/30">
                <div className="flex justify-between items-center w-full">
                  <Button size="sm" className="w-full h-8 text-xs sm:text-sm" asChild>
                    <Link href={item.itemType === 'service' ? `/service/${item.id}` : `/facility/${item.id}`}>
                      {item.itemType === 'service' ? 'Reservar Servicio' : 'Ver Espacio'}
                    </Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const FavoritesPage = () => {
  return (
    <AppLayout>
      <FavoritesContent />
    </AppLayout>
  );
};

export default FavoritesPage;
