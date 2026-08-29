import { IsString, IsNumber, IsOptional, IsArray, IsPositive, Min, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@ValidatorConstraint({ name: 'isGreaterThan', async: false })
export class IsGreaterThanConstraint implements ValidatorConstraintInterface {
  validate(propertyValue: number, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    if (propertyValue === undefined || propertyValue === null) return true;
    if (relatedValue === undefined || relatedValue === null) return true;
    return typeof propertyValue === 'number' && typeof relatedValue === 'number' && propertyValue > relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} must be strictly greater than ${relatedPropertyName}`;
  }
}

export class CreateProductDto {
  @ApiProperty({ example: 'Industrial Valve' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'High-pressure industrial valve', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Valves', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: ['http://example.com/image.jpg'], required: false })
  @IsOptional()
  images?: string[];

  @ApiProperty({ type: 'string', format: 'binary', required: false, description: 'Optional image upload' })
  @IsOptional()
  file?: any;

  @ApiProperty({ example: 250.50 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price!: number;

  @ApiProperty({ example: 300.00, required: false })
  @IsOptional()
  @IsNumber()
  @Validate(IsGreaterThanConstraint, ['price'])
  @Type(() => Number)
  original_price?: number;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock_level?: number;
}

export class UpdateProductDto {
  @ApiProperty({ example: 'Industrial Valve V2', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Updated description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Valves', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: ['http://example.com/image2.jpg'], required: false })
  @IsOptional()
  images?: string[];

  @ApiProperty({ type: 'string', format: 'binary', required: false, description: 'Optional image upload' })
  @IsOptional()
  file?: any;

  @ApiProperty({ example: 299.99, required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price?: number;

  @ApiProperty({ example: 350.00, required: false })
  @IsOptional()
  @IsNumber()
  @Validate(IsGreaterThanConstraint, ['price'])
  @Type(() => Number)
  original_price?: number;
}

export class UpdateStockDto {
  @ApiProperty({ example: 150 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock_level!: number;
}

export class ImageUploadDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}
