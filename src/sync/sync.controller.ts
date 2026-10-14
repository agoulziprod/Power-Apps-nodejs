import { Controller, Get, Post } from '@nestjs/common';

import { SyncService } from './sync.service.js';

@Controller('sync')
export class SyncController {
  constructor(private sync: SyncService) {}

  @Post('run') run() { return this.sync.run(); }
  @Get('tickets') tickets() { return this.sync.list(); }
}