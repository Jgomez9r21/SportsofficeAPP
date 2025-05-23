
"use client";

import type React from 'react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AppLayout from '@/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, MapPin, DollarSign, ListChecks, CalendarDays, Clock, CreditCardIcon, ShieldCheck, Phone, MessageSquare, Landmark, User, Fingerprint, Hourglass } from 'lucide-react';
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
// Removed HOURLY_RATE_CATEGORIES import as all facilities are treated as hourly
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { format, startOfDay, addHours, isBefore, getYear, setHours, setMinutes, setSeconds, setMilliseconds, isSameDay, getDay, startOfMonth, endOfMonth, addMonths, addDays, isEqual, getDate, getMonth, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";


import type { SportsFacility } from '@/app/sports-facilities/page';
import { dummySportsFacilities } from '@/app/sports-facilities/page';

export type AvailabilityStatus = 'available' | 'partial' | 'occupied' | 'unavailable';

const STORED_USER_BOOKINGS_KEY = 'storedUserBookings';
const STORED_INVOICES_KEY = 'storedInvoices';

const mockBanks = [
  { value: "bancolombia", label: "Bancolombia" },
  { value: "davivienda", label: "Davivienda" },
  { value: "bbva", label: "BBVA" },
  { value: "banco_de_bogota", label: "Banco de Bogotá" },
  { value: "nequi", label: "Nequi (PSE)" },
];

const documentTypesPSE = [
    { value: "cc", label: "Cédula de Ciudadanía" },
    { value: "ce", label: "Cédula de Extranjería" },
    { value: "nit", label: "NIT" },
    { value: "pasaporte", label: "Pasaporte" },
];


async function getFacilityById(id: string): Promise<SportsFacility | undefined> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return dummySportsFacilities.find(facility => facility.id === id);
}

