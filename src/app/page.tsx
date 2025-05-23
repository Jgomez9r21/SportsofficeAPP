
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Star, Filter, X, Heart, Briefcase, BarChart, Camera, Edit, Music, Lightbulb, UserCircle, Code as CodeIcon, Construction as ConstructionIcon, School2 as School2Icon, Palette as PaletteIcon, HomeIcon as LucideHomeIcon, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import Image from 'next/image';
import Link from 'next/link';
import { HOURLY_RATE_CATEGORIES } from '@/lib/config';
import { cn } from "@/lib/utils";
import { getServiceListings, type ServiceListing } from '@/services/service-listings';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/context/AuthContext';

// Service Categories (from post-job/page.tsx)
interface ServiceCategory {
  name: string;
  icon?: React.ComponentType<{ className?: string }>;
}
const serviceCategories: ServiceCategory[] = [
  { name: 'Todos', icon: Briefcase },
  { name: 'Tecnología', icon: CodeIcon },
  { name: 'Entrenador Personal', icon: UserCircle },
  { name: 'Contratista', icon: ConstructionIcon },
  { name: 'Mantenimiento Hogar', icon: LucideHomeIcon },
  { name: 'Profesores', icon: School2Icon },
  { name: 'Diseñadores', icon: PaletteIcon },
  { name: 'Marketing Digital', icon: BarChart },
  { name: 'Video & Animación', icon: Camera },
  { name: 'Redacción & Traducción', icon: Edit },
  { name: 'Música & Audio', icon: Music },
  { name: 'Finanzas', icon: BarChart },
  { name: 'Crecimiento Personal', icon: Lightbulb },
  { name: 'Seguridad', icon: Shield},
  { name: 'Fotografía', icon: Camera },
];

// Helper function to match service category with filter category
const categoryMatchesFilter = (serviceCategory: string, filterCategory: string): boolean => {
    if (filterCategory === 'Todos') return true;
    return serviceCategory.toLowerCase() === filterCategory.toLowerCase();
};

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
             <Label htmlFor="service-category-select">Categoría del Servicio</Label>
             <Select value={currentFilterCategory} onValueChange={setCurrentFilterCategory}>
                 <SelectTrigger id="service-category-select">
                     <SelectValue placeholder="Selecciona una categor\xeda" />
                 </SelectTrigger>
                 <SelectContent>
                     {serviceCategories.map(category => (
                         <SelectItem key={category.name} value={category.name}>
                            {category.icon && <category.icon className="inline-block h-4 w-4 mr-2 text-muted-foreground" />}
                            {category.name}
                         </SelectItem>
                     ))}
                 </SelectContent>
             </Select>
         </div>

         <div className="space-y-2">
             <Label htmlFor="service-location-input">Ubicación / Modalidad</Label>
             <div className="relative">
                 <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input
                     id="service-location-input"
                     placeholder="Ej: Remoto, Bogotá"
                     value={currentFilterLocation}
                     onChange={(e) => setCurrentFilterLocation(e.target.value)}
                     className="pl-9"
                 />
             </div>
         </div>

         <div className="space-y-2">
             <Label htmlFor="service-rating-slider">Valoración Mínima</Label>
              <div className="flex items-center gap-2">
                 <Star className="h-5 w-5 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                 <Slider
                     id="service-rating-slider"
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
             <Label htmlFor="service-rate-slider">Tarifa Máxima</Label>
             <div className="flex items-center gap-2">
                <Slider
                    id="service-rate-slider"
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
             <p className="text-xs text-muted-foreground">La tarifa puede ser por hora o por proyecto, según el servicio.</p>
          </div>

          <div className="mt-auto pt-6 border-t">
            <SheetClose asChild>
                <Button className="w-full" onClick={onApplyFilters}>Mostrar Resultados</Button>
            </SheetClose>
         </div>
     </div>
    );
};

