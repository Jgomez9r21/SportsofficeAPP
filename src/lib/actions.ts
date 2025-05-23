"use server";

import { mockSpaces, mockReservations } from './mock-data';
import type { Reservation } from './types';
import { revalidatePath } from 'next/cache';

interface BookSpaceArgs {
  spaceId: string;
  date: string; // YYYY-MM-DD
  slotId: string;
  startTime: string;
  endTime: string;
  userDetails: {
    name: string;
    email: string;
    notes?: string;
  };
}

export async function bookSpace(args: BookSpaceArgs): Promise<{ success: boolean; reservationId?: string; error?: string }> {
  console.log("Attempting to book space with args:", args);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const space = mockSpaces.find(s => s.id === args.spaceId);
  if (!space) {
    return { success: false, error: "Space not found." };
  }

  const slot = space.slots.find(s => s.id === args.slotId);
  if (!slot) {
    return { success: false, error: "Time slot not found." };
  }

  if (slot.isBooked) {
    // This check is basic. A real app would check for the specific date too.
    return { success: false, error: "This time slot is already booked." };
  }

  // Mark as booked (in memory for mock)
  slot.isBooked = true;

  const newReservation: Reservation = {
    id: `res-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    userId: `user-${args.userDetails.email}`, // Simple user ID from email
    spaceId: args.spaceId,
    spaceName: space.name,
    spaceCategory: space.category,
    date: args.date,
    startTime: args.startTime,
    endTime: args.endTime,
    status: 'upcoming',
    bookedAt: new Date().toISOString(),
  };

  mockReservations.push(newReservation);
  console.log("New reservation created:", newReservation);
  console.log("Updated mockReservations:", mockReservations.length);


  // Revalidate paths to update cached data on relevant pages
  revalidatePath('/'); // For space list availability
  revalidatePath('/reservations'); // For reservations list

  return { success: true, reservationId: newReservation.id };
}

export async function getSpaceById(id: string) {
  await new Promise(resolve => setTimeout(resolve, 200));
  return mockSpaces.find(space => space.id === id);
}

export async function getUserReservations(userId: string) {
  await new Promise(resolve => setTimeout(resolve, 200));
  // Filter mockReservations by a placeholder userId or return all for demo
  return mockReservations.filter(res => res.userId === userId || true); // simplified for demo
}
