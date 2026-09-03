import { Controller, Get, Param, Patch, Post, Query, UseGuards, Body, Request } from '@nestjs/common';
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
  findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('client_id') client_id?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('export') exp?: string
  ) {
    return this.orderService.findAll({ 
      start_date, 
      end_date, 
      client_id: client_id ? parseInt(client_id, 10) : undefined, 
      status, 
      page: page ? parseInt(page, 10) : undefined, 
      limit: limit ? parseInt(limit, 10) : undefined,
      export: exp
    });
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
  approve(@Param('id') id: string, @Request() req: any) {
    return this.orderService.updateStatus(+id, ['pending'], 'approved', req.user);
  }

  @Patch(':id/process')
  @Roles('super_admin', 'warehouse')
  @ApiOperation({ summary: 'Start processing an order' })
  process(@Param('id') id: string, @Request() req: any) {
    return this.orderService.updateStatus(+id, ['approved'], 'processing', req.user);
  }

  @Patch(':id/ship')
  @Roles('super_admin', 'warehouse')
  @ApiOperation({ summary: 'Mark an order as shipped' })
  ship(@Param('id') id: string, @Request() req: any) {
    return this.orderService.updateStatus(+id, ['processing'], 'shipped', req.user);
  }

  @Patch(':id/deliver')
  @Roles('super_admin', 'warehouse')
  @ApiOperation({ summary: 'Mark an order as delivered' })
  deliver(@Param('id') id: string, @Request() req: any) {
    return this.orderService.updateStatus(+id, ['shipped'], 'delivered', req.user);
  }

  @Patch(':id/cancel')
  @Roles('super_admin', 'sales')
  @ApiOperation({ summary: 'Cancel an order and restore stock' })
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.orderService.cancelOrder(+id, req.user);
  }

  @Patch(':id/discount')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Apply a discount percentage to an order' })
  applyDiscount(@Param('id') id: string, @Body('discount_percentage') discount_percentage: number, @Request() req: any) {
    return this.orderService.applyDiscount(+id, discount_percentage, req.user);
  }

  @Post(':id/revise')
  @Roles('super_admin', 'sales', 'operator')
  @ApiOperation({ summary: 'Create a revision quote for an existing order' })
  reviseOrder(@Param('id') id: string, @Request() req: any) {
    return this.orderService.reviseOrder(+id, req.user);
  }
}
