
"use client";

// React and Next.js imports
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

// UI Component Imports
import AppLayout from '@/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent as ShadDialogContent, DialogDescription as ShadDialogDescription, DialogFooter as ShadDialogFooter, DialogHeader as ShadDialogHeader, DialogTitle as ShadDialogTitle, DialogTrigger as ShadDialogTrigger, DialogClose as ShadDialogDialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

// Lucide Icons - Verified and consolidated
import {
  FileText, Code, Dumbbell, Construction, Home as LucideHomeIcon, School2, Palette, BarChart,
  Camera, Edit, Music, DollarSign, Lightbulb, ImageIcon, Database, Briefcase,
  Search as SearchIcon, MapPin as MapPinIcon, Heart as HeartIcon, Filter as FilterIcon, Star as StarIcon,
  ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, CalendarIcon
} from "lucide-react";

// Utility and Config
import { cn } from "@/lib/utils";
import { format, getDay } from "date-fns";
import { es } from 'date-fns/locale';
// import { HOURLY_RATE_CATEGORIES } from '@/lib/config'; // Removed as not directly used
import type { ServiceListing } from '@/services/service-listings';
import { getServiceListings } from '@/services/service-listings';
// import { useAuth } from '@/context/AuthContext'; // Not directly used in JSX, can be omitted if not needed for logic

