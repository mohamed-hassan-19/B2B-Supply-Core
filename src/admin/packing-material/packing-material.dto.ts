import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePackingMaterialDto {
  @ApiProperty({ example: 'Medium Cardboard Box' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Boxes' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  stock_quantity: number;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  low_stock_threshold?: number;
}

export class UpdatePackingMaterialDto {
  @ApiProperty({ example: 'Medium Cardboard Box', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Boxes', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: 100, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stock_quantity?: number;

  @ApiProperty({ example: 20, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  low_stock_threshold?: number;
}
