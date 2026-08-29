import { IsString, IsEmail, MinLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  SALES = 'sales',
  WAREHOUSE = 'warehouse',
  FINANCE = 'finance',
}

export class CreateAdminUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: AdminRole, example: 'sales' })
  @IsEnum(AdminRole)
  role!: AdminRole;
}
