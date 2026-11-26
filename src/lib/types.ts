export type Business = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  phone: string | null;
  address: string | null;
  timezone: string;
  slot_interval_min: number;
  min_notice_min: number;
  booking_horizon_days: number;
  reminder_hours: number;
  send_confirmation: boolean;
  plan: "trial" | "solo" | "team";
  trial_ends_at: string;
};

export type Service = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  duration_min: number;
  price_cents: number | null;
  active: boolean;
  sort: number;
};

export type Staff = { id: string; business_id: string; name: string; active: boolean; sort: number };

export type AppointmentStatus = "booked" | "confirmed" | "cancelled" | "no_show" | "completed";

export type Appointment = {
  id: string;
  business_id: string;
  staff_id: string;
  service_id: string | null;
  customer_id: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  source: "online" | "manual";
  note: string | null;
  manage_token: string;
  reminder_sent_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
};

export type Customer = { id: string; name: string; phone: string | null };

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  booked: "Gebucht",
  confirmed: "Bestätigt",
  cancelled: "Abgesagt",
  no_show: "Nicht erschienen",
  completed: "Erledigt",
};
