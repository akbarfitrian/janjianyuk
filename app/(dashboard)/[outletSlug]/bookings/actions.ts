"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOutletId } from "@/lib/session-outlet";

type ActionResult = { error: string | null };

const STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;

function revalidateOutletPaths(outletSlug: string) {
  revalidatePath(`/${outletSlug}/bookings`);
  revalidatePath(`/${outletSlug}`);
}

export async function createBooking(
  outletSlug: string,
  formData: FormData,
): Promise<ActionResult> {
  const outletId = await requireOutletId();

  const customerId = String(formData.get("customerId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const staffId = String(formData.get("staffId") ?? "") || null;
  const startTimeRaw = String(formData.get("startTime") ?? "");

  if (!customerId || !serviceId || !startTimeRaw) {
    return { error: "Pelanggan, layanan, dan waktu mulai wajib diisi." };
  }

  const startTime = new Date(startTimeRaw);
  if (Number.isNaN(startTime.getTime())) {
    return { error: "Waktu booking tidak valid." };
  }

  const [customer, service, staff] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, outletId } }),
    prisma.service.findFirst({ where: { id: serviceId, outletId } }),
    staffId
      ? prisma.staff.findFirst({ where: { id: staffId, outletId } })
      : Promise.resolve(null),
  ]);

  if (!customer) return { error: "Pelanggan tidak ditemukan." };
  if (!service) return { error: "Layanan tidak ditemukan." };
  if (staffId && !staff) return { error: "Staff tidak ditemukan." };

  const endTime = new Date(startTime.getTime() + service.durationMin * 60_000);

  if (staffId) {
    const clash = await prisma.booking.findFirst({
      where: {
        outletId,
        staffId,
        status: { notIn: ["cancelled", "no_show"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    if (clash) {
      return { error: "Staff ini sudah ada booking lain di jam tersebut." };
    }
  }

  await prisma.booking.create({
    data: {
      outletId,
      customerId,
      serviceId,
      staffId,
      startTime,
      endTime,
      status: "confirmed",
    },
  });

  revalidateOutletPaths(outletSlug);
  return { error: null };
}

export async function updateBookingStatus(
  outletSlug: string,
  bookingId: string,
  status: string,
): Promise<ActionResult> {
  const outletId = await requireOutletId();

  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    return { error: "Status tidak valid." };
  }

  const result = await prisma.booking.updateMany({
    where: { id: bookingId, outletId },
    data: { status },
  });

  if (result.count === 0) return { error: "Booking tidak ditemukan." };

  revalidateOutletPaths(outletSlug);
  return { error: null };
}

export async function deleteBooking(
  outletSlug: string,
  bookingId: string,
): Promise<ActionResult> {
  const outletId = await requireOutletId();

  const result = await prisma.booking.deleteMany({
    where: { id: bookingId, outletId },
  });
  if (result.count === 0) return { error: "Booking tidak ditemukan." };

  revalidateOutletPaths(outletSlug);
  return { error: null };
}
