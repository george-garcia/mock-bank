import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

const WEAK_JWT_SECRETS = ['mockbank-secret-key', 'change-me-in-production', 'mockbank-dev-secret-change-in-production'];

function assertSecrets() {
  const secret = process.env.JWT_SECRET;
  const weak = !secret || WEAK_JWT_SECRETS.includes(secret);
  if (weak) {
    const msg = 'JWT_SECRET is unset or a known default value';
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[security] ${msg}. Refusing to start in production.`);
    }
    console.warn(`[security] WARNING: ${msg}. Set a strong JWT_SECRET — this is fatal in production.`);
  }
}

async function bootstrap() {
  assertSecrets();
  // rawBody is needed to verify webhook HMAC signatures over the exact bytes received.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Security headers (HSTS, X-Content-Type-Options, frame/referrer policy, etc.).
  app.use(helmet());

  app.enableCors({
    origin: (origin, callback) => {
      const allowed = [
        process.env.FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:5174',
      ].filter(Boolean);
      if (!origin || allowed.some(url => origin.startsWith(url!))) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`), false);
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Mock Bank API')
    .setDescription('The Mock Bank API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
