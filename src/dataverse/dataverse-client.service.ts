import { Injectable, Logger } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { DataverseAuthService } from './dataverse-auth.service.js';

export class DataverseError extends Error {
  constructor(public status: number, public body: string) {
    super(`Dataverse ${status}: ${body}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const odataString = (v: string) => v.replace(/'/g, "''");
@Injectable()
export class DataverseClient {
  private readonly logger = new Logger(DataverseClient.name);
  private readonly base: string;

  constructor(private auth: DataverseAuthService, config: ConfigService) {
    this.base = `${config.getOrThrow('D365_URL')}/api/data/v9.2`;
  }

  async request<T = any>(
    method: string,
    path: string, // relative to /api/data/v9.2, or an absolute @odata.nextLink
    body?: unknown,
    headers: Record<string, string> = {},
    maxRetries = 5,
  ): Promise<{ status: number; data: T | null }> {
    const url = path.startsWith('http') ? path : `${this.base}/${path}`;
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${await this.auth.getToken()}`,
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if ((res.status === 429 || res.status === 503) && attempt < maxRetries) {
        const retryAfter = Number(res.headers.get('Retry-After'));
        const delay = retryAfter > 0 ? retryAfter * 1000 : Math.min(30_000, 500 * 2 ** attempt);
        this.logger.warn(`${res.status} on ${method} ${path}, retry in ${delay}ms`);
        await sleep(delay);
        continue;
      }
      if (!res.ok) throw new DataverseError(res.status, await res.text());
      const text = await res.text();
      return { status: res.status, data: text ? JSON.parse(text) : null };
    }
  }

  /** Follows @odata.nextLink until exhausted. */
  async *paginate<T = any>(path: string, pageSize = 500): AsyncGenerator<T> {
    let next: string | undefined = path;
    while (next) {
      const { data }: { data: any } = await this.request<any>('GET', next, undefined, {
        Prefer: `odata.maxpagesize=${pageSize}`,
      });
      yield* data.value as T[];
      next = data['@odata.nextLink'];
    }
  }
    /** Walks nextLinks, calls onPage per page, returns the final @odata.deltaLink. */
async deltaSync(url: string, onPage: (items: any[]) => void): Promise<string> {
  let next: string | undefined = url;
  let deltaLink: string | undefined;
  while (next) {
    const { data  } : any = await this.request<any>('GET', next, undefined, {
      Prefer: 'odata.track-changes,odata.maxpagesize=500',
    });
    onPage(data.value);
    next = data['@odata.nextLink'];
    deltaLink = data['@odata.deltaLink'] ?? deltaLink;
  }
  if (!deltaLink) throw new Error('Dataverse returned no @odata.deltaLink');
  return deltaLink;
}
    
}