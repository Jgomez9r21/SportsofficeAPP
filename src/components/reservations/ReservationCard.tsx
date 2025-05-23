import type { Reservation } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, Tag, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ReservationCard({ reservation }: { reservation: Reservation }) {
  const reservationDateTime = new Date(`${reservation.date}T${reservation.startTime}`);
  const isPast = reservationDateTime < new Date() && reservation.status === 'upcoming';


  let displayStatus = reservation.status;
  if (isPast) displayStatus = 'completed'; // Auto-mark past 'upcoming' as 'completed' for display

  const statusBadgeVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    switch (displayStatus) {
      case 'upcoming': return 'default'; // Primary styled
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };
  
  const formattedDate = format(parseISO(reservation.date + 'T00:00:00Z'), 'PPP');


  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{reservation.spaceName}</CardTitle>
            <CardDescription className="flex items-center gap-1 pt-1">
              <Tag className="h-4 w-4 text-muted-foreground" /> {reservation.spaceCategory}
            </CardDescription>
          </div>
          <Badge variant={statusBadgeVariant()} className="capitalize">{displayStatus}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{reservation.startTime} - {reservation.endTime}</span>
        </div>
        <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span>Booked on: {format(parseISO(reservation.bookedAt), 'PPP p')}</span>
        </div>
      </CardContent>
      {reservation.status === 'upcoming' && !isPast && (
        <CardFooter>
          <Button variant="outline" size="sm" disabled>Manage (Soon)</Button> 
          {/* Placeholder for cancel/modify */}
        </CardFooter>
      )}
    </Card>
  );
}
