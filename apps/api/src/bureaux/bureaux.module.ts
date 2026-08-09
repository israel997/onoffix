import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { BureauxController } from './bureaux.controller';
import { BureauxService } from './bureaux.service';

@Module({
  imports: [QueueModule],
  controllers: [BureauxController],
  providers: [BureauxService],
  exports: [BureauxService],
})
export class BureauxModule {}
