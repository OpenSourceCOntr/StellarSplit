import { Controller, Post, Body, Get, Param, Logger, UseFilters } from '@nestjs/common';
import { UploadService } from './upload.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('uploads')
@Controller('uploads')
export class UploadController {
    private readonly logger = new Logger(UploadController.name);

    constructor(private readonly uploadService: UploadService) { }

    @Post('presigned-url')
    @ApiOperation({ summary: 'Get a presigned URL for file upload' })
    @ApiResponse({ status: 201, description: 'Presigned URL generated successfully' })
    async getPresignedUrl(
        @Body() body: { fileName: string; contentType: string },
    ) {
        this.logger.log(`Requesting presigned upload URL for ${body.fileName}`);
        return await this.uploadService.getPresignedUploadUrl(body.fileName, body.contentType);
    }

    @Get('download-url/:key')
    @ApiOperation({ summary: 'Get a presigned URL for file download' })
    @ApiResponse({ status: 200, description: 'Presigned URL generated successfully' })
    async getDownloadUrl(@Param('key') key: string) {
        this.logger.log(`Requesting presigned download URL for key ${key}`);
        const url = await this.uploadService.getPresignedDownloadUrl(key);
        return { url };
    }
}
