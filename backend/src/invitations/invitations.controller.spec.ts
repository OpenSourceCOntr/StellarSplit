import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { Invitation } from './invitation.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JoinInvitationDto } from './dto/join-invitation.dto';

describe('InvitationsController', () => {
  let controller: InvitationsController;
  let service: InvitationsService;

  const splitId = '550e8400-e29b-41d4-a716-446655440000';
  const validToken = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const mockInvitationEntity: Invitation = {
    id: 'inv-uuid',
    token: validToken,
    splitId,
    expiresAt: new Date(Date.now() + 86400000),
    usedAt: null,
    createdAt: new Date(),
  } as Invitation;

  const mockInvitationWithLink = {
    ...mockInvitationEntity,
    link: `http://localhost:3000/invite/join/${validToken}`,
  };
  const mockJoinResult = {
    participant: { id: 'part-uuid', splitId, userId: 'alice@example.com', amountOwed: 0, status: 'pending' },
    split: { id: splitId, status: 'active' },
  };

  const mockInvitationsService = {
    create: jest.fn().mockResolvedValue(mockInvitationWithLink),
    getByToken: jest.fn().mockResolvedValue(mockInvitationEntity),
    joinByToken: jest.fn().mockResolvedValue(mockJoinResult),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockInvitationsService.create.mockResolvedValue(mockInvitationWithLink);
    mockInvitationsService.getByToken.mockResolvedValue(mockInvitationEntity);
    mockInvitationsService.joinByToken.mockResolvedValue(mockJoinResult);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        {
          provide: InvitationsService,
          useValue: mockInvitationsService,
        },
      ],
    }).compile();

    controller = module.get<InvitationsController>(InvitationsController);
    service = module.get<InvitationsService>(InvitationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create invite and return link', async () => {
      const dto: CreateInvitationDto = { splitId };
      const result = await controller.create(dto);
      expect(result).toEqual(mockInvitationWithLink);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('getByToken', () => {
    it('should return invite for valid token', async () => {
      const result = await controller.getByToken(validToken);
      expect(result).toEqual(mockInvitationEntity);
      expect(service.getByToken).toHaveBeenCalledWith(validToken);
    });

    it('should throw 410 when service throws Gone', async () => {
      mockInvitationsService.getByToken.mockRejectedValue({
        status: HttpStatus.GONE,
        message: 'This invitation has expired',
      });
      await expect(controller.getByToken(validToken)).rejects.toMatchObject({
        status: HttpStatus.GONE,
      });
    });
  });

  describe('join', () => {
    it('should join via token and return participant and split', async () => {
      const dto: JoinInvitationDto = { email: 'alice@example.com' };
      const result = await controller.join(validToken, dto);
      expect(result).toEqual(mockJoinResult);
      expect(service.joinByToken).toHaveBeenCalledWith(validToken, dto);
    });
  });
});
