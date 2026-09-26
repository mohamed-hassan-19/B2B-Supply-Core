import { IsOptional, IsNumber, IsString, IsDateString, Min, ValidateIf, IsNotEmpty } from 'class-validator';

export class CreatePurchaseDto {
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ValidateIf(o => !o.productId)
  @IsNotEmpty({ message: 'productName is required when creating a new product' })
  @IsString()
  productName?: string;

  @ValidateIf(o => !o.productId)
  @IsNotEmpty({ message: 'categoryId is required when creating a new product' })
  @IsNumber({}, { message: 'categoryId must be a valid number' })
  categoryId?: number;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsNumber()
  @Min(1)
  quantityPurchased: number;

  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsDateString()
  purchaseDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
