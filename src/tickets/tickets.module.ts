import { Module } from '@nestjs/common';
import { DataverseModule } from '../dataverse/dataverse.module.js';
import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';

@Module({
  imports: [DataverseModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
