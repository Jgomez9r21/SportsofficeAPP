
"use client";

import type React from 'react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  getServiceById,
  type ServiceListing,
} from '@/services/service-listings';
import AppLayout from '@/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, MapPin, Clock, Info, User, CalendarDays, CreditCardIcon, DollarSign, ShieldCheck, Phone, MessageSquare, Landmark, Fingerprint } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, startOfDay, addMonths, getYear, isBefore, getDay, setHours, setMinutes, setSeconds, setMilliseconds, parse, isEqual, addDays, startOfMonth, endOfMonth, differenceInHours, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { HOURLY_RATE_CATEGORIES } from '@/lib/config';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from '@/components/ui/separator';

const multiYearHolidays = (() => {
    const currentYear = getYear(new Date());
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
})();

const isHolidayCheck = (date: Date): boolean => {
  const dateOnly = startOfDay(date);
  return multiYearHolidays.some(h => isSameDay(h, dateOnly));
};

export type AvailabilityStatus = 'available' | 'occupied';
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

const calculateDurationInHours = (
  startDate: Date | undefined,
  startTime: string | undefined,
  endDate: Date | undefined,
  endTime: string | undefined
): number => {
  if (!startDate || !startTime || !endDate || !endTime) {
    return 0;
  }

  try {
    const startDateTime = parse(startTime, 'HH:mm', startDate);
    const endDateTime = parse(endTime, 'HH:mm', endDate);

    if (isBefore(endDateTime, startDateTime) || isEqual(endDateTime, startDateTime)) {
      return 0; // End time must be after start time
    }

    let hours = differenceInHours(endDateTime, startDateTime);
    // Ensure a minimum of 1 hour if there's any positive duration at all.
    if (hours < 1 && differenceInMinutes(endDateTime, startDateTime) > 0) {
        hours = 1;
    } else if (hours < 0) { // Should be caught by isBefore/isEqual but as a safeguard
        return 0;
    }
    
    return Math.max(0, Math.ceil(hours)); // Ensure non-negative and round up to the nearest hour
  } catch (error) {
    console.error("Error parsing date/time for duration calculation:", error);
    return 0;
  }
};


