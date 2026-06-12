import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';
import * as bcryptjs from 'bcryptjs';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    it('should register a new user and return token', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(usersService, 'create').mockResolvedValue(mockUser);
      (bcryptjs.hash as jest.Mock).mockResolvedValue('hashedpassword');

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcryptjs.hash).toHaveBeenCalledWith('password123', 10);
      expect(usersService.create).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user).toEqual({
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should throw ConflictException if email exists', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login user and return token', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      (bcryptjs.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcryptjs.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(result.token).toBe('mock-jwt-token');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      (bcryptjs.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
