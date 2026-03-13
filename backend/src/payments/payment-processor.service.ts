import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StellarService } from "../stellar/stellar.service";
import { PaymentGateway } from "../websocket/payment.gateway";
import { Payment } from "../entities/payment.entity";
import { Participant } from "../entities/participant.entity";
import { Split } from "../entities/split.entity";
import { EmailService } from "../email/email.service";
import { MultiCurrencyService } from "../multi-currency/multi-currency.service";
import { EventsGateway } from "../gateway/events.gateway";

@Injectable()
export class PaymentProcessorService {
  private readonly logger = new Logger(PaymentProcessorService.name);

  constructor(
    private readonly stellarService: StellarService,
    private readonly paymentGateway: PaymentGateway,
    private readonly eventsGateway: EventsGateway,
    @InjectRepository(Payment) private paymentRepository: Repository<Payment>,
    @InjectRepository(Participant)
    private participantRepository: Repository<Participant>,
    @InjectRepository(Split) private splitRepository: Repository<Split>,
    private readonly emailService: EmailService,
    private readonly multiCurrencyService: MultiCurrencyService,
    private readonly analyticsService?: import("../analytics/analytics.service").AnalyticsService,
  ) {}
  /**
   * Process a payment submission
   * @param splitId ID of the split
   * @param participantId ID of the participant
   * @param txHash Stellar transaction hash
   */
  async processPaymentSubmission(
    splitId: string,
    participantId: string,
    txHash: string,
  ): Promise<{ success: boolean; message: string; paymentId?: string }> {
    try {
      this.logger.log(
        `Processing payment submission for split ${splitId}, participant ${participantId}, tx ${txHash}`,
      );

      // Check for duplicate submission
      const existingPayment = await this.paymentRepository.findOne({
        where: { txHash },
      });

      if (existingPayment) {
        throw new ConflictException(
          "Payment with this transaction hash already exists",
        );
      }

      // Verify the transaction on Stellar network
      const verificationResult =
        await this.stellarService.verifyTransaction(txHash);

      if (!verificationResult || !verificationResult.valid) {
        throw new BadRequestException(
          "Invalid or unsuccessful Stellar transaction",
        );
      }

      // Get the participant record
      const participant = await this.participantRepository.findOne({
        where: { id: participantId, splitId },
      });

      if (!participant) {
        throw new NotFoundException(
          `Participant ${participantId} not found for split ${splitId}`,
        );
      }

      // Get split to check preferred currency
      const split = await this.splitRepository.findOne({
        where: { id: splitId },
      });

      if (!split) {
        throw new NotFoundException(`Split ${splitId} not found`);
      }

      // Determine the paid asset (from path payment source or regular payment)
      const paidAsset =
        verificationResult.isPathPayment && verificationResult.sourceAsset
          ? verificationResult.sourceAsset
          : verificationResult.asset;

      const paidAmount =
        verificationResult.isPathPayment && verificationResult.sourceAmount
          ? verificationResult.sourceAmount
          : verificationResult.amount;

      // Process multi-currency payment if needed
      let receivedAmount = verificationResult.amount;
      let receivedAsset = verificationResult.asset;
      let multiCurrencyResult = null;

      // Check if conversion is needed (paid asset differs from received asset)
      if (verificationResult.isPathPayment || paidAsset !== receivedAsset) {
        try {
          multiCurrencyResult =
            await this.multiCurrencyService.processMultiCurrencyPayment({
              splitId,
              participantId,
              txHash,
              paidAsset,
              paidAmount,
              receivedAsset: (split as any).preferredCurrency || receivedAsset,
              slippageTolerance: 0.01, // 1% slippage tolerance
            });

          receivedAmount = multiCurrencyResult.receivedAmount;
          receivedAsset = multiCurrencyResult.receivedAsset;
        } catch (error: any) {
          this.logger.warn(
            `Multi-currency processing failed, using direct payment: ${error.message}`,
          );
          // Fall back to direct payment processing
        }
      }

      // Validate that payment matches participant's owed amount (use received amount after conversion)
      if (receivedAmount < participant.amountOwed) {
        // Handle partial payment
        await this.handlePartialPayment(
          splitId,
          participantId,
          participant,
          {
            ...verificationResult,
            amount: receivedAmount,
            asset: receivedAsset,
          },
          txHash,
        );

        const paymentId = await this.createPaymentRecord(
          splitId,
          participantId,
          {
            ...verificationResult,
            amount: receivedAmount,
            asset: receivedAsset,
          },
          txHash,
          "partial",
        );

        return {
          success: true,
          message: `Partial payment received. Amount: ${paidAmount} ${paidAsset}${multiCurrencyResult?.requiresConversion ? ` (converted to ${receivedAmount} ${receivedAsset})` : ""}. Expected: ${participant.amountOwed}`,
          paymentId,
        };
      } else if (receivedAmount > participant.amountOwed) {
        // Overpayment scenario - still mark as paid but note the overpayment
        await this.handleCompletePayment(
          splitId,
          participantId,
          participant,
          {
            ...verificationResult,
            amount: receivedAmount,
            asset: receivedAsset,
          },
          txHash,
        );

        const paymentId = await this.createPaymentRecord(
          splitId,
          participantId,
          {
            ...verificationResult,
            amount: receivedAmount,
            asset: receivedAsset,
          },
          txHash,
          "confirmed",
        );

        return {
          success: true,
          message: `Payment received with overpayment. Amount: ${paidAmount} ${paidAsset}${multiCurrencyResult?.requiresConversion ? ` (converted to ${receivedAmount} ${receivedAsset})` : ""}. Expected: ${participant.amountOwed}`,
          paymentId,
        };
      } else {
        // Exact payment
        await this.handleCompletePayment(
          splitId,
          participantId,
          participant,
          {
            ...verificationResult,
            amount: receivedAmount,
            asset: receivedAsset,
          },
          txHash,
        );

        const paymentId = await this.createPaymentRecord(
          splitId,
          participantId,
          {
            ...verificationResult,
            amount: receivedAmount,
            asset: receivedAsset,
          },
          txHash,
          "confirmed",
        );

        return {
          success: true,
          message: `Payment confirmed. Amount: ${paidAmount} ${paidAsset}${multiCurrencyResult?.requiresConversion ? ` (converted to ${receivedAmount} ${receivedAsset})` : ""}`,
          paymentId,
        };
      }
    } catch (error: any) {
      this.logger.error(
        `Error processing payment submission: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle partial payment scenario
   */
  private async handlePartialPayment(
    splitId: string,
    participantId: string,
    participant: Participant,
    verificationResult: any,
    txHash: string,
  ): Promise<void> {
    // Update participant's paid amount and status
    await this.participantRepository.update(
      { id: participantId },
      {
        amountPaid: verificationResult.amount,
        status: "partial",
      },
    );

    // Update split's total paid amount
    await this.updateSplitAmountPaid(splitId);

    // Send notification
    this.sendPaymentNotification(participantId, "partial_payment_received", {
      txHash,
      amount: verificationResult.amount,
      expected: participant.amountOwed,
    }, splitId);

    // Invalidate analytics cache for this user and optionally refresh materialized views
    try {
      if (this.analyticsService) {
        await this.analyticsService.invalidateUserCache(participant.userId);
        // best-effort async refresh
        this.analyticsService.refreshMaterializedViewsNow();
      }
    } catch (err) {
      this.logger.warn(
        "Failed to notify analytics service about partial payment",
        err,
      );
    }
  }

  /**
   * Handle complete payment scenario
   */
  private async handleCompletePayment(
    splitId: string,
    participantId: string,
    participant: Participant,
    verificationResult: any,
    txHash: string,
  ): Promise<void> {
    // Update participant's status to paid
    await this.participantRepository.update(
      { id: participantId },
      {
        amountPaid: participant.amountOwed,
        status: "paid",
      },
    );

    // Update split's total paid amount
    await this.updateSplitAmountPaid(splitId);

    // Send notification
    this.sendPaymentNotification(participantId, "payment_confirmed", {
      txHash,
      amount: verificationResult.amount,
    }, splitId);

    // Trigger Email Notification
    this.triggerPaymentConfirmationEmail(participantId, {
      amount: verificationResult.amount,
      splitId,
      txHash,
    });

    // Invalidate analytics cache for this user and optionally refresh materialized views
    try {
      if (this.analyticsService) {
        await this.analyticsService.invalidateUserCache(participant.userId);
        // best-effort async refresh
        this.analyticsService.refreshMaterializedViewsNow();
      }
    } catch (err) {
      this.logger.warn(
        "Failed to notify analytics service about payment confirmation",
        err,
      );
    }
  }

  /**
   * Create a payment record in the database
   */
  private async createPaymentRecord(
    splitId: string,
    participantId: string,
    verificationResult: any,
    txHash: string,
    status: "pending" | "confirmed" | "failed" | "partial",
  ): Promise<string> {
    const payment: Payment = {
      id: this.generateId(),
      splitId,
      participantId,
      txHash,
      amount: verificationResult.amount,
      asset: verificationResult.asset,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const savedPayment = await this.paymentRepository.save(payment);
    return savedPayment.id;
  }

  /**
   * Update the total amount paid for a split
   */
  private async updateSplitAmountPaid(splitId: string): Promise<void> {
    // Calculate total amount paid by summing all participants' paid amounts
    const participants = await this.participantRepository.find({
      where: { splitId },
    });

    const totalPaid = participants.reduce(
      (sum, participant) => sum + participant.amountPaid,
      0,
    );

    // Get the split to update
    const split = await this.splitRepository.findOne({
      where: { id: splitId },
    });
    if (!split) {
      throw new NotFoundException(`Split ${splitId} not found`);
    }

    // Determine split status based on total paid vs total amount
    let status: "active" | "completed" | "partial" = "active";
    if (totalPaid >= split.totalAmount) {
      status = "completed";
    } else if (totalPaid > 0) {
      status = "partial";
    }

    await this.splitRepository.update(
      { id: splitId },
      {
        amountPaid: totalPaid,
        status,
      },
    );

    // Send notification if split is now completed
    this.sendSplitUpdateNotification(splitId, status, totalPaid);

    if (status === "completed") {
      this.sendSplitCompletedNotification(splitId);
    }
  }

  /**
   * Send payment notification via WebSocket
   */
  private sendPaymentNotification(
    participantId: string,
    type: string,
    data: any,
    splitId: string,
  ): void {
    // Emit to WebSocket gateway
    const roomId = `participant_${participantId}`;
    this.paymentGateway.emitPaymentNotification(roomId, {
      type,
      data,
      timestamp: new Date(),
    });
    this.eventsGateway.emitPaymentReceived(splitId, {
      participantId,
      type,
      ...data,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Sending payment notification for participant ${participantId}: ${type}`,
      data,
    );
  }

  /**
   * Send split completion notification
   */
  private sendSplitCompletedNotification(splitId: string): void {
    // Emit to WebSocket gateway
    const roomId = `split_${splitId}`;
    this.paymentGateway.emitSplitCompletion(roomId, {
      splitId,
      status: "completed",
      timestamp: new Date(),
    });
    this.eventsGateway.emitSplitUpdated(splitId, {
      splitId,
      status: "completed",
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Sending split completed notification for split ${splitId}`,
    );

    // Trigger Email Notification for all participants
    this.triggerSplitCompletedEmail(splitId);
  }

  private sendSplitUpdateNotification(
    splitId: string,
    status: "active" | "completed" | "partial",
    amountPaid: number,
  ): void {
    this.eventsGateway.emitSplitUpdated(splitId, {
      splitId,
      status,
      amountPaid,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Trigger payment confirmation email
   */
  private async triggerPaymentConfirmationEmail(
    participantId: string,
    data: { amount: number; splitId: string; txHash: string },
  ) {
    try {
      const participant = await this.participantRepository.findOne({
        where: { id: participantId },
      });

      const split = await this.splitRepository.findOne({
        where: { id: data.splitId },
      });

      if (participant) {
        const user = await this.emailService.getUser(participant.userId);
        if (user) {
          await this.emailService.sendPaymentConfirmation(user.email, {
            amount: data.amount,
            splitDescription: split?.description || "Split payment",
            txHash: data.txHash,
          });
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to trigger payment confirmation email: ${error.message}`,
      );
    }
  }

  /**
   * Trigger split completed email
   */
  private async triggerSplitCompletedEmail(splitId: string) {
    try {
      const split = await this.splitRepository.findOne({
        where: { id: splitId },
      });
      const participants = await this.participantRepository.find({
        where: { splitId },
      });

      if (split) {
        for (const participant of participants) {
          const user = await this.emailService.getUser(participant.userId);
          if (user) {
            await this.emailService.sendSplitCompleted(user.email, {
              splitDescription: split.description || "Split payment",
              totalAmount: split.totalAmount,
            });
          }
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to trigger split completed email: ${error.message}`,
      );
    }
  }

  /**
   * Generate a simple ID for entities
   */
  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
