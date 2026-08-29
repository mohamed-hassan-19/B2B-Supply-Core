import { Controller, Get, Param, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { CreateQuoteDto } from './quote.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/admin/quotes')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Get()
  @Roles('super_admin', 'sales')
  @ApiOperation({ summary: 'List all quotes' })
  findAll() {
    return this.quoteService.findAll();
  }

  @Post()
  @Roles('super_admin', 'sales')
  @ApiOperation({ summary: 'Draft a new quote' })
  create(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quoteService.createQuote(createQuoteDto.clientId, createQuoteDto.items);
  }

  @Patch(':id/send')
  @Roles('super_admin', 'sales')
  @ApiOperation({ summary: 'Send quote to client' })
  send(@Param('id') id: string) {
    return this.quoteService.sendQuote(+id);
  }
}
