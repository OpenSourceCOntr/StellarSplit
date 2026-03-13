import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';
import { CurrencyRateService } from './currency-rate.service';
import { ConversionService } from './conversion.service';
import { GeoService } from './geo/geo.service';
import { UserCurrencyPreference } from './entities/user-currency-preference.entity';
import { CurrencyRateCache } from './entities/currency-rate-cache.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserCurrencyPreference, CurrencyRateCache]),
    ],
    controllers: [CurrencyController],
    providers: [
        CurrencyService,
        CurrencyRateService,
        ConversionService,
        GeoService,
    ],
    exports: [CurrencyService, ConversionService],
})
export class CurrencyModule { }
