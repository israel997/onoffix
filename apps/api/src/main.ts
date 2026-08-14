import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

function corsOrigins(): boolean | string[] {
  // ALLOWED_ORIGINS: liste séparée par des virgules (ex. plusieurs domaines pendant
  // une transition de nom de domaine). Repli sur FRONTEND_URL seul, puis tout accepter.
  const raw = process.env.ALLOWED_ORIGINS ?? process.env.FRONTEND_URL;
  if (!raw) return true;
  return raw.split(',').map((origin) => origin.trim());
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({ origin: corsOrigins() });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
