import Image from 'next/image';
import type { Space, TimeSlot } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, MapPin, Briefcase, ActivitySquare, Clock } from 'lucide-react';
import BookingDialog from './BookingDialog'; // To be created

const SpaceTypeIcon = ({ type }: { type: Space['type'] }) => {
  if (type === 'sports_field') return <ActivitySquare className="h-5 w-5 text-primary" />;
  if (type === 'workspace') return <Briefcase className="h-5 w-5 text-primary" />;
  return null;
};

export default function SpaceCard({ space }: { space: Space }) {
  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="relative w-full h-48 rounded-t-lg overflow-hidden mb-4">
          <Image
            src={space.imageUrl}
            alt={space.name}
            layout="fill"
            objectFit="cover"
            data-ai-hint={space.imageHint}
          />
        </div>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{space.name}</CardTitle>
          <Badge variant="secondary">{space.category}</Badge>
        </div>
        <CardDescription className="flex items-center gap-2 pt-1">
          <SpaceTypeIcon type={space.type} />
          <span>{space.type === 'sports_field' ? 'Sports Field' : 'Workspace'}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground mb-3">{space.description}</p>
        <div className="space-y-2 text-sm">
          {space.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{space.location}</span>
            </div>
          )}
          {space.capacity && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Capacity: {space.capacity}</span>
            </div>
          )}
          {space.hourlyRate && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>${space.hourlyRate}/hour</span>
            </div>
          )}
        </div>
        
        <div className="mt-4">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Available Slots:
          </h4>
          <div className="flex flex-wrap gap-2">
            {space.slots.filter(slot => !slot.isBooked).slice(0, 3).map(slot => ( // Show first 3 available
              <Badge key={slot.id} variant="outline" className="cursor-pointer">
                {slot.startTime}
              </Badge>
            ))}
            {space.slots.filter(slot => !slot.isBooked).length === 0 && (
              <p className="text-xs text-muted-foreground">No slots available today.</p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <BookingDialog space={space} />
      </CardFooter>
    </Card>
  );
}
