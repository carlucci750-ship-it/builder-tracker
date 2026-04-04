import { dateKey } from "./utils";

export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export const EXPENSE_CATEGORIES = [
  "Public Liability Insurance","Van Payment / Finance","Tools & Equipment",
  "Phone / Internet","Accountant Fees","Other",
];
export const CAT_ICONS = {
  "Public Liability Insurance":"🛡️","Van Payment / Finance":"🚐",
  "Tools & Equipment":"🔧","Phone / Internet":"📱","Accountant Fees":"📋","Other":"📦",
};

export const CURRENCIES = {
  GBP: { label: "British Pound (GBP)",      symbol: "£",   locale: "en-GB" },
  EUR: { label: "Euro (EUR)",                symbol: "€",   locale: "de-DE" },
  USD: { label: "US Dollar (USD)",           symbol: "$",   locale: "en-US" },
  AUD: { label: "Australian Dollar (AUD)",   symbol: "A$",  locale: "en-AU" },
  NZD: { label: "New Zealand Dollar (NZD)", symbol: "NZ$", locale: "en-NZ" },
  CAD: { label: "Canadian Dollar (CAD)",     symbol: "CA$", locale: "en-CA" },
};

export const COUNTRIES = {
  GB: { label: "🇬🇧 United Kingdom", currency: "GBP", taxMonthStart: 3 },
  US: { label: "🇺🇸 United States",  currency: "USD", taxMonthStart: 0 },
  AU: { label: "🇦🇺 Australia",       currency: "AUD", taxMonthStart: 6 },
  IE: { label: "🇮🇪 Ireland",         currency: "EUR", taxMonthStart: 0 },
  NZ: { label: "🇳🇿 New Zealand",     currency: "NZD", taxMonthStart: 3 },
  CA: { label: "🇨🇦 Canada",          currency: "CAD", taxMonthStart: 0 },
};

export const JOB_EXPENSE_CATS = ["Materials","Fuel","Tools/Parts","Labour","Other"];
export const JOB_CAT_ICONS = {
  "Materials":"🧱","Fuel":"⛽","Tools/Parts":"🔧","Labour":"👷","Other":"📦",
};

export const defaultSettings = () => ({
  currency: "GBP", country: "GB",
  businessName: "", businessAddress: "", businessPhone: "", businessEmail: "",
  bankName: "", bankAccount: "", bankSortCode: "", vatNumber: "",
  invoiceNextNumber: 1,
});

export const defaultEntry = () => ({
  client:"", job:"", description:"", hours:"", estimated:"", actual:"",
  materials:"", labour:"", miles:"", fuelCost:"",
});

export const defaultScheduleItem = () => ({ client:"", job:"", expectedEarnings:"" });

export const defaultJobForm = () => ({
  client:"", job:"",
  dateFrom: dateKey(new Date()), dateTo: dateKey(new Date()),
  includeSaturday: false, includeSunday: false,
  totalEarnings:"", totalHours:"", hoursMode:"total",
  materials:"", labour:"", fuel:"", fuelMode:"total", notes:"",
});
