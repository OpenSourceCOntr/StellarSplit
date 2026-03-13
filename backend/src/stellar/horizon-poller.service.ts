import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Horizon } from '@stellar/stellar-sdk';
import { StellarService } from './stellar.service';
import { HorizonCursor } from '../entities/horizon-cursor.entity';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class HorizonPollerService {
    private readonly logger = new Logger(HorizonPollerService.name);
    private server: Horizon.Server;

    constructor(
        private readonly stellarService: StellarService,
        private readonly paymentsService: PaymentsService,
        @InjectRepository(HorizonCursor)
        private readonly cursorRepository: Repository<HorizonCursor>,
    ) {
        this.server = new Horizon.Server(
            process.env.STELLAR_NETWORK === 'mainnet'
                ? 'https://horizon.stellar.org'
                : 'https://horizon-testnet.stellar.org',
        );
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async pollPayments() {
        this.logger.log('Polling Horizon for new payments...');

        // In a real scenario, we might poll for all split creator addresses
        // For this implementation, we'll focus on a master polling strategy or handle it per active split
        // Let's assume we poll the master account or specific monitored accounts from configuration
        const monitoredAccount = process.env.MONITORED_STELLAR_ACCOUNT;
        if (!monitoredAccount) {
            this.logger.warn('No monitored Stellar account configured');
            return;
        }

        try {
            const cursorRecord = await this.cursorRepository.findOne({ where: { accountId: monitoredAccount } });
            const lastCursor = cursorRecord ? cursorRecord.cursor : 'now';

            const payments = await this.server
                .payments()
                .forAccount(monitoredAccount)
                .cursor(lastCursor)
                .order('asc')
                .call();

            for (const payment of payments.records) {
                if (payment.type === 'payment' || payment.type === 'path_payment_strict_receive' || payment.type === 'path_payment_strict_send') {
                    await this.processPayment(payment);
                }

                // Update cursor
                await this.cursorRepository.save({
                    accountId: monitoredAccount,
                    cursor: payment.paging_token,
                });
            }
        } catch (error) {
            this.logger.error('Error polling Horizon:', error);
        }
    }

    private async processPayment(payment: any) {
        // Fetch transaction to get memo
        const tx = await this.server.transactions().transaction(payment.transaction_hash).call();
        const memo = tx.memo;

        if (!memo) return;

        this.logger.log(`Processing payment with memo: ${memo}`);

        // Assuming memo contains splitId:participantId or similar
        // The requirement says "Filter payments by memo field matching split ID"
        // We'll try to find an active payment entry matching this memo
        try {
            await this.paymentsService.autoConfirmPayment(payment.transaction_hash, memo);
        } catch (error) {
            this.logger.error(`Failed to auto-confirm payment ${payment.transaction_hash}:`, error);
        }
    }
}
