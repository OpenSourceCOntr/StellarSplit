import { Injectable } from '@nestjs/common';

@Injectable()
export class GeoService {
  async detect(ip: string) {
    try {
      const response = await fetch(`http://ip-api.com/json/${ip}`);
      const data: any = await response.json();

      if (data.status !== 'success') {
        throw new Error('Geo detection failed');
      }

      return {
        country: data.countryCode,
        currency: this.mapCountryToCurrency(data.countryCode),
      };
    } catch {
      return {
        country: 'US',
        currency: 'USD',
      };
    }
  }

  private mapCountryToCurrency(countryCode: string): string {
    const map: Record<string, string> = {
      NG: 'NGN',
      US: 'USD',
      GB: 'GBP',
      EU: 'EUR',
    };

    return map[countryCode] || 'USD';
  }
}