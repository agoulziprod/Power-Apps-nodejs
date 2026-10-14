import { DataverseModule } from '../dataverse/dataverse.module.js';
import { Module } from '@nestjs/common';
import { SqliteTicketMirrorRepository } from './sqlite-ticket-mirror.repository.js';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';
import { TicketMirrorRepository } from './ticket-mirror.repository.js';

@Module({
  imports: [DataverseModule],
  controllers: [SyncController],
  providers: [
    SyncService,
    { provide: TicketMirrorRepository, useClass: SqliteTicketMirrorRepository },
  ],
})
export class SyncModule {}