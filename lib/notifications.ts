import { prisma } from "@/lib/prisma";
import { sendWaMessage } from "@/lib/wa-gateway";

// Bentuk data booking minimal yang dibutuhin buat nyusun pesan WA. Dipanggil
// dari app/api/bookings (admin), app/api/public/[outletSlug]/bookings
// (publik), dan app/api/cron/reminder (H-1).
type BookingForNotif = {
  id: string;
  startTime: Date;
  customer: { name: string; phone: string };
  service: { name: string };
  outlet: { name: string };
};

function formatTanggalJam(date: Date) {
  return date.toLocaleString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

async function sendAndLog(
  booking: BookingForNotif,
  type: "confirmation" | "reminder_h1",
  message: string,
) {
  const result = await sendWaMessage({ phone: booking.customer.phone, message });

  await prisma.notificationLog.create({
    data: {
      bookingId: booking.id,
      type,
      status: result.success ? "sent" : "failed",
    },
  });

  if (!result.success) {
    console.warn(
      `[notifications] gagal kirim ${type} buat booking ${booking.id}: ${result.error}`,
    );
  }

  return result;
}

// Dipanggil sesaat setelah booking dibuat (admin atau publik). Nggak boleh
// bikin pembuatan booking gagal kalau WA-nya gagal terkirim — pemanggil
// wajib bungkus ini di try/catch juga buat jaga-jaga.
export async function sendBookingConfirmation(booking: BookingForNotif) {
  const message = `Halo ${booking.customer.name}! Booking kamu di ${booking.outlet.name} untuk "${booking.service.name}" pada ${formatTanggalJam(booking.startTime)} udah kami terima. Sampai ketemu ya!`;

  return sendAndLog(booking, "confirmation", message);
}

// Dipanggil dari cron reminder H-1.
export async function sendBookingReminder(booking: BookingForNotif) {
  const message = `Halo ${booking.customer.name}, ini pengingat booking kamu di ${booking.outlet.name} untuk "${booking.service.name}" besok, ${formatTanggalJam(booking.startTime)}. Sampai jumpa!`;

  return sendAndLog(booking, "reminder_h1", message);
}
