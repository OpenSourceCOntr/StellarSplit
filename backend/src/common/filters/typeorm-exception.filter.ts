import { Catch, ArgumentsHost, HttpStatus, ExceptionFilter, Logger } from '@nestjs/common';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';

@Catch(EntityNotFoundError, QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(TypeOrmExceptionFilter.name);

    catch(exception: EntityNotFoundError | QueryFailedError, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<any>();
        const request = ctx.getRequest<any>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Database error';

        if (exception instanceof EntityNotFoundError) {
            status = HttpStatus.NOT_FOUND;
            message = 'Entity not found';
        } else if (exception instanceof QueryFailedError) {
            // Handle specific DB errors if needed (e.g., unique constraints)
            const err = exception as any;
            if (err.code === '23505') {
                status = HttpStatus.CONFLICT;
                message = 'Duplicate entry found';
            }
        }

        this.logger.error(
            `${request.method} ${request.url} - DB Error: ${exception.message}`,
            exception.stack,
        );

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message,
        });
    }
}
