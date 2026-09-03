import { Controller, Get, Body, Patch, Param, UseGuards, Query, Post, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ClientService } from './client.service';
import { UpdateClientStatusDto, UpdateClientCreditDto } from './client.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery, ApiConsumes } from '@nestjs/swagger';

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
  findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('client_id') client_id?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('export') exp?: string
  ) {
    return this.clientService.findAll({ 
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

  @Patch(':id/priority')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Toggle client priority status' })
  updatePriority(@Param('id') id: string, @Body('is_priority') is_priority: boolean) {
    return this.clientService.updatePriority(+id, is_priority);
  }

  @Post(':id/documents')
  @Roles('super_admin', 'sales')
  @ApiOperation({ summary: 'Upload a client document' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      }
    })
  }))
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.clientService.uploadDocument(+id, file);
  }

  @Delete('documents/:docId')
  @Roles('super_admin', 'sales')
  @ApiOperation({ summary: 'Delete a client document' })
  deleteDocument(@Param('docId') docId: string) {
    return this.clientService.deleteDocument(+docId);
  }

  @Post(':id/remind')
  @Roles('super_admin', 'sales')
  @ApiOperation({ summary: 'Send reorder reminder to client' })
  remindClient(@Param('id') id: string) {
    return this.clientService.remindClient(+id);
  }
}
