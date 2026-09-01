import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/admin/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @Roles('super_admin', 'sales', 'warehouse', 'finance', 'content', 'operator')
  @ApiOperation({ summary: 'List all orders' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'client_id', required: false, type: Number })
  findAll(@Query('status') status?: string, @Query('client_id') clientId?: string) {
    return this.orderService.findAll(status, clientId ? parseInt(clientId, 10) : undefined);
  }

  @Get(':id')
  @Roles('super_admin', 'sales', 'warehouse', 'finance', 'content', 'operator')
  @ApiOperation({ summary: 'View order details' })
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(+id);
  }

  @Patch(':id/approve')
  @Roles('super_admin', 'sales')
  @ApiOperation({ summary: 'Approve an order' })
  approve(@Param('id') id: string) {
    return this.orderService.updateStatus(+id, ['pending'], 'approved');
  }

  @Patch(':id/process')
  @Roles('super_admin', 'warehouse')
  @ApiOperation({ summary: 'Start processing an order' })
  process(@Param('id') id: string) {
    return this.orderService.updateStatus(+id, ['approved'], 'processing');
  }

  @Patch(':id/ship')
  @Roles('super_admin', 'warehouse')
  @ApiOperation({ summary: 'Mark an order as shipped' })
  ship(@Param('id') id: string) {
    return this.orderService.updateStatus(+id, ['processing'], 'shipped');
  }

  @Patch(':id/deliver')
  @Roles('super_admin', 'warehouse')
  @ApiOperation({ summary: 'Mark an order as delivered' })
  deliver(@Param('id') id: string) {
    return this.orderService.updateStatus(+id, ['shipped'], 'delivered');
  }

  @Patch(':id/cancel')
  @Roles('super_admin', 'sales')
  @ApiOperation({ summary: 'Cancel an order and restore stock' })
  cancel(@Param('id') id: string) {
    return this.orderService.cancelOrder(+id);
  }
}
