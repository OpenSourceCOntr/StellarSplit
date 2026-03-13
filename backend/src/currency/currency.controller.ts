import { Controller, Get, Post, Put, Body, Req, Query, UseGuards } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { ConversionService } from './conversion.service';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { ConvertDto } from './dto/convert.dto';

@Controller('currency')
export class CurrencyController {
  constructor(
    private currencyService: CurrencyService,
    private conversionService: ConversionService,
  ) { }

  @Get('preferences')
  async getPreferences(@Req() req: any) {
    const userId = req.user.id;
    return this.currencyService.getPreferences(userId);
  }

  @Put('preferences')
  async updatePreferences(@Req() req: any, @Body() dto: UpdatePreferenceDto) {
    const userId = req.user.id;
    return this.currencyService.updatePreferences(userId, dto);
  }

  @Get('convert')
  async convert(@Query() dto: ConvertDto) {
    return this.conversionService.convert(dto.amount, dto.from, dto.to);
  }

  @Post('setup')
  async firstLoginSetup(@Req() req: any) {
    const userId = req.user.id;
    const ip = req.ip;
    return this.currencyService.firstLoginSetup(userId, ip);
  }
}