import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { UsersRepository } from '../users.repository';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepo: UsersRepository;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockUsersRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepo = module.get<UsersRepository>(UsersRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      mockUsersRepo.create.mockResolvedValue(mockUser);

      const result = await service.create({
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result).toEqual(mockUser);
      expect(mockUsersRepo.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
      });
    });
  });

  describe('findById', () => {
    it('should find a user by id', async () => {
      mockUsersRepo.findById.mockResolvedValue(mockUser);

      const result = await service.findById(1);

      expect(result).toEqual(mockUser);
      expect(mockUsersRepo.findById).toHaveBeenCalledWith(1);
    });

    it('should return null if user not found', async () => {
      mockUsersRepo.findById.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockUsersRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return null if email not found', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });
});
