import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './order.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Storefront Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/storefront/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Place a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., insufficient stock)' })
  @ApiResponse({ status: 403, description: 'Forbidden (e.g., unapproved client)' })
  create(@Request() req: any, @Body() createOrderDto: CreateOrderDto) {
    return this.orderService.createOrder(req.user.id, createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'List client orders' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  findAll(@Request() req: any) {
    return this.orderService.findAllForClient(req.user.id);
  }
}
