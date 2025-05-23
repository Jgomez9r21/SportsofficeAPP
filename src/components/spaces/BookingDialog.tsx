"use client";

import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import type { Space, TimeSlot, BookingFormData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { bookSpace } from '@/lib/actions'; // Server action
import { Calendar as CalendarIcon, CheckCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


const bookingFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  date: z.date({ required_error: "Please select a date." }),
  slotId: z.string().min(1, { message: "Please select a time slot." }),
  notes: z.string().optional(),
});

interface BookingDialogProps {
  space: Space;
}

export default function BookingDialog({ space }: BookingDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlotsForDate, setAvailableSlotsForDate] = useState<TimeSlot[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      name: '',
      email: '',
      date: new Date(),
      slotId: '',
      notes: '',
    },
  });
  
  // Effect to update available slots when selectedDate or space.slots changes
  // This is a simplified mock; in a real app, you'd fetch slots for the selected date
  useEffect(() => {
    if (selectedDate) {
       // For mock, we just use the predefined slots, filtering out booked ones.
       // A real app would fetch slots for `selectedDate` from the backend.
      setAvailableSlotsForDate(space.slots.filter(slot => !slot.isBooked));
      form.resetField("slotId"); // Reset selected slot when date changes
    }
  }, [selectedDate, space.slots, form]);

  useEffect(() => {
    form.setValue("date", selectedDate || new Date());
  }, [selectedDate, form]);


  const onSubmit = async (values: z.infer<typeof bookingFormSchema>) => {
    try {
      const selectedSlot = availableSlotsForDate.find(s => s.id === values.slotId);
      if (!selectedSlot) {
        toast({ variant: "destructive", title: "Error", description: "Selected slot not found." });
        return;
      }

      const result = await bookSpace({
        spaceId: space.id,
        date: format(values.date, "yyyy-MM-dd"),
        slotId: values.slotId,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        userDetails: { name: values.name, email: values.email, notes: values.notes },
      });

      if (result.success) {
        toast({
          title: "Booking Confirmed!",
          description: `You've successfully booked ${space.name} for ${format(values.date, "PPP")} at ${selectedSlot.startTime}.`,
          action: <CheckCircle className="text-green-500" />,
        });
        setIsOpen(false);
        form.reset();
        // Here you might want to trigger a re-fetch of spaces or update UI optimistically
      } else {
        toast({ variant: "destructive", title: "Booking Failed", description: result.error || "Could not complete booking." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">Book Slot</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Book: {space.name}</DialogTitle>
          <DialogDescription>
            Fill in your details to reserve this space.
            Current rate: ${space.hourlyRate}/hour.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setSelectedDate(date);
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} // Disable past dates
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slotId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time Slot</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={availableSlotsForDate.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an available time slot" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableSlotsForDate.map((slot) => (
                        <SelectItem key={slot.id} value={slot.id}>
                          {slot.startTime} - {slot.endTime}
                        </SelectItem>
                      ))}
                      {availableSlotsForDate.length === 0 && <SelectItem value="no-slots" disabled>No slots available for selected date</SelectItem>}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any special requests?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Booking..." : "Confirm Booking"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
