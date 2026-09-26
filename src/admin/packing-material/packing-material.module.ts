import { Module } from '@nestjs/common';
import { PackingMaterialController } from './packing-material.controller';
import { PackingMaterialService } from './packing-material.service';

@Module({
  controllers: [PackingMaterialController],
  providers: [PackingMaterialService],
  exports: [PackingMaterialService],
})
export class PackingMaterialModule {}
