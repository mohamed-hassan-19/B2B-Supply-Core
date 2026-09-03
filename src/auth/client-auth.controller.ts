import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';

import { IsString, IsEmail, IsOptional } from 'class-validator';

export class ClientLoginDto {
  @ApiProperty({ example: 'client@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password!: string;
}

export class ClientRegisterDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  company_name!: string;

  @ApiProperty({ example: 'client@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password!: string;

  @ApiProperty({ example: 'CR123456', required: true })
  @IsString()
  commercial_registration!: string;

  @ApiProperty({ example: 'TAX987654', required: true })
  @IsString()
  tax_registration!: string;

  @ApiProperty({ example: 'John Doe', required: true })
  @IsString()
  contact_name!: string;

  @ApiProperty({ example: '+1234567890', required: true })
  @IsString()
  contact_phone!: string;
}

@ApiTags('Client Auth')
@Controller('api/client/auth')
export class ClientAuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new Company (Client)' })
  @ApiResponse({ status: 201, description: 'Successfully registered, pending approval' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() body: ClientRegisterDto) {
    return this.authService.registerClient(body);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login as a Client' })
  @ApiResponse({ status: 200, description: 'Successful login returns a JWT' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() body: ClientLoginDto) {
    const client = await this.authService.validateClient(body.email, body.password);
    if (!client) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.loginClient(client);
  }
}
