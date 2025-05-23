import RecommendationForm from '@/components/recommendations/RecommendationForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function RecommendationsPage() {
  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">AI Booking Assistant</CardTitle>
          <CardDescription className="text-lg">
            Let our AI help you find the best time to book your desired space.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Tell us what you're looking for, and we'll suggest optimal times based on typical demand and availability patterns. This helps you find less busy slots for a better experience.</p>
        </CardContent>
      </Card>
      
      <Card className="shadow-md">
        <CardHeader>
            <CardTitle className="text-xl">Find an Optimal Time</CardTitle>
        </CardHeader>
        <CardContent>
            <RecommendationForm />
        </CardContent>
      </Card>
    </div>
  );
}
