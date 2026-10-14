import { DataverseAuthService } from './dataverse-auth.service.js';
import { DataverseClient } from './dataverse-client.service.js';
import { Module } from '@nestjs/common';

@Module({
  providers: [DataverseAuthService, DataverseClient],
  exports: [DataverseClient],
})
export class DataverseModule {}