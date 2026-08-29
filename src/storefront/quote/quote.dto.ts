import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptQuoteDto {
  @ApiProperty({ example: 'Credit', enum: ['COD', 'Credit'] })
  @IsEnum(['COD', 'Credit'])
  paymentMethod!: 'COD' | 'Credit';
}
