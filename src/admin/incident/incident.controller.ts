import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { IncidentService } from './incident.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin Incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/admin/incidents')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  @Post()
  @Roles('super_admin', 'warehouse')
  @ApiOperation({ summary: 'Create a new incident' })
  create(@Body() body: any, @Request() req: any) {
    return this.incidentService.createIncident(body, req.user);
  }

  @Get()
  @Roles('super_admin', 'warehouse', 'sales', 'operator')
  @ApiOperation({ summary: 'List incidents' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'order_id', required: false, type: Number })
  findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('client_id') client_id?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('export') exp?: string,
    @Query('type') type?: string
  ) {
    return this.incidentService.findAll({ 
      start_date, 
      end_date, 
      client_id: client_id ? parseInt(client_id, 10) : undefined, 
      status, 
      page: page ? parseInt(page, 10) : undefined, 
      limit: limit ? parseInt(limit, 10) : undefined,
      export: exp,
      
    });
  }

  @Patch(':id')
  @Roles('super_admin', 'warehouse')
  @ApiOperation({ summary: 'Update incident status and resolution' })
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.incidentService.updateIncident(+id, body, req.user);
  }
}
