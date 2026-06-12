import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../src/users/users.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  const mockUsersService = {
    findById: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('test-jwt-token'),
    verify: jest.fn().mockReturnValue({ sub: 1, email: 'test@example.com' }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(mockAuthService)
      .overrideProvider(UsersService)
      .useValue(mockUsersService)
      .overrideProvider(JwtService)
      .useValue(mockJwtService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('/api/auth', () => {
    it('POST /api/auth/register - should register a new user', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        token: 'test-jwt-token',
      };
      mockAuthService.register.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      expect(response.body).toEqual(mockUser);
      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });
    });

    it('POST /api/auth/login - should login a user', async () => {
      const mockLoginResponse = {
        token: 'test-jwt-token',
        user: { id: 1, email: 'test@example.com' },
      };
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toEqual(mockLoginResponse);
    });

    it('POST /api/auth/register - should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('/api/accounts', () => {
    it('GET /api/accounts - should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/accounts')
        .expect(401);
    });
  });
});
