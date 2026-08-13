import { Module } from '@nestjs/common';
import { BureauProjetsController, ProjetsController } from './projets.controller';
import { ProjetsService } from './projets.service';

@Module({
  controllers: [BureauProjetsController, ProjetsController],
  providers: [ProjetsService],
  exports: [ProjetsService],
})
export class ProjetsModule {}