const FacilityDetailPageContent = () => {
  const params = useParams();
  const router = useRouter();
  const facilityId = typeof params.id === 'string' ? params.id : undefined;

  const [facility, setFacility] = useState<SportsFacility | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const { isLoggedIn, user, openLoginDialog } = useAuth();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | undefined>();
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [bookingStep, setBookingStep] = useState<'selection' | 'confirmation'>('selection');
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | undefined>(undefined);
  const [selectedBank, setSelectedBank] = useState<string | undefined>(undefined);
  const [accountHolderNamePSE, setAccountHolderNamePSE] = useState('');
  const [documentTypePSE, setDocumentTypePSE] = useState<string | undefined>(undefined);
  const [documentNumberPSE, setDocumentNumberPSE] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolderNameCard, setCardHolderNameCard] = useState('');


  const today = useMemo(() => startOfDay(new Date()), []);
  const currentYear = getYear(today);
  const defaultCalendarMonth = useMemo(() => new Date(2025, 5), []); // June 2025

  const [dailyAvailability, setDailyAvailability] = useState<Record<string, AvailabilityStatus>>({});

  const multiYearHolidays = useMemo(() => {
    const yearsToGenerate = [currentYear, currentYear + 1, currentYear + 2]; 
    const generatedHolidays: Date[] = [];
    yearsToGenerate.forEach(year => {
      generatedHolidays.push(
        new Date(year, 0, 1),  
        new Date(year, 4, 1),  
        new Date(year, 6, 20), 
        new Date(year, 7, 7),  
        new Date(year, 11, 8), 
        new Date(year, 11, 25) 
      );
    });
    return generatedHolidays;
  }, [currentYear]);

  const isHoliday = useCallback((date: Date): boolean => {
    const dateOnly = startOfDay(date);
    return multiYearHolidays.some(h => isSameDay(h, dateOnly));
  }, [multiYearHolidays]);

  const isDayDisabled = useCallback((date: Date): boolean => {
    const dateOnly = startOfDay(date);
    if (isBefore(dateOnly, today) && !isSameDay(dateOnly, today)) return true; 
    if (isHoliday(dateOnly)) return true; 
    // Removed direct Sunday disable: if (getDay(dateOnly) === 0) return true; 

    if (facility) {
        const dayOfWeek = getDay(dateOnly); 
        const slotsForThisDayOfWeek = facility.availability[dayOfWeek];
        if (!slotsForThisDayOfWeek || slotsForThisDayOfWeek.length === 0) {
            return true; 
        }
    } else {
        return true; 
    }
    return false;
  }, [today, facility, isHoliday]);


  useEffect(() => {
    if (facilityId) {
      const fetchFacility = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const fetchedFacility = await getFacilityById(facilityId);
          if (fetchedFacility) {
            const facilityWithDefaults = {
                ...fetchedFacility,
                imageUrls: fetchedFacility.imageUrls && fetchedFacility.imageUrls.length > 0
                           ? fetchedFacility.imageUrls
                           : (fetchedFacility.image ? [fetchedFacility.image] : ['https://placehold.co/800x450.png?text=Imagen+Por+Defecto']),
                image: fetchedFacility.image || 'https://placehold.co/800x450.png?text=Imagen+Principal+Por+Defecto',
                dataAiHint: fetchedFacility.dataAiHint || 'sports facility',
            };
            setFacility(facilityWithDefaults);
          } else {
            setError('Instalación deportiva no encontrada.');
          }
        } catch (e) {
          console.error('Error al obtener la instalación:', e);
          setError('No se pudo cargar la instalación deportiva.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchFacility();
    } else {
      setError('ID de instalación inválido.');
      setIsLoading(false);
    }
  }, [facilityId]);


  useEffect(() => {
    if (!facility) return;
    
    const currentDisplayMonth = selectedDate ? startOfMonth(selectedDate) : defaultCalendarMonth;
    const startDateToIterate = startOfMonth(currentDisplayMonth);
    const endDateToIterate = endOfMonth(currentDisplayMonth);

    const newDailyAvailability: Record<string, AvailabilityStatus> = {};
    let currentDateIterator = startDateToIterate;

    while (isBefore(currentDateIterator, endDateToIterate) || isEqual(currentDateIterator, endDateToIterate)) {
        const dateStr = format(currentDateIterator, 'yyyy-MM-dd');
        if (isDayDisabled(currentDateIterator)) {
            // No need to add to dailyAvailability
        } else {
            const dayOfWeek = getDay(currentDateIterator);
            const dayOfMonth = getDate(currentDateIterator);
            const monthIndex = getMonth(currentDateIterator);

            let facilitySlotsForDayOfWeek = facility.availability[dayOfWeek] || [];
            let actualSlotsLeftForDay = [...facilitySlotsForDayOfWeek];

            if (isSameDay(currentDateIterator, today)) {
                actualSlotsLeftForDay = facilitySlotsForDayOfWeek.filter(slot => {
                    const [hour, minute] = slot.split(':').map(Number);
                    const slotDateTime = setHours(setMinutes(setSeconds(setMilliseconds(new Date(currentDateIterator),0),0), minute), hour);
                    return isBefore(new Date(), slotDateTime); 
                });
            }
            
            let status: AvailabilityStatus = 'available';

            if (actualSlotsLeftForDay.length === 0) {
                status = 'occupied'; 
            } else {
                if (getYear(currentDateIterator) === 2025 && monthIndex === 5) { 
                    if (dayOfWeek === 6 ) { 
                        status = 'partial'; 
                    } else if (dayOfMonth === 10 || dayOfMonth === 20) {
                        status = 'occupied'; 
                    } else {
                         status = 'available'; 
                    }
                } 
                else if (getYear(currentDateIterator) === 2025 && monthIndex === 4) { 
                     if (dayOfMonth === 28) { 
                        status = 'partial';
                    } else if (dayOfMonth === 30) { 
                        status = 'occupied';
                    } else {
                         status = 'available'; 
                    }
                }
                else {
                     status = 'available'; 
                }
            }
            newDailyAvailability[dateStr] = status;
        }
        currentDateIterator = addDays(currentDateIterator, 1);
    }
    setDailyAvailability(newDailyAvailability);
  }, [facility, isDayDisabled, selectedDate, today, defaultCalendarMonth]);


  useEffect(() => {
    setAvailableTimeSlots([]);
    setSelectedTimeSlot(undefined);
    if (selectedDate && facility && !isDayDisabled(selectedDate)) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      if (dailyAvailability[dateStr] === 'occupied') {
        setAvailableTimeSlots([]);
        return;
      }

      const dayOfWeek = getDay(selectedDate);
      let slotsForDay = facility.availability[dayOfWeek] || [];
      const now = new Date();

      if (isSameDay(selectedDate, now)) {
        slotsForDay = slotsForDay.filter(slot => {
          const [hour, minute] = slot.split(':').map(Number);
          const slotTime = setMilliseconds(setSeconds(setMinutes(setHours(new Date(selectedDate), hour), minute), 0), 0);
          return isBefore(now, slotTime);
        });
      }
      setAvailableTimeSlots(slotsForDay);
    }
  }, [selectedDate, facility, isDayDisabled, today, dailyAvailability]);

  const totalAmount = useMemo(() => {
    if (!facility) return 0;
    return facility.rate * selectedDuration;
  }, [facility, selectedDuration]);

  const resetPaymentFields = () => {
    setSelectedBank(undefined);
    setAccountHolderNamePSE('');
    setDocumentTypePSE(undefined);
    setDocumentNumberPSE('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setCardHolderNameCard('');
  };

  const handleProceedToConfirmation = () => {
    if (!isLoggedIn) {
      toast({
        title: 'Inicio de Sesión Requerido',
        description: 'Debes iniciar sesión para reservar una instalación.',
        variant: 'destructive',
      });
      openLoginDialog();
      return;
    }
    if (!selectedDate || !selectedTimeSlot) {
      toast({
        title: 'Información Incompleta',
        description: 'Por favor, selecciona una fecha y hora para la reserva.',
        variant: 'destructive',
      });
      return;
    }
    setBookingStep('confirmation');
    resetPaymentFields(); 
  };
  
  const handleBackToSelection = () => {
    setBookingStep('selection');
    setSelectedPaymentMethod(undefined); 
    resetPaymentFields();
  };


  const handlePaymentAndConfirm = () => {
     if (!selectedPaymentMethod || !facility || !user || !selectedDate || !selectedTimeSlot) {
      toast({
        title: 'Información Incompleta',
        description: 'Faltan detalles para procesar el pago. Por favor, selecciona un método de pago.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedPaymentMethod === 'pse' && (!selectedBank || !accountHolderNamePSE || !documentTypePSE || !documentNumberPSE)) {
        toast({ title: 'Datos PSE Incompletos', description: 'Completa todos los campos para el pago con PSE.', variant: 'destructive' });
        return;
    }
    if ((selectedPaymentMethod === 'debit' || selectedPaymentMethod === 'credit') && (!cardNumber || !cardExpiry || !cardCvv || !cardHolderNameCard)) {
        toast({ title: 'Datos de Tarjeta Incompletos', description: 'Completa todos los campos para el pago con tarjeta.', variant: 'destructive' });
        return;
    }

    const orderId = `ORD-FAC-${Date.now()}`;
    const startTime = parse(selectedTimeSlot, 'HH:mm', selectedDate);
    const endTime = addHours(startTime, selectedDuration);

    const bookingDetails = {
      id: orderId,
      serviceTitle: facility.name,
      professionalName: facility.name, 
      location: facility.location,
      professionalEmail: 'facility_contact@example.com', 
      professionalPhone: facility.phone || facility.whatsapp || 'N/A',
      serviceDate: format(selectedDate, "yyyy-MM-dd"),
      serviceTime: selectedTimeSlot,
      serviceEndDate: format(selectedDate, "yyyy-MM-dd"), // Assuming same day for facility booking
      serviceEndTime: format(endTime, "HH:mm"),
      orderNumber: orderId,
      status: 'aceptado' as 'aceptado',
    };

    const invoiceDetails = {
      id: `inv-${orderId}`,
      invoiceNumber: `FACT-FAC-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      serviceTitle: `Reserva de ${facility.name} para ${format(selectedDate, "PPP", { locale: es })} de ${selectedTimeSlot} a ${format(endTime, "HH:mm")} (${selectedDuration} hora${selectedDuration > 1 ? 's' : ''})`,
      amount: totalAmount,
      status: 'Pagada' as 'Pagada',
    };

    console.log('Simulating payment & booking for facility:', bookingDetails, 'with method:', selectedPaymentMethod);
    console.log('Simulating invoice generation for facility:', invoiceDetails);

    try {
      const existingBookingsRaw = localStorage.getItem(STORED_USER_BOOKINGS_KEY);
      const existingBookings = existingBookingsRaw ? JSON.parse(existingBookingsRaw) : [];
      localStorage.setItem(STORED_USER_BOOKINGS_KEY, JSON.stringify([bookingDetails, ...existingBookings]));

      const existingInvoicesRaw = localStorage.getItem(STORED_INVOICES_KEY);
      const existingInvoices = existingInvoicesRaw ? JSON.parse(existingInvoicesRaw) : [];
      localStorage.setItem(STORED_INVOICES_KEY, JSON.stringify([invoiceDetails, ...existingInvoices]));
      
      toast({
        title: 'Reserva Confirmada (Simulación)',
        description: `Tu reserva para "${facility.name}" ha sido confirmada y la factura generada. Revisa "Mis Reservas" y "Facturación".`,
      });

    } catch (e) {
      console.error("Error saving to localStorage:", e);
      toast({ title: "Error Guardando Reserva", description: "No se pudo guardar la reserva localmente.", variant: "destructive" });
    }

    setBookingStep('selection');
    setSelectedDate(undefined);
    setSelectedTimeSlot(undefined);
    setSelectedDuration(1);
    setSelectedPaymentMethod(undefined);
    resetPaymentFields();
  };

  const isPaymentButtonDisabled = () => {
    if (isLoading || !selectedPaymentMethod) return true;
    if (selectedPaymentMethod === 'pse') {
      return !selectedBank || !accountHolderNamePSE || !documentTypePSE || !documentNumberPSE;
    }
    if (selectedPaymentMethod === 'debit' || selectedPaymentMethod === 'credit') {
      return !cardNumber || !cardExpiry || !cardCvv || !cardHolderNameCard;
    }
    return true; 
  };

  const imagesToShow = useMemo(() => {
    if (!facility) return [];
    return facility.imageUrls && facility.imageUrls.length > 0
      ? facility.imageUrls
      : (facility.image ? [facility.image] : []);
  }, [facility]);

  const modifiers = useMemo(() => ({
    available: (date: Date) => !isDayDisabled(date) && dailyAvailability[format(date, 'yyyy-MM-dd')] === 'available',
    partial: (date: Date) => !isDayDisabled(date) && dailyAvailability[format(date, 'yyyy-MM-dd')] === 'partial',
    occupied: (date: Date) => !isDayDisabled(date) && dailyAvailability[format(date, 'yyyy-MM-dd')] === 'occupied',
  }), [dailyAvailability, isDayDisabled]);

  const modifiersClassNames = {
    available: 'rdp-day_available',
    partial: 'rdp-day_partial',
    occupied: 'rdp-day_occupied',
  };

  if (isLoading && bookingStep === 'selection') {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-xl text-muted-foreground">Instalación no disponible.</p>
        <Button onClick={() => router.back()} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  const formattedWhatsAppLink = facility?.whatsapp ? `https://wa.me/${facility.whatsapp.replace(/\D/g, '')}` : '#';

  return (
    <div className="container mx-auto px-2 sm:px-4 py-6 md:py-8 max-w-6xl">
      <Button variant="ghost" onClick={bookingStep === 'confirmation' ? handleBackToSelection : () => router.back()} className="mb-4 text-primary hover:text-primary/80 px-2">
        <ArrowLeft className="mr-2 h-5 w-5" />
        {bookingStep === 'confirmation' ? 'Volver a Selección' : 'Volver a la búsqueda'}
      </Button>

      {bookingStep === 'selection' ? (
        <Card className="overflow-hidden shadow-xl rounded-xl">
           <CardHeader className="p-0">
            {imagesToShow.length > 0 ? (
                <Carousel
                opts={{ loop: imagesToShow.length > 1 }}
                className="w-full rounded-t-xl overflow-hidden"
                >
                <CarouselContent>
                    {imagesToShow.map((imgUrl, index) => (
                    <CarouselItem key={imgUrl || index}> 
                        <AspectRatio ratio={16 / 9} className="bg-muted">
                        <Image
                            src={imgUrl}
                            alt={facility?.name ? `${facility.name} - imagen ${index + 1}` : `Imagen de instalación ${index + 1}`}
                            fill
                            style={{ objectFit: "cover" }}
                            className="rounded-t-xl"
                             data-ai-hint={facility?.dataAiHint ? `${facility.dataAiHint} ${index + 1}` : `facility image ${index + 1}`}
                            priority={index === 0}
                        />
                        </AspectRatio>
                    </CarouselItem>
                    ))}
                </CarouselContent>
                {imagesToShow.length > 1 && (
                    <>
                    <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-background/70 hover:bg-background text-foreground" />
                    <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-background/70 hover:bg-background text-foreground" />
                    </>
                )}
                </Carousel>
            ) : (
                <AspectRatio ratio={16 / 9} className="bg-muted rounded-t-xl">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    Imagen no disponible
                </div>
                </AspectRatio>
            )}
            </CardHeader>

          <CardContent className="p-4 md:p-6 lg:p-8 space-y-6">
            <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">{facility.name}</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">{facility.type}</CardDescription>

            <Separator />

            <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-12 gap-y-8">
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-md font-semibold mb-2 text-foreground flex items-center">
                      <MapPin className="mr-2 h-5 w-5 text-primary" /> Ubicación
                    </h3>
                    <p className="text-base text-foreground/80">{facility.location}</p>
                  </div>
                  <div>
                    <h3 className="text-md font-semibold mb-2 text-foreground flex items-center">
                      <DollarSign className="mr-2 h-5 w-5 text-primary" /> Tarifa
                    </h3>
                    <p className="text-base text-foreground/80">
                      ${facility.rate.toLocaleString('es-CO')}
                      <span className="text-xs text-muted-foreground"> /hr</span>
                    </p>
                  </div>
                </div>

                {(facility.phone || facility.whatsapp) && (
                  <div>
                    <h3 className="text-md font-semibold mb-2 text-foreground">Contacto</h3>
                    {facility.phone && (
                      <div className="flex items-center gap-2 text-base text-foreground/80 mb-2">
                        <Phone className="h-4 w-4 text-primary" />
                        <span>{facility.phone}</span>
                      </div>
                    )}
                    {facility.whatsapp && (
                       <Button asChild variant="outline" size="sm" className="text-sm">
                          <Link href={formattedWhatsAppLink} target="_blank" rel="noopener noreferrer">
                              <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp: {facility.whatsapp}
                          </Link>
                       </Button>
                    )}
                  </div>
                )}

                {facility.description && (
                  <div>
                    <h3 className="text-md font-semibold mb-2 text-foreground">Descripción</h3>
                    <p className="text-base leading-relaxed text-foreground/80">{facility.description}</p>
                  </div>
                )}

                {facility.amenities && facility.amenities.length > 0 && (
                    <div>
                        <h3 className="text-md font-semibold mb-2 text-foreground flex items-center">
                        <ListChecks className="mr-2 h-5 w-5 text-primary" /> Comodidades
                        </h3>
                        <div className="flex flex-wrap gap-2">
                        {facility.amenities.map((amenity, index) => (
                            <Badge key={index} variant="secondary" className="text-sm">
                            {amenity}
                            </Badge>
                        ))}
                        </div>
                    </div>
                )}
              </div>

              
              <div className="space-y-6 pt-0 lg:pt-0">
                <h3 className="text-xl font-semibold text-foreground flex items-center">
                  <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                  Reservar Espacio
                </h3>

                <div className="space-y-3">
                    <Label htmlFor="calendar-booking" className="text-sm font-medium text-foreground">
                        Seleccionar Fecha
                    </Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="calendar-booking"
                            variant={"outline"}
                            className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                        >
                            <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
                            {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => { setSelectedDate(date); setSelectedTimeSlot(undefined); setSelectedDuration(1);}}
                            disabled={isDayDisabled}
                            modifiers={modifiers}
                            modifiersClassNames={modifiersClassNames}
                            locale={es}
                            defaultMonth={defaultCalendarMonth}
                            fromMonth={startOfDay(new Date())}
                            toYear={currentYear + 2}
                            captionLayout="dropdown-buttons"
                            className="rounded-md border shadow-md p-2 bg-card"
                        />
                        </PopoverContent>
                    </Popover>
                     {selectedDate && dailyAvailability[format(selectedDate, 'yyyy-MM-dd')] === 'occupied' && (
                         <p className="text-sm text-destructive italic pt-1 font-medium">Este día está completamente ocupado. Por favor, selecciona otra fecha.</p>
                    )}
                    {selectedDate && isDayDisabled(selectedDate) && dailyAvailability[format(selectedDate, 'yyyy-MM-dd')] !== 'occupied' && ( 
                        <p className="text-sm text-destructive italic pt-1 font-medium">Este día no está disponible para reserva.</p>
                    )}
                </div>

                {selectedDate && availableTimeSlots.length > 0 && !isDayDisabled(selectedDate) && dailyAvailability[format(selectedDate, 'yyyy-MM-dd')] !== 'occupied' && (
                  <>
                    <div className="grid grid-cols-[auto_1fr] items-center gap-x-4">
                        <Label htmlFor="time-slot-facility" className="text-sm font-medium text-foreground flex items-center whitespace-nowrap">
                            <Clock className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                            Hora Inicio
                        </Label>
                        <Select value={selectedTimeSlot} onValueChange={(value) => { setSelectedTimeSlot(value); setSelectedDuration(1); }}>
                            <SelectTrigger id="time-slot-facility" className="w-full">
                            <SelectValue placeholder="Selecciona un horario" />
                            </SelectTrigger>
                            <SelectContent>
                            {availableTimeSlots.map((slot) => (
                                <SelectItem key={slot} value={slot}>
                                {slot}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedTimeSlot && (
                      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-4">
                        <Label htmlFor="duration-select-facility" className="text-sm font-medium text-foreground flex items-center whitespace-nowrap">
                          <Hourglass className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                          Duración (Horas)
                        </Label>
                        <Select value={selectedDuration.toString()} onValueChange={(value) => setSelectedDuration(Number(value))}>
                          <SelectTrigger id="duration-select-facility" className="w-full">
                            <SelectValue placeholder="Selecciona duración" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4].map((hours) => (
                              <SelectItem key={hours} value={hours.toString()}>
                                {hours} hora{hours > 1 ? 's' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                     {selectedTimeSlot && (
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-lg font-semibold">Costo Total Estimado: <span className="text-primary">${totalAmount.toLocaleString('es-CO')}</span></p>
                        </div>
                    )}
                  </>
                )}
                 {selectedDate && availableTimeSlots.length === 0 && !isDayDisabled(selectedDate) && dailyAvailability[format(selectedDate, 'yyyy-MM-dd')] !== 'occupied' && (
                    <p className="text-sm text-muted-foreground italic pt-1">No hay horarios disponibles para este día. Esto puede ser porque todos los cupos ya pasaron si es hoy.</p>
                )}

                 <Button
                    onClick={handleProceedToConfirmation}
                    className="w-full mt-4"
                    disabled={!selectedDate || !selectedTimeSlot || isLoading || (selectedDate && (isDayDisabled(selectedDate) || dailyAvailability[format(selectedDate, 'yyyy-MM-dd')] === 'occupied'))}
                  >
                    <CreditCardIcon className="mr-2 h-4 w-4" /> Continuar con la Reserva
                  </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        
        <Card className="overflow-hidden shadow-xl rounded-xl">
          <CardHeader className="bg-muted/50 p-4 md:p-6 border-b">
            <CardTitle className="text-xl md:text-2xl font-semibold text-foreground flex items-center">
              <ShieldCheck className="mr-3 h-6 w-6 text-primary" />
              Confirmar Reserva y Pago
            </CardTitle>
            <CardDescription>Revisa los detalles de tu reserva para la instalación y elige un método de pago.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">Detalles de la Instalación</h3>
              <div className="space-y-2 text-sm text-foreground/80">
                <p><span className="font-medium text-foreground">Instalación:</span> {facility.name}</p>
                <p><span className="font-medium text-foreground">Tipo:</span> {facility.type}</p>
                <p><span className="font-medium text-foreground">Ubicación:</span> {facility.location}</p>
                {facility.phone && (
                  <p><span className="font-medium text-foreground">Teléfono:</span> {facility.phone}</p>
                )}
                {facility.whatsapp && (
                  <p><span className="font-medium text-foreground">WhatsApp:</span> {facility.whatsapp}</p>
                )}
                <p><span className="font-medium text-foreground">Fecha:</span> {selectedDate ? format(selectedDate, "PPP", { locale: es }) : 'N/A'}</p>
                <p><span className="font-medium text-foreground">Hora Inicio:</span> {selectedTimeSlot}</p>
                <p><span className="font-medium text-foreground">Duración:</span> {selectedDuration} hora{selectedDuration > 1 ? 's' : ''}</p>
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-3 text-foreground flex items-center">
                <DollarSign className="mr-2 h-5 w-5 text-primary" />
                Total a Pagar
              </h3>
              <p className="text-2xl font-bold text-primary">
                ${totalAmount.toLocaleString('es-CO')}
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-3 text-foreground flex items-center">
                <CreditCardIcon className="mr-2 h-5 w-5 text-primary" />
                Método de Pago
              </h3>
              <RadioGroup value={selectedPaymentMethod} onValueChange={(value) => { setSelectedPaymentMethod(value); resetPaymentFields(); }} className="space-y-2">
                <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="pse" id="facility-pse" />
                  <Label htmlFor="facility-pse" className="flex-grow cursor-pointer">PSE (Pagos Seguros en Línea)</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="debit" id="facility-debit" />
                  <Label htmlFor="facility-debit" className="flex-grow cursor-pointer">Tarjeta de Débito</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="credit" id="facility-credit" />
                  <Label htmlFor="facility-credit" className="flex-grow cursor-pointer">Tarjeta de Crédito</Label>
                </div>
              </RadioGroup>

              {selectedPaymentMethod === 'pse' && (
                <div className="mt-4 space-y-4 p-4 border rounded-md bg-muted/30">
                  <h4 className="font-medium text-sm flex items-center"><Landmark className="mr-2 h-4 w-4 text-primary" /> Detalles para PSE</h4>
                  <div className="space-y-2">
                    <Label htmlFor="pse-bank">Banco</Label>
                    <Select value={selectedBank} onValueChange={setSelectedBank}>
                      <SelectTrigger id="pse-bank"><SelectValue placeholder="Selecciona tu banco" /></SelectTrigger>
                      <SelectContent>
                        {mockBanks.map(bank => <SelectItem key={bank.value} value={bank.value}>{bank.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pse-holder-name">Nombre del titular de la cuenta</Label>
                    <Input id="pse-holder-name" value={accountHolderNamePSE} onChange={(e) => setAccountHolderNamePSE(e.target.value)} placeholder="Nombre Completo" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pse-doc-type">Tipo de Documento</Label>
                      <Select value={documentTypePSE} onValueChange={setDocumentTypePSE}>
                        <SelectTrigger id="pse-doc-type"><SelectValue placeholder="Tipo" /></SelectTrigger>
                        <SelectContent>
                          {documentTypesPSE.map(doc => <SelectItem key={doc.value} value={doc.value}>{doc.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pse-doc-number">Número de Documento</Label>
                      <Input id="pse-doc-number" value={documentNumberPSE} onChange={(e) => setDocumentNumberPSE(e.target.value)} placeholder="Número" />
                    </div>
                  </div>
                </div>
              )}

              {(selectedPaymentMethod === 'debit' || selectedPaymentMethod === 'credit') && (
                <div className="mt-4 space-y-4 p-4 border rounded-md bg-muted/30">
                  <h4 className="font-medium text-sm flex items-center"><CreditCardIcon className="mr-2 h-4 w-4 text-primary"/> Detalles de la Tarjeta</h4>
                  <div className="space-y-2">
                    <Label htmlFor="card-number">Número de Tarjeta</Label>
                    <Input id="card-number" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="**** **** **** ****" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="card-expiry">Expiración (MM/AA)</Label>
                      <Input id="card-expiry" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder="MM/AA" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card-cvv">CVV</Label>
                      <Input id="card-cvv" value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} placeholder="123" />
                    </div>
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="card-holder-name">Nombre del titular de la tarjeta</Label>
                    <Input id="card-holder-name" value={cardHolderNameCard} onChange={(e) => setCardHolderNameCard(e.target.value)} placeholder="Nombre como aparece en la tarjeta" />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 p-4 md:p-6 border-t flex flex-col sm:flex-row gap-2 justify-end">
            <Button variant="outline" onClick={handleBackToSelection} className="w-full sm:w-auto">
              Modificar Selección
            </Button>
            <Button
              onClick={handlePaymentAndConfirm}
              size="lg"
              className="w-full sm:w-auto"
              disabled={isPaymentButtonDisabled()}
            >
              {isLoading ? "Procesando..." : "Pagar y Confirmar Reserva"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

const FacilityDetailPage = () => {
  return (
    <AppLayout>
      <FacilityDetailPageContent />
    </AppLayout>
  );
};

export default FacilityDetailPage;
