import { DataverseClient, odataString } from '../dataverse/dataverse-client.service.js';

import { CreateTicketDto } from './create-ticket.dto.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TicketsService {
  constructor(private dv: DataverseClient) {}

async upsert(dto: CreateTicketDto) {
  const email = odataString(dto.email);
  const ref = odataString(dto.externalRef);

  // path: percent-encode the key value
  await this.dv.request(
    'PATCH',
    `poc_customers(poc_email='${encodeURIComponent(email)}')`,
    { poc_name: dto.name },
  );

  await this.dv.request('PATCH', `poc_tickets(poc_externalref='${encodeURIComponent(ref)}')`, {
    poc_ticketnumber: dto.externalRef,
    poc_subject: dto.subject,
    poc_description: dto.description,
    poc_status: dto.status ?? 0,
    poc_priority: dto.priority ?? 1,
    // body: raw value, NOT percent-encoded
    'poc_Customer@odata.bind': `/poc_customers(poc_email='${email}')`,
  });
  return { externalRef: dto.externalRef };
}
    
    async list() {
  const rows: any[] = [];
  for await (const t of this.dv.paginate(
    'poc_tickets?$select=poc_ticketnumber,poc_externalref,poc_subject,poc_status,poc_priority' +
      '&$expand=poc_Customer($select=poc_email,poc_name)&$orderby=createdon desc',
    50,
  )) {
    rows.push(t);
  }
  return rows;
    }
    
}