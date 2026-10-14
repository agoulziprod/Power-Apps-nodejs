import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTicketDto {
  @IsString() @MinLength(1) externalRef: string;
  @IsEmail() email: string;
  @IsString() name: string;
  @IsString() subject: string;
  @IsString() description: string;
  @IsOptional() @IsIn([0, 1, 2]) status?: number;   // 0 new, 1 in progress, 2 resolved
  @IsOptional() @IsIn([0, 1, 2]) priority?: number; // 0 low, 1 normal, 2 high
}