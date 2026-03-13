import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrencyRateCache } from './entities/currency-rate-cache.entity';

@Injectable()
export class CurrencyRateService {
  private readonly logger = new Logger(CurrencyRateService.name);

  constructor(
    @InjectRepository(CurrencyRateCache)
    private rateRepo: Repository<CurrencyRateCache>,
  ) { }

  async getRate(base: string, target: string): Promise<number> {
    if (base === target) return 1.0;

    const cache = await this.rateRepo.findOne({
      where: { baseCurrency: base, targetCurrency: target },
    });

    if (cache && cache.expiresAt > new Date()) {
      return Number(cache.rate);
    }

    // Fallback/Mock rate fetching since external API integration is missing
    const mockRate = base === 'USD' && target === 'NGN' ? 1500 : 1.0;

    await this.rateRepo.save({
      baseCurrency: base,
      targetCurrency: target,
      rate: mockRate,
      source: 'MockAPI',
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour expiry
    });

    return mockRate;
  }
}