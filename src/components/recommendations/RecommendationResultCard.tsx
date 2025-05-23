import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import type { RecommendBestTimeOutput } from '@/ai/flows/recommend-best-time';
import { format, parseISO } from 'date-fns';

interface RecommendationResultCardProps {
  recommendation?: RecommendBestTimeOutput | null;
  error?: string | null;
}

export default function RecommendationResultCard({ recommendation, error }: RecommendationResultCardProps) {
  if (error) {
    return (
      <Alert variant="destructive" className="mt-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!recommendation) {
    return null; // Or a placeholder if needed before first submission
  }
  
  let formattedRecommendedTime = "N/A";
  try {
    // Attempt to parse and format. Handle potential invalid date string from AI.
    const parsedDate = parseISO(recommendation.recommendedTime);
    formattedRecommendedTime = format(parsedDate, "PPP 'at' p");
  } catch (e) {
    console.warn("Could not parse recommended time:", recommendation.recommendedTime, e);
    // Fallback to raw string if parsing fails, or handle as an error
    formattedRecommendedTime = recommendation.recommendedTime + " (Could not format date)";
  }


  return (
    <Card className="mt-6 shadow-lg bg-gradient-to-br from-primary/10 via-background to-background">
      <CardHeader>
        <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <CardTitle className="text-2xl">Recommendation Ready!</CardTitle>
        </div>
        <CardDescription>Here's what our AI assistant suggests:</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg text-primary mb-1">Recommended Time:</h3>
          <p className="text-xl font-medium">{formattedRecommendedTime}</p>
        </div>
        <div>
          <h3 className="font-semibold text-lg text-primary mb-1 flex items-center gap-1.5">
            <Lightbulb className="h-5 w-5"/>
            Reasoning:
            </h3>
          <p className="text-muted-foreground leading-relaxed">{recommendation.reasoning}</p>
        </div>
      </CardContent>
    </Card>
  );
}
