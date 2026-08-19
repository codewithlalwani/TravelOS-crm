import { COMPANY } from "../company";
import { PAX_TYPE_LABEL } from "../booking/paxTypes";
import { BOOKING_TYPE_LABEL, type BookingType } from "../../models/Booking";
import { groupFlightSegments } from "../booking/flightOptions";

/**
 * Shared branded shell (header banner + status badge + summary strip + footer) used by every
 * booking email. Keeps all templates visually identical apart from the heading/badge text,
 * status values and the body content each template slots in.
 */
function emailShell(params: {
  heading: string;
  bookingRef: string;
  createdAt: Date;
  paymentStatusLabel: string;
  eTicketStatusLabel: string;
  documentStatusHeading?: string;
  preventContentTrimming?: boolean;
  bodyHtml: string;
}): string {
  const navy = COMPANY.colors.navy;
  const orange = COMPANY.colors.orange;
  const border = COMPANY.colors.border;
  const muted = COMPANY.colors.muted;
  const headingUpper = params.heading.toUpperCase();

  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f5f7;">
  <!--[if mso]>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>
  <![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f5f7" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;background:#f4f5f7;">
    <tr>
      <td align="center" style="padding:24px 0;">
        <!--[if mso]>
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0"><tr><td>
        <![endif]-->
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" align="center" bgcolor="#ffffff" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:640px;max-width:640px;background:#ffffff;border:1px solid ${border};">

          <!-- Header -->
          <tr>
            <td style="background:${navy};padding:20px 24px;" bgcolor="${navy}">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;">
                <tr>
                  <td style="vertical-align:top;">
                    <img src="cid:brand-logo" alt="${COMPANY.shortName}" height="30" style="display:block;height:30px;width:auto;margin-bottom:12px;border:0;outline:none;" />
                    <div style="color:#ffffff;font-size:17px;font-weight:700;">${headingUpper}</div>
                    <div style="color:#cbd5e1;font-size:12px;margin:2px 0 8px;">Thank you for choosing ${COMPANY.shortName}.</div>
                    <span style="display:inline-block;background:${orange};color:${navy};font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;mso-line-height-rule:exactly;">
                      ${headingUpper}
                    </span>
                  </td>
                  <td style="vertical-align:top;text-align:right;color:#cbd5e1;font-size:11px;line-height:1.7;">
                    Call Us: ${COMPANY.supportHours}<br/>
                    24/7 Email: ${COMPANY.supportEmail}<br/>
                    ${COMPANY.supportPhone}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Summary strip -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;font-size:12px;">
                <tr>
                  <td style="padding:10px 16px;border-bottom:2px solid ${orange};background:#f4f5f7;" bgcolor="#f4f5f7">
                    <div style="color:${muted};font-size:10px;">BOOKING REFERENCE</div>
                    <div style="font-weight:700;color:#111827;">${params.bookingRef}</div>
                  </td>
                  <td style="padding:10px 16px;border-bottom:2px solid ${orange};background:#f4f5f7;" bgcolor="#f4f5f7">
                    <div style="color:${muted};font-size:10px;">DATE BOOKED</div>
                    <div style="font-weight:700;color:#111827;">${formatDateOnly(params.createdAt)}</div>
                  </td>
                  <td style="padding:10px 16px;border-bottom:2px solid ${orange};background:#f4f5f7;" bgcolor="#f4f5f7">
                    <div style="color:${muted};font-size:10px;">PAYMENT STATUS</div>
                    <div style="font-weight:700;color:#111827;">${params.paymentStatusLabel}</div>
                  </td>
                  <td style="padding:10px 16px;border-bottom:2px solid ${orange};background:#f4f5f7;" bgcolor="#f4f5f7">
                    <div style="color:${muted};font-size:10px;">${params.documentStatusHeading || "E-TICKET STATUS"}</div>
                    <div style="font-weight:700;color:#111827;">${params.eTicketStatusLabel}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px;color:#1f2937;">
              ${params.bodyHtml}
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 24px;">
              ${policyCardsHtml()}
            </td>
          </tr>

          <tr>
            <td style="padding:16px 24px;background:#f4f5f7;color:${muted};font-size:11px;" bgcolor="#f4f5f7">
              <div style="margin-bottom:6px;">Need help? Our support team is available 24/7 &mdash; ${COMPANY.supportEmail} &middot; ${COMPANY.supportPhone} &middot; ${COMPANY.website}</div>
              <div style="margin-bottom:6px;"><a href="${COMPANY.termsUrl}" style="color:${muted};text-decoration:underline;">Terms &amp; Conditions</a> &middot; <a href="${COMPANY.refundPolicyUrl}" style="color:${muted};text-decoration:underline;">Cancellation &amp; Refund Policy</a></div>
              <div>&copy; ${new Date().getFullYear()} ${COMPANY.name}. All rights reserved. This is an automated email, please do not reply.</div>
            </td>
          </tr>
          ${
            params.preventContentTrimming
              ? `<tr><td aria-hidden="true" style="font-size:1px;line-height:1px;color:#ffffff;max-height:1px;overflow:hidden;">${params.bookingRef}-${Date.now()}</td></tr>`
              : ""
          }
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>
  </table>
  <!--[if mso]>
  </td></tr></table>
  <![endif]-->
  </div>`;
}

/**
 * Terms & Conditions / Cancellation & Refund Policy summary cards, appended to every
 * booking email via emailShell so every template surfaces the same policy disclosures.
 */
function policyCardsHtml(): string {
  const navy = COMPANY.colors.navy;
  const border = COMPANY.colors.border;
  const muted = COMPANY.colors.muted;

  const termsSections: Array<{ title: string; body: string }> = [
    { title: "Acceptance of Terms", body: `Use of ${COMPANY.website} constitutes your acceptance of all applicable terms, conditions, and policies governing the website and its services.` },
    { title: "Eligibility to Use Services", body: "Users must be at least 18 years old to use our services independently. Minors may only use the website under the supervision and consent of a parent or legal guardian." },
    { title: "Informational Content Disclaimer", body: "All content published on this website is provided for informational purposes only. Content may not be copied, reproduced, or used for commercial purposes without prior written consent." },
    { title: "Account Security", body: `Users are responsible for maintaining the confidentiality of their account credentials. ${COMPANY.shortName} is not responsible for unauthorized access resulting from user negligence.` },
    { title: "Service Modifications", body: `${COMPANY.shortName} reserves the right to modify, suspend, or terminate services, content, or policies at any time without prior notice.` },
    { title: "Prohibited Activities", body: "Users agree not to engage in illegal, fraudulent, or unauthorized activities while using the website. Violations may result in service termination and legal action." },
    { title: "Pricing and Availability", body: `Prices and service availability are subject to change without notice. ${COMPANY.shortName} does not guarantee pricing until a booking is confirmed.` },
    { title: "Limitation of Liability", body: `${COMPANY.shortName} shall not be held liable for indirect, incidental, or consequential damages arising from the use of the website, except where required by law.` },
    { title: "Legal Compliance", body: "Users must comply with all applicable local, national, and international laws while using the website." },
    { title: "Intellectual Property", body: `All website content, including text, images, graphics, and logos, is the exclusive property of ${COMPANY.shortName} and protected by intellectual property laws.` },
    { title: "Privacy Policy", body: "Personal data is collected and processed in accordance with our Privacy Policy. Users are encouraged to review the policy to understand how their information is handled." },
    { title: "Security and Malware", body: "Users are prohibited from transmitting viruses, malware, or any harmful code that may disrupt the website or other users." },
    { title: "Right to Refuse Service", body: `${COMPANY.shortName} reserves the right to refuse service due to operational, legal, or unforeseen circumstances.` },
    { title: "Accuracy of Information", body: "Users must provide accurate booking information. Incorrect details may result in booking cancellation or failure." },
    { title: "Third-Party Links", body: "The website may contain links to third-party websites. We do not control or endorse third-party content or policies." },
    { title: "Governing Law", body: "Any disputes arising from use of the website shall be governed by applicable laws within the relevant jurisdiction." },
    { title: "Indemnification", body: `Users agree to indemnify and hold harmless ${COMPANY.shortName} from any claims, damages, or losses resulting from misuse of the website.` },
    { title: "Promotional Communication", body: "Marketing emails may be sent only to users who have opted in. Users may unsubscribe at any time." },
  ];

  const refundSections: Array<{ title: string; body: string }> = [
    { title: "Non-Refundable Tickets", body: "Tickets classified as non-refundable are not eligible for refunds under any circumstances. Customers are advised to review airline fare rules thoroughly before confirming reservations." },
    { title: "Refundable Tickets", body: "For refundable fares, some airlines may issue airline credits or vouchers instead of returning the amount to the original form of payment. These credits are typically valid for future travel with the same airline." },
    { title: "Airline Restrictions", body: "Refunds and cancellations are subject to airline-specific terms and conditions. Certain restrictions, penalties, or fare rules may apply depending on the ticket type and airline policy." },
    { title: "24-Hour Cancellation Policy", body: "Cancellations made within 24 hours of booking may qualify for a refund in accordance with airline regulations. However, eligibility is not guaranteed and depends entirely on the airline's individual policy." },
    { title: "No Guarantee of Refund", body: "Even if a cancellation request is submitted within 24 hours, refunds are not assured. Approval is subject to the fare rules and refund policies of the airline or service provider." },
    { title: "Non-Refundable Services", body: "Airline tickets, hotel reservations, prepaid car rentals, vacation packages, and service fees are generally non-refundable once the 24-hour window has passed." },
    { title: "No-Show Policy", body: 'Refund requests will only be reviewed if the traveler is not marked as a "no show." Most no-show bookings are not eligible for refunds.' },
    { title: "Refund Processing Time", body: "Refund processing timelines vary based on airline procedures and individual booking circumstances. We cannot guarantee a specific timeframe for refund completion." },
    { title: "Sequential Handling of Requests", body: "All refund requests are processed in the order they are received to ensure fairness and consistency." },
    { title: "Refund Confirmation", body: "Once a refund request has been reviewed and approved, a confirmation email will be sent to the registered email address." },
    { title: "Supplier Penalties", body: "Airlines or suppliers may apply cancellation or refund penalties. Any applicable charges will be deducted from the refunded amount." },
    { title: "Refund Timeline", body: "From the date of request submission to the appearance of funds on your statement, the complete refund process may take approximately 60 to 90 days." },
    { title: "Post-Ticketing Service Fees", body: `${COMPANY.shortName} may charge a post-ticketing service fee for handling cancellations or refund requests, where applicable.` },
    { title: "Additional Terms", body: "Additional terms and conditions may apply depending on the specific booking, airline, or service provider involved." },
  ];

  const renderCard = (heading: string, href: string, intro: string, sections: Array<{ title: string; body: string }>, outro?: string) => `
    <div style="border:1px solid ${border};border-radius:8px;overflow:hidden;margin:16px 0 0;">
      <div style="background:${navy};color:#ffffff;padding:10px 14px;font-size:12px;font-weight:700;letter-spacing:0.04em;">
        <a href="${href}" style="color:#ffffff;text-decoration:none;">${heading.toUpperCase()}</a>
      </div>
      <div style="padding:14px 16px;font-size:11px;line-height:1.6;color:#374151;">
        <p style="margin:0 0 10px;color:${muted};font-size:10px;">Last updated: 27/07/2026</p>
        <p style="margin:0 0 10px;">${intro}</p>
        ${sections.map((s) => `<p style="margin:0 0 8px;"><strong style="color:${navy};">${s.title}:</strong> ${s.body}</p>`).join("")}
        ${outro ? `<p style="margin:8px 0 0;">${outro}</p>` : ""}
        <p style="margin:10px 0 0;color:${muted};">Email: ${COMPANY.supportEmail} &middot; Phone: ${COMPANY.supportPhone} &middot; ${COMPANY.addressLines.join(" ")}</p>
      </div>
    </div>`;

  const termsCard = renderCard(
    "Terms and Conditions",
    COMPANY.termsUrl,
    `By accessing or using ${COMPANY.website}, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must discontinue use of the website immediately.`,
    termsSections
  );

  const refundCard = renderCard(
    "Cancellation and Refund Policy",
    COMPANY.refundPolicyUrl,
    `At ${COMPANY.website}, we believe in maintaining transparency and keeping our customers well-informed. This Cancellation and Refund Policy explains the conditions under which cancellations and refunds may be processed. Please note that many aspects of this policy are governed by airline rules and third-party suppliers.`,
    refundSections,
    `By using ${COMPANY.website} and booking through our platform, you acknowledge and agree to comply with the cancellation and refund terms outlined above.`
  );

  return termsCard + refundCard;
}

export interface FlightItinerarySegment {
  airline: string;
  logoUrl?: string | null;
  flightNumber?: string | null;
  operatedBy?: string | null;
  depAirport: string;
  depCity?: string | null;
  depCountry?: string | null;
  depDate: string;
  depTime?: string | null;
  depTerminal?: string | null;
  arrAirport: string;
  arrCity?: string | null;
  arrCountry?: string | null;
  arrDate?: string | null;
  arrTime?: string | null;
  arrTerminal?: string | null;
}

function providerLogoHtml(logoUrl: string | null | undefined, alt: string): string {
  return logoUrl
    ? `<img src="${logoUrl}" alt="${alt}" height="18" style="display:inline-block;max-width:52px;height:18px;width:auto;vertical-align:middle;object-fit:contain;margin:0 6px 2px 0;border:0;outline:none;text-decoration:none;background:#ffffff;border-radius:3px;" />`
    : "";
}

/** Renders an airport cell as CODE plus city/country and terminal, so customers see more than a bare code. */
function airportCellHtml(code: string, city?: string | null, country?: string | null, terminal?: string | null): string {
  const location = [city, country].filter(Boolean).join(", ");
  return `<strong>${code}</strong>${terminal ? ` (T${terminal})` : ""}${location ? `<br/><span style="color:${COMPANY.colors.muted};">${location}</span>` : ""}`;
}

/** Compact airline + airport summary, shared by templates that don't already render a full itinerary. */
function transportItineraryHtml(
  bookingType: BookingType,
  segments: FlightItinerarySegment[] | undefined,
  tripType?: string | null,
  destination?: string | null
): string {
  if (!segments || segments.length === 0) return "";
  const isTrain = bookingType === "train";
  const navy = COMPANY.colors.navy;
  const border = COMPANY.colors.border;
  const muted = COMPANY.colors.muted;
  const groups = isTrain
    ? [{ key: "rail", label: "Rail details", segments }]
    : groupFlightSegments(segments, tripType, destination);
  return groups.map((group) => `<div style="border:1px solid ${border};border-radius:8px;overflow:hidden;margin:16px 0;">
       <div style="background:${navy};color:#ffffff;padding:9px 12px;font-size:12px;font-weight:700;text-transform:uppercase;">${group.label} &middot; ${group.segments[0].depAirport} &rarr; ${group.segments[group.segments.length - 1].arrAirport}</div>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;font-size:12px;">
         <thead>
           <tr style="background:#f4f5f7;text-align:left;">
             <th style="padding:8px;border:1px solid ${border};">${isTrain ? "Operator" : "Airline"}</th>
             <th style="padding:8px;border:1px solid ${border};">From</th>
             <th style="padding:8px;border:1px solid ${border};">To</th>
             <th style="padding:8px;border:1px solid ${border};">Departure</th>
             <th style="padding:8px;border:1px solid ${border};">Arrival</th>
           </tr>
         </thead>
         <tbody>
           ${group.segments
             .map(
               (s) => `<tr>
                 <td style="padding:8px;border:1px solid ${border};">${providerLogoHtml(s.logoUrl, `${s.airline} logo`)}${s.airline}${s.flightNumber ? ` ${s.flightNumber}` : ""}${s.operatedBy && s.operatedBy !== s.airline ? `<br/><span style="color:${muted};">Operated by ${s.operatedBy}</span>` : ""}</td>
                 <td style="padding:8px;border:1px solid ${border};">${airportCellHtml(s.depAirport, s.depCity, s.depCountry, s.depTerminal)}</td>
                 <td style="padding:8px;border:1px solid ${border};">${airportCellHtml(s.arrAirport, s.arrCity, s.arrCountry, s.arrTerminal)}</td>
                 <td style="padding:8px;border:1px solid ${border};">${s.depDate}${s.depTime ? ` ${s.depTime}` : ""}</td>
                 <td style="padding:8px;border:1px solid ${border};">${s.arrDate || s.depDate}${s.arrTime ? ` ${s.arrTime}` : ""}</td>
               </tr>`
             )
             .join("")}
         </tbody>
       </table></div>`).join("");
}

function money2(currency: string, amount: number): string {
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function documentStatusHeading(bookingType: BookingType): string {
  switch (bookingType) {
    case "hotel": return "VOUCHER STATUS";
    case "car": return "RENTAL VOUCHER STATUS";
    case "train": return "RAIL TICKET STATUS";
    case "cruise": return "CRUISE DOCUMENT STATUS";
    default: return "E-TICKET STATUS";
  }
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Formats a DATEONLY string (YYYY-MM-DD) or Date without shifting for local timezone. */
function formatDateOnly(value: string | Date, withWeekday = false): string {
  let y: number, m: number, d: number;
  if (typeof value === "string") {
    const [yy, mm, dd] = value.split("-").map(Number);
    y = yy;
    m = mm - 1;
    d = dd;
  } else {
    y = value.getUTCFullYear();
    m = value.getUTCMonth();
    d = value.getUTCDate();
  }
  const dateForWeekday = new Date(Date.UTC(y, m, d));
  const monthDay = `${MONTH_NAMES[m]} ${String(d).padStart(2, "0")}, ${y}`;
  return withWeekday ? `${WEEKDAY_NAMES[dateForWeekday.getUTCDay()]}, ${monthDay}` : monthDay;
}

export interface AuthorizationChargeLine {
  label: string;
  amount: number;
}

export interface AuthorizationSegment {
  airline: string;
  logoUrl?: string | null;
  flightNumber?: string | null;
  operatedBy?: string | null;
  depAirport: string;
  depCity?: string | null;
  depCountry?: string | null;
  depTerminal?: string | null;
  depDate: string;
  depTime?: string | null;
  arrAirport: string;
  arrCity?: string | null;
  arrCountry?: string | null;
  arrTerminal?: string | null;
  arrDate?: string | null;
  arrTime?: string | null;
  cabinClass?: string | null;
  bookingClass?: string | null;
  airlinePnr?: string | null;
}

export interface AuthorizationPassenger {
  name: string;
  paxType: string;
  dob?: string | null;
}

export interface AuthorizationHotelDetail {
  hotelName: string;
  logoUrl?: string | null;
  address: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  guests: number;
  confirmationNo: string;
  hotelRating?: string | null;
  ratePerNight?: string | null;
  taxesAndFees?: string | null;
  specialRequest?: string | null;
}

/** Full hotel details card (name/rating, address, dates, room, confirmation no., rate, taxes, special requests). */
function hotelDetailsHtml(hotel: AuthorizationHotelDetail | null | undefined): string {
  if (!hotel) return "";
  const navy = COMPANY.colors.navy;
  const border = COMPANY.colors.border;
  const muted = COMPANY.colors.muted;
  return `<div style="border:1px solid ${border};border-radius:8px;overflow:hidden;margin:0 0 12px;">
        <div style="background:${navy};color:#ffffff;padding:8px 12px;font-size:11px;letter-spacing:0.04em;">
          ${providerLogoHtml(hotel.logoUrl, `${hotel.hotelName} logo`)}${hotel.hotelName.toUpperCase()}${hotel.hotelRating ? ` &middot; ${hotel.hotelRating}&#9733;` : ""}
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;font-size:12px;">
          <tr>
            <td style="padding:12px;width:34%;vertical-align:top;">
              <div style="color:${muted};font-size:10px;">ADDRESS</div>
              <div style="color:#111827;">${hotel.address}</div>
            </td>
            <td style="padding:12px;width:22%;vertical-align:top;">
              <div style="color:${muted};font-size:10px;">CHECK-IN</div>
              <div style="font-weight:600;font-size:14px;color:#111827;">${formatDateOnly(hotel.checkIn)}</div>
            </td>
            <td style="padding:12px;width:22%;vertical-align:top;">
              <div style="color:${muted};font-size:10px;">CHECK-OUT</div>
              <div style="font-weight:600;font-size:14px;color:#111827;">${formatDateOnly(hotel.checkOut)}</div>
            </td>
            <td style="padding:12px;width:22%;vertical-align:top;">
              <div style="color:${muted};font-size:10px;">ROOM TYPE</div>
              <div style="color:#111827;">${hotel.roomType}</div>
              <div style="color:${muted};font-size:10px;margin-top:4px;">GUESTS</div>
              <div style="color:#111827;">${hotel.guests}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;border-top:1px solid ${border};vertical-align:top;">
              <div style="color:${muted};font-size:10px;">CONFIRMATION NO.</div>
              <div style="color:#111827;">${hotel.confirmationNo}</div>
            </td>
            <td style="padding:12px;border-top:1px solid ${border};vertical-align:top;">
              <div style="color:${muted};font-size:10px;">RATE / NIGHT</div>
              <div style="color:#111827;">${hotel.ratePerNight || "—"}</div>
            </td>
            <td style="padding:12px;border-top:1px solid ${border};vertical-align:top;" colspan="2">
              <div style="color:${muted};font-size:10px;">TAXES &amp; FEES</div>
              <div style="color:#111827;">${hotel.taxesAndFees || "—"}</div>
            </td>
          </tr>
          ${
            hotel.specialRequest
              ? `<tr>
            <td colspan="4" style="padding:12px;border-top:1px solid ${border};vertical-align:top;">
              <div style="color:${muted};font-size:10px;">SPECIAL REQUEST</div>
              <div style="color:#111827;">${hotel.specialRequest}</div>
            </td>
          </tr>`
              : ""
          }
        </table>
      </div>`;
}

export interface AuthorizationCarDetail {
  pickupLocation: string;
  pickupCity?: string | null;
  pickupCountry?: string | null;
  pickupState?: string | null;
  pickupStationType: string;
  pickupStation?: string | null;
  pickupDateTime: Date;
  dropoffLocation: string;
  dropoffCity?: string | null;
  dropoffCountry?: string | null;
  dropoffState?: string | null;
  dropoffStationType: string;
  dropoffStation?: string | null;
  dropoffDateTime: Date;
  pickupMeetingPoint?: string | null;
  meetingPoint?: string | null;
  bookingStatus: string;
  supplier: string;
  logoUrl?: string | null;
  supplierType?: string | null;
  supplierRef: string;
  vehicleCode?: string | null;
  vehicleName?: string | null;
  maxPax?: number | null;
  maxLuggage?: number | null;
  noOfVehicles: number;
  rateRemarks?: string | null;
  specialRequest?: string | null;
}

/**
 * Formats a full timestamp as "Mon, Aug 03, 2026 · 10:30". Unlike formatDateOnly (which reads a
 * DATEONLY column and must not shift), pickup/dropoff are real DATETIME instants parsed from the
 * agent's datetime-local input, so they render back in the same server-local timezone.
 */
function formatDateTimeLocal(value: Date): string {
  const monthDay = `${MONTH_NAMES[value.getMonth()]} ${String(value.getDate()).padStart(2, "0")}, ${value.getFullYear()}`;
  const hh = String(value.getHours()).padStart(2, "0");
  const mm = String(value.getMinutes()).padStart(2, "0");
  return `${WEEKDAY_NAMES[value.getDay()]}, ${monthDay} &middot; ${hh}:${mm}`;
}

/** Billable rental days — any started day counts, so a 26h rental reads as 2 days. */
function rentalDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** A location line as "Location, City, State, Country (Station Type: Station)" so nothing the agent captured is dropped. */
function carLocationHtml(
  location: string,
  city: string | null | undefined,
  state: string | null | undefined,
  country: string | null | undefined,
  stationType: string,
  station: string | null | undefined
): string {
  const muted = COMPANY.colors.muted;
  const place = [location, city, state, country].filter(Boolean).join(", ");
  return `<div style="font-weight:600;font-size:14px;color:#111827;">${place || "—"}</div>
          <div style="color:${muted};font-size:11px;">${stationType}${station ? ` &middot; ${station}` : ""}</div>`;
}

/**
 * Full car rental details card (pickup/dropoff place incl. city & country, station, dates, duration,
 * supplier, vehicle, capacity, meeting point and remarks).
 */
function carDetailsHtml(car: AuthorizationCarDetail | null | undefined): string {
  if (!car) return "";
  const navy = COMPANY.colors.navy;
  const border = COMPANY.colors.border;
  const muted = COMPANY.colors.muted;
  const days = rentalDays(car.pickupDateTime, car.dropoffDateTime);
  const vehicle = [car.vehicleName, car.vehicleCode].filter(Boolean).join(" / ") || "—";

  const extraRow = (label: string, value: string) => `<tr>
            <td colspan="4" style="padding:12px;border-top:1px solid ${border};vertical-align:top;">
              <div style="color:${muted};font-size:10px;">${label}</div>
              <div style="color:#111827;">${value}</div>
            </td>
          </tr>`;

  return `<div style="border:1px solid ${border};border-radius:8px;overflow:hidden;margin:0 0 12px;">
        <div style="background:${navy};color:#ffffff;padding:8px 12px;font-size:11px;letter-spacing:0.04em;">
          ${vehicle.toUpperCase()} &middot; ${car.noOfVehicles} VEHICLE${car.noOfVehicles === 1 ? "" : "S"}${
            days > 0 ? ` &middot; ${days} DAY${days === 1 ? "" : "S"}` : ""
          }
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;font-size:12px;">
          <tr>
            <td style="padding:12px;width:28%;vertical-align:top;">
              <div style="color:${muted};font-size:10px;">PICKUP</div>
              ${carLocationHtml(car.pickupLocation, car.pickupCity, car.pickupState, car.pickupCountry, car.pickupStationType, car.pickupStation)}
            </td>
            <td style="padding:12px;width:22%;vertical-align:top;">
              <div style="color:${muted};font-size:10px;">PICKUP DATE &amp; TIME</div>
              <div style="color:#111827;">${formatDateTimeLocal(car.pickupDateTime)}</div>
            </td>
            <td style="padding:12px;width:28%;vertical-align:top;">
              <div style="color:${muted};font-size:10px;">DROPOFF</div>
              ${carLocationHtml(car.dropoffLocation, car.dropoffCity, car.dropoffState, car.dropoffCountry, car.dropoffStationType, car.dropoffStation)}
            </td>
            <td style="padding:12px;width:22%;vertical-align:top;">
              <div style="color:${muted};font-size:10px;">DROPOFF DATE &amp; TIME</div>
              <div style="color:#111827;">${formatDateTimeLocal(car.dropoffDateTime)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;border-top:1px solid ${border};vertical-align:top;">
              <div style="color:${muted};font-size:10px;">SUPPLIER</div>
              ${providerLogoHtml(car.logoUrl, `${car.supplier} logo`)}
              <div style="color:#111827;">${car.supplier}${car.supplierType ? ` (${car.supplierType})` : ""}</div>
            </td>
            <td style="padding:12px;border-top:1px solid ${border};vertical-align:top;">
              <div style="color:${muted};font-size:10px;">SUPPLIER REF / VOUCHER NO.</div>
              <div style="color:#111827;">${car.supplierRef}</div>
            </td>
            <td style="padding:12px;border-top:1px solid ${border};vertical-align:top;">
              <div style="color:${muted};font-size:10px;">VEHICLE</div>
              <div style="color:#111827;">${vehicle}</div>
              <div style="color:${muted};font-size:10px;margin-top:4px;">PASSENGERS / LUGGAGE</div>
              <div style="color:#111827;">${car.maxPax ?? "—"} / ${car.maxLuggage ?? "—"}</div>
            </td>
            <td style="padding:12px;border-top:1px solid ${border};vertical-align:top;">
              <div style="color:${muted};font-size:10px;">RENTAL STATUS</div>
              <div style="color:#111827;">${car.bookingStatus}</div>
              <div style="color:${muted};font-size:10px;margin-top:4px;">NO. OF VEHICLES</div>
              <div style="color:#111827;">${car.noOfVehicles}</div>
            </td>
          </tr>
          ${car.pickupMeetingPoint ? extraRow("PICKUP MEETING POINT", car.pickupMeetingPoint) : ""}
          ${car.meetingPoint ? extraRow("DROPOFF MEETING POINT", car.meetingPoint) : ""}
          ${car.rateRemarks ? extraRow("RATE REMARKS", car.rateRemarks) : ""}
          ${car.specialRequest ? extraRow("SPECIAL REQUEST", car.specialRequest) : ""}
        </table>
      </div>`;
}

export function ticketAuthorizationEmail(params: {
  customerName: string;
  bookingRef: string;
  bookingType: BookingType;
  currency: string;
  createdAt: Date;
  paymentStatusLabel: string;
  eTicketStatusLabel: string;
  authorizedAmount: number;
  authorizationDate: string;
  charges: AuthorizationChargeLine[];
  refundAmount?: number;
  eSignatureName: string;
  note?: string;
  pnr?: string | null;
  passengers: AuthorizationPassenger[];
  segments?: AuthorizationSegment[];
  tripType?: string | null;
  destination?: string | null;
  hotel?: AuthorizationHotelDetail | null;
  car?: AuthorizationCarDetail | null;
}) {
  const isHotel = params.bookingType === "hotel";
  const isCar = params.bookingType === "car";
  const isTrain = params.bookingType === "train";
  const segments = params.segments ?? [];
  const docNoLabel = isHotel ? "Confirmation No." : isCar ? "Voucher / Supplier Ref" : isTrain ? "Rail Ticket Number" : "E-Ticket Number";
  const travellerHeading = isCar ? "Driver details" : "Traveller details";
  const travellerNameHeading = isCar ? "Driver Name" : "Passenger Name";
  /** What the customer is still waiting on — drives the notice, the closing line and the info cards. */
  const primaryDocLabel = isHotel ? "Hotel Voucher" : isCar ? "Car Rental Voucher" : isTrain ? "Rail Ticket" : "E-Ticket";
  const subject = `Your booking has been initiated - ${params.bookingRef}`;
  const navy = COMPANY.colors.navy;
  const orange = COMPANY.colors.orange;
  const border = COMPANY.colors.border;
  const muted = COMPANY.colors.muted;

  const chargesRows = params.charges
    .map(
      (c, i) => `<tr>
        <td style="padding:4px 0;color:#cbd5e1;">Charge - ${i + 1} (${c.label})</td>
        <td style="padding:4px 0;text-align:right;color:#ffffff;">${money2(params.currency, c.amount)}</td>
      </tr>`
    )
    .join("");
  const refundRow =
    params.refundAmount != null
      ? `<tr>
          <td style="padding:4px 0;color:#cbd5e1;">Refund</td>
          <td style="padding:4px 0;text-align:right;color:#ffffff;">${money2(params.currency, params.refundAmount)}</td>
        </tr>`
      : "";

  const docNoValue = isHotel
    ? params.hotel?.confirmationNo || "—"
    : isCar
    ? params.car?.supplierRef || "—"
    : params.eTicketStatusLabel;

  const passengersTable = params.passengers.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${navy}" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;background:${navy};border-radius:6px;margin:24px 0 8px;">
         <tr><td style="padding:8px 12px;font-size:14px;font-weight:700;color:#ffffff;">${travellerHeading}</td></tr>
       </table>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;font-size:12px;">
         <thead>
           <tr style="background:#f4f5f7;text-align:left;">
             <th style="padding:8px;border:1px solid ${border};">S.No</th>
             <th style="padding:8px;border:1px solid ${border};">${travellerNameHeading}</th>
             <th style="padding:8px;border:1px solid ${border};">Type</th>
             <th style="padding:8px;border:1px solid ${border};">Date of Birth</th>
             <th style="padding:8px;border:1px solid ${border};">${docNoLabel}</th>
           </tr>
         </thead>
         <tbody>
           ${params.passengers
             .map(
               (p, i) => `<tr>
                 <td style="padding:8px;border:1px solid ${border};">${i + 1}</td>
                 <td style="padding:8px;border:1px solid ${border};">${p.name}</td>
                 <td style="padding:8px;border:1px solid ${border};">${(PAX_TYPE_LABEL as Record<string, string>)[p.paxType] || p.paxType}</td>
                 <td style="padding:8px;border:1px solid ${border};">${p.dob ? formatDateOnly(p.dob) : "—"}</td>
                 <td style="padding:8px;border:1px solid ${border};">${docNoValue}</td>
               </tr>`
             )
             .join("")}
         </tbody>
       </table>`
    : "";

  const segmentGroups = isTrain ? [{ key: "rail", label: "Rail journeys", segments }] : groupFlightSegments(segments, params.tripType, params.destination);
  const segmentCards = segmentGroups.map((group) => `<div style="border:1px solid ${border};border-radius:8px;overflow:hidden;margin:0 0 16px;">
      <div style="background:${navy};color:#ffffff;padding:9px 12px;font-size:12px;font-weight:700;text-transform:uppercase;">${group.label} &middot; ${group.segments[0].depAirport} &rarr; ${group.segments[group.segments.length - 1].arrAirport}</div>
      ${group.segments.map((s, i) => {
      const label = isTrain ? `Rail journey ${i + 1}` : `Segment ${i + 1}`;
      return `<div style="${i > 0 ? `border-top:1px solid ${border};` : ""}">
        <div style="background:${navy};color:#ffffff;padding:8px 12px;font-size:11px;letter-spacing:0.04em;">
          ${label.toUpperCase()} &middot; ${formatDateOnly(s.depDate, true)}
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;font-size:12px;">
          <tr>
            <td style="padding:12px;width:26%;vertical-align:top;">
              <div style="color:${muted};font-size:10px;line-height:20px;white-space:nowrap;">${providerLogoHtml(s.logoUrl, `${s.airline} logo`)}<span style="vertical-align:middle;">${s.airline}${s.flightNumber ? ` ${s.flightNumber}` : ""}</span></div>
              ${s.operatedBy && s.operatedBy !== s.airline ? `<div style="color:${muted};font-size:10px;">Operated by ${s.operatedBy}</div>` : ""}
              <div style="color:#111827;">${s.cabinClass || "Economy"}</div>
            </td>
            <td style="padding:12px;width:26%;vertical-align:top;">
              <div style="color:${muted};font-size:10px;">FROM</div>
              <div style="font-weight:600;font-size:14px;color:#111827;">${s.depAirport}${s.depTerminal ? ` (T${s.depTerminal})` : ""}</div>
              <div style="color:#111827;">${[s.depCity, s.depCountry].filter(Boolean).join(", ") || "—"}</div>
              <div style="color:#111827;">${s.depTime || "--"}</div>
            </td>
            <td style="padding:12px;width:22%;vertical-align:top;">
              <div style="color:${muted};font-size:10px;">TO</div>
              <div style="font-weight:600;font-size:14px;color:#111827;">${s.arrAirport}${s.arrTerminal ? ` (T${s.arrTerminal})` : ""}</div>
              <div style="color:#111827;">${[s.arrCity, s.arrCountry].filter(Boolean).join(", ") || "—"}</div>
              <div style="color:#111827;">${s.arrTime || "--"}</div>
            </td>
            <td style="padding:12px;width:26%;vertical-align:top;">
              <div style="color:${muted};font-size:10px;">CLASS</div>
              <div style="color:#111827;">${[s.cabinClass, s.bookingClass].filter(Boolean).join(" / ") || "—"}</div>
              <div style="color:${muted};font-size:10px;margin-top:4px;">PNR</div>
              <div style="color:#111827;">${s.airlinePnr || params.pnr || "—"}</div>
            </td>
          </tr>
        </table>
      </div>`;
    }).join("")}</div>`).join("");

  const priceRows = params.charges
    .map(
      (c) => `<tr>
        <td style="padding:8px;border-bottom:1px solid ${border};">${c.label}</td>
        <td style="padding:8px;border-bottom:1px solid ${border};text-align:right;">${money2(params.currency, c.amount)}</td>
      </tr>`
    )
    .join("");

  const bodyHtml = `
        <!-- Notice -->
        <div style="background:#fff7e6;border:1px solid #fde3b0;border-radius:8px;padding:10px 14px;font-size:12px;color:#92600a;margin-bottom:20px;">
          ${
            params.eTicketStatusLabel === "Issued"
              ? `Your ${primaryDocLabel.toLowerCase()} has been issued and is available with your travel documents.`
              : isHotel || isCar || isTrain
              ? `Your payment details had been submitted. Your ${primaryDocLabel.toLowerCase()} will be emailed once your credit card verification has been completed.`
              : "Your payment has been submitted. Your e-ticket will be emailed within 6&ndash;8 hours once your credit card verification has been completed."
          }
        </div>

        <!-- Charge authorization -->
        <div style="background:${navy};border-radius:10px;padding:20px;color:#ffffff;margin-bottom:20px;">
          <div style="font-size:13px;font-weight:700;letter-spacing:0.02em;margin-bottom:10px;">
            CHARGE AUTHORIZATION &ndash; YOUR ELECTRONIC SIGNATURE COPY
          </div>
          <p style="font-size:12px;line-height:1.6;color:#e5e7eb;margin:0 0 14px;">
            As per our telephonic conversation, I, <strong>${params.customerName}</strong>, agree and authorize ${COMPANY.name}
            to process the below-mentioned charges on their respective payment gateway for
            <strong style="color:${orange};">${money2(params.currency, params.authorizedAmount)}</strong>.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;font-size:11px;margin-bottom:14px;">
            <tr>
              <td style="vertical-align:top;padding-right:16px;width:30%;">
                <div style="color:#94a3b8;">TOTAL AUTHORIZED AMOUNT</div>
                <div style="font-weight:700;font-size:14px;color:${orange};">${money2(params.currency, params.authorizedAmount)}</div>
              </td>
              <td style="vertical-align:top;padding-right:16px;width:25%;">
                <div style="color:#94a3b8;">AUTHORIZATION DATE</div>
                <div style="font-weight:700;">${formatDateOnly(params.authorizationDate)}</div>
              </td>
              <td style="vertical-align:top;width:45%;">
                <div style="color:#94a3b8;">CHARGES DETAILS</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;font-size:11px;margin-top:2px;">
                  ${chargesRows}${refundRow}
                </table>
              </td>
            </tr>
          </table>
          <p style="font-size:11px;line-height:1.5;color:#94a3b8;margin:0 0 14px;">
            This payment authorization is for the amount indicated above and is valid for one-time use only. I certify
            that I, ${params.customerName}, am an authorized user of this card and that I will not dispute the payment
            with my credit/debit card company/bank after I approve the payment.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;font-size:11px;border-top:1px solid #334155;padding-top:10px;">
            <tr>
              <td style="padding-top:10px;width:40%;">
                <div style="color:#94a3b8;">CUSTOMER NAME</div>
                <div style="font-weight:600;">${params.customerName}</div>
              </td>
              <td style="padding-top:10px;width:25%;">
                <div style="color:#94a3b8;">DATE</div>
                <div style="font-weight:600;">${formatDateOnly(params.authorizationDate)}</div>
              </td>
              <td style="padding-top:10px;width:35%;">
                <div style="color:#94a3b8;">E-SIGNATURE</div>
                <div style="font-family:'Brush Script MT',cursive;font-style:italic;font-size:18px;">${params.eSignatureName}</div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Disclaimer -->
        <div style="background:#fff7e6;border:1px solid #fde3b0;border-radius:8px;padding:14px 16px;font-size:11px;color:#78500c;line-height:1.6;margin-bottom:20px;">
          <div style="font-weight:700;margin-bottom:6px;">DISCLAIMER</div>
          <ul style="margin:0;padding-left:18px;">
            <li>${COMPANY.name} is an independent travel management service provider with no direct affiliation to third-party providers. We shall not be associated with or considered as an airline/hotel/car rental/cruise provider or an ally of any of the travel providers or brands.</li>
            <li>&ldquo;${COMPANY.name} (Travel Charges)&rdquo; label is shown on your credit/debit card statements after payment is processed. Sometimes we must split the payment with the airline/car/hotel ticket provider. ${COMPANY.name} and the airline/car/hotel/cruise or another legal entity of service provider or both will appear as recipients on your credit card/debit card statement.</li>
            <li>All the travel management service fee and convenience fee are non-refundable.</li>
          </ul>
        </div>

        <p style="font-size:13px;line-height:1.6;">
          Dear Traveller,<br/><br/>
          Thank you for using ${COMPANY.name} for booking your ${BOOKING_TYPE_LABEL[params.bookingType]}.<br/>
          As per our discussions, we have initiated the process to book your below-mentioned itinerary. Please take a
          moment to review the summary of your booking. Kindly note, this is a confirmation of your booking and not
          your ${primaryDocLabel}.
          ${params.note ? `<br/><br/><span style="border-left:3px solid ${orange};padding-left:12px;color:#374151;display:inline-block;">${params.note}</span>` : ""}
          <br/><br/>Team<br/>${COMPANY.name}
        </p>

        ${passengersTable}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${navy}" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;background:${navy};border-radius:6px;margin:24px 0 8px;">
          <tr><td style="padding:8px 12px;font-size:14px;font-weight:700;color:#ffffff;">${
            isHotel ? "Hotel details" : isCar ? "Car rental details" : isTrain ? "Rail details" : `${BOOKING_TYPE_LABEL[params.bookingType]} details`
          }</td></tr>
        </table>
        ${isHotel ? hotelDetailsHtml(params.hotel) : isCar ? carDetailsHtml(params.car) : segmentCards}

        <h2 style="font-size:14px;margin:24px 0 8px;color:${navy};">Price details (${params.currency})</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;font-size:12px;">
          <thead>
            <tr style="background:${navy};color:#ffffff;text-align:left;">
              <th style="padding:8px;">Description</th>
              <th style="padding:8px;text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${priceRows}
            <tr>
              <td style="padding:8px;border-bottom:1px solid ${border};">Taxes &amp; Fees</td>
              <td style="padding:8px;border-bottom:1px solid ${border};text-align:right;">Included</td>
            </tr>
            <tr>
              <td style="padding:8px;font-weight:700;color:${navy};">Total Amount Authorized</td>
              <td style="padding:8px;font-weight:700;color:${navy};text-align:right;">${money2(params.currency, params.authorizedAmount)}</td>
            </tr>
          </tbody>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ecfdf5" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;margin-top:10px;">
          <tr>
            <td style="padding:10px 14px;font-size:12px;color:#065f46;">Total amount charged</td>
            <td style="padding:10px 14px;font-size:12px;color:#065f46;text-align:right;"><strong>${money2(params.currency, params.authorizedAmount)}</strong></td>
          </tr>
        </table>

        <!-- Important travel info -->
        <h2 style="font-size:14px;margin:28px 0 8px;color:${navy};">Important travel information</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;font-size:11px;color:#374151;">
          ${
            isHotel
              ? `<tr>
            <td style="padding:8px;vertical-align:top;width:25%;"><strong>Voucher</strong><br/>Your hotel confirmation voucher will be emailed once your credit card verification has been completed.</td>
            <td style="padding:8px;vertical-align:top;width:25%;"><strong>Check-in / Check-out</strong><br/>Please carry a valid government-issued photo ID. Standard check-in/check-out times apply as per hotel policy.</td>
            <td style="padding:8px;vertical-align:top;width:25%;"><strong>Hotel policies</strong><br/>Room rates, amenities and cancellation terms are subject to the hotel's own policies.</td>
            <td style="padding:8px;vertical-align:top;width:25%;"><strong>Travel documents</strong><br/>Please ensure a valid passport, required visas and government-issued ID are ready for travel.</td>
          </tr>`
              : isCar
              ? `<tr>
            <td style="padding:8px;vertical-align:top;width:25%;"><strong>Voucher</strong><br/>Your car rental voucher will be emailed once your credit card verification has been completed. Present it at the pickup counter.</td>
            <td style="padding:8px;vertical-align:top;width:25%;"><strong>Driving licence</strong><br/>Every driver must carry a valid driving licence (and an International Driving Permit where required) plus a government-issued photo ID.</td>
            <td style="padding:8px;vertical-align:top;width:25%;"><strong>Security deposit</strong><br/>The rental desk may block a refundable security deposit on the lead driver's credit card at pickup.</td>
            <td style="padding:8px;vertical-align:top;width:25%;"><strong>Fuel, mileage &amp; late return</strong><br/>Fuel policy, mileage limits, additional-driver fees and late-return charges are set by the supplier and payable directly to them.</td>
          </tr>`
              : isTrain
              ? `<tr>
            <td style="padding:8px;vertical-align:top;width:25%;"><strong>Ticketing</strong><br/>Your rail ticket will be emailed once payment and booking verification have been completed.</td>
            <td style="padding:8px;vertical-align:top;width:25%;"><strong>Station arrival</strong><br/>Please arrive at the departure station early and check the operator's boarding guidance.</td>
            <td style="padding:8px;vertical-align:top;width:25%;"><strong>Rail schedule</strong><br/>Train schedules and platforms may change. Please reconfirm them with the rail operator before departure.</td>
            <td style="padding:8px;vertical-align:top;width:25%;"><strong>Travel documents</strong><br/>Please carry your rail ticket and a valid government-issued photo ID.</td>
          </tr>`
              : `<tr>
            <td style="padding:8px;vertical-align:top;width:25%;"><strong>Ticketing</strong><br/>Your e-ticket will be emailed within 6&ndash;8 hours once your credit card verification has been completed.</td>
            <td style="padding:8px;vertical-align:top;width:25%;"><strong>Baggage</strong><br/>Airlines have baggage policies. Additional charges may apply for excess or oversized baggage.</td>
            <td style="padding:8px;vertical-align:top;width:25%;"><strong>Flight schedule</strong><br/>Schedules are subject to change. Please reconfirm with the airline 24 hours before departure.</td>
            <td style="padding:8px;vertical-align:top;width:25%;"><strong>Travel documents</strong><br/>Please ensure a valid passport, required visas and government-issued ID are ready for travel.</td>
          </tr>`
          }
        </table>`;

  const html = emailShell({
    heading: "Your Booking had been Initiated",
    bookingRef: params.bookingRef,
    createdAt: params.createdAt,
    paymentStatusLabel: params.paymentStatusLabel,
    eTicketStatusLabel: params.eTicketStatusLabel,
    documentStatusHeading: documentStatusHeading(params.bookingType),
    bodyHtml,
  });

  return { subject, html };
}

export function paymentLinkEmail(params: {
  bookingType: BookingType;
  customerName: string;
  bookingRef: string;
  amount: number;
  currency: string;
  linkUrl: string;
  createdAt: Date;
  paymentStatusLabel: string;
  eTicketStatusLabel: string;
  segments?: FlightItinerarySegment[];
  tripType?: string | null;
  destination?: string | null;
  hotel?: AuthorizationHotelDetail | null;
  car?: AuthorizationCarDetail | null;
}) {
  const subject = `Payment link for booking ${params.bookingRef}`;
  const bodyHtml = `
    <p style="font-size:13px;line-height:1.6;">Dear ${params.customerName},</p>
    <p style="font-size:13px;line-height:1.6;">Please use the secure link below to complete payment of <strong>${params.currency} ${params.amount.toFixed(2)}</strong> for booking <strong>${params.bookingRef}</strong>:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;margin:8px 0 16px;">
      <tr>
        <td style="background:${COMPANY.colors.navy};border-radius:8px;" bgcolor="${COMPANY.colors.navy}">
          <a href="${params.linkUrl}" style="display:inline-block;padding:10px 20px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;font-family:'Segoe UI',Arial,sans-serif;">Pay Now</a>
        </td>
      </tr>
    </table>
    <p style="font-size:12px;color:${COMPANY.colors.muted};">If the button doesn't work, copy and paste this link into your browser:<br/>${params.linkUrl}</p>
    ${
      params.hotel
        ? `<h2 style="font-size:14px;margin:24px 0 8px;color:${COMPANY.colors.navy};">Hotel details</h2>${hotelDetailsHtml(params.hotel)}`
        : params.car
        ? `<h2 style="font-size:14px;margin:24px 0 8px;color:${COMPANY.colors.navy};">Car rental details</h2>${carDetailsHtml(params.car)}`
        : transportItineraryHtml(params.bookingType, params.segments, params.tripType, params.destination)
    }`;

  const html = emailShell({
    heading: "Payment Email",
    bookingRef: params.bookingRef,
    createdAt: params.createdAt,
    paymentStatusLabel: params.paymentStatusLabel,
    eTicketStatusLabel: params.eTicketStatusLabel,
    documentStatusHeading: documentStatusHeading(params.bookingType),
    bodyHtml,
  });
  return { subject, html };
}

export function primaryDocumentEmail(params: {
  bookingType: BookingType;
  customerName: string;
  bookingRef: string;
  docLabel: string;
  pnr?: string;
  passengers?: Array<{ name: string; paxType: string; dob?: string | null; passportNo?: string | null }>;
  segments?: Array<{
    airline: string;
    logoUrl?: string | null;
    flightNumber?: string | null;
    operatedBy?: string | null;
    depAirport: string;
    depCity?: string | null;
    depCountry?: string | null;
    depDate: string;
    depTime?: string | null;
    depTerminal?: string | null;
    arrAirport: string;
    arrCity?: string | null;
    arrCountry?: string | null;
    arrDate?: string | null;
    arrTime?: string | null;
    arrTerminal?: string | null;
    cabinClass?: string | null;
    bookingClass?: string | null;
    status?: string | null;
  }>;
  tripType?: string | null;
  destination?: string | null;
  hotel?: AuthorizationHotelDetail | null;
  car?: AuthorizationCarDetail | null;
  currency?: string;
  payments?: Array<{
    amountPaid: number;
    paymentMethod?: string | null;
    paidAt?: Date | null;
    transactionId?: string | null;
    gatewayReferenceNumber?: string | null;
  }>;
  createdAt: Date;
  paymentStatusLabel: string;
  eTicketStatusLabel: string;
}) {
  const subject = `Your ${params.docLabel} for booking ${params.bookingRef}`;
  const navy = COMPANY.colors.navy;
  const border = COMPANY.colors.border;

  const hotelSection = params.hotel
    ? `<h2 style="font-size:14px;margin:24px 0 8px;color:${navy};">Hotel details</h2>${hotelDetailsHtml(params.hotel)}`
    : "";

  const carSection = params.car
    ? `<h2 style="font-size:14px;margin:24px 0 8px;color:${navy};">Car rental details</h2>${carDetailsHtml(params.car)}`
    : "";

  const pnrLine = params.pnr
    ? `<p style="margin:0 0 16px;">Booking reference (PNR): <strong>${params.pnr}</strong></p>`
    : "";

  const segmentGroups = params.segments?.length ? (params.bookingType === "train" ? [{ key: "rail", label: "Rail itinerary", segments: params.segments }] : groupFlightSegments(params.segments, params.tripType, params.destination)) : [];
  const segmentsTable = segmentGroups.length
    ? segmentGroups.map((group) => `<div style="border:1px solid ${border};border-radius:8px;overflow:hidden;margin:16px 0;"><div style="background:${navy};color:#ffffff;padding:9px 12px;font-size:12px;font-weight:700;text-transform:uppercase;">${group.label} &middot; ${group.segments[0].depAirport} &rarr; ${group.segments[group.segments.length - 1].arrAirport}</div>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;font-size:12px;">
         <thead>
           <tr style="background:#f4f5f7;text-align:left;">
             <th style="padding:8px;border:1px solid ${border};">${params.bookingType === "train" ? "Operator" : "Flight"}</th>
             <th style="padding:8px;border:1px solid ${border};">From</th>
             <th style="padding:8px;border:1px solid ${border};">To</th>
             <th style="padding:8px;border:1px solid ${border};">Departure</th>
             <th style="padding:8px;border:1px solid ${border};">Arrival</th>
             <th style="padding:8px;border:1px solid ${border};">Class</th>
             <th style="padding:8px;border:1px solid ${border};">Status</th>
           </tr>
         </thead>
         <tbody>
           ${group.segments
             .map(
               (s) => `<tr>
                 <td style="padding:8px;border:1px solid ${border};">${providerLogoHtml(s.logoUrl, `${s.airline} logo`)}${s.airline}${s.flightNumber ? ` ${s.flightNumber}` : ""}${s.operatedBy && s.operatedBy !== s.airline ? `<br/><span style="color:${COMPANY.colors.muted};">Operated by ${s.operatedBy}</span>` : ""}</td>
                 <td style="padding:8px;border:1px solid ${border};">${airportCellHtml(s.depAirport, s.depCity, s.depCountry, s.depTerminal)}</td>
                 <td style="padding:8px;border:1px solid ${border};">${airportCellHtml(s.arrAirport, s.arrCity, s.arrCountry, s.arrTerminal)}</td>
                 <td style="padding:8px;border:1px solid ${border};">${s.depDate}${s.depTime ? ` ${s.depTime}` : ""}</td>
                 <td style="padding:8px;border:1px solid ${border};">${s.arrDate || s.depDate}${s.arrTime ? ` ${s.arrTime}` : ""}</td>
                 <td style="padding:8px;border:1px solid ${border};">${[s.cabinClass, s.bookingClass].filter(Boolean).join(" / ") || "—"}</td>
                 <td style="padding:8px;border:1px solid ${border};">${s.status || "—"}</td>
               </tr>`
             )
             .join("")}
         </tbody>
       </table></div>`).join("")
    : "";

  // Passport numbers are only captured for flights, so hotel/car vouchers drop that column.
  const showPassportColumn = params.bookingType === "flight";
  const travellerHeading = params.hotel ? "Guest details" : params.car ? "Driver details" : "Passenger details";

  const passengersTable = params.passengers?.length
    ? `<h2 style="font-size:14px;margin:24px 0 8px;color:${navy};">${travellerHeading}</h2>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;font-size:12px;">
         <thead>
           <tr style="background:#f4f5f7;text-align:left;">
             <th style="padding:8px;border:1px solid ${border};">Name</th>
             <th style="padding:8px;border:1px solid ${border};">Type</th>
             <th style="padding:8px;border:1px solid ${border};">Date of birth</th>
             ${showPassportColumn ? `<th style="padding:8px;border:1px solid ${border};">Passport No.</th>` : ""}
           </tr>
         </thead>
         <tbody>
           ${params.passengers
             .map(
               (p) => `<tr>
                 <td style="padding:8px;border:1px solid ${border};">${p.name}</td>
                 <td style="padding:8px;border:1px solid ${border};">${(PAX_TYPE_LABEL as Record<string, string>)[p.paxType] || p.paxType}</td>
                 <td style="padding:8px;border:1px solid ${border};">${p.dob || "—"}</td>
                 ${showPassportColumn ? `<td style="padding:8px;border:1px solid ${border};">${p.passportNo || "—"}</td>` : ""}
               </tr>`
             )
             .join("")}
         </tbody>
       </table>`
    : "";

  const currency = params.currency || "";
  const totalPaid = (params.payments || []).reduce((sum, p) => sum + p.amountPaid, 0);
  const paymentDetailsTable = params.payments?.length
    ? `<h2 style="font-size:14px;margin:24px 0 8px;color:${navy};">Payment details</h2>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;font-size:12px;">
         <thead>
           <tr style="background:${navy};color:#ffffff;text-align:left;">
             <th style="padding:8px;">Date</th>
             <th style="padding:8px;">Method</th>
             <th style="padding:8px;">Transaction ID</th>
             <th style="padding:8px;text-align:right;">Amount</th>
           </tr>
         </thead>
         <tbody>
           ${params.payments
             .map(
               (p) => `<tr>
                 <td style="padding:8px;border-bottom:1px solid ${border};">${p.paidAt ? formatDateOnly(p.paidAt) : "—"}</td>
                 <td style="padding:8px;border-bottom:1px solid ${border};">${p.paymentMethod || "—"}</td>
                 <td style="padding:8px;border-bottom:1px solid ${border};">${p.transactionId || p.gatewayReferenceNumber || "—"}</td>
                 <td style="padding:8px;border-bottom:1px solid ${border};text-align:right;">${money2(currency, p.amountPaid)}</td>
               </tr>`
             )
             .join("")}
           <tr>
             <td colspan="3" style="padding:8px;font-weight:700;color:${navy};">Total Paid</td>
             <td style="padding:8px;font-weight:700;color:${navy};text-align:right;">${money2(currency, totalPaid)}</td>
           </tr>
         </tbody>
       </table>`
    : "";

  const bodyHtml = `
    <p style="font-size:13px;line-height:1.6;">Dear ${params.customerName},</p>
    <p style="font-size:13px;line-height:1.6;">Please find your <strong>${params.docLabel.toLowerCase()}</strong> attached for booking <strong>${params.bookingRef}</strong>.</p>
    ${pnrLine}
    ${hotelSection}
    ${carSection}
    ${segmentsTable}
    ${passengersTable}
    ${paymentDetailsTable}
    <p style="font-size:13px;line-height:1.6;margin-top:24px;">Please review the attached document carefully and keep it handy for check-in. Have a wonderful trip!</p>`;

  const html = emailShell({
    heading: "Congratulations! Your booking has been confirmed",
    bookingRef: params.bookingRef,
    createdAt: params.createdAt,
    paymentStatusLabel: params.paymentStatusLabel,
    eTicketStatusLabel: params.eTicketStatusLabel,
    documentStatusHeading: documentStatusHeading(params.bookingType),
    preventContentTrimming: true,
    bodyHtml,
  });
  return { subject, html };
}

export function invoiceEmail(params: {
  bookingType: BookingType;
  customerName: string;
  bookingRef: string;
  invoiceNo: string;
  createdAt: Date;
  paymentStatusLabel: string;
  eTicketStatusLabel: string;
  segments?: FlightItinerarySegment[];
  tripType?: string | null;
  destination?: string | null;
  hotel?: AuthorizationHotelDetail | null;
  car?: AuthorizationCarDetail | null;
}) {
  const subject = `Invoice ${params.invoiceNo} for booking ${params.bookingRef}`;
  const bodyHtml = `
    <p style="font-size:13px;line-height:1.6;">Dear ${params.customerName},</p>
    <p style="font-size:13px;line-height:1.6;">Please find attached invoice <strong>${params.invoiceNo}</strong> for booking <strong>${params.bookingRef}</strong>.</p>
    <p style="font-size:13px;line-height:1.6;">Thank you for booking with ${COMPANY.name}.</p>
    ${
      params.hotel
        ? `<h2 style="font-size:14px;margin:24px 0 8px;color:${COMPANY.colors.navy};">Hotel details</h2>${hotelDetailsHtml(params.hotel)}`
        : params.car
        ? `<h2 style="font-size:14px;margin:24px 0 8px;color:${COMPANY.colors.navy};">Car rental details</h2>${carDetailsHtml(params.car)}`
        : transportItineraryHtml(params.bookingType, params.segments, params.tripType, params.destination)
    }`;

  const html = emailShell({
    heading: "Invoice email",
    bookingRef: params.bookingRef,
    createdAt: params.createdAt,
    paymentStatusLabel: params.paymentStatusLabel,
    eTicketStatusLabel: params.eTicketStatusLabel,
    documentStatusHeading: documentStatusHeading(params.bookingType),
    bodyHtml,
  });
  return { subject, html };
}
