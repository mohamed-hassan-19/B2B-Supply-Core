import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { AdminUserService } from './admin-user.service';
import { CreateAdminUserDto } from './admin-user.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Admin Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/admin/users')
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Post()
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create a new admin user' })
  @ApiResponse({ status: 201, description: 'Admin user created.' })
  create(@Body() createAdminUserDto: CreateAdminUserDto) {
    return this.adminUserService.create(createAdminUserDto);
  }

  @Get()
  @Roles('super_admin')
  @ApiOperation({ summary: 'List all admin users' })
  findAll() {
    return this.adminUserService.findAll();
  }

  @Patch(':id/deactivate')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Deactivate an admin user' })
  deactivate(@Param('id') id: string, @Request() req: any) {
    return this.adminUserService.deactivate(+id, req.user.id);
  }

  @Patch(':id/activate')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Reactivate an admin user' })
  reactivate(@Param('id') id: string) {
    return this.adminUserService.reactivate(+id);
  }
}
