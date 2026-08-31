import { Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/admin/invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @Roles('super_admin', 'finance')
  @ApiOperation({ summary: 'List all invoices' })
  findAll() {
    return this.invoiceService.findAll();
  }

  @Post('generate/:orderId')
  @Roles('super_admin', 'finance')
  @ApiOperation({ summary: 'Deprecated. Do not use.' })
  generateInvoice(@Param('orderId') orderId: string) {
    return this.invoiceService.generateInvoice(+orderId);
  }

  @Get(':id/pdf')
  @Roles('super_admin', 'finance')
  @ApiOperation({ summary: 'Get or generate the PDF for an invoice' })
  getPdf(@Param('id') id: string) {
    return this.invoiceService.getPdf(+id);
  }

  @Patch(':id/pay')
  @Roles('super_admin', 'finance')
  @ApiOperation({ summary: 'Mark an invoice as paid' })
  payInvoice(@Param('id') id: string) {
    return this.invoiceService.payInvoice(+id);
  }
}
