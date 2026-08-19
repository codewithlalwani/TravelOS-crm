import path from "node:path";

export const COMPANY = {
  name: "Flyskynine Traveltech LLP",
  shortName: "fsn Traveltech",
  gstin: "03AAIFF1238R2Z7",
  addressLines: ["9/62, Opp Kali Mata Mandir,", "Dalhousie Road,", "Pathankot (Punjab) 145001"],
  logoPath: path.join(process.cwd(), "public", "logo.png"),
  supportPhone: "",
  supportEmail: "support@travelfs9.com",
  supportHours: "Mon-Fri 09:30 AM to 06:30 PM",
  website: "MyFlySky9.com",
  termsUrl: "https://myflysky9.com/terms-and-conditions",
  refundPolicyUrl: "https://myflysky9.com/cancellation-refund-policy",
  colors: {
    navy: "#0d1333",
    orange: "#f5a623",
    muted: "#6b7280",
    border: "#e5e7eb",
  },
};
