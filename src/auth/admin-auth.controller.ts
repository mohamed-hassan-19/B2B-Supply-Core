import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';

import { IsString, IsEmail } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password!: string;
}

@ApiTags('Admin Auth')
@Controller('api/admin/auth')
export class AdminAuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login as an Admin' })
  @ApiResponse({ status: 200, description: 'Successful login returns a JWT' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() body: AdminLoginDto) {
    const user = await this.authService.validateAdmin(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.loginAdmin(user);
  }
}
