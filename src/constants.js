export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
export const YEAR = new Date().getFullYear();
export const EXPENSE_CATEGORIES = ["Public Liability Insurance","Van Payment / Finance","Tools & Equipment","Phone / Internet","Accountant Fees","Other"];
export const CAT_ICONS = {"Public Liability Insurance":"🛡️","Van Payment / Finance":"🚐","Tools & Equipment":"🔧","Phone / Internet":"📱","Accountant Fees":"📋","Other":"📦"};
export const CURRENCIES = {
  GBP: { label: "British Pound (GBP)", symbol: "£", locale: "en-GB" },
  EUR: { label: "Euro (EUR)", symbol: "€", locale: "de-DE" },
  USD: { label: "US Dollar (USD)", symbol: "$", locale: "en-US" },
};
export const defaultSettings = () => ({ currency: "GBP" });
export const JOB_EXPENSE_CATS = ["Materials","Fuel","Tools/Parts","Labour","Other"];
export const JOB_CAT_ICONS = {"Materials":"🧱","Fuel":"⛽","Tools/Parts":"🔧","Labour":"👷","Other":"📦"};
