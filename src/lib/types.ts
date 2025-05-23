export interface TimeSlot {
  id: string;
  startTime: string; // e.g., "10:00"
  endTime: string;   // e.g., "11:00"
  isBooked: boolean;
}

export interface Space {
  id: string;
  name: string;
  type: 'sports_field' | 'workspace';
  category: string; // e.g., 'Soccer', 'Basketball', 'Desk', 'Meeting Room'
  imageUrl: string;
  imageHint: string; // For AI image generation hint
  capacity?: number;
  description: string;
  amenities?: string[];
  hourlyRate?: number;
  location?: string;
  slots: TimeSlot[]; // Available slots for a typical day or specific date
}

export interface Reservation {
  id: string;
  userId: string; // Placeholder for user association
  spaceId: string;
  spaceName: string;
  spaceCategory: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g., "10:00"
  endTime: string;   // e.g., "11:00"
  status: 'upcoming' | 'completed' | 'cancelled';
  bookedAt: string; // ISO string timestamp of booking
}

export interface BookingFormData {
  name: string;
  email: string;
  notes?: string;
}
