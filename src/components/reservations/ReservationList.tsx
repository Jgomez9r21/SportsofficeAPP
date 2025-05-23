import type { Reservation } from '@/lib/types';
import ReservationCard from './ReservationCard';

interface ReservationListProps {
  reservations: Reservation[];
}

export default function ReservationList({ reservations }: ReservationListProps) {
  if (!reservations || reservations.length === 0) {
    return null; // Parent component handles empty state message
  }

  return (
    <div className="space-y-4">
      {reservations.map((reservation) => (
        <ReservationCard key={reservation.id} reservation={reservation} />
      ))}
    </div>
  );
}
