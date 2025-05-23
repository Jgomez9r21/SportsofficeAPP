'use server';
/**
 * @fileOverview AI flow to recommend optimal booking times based on historical data and predicted usage.
 *
 * - recommendOptimalBookingTime - A function that suggests optimal booking times.
 * - RecommendOptimalBookingTimeInput - The input type for the recommendOptimalBookingTime function.
 * - RecommendOptimalBookingTimeOutput - The return type for the recommendOptimalBookingTime function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendOptimalBookingTimeInputSchema = z.object({
  spaceType: z
    .string()
    .describe('The type of space to book (e.g., soccer field, desk).'),
  activity: z
    .string()
    .describe('The activity planned for the space (e.g., soccer, working).'),
  desiredDate: z
    .string()
    .describe('The desired date for the booking in ISO format (YYYY-MM-DD).'),
});
export type RecommendOptimalBookingTimeInput = z.infer<typeof RecommendOptimalBookingTimeInputSchema>;

const RecommendOptimalBookingTimeOutputSchema = z.object({
  recommendedTime: z
    .string()
    .describe('The recommended time slot for the booking in ISO format (YYYY-MM-DDTHH:mm:ssZ).'),
  reasoning: z
    .string()
    .describe('The reasoning behind the recommended time slot selection, considering historical data and predicted usage.'),
});
export type RecommendOptimalBookingTimeOutput = z.infer<typeof RecommendOptimalBookingTimeOutputSchema>;

export async function recommendOptimalBookingTime(input: RecommendOptimalBookingTimeInput): Promise<RecommendOptimalBookingTimeOutput> {
  return recommendOptimalBookingTimeFlow(input);
}

const findOptimalSlotTool = ai.defineTool({
  name: 'findOptimalSlot',
  description: 'Finds the optimal time slot for a given space type, activity, and desired date, considering historical booking data and predicted usage patterns to identify less busy times.',
  inputSchema: z.object({
    spaceType: z.string().describe('The type of space to book (e.g., soccer field, desk).'),
    activity: z.string().describe('The activity planned for the space (e.g., soccer, working).'),
    desiredDate: z
      .string()
      .describe('The desired date for the booking in ISO format (YYYY-MM-DD).'),
  }),
  outputSchema: z.string().describe('The optimal time slot in ISO format (YYYY-MM-DDTHH:mm:ssZ).'),
},
async (input) => {
  // TODO: Implement the logic to find an optimal slot using historical data and predicted usage.
  // This is a placeholder; replace with actual implementation.
  const {spaceType, activity, desiredDate} = input;
  const suggestedTime = new Date(desiredDate);
  suggestedTime.setDate(suggestedTime.getDate() + 2); // Suggest a time 2 days after the desired date as a placeholder.
  return suggestedTime.toISOString();
});

const prompt = ai.definePrompt({
  name: 'recommendOptimalBookingTimePrompt',
  input: {schema: RecommendOptimalBookingTimeInputSchema},
  output: {schema: RecommendOptimalBookingTimeOutputSchema},
  tools: [findOptimalSlotTool],
  prompt: `You are an AI assistant helping users find the best time to book a space for their activity, considering less busy times based on historical data and predicted usage.

  The user wants to book a {{spaceType}} for {{activity}} on {{desiredDate}}.

  Use the findOptimalSlot tool to find an available time slot that is likely to be the least busy, considering historical booking data and predicted usage patterns for similar activities.

  Provide a recommended time slot and explain your reasoning for choosing that specific time. Consider factors like day of the week, time of day, historical booking data, and predicted usage for the {{spaceType}} to identify a less busy time.

  The recommended time must be in ISO format. Reasoning should explain why you selected that time based on historical data and predicted usage.`,
});

const recommendOptimalBookingTimeFlow = ai.defineFlow(
  {
    name: 'recommendOptimalBookingTimeFlow',
    inputSchema: RecommendOptimalBookingTimeInputSchema,
    outputSchema: RecommendOptimalBookingTimeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

