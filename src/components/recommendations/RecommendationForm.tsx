"use client";

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { recommendBestTime, type RecommendBestTimeInput, type RecommendBestTimeOutput } from '@/ai/flows/recommend-best-time';
import RecommendationResultCard from './RecommendationResultCard';
import { useToast } from '@/hooks/use-toast';

const recommendationFormSchema = z.object({
  spaceType: z.string().min(1, { message: "Please select a space type." }),
  activity: z.string().min(2, { message: "Activity must be at least 2 characters." }),
  desiredDate: z.date({ required_error: "Please select a desired date." }),
});

const spaceTypes = [
  { value: "soccer field", label: "Soccer Field" },
  { value: "basketball court", label: "Basketball Court" },
  { value: "tennis court", label: "Tennis Court" },
  { value: "coworking desk", label: "Coworking Desk" },
  { value: "meeting room", label: "Meeting Room" },
];

export default function RecommendationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<RecommendBestTimeOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof recommendationFormSchema>>({
    resolver: zodResolver(recommendationFormSchema),
    defaultValues: {
      activity: '',
      desiredDate: new Date(),
    },
  });

  const onSubmit = async (values: z.infer<typeof recommendationFormSchema>) => {
    setIsLoading(true);
    setRecommendation(null);
    setError(null);

    const input: RecommendBestTimeInput = {
      ...values,
      desiredDate: format(values.desiredDate, 'yyyy-MM-dd'),
    };

    try {
      const result = await recommendBestTime(input);
      setRecommendation(result);
    } catch (e) {
      console.error("AI Recommendation Error:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred with the AI assistant.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Recommendation Failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="spaceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type of Space</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a space type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {spaceTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  What kind of space are you looking for?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="activity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Activity</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Friendly soccer match, Quiet work session" {...field} />
                </FormControl>
                <FormDescription>
                  What will you be using the space for?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="desiredDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Desired Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Around when would you like to book?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Getting Recommendation...
              </>
            ) : (
              "Find Best Time"
            )}
          </Button>
        </form>
      </Form>

      {recommendation && !isLoading && (
        <div className="mt-8">
          <RecommendationResultCard recommendation={recommendation} />
        </div>
      )}
      {error && !isLoading && (
         <div className="mt-8">
            <RecommendationResultCard error={error} />
        </div>
      )}
    </div>
  );
}
