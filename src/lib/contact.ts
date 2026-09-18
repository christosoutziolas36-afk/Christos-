/** Kanäle, über die der Betrieb eine vorbereitete Nachricht selbst verschickt. */

export function toWhatsAppNumber(phone: string | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits.slice(1);
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `49${digits.slice(1)}`;
  return digits;
}

export function gmailComposeUrl(to: string | undefined, subject: string, body: string): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    su: subject,
    body,
  });
  if (to) params.set("to", to);
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function mailtoUrl(to: string | undefined, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${to ?? ""}?${params.toString()}`;
}

export function whatsAppUrl(phone: string | undefined, text: string): string | null {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
