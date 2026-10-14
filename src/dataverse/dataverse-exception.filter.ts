import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';

import { DataverseError } from './dataverse-client.service.js';
import { Response } from 'express';

@Catch(DataverseError)
export class DataverseExceptionFilter implements ExceptionFilter {
  catch(err: DataverseError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let parsed: any;
    try { parsed = JSON.parse(err.body); } catch {}
    // pass 429 through so callers can back off; everything else is an upstream failure
    const status = err.status === 429 ? 429 : 502;
    res.status(status).json({
      source: 'dataverse',
      upstreamStatus: err.status,
      code: parsed?.error?.code,
      message: parsed?.error?.message ?? err.body,
    });
  }
}