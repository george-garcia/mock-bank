"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const request = require("supertest");
const app_module_1 = require("../../src/app.module");
const auth_service_1 = require("../../src/auth/auth.service");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("../../src/users/users.service");
describe('AppController (e2e)', () => {
    let app;
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
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        })
            .overrideProvider(auth_service_1.AuthService)
            .useValue(mockAuthService)
            .overrideProvider(users_service_1.UsersService)
            .useValue(mockUsersService)
            .overrideProvider(jwt_1.JwtService)
            .useValue(mockJwtService)
            .compile();
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
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
//# sourceMappingURL=app.e2e-spec.js.map