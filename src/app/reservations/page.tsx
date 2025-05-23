import ReservationList from '@/components/reservations/ReservationList';
import { mockReservations } from '@/lib/mock-data';
import type { Reservation } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

// Simulate fetching data for Server Component
async function getReservations(): Promise<Reservation[]> {
  // In a real app, this would be an API call or database query for the logged-in user
  return new Promise((resolve) => setTimeout(() => resolve(mockReservations), 300));
}

export default async function ReservationsPage() {
  const reservations = await getReservations();

  const upcomingReservations = reservations.filter(r => r.status === 'upcoming' && new Date(r.date + 'T' + r.startTime) >= new Date());
  const pastReservations = reservations.filter(r => r.status === 'completed' || (r.status === 'upcoming' && new Date(r.date + 'T' + r.startTime) < new Date()) || r.status === 'cancelled');
  
  // Sort upcoming by date ascending, past by date descending
  upcomingReservations.sort((a, b) => new Date(a.date + 'T' + a.startTime).getTime() - new Date(b.date + 'T' + b.startTime).getTime());
  pastReservations.sort((a, b) => new Date(b.date + 'T' + b.startTime).getTime() - new Date(a.date + 'T' + a.startTime).getTime());


  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">My Reservations</CardTitle>
          <CardDescription className="text-lg">
            Manage your upcoming and view past bookings.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 border-b pb-2">Upcoming Reservations</h2>
        {upcomingReservations.length > 0 ? (
          <ReservationList reservations={upcomingReservations} />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">You have no upcoming reservations.</p>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-6 border-b pb-2">Past Reservations</h2>
        {pastReservations.length > 0 ? (
          <ReservationList reservations={pastReservations} />
        ) : (
           <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">You have no past reservations.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

export const revalidate = 30; // Revalidate data every 30 seconds
