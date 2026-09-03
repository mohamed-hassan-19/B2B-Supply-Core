import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/admin/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('durations')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Get order status transition durations' })
  getDurations() {
    return this.reportsService.getDurations();
  }
}
