export interface Expert {
  id: string;
  name: string;
  category: string;
  experience: number;
  rating: number;
  bio: string;
  avatar: string;
}

export interface Slot {
  id: string;
  expertId: string;
  date: string;
  time: string;
  startTime: string;
  status: 'available' | 'booked';
  bookingId?: string;
}

export interface Booking {
  id: string;
  expertId: string;
  expertName: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  date: string;
  time: string;
  startTime: string;
  status: 'pending' | 'confirmed' | 'completed';
  notes?: string;
  createdAt: string;
}
