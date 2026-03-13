import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { RecurringSplitsController } from './recurring-splits.controller';
import { RecurringSplitsService } from './recurring-splits.service';
import { RecurringSplitsScheduler } from './recurring-splits.scheduler';
import { RecurringSplit } from './recurring-split.entity';
import { Split } from '../entities/split.entity';
import { Participant } from '../entities/participant.entity';
import { PaymentGateway } from '../websocket/payment.gateway';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecurringSplit, Split, Participant]),
    ScheduleModule.forRoot(),
    GatewayModule,
  ],
  controllers: [RecurringSplitsController],
  providers: [RecurringSplitsService, RecurringSplitsScheduler, PaymentGateway],
  exports: [RecurringSplitsService],
})
export class RecurringSplitsModule {}
