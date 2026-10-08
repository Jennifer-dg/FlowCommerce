import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { parseCorsOrigins } from './common/config/cors';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap(): Promise<void> {
  // rawBody es obligatorio para verificar X-Hub-Signature-256 de WhatsApp:
  // la firma se calcula sobre el buffer original, no sobre el JSON parseado.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api');

  // CORS con credenciales: el frontend vive en otro origen y la sesión viaja en
  // una cookie httpOnly, así que el navegador solo la envía si el origen está
  // en esta lista y la respuesta lleva Access-Control-Allow-Credentials.
  const corsOrigins = parseCorsOrigins(
    process.env.CORS_ORIGINS,
    process.env.APP_URL,
  );
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Flowcommerce API')
    .setDescription('Backend API for Flowcommerce')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
