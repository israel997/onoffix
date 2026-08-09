import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { BureauxModule } from './bureaux/bureaux.module';
import { ChatModule } from './chat/chat.module';
import { RolesGuard } from './common/guards/roles.guard';
import { OrganisationModule } from './organisation/organisation.module';
import { OrganizerModule } from './organizer/organizer.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { TachesModule } from './taches/taches.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    QueueModule,
    UsersModule,
    BureauxModule,
    OrganisationModule,
    ChatModule,
    OrganizerModule,
    TachesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
