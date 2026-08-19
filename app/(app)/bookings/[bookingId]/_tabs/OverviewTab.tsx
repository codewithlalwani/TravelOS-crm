import { StatusStepper } from "@/components/StatusStepper";
import { countryNameFromCode } from "@/lib/geo/countryName";
import { BOOKING_TYPE_LABEL, type Booking } from "@/models/Booking";
import { PAX_TYPE_LABEL, type PaxType } from "@/models/Passenger";
import { ProviderLogo } from "@/components/ProviderLogo";
import { providerLogosForNames } from "@/services/providerLogoService";
import { groupFlightSegments } from "@/lib/booking/flightOptions";

export async function OverviewTab({ booking }: { booking: Booking }) {
  const flight = booking.flightDetail;
  const hotel = booking.hotelDetail;
  const car = booking.carDetail;
  const segments = booking.segments || [];
  const segmentGroups = groupFlightSegments(segments, flight?.tripType, flight?.destination);
  const guestsLabel = booking.type === "hotel" ? "Guests" : booking.type === "car" ? "Drivers" : "Passengers";
  const providerCategory = booking.type === "train" ? "rail" : booking.type === "car" ? "car_rental" : booking.type;
  const providerNames = segments.map((segment) => segment.airline);
  if (hotel) providerNames.push(hotel.hotelName);
  if (car) providerNames.push(car.supplier);
  const providerLogos = await providerLogosForNames(providerCategory, providerNames);

  return (
    <div className="space-y-6">
      {booking.cancelledAt && (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6">
          <h3 className="mb-3 font-heading text-sm font-semibold text-danger">Booking cancelled</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Reason</dt>
              <dd className="text-right font-medium text-foreground">{booking.cancelledReason}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Cancelled by</dt>
              <dd className="text-foreground">{booking.cancelledByName || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Cancelled on</dt>
              <dd className="text-foreground">{booking.cancelledAt.toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <h3 className="mb-3 font-heading text-sm font-semibold text-card-foreground">Pipeline status</h3>
        <StatusStepper status={booking.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <h3 className="mb-3 font-heading text-sm font-semibold text-card-foreground">Customer</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium text-foreground">{booking.customer?.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-foreground">{booking.customer?.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="text-foreground">{booking.customer?.phone || "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <h3 className="mb-3 font-heading text-sm font-semibold text-card-foreground">Booking</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium text-foreground">{BOOKING_TYPE_LABEL[booking.type]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Created By</dt>
              <dd className="text-foreground">{booking.agent?.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Created</dt>
              <dd className="text-foreground">{booking.createdAt.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Gross (Selling Price)</dt>
              <dd className="font-medium text-foreground">
                {booking.totalAmount ? `${booking.currency} ${Number(booking.totalAmount).toFixed(2)}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Net (Cost Price)</dt>
              <dd className="font-medium text-foreground">
                {booking.netAmount ? `${booking.currency} ${Number(booking.netAmount).toFixed(2)}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">MCO (Margin)</dt>
              <dd className="font-medium text-foreground">
                {booking.mcoAmount ? `${booking.currency} ${Number(booking.mcoAmount).toFixed(2)}` : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {flight && (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <h3 className="mb-3 font-heading text-sm font-semibold text-card-foreground">
            {booking.type === "train" ? "Rail details" : "Flight details"}
          </h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">{booking.type === "train" ? "Reservation" : "PNR"}</dt>
              <dd className="font-medium text-foreground">{flight.pnr}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Route</dt>
              <dd className="text-foreground">
                {flight.origin} → {flight.destination}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Class</dt>
              <dd className="text-foreground">{flight.cabinClass || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{booking.type === "train" ? "Operator" : "GDS"}</dt>
              <dd className="text-foreground">{flight.gds || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Trip Type</dt>
              <dd className="text-foreground">{flight.tripType || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Journey Type</dt>
              <dd className="text-foreground">{flight.journeyType || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fare Type</dt>
              <dd className="text-foreground">{flight.fareType || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ticketing Deadline</dt>
              <dd className="text-foreground">
                {flight.ticketingDeadline ? `${flight.ticketingDeadline} ${flight.ticketingDeadlineTime || ""}` : "—"}
              </dd>
            </div>
          </dl>

          {segmentGroups.length > 0 && (
            <div className="mt-5 space-y-3 border-t border-border pt-4">
              {segmentGroups.map((group) => <div key={group.key} className="overflow-hidden rounded-xl border border-border bg-background">
              <div className="border-b border-border bg-secondary/10 px-4 py-2">
                <h4 className="font-heading text-sm font-semibold text-foreground">{group.label}</h4>
                <p className="text-xs leading-5 text-muted-foreground">{group.segments[0].depAirport} → {group.segments[group.segments.length - 1].arrAirport} · {group.segments.length} {group.segments.length === 1 ? "segment" : "segments"}</p>
              </div>
              <div className="overflow-x-auto px-4 pb-1 pt-3">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-1.5 pr-3 font-medium">Flight</th>
                    <th className="py-1.5 pr-3 font-medium">Airline</th>
                    <th className="py-1.5 pr-3 font-medium">Departure</th>
                    <th className="py-1.5 pr-3 font-medium">Arrival</th>
                    <th className="py-1.5 pr-3 font-medium">Class</th>
                    <th className="py-1.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {group.segments.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="py-1.5 pr-3 font-medium text-foreground">{s.flightNumber || "—"}</td>
                      <td className="py-1.5 pr-3 text-foreground">
                        <span className="flex items-center gap-2 [&>span]:h-6 [&>span]:w-14"><ProviderLogo name={s.airline} logoUrl={providerLogos[s.airline]?.url} compact /> {s.airline}</span>
                      </td>
                      <td className="py-1.5 pr-3 text-foreground">
                        {s.depAirport} {s.depDate} {s.depTime || ""}
                      </td>
                      <td className="py-1.5 pr-3 text-foreground">
                        {s.arrAirport} {s.arrDate || ""} {s.arrTime || ""}
                      </td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{s.bookingClass || "—"}</td>
                      <td className="py-1.5 text-muted-foreground">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              </div>)}
            </div>
          )}
        </div>
      )}

      {hotel && (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <h3 className="mb-3 font-heading text-sm font-semibold text-card-foreground">Hotel details</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Hotel</dt>
              <dd className="mt-1 flex items-center gap-3 font-medium text-foreground"><ProviderLogo name={hotel.hotelName} logoUrl={providerLogos[hotel.hotelName]?.url} /> {hotel.hotelName}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="text-foreground">{hotel.address}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Check-in</dt>
              <dd className="text-foreground">{hotel.checkIn}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Check-out</dt>
              <dd className="text-foreground">{hotel.checkOut}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Room Type</dt>
              <dd className="text-foreground">{hotel.roomType}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Guests</dt>
              <dd className="text-foreground">{hotel.guests}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Confirmation No.</dt>
              <dd className="font-medium text-foreground">{hotel.confirmationNo}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Rating</dt>
              <dd className="text-foreground">{hotel.hotelRating ? `★ ${hotel.hotelRating}` : "—"}</dd>
            </div>
          </dl>
        </div>
      )}

      {car && (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <h3 className="mb-3 font-heading text-sm font-semibold text-card-foreground">Car rental details</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Pickup</dt>
              <dd className="font-medium text-foreground">
                {[car.pickupLocation, car.pickupCity, car.pickupState, countryNameFromCode(car.pickupCountry)]
                  .filter(Boolean)
                  .join(", ")}{" "}
                ({car.pickupStationType}
                {car.pickupStation ? ` · ${car.pickupStation}` : ""})
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Dropoff</dt>
              <dd className="font-medium text-foreground">
                {[car.dropoffLocation, car.dropoffCity, car.dropoffState, countryNameFromCode(car.dropoffCountry)]
                  .filter(Boolean)
                  .join(", ")}{" "}
                ({car.dropoffStationType}
                {car.dropoffStation ? ` · ${car.dropoffStation}` : ""})
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Pickup Date & Time</dt>
              <dd className="text-foreground">{car.pickupDateTime.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dropoff Date & Time</dt>
              <dd className="text-foreground">{car.dropoffDateTime.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Booking Status</dt>
              <dd className="text-foreground">{car.bookingStatus}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Supplier</dt>
              <dd className="mt-1 flex items-center gap-2 text-foreground">
                <ProviderLogo name={car.supplier} logoUrl={providerLogos[car.supplier]?.url} compact /> {car.supplier} ({car.supplierType})
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Supplier Ref</dt>
              <dd className="font-medium text-foreground">{car.supplierRef}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Vehicle</dt>
              <dd className="text-foreground">{car.vehicleName || car.vehicleCode || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Max Pax / Luggage</dt>
              <dd className="text-foreground">
                {car.maxPax ?? "—"} / {car.maxLuggage ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">No. of Vehicles</dt>
              <dd className="text-foreground">{car.noOfVehicles}</dd>
            </div>
            {car.pickupMeetingPoint && (
              <div className="sm:col-span-4">
                <dt className="text-muted-foreground">Pickup Meeting Point</dt>
                <dd className="text-foreground">{car.pickupMeetingPoint}</dd>
              </div>
            )}
            {car.meetingPoint && (
              <div className="sm:col-span-4">
                <dt className="text-muted-foreground">Dropoff Meeting Point</dt>
                <dd className="text-foreground">{car.meetingPoint}</dd>
              </div>
            )}
            {car.rateRemarks && (
              <div className="sm:col-span-4">
                <dt className="text-muted-foreground">Rate Remarks</dt>
                <dd className="text-foreground">{car.rateRemarks}</dd>
              </div>
            )}
            {car.specialRequest && (
              <div className="sm:col-span-4">
                <dt className="text-muted-foreground">Special Request</dt>
                <dd className="text-foreground">{car.specialRequest}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <h3 className="mb-3 font-heading text-sm font-semibold text-card-foreground">{guestsLabel}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Date of birth</th>
                <th className="pb-2 font-medium">Passport No.</th>
              </tr>
            </thead>
            <tbody>
              {(booking.passengers || []).map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-2 font-medium text-foreground">
                    {[p.title, p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ")}
                  </td>
                  <td className="py-2 text-muted-foreground">{PAX_TYPE_LABEL[p.paxType as PaxType]}</td>
                  <td className="py-2 text-muted-foreground">{p.dob || "—"}</td>
                  <td className="py-2 text-muted-foreground">{p.passportNo || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
