import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ReminderSchedulerService } from './reminder.scheduler';
import { Split } from '../../entities/split.entity';
import { Participant } from '../../entities/participant.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Split, Participant]),
        BullModule.registerQueue({
            name: 'reminders',
        }),
    ],
    providers: [ReminderSchedulerService],
    exports: [ReminderSchedulerService],
})
export class SchedulerModule { }
