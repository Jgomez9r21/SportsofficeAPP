'use server';
/**
 * @fileOverview AI flow to recommend the best time to book a sports field or workspace.
 *
 * - recommendBestTime - A function that suggests optimal booking times.
 * - RecommendBestTimeInput - The input type for the recommendBestTime function.
 * - RecommendBestTimeOutput - The return type for the recommendBestTime function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendBestTimeInputSchema = z.object({
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
export type RecommendBestTimeInput = z.infer<typeof RecommendBestTimeInputSchema>;

const RecommendBestTimeOutputSchema = z.object({
  recommendedTime: z
    .string()
    .describe('The recommended time slot for the booking (e.g., YYYY-MM-DDTHH:mm:ssZ).'),
  reasoning: z
    .string()
    .describe('The reasoning behind the recommended time slot selection.'),
});
export type RecommendBestTimeOutput = z.infer<typeof RecommendBestTimeOutputSchema>;

export async function recommendBestTime(input: RecommendBestTimeInput): Promise<RecommendBestTimeOutput> {
  return recommendBestTimeFlow(input);
}

const findOpenSlotTool = ai.defineTool({
  name: 'findOpenSlot',
  description: 'Finds an open time slot for a given space type, activity, and desired date, considering typical booking patterns.',
  inputSchema: z.object({
    spaceType: z.string().describe('The type of space to book (e.g., soccer field, desk).'),
    activity: z.string().describe('The activity planned for the space (e.g., soccer, working).'),
    desiredDate: z
      .string()
      .describe('The desired date for the booking in ISO format (YYYY-MM-DD).'),
  }),
  outputSchema: z.string().describe('The open time slot in ISO format (YYYY-MM-DDTHH:mm:ssZ).'),
},
async (input) => {
  // TODO: Implement the logic to find an open slot using an external service or database.
  // This is a placeholder; replace with actual implementation.
  const {spaceType, activity, desiredDate} = input
  const suggestedTime = new Date(desiredDate);
  suggestedTime.setDate(suggestedTime.getDate() + 1);
  return suggestedTime.toISOString();
});

const prompt = ai.definePrompt({
  name: 'recommendBestTimePrompt',
  input: {schema: RecommendBestTimeInputSchema},
  output: {schema: RecommendBestTimeOutputSchema},
  tools: [findOpenSlotTool],
  prompt: `You are an AI assistant helping users find the best time to book a space for their activity.

  The user wants to book a {{spaceType}} for {{activity}} on {{desiredDate}}.

  Use the findOpenSlot tool to find an available time slot that is the least busy, considering typical booking patterns for similar activities.

  Provide a recommended time slot and explain your reasoning for choosing that specific time. Consider factors like day of the week, time of day, and typical usage patterns for the {{spaceType}}.

  The recommended time must be in ISO format.`,
});

const recommendBestTimeFlow = ai.defineFlow(
  {
    name: 'recommendBestTimeFlow',
    inputSchema: RecommendBestTimeInputSchema,
    outputSchema: RecommendBestTimeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
