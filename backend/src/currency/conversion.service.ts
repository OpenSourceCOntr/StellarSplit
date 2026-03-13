import { Injectable } from '@nestjs/common';
import { CurrencyRateService } from './currency-rate.service';

@Injectable()
export class ConversionService {
  constructor(private rateService: CurrencyRateService) { }

  async convert(amount: number, base: string, target: string) {
    const rate = await this.rateService.getRate(base, target);
    return {
      base,
      target,
      rate,
      amount,
      converted: amount * rate,
    };
  }
}