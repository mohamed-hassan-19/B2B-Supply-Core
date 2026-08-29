import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateClientStatusDto {
  @ApiProperty({ example: 'approved', enum: ['pending', 'approved', 'rejected'] })
  @IsEnum(['pending', 'approved', 'rejected'])
  status!: 'pending' | 'approved' | 'rejected';
}

export class UpdateClientCreditDto {
  @ApiProperty({ example: 10000.00, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  credit_limit?: number;

  @ApiProperty({ example: 30, description: 'Credit terms in days', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  credit_terms?: number;
}
