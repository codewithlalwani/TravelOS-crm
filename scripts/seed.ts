import "./env";
import { sequelize } from "../models";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { Booking } from "../models/Booking";
import { hashPassword } from "../lib/auth/password";
import { createFlightBooking, createHotelBooking } from "../services/bookingService";

async function ensureUser(params: { name: string; email: string; password: string; roleId: number; createdBy: number | null }) {
  const existing = await User.findOne({ where: { email: params.email } });
  if (existing) return existing;
  const passwordHash = await hashPassword(params.password);
  return User.create({
    name: params.name,
    email: params.email,
    passwordHash,
    roleId: params.roleId,
    createdBy: params.createdBy,
  });
}

async function main() {
  await sequelize.authenticate();

  const adminRole = await Role.findOne({ where: { key: "admin" } });
  const agentRole = await Role.findOne({ where: { key: "agent" } });
  if (!adminRole || !agentRole) {
    throw new Error("Admin/Agent roles not found — run `npm run db:migrate` first");
  }

  const admin = await ensureUser({
    name: "System Admin",
    email: "admin@flightconnect.test",
    password: "Admin@12345",
    roleId: adminRole.id,
    createdBy: null,
  });

  const agent = await ensureUser({
    name: "Alex Agent",
    email: "agent@flightconnect.test",
    password: "Agent@12345",
    roleId: agentRole.id,
    createdBy: admin.id,
  });

  const existingBooking = await Booking.findOne({ where: { bookingRef: "FC-SEED-0001" } });
  if (!existingBooking) {
    const booking = await createFlightBooking({
      customerName: "Russell Graham Copple",
      customerEmail: "russell.copple@example.com",
      customerPhone: "+1 951 234 2686",
      agentId: agent.id,
      pnr: "KUDLNO",
      origin: "ONT",
      destination: "CMH",
      cabinClass: "Economy",
      gds: "Supplier",
      ticketingSupplier: "Direct",
      tripType: "One Way",
      journeyType: "Domestic",
      fareType: "PUBLISHED",
      buyCurrency: "USD",
      sellCurrency: "USD",
      segments: [
        {
          airline: "American Airlines",
          depAirport: "ONT",
          depDate: "2026-08-21",
          arrAirport: "CMH",
          status: "HK",
        },
      ],
      passengers: [{ firstName: "Russell", middleName: "Graham", lastName: "Copple", paxType: "ADT", dob: "1952-11-18" }],
      fares: [{ paxType: "ADT", baseFare: 420, tax: 65, net: 400 }],
    });
    await booking.update({ bookingRef: "FC-SEED-0001" });
    console.log(`Seeded booking ${booking.bookingRef} (id ${booking.id})`);
  } else {
    console.log("Seed booking already exists, skipping");
  }

  const existingHotelBooking = await Booking.findOne({ where: { bookingRef: "FC-SEED-0002" } });
  if (!existingHotelBooking) {
    const hotelBooking = await createHotelBooking({
      customerName: "Priya Sharma",
      customerEmail: "priya.sharma@example.com",
      customerPhone: "+91 9820012345",
      agentId: agent.id,
      hotelName: "The Anvaya Beach Resort Bali",
      address: "Kuta, Bali, Indonesia",
      checkIn: "2026-08-10",
      checkOut: "2026-08-15",
      roomType: "Deluxe",
      guests: 2,
      ratePerNight: 111,
      taxesAndFees: 45,
      confirmationNo: "ANV-88213",
      hotelRating: 4.7,
      currency: "USD",
      guestList: [{ title: "Mrs", firstName: "Priya", lastName: "Sharma" }],
    });
    await hotelBooking.update({ bookingRef: "FC-SEED-0002" });
    console.log(`Seeded booking ${hotelBooking.bookingRef} (id ${hotelBooking.id})`);
  } else {
    console.log("Seed hotel booking already exists, skipping");
  }

  console.log("\nSeed complete.");
  console.log("Admin login: admin@flightconnect.test / Admin@12345");
  console.log("Agent login: agent@flightconnect.test / Agent@12345");

  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
