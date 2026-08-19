"use client";

import { useEffect, useState } from "react";
import { IconPlus, IconX, IconPlane, IconTrain, IconBuilding, IconCar } from "@/components/icons";
import { NewBookingWizard } from "@/app/(app)/bookings/new/NewBookingWizard";
import { RailBookingPanel } from "@/app/(app)/bookings/new/rail/RailBookingPanel";
import { NewHotelBookingWizard } from "@/app/(app)/bookings/new/NewHotelBookingWizard";
import { NewCarBookingWizard, type CarBookingFormState } from "@/app/(app)/bookings/new/NewCarBookingWizard";

type BookingType = "flight" | "rail" | "hotel" | "car";

function TabButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 border-b-2 px-4 pb-3 pt-1 text-sm font-medium transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

interface NewBookingModalProps {
  canFlights: boolean;
  canRail: boolean;
  canHotels: boolean;
  canCars: boolean;
  flightAction: (formData: FormData) => void;
  railAction: (formData: FormData) => void;
  hotelAction: (formData: FormData) => void;
  carAction: (prevState: CarBookingFormState, formData: FormData) => Promise<CarBookingFormState>;
}

export function NewBookingModal({
  canFlights,
  canRail,
  canHotels,
  canCars,
  flightAction,
  railAction,
  hotelAction,
  carAction,
}: NewBookingModalProps) {
  const firstTab: BookingType = canFlights ? "flight" : canRail ? "rail" : canHotels ? "hotel" : "car";
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BookingType>(firstTab);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (!canFlights && !canRail && !canHotels && !canCars) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
      >
        <IconPlus className="h-4 w-4" />
        New Booking
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="mx-auto min-h-full w-full max-w-[1400px] px-4 py-8">
            <div className="rounded-2xl border border-border bg-background shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h2 className="font-heading text-xl font-semibold text-foreground">New Booking</h2>
                  <p className="text-sm text-muted-foreground">
                    Select a booking type and complete the wizard to create a new booking.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <IconX className="h-5 w-5" />
                </button>
              </div>

              {/* Booking-type tabs */}
              <div className="flex flex-wrap gap-0 border-b border-border px-6">
                {canFlights && (
                  <TabButton
                    icon={<IconPlane className="h-4 w-4" />}
                    label="Flight"
                    active={activeTab === "flight"}
                    onClick={() => setActiveTab("flight")}
                  />
                )}
                {canRail && (
                  <TabButton
                    icon={<IconTrain className="h-4 w-4" />}
                    label="Rail"
                    active={activeTab === "rail"}
                    onClick={() => setActiveTab("rail")}
                  />
                )}
                {canHotels && (
                  <TabButton
                    icon={<IconBuilding className="h-4 w-4" />}
                    label="Hotel"
                    active={activeTab === "hotel"}
                    onClick={() => setActiveTab("hotel")}
                  />
                )}
                {canCars && (
                  <TabButton
                    icon={<IconCar className="h-4 w-4" />}
                    label="Car"
                    active={activeTab === "car"}
                    onClick={() => setActiveTab("car")}
                  />
                )}
              </div>

              {/* Wizard — unmounts on tab switch to reset internal state */}
              <div className="px-6 pb-8">
                {activeTab === "flight" && canFlights && (
                  <NewBookingWizard action={flightAction} />
                )}
                {activeTab === "rail" && canRail && (
                  <RailBookingPanel action={railAction} />
                )}
                {activeTab === "hotel" && canHotels && (
                  <NewHotelBookingWizard action={hotelAction} />
                )}
                {activeTab === "car" && canCars && (
                  <NewCarBookingWizard action={carAction} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
