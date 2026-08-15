import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { BureauProjetsController, ProjetsController } from './projets.controller';
import { ProjetsService } from './projets.service';

@Module({
  imports: [AiModule],
  controllers: [BureauProjetsController, ProjetsController],
  providers: [ProjetsService],
  exports: [ProjetsService],
})
export class ProjetsModule {}
