
import { Body, Controller, Get, Post } from '@nestjs/common'; 
import { TicketsService } from './tickets.service.js';
import { CreateTicketDto } from './create-ticket.dto.js';

@Controller('tickets')
export class TicketsController {
  constructor(private tickets: TicketsService) {}

  @Post()
  create(@Body() dto: CreateTicketDto) {
    return this.tickets.upsert(dto);
  }
    
    @Get()
list() {
  return this.tickets.list();
}
}