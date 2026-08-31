import { IsNumber, IsArray, ValidateNested, Min, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuoteItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  productId!: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 45.00 })
  @IsNumber()
  @Min(0)
  quotedPrice!: number;
}

export class CreateQuoteDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  clientId!: number;

  @ApiProperty({ type: [CreateQuoteItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteItemDto)
  items!: CreateQuoteItemDto[];

  @ApiProperty({ example: '2026-12-31T23:59:59Z', required: false })
  @IsOptional()
  @IsDateString()
  valid_until?: string;
}
