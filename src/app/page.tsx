import SpaceList from '@/components/spaces/SpaceList';
import { mockSpaces } from '@/lib/mock-data';
import type { Space } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

// Simulate fetching data for Server Component
async function getSpaces(): Promise<Space[]> {
  // In a real app, this would be an API call or database query
  return new Promise((resolve) => setTimeout(() => resolve(mockSpaces), 500));
}

export default async function HomePage() {
  const spaces = await getSpaces();

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">Discover Your Next Space</CardTitle>
          <CardDescription className="text-lg">
            Browse available sports fields and workspaces. Book your spot with ease!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Find the perfect location for your game, practice, or focused work session. We offer a variety of spaces to suit your needs.</p>
        </CardContent>
      </Card>
      
      <SpaceList spaces={spaces} />
    </div>
  );
}

export const revalidate = 60; // Revalidate data every 60 seconds
