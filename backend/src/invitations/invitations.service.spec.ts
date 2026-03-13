import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpStatus } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { Invitation } from './invitation.entity';
import { Participant } from '../entities/participant.entity';
import { Split } from '../entities/split.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JoinInvitationDto } from './dto/join-invitation.dto';

describe('InvitationsService', () => {
  let service: InvitationsService;
  let invitationRepo: Repository<Invitation>;
  let participantRepo: Repository<Participant>;
  let splitRepo: Repository<Split>;

  const splitId = '550e8400-e29b-41d4-a716-446655440000';
  const validToken = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const mockSplit: Split = {
    id: splitId,
    totalAmount: 100,
    amountPaid: 0,
    status: 'active',
    isFrozen: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Split;

  const mockInvitation: Invitation = {
    id: 'inv-uuid',
    token: validToken,
    splitId,
    expiresAt: futureDate,
    usedAt: null,
    createdAt: new Date(),
  } as Invitation;

  const mockInvitationUsed: Invitation = {
    ...mockInvitation,
    usedAt: new Date(),
  };

  const mockInvitationExpired: Invitation = {
    ...mockInvitation,
    expiresAt: pastDate,
  };

  const mockInvitationRepo = {
    create: jest.fn().mockImplementation((dto) => ({ ...dto })),
    save: jest.fn().mockImplementation((inv) => Promise.resolve({ ...inv, id: 'inv-uuid' })),
    findOne: jest.fn(),
  };

  const mockParticipantRepo = {
    create: jest.fn().mockImplementation((dto) => ({ ...dto })),
    save: jest.fn().mockImplementation((p) => Promise.resolve({ ...p, id: 'part-uuid' })),
  };

  const mockSplitRepo = {
    findOne: jest.fn().mockResolvedValue(mockSplit),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSplitRepo.findOne.mockResolvedValue(mockSplit);
    mockInvitationRepo.findOne.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: getRepositoryToken(Invitation), useValue: mockInvitationRepo },
        { provide: getRepositoryToken(Participant), useValue: mockParticipantRepo },
        { provide: getRepositoryToken(Split), useValue: mockSplitRepo },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
    invitationRepo = module.get(getRepositoryToken(Invitation));
    participantRepo = module.get(getRepositoryToken(Participant));
    splitRepo = module.get(getRepositoryToken(Split));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an invitation and return link', async () => {
      const dto: CreateInvitationDto = { splitId };
      const result = await service.create(dto);
      expect(result).toMatchObject({
        splitId,
        token: expect.any(String),
        expiresAt: expect.any(Date),
        link: expect.stringContaining('/invite/join/'),
      });
      expect(result.token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(mockInvitationRepo.save).toHaveBeenCalled();
      expect(mockSplitRepo.findOne).toHaveBeenCalledWith({ where: { id: splitId } });
    });

    it('should use custom expiresInHours when provided', async () => {
      const dto: CreateInvitationDto = { splitId, expiresInHours: 24 };
      const result = await service.create(dto);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
      const diffHours = (result.expiresAt.getTime() - Date.now()) / (60 * 60 * 1000);
      expect(diffHours).toBeLessThanOrEqual(25);
      expect(diffHours).toBeGreaterThanOrEqual(23);
    });

    it('should throw NotFoundException when split does not exist', async () => {
      mockSplitRepo.findOne.mockResolvedValue(null);
      await expect(service.create({ splitId })).rejects.toThrow('Split');
      expect(mockInvitationRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getByToken', () => {
    it('should return invitation when valid', async () => {
      mockInvitationRepo.findOne.mockResolvedValue(mockInvitation);
      const result = await service.getByToken(validToken);
      expect(result).toEqual(mockInvitation);
    });

    it('should throw 410 Gone when invitation not found', async () => {
      mockInvitationRepo.findOne.mockResolvedValue(null);
      await expect(service.getByToken(validToken)).rejects.toMatchObject({
        status: HttpStatus.GONE,
      });
    });

    it('should throw 410 Gone when already used', async () => {
      mockInvitationRepo.findOne.mockResolvedValue(mockInvitationUsed);
      await expect(service.getByToken(validToken)).rejects.toMatchObject({
        status: HttpStatus.GONE,
        response: expect.stringContaining('already been used'),
      });
    });

    it('should throw 410 Gone when expired', async () => {
      mockInvitationRepo.findOne.mockResolvedValue(mockInvitationExpired);
      await expect(service.getByToken(validToken)).rejects.toMatchObject({
        status: HttpStatus.GONE,
        response: expect.stringContaining('expired'),
      });
    });
  });

  describe('joinByToken', () => {
    it('should create participant and mark invite as used', async () => {
      mockInvitationRepo.findOne.mockResolvedValue({ ...mockInvitation, split: mockSplit });
      const dto: JoinInvitationDto = { email: 'alice@example.com', displayName: 'Alice' };
      const result = await service.joinByToken(validToken, dto);
      expect(result.participant).toBeDefined();
      expect(result.participant.splitId).toBe(splitId);
      expect(result.participant.userId).toBe('alice@example.com');
      expect(result.participant.amountOwed).toBe(0);
      expect(result.participant.status).toBe('pending');
      expect(result.split).toEqual(mockSplit);
      expect(mockParticipantRepo.save).toHaveBeenCalled();
      expect(mockInvitationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ usedAt: expect.any(Date) }),
      );
    });

    it('should use invite id as userId when email not provided', async () => {
      mockInvitationRepo.findOne.mockResolvedValue({ ...mockInvitation, split: mockSplit });
      const result = await service.joinByToken(validToken, {});
      expect(result.participant.userId).toMatch(/^invite-/);
    });

    it('should return 410 Gone when token already used', async () => {
      mockInvitationRepo.findOne.mockResolvedValue(mockInvitationUsed);
      await expect(service.joinByToken(validToken, {})).rejects.toMatchObject({
        status: HttpStatus.GONE,
      });
      expect(mockParticipantRepo.save).not.toHaveBeenCalled();
    });

    it('should return 410 Gone when token expired', async () => {
      mockInvitationRepo.findOne.mockResolvedValue(mockInvitationExpired);
      await expect(service.joinByToken(validToken, {})).rejects.toMatchObject({
        status: HttpStatus.GONE,
      });
      expect(mockParticipantRepo.save).not.toHaveBeenCalled();
    });
  });
});
