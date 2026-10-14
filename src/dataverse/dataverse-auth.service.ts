import { ConfidentialClientApplication } from '@azure/msal-node';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DataverseAuthService {
  private readonly msal: ConfidentialClientApplication;
  private readonly scope: string;

  constructor(config: ConfigService) {
    this.scope = `${config.getOrThrow('D365_URL')}/.default`;
    this.msal = new ConfidentialClientApplication({
      auth: {
        clientId: config.getOrThrow('CLIENT_ID'),
        authority: `https://login.microsoftonline.com/${config.getOrThrow('TENANT_ID')}`,
        clientSecret: config.getOrThrow('CLIENT_SECRET'),
      },
    });
  }

  async getToken(): Promise<string> {
    const res = await this.msal.acquireTokenByClientCredential({ scopes: [this.scope] });
    if (!res?.accessToken) throw new Error('Could not acquire Dataverse token');
    return res.accessToken;
  }
}