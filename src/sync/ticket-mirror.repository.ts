export interface MirrorTicket {
  id: string;
  ticketNumber: string | null;
  externalRef: string | null;
  subject: string | null;
  description: string | null;
  status: number | null;
  priority: number | null;
  customerId: string | null;
  modifiedOn: string | null;
}

export abstract class TicketMirrorRepository {
  abstract applyBatch(upserts: MirrorTicket[], deletes: string[]): void; // atomic
  abstract clear(): void;
  abstract getDeltaLink(): string | null;
  abstract saveDeltaLink(link: string | null): void;
  abstract list(): MirrorTicket[];
}