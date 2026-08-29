import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { StorefrontInvoiceService } from './invoice.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Storefront Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/storefront/invoices')
export class StorefrontInvoiceController {
  constructor(private readonly invoiceService: StorefrontInvoiceService) {}

  @Get()
  @ApiOperation({ summary: 'List client invoices' })
  @ApiResponse({ status: 200, description: 'List of invoices' })
  findAll(@Request() req: any) {
    return this.invoiceService.findAllForClient(req.user.id);
  }
}
