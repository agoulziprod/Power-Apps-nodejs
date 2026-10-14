import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { MirrorTicket, TicketMirrorRepository } from './ticket-mirror.repository.js';

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';

@Injectable()
export class SqliteTicketMirrorRepository extends TicketMirrorRepository implements OnModuleDestroy {
  private db: DatabaseSync;

  constructor() {
    super();
    mkdirSync('data', { recursive: true });
    this.db = new DatabaseSync('data/mirror.db');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tickets_mirror (
        id TEXT PRIMARY KEY, ticket_number TEXT, external_ref TEXT, subject TEXT,
        description TEXT, status INTEGER, priority INTEGER, customer_id TEXT,
        modified_on TEXT, synced_at TEXT
      );
      CREATE TABLE IF NOT EXISTS sync_state (name TEXT PRIMARY KEY, delta_link TEXT);
    `);
  }

  applyBatch(upserts: MirrorTicket[], deletes: string[]) {
    const up = this.db.prepare(`
      INSERT INTO tickets_mirror (id, ticket_number, external_ref, subject, description,
        status, priority, customer_id, modified_on, synced_at)
      VALUES (?,?,?,?,?,?,?,?,?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        ticket_number=excluded.ticket_number, external_ref=excluded.external_ref,
        subject=excluded.subject, description=excluded.description, status=excluded.status,
        priority=excluded.priority, customer_id=excluded.customer_id,
        modified_on=excluded.modified_on, synced_at=excluded.synced_at`);
    const del = this.db.prepare('DELETE FROM tickets_mirror WHERE id = ?');

    this.db.exec('BEGIN');
    try {
      for (const r of upserts) {
        up.run(r.id, r.ticketNumber, r.externalRef, r.subject, r.description,
          r.status, r.priority, r.customerId, r.modifiedOn);
      }
      for (const id of deletes) del.run(id);
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  clear() { this.db.exec('DELETE FROM tickets_mirror'); }

  getDeltaLink() {
    const row = this.db.prepare(`SELECT delta_link FROM sync_state WHERE name='tickets'`).get() as any;
    return row?.delta_link ?? null;
  }

  saveDeltaLink(link: string | null) {
    this.db.prepare(
      `INSERT INTO sync_state (name, delta_link) VALUES ('tickets', ?)
       ON CONFLICT(name) DO UPDATE SET delta_link = excluded.delta_link`,
    ).run(link);
  }

  list() {
    return this.db.prepare(
      `SELECT id, ticket_number AS ticketNumber, external_ref AS externalRef, subject, description,
              status, priority, customer_id AS customerId, modified_on AS modifiedOn
       FROM tickets_mirror ORDER BY modified_on DESC`,
    ).all() as unknown as MirrorTicket[];
  }

  onModuleDestroy() { this.db.close(); }
}