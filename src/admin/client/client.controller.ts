import { Controller, Get, Body, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { ClientService } from './client.service';
import { UpdateClientStatusDto, UpdateClientCreditDto } from './client.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/admin/clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  @Roles('super_admin', 'sales', 'warehouse', 'finance', 'content', 'operator')
  @ApiOperation({ summary: 'List clients' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected'] })
  findAll(@Query('status') status?: string) {
    return this.clientService.findAll(status);
  }

  @Get(':id')
  @Roles('super_admin', 'sales', 'warehouse', 'finance', 'content', 'operator')
  @ApiOperation({ summary: 'Get client details by ID' })
  findOne(@Param('id') id: string) {
    return this.clientService.findOne(+id);
  }

  @Patch(':id/status')
  @Roles('super_admin', 'sales')
  @ApiOperation({ summary: 'Approve or reject a client' })
  updateStatus(@Param('id') id: string, @Body() updateClientStatusDto: UpdateClientStatusDto) {
    return this.clientService.updateStatus(+id, updateClientStatusDto);
  }

  @Patch(':id/credit')
  @Roles('super_admin', 'finance')
  @ApiOperation({ summary: 'Assign credit limit and terms' })
  updateCredit(@Param('id') id: string, @Body() updateClientCreditDto: UpdateClientCreditDto) {
    return this.clientService.updateCredit(+id, updateClientCreditDto);
  }
}
