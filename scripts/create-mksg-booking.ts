import "./env";
import { sequelize } from "../models";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { createFlightBooking, createPaymentLinkAndSubmitRisk } from "../services/bookingService";

async function main() {
  await sequelize.authenticate();

  const agentRole = await Role.findOne({ where: { key: "agent" } });
  if (!agentRole) {
    throw new Error("Agent role not found — run `npm run db:migrate` first");
  }
  const agent = await User.findOne({ where: { roleId: agentRole.id } });
  if (!agent) {
    throw new Error("No agent user found — run `npm run db:seed` first");
  }

  const booking = await createFlightBooking({
    customerName: "MKSG",
    customerEmail: "mksg.test@example.com",
    customerPhone: "+91 9876543210",
    customerAddressStreet1: "221B Baker Street",
    customerAddressCity: "Bengaluru",
    customerAddressState: "Karnataka",
    customerAddressCountry: "IN",
    agentId: agent.id,
    pnr: `MKSG${Date.now().toString().slice(-6)}`,
    origin: "BLR",
    destination: "DEL",
    cabinClass: "Economy",
    gds: "Supplier",
    ticketingSupplier: "Direct",
    tripType: "One Way",
    journeyType: "Domestic",
    fareType: "PUBLISHED",
    buyCurrency: "INR",
    sellCurrency: "INR",
    segments: [
      {
        flightNumber: "AI505",
        airline: "AI",
        airlinePnr: "MKSGPNR",
        depAirport: "BLR",
        depDate: "2026-08-15",
        depTime: "09:00",
        arrAirport: "DEL",
        arrDate: "2026-08-15",
        arrTime: "11:45",
        bookingClass: "Y",
        cabinClass: "ECONOMY",
        status: "HK",
        operatedBy: "Air India",
      },
    ],
    passengers: [{ firstName: "MKSG", lastName: "Traveller", paxType: "ADT", dob: "1990-01-01" }],
    fares: [{ paxType: "ADT", baseFare: 4500, tax: 900, net: 4800 }],
  });

  console.log(`Created booking ${booking.bookingRef} (id ${booking.id}), total ${booking.currency} ${booking.totalAmount}`);

  const { paymentLink, riskResult } = await createPaymentLinkAndSubmitRisk(
    booking.id,
    Number(booking.totalAmount),
    booking.currency,
    agent.id
  );

  console.log("Payment link created:", {
    gatewayLinkId: paymentLink.gatewayLinkId,
    linkUrl: paymentLink.linkUrl,
    status: paymentLink.status,
  });
  console.log("Risk engine result:", riskResult);

  await sequelize.close();
}

main().catch((err) => {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
