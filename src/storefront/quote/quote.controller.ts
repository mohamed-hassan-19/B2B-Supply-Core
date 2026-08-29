import { Controller, Get, Param, Post, Body, UseGuards, Request } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { AcceptQuoteDto } from './quote.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Storefront Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/storefront/quotes')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Get()
  @ApiOperation({ summary: 'List your active quotes' })
  findAll(@Request() req: any) {
    return this.quoteService.findAll(req.user.id);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept a quote and convert to Order' })
  accept(@Request() req: any, @Param('id') id: string, @Body() acceptQuoteDto: AcceptQuoteDto) {
    return this.quoteService.acceptQuote(req.user.id, +id, acceptQuoteDto.paymentMethod);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a quote' })
  reject(@Request() req: any, @Param('id') id: string) {
    return this.quoteService.rejectQuote(req.user.id, +id);
  }
}
