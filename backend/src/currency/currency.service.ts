import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCurrencyPreference, PreferredAsset } from './entities/user-currency-preference.entity';
import { GeoService } from './geo/geo.service';
import { UpdatePreferenceDto } from './dto/update-preference.dto';

@Injectable()
export class CurrencyService {
  constructor(
    @InjectRepository(UserCurrencyPreference)
    private prefRepo: Repository<UserCurrencyPreference>,
    private geoService: GeoService,
  ) { }

  async detectFromIP(ip: string) {
    return this.geoService.detect(ip);
  }

  async getPreferences(userId: string) {
    return this.prefRepo.findOne({ where: { userId } });
  }

  async updatePreferences(userId: string, dto: UpdatePreferenceDto) {
    let pref = await this.getPreferences(userId);

    if (!pref) {
      pref = this.prefRepo.create({
        userId,
        ...dto,
        preferredAsset: dto.preferredAsset as PreferredAsset,
        autoDetected: false
      });
    } else {
      Object.assign(pref, {
        ...dto,
        preferredAsset: dto.preferredAsset as PreferredAsset,
        autoDetected: false
      });
    }

    return this.prefRepo.save(pref);
  }

  async firstLoginSetup(userId: string, ip: string) {
    const existing = await this.getPreferences(userId);
    if (existing) return existing;

    const detection = await this.geoService.detect(ip);

    const newPref = this.prefRepo.create({
      userId,
      preferredCurrency: detection.currency,
      preferredAsset: PreferredAsset.XLM,
      detectedCountry: detection.country,
      detectedCurrency: detection.currency,
      autoDetected: true,
    });

    return this.prefRepo.save(newPref);
  }
}