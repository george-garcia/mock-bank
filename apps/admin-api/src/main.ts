import './env'; // must run before AppModule (which transitively connects to the DB)
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: (origin, callback) => {
      const allowed = [process.env.ADMIN_FRONTEND_URL, 'http://localhost:5174'].filter(Boolean);
      if (!origin || allowed.some((url) => origin.startsWith(url!))) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`), false);
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Mock Bank Admin API')
    .setDescription('Back-office admin API — staff identity, customer/account oversight, audit')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.ADMIN_API_PORT || 4001;
  await app.listen(port);
  console.log(`Admin API running on http://localhost:${port}/api`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
