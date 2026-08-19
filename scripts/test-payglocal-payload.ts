import "./env";
import type { CreatePaymentLinkParams } from "../lib/payments/PaymentGatewayAdapter";
import { paymentGateway } from "../lib/payments/PayGlocalAdapter";

const oneWay: CreatePaymentLinkParams = {
  bookingRef: `TESTOW${Date.now()}`,
  amount: 101,
  currency: "INR",
  customerName: "Sam Thomas",
  customerEmail: "sam.thomas@gmail.com",
  billingAddress: {
    street1: "Apartment 9B, 235 East, 43rd Street",
    city: "New York",
    state: "New York",
    country: "US",
  },
  travel: {
    type: "flight",
    tripType: "One Way",
    reservationDate: new Date("2025-12-01"),
    pnr: "ticket12345",
    destination: "BLR",
    legs: [
      {
        flightNumber: "flight123",
        airline: "AAL",
        depAirport: "AUH",
        depCity: "Abu Dhabi",
        depCountry: "AE",
        depDate: "2023-03-20",
        depTime: "09:01",
        arrAirport: "BLR",
        arrCity: "Bangalore",
        arrCountry: "IN",
        arrDate: "2023-03-21",
        arrTime: "09:01",
        cabinClass: "ECONOMY",
      },
    ],
    passengers: [{ firstName: "Sam", lastName: "Thomas" }],
  },
};

const returnTrip: CreatePaymentLinkParams = {
  bookingRef: `TESTRT${Date.now()}`,
  amount: 2902,
  currency: "INR",
  customerName: "Roy Thomas",
  customerEmail: "sam.thomas@gmail.com",
  billingAddress: {
    street1: "Apartment 9B, 235 East, 43rd Street",
    city: "New York",
    state: "New York",
    country: "US",
  },
  travel: {
    type: "flight",
    tripType: "Round Trip",
    reservationDate: new Date("2025-06-01"),
    pnr: "ticket56789",
    destination: "BLR",
    legs: [
      {
        flightNumber: "NY123",
        airline: "AAL",
        depAirport: "JFK",
        depCity: "New York",
        depCountry: "US",
        depDate: "2024-06-10",
        depTime: "08:00",
        arrAirport: "AUH",
        arrCity: "Abu Dhabi",
        arrCountry: "AE",
        arrDate: "2024-06-10",
        arrTime: "20:00",
        cabinClass: "ECONOMY",
      },
      {
        flightNumber: "AUH456",
        airline: "AAL",
        depAirport: "AUH",
        depCity: "Abu Dhabi",
        depCountry: "AE",
        depDate: "2024-06-11",
        depTime: "02:00",
        arrAirport: "BLR",
        arrCity: "Bangalore",
        arrCountry: "IN",
        arrDate: "2024-06-11",
        arrTime: "08:00",
        cabinClass: "ECONOMY",
      },
      {
        flightNumber: "BLR789",
        airline: "AAL",
        depAirport: "BLR",
        depCity: "Bangalore",
        depCountry: "IN",
        depDate: "2024-06-20",
        depTime: "10:00",
        arrAirport: "AUH",
        arrCity: "Abu Dhabi",
        arrCountry: "AE",
        arrDate: "2024-06-20",
        arrTime: "16:00",
        cabinClass: "ECONOMY",
      },
      {
        flightNumber: "AUH321",
        airline: "AAL",
        depAirport: "AUH",
        depCity: "Abu Dhabi",
        depCountry: "AE",
        depDate: "2024-06-21",
        depTime: "00:00",
        arrAirport: "JFK",
        arrCity: "New York",
        arrCountry: "US",
        arrDate: "2024-06-21",
        arrTime: "10:00",
        cabinClass: "ECONOMY",
      },
    ],
    passengers: [
      { firstName: "Sam", lastName: "Thomas" },
      { firstName: "John", lastName: "Denver" },
    ],
  },
};

const hotelStay: CreatePaymentLinkParams = {
  bookingRef: `TESTHT${Date.now()}`,
  amount: 12000,
  currency: "INR",
  customerName: "Sam Thomas",
  customerEmail: "sam.thomas@gmail.com",
  billingAddress: {
    street1: "Apartment 9B, 235 East, 43rd Street",
    city: "New York",
    state: "New York",
    country: "US",
  },
  travel: {
    type: "hotel",
    lodgingName: "Lake View",
    checkInDate: "2025-01-04",
    checkOutDate: "2025-01-06",
    city: "Mumbai",
    country: "IN",
    rating: "4.0",
    cancellationPolicy: "NC",
  },
};

const carHire: CreatePaymentLinkParams = {
  bookingRef: `TESTCR${Date.now()}`,
  amount: 117800,
  currency: "INR",
  customerName: "Sam Thomas",
  customerEmail: "sam.thomas@gmail.com",
  billingAddress: {
    street1: "Apartment 9B, 235 East, 43rd Street",
    city: "New York",
    state: "New York",
    country: "US",
  },
  travel: {
    type: "car",
    pickupDateTime: new Date("2023-03-20T09:01:56Z"),
    passengers: [{ firstName: "Sam", lastName: "Thomas" }],
  },
};

async function run(label: string, params: CreatePaymentLinkParams) {
  console.log(`\n=== ${label} (mode: ${process.env.PAYGLOCAL_MODE}) ===`);
  try {
    const result = await paymentGateway.createPaymentLink(params);
    console.log("OK:", result);
  } catch (err) {
    console.error("FAILED:", err instanceof Error ? err.message : err);
  }
}

async function main() {
  await run("ONE WAY", oneWay);
  await run("RETURN", returnTrip);
  await run("HOTEL", hotelStay);
  await run("CAR", carHire);
}

main();
