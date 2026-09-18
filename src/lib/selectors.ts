import { daysOpen, toISODate } from "./dates";
import type { AppData, Customer, Inquiry, Quote, Task } from "./types";

export function customerOf(data: AppData, id: string): Customer | undefined {
  return data.customers.find((c) => c.id === id);
}

export function customerName(data: AppData, id: string): string {
  return customerOf(data, id)?.name ?? "Unbekannter Kunde";
}

export function inquiryOf(data: AppData, id?: string): Inquiry | undefined {
  return id ? data.inquiries.find((i) => i.id === id) : undefined;
}

export function quotesOfCustomer(data: AppData, customerId: string): Quote[] {
  return data.quotes.filter((q) => q.customerId === customerId);
}

export function inquiriesOfCustomer(data: AppData, customerId: string): Inquiry[] {
  return data.inquiries.filter((i) => i.customerId === customerId);
}

/** Neue Anfragen, die noch niemand angefasst hat. */
export function newInquiries(data: AppData): Inquiry[] {
  return data.inquiries.filter((i) => i.status === "neu");
}

/** Anfragen, aus denen jetzt ein Angebot werden kann. */
export function readyForQuote(data: AppData): Inquiry[] {
  return data.inquiries.filter((i) => i.status === "bereit");
}

/** Anfragen, bei denen eine Rückfrage offen ist. */
export function needsClarification(data: AppData): Inquiry[] {
  return data.inquiries.filter((i) => i.status === "rueckfrage");
}

/** Angebote, die noch fertiggestellt werden müssen. */
export function draftQuotes(data: AppData): Quote[] {
  return data.quotes.filter((q) => q.status === "entwurf" || q.status === "bereit");
}

/** Versendete Angebote ohne Entscheidung. */
export function openQuotes(data: AppData): Quote[] {
  return data.quotes.filter((q) => q.status === "gesendet");
}

/** Follow-ups, die heute (oder überfällig) dran sind. */
export function dueFollowUps(data: AppData, now: Date = new Date()): Quote[] {
  const today = toISODate(now);
  return data.quotes
    .filter((q) => q.status === "gesendet" && q.followUpDate && q.followUpDate <= today)
    .sort((a, b) => (a.followUpDate ?? "").localeCompare(b.followUpDate ?? ""));
}

export function openTasks(data: AppData, now: Date = new Date()): Task[] {
  const today = toISODate(now);
  return data.tasks
    .filter((t) => !t.done && t.dueDate <= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function callbacks(data: AppData, now: Date = new Date()): Task[] {
  return openTasks(data, now).filter((t) => t.kind === "rueckruf");
}

/** Angebote, deren Gültigkeit abgelaufen ist, aber noch "gesendet" stehen. */
export function expiredQuotes(data: AppData, now: Date = new Date()): Quote[] {
  const today = toISODate(now);
  return data.quotes.filter((q) => q.status === "gesendet" && q.validUntil < today);
}

export function quoteAgeInDays(quote: Quote, now: Date = new Date()): number {
  return quote.sentAt ? daysOpen(quote.sentAt, now) : 0;
}

export interface TodayCounts {
  newInquiries: number;
  drafts: number;
  followUps: number;
  callbacks: number;
  tasks: number;
}

export function todayCounts(data: AppData, now: Date = new Date()): TodayCounts {
  return {
    newInquiries: newInquiries(data).length,
    drafts: draftQuotes(data).length,
    followUps: dueFollowUps(data, now).length,
    callbacks: callbacks(data, now).length,
    tasks: openTasks(data, now).filter((t) => t.kind === "aufgabe").length,
  };
}
