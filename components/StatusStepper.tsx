import { BOOKING_STATUS_ORDER, BOOKING_STATUS_LABEL, type BookingStatus } from "@/models/Booking";
import { IconCheckCircle } from "@/components/icons";

export function StatusStepper({ status }: { status: BookingStatus }) {
  const currentIndex = BOOKING_STATUS_ORDER.indexOf(status);

  return (
    <ol className="flex flex-wrap gap-2">
      {BOOKING_STATUS_ORDER.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li
            key={step}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
              active
                ? "border-primary bg-primary/10 text-primary"
                : done
                ? "border-success/30 bg-success/10 text-success"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            {done ? <IconCheckCircle className="h-3.5 w-3.5" /> : null}
            {BOOKING_STATUS_LABEL[step]}
          </li>
        );
      })}
    </ol>
  );
}
