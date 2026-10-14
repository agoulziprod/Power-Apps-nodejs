import { AppModule } from './app.module.js';
import { DataverseExceptionFilter } from './dataverse/dataverse-exception.filter.js';
import { NestFactory } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new DataverseExceptionFilter());
  await app.listen(process.env.PORT ?? 3333);
}
await bootstrap();
