import { Controller, Query, Get, Post, Body, Patch, Param, Delete, UseGuards, Put, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto, UpdateStockDto, ImageUploadDto } from './product.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { BadRequestException } from '@nestjs/common';

const multerImageOptions = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
  }),
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Only image files (jpg, jpeg, png, webp) are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
};

@ApiTags('Admin Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/admin/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @Roles('super_admin', 'content')
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created.' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('file', multerImageOptions))
  create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    if (file) {
      if (!createProductDto.images) {
        createProductDto.images = [];
      }
      createProductDto.images.push(`/uploads/${file.filename}`);
    }
    return this.productService.create(createProductDto);
  }

  @Get()
  @Roles('super_admin', 'sales', 'warehouse', 'finance', 'content', 'operator')
  @ApiOperation({ summary: 'List all products (including inactive)' })
  findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('client_id') client_id?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('export') exp?: string
  ) {
    return this.productService.findAll({ 
      start_date, 
      end_date, 
      client_id: client_id ? parseInt(client_id, 10) : undefined, 
      page: page ? parseInt(page, 10) : undefined, 
      limit: limit ? parseInt(limit, 10) : undefined,
      export: exp
    });
  }

  @Get(':id')
  @Roles('super_admin', 'sales', 'warehouse', 'finance', 'content', 'operator')
  @ApiOperation({ summary: 'Get product by ID' })
  findOne(@Param('id') id: string) {
    return this.productService.findOne(+id);
  }

  @Put(':id')
  @Roles('super_admin', 'content')
  @ApiOperation({ summary: 'Update product details (excluding stock)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('file', multerImageOptions))
  update(
    @Param('id') id: string, 
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    if (file) {
      if (!updateProductDto.images) {
        updateProductDto.images = [];
      }
      updateProductDto.images.push(`/uploads/${file.filename}`);
    }
    return this.productService.update(+id, updateProductDto);
  }

  @Patch(':id/stock')
  @Roles('super_admin', 'warehouse', 'content')
  @ApiOperation({ summary: 'Update product stock level' })
  updateStock(@Param('id') id: string, @Body() updateStockDto: UpdateStockDto) {
    return this.productService.updateStock(+id, updateStockDto);
  }

  @Delete(':id')
  @Roles('super_admin', 'content')
  @ApiOperation({ summary: 'Soft delete a product' })
  remove(@Param('id') id: string) {
    return this.productService.remove(+id);
  }

  @Patch(':id/activate')
  @Roles('super_admin', 'content')
  @ApiOperation({ summary: 'Reactivate a soft-deleted product' })
  activate(@Param('id') id: string) {
    return this.productService.activate(+id);
  }

  @Post('upload-image')
  @Roles('super_admin', 'content')
  @ApiOperation({ summary: 'Upload a product image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', multerImageOptions))
  uploadImage(
    @Body() body: ImageUploadDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    return {
      url: `/uploads/${file.filename}`
    };
  }
}
