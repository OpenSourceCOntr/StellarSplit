import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    UnprocessableEntityException,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    constructor(private readonly idempotencyService: IdempotencyService) { }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse<any>();
        const idempotencyKey = request.headers['idempotency-key'];

        if (!idempotencyKey || typeof idempotencyKey !== 'string') {
            return next.handle();
        }

        const payloadHash = this.idempotencyService.generateHash(request.body);
        const existingRecord = await this.idempotencyService.getRecord(idempotencyKey);

        if (existingRecord) {
            if (existingRecord.requestPayloadHash !== payloadHash) {
                throw new UnprocessableEntityException(
                    'Idempotency key already used with a different payload',
                );
            }

            const body = JSON.parse(existingRecord.responseBody);
            response.status(existingRecord.statusCode).set('X-Idempotency-Cache', 'HIT');
            return of(body);
        }

        return next.handle().pipe(
            tap(async (data) => {
                const statusCode = response.statusCode;
                await this.idempotencyService.createRecord(
                    idempotencyKey,
                    payloadHash,
                    data,
                    statusCode,
                );
            }),
        );
    }
}
