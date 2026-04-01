export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatPercent(value: number | null | undefined) {
  return `${((value || 0) * 100).toFixed(0)}%`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function statusTone(status: string | null | undefined) {
  const normalized = (status || "").toUpperCase();
  if (["APPROVED", "ACTIVE", "HEALTHY"].includes(normalized)) return "success";
  if (["VERIFY", "FLAGGED", "AT_RISK"].includes(normalized)) return "warning";
  return "danger";
}

export function scoreTone(score: number | null | undefined) {
  if ((score || 0) >= 80) return "success";
  if ((score || 0) >= 50) return "warning";
  return "danger";
}
