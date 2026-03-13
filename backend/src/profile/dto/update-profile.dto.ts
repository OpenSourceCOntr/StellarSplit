import {
  IsString,
  IsOptional,
  IsUrl,
  IsBoolean,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DefaultSplitType } from '../profile.entity';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Display name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string | null;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  avatarUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Preferred currency (e.g. USD, EUR, XLM). Must be from supported list.',
    example: 'USD',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  preferredCurrency?: string;

  @ApiPropertyOptional({
    description: 'Default split type for new splits',
    enum: DefaultSplitType,
  })
  @IsOptional()
  @IsEnum(DefaultSplitType)
  defaultSplitType?: DefaultSplitType;

  @ApiPropertyOptional({ description: 'Email notifications opt-in' })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Push notifications opt-in' })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;
}
