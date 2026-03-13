import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PaymentProcessorService } from "./payment-processor.service";
import { StellarModule } from "../stellar/stellar.module";
import { forwardRef } from "@nestjs/common";
import { PaymentGateway } from "../websocket/payment.gateway";
import { Payment } from "../entities/payment.entity";
import { Participant } from "../entities/participant.entity";
import { Split } from "../entities/split.entity";
import { IdempotencyRecord } from "../entities/idempotency-record.entity";
import { EmailModule } from "../email/email.module";
import { MultiCurrencyModule } from "../multi-currency/multi-currency.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { GatewayModule } from "../gateway/gateway.module";
import { IdempotencyService } from "../common/idempotency/idempotency.service";
import { IdempotencyInterceptor } from "../common/idempotency/idempotency.interceptor";

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Participant, Split, IdempotencyRecord]),
    forwardRef(() => StellarModule),
    EmailModule,
    MultiCurrencyModule,
    AnalyticsModule,
    GatewayModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentProcessorService,
    PaymentGateway,
    IdempotencyService,
    IdempotencyInterceptor,
  ],
  exports: [PaymentsService, PaymentProcessorService, IdempotencyService],
})
export class PaymentsModule { }
