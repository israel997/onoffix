import { Module } from '@nestjs/common';
import { TachesController } from './taches.controller';
import { TachesService } from './taches.service';

@Module({
  controllers: [TachesController],
  providers: [TachesService],
})
export class TachesModule {}
