import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThanOrEqual, IsNull } from "typeorm";
import { RecurringSplit, RecurrenceFrequency } from "./recurring-split.entity";
import { Split } from "../entities/split.entity";
import { Participant } from "../entities/participant.entity";
import { EventsGateway } from "../gateway/events.gateway";

export interface CreateRecurringSplitDto {
  creatorId: string;
  templateSplitId: string;
  frequency: RecurrenceFrequency;
  endDate?: Date;
  autoRemind?: boolean;
  reminderDaysBefore?: number;
  description?: string;
}

export interface UpdateRecurringSplitDto {
  frequency?: RecurrenceFrequency;
  endDate?: Date;
  autoRemind?: boolean;
  reminderDaysBefore?: number;
  description?: string;
}

export interface UpdateTemplateDto {
  totalAmount?: number;
  description?: string;
}

@Injectable()
export class RecurringSplitsService {
  private readonly logger = new Logger(RecurringSplitsService.name);

  constructor(
    @InjectRepository(RecurringSplit)
    private recurringSplitRepository: Repository<RecurringSplit>,
    @InjectRepository(Split)
    private splitRepository: Repository<Split>,
    @InjectRepository(Participant)
    private participantRepository: Repository<Participant>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Create a new recurring split
   */
  async createRecurringSplit(
    dto: CreateRecurringSplitDto
  ): Promise<RecurringSplit> {
    this.logger.log(`Creating recurring split for creator: ${dto.creatorId}`);

    // Verify template split exists
    const templateSplit = await this.splitRepository.findOne({
      where: { id: dto.templateSplitId },
    });

    if (!templateSplit) {
      throw new NotFoundException(
        `Template split ${dto.templateSplitId} not found`
      );
    }

    // Calculate next occurrence
    const nextOccurrence = this.calculateNextOccurrence(
      new Date(),
      dto.frequency
    );

    // Validate end date if provided
    if (dto.endDate && dto.endDate <= new Date()) {
      throw new BadRequestException("End date must be in the future");
    }

    const recurringSplit = new RecurringSplit();
    recurringSplit.creatorId = dto.creatorId;
    recurringSplit.templateSplitId = dto.templateSplitId;
    recurringSplit.frequency = dto.frequency;
    recurringSplit.nextOccurrence = nextOccurrence;
    recurringSplit.endDate = dto.endDate;
    recurringSplit.autoRemind = dto.autoRemind ?? true;
    recurringSplit.reminderDaysBefore = dto.reminderDaysBefore ?? 1;
    recurringSplit.description = dto.description;
    recurringSplit.isActive = true;

    const saved = await this.recurringSplitRepository.save(recurringSplit);
    this.logger.log(`Recurring split created: ${saved.id}`);
    return saved;
  }

  /**
   * Get all recurring splits for a creator
   */
  async getRecurringSplitsByCreator(
    creatorId: string
  ): Promise<RecurringSplit[]> {
    return this.recurringSplitRepository.find({
      where: { creatorId },
      relations: ["templateSplit"],
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Get a single recurring split
   */
  async getRecurringSplitById(id: string): Promise<RecurringSplit> {
    const recurringSplit = await this.recurringSplitRepository.findOne({
      where: { id },
      relations: ["templateSplit"],
    });

    if (!recurringSplit) {
      throw new NotFoundException(`Recurring split ${id} not found`);
    }

    return recurringSplit;
  }

  /**
   * Update recurring split settings
   */
  async updateRecurringSplit(
    id: string,
    dto: UpdateRecurringSplitDto
  ): Promise<RecurringSplit> {
    this.logger.log(`Updating recurring split: ${id}`);

    const recurringSplit = await this.getRecurringSplitById(id);

    // Validate end date if provided
    if (dto.endDate && dto.endDate <= new Date()) {
      throw new BadRequestException("End date must be in the future");
    }

    Object.assign(recurringSplit, dto);
    const updated = await this.recurringSplitRepository.save(recurringSplit);
    this.logger.log(`Recurring split updated: ${id}`);
    return updated;
  }

  /**
   * Pause a recurring split
   */
  async pauseRecurringSplit(id: string): Promise<RecurringSplit> {
    this.logger.log(`Pausing recurring split: ${id}`);

    const recurringSplit = await this.getRecurringSplitById(id);

    if (!recurringSplit.isActive) {
      throw new ConflictException(`Recurring split ${id} is already paused`);
    }

    recurringSplit.isActive = false;
    const updated = await this.recurringSplitRepository.save(recurringSplit);
    this.logger.log(`Recurring split paused: ${id}`);
    return updated;
  }

  /**
   * Resume a recurring split
   */
  async resumeRecurringSplit(id: string): Promise<RecurringSplit> {
    this.logger.log(`Resuming recurring split: ${id}`);

    const recurringSplit = await this.getRecurringSplitById(id);

    if (recurringSplit.isActive) {
      throw new ConflictException(`Recurring split ${id} is already active`);
    }

    // Recalculate next occurrence
    recurringSplit.isActive = true;
    recurringSplit.nextOccurrence = this.calculateNextOccurrence(
      new Date(),
      recurringSplit.frequency
    );

    const updated = await this.recurringSplitRepository.save(recurringSplit);
    this.logger.log(`Recurring split resumed: ${id}`);
    return updated;
  }

  /**
   * Delete a recurring split
   */
  async deleteRecurringSplit(id: string): Promise<void> {
    this.logger.log(`Deleting recurring split: ${id}`);

    const recurringSplit = await this.getRecurringSplitById(id);
    await this.recurringSplitRepository.remove(recurringSplit);
    this.logger.log(`Recurring split deleted: ${id}`);
  }

  /**
   * Update the template split - affects future generated splits
   */
  async updateTemplate(
    recurringSplitId: string,
    dto: UpdateTemplateDto
  ): Promise<Split> {
    this.logger.log(
      `Updating template for recurring split: ${recurringSplitId}`
    );

    const recurringSplit = await this.getRecurringSplitById(recurringSplitId);
    const templateSplit = await this.splitRepository.findOne({
      where: { id: recurringSplit.templateSplitId },
    });

    if (!templateSplit) {
      throw new NotFoundException("Template split not found");
    }

    // Update only future fields
    if (dto.totalAmount !== undefined) {
      templateSplit.totalAmount = dto.totalAmount;
    }
    if (dto.description !== undefined) {
      templateSplit.description = dto.description;
    }

    const updated = await this.splitRepository.save(templateSplit);
    this.logger.log(
      `Template updated for recurring split: ${recurringSplitId}`
    );
    return updated;
  }

  /**
   * Generate a new split from a recurring split template
   * Called by the scheduler
   */
  async generateSplitFromTemplate(
    recurringSplitId: string
  ): Promise<Split | null> {
    this.logger.log(`Generating split from template: ${recurringSplitId}`);

    const recurringSplit = await this.getRecurringSplitById(recurringSplitId);

    if (!recurringSplit.isActive) {
      this.logger.warn(
        `Recurring split ${recurringSplitId} is not active, skipping generation`
      );
      return null;
    }

    // Check if end date has passed
    if (recurringSplit.endDate && recurringSplit.endDate <= new Date()) {
      this.logger.log(
        `Recurring split ${recurringSplitId} has ended, deactivating`
      );
      recurringSplit.isActive = false;
      await this.recurringSplitRepository.save(recurringSplit);
      return null;
    }

    // Get the template split
    const templateSplit = await this.splitRepository.findOne({
      where: { id: recurringSplit.templateSplitId },
      relations: ["participants"],
    });

    if (!templateSplit) {
      throw new NotFoundException("Template split not found");
    }

    // Create new split from template
    const newSplit = new Split();
    newSplit.totalAmount = templateSplit.totalAmount;
    newSplit.amountPaid = 0;
    newSplit.status = "active";
    newSplit.description = `${
      recurringSplit.description || templateSplit.description
    } (${new Date().toLocaleDateString()})`;

    const savedSplit = await this.splitRepository.save(newSplit);

    // Copy participants from template (if they exist)
    if (templateSplit.participants && templateSplit.participants.length > 0) {
      const participants = templateSplit.participants.map((p) => {
        const newParticipant = new Participant();
        newParticipant.splitId = savedSplit.id;
        newParticipant.walletAddress = p.walletAddress;
        newParticipant.amountOwed = p.amountOwed;
        newParticipant.amountPaid = 0;
        newParticipant.status = "pending";
        return newParticipant;
      });

      const savedParticipants = await this.participantRepository.save(participants);
      for (const participant of savedParticipants) {
        this.eventsGateway.emitParticipantJoined(savedSplit.id, {
          splitId: savedSplit.id,
          participantId: participant.id,
          amountOwed: participant.amountOwed,
          status: participant.status,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Update next occurrence
    recurringSplit.nextOccurrence = this.calculateNextOccurrence(
      recurringSplit.nextOccurrence,
      recurringSplit.frequency
    );

    await this.recurringSplitRepository.save(recurringSplit);

    this.logger.log(
      `Split generated from template: ${savedSplit.id} for recurring split ${recurringSplitId}`
    );
    return savedSplit;
  }

  /**
   * Get recurring splits that need processing (due for generation or reminders)
   */
  async getRecurringSplitsDueForProcessing(): Promise<RecurringSplit[]> {
    const now = new Date();
    return this.recurringSplitRepository.find({
      where: {
        isActive: true,
        endDate: IsNull() || LessThanOrEqual(now),
        nextOccurrence: LessThanOrEqual(now),
      },
      relations: ["templateSplit"],
    });
  }

  /**
   * Get recurring splits due for reminders
   */
  async getRecurringSplitsDueForReminders(): Promise<
    Array<RecurringSplit & { reminderDate: Date }>
  > {
    const now = new Date();
    const allActive = await this.recurringSplitRepository.find({
      where: { isActive: true, autoRemind: true },
      relations: ["templateSplit"],
    });

    // Filter for ones due for reminders
    const dueForReminders = allActive.filter((rs) => {
      if (rs.endDate && rs.endDate <= now) {
        return false; // Skip ended recurring splits
      }

      const reminderDate = new Date(rs.nextOccurrence);
      reminderDate.setDate(reminderDate.getDate() - rs.reminderDaysBefore);

      // Check if we're within 24 hours of the reminder date
      const timeDiff = now.getTime() - reminderDate.getTime();
      return timeDiff >= 0 && timeDiff < 24 * 60 * 60 * 1000;
    });

    return dueForReminders.map((rs) => {
      const reminderDate = new Date(rs.nextOccurrence);
      reminderDate.setDate(reminderDate.getDate() - rs.reminderDaysBefore);
      return { ...rs, reminderDate };
    });
  }

  /**
   * Calculate next occurrence date based on frequency
   */
  private calculateNextOccurrence(
    baseDate: Date,
    frequency: RecurrenceFrequency
  ): Date {
    const next = new Date(baseDate);

    switch (frequency) {
      case RecurrenceFrequency.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case RecurrenceFrequency.BIWEEKLY:
        next.setDate(next.getDate() + 14);
        break;
      case RecurrenceFrequency.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
    }

    return next;
  }

  /**
   * Get statistics for recurring splits
   */
  async getRecurringSplitStats(creatorId: string): Promise<{
    total: number;
    active: number;
    paused: number;
    nextOccurrences: Array<{ id: string; nextOccurrence: Date }>;
  }> {
    const splits = await this.getRecurringSplitsByCreator(creatorId);

    return {
      total: splits.length,
      active: splits.filter((s) => s.isActive).length,
      paused: splits.filter((s) => !s.isActive).length,
      nextOccurrences: splits
        .filter((s) => s.isActive)
        .map((s) => ({
          id: s.id,
          nextOccurrence: s.nextOccurrence,
        }))
        .sort(
          (a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime()
        ),
    };
  }
}
