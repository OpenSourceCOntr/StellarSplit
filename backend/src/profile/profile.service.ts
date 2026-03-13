import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile, DefaultSplitType } from './profile.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrencyService } from '../modules/currency/currency.service';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    private readonly currencyService: CurrencyService,
  ) {}

  async getByWalletAddress(walletAddress: string): Promise<UserProfile> {
    const profile = await this.profileRepository.findOne({
      where: { walletAddress },
    });
    if (!profile) {
      throw new NotFoundException(
        `Profile for wallet address ${walletAddress} not found`,
      );
    }
    return profile;
  }

  async update(
    walletAddress: string,
    dto: UpdateProfileDto,
  ): Promise<UserProfile> {
    let preferredCurrency: string | undefined;
    if (dto.preferredCurrency !== undefined) {
      const supported = this.currencyService.getSupportedCurrencies();
      const normalized = dto.preferredCurrency.toUpperCase().trim();
      if (!supported.includes(normalized)) {
        throw new BadRequestException(
          `Currency "${dto.preferredCurrency}" is not supported. Supported: ${supported.join(', ')}`,
        );
      }
      preferredCurrency = normalized;
    }

    let profile = await this.profileRepository.findOne({
      where: { walletAddress },
    });

    if (!profile) {
      profile = this.profileRepository.create({
        walletAddress,
        displayName: dto.displayName ?? null,
        avatarUrl: dto.avatarUrl ?? null,
        preferredCurrency: preferredCurrency ?? 'USD',
        defaultSplitType: dto.defaultSplitType ?? DefaultSplitType.EQUAL,
        emailNotifications: dto.emailNotifications ?? true,
        pushNotifications: dto.pushNotifications ?? true,
      });
    } else {
      Object.assign(profile, {
        ...dto,
        ...(preferredCurrency !== undefined && { preferredCurrency }),
      });
    }

    return await this.profileRepository.save(profile);
  }
}
