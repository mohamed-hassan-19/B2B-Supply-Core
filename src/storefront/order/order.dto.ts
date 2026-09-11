import { IsEnum, IsArray, ValidateNested, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  productId!: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 'single', enum: ['single', 'dozen'], required: false })
  @IsOptional()
  @IsEnum(['single', 'dozen'])
  purchase_unit?: 'single' | 'dozen';
}

export class CreateOrderDto {
  @ApiProperty({ example: 'COD', enum: ['COD', 'Credit'] })
  @IsEnum(['COD', 'Credit'])
  paymentMethod!: 'COD' | 'Credit';

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
