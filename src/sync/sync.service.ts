import { Cron, CronExpression } from '@nestjs/schedule';
import { DataverseClient, DataverseError } from '../dataverse/dataverse-client.service.js';
import { Injectable, Logger } from '@nestjs/common';
import { MirrorTicket, TicketMirrorRepository } from './ticket-mirror.repository.js';

const SELECT =
  'poc_ticketid,poc_ticketnumber,poc_externalref,poc_subject,poc_description,' +
  'poc_status,poc_priority,_poc_customer_value,modifiedon';
const INITIAL_URL = `poc_tickets?$select=${SELECT}`;

const toMirror = (t: any): MirrorTicket => ({
  id: t.poc_ticketid,
  ticketNumber: t.poc_ticketnumber ?? null,
  externalRef: t.poc_externalref ?? null,
  subject: t.poc_subject ?? null,
  description: t.poc_description ?? null,
  status: t.poc_status ?? null,
  priority: t.poc_priority ?? null,
  customerId: t._poc_customer_value ?? null,
  modifiedOn: t.modifiedon ?? null,
});

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private running = false;

  constructor(private dv: DataverseClient, private repo: TicketMirrorRepository) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async scheduled() {
    try { await this.run(); } catch (e) { this.logger.error(`Sync failed: ${e}`); }
  }

  async run() {
    if (this.running) return { skipped: true };
    this.running = true;
    try {
      const link = this.repo.getDeltaLink();
      try {
        return await this.sync(link ?? INITIAL_URL, !link);
      } catch (e) {
        // expired or invalid delta token -> full resync
        if (link && e instanceof DataverseError && [400, 410].includes(e.status)) {
          this.logger.warn('Delta link rejected, doing a full resync');
          this.repo.saveDeltaLink(null);
          return await this.sync(INITIAL_URL, true);
        }
        throw e;
      }
    } finally {
      this.running = false;
    }
  }

  private async sync(url: string, full: boolean) {
    if (full) this.repo.clear();
    let upserts = 0;
    let deletes = 0;

    const newLink = await this.dv.deltaSync(url, (items) => {
      const up: MirrorTicket[] = [];
      const del: string[] = [];
      for (const i of items) {
        if (String(i['@odata.context'] ?? '').endsWith('$deletedEntity')) del.push(i.id);
        else up.push(toMirror(i));
      }
      this.repo.applyBatch(up, del);
      upserts += up.length;
      deletes += del.length;
    });

    // saved only after every page succeeded; a crash means we replay from the old link (idempotent)
    this.repo.saveDeltaLink(newLink);
    this.logger.log(`${full ? 'Full' : 'Delta'} sync: ${upserts} upserted, ${deletes} deleted`);
    return { full, upserts, deletes };
  }

  list() { return this.repo.list(); }
}