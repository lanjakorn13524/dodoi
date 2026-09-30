export {
  type BookingInput,
  type BookingRow,
  type RoomRow,
  type UserRow,
  type CustomerRow,
  ensureSeed,
  listRooms,
  getRoom,
  createRoom,
  setRoomActive,
  setRoomColor,
  getBooking,
  listBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  cancelBooking,
  hasRoomConflict,
  roomsWithConflicts,
  bookedNightsInMonth,
  getUserByEmail,
  getUserById,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  createSession,
  getUserBySessionToken,
  deleteSession,
  deleteSessionsByUser,
  clearBookingsCreatedBy,
  listCustomers,
  createCustomer,
  updateCustomer,
  customerBookingCount,
  countBookingsByUser,
  setBookingGoogleEventId,
} from "./repo";

export function isValidDateRange(checkIn: string, checkOut: string): boolean {
  return checkOut > checkIn;
}

export function nights(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T00:00:00`);
  const b = new Date(`${checkOut}T00:00:00`);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}