const ServiceListingsPageContent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  // const [favoritedItems, setFavoritedItems] = useState<Set<string>>(new Set()); // Favorite state can be added back if needed
  const [serviceListings, setServiceListings] = useState<ServiceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { openLoginDialog, isLoggedIn } = useAuth();


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
    const fetchListings = async () => {
      setIsLoading(true);
      try {
        const listings = await getServiceListings();
        setServiceListings(listings);
      } catch (error) {
        console.error("Error fetching service listings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchListings();
  }, []);


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


  const filteredServices = serviceListings.filter(service => {
    const matchesCategory = appliedFilters.category === 'Todos' || categoryMatchesFilter(service.category, appliedFilters.category);
    const matchesLocation = appliedFilters.location === '' || service.location.toLowerCase().includes(appliedFilters.location.toLowerCase());
    const matchesRating = (service.rating || 0) >= appliedFilters.rating;
    const matchesRate = service.rate <= appliedFilters.rate;
    const matchesSearch = searchQuery === '' ||
                          service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          service.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (service.professionalName && service.professionalName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesLocation && matchesRating && matchesRate && matchesSearch;
  });

  // const toggleFavorite = (itemId: string) => { // Favorite functionality can be added back if needed
  //    if (!isLoggedIn) {
  //       openLoginDialog();
  //       return;
  //     }
  //   setFavoritedItems(prevFavorites => {
  //     const newFavorites = new Set(prevFavorites);
  //     if (newFavorites.has(itemId)) {
  //       newFavorites.delete(itemId);
  //     } else {
  //       newFavorites.add(itemId);
  //     }
  //     console.log("Favorited items (simulated):", newFavorites);
  //     return newFavorites;
  //   });
  // };

  return (
    <div className="flex flex-col h-full">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4 sm:px-6 flex-shrink-0">
            <h1 className="text-lg font-semibold mr-auto whitespace-nowrap">Servicios Profesionales</h1>

            <div className="relative w-full max-w-xs sm:max-w-sm ml-auto">
                <Input
                    type="search"
                    placeholder="Buscar servicios..."
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
                      <SheetTitle>Filtrar Servicios</SheetTitle>
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
        {isLoading ? (
             <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                    <Card key={`skeleton-${i}`} className="flex flex-col overflow-hidden rounded-lg shadow-md bg-card animate-pulse">
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted"></div>
                        <CardHeader className="p-4 pb-2 space-y-2">
                            <div className="h-6 w-3/4 bg-muted rounded"></div>
                            <div className="h-4 w-1/2 bg-muted rounded"></div>
                        </CardHeader>
                        <CardContent className="flex-grow p-4 pt-0 space-y-2">
                            <div className="h-4 w-full bg-muted rounded"></div>
                            <div className="h-4 w-5/6 bg-muted rounded"></div>
                            <div className="h-4 w-1/3 bg-muted rounded mt-1"></div>
                        </CardContent>
                        <CardFooter className="p-4 pt-2 border-t mt-auto bg-muted/30">
                             <div className="h-8 w-1/2 bg-muted rounded"></div>
                             <div className="h-8 w-1/3 bg-muted rounded ml-auto"></div>
                        </CardFooter>
                    </Card>
                ))}
             </div>
        ) : filteredServices.length > 0 ? (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {filteredServices.map(service => (
                <Card key={service.id} className="flex flex-col overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 bg-card">
                    <Link href={`/service/${service.id}`} passHref>
                      <div className="relative aspect-[4/3] w-full overflow-hidden cursor-pointer">
                          <Image
                              src={service.imageUrl || (service.imageUrls && service.imageUrls[0]) || `https://placehold.co/400x300.png`}
                              alt={service.title}
                              fill
                              style={{ objectFit: "cover" }}
                              data-ai-hint={service.dataAiHint || `${service.category} service`}
                          />
                      </div>
                    </Link>
                    <CardContent className="flex-grow p-4 space-y-1">
                        <CardTitle className="text-lg font-semibold line-clamp-1">
                           <Link href={`/service/${service.id}`} className="hover:underline">
                              {service.title}
                            </Link>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{service.category}</p>
                        <p className="text-sm">
                            <span className="text-muted-foreground">Tarifa: </span>
                            <span className="font-medium text-foreground">${service.rate.toLocaleString('es-CO')}</span>
                            {HOURLY_RATE_CATEGORIES.includes(service.category) ? <span className="text-xs text-muted-foreground"> por hora</span> : <span className="text-xs text-muted-foreground"> /proyecto</span>}
                        </p>
                        {service.professionalName && (
                            <p className="text-sm">
                                <span className="text-muted-foreground">Profesional: </span>
                                <span className="text-foreground">{service.professionalName}</span>
                            </p>
                        )}
                         {service.rating && (
                            <div className="flex items-center gap-1 text-sm">
                                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                                <span className="font-semibold text-foreground">{service.rating.toFixed(1)}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                            <span>{service.location}</span>
                        </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-2 border-t bg-muted/30">
                        <Button size="sm" className="w-full h-9 text-sm" asChild>
                            <Link href={`/service/${service.id}`}>Reservar Servicio</Link>
                        </Button>
                    </CardFooter>
              </Card>
            ))}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-center p-8 border rounded-lg bg-card mt-6">
            <Search className="h-12 w-12 mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium">No se encontraron servicios</p>
            <p className="text-sm">Intenta ajustar tu búsqueda o los filtros.</p>
            </div>
        )}
        </main>
    </div>
  );
};


const HomePage = () => {
  return (
     <AppLayout>
       <ServiceListingsPageContent />
     </AppLayout>
  );
};

export default HomePage;

    
