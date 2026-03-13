import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Invitation } from './invitation.entity';
import { Participant } from '../entities/participant.entity';
import { Split } from '../entities/split.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JoinInvitationDto } from './dto/join-invitation.dto';

const DEFAULT_EXPIRY_HOURS = 72;

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitationRepository: Repository<Invitation>,
    @InjectRepository(Participant)
    private readonly participantRepository: Repository<Participant>,
    @InjectRepository(Split)
    private readonly splitRepository: Repository<Split>,
  ) {}

  async create(dto: CreateInvitationDto): Promise<{
    id: string;
    token: string;
    splitId: string;
    expiresAt: Date;
    link: string;
  }> {
    const split = await this.splitRepository.findOne({ where: { id: dto.splitId } });
    if (!split) {
      throw new NotFoundException(`Split ${dto.splitId} not found`);
    }

    const expiresInHours = dto.expiresInHours ?? DEFAULT_EXPIRY_HOURS;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const token = randomUUID();
    const invitation = this.invitationRepository.create({
      token,
      splitId: dto.splitId,
      expiresAt,
    });
    const saved = await this.invitationRepository.save(invitation);

    const baseUrl = process.env.FRONTEND_URL || process.env.API_URL || 'http://localhost:3000';
    const link = `${baseUrl.replace(/\/$/, '')}/invite/join/${token}`;

    return {
      id: saved.id,
      token: saved.token,
      splitId: saved.splitId,
      expiresAt: saved.expiresAt,
      link,
    };
  }

  /**
   * Returns the invitation if valid (not used, not expired). Throws 410 Gone otherwise.
   */
  async getByToken(token: string): Promise<Invitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['split'],
    });
    if (!invitation) {
      throw new HttpException('Invitation not found or no longer valid', HttpStatus.GONE);
    }
    if (invitation.usedAt) {
      throw new HttpException('This invitation has already been used', HttpStatus.GONE);
    }
    if (new Date() >= invitation.expiresAt) {
      throw new HttpException('This invitation has expired', HttpStatus.GONE);
    }
    return invitation;
  }

  /**
   * Join a split using an invite token. Creates a participant and marks the invite as used.
   * Returns 410 Gone if the invite is expired or already used.
   */
  async joinByToken(token: string, dto: JoinInvitationDto): Promise<{
    participant: Participant;
    split: Split;
  }> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['split'],
    });
    if (!invitation) {
      throw new HttpException('Invitation not found or no longer valid', HttpStatus.GONE);
    }
    if (invitation.usedAt) {
      throw new HttpException('This invitation has already been used', HttpStatus.GONE);
    }
    if (new Date() >= invitation.expiresAt) {
      throw new HttpException('This invitation has expired', HttpStatus.GONE);
    }

    const split = await this.splitRepository.findOne({
      where: { id: invitation.splitId },
    });
    if (!split) {
      throw new HttpException('Split no longer exists', HttpStatus.GONE);
    }

    const userId = dto.email ?? `invite-${invitation.id}`;
    const participant = this.participantRepository.create({
      splitId: invitation.splitId,
      userId,
      amountOwed: 0,
      amountPaid: 0,
      status: 'pending',
      walletAddress: undefined,
    });
    const savedParticipant = await this.participantRepository.save(participant);

    invitation.usedAt = new Date();
    await this.invitationRepository.save(invitation);

    return {
      participant: savedParticipant,
      split: split!,
    };
  }
}
