import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UserProfile } from './profile.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get(':walletAddress')
  @ApiOperation({ summary: 'Get user profile by wallet address' })
  @ApiParam({
    name: 'walletAddress',
    description: 'Stellar wallet address (G...)',
    example: 'GDZST3XVCDTUJ76ZAV2HA72KYQODXXZ5PTMAPZGDHZ6CS7RO7MGG3DBM',
  })
  @ApiResponse({ status: 200, description: 'Profile found', type: UserProfile })
  @ApiResponse({ status: 404, description: 'Profile not found for wallet address' })
  async getByWalletAddress(
    @Param('walletAddress') walletAddress: string,
  ): Promise<UserProfile> {
    return this.profileService.getByWalletAddress(walletAddress);
  }

  @Patch(':walletAddress')
  @ApiOperation({ summary: 'Update user profile (creates if not exists)' })
  @ApiParam({
    name: 'walletAddress',
    description: 'Stellar wallet address (G...)',
  })
  @ApiResponse({ status: 200, description: 'Profile updated', type: UserProfile })
  @ApiResponse({ status: 400, description: 'Validation error (e.g. unsupported currency)' })
  async update(
    @Param('walletAddress') walletAddress: string,
    @Body(ValidationPipe) dto: UpdateProfileDto,
  ): Promise<UserProfile> {
    return this.profileService.update(walletAddress, dto);
  }
}