const ServiceDetailPageContent = () => {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { isLoggedIn, user, openLoginDialog } = useAuth();

  const serviceId = typeof params.id === 'string' ? params.id : undefined;

  const [service, setService] = useState<ServiceListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | undefined>();
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(undefined);
  const [selectedEndTimeSlot, setSelectedEndTimeSlot] = useState<string | undefined>();
  
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [availableEndTimeSlots, setAvailableEndTimeSlots] = useState<string[]>([]);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
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
  const defaultCalendarMonth = useMemo(() => startOfDay(new Date()), []);

  const [dailyAvailability, setDailyAvailability] = useState<Record<string, AvailabilityStatus>>({});

  const isHourlyService = useMemo(() => {
    if (!service) return false;
    return HOURLY_RATE_CATEGORIES.includes(service.category);
  }, [service]);

  const calculatedDurationHours = useMemo(() => {
    return calculateDurationInHours(selectedDate, selectedTimeSlot, selectedEndDate, selectedEndTimeSlot);
  }, [selectedDate, selectedTimeSlot, selectedEndDate, selectedEndTimeSlot]);

  const totalAmount = useMemo(() => {
    if (!service) return 0;
    return isHourlyService ? service.rate * calculatedDurationHours : service.rate;
  }, [service, isHourlyService, calculatedDurationHours]);


  useEffect(() => {
    if (serviceId) {
      const fetchService = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const fetchedService = await getServiceById(serviceId);
          if (fetchedService) {
            const serviceWithProfessional = {
                ...fetchedService,
                professionalName: fetchedService.professionalName || `Profesional de ${fetchedService.category}`,
                professionalAvatar: fetchedService.professionalAvatar || undefined, 
                imageUrls: fetchedService.imageUrls && fetchedService.imageUrls.length > 0
                           ? fetchedService.imageUrls
                           : (fetchedService.imageUrl ? [fetchedService.imageUrl] : [`https://placehold.co/800x600.png?text=Servicio+Destacado`]),
                description: fetchedService.description || "No hay descripción disponible para este servicio."
            };
            setService(serviceWithProfessional);
          } else {
            setError('Servicio no encontrado.');
          }
        } catch (e) {
          console.error('Error al obtener el servicio:', e);
          setError('No se pudo cargar el servicio.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchService();
    } else {
      setError('ID de servicio inválido.');
      setIsLoading(false);
    }
  }, [serviceId]);

  const isDayDisabled = useMemo(() => (date: Date): boolean => {
    const dateOnly = startOfDay(date);
    if (isBefore(dateOnly, today) && !isSameDay(dateOnly, today)) return true;
    if (isHolidayCheck(dateOnly)) return true;
    
    if (service) {
        const dayOfWeek = getDay(dateOnly);
        const slotsForThisDayOfWeek = service.availability[dayOfWeek];
        if (!slotsForThisDayOfWeek || slotsForThisDayOfWeek.length === 0) {
            return true; 
        }
    } else { 
        return true; 
    }
    return false;
  }, [service, today]);


  useEffect(() => {
    if (!service || !selectedDate) {
      setDailyAvailability({}); 
      return;
    }

    const currentDisplayMonth = startOfMonth(selectedDate || defaultCalendarMonth);
    const startDateToIterate = startOfMonth(currentDisplayMonth);
    const endDateToIterate = endOfMonth(currentDisplayMonth);

    const newDailyAvailability: Record<string, AvailabilityStatus> = {};
    let currentDateIterator = startDateToIterate;

    while (isBefore(currentDateIterator, endDateToIterate) || isEqual(currentDateIterator, endDateToIterate)) {
        const dateStr = format(currentDateIterator, 'yyyy-MM-dd');
        if (isDayDisabled(currentDateIterator)) {
            // Handled by react-day-picker's disabled prop
        } else {
            const dayOfWeek = getDay(currentDateIterator);
            let slotsForDayOfWeek = service.availability[dayOfWeek] || [];
            let actualSlotsLeftForDay = [...slotsForDayOfWeek];

            if (isSameDay(currentDateIterator, today)) {
                actualSlotsLeftForDay = slotsForDayOfWeek.filter(slot => {
                    const [hour, minute] = slot.split(':').map(Number);
                    const slotDateTime = setHours(setMinutes(setSeconds(setMilliseconds(new Date(currentDateIterator),0),0), minute), hour);
                    return isBefore(new Date(), slotDateTime); 
                });
            }
            newDailyAvailability[dateStr] = actualSlotsLeftForDay.length > 0 ? 'available' : 'occupied';
        }
        currentDateIterator = addDays(currentDateIterator, 1);
    }
    setDailyAvailability(newDailyAvailability);
  }, [service, selectedDate, today, isDayDisabled, defaultCalendarMonth]);


  useEffect(() => {
    setAvailableTimeSlots([]);
    if (service && selectedDate && !isDayDisabled(selectedDate)) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const currentDayStatus = dailyAvailability[dateStr];

      if (currentDayStatus !== 'occupied') { 
        const dayOfWeek = getDay(selectedDate);
        let slotsForDay = service.availability[dayOfWeek] || [];
        const now = new Date();
        if (isSameDay(selectedDate, now)) { 
            slotsForDay = slotsForDay.filter(slot => {
                const [hour, minute] = slot.split(':').map(Number);
                const slotTime = setMilliseconds(setSeconds(setMinutes(setHours(new Date(selectedDate), hour), minute), 0), 0);
                return isBefore(now, slotTime);
            });
        }
        setAvailableTimeSlots(slotsForDay);
      } else {
        setAvailableTimeSlots([]); 
      }
    } else {
        setAvailableTimeSlots([]); 
    }
  }, [service, selectedDate, isDayDisabled, today, dailyAvailability]);

  useEffect(() => {
    setAvailableEndTimeSlots([]);
    if (service && selectedEndDate && selectedDate && selectedTimeSlot && !isDayDisabled(selectedEndDate)) {
        const dayOfWeek = getDay(selectedEndDate);
        let slotsForDay = service.availability[dayOfWeek] || [];
        const now = new Date(); 
        const startDateTime = parse(selectedTimeSlot, 'HH:mm', selectedDate);

        if (isSameDay(selectedEndDate, now)) { 
            slotsForDay = slotsForDay.filter(slot => {
                const [hour, minute] = slot.split(':').map(Number);
                const slotDateTime = setMilliseconds(setSeconds(setMinutes(setHours(new Date(selectedEndDate), hour), minute), 0), 0);
                return isBefore(now, slotDateTime); 
            });
        }

        if (isSameDay(selectedEndDate, selectedDate)) { 
            slotsForDay = slotsForDay.filter(slot => {
                const [hour, minute] = slot.split(':').map(Number);
                const slotDateTime = setMilliseconds(setSeconds(setMinutes(setHours(new Date(selectedEndDate), hour), minute), 0), 0);
                return isBefore(startDateTime, slotDateTime); 
            });
        }
        setAvailableEndTimeSlots(slotsForDay);
    }
  }, [service, selectedDate, selectedTimeSlot, selectedEndDate, isDayDisabled, today]);


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
        description: 'Debes iniciar sesión para reservar un servicio.',
        variant: 'destructive',
      });
      openLoginDialog();
      return;
    }

    if (!selectedDate || !selectedTimeSlot || !selectedEndDate || !selectedEndTimeSlot || (isHourlyService && calculatedDurationHours <= 0)) {
      toast({
        title: 'Información Incompleta',
        description: 'Por favor, selecciona fecha/hora de inicio y fin, y asegúrate que la duración sea válida.',
        variant: 'destructive',
      });
      return;
    }

    if (!policyAccepted && service?.policyText) {
      toast({
        title: 'Política no Aceptada',
        description: 'Debes aceptar la política de servicio.',
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

  const handlePayment = () => {
    if (!selectedPaymentMethod || !service || !user || !selectedDate || !selectedTimeSlot || !selectedEndDate || !selectedEndTimeSlot) {
      toast({
        title: 'Información Incompleta',
        description: 'Faltan detalles para procesar el pago. Por favor, selecciona un método de pago.',
        variant: 'destructive',
      });
      return;
    }
     if (isHourlyService && calculatedDurationHours <= 0) {
      toast({ title: 'Duración Inválida', description: 'El rango de fechas/horas seleccionado no es válido.', variant: 'destructive' });
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

    const orderId = `ORD-SVC-${Date.now()}`;
    const bookingDetails = {
      id: orderId,
      serviceTitle: service.title,
      professionalName: service.professionalName || 'N/A',
      location: service.location,
      professionalEmail: 'service_provider@example.com', 
      professionalPhone: service.phone || service.whatsapp || 'N/A',
      serviceDate: format(selectedDate, "yyyy-MM-dd"),
      serviceTime: selectedTimeSlot,
      serviceEndDate: format(selectedEndDate, "yyyy-MM-dd"),
      serviceEndTime: selectedEndTimeSlot,
      orderNumber: orderId,
      status: 'aceptado' as 'aceptado',
    };

    let invoiceServiceTitle = `Reserva de ${service.title} para ${format(selectedDate, "PPP", { locale: es })} ${selectedTimeSlot} - ${format(selectedEndDate, "PPP", { locale: es })} ${selectedEndTimeSlot}`;
    if (isHourlyService) {
        invoiceServiceTitle += ` (${calculatedDurationHours} hora${calculatedDurationHours > 1 ? 's' : ''})`;
    }


    const invoiceDetails = {
      id: `inv-${orderId}`,
      invoiceNumber: `FACT-SVC-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      serviceTitle: invoiceServiceTitle,
      amount: totalAmount,
      status: 'Pagada' as 'Pagada',
    };
    
    console.log('Simulating payment & booking for service:', bookingDetails, 'with method:', selectedPaymentMethod);
    console.log('Simulating invoice generation for service:', invoiceDetails);

    try {
      const existingBookingsRaw = localStorage.getItem(STORED_USER_BOOKINGS_KEY);
      const existingBookings = existingBookingsRaw ? JSON.parse(existingBookingsRaw) : [];
      localStorage.setItem(STORED_USER_BOOKINGS_KEY, JSON.stringify([bookingDetails, ...existingBookings]));

      const existingInvoicesRaw = localStorage.getItem(STORED_INVOICES_KEY);
      const existingInvoices = existingInvoicesRaw ? JSON.parse(existingInvoicesRaw) : [];
      localStorage.setItem(STORED_INVOICES_KEY, JSON.stringify([invoiceDetails, ...existingInvoices]));
      
      toast({
        title: 'Reserva Confirmada (Simulación)',
        description: `Tu reserva para "${service.title}" ha sido confirmada y la factura generada. Revisa "Mis Reservas" y "Facturación".`,
      });

    } catch (e) {
      console.error("Error saving to localStorage:", e);
      toast({ title: "Error Guardando Reserva", description: "No se pudo guardar la reserva localmente.", variant: "destructive" });
    }

    setBookingStep('selection');
    setSelectedDate(undefined);
    setSelectedTimeSlot(undefined);
    setSelectedEndDate(undefined);
    setSelectedEndTimeSlot(undefined);
    setSelectedPaymentMethod(undefined);
    setPolicyAccepted(false);
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

  const modifiers = useMemo(() => ({
    available: (date: Date) => !isDayDisabled(date) && dailyAvailability[format(date, 'yyyy-MM-dd')] === 'available',
    occupied: (date: Date) => !isDayDisabled(date) && dailyAvailability[format(date, 'yyyy-MM-dd')] === 'occupied',
  }), [dailyAvailability, isDayDisabled]);

  const modifiersClassNames = {
    available: 'rdp-day_available',
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

  if (!service) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-xl text-muted-foreground">Servicio no disponible.</p>
         <Button onClick={() => router.back()} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  const imagesToShow = service.imageUrls && service.imageUrls.length > 0 ? service.imageUrls : (service.imageUrl ? [service.imageUrl] : []);
  const formattedWhatsAppLink = service?.whatsapp ? `https://wa.me/${service.whatsapp.replace(/\D/g, '')}` : '#';

  return (
    <div className="container mx-auto px-2 sm:px-4 py-6 md:py-8 max-w-5xl">
      <Button variant="ghost" onClick={ bookingStep === 'confirmation' ? handleBackToSelection : () => router.back() } className="mb-4 text-primary hover:text-primary/80 px-2">
        <ArrowLeft className="mr-2 h-5 w-5" />
        {bookingStep === 'confirmation' ? 'Volver a Selección' : 'Volver a la búsqueda'}
      </Button>

      {bookingStep === 'selection' && (
      <Card className="overflow-hidden shadow-xl rounded-xl">
        <CardHeader className="p-0">
          {imagesToShow.length > 0 ? (
            <Carousel
              opts={{ loop: imagesToShow.length > 1 }}
              className="w-full rounded-t-xl overflow-hidden"
            >
              <CarouselContent>
                {imagesToShow.map((imgUrl, index) => (
                  <CarouselItem key={index}>
                    <AspectRatio ratio={16 / 9} className="bg-muted">
                      <Image
                        src={imgUrl}
                        alt={`${service.title} - imagen ${index + 1}`}
                        fill
                        style={{ objectFit: "cover" }}
                        className="rounded-t-xl"
                        data-ai-hint={service.dataAiHint ? `${service.dataAiHint} ${index + 1}`: `service image ${index + 1}`}
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
          <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">{service.title}</CardTitle>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-x-4 gap-y-2 pt-2">
            {service.professionalName && (
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border">
                    <AvatarImage src={service.professionalAvatar || undefined} alt={service.professionalName} data-ai-hint="professional avatar" />
                    <AvatarFallback><User className="h-5 w-5 text-muted-foreground" /></AvatarFallback>
                    </Avatar>
                    <div>
                    <p className="text-sm font-medium text-foreground">{service.professionalName}</p>
                    <p className="text-xs text-muted-foreground">{service.category}</p>
                    </div>
                </div>
            )}
             <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="mr-2 h-4 w-4 text-primary shrink-0" />
              {service.location || 'Ubicación no especificada'}
            </div>
          </div>

            {(service.phone || service.whatsapp) && (
              <div className="border-t pt-4 space-y-2">
                <h3 className="text-md font-semibold text-foreground">Contacto del Proveedor</h3>
                {service.phone && (
                  <div className="flex items-center gap-2 text-sm text-foreground/80">
                    <Phone className="h-4 w-4 text-primary" />
                    <span>{service.phone}</span>
                  </div>
                )}
                {service.whatsapp && (
                   <Button asChild variant="outline" size="sm" className="text-sm">
                      <Link href={formattedWhatsAppLink} target="_blank" rel="noopener noreferrer">
                          <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp: {service.whatsapp}
                      </Link>
                   </Button>
                )}
              </div>
            )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-muted-foreground border-t pt-4">
            <div className="text-lg font-semibold text-primary">
                ${service.rate.toLocaleString('es-CO')}{isHourlyService ? "/hr" : ""}
            </div>
          </div>
          
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold mb-2 text-foreground">Descripción del Servicio</h3>
            <div
              className={cn(
                "text-base leading-relaxed text-foreground/80 prose max-w-none prose-sm sm:prose-base",
                !isDescriptionExpanded && service.description.length > 200 && "line-clamp-3"
              )}
              dangerouslySetInnerHTML={{ __html: service.description.replace(/\n/g, '<br />') }}
            />
            {service.description.length > 200 && (
              <Button
                variant="link"
                className="p-0 h-auto text-primary text-sm mt-1"
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              >
                {isDescriptionExpanded ? 'Ver menos' : 'Ver más'}
              </Button>
            )}
          </div>

          <div className="space-y-6 pt-6 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-3">
                <Label htmlFor="calendar-booking-start" className="text-md font-semibold text-foreground flex items-center">
                    <CalendarDays className="mr-2 h-5 w-5 text-primary flex-shrink-0" />
                    Fecha de Inicio
                </Label>
                <div className="flex justify-center">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => { setSelectedDate(date); setSelectedTimeSlot(undefined); setSelectedEndDate(undefined); setSelectedEndTimeSlot(undefined); }}
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
                </div>
                {selectedDate && <p className="text-sm text-muted-foreground pt-2 text-center">Fecha Inicio: {format(selectedDate, "PPP", { locale: es })}</p>}
                </div>

                <div className="space-y-3">
                    <Label htmlFor={`time-slot-start-${service.id}`} className="text-md font-semibold text-foreground flex items-center whitespace-nowrap">
                        <Clock className="mr-2 h-5 w-5 text-primary flex-shrink-0" />
                        Hora de Inicio
                    </Label>
                    <div>
                        {selectedDate ? (
                        availableTimeSlots.length > 0 ? (
                            <Select value={selectedTimeSlot} onValueChange={(value) => { setSelectedTimeSlot(value); setSelectedEndDate(undefined); setSelectedEndTimeSlot(undefined); }}>
                            <SelectTrigger id={`time-slot-start-${service.id}`} className="w-full">
                                <SelectValue placeholder="Selecciona horario inicio" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableTimeSlots.map((slot) => (
                                <SelectItem key={`start-${slot}`} value={slot} >
                                    {slot}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                        ) : ( isDayDisabled(selectedDate) ? 
                                <p className="text-sm text-muted-foreground italic pt-1">Día no disponible.</p> 
                                : <p className="text-sm text-destructive italic pt-1 font-medium">No hay cupos disponibles.</p> )
                        ) : ( <p className="text-sm text-muted-foreground italic pt-1">Selecciona una fecha primero.</p> )}
                    </div>
                </div>
            </div>

            {selectedDate && selectedTimeSlot && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mt-6 pt-6 border-t">
                     <div className="space-y-3">
                         <Label htmlFor="calendar-booking-end" className="text-md font-semibold text-foreground flex items-center">
                             <CalendarDays className="mr-2 h-5 w-5 text-primary flex-shrink-0" />
                             Fecha de Fin
                         </Label>
                         <div className="flex justify-center">
                             <Calendar
                                 mode="single"
                                 selected={selectedEndDate}
                                 onSelect={(date) => { setSelectedEndDate(date); setSelectedEndTimeSlot(undefined); }}
                                 disabled={(date) => isDayDisabled(date) || (selectedDate && isBefore(date, selectedDate)) || false }
                                 modifiers={modifiers}
                                 modifiersClassNames={modifiersClassNames}
                                 locale={es}
                                 defaultMonth={selectedDate || defaultCalendarMonth}
                                 fromMonth={selectedDate || startOfDay(new Date())}
                                 toYear={currentYear + 2}
                                 captionLayout="dropdown-buttons"
                                 className="rounded-md border shadow-md p-2 bg-card"
                             />
                         </div>
                          {selectedEndDate && <p className="text-sm text-muted-foreground pt-2 text-center">Fecha Fin: {format(selectedEndDate, "PPP", { locale: es })}</p>}
                     </div>
                     <div className="space-y-3">
                         <Label htmlFor={`time-slot-end-${service.id}`} className="text-md font-semibold text-foreground flex items-center whitespace-nowrap">
                             <Clock className="mr-2 h-5 w-5 text-primary flex-shrink-0" />
                             Hora de Fin
                         </Label>
                         <div>
                             {selectedEndDate ? (
                                 availableEndTimeSlots.length > 0 ? (
                                     <Select value={selectedEndTimeSlot} onValueChange={setSelectedEndTimeSlot}>
                                         <SelectTrigger id={`time-slot-end-${service.id}`} className="w-full">
                                             <SelectValue placeholder="Selecciona horario fin" />
                                         </SelectTrigger>
                                         <SelectContent>
                                             {availableEndTimeSlots.map((slot) => (
                                                 <SelectItem key={`end-${slot}`} value={slot}>
                                                     {slot}
                                                 </SelectItem>
                                             ))}
                                         </SelectContent>
                                     </Select>
                                 ) : ( isDayDisabled(selectedEndDate) ?
                                     <p className="text-sm text-muted-foreground italic pt-1">Día no disponible.</p>
                                     : <p className="text-sm text-destructive italic pt-1 font-medium">No hay cupos de fin disponibles.</p>)
                             ) : (<p className="text-sm text-muted-foreground italic pt-1">Selecciona una fecha de fin primero.</p>)}
                         </div>
                     </div>
                 </div>
            )}

            {isHourlyService && (
              <div className="mt-4 pt-4 border-t">
                {selectedDate && selectedTimeSlot && selectedEndDate && selectedEndTimeSlot ? (
                  calculatedDurationHours > 0 ? (
                    <>
                      <p className="text-sm font-medium">Duración Estimada: <span className="text-primary">{calculatedDurationHours} hora{calculatedDurationHours > 1 ? 's' : ''}</span></p>
                      <p className="text-lg font-semibold">Costo Total Estimado: <span className="text-primary">${totalAmount.toLocaleString('es-CO')}</span></p>
                    </>
                  ) : (
                    <p className="text-sm text-destructive italic">Rango de tiempo inválido. Asegúrate de que la hora de finalización sea posterior a la de inicio.</p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground italic">Selecciona fecha y hora de inicio y fin para ver la duración y el costo.</p>
                )}
              </div>
            )}
          </div>

          {service.policyText && (
            <Alert className="mt-6">
              <Info className="h-4 w-4" />
              <AlertTitle>Política del Servicio</AlertTitle>
              <AlertDescription>{service.policyText}</AlertDescription>
            </Alert>
          )}

          {service.policyText && (
            <div className="flex items-center space-x-3 mt-6 pt-6 border-t">
                <Checkbox
                    id="policy-acceptance"
                    checked={policyAccepted}
                    onCheckedChange={(newCheckedState) => {
                      if (typeof newCheckedState === 'boolean') {
                        setPolicyAccepted(newCheckedState);
                      }
                    }}
                    aria-labelledby="policy-acceptance-label"
                />
                <Label htmlFor="policy-acceptance" id="policy-acceptance-label" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    He leído y acepto la política de servicio.
                </Label>
            </div>
           )}
        </CardContent>

        <CardFooter className="bg-muted/30 p-4 md:p-6 border-t flex justify-end">
            <Button
              onClick={handleProceedToConfirmation}
              size="lg"
              className="w-full sm:w-auto"
              disabled={isLoading || !selectedDate || !selectedTimeSlot || !selectedEndDate || !selectedEndTimeSlot || (isHourlyService && calculatedDurationHours <= 0) || (!!service.policyText && !policyAccepted)}
            >
                Aceptar y Reservar
            </Button>
        </CardFooter>
      </Card>
      )}

      {bookingStep === 'confirmation' && service && selectedDate && selectedTimeSlot && selectedEndDate && selectedEndTimeSlot && (
        <Card className="overflow-hidden shadow-xl rounded-xl">
          <CardHeader className="bg-muted/50 p-4 md:p-6 border-b">
            <CardTitle className="text-xl md:text-2xl font-semibold text-foreground flex items-center">
                <ShieldCheck className="mr-3 h-6 w-6 text-primary" />
                Confirmar Reserva y Pago
            </CardTitle>
            <CardDescription>Revisa los detalles de tu reserva y elige un método de pago.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">Detalles del Servicio</h3>
              <div className="space-y-2 text-sm text-foreground/80">
                <p><span className="font-medium text-foreground">Servicio:</span> {service.title}</p>
                {service.professionalName && <p><span className="font-medium text-foreground">Profesional:</span> {service.professionalName}</p>}
                {service.phone && <p><span className="font-medium text-foreground">Teléfono:</span> {service.phone}</p>}
                {service.whatsapp && <p><span className="font-medium text-foreground">WhatsApp:</span> {service.whatsapp}</p>}
                <p><span className="font-medium text-foreground">Inicio:</span> {format(selectedDate, "PPP", { locale: es })} a las {selectedTimeSlot}</p>
                <p><span className="font-medium text-foreground">Fin:</span> {format(selectedEndDate, "PPP", { locale: es })} a las {selectedEndTimeSlot}</p>
                {isHourlyService && <p><span className="font-medium text-foreground">Duración:</span> {calculatedDurationHours} hora{calculatedDurationHours > 1 ? 's' : ''}</p>}
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
                {isHourlyService && <span className="text-sm font-normal text-muted-foreground ml-1">(${service.rate.toLocaleString('es-CO')}/hr x {calculatedDurationHours}h)</span>}
                {!isHourlyService && <span className="text-sm font-normal text-muted-foreground ml-1">(tarifa única)</span>}
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
                  <RadioGroupItem value="pse" id="pse" />
                  <Label htmlFor="pse" className="flex-grow cursor-pointer">PSE (Pagos Seguros en Línea)</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="debit" id="debit" />
                  <Label htmlFor="debit" className="flex-grow cursor-pointer">Tarjeta de Débito</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="credit" id="credit" />
                  <Label htmlFor="credit" className="flex-grow cursor-pointer">Tarjeta de Crédito</Label>
                </div>
              </RadioGroup>
               {selectedPaymentMethod === 'pse' && (
                <div className="mt-4 space-y-4 p-4 border rounded-md bg-muted/30">
                  <h4 className="font-medium text-sm flex items-center"><Landmark className="mr-2 h-4 w-4 text-primary" /> Detalles para PSE</h4>
                  <div className="space-y-2">
                    <Label htmlFor="pse-bank-service">Banco</Label>
                    <Select value={selectedBank} onValueChange={setSelectedBank}>
                      <SelectTrigger id="pse-bank-service"><SelectValue placeholder="Selecciona tu banco" /></SelectTrigger>
                      <SelectContent>
                        {mockBanks.map(bank => <SelectItem key={bank.value} value={bank.value}>{bank.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pse-holder-name-service">Nombre del titular de la cuenta</Label>
                    <Input id="pse-holder-name-service" value={accountHolderNamePSE} onChange={(e) => setAccountHolderNamePSE(e.target.value)} placeholder="Nombre Completo" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pse-doc-type-service">Tipo de Documento</Label>
                      <Select value={documentTypePSE} onValueChange={setDocumentTypePSE}>
                        <SelectTrigger id="pse-doc-type-service"><SelectValue placeholder="Tipo" /></SelectTrigger>
                        <SelectContent>
                           {documentTypesPSE.map(doc => <SelectItem key={doc.value} value={doc.value}>{doc.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pse-doc-number-service">Número de Documento</Label>
                      <Input id="pse-doc-number-service" value={documentNumberPSE} onChange={(e) => setDocumentNumberPSE(e.target.value)} placeholder="Número" />
                    </div>
                  </div>
                </div>
              )}

              {(selectedPaymentMethod === 'debit' || selectedPaymentMethod === 'credit') && (
                <div className="mt-4 space-y-4 p-4 border rounded-md bg-muted/30">
                  <h4 className="font-medium text-sm flex items-center"><CreditCardIcon className="mr-2 h-4 w-4 text-primary"/> Detalles de la Tarjeta</h4>
                  <div className="space-y-2">
                    <Label htmlFor="card-number-service">Número de Tarjeta</Label>
                    <Input id="card-number-service" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="**** **** **** ****" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="card-expiry-service">Expiración (MM/AA)</Label>
                      <Input id="card-expiry-service" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder="MM/AA" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card-cvv-service">CVV</Label>
                      <Input id="card-cvv-service" value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} placeholder="123" />
                    </div>
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="card-holder-name-service">Nombre del titular de la tarjeta</Label>
                    <Input id="card-holder-name-service" value={cardHolderNameCard} onChange={(e) => setCardHolderNameCard(e.target.value)} placeholder="Nombre como aparece en la tarjeta" />
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
              onClick={handlePayment}
              size="lg"
              className="w-full sm:w-auto"
              disabled={isPaymentButtonDisabled() || (isHourlyService && calculatedDurationHours <= 0)}
            >
              {isLoading ? "Procesando..." : "Pagar Ahora"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};


const ServiceDetailPage = () => {
  return (
    <AppLayout>
      <ServiceDetailPageContent />
    </AppLayout>
  );
};

export default ServiceDetailPage;
    

    

    