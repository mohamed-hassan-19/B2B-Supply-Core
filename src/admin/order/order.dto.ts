import { IsNumber, Min, IsEnum, IsArray, ValidateNested, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RecordPackingMaterialDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  packing_material_id!: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(1)
  quantity_used!: number;
}

export class ManualOrderItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customItemName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customItemDescription?: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ enum: ['single', 'dozen'] })
  @IsEnum(['single', 'dozen'])
  purchaseUnit!: 'single' | 'dozen';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  unitPrice?: number; // Optional. If it's a catalog item, backend must ignore this and resolve from catalog!

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  discountPercentage?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isCancelled?: boolean;
}

export class CreateManualOrderDto {
  @ApiProperty()
  @IsNumber()
  clientId!: number;

  @ApiProperty({ enum: ['COD', 'Credit'] })
  @IsEnum(['COD', 'Credit'])
  paymentMethod!: 'COD' | 'Credit';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  discountPercentage?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [ManualOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualOrderItemDto)
  items!: ManualOrderItemDto[];
}