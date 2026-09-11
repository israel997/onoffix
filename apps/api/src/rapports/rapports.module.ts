import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RapportPdfService } from './rapport-pdf.service';
import { RapportsController } from './rapports.controller';
import { RapportsService } from './rapports.service';

@Module({
  imports: [NotificationsModule],
  controllers: [RapportsController],
  providers: [RapportsService, RapportPdfService],
})
export class RapportsModule {}
