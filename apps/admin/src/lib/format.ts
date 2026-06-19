/** Format a decimal money string ("5000.00") as "$5,000.00". */
export function formatCurrency(decimal: string | number): string {
  const n = typeof decimal === 'string' ? Number(decimal) : decimal;
  if (Number.isNaN(n)) return String(decimal);
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/** Format an ISO timestamp as a short, readable date-time. */
export function formatDateTime(iso: string | Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Format an ISO timestamp as a short date. */
export function formatDate(iso: string | Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