interface Category {
  name: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const categoriasServicios: Category[] = [
  { name: 'Todos', icon: FileText },
  { name: 'Tecnología', icon: Code },
  { name: 'Entrenador Personal', icon: Dumbbell },
  { name: 'Contratista', icon: Construction },
  { name: 'Mantenimiento Hogar', icon: LucideHomeIcon },
  { name: 'Profesores', icon: School2 },
  { name: 'Diseñadores', icon: Palette },
  { name: 'Marketing Digital', icon: BarChart },
  { name: 'Video & Animación', icon: Camera },
  { name: 'Redacción & Traducción', icon: Edit },
  { name: 'Música & Audio', icon: Music },
  { name: 'Finanzas', icon: DollarSign },
  { name: 'Crecimiento Personal', icon: Lightbulb },
  { name: 'Fotografía', icon: ImageIcon },
  { name: 'Seguridad', icon: Database },
  { name: 'Otros', icon: Briefcase },
];

const featuredIndependentServices = [
  { id: 'f1', title: 'Desarrollo Web Completo', description: 'Sitios web modernos y optimizados.', category: 'Tecnología', image: 'https://i.ibb.co/Zpfy3pVT/Chat-GPT-Image-21-may-2025-18-27-43.png', dataAiHint: "web development code" },
  { id: 'f2', title: 'Entrenamiento Funcional Intensivo', description: 'Supera tus límites y transforma tu físico.', category: 'Entrenador Personal', image: 'https://i.ibb.co/RpPLR1vt/Leonardo-Phoenix-09-A-vibrant-and-energetic-advertisement-feat-1.png', dataAiHint: "fitness training workout" },
  { id: 'f3', title: 'Diseño de Marca Completo', description: 'Crea una identidad visual única y memorable.', category: 'Diseñadores', image: 'https://i.ibb.co/TxdPckNJ/pixlr-image-generator-dc1c16b5-2d0b-43b1-b220-d9f8ef6caf99.png', dataAiHint: "brand design logo" },
  { id: 'f4', title: 'Consultoría SEO Estratégica', description: 'Posiciona tu web en los primeros lugares.', category: 'Marketing Digital', image: 'https://i.ibb.co/WNgcn1HV/publicidad-desarrollo-web.png', dataAiHint: "seo consulting strategy" },
];

const ServiceFiltersContent = ({
    selectedCategory, setSelectedCategory,
    locationFilter, setLocationFilter,
    minRating, setMinRating,
    maxRate, setMaxRate,
    onApplyFilters
}: {
    selectedCategory: string; setSelectedCategory: (cat: string) => void;
    locationFilter: string; setLocationFilter: (loc: string) => void;
    minRating: number; setMinRating: (rate: number) => void;
    maxRate: number; setMaxRate: (rate: number) => void;
    onApplyFilters: () => void;
}) => {
    return (
     <div className="space-y-6 p-4 h-full flex flex-col">
         <div className="space-y-2">
             <Label htmlFor="category-filter-select">Categoría</Label>
             <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                 <SelectTrigger id="category-filter-select">
                     <SelectValue placeholder="Selecciona una categoría" />
                 </SelectTrigger>
                 <SelectContent>
                     {categoriasServicios.map(category => (
                         <SelectItem key={category.name} value={category.name}>
                           {category.icon && <category.icon className="inline-block h-4 w-4 mr-2 text-muted-foreground" />}
                           {category.name}
                         </SelectItem>
                     ))}
                 </SelectContent>
             </Select>
         </div>

         <div className="space-y-2">
             <Label htmlFor="location-filter-input">Ubicación</Label>
             <div className="relative">
                 <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input
                     id="location-filter-input"
                     placeholder="Ciudad o Remoto"
                     value={locationFilter}
                     onChange={(e) => setLocationFilter(e.target.value)}
                     className="pl-9"
                 />
             </div>
         </div>

         <div className="space-y-2">
             <Label htmlFor="rating-filter-slider">Valoración Mínima</Label>
              <div className="flex items-center gap-2">
                 <StarIcon className="h-5 w-5 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                 <Slider
                     id="rating-filter-slider"
                     min={0}
                     max={5}
                     step={0.1}
                     value={[minRating]}
                     onValueChange={(value) => setMinRating(value[0])}
                     className="flex-grow"
                 />
                 <span className="text-sm font-medium w-8 text-right">{minRating.toFixed(1)}</span>
             </div>
         </div>

         <div className="space-y-2">
             <Label htmlFor="rate-filter-slider">Tarifa Máxima</Label>
             <div className="flex items-center gap-2">
                <Slider
                    id="rate-filter-slider"
                    min={0}
                    max={250000}
                    step={5000}
                    value={[maxRate]}
                    onValueChange={(value) => setMaxRate(value[0])}
                    className="flex-grow"
                />
                <span className="text-sm font-medium w-24 text-right">
                    {maxRate.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                </span>
             </div>
          </div>
          <div className="mt-auto pt-4">
            <SheetClose asChild>
                <Button className="w-full" onClick={onApplyFilters}>Mostrar Resultados</Button>
            </SheetClose>
         </div>
     </div>
    );
};

function IndependentServicesContent() {
  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryState, setSelectedCategoryState] = useState<string>('Todos');
  const [favoritedListings, setFavoritedListings] = useState<Set<string>>(new Set());

  const [locationFilter, setLocationFilter] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [maxRate, setMaxRate] = useState(250000);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const [dialogSelectedDate, setDialogSelectedDate] = useState<Date | undefined>(new Date());
  const [dialogSelectedTime, setDialogSelectedTime] = useState<string | undefined>();
  const [dialogAvailableTimeSlots, setDialogAvailableTimeSlots] = useState<string[]>([]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const handleCategorySelectFromFilter = useCallback((newCategory: string) => {
    setSelectedCategoryState(newCategory);
    const newPath = newCategory === 'Todos' ? pathname : `${pathname}?category=${encodeURIComponent(newCategory)}`;
    router.push(newPath, { scroll: false });
  }, [pathname, router]);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const data = await getServiceListings();
        const updatedData = data.map(listing => ({
          ...listing,
          category: categoriasServicios.some(cat => cat.name === listing.category) ? listing.category : 'Otros',
           imageUrl: listing.imageUrl || `https://placehold.co/400x300.png`,
           imageUrls: listing.imageUrls && listing.imageUrls.length > 0 ? listing.imageUrls : (listing.imageUrl ? [listing.imageUrl] : [`https://placehold.co/800x600.png`]),
        }));
        setListings(updatedData);
      } catch (error) {
        console.error("Fallo al obtener listados de servicios:", error);
      }
    };
    fetchListings();
  }, []);

  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    let targetCategory = 'Todos';
    if (categoryFromUrl) {
      const decodedCategory = decodeURIComponent(categoryFromUrl);
      const foundCategory = categoriasServicios.find(cat => cat.name === decodedCategory);
      if (foundCategory) {
        targetCategory = foundCategory.name;
      }
    }
    if (selectedCategoryState !== targetCategory) {
        setSelectedCategoryState(targetCategory);
    }
  }, [searchParams, pathname]); // Removed selectedCategoryState from deps

  const filteredListings = useMemo(() => listings.filter(listing => {
    const matchesCategory = selectedCategoryState === 'Todos' || listing.category === selectedCategoryState;
    const matchesSearch = searchQuery === '' ||
                          listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (listing.description && listing.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesLocation = locationFilter === '' || (listing.location && listing.location.toLowerCase().includes(locationFilter.toLowerCase()));
    const matchesRate = listing.rate <= maxRate;
    const matchesRating = listing.rating !== undefined ? listing.rating >= minRating : minRating === 0;

    return matchesCategory && matchesSearch && matchesLocation && matchesRate && matchesRating;
  }), [listings, selectedCategoryState, searchQuery, locationFilter, maxRate, minRating]);

  const currentYear = new Date().getFullYear();

  const toggleFavorite = (listingId: string) => {
    setFavoritedListings(prevFavorites => {
      const newFavorites = new Set(prevFavorites);
      if (newFavorites.has(listingId)) {
        newFavorites.delete(listingId);
      } else {
        newFavorites.add(listingId);
      }
      return newFavorites;
    });
  };

  const handleApplyFiltersFromSheet = () => {
    setIsFilterSheetOpen(false);
  };

  const handleTabsScroll = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'auto',
      });
    }
  };

  const handleDialogDateSelect = (selectedDate: Date | undefined, listing: ServiceListing) => {
    setDialogSelectedDate(selectedDate);
    setDialogSelectedTime(undefined);
    if (selectedDate && listing && listing.availability) {
        const dayOfWeek = getDay(selectedDate);
        let slotsForDay = Array.isArray(listing.availability[dayOfWeek]) ? listing.availability[dayOfWeek] : [];

        if (format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
            const now = new Date();
            slotsForDay = slotsForDay.filter(slot => {
                const [hour, minute] = slot.split(':').map(Number);
                const slotDateTime = new Date(selectedDate);
                slotDateTime.setHours(hour, minute, 0, 0);
                return slotDateTime > now;
            });
        }
        setDialogAvailableTimeSlots(slotsForDay.sort());
    } else {
        setDialogAvailableTimeSlots([]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4 sm:px-6 flex-shrink-0">
          <h1 className="text-lg font-semibold mr-auto">Servicios Independientes</h1>
          <div className="relative w-full max-w-xs sm:max-w-sm ml-auto">
            <Input
              type="search"
              placeholder="Buscar servicios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-md shadow-sm pr-10 h-9 text-sm w-full"
            />
            <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-shrink-0 h-9 text-xs px-3">
                <FilterIcon className="mr-2 h-4 w-4" /> Filtros
              </Button>
            </SheetTrigger>
            <SheetContent className="p-0 w-[85%] sm:w-[320px] flex flex-col">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Filtros de Servicios</SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-grow">
                <ServiceFiltersContent
                    selectedCategory={selectedCategoryState} setSelectedCategory={handleCategorySelectFromFilter}
                    locationFilter={locationFilter} setLocationFilter={setLocationFilter}
                    minRating={minRating} setMinRating={setMinRating}
                    maxRate={maxRate} setMaxRate={setMaxRate}
                    onApplyFilters={handleApplyFiltersFromSheet}
                />
              </ScrollArea>
            </SheetContent>
          </Sheet>
      </header>

      <main className="flex-1 overflow-y-auto">
        

          <section className="mb-8">
            <Carousel
              opts={{
                align: "start",
                loop: featuredIndependentServices.length > 1,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {featuredIndependentServices.map((service) => (
                  <CarouselItem key={service.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
                      <CardContent className="flex aspect-video items-center justify-center p-0 relative">
                          <Image src={service.image} alt={service.title} layout="fill" objectFit="cover" data-ai-hint={service.dataAiHint || "featured service"} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 p-4">
                          <CardTitle className="text-lg font-semibold text-white mb-1">{service.title}</CardTitle>
                          <CardDescription className="text-sm text-primary-foreground/80 line-clamp-2">{service.description}</CardDescription>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {featuredIndependentServices.length > 1 && (
                <>
                  <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex bg-primary/5 hover:bg-primary/10" />
                  <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex bg-primary/5 hover:bg-primary/10" />
                </>
              )}
            </Carousel>
          </section>

          <div className="relative w-full pb-4">
              <Tabs
                  value={selectedCategoryState.toLowerCase().replace(/[^a-z0-9]/g, '') || 'todos'}
                  onValueChange={(value) => {
                  const categoryName = categoriasServicios.find(cat => cat.name.toLowerCase().replace(/[^a-z0-9]/g, '') === value)?.name || 'Todos';
                  setSelectedCategoryState(categoryName);
                  const newPath = categoryName === 'Todos' ? pathname : `${pathname}?category=${encodeURIComponent(categoryName)}`;
                  router.push(newPath, { scroll: false });
                  }}
                  className="w-full"
              >
                <div className="bg-primary/5 rounded-md shadow-sm p-1 relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTabsScroll('left')}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-primary/5 hover:bg-primary/10 rounded-full hidden sm:flex"
                        aria-label="Scroll left"
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </Button>
                    <div ref={tabsContainerRef} className="overflow-x-auto whitespace-nowrap hide-scrollbar px-10">
                        <TabsList className="inline-flex flex-nowrap h-auto p-0 bg-transparent shadow-none space-x-1">
                            {categoriasServicios.map((category) => (
                                <TabsTrigger
                                    key={category.name}
                                    value={category.name.toLowerCase().replace(/[^a-z0-9]/g, '')}
                                    className={cn(
                                    "px-3 py-1.5 text-xs sm:text-sm flex items-center flex-shrink-0 rounded-md hover:bg-primary/10",
                                    "data-[state=inactive]:text-primary data-[state=inactive]:bg-transparent",
                                    "data-[state=active]:bg-card data-[state=active]:text-card-foreground data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-sm data-[state=active]:font-medium"
                                    )}
                                >
                                    {category.icon && <category.icon className="w-4 h-4 mr-1.5 sm:mr-2 flex-shrink-0" />}
                                    {category.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTabsScroll('right')}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-primary/5 hover:bg-primary/10 rounded-full hidden sm:flex"
                        aria-label="Scroll right"
                    >
                        <ChevronRightIcon className="h-5 w-5" />
                    </Button>
                  </div>
                  <TabsContent value={selectedCategoryState.toLowerCase().replace(/[^a-z0-9]/g, '') || 'todos'} className="mt-6">
                      {filteredListings.length > 0 ? (
                      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {filteredListings.map(listing => (
                          <Dialog key={`dialog-wrapper-${listing.id}`} onOpenChange={(open) => {
                              if (open) {
                                  setDialogSelectedDate(new Date()); // Reset to today when dialog opens
                                  handleDialogDateSelect(new Date(), listing); // Load slots for today
                              } else {
                                  // Optionally reset when closing
                                  setDialogSelectedTime(undefined);
                                  setDialogAvailableTimeSlots([]);
                              }
                          }}>
                            <Card key={listing.id} className="flex flex-col overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 bg-card">
                                <Link href={`/service/${listing.id}`} passHref>
                                  <div className="relative aspect-video w-full overflow-hidden cursor-pointer">
                                  <Image
                                      src={listing.imageUrl || `https://placehold.co/400x300.png`}
                                      alt={listing.title}
                                      fill
                                      style={{ objectFit: "cover" }}
                                      data-ai-hint={listing.dataAiHint || `${listing.category} service`}
                                  />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 text-white bg-black/30 hover:bg-black/50 hover:text-destructive z-10"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(listing.id); }}
                                    aria-label={favoritedListings.has(listing.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
                                    >
                                    <HeartIcon className={cn("h-5 w-5", favoritedListings.has(listing.id) && "fill-destructive text-destructive")} />
                                </Button>
                                </div>
                                </Link>
                                <CardHeader className="p-4 pb-2">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-grow">
                                    <CardTitle className="text-lg font-semibold leading-tight">
                                        <Link href={`/service/${listing.id}`} className="hover:underline">
                                          {listing.title}
                                        </Link>
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground pt-1">{listing.category}</CardDescription>
                                    </div>
                                </div>
                                </CardHeader>
                                <CardContent className="flex-grow flex flex-col p-4 pt-0 space-y-2">
                                <p className="text-sm">
                                    <span className="text-muted-foreground">Tarifa: </span>
                                    <span className="font-medium text-foreground">${listing.rate.toLocaleString('es-CO')} por hora</span>
                                </p>
                                {listing.professionalName && (
                                    <p className="text-sm">
                                    <span className="text-muted-foreground">Profesional: </span>
                                    <span className="text-foreground">{listing.professionalName}</span>
                                    </p>
                                )}
                                {listing.rating !== undefined && (
                                    <div className="flex items-center text-sm">
                                        <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1 flex-shrink-0" />
                                        <span className="font-semibold text-foreground">{listing.rating.toFixed(1)}</span>
                                    </div>
                                )}
                                <p className="text-sm text-foreground line-clamp-1 flex items-center">
                                    <MapPinIcon className="w-3 h-3 mr-1 text-muted-foreground flex-shrink-0" />
                                    {listing.location}
                                </p>
                                </CardContent>
                                <CardFooter className="p-4 pt-3 border-t">
                                  <ShadDialogTrigger asChild>
                                    <Button variant="outline" className="w-full">Reservar Servicio</Button>
                                  </ShadDialogTrigger>
                                </CardFooter>
                            </Card>
                            <ShadDialogContent className="sm:max-w-md p-0 overflow-hidden">
                                      <ScrollArea className="max-h-[80vh]">
                                      <div className="p-6">
                                          <ShadDialogHeader className="pb-4 border-b mb-4">
                                          <ShadDialogTitle>Reservar {listing.title}</ShadDialogTitle>
                                          <ShadDialogDescription>
                                              Realiza una solicitud de reserva para programar este servicio.
                                          </ShadDialogDescription>
                                          </ShadDialogHeader>
                                          <div className="space-y-4">
                                          {listing.imageUrls && listing.imageUrls.length > 0 && (
                                              <Carousel className="w-full rounded-md overflow-hidden shadow-md">
                                              <CarouselContent>
                                                  {listing.imageUrls.map((url, index) => (
                                                  <CarouselItem key={index}>
                                                      <AspectRatio ratio={16 / 9} className="bg-muted">
                                                      <Image
                                                          src={url}
                                                          alt={`${listing.title} - Imagen ${index + 1}`}
                                                          fill
                                                          style={{ objectFit: "cover" }}
                                                          data-ai-hint="service booking image"
                                                      />
                                                      </AspectRatio>
                                                  </CarouselItem>
                                                  ))}
                                              </CarouselContent>
                                              {listing.imageUrls.length > 1 && (
                                                  <>
                                                  <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/70 hover:bg-background text-foreground" />
                                                  <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/70 hover:bg-background text-foreground" />
                                                  </>
                                              )}
                                              </Carousel>
                                          )}
                                          {listing.professionalName && (
                                              <div className="flex items-center gap-2 pt-2">
                                                  <Avatar className="h-8 w-8">
                                                      <AvatarImage src={listing.professionalAvatar || `https://placehold.co/50x50.png`} alt={listing.professionalName} data-ai-hint="professional avatar"/>
                                                      <AvatarFallback>{listing.professionalName.substring(0,1)}</AvatarFallback>
                                                  </Avatar>
                                                  <p className="text-sm font-medium text-foreground">Especialista: {listing.professionalName}</p>
                                              </div>
                                          )}
                                              <div className="pt-2">
                                              <p className="text-sm text-muted-foreground">{listing.description || "Descripción no disponible."}</p>
                                              </div>
                                          <div className="grid grid-cols-[auto_1fr] items-center gap-4 pt-2">
                                              <Label htmlFor={`date-${listing.id}`} className="text-left text-sm whitespace-nowrap">Seleccionar Fecha</Label>
                                              <Popover>
                                              <PopoverTrigger asChild>
                                                  <Button
                                                  variant={"outline"}
                                                  className={cn(
                                                      "w-full justify-start text-left font-normal col-span-1",
                                                      !dialogSelectedDate && "text-muted-foreground"
                                                  )}
                                                  >
                                                  <CalendarIcon className="mr-2 h-4 w-4"/>
                                                  {dialogSelectedDate ? format(dialogSelectedDate, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                                  </Button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-auto p-0" align="start">
                                                  <Calendar
                                                  mode="single"
                                                  selected={dialogSelectedDate}
                                                  onSelect={(d) => handleDialogDateSelect(d, listing)}
                                                  disabled={(day) => day < new Date(new Date().setHours(0, 0, 0, 0))}
                                                  initialFocus
                                                      captionLayout="dropdown-buttons"
                                                      fromYear={currentYear}
                                                      toYear={currentYear + 5}
                                                      locale={es}
                                                  />
                                              </PopoverContent>
                                              </Popover>
                                          </div>
                                              <div className="grid grid-cols-[auto_1fr] items-center gap-4">
                                              <Label htmlFor={`time-slot-${listing.id}`} className="text-left text-sm whitespace-nowrap">
                                                  Hora
                                              </Label>
                                              <Select onValueChange={setDialogSelectedTime} value={dialogSelectedTime}>
                                                  <SelectTrigger className="w-full col-span-1">
                                                  <SelectValue placeholder="Seleccionar Hora" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                  {dialogSelectedDate && dialogAvailableTimeSlots.length > 0 ? (
                                                    dialogAvailableTimeSlots.map((timeSlot) => {
                                                      const hour = parseInt(timeSlot.split(':')[0]);
                                                      const colorClass = hour < 20 ? 'text-green-700 dark:text-green-500' : 'text-yellow-600 dark:text-yellow-400'; // Example coloring
                                                      return (
                                                        <SelectItem key={timeSlot} value={timeSlot} className={colorClass}>
                                                          {timeSlot}
                                                        </SelectItem>
                                                      );
                                                    })
                                                  ) : (
                                                    <div className={cn(
                                                      "p-2 text-sm italic",
                                                      dialogSelectedDate ? "text-destructive font-medium" : "text-muted-foreground"
                                                    )}>
                                                        {dialogSelectedDate ? "No hay horas disponibles para este día." : "Selecciona una fecha primero."}
                                                    </div>
                                                  )}
                                                  </SelectContent>
                                              </Select>
                                              </div>
                                          </div>
                                          <ShadDialogFooter className="pt-6 mt-4 border-t">
                                          <ShadDialogDialogClose asChild>
                                              <Button type="button" className="w-full" onClick={() => router.push(`/service/${listing.id}`)}>
                                                  Realizar solicitud de reserva
                                              </Button>
                                          </ShadDialogDialogClose>
                                          </ShadDialogFooter>
                                      </div>
                                      </ScrollArea>
                                  </ShadDialogContent>
                            </Dialog>
                          ))}
                      </div>
                      ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground p-8 border rounded-lg bg-card">
                          No hay servicios disponibles que coincidan con tus filtros.
                      </div>
                      )}
                  </TabsContent>
              </Tabs>
            </div>
        </main>
    </div>
  );
}

export default function Page() {
  return (
    <AppLayout>
      <IndependentServicesContent />
    </AppLayout>
  );
}

    