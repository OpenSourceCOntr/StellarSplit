import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { IdempotencyRecord } from '../../entities/idempotency-record.entity';
import * as crypto from 'crypto';

@Injectable()
export class IdempotencyService {
    private readonly logger = new Logger(IdempotencyService.name);

    constructor(
        @InjectRepository(IdempotencyRecord)
        private readonly repository: Repository<IdempotencyRecord>,
    ) { }

    generateHash(payload: any): string {
        return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    }

    async getRecord(key: string): Promise<IdempotencyRecord | null> {
        return this.repository.findOne({ where: { key } });
    }

    async createRecord(
        key: string,
        payloadHash: string,
        responseBody: any,
        statusCode: number,
    ): Promise<void> {
        const record = this.repository.create({
            key,
            requestPayloadHash: payloadHash,
            responseBody: JSON.stringify(responseBody),
            statusCode,
        });
        await this.repository.save(record);
    }

    async cleanExpiredRecords(): Promise<void> {
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() - 24);

        const result = await this.repository.delete({
            createdAt: LessThan(expiryDate),
        });

        this.logger.log(`Cleaned up ${result.affected || 0} expired idempotency records`);
    }
}
