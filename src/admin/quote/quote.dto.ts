import { IsNumber, IsArray, ValidateNested, Min, IsOptional, IsDateString, IsEnum } from 'class-validator';
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

  @ApiProperty({ example: 'single', enum: ['single', 'dozen'], required: false })
  @IsOptional()
  @IsEnum(['single', 'dozen'])
  purchase_unit?: 'single' | 'dozen';

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_percentage?: number;
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

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_percentage?: number;
}

export class UpdateQuoteDto {
  @ApiProperty({ type: [CreateQuoteItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteItemDto)
  items?: CreateQuoteItemDto[];

  @ApiProperty({ example: 10.5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_percentage?: number;

  @ApiProperty({ example: '2026-12-31T23:59:59Z', required: false })
  @IsOptional()
  @IsDateString()
  valid_until?: string;
}
