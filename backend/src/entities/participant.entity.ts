import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Split } from './split.entity';

@Entity('participants')
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  splitId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amountOwed!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amountPaid!: number;

  @Column({ type: 'varchar', default: 'pending' })
  status!: 'pending' | 'paid' | 'partial';

  @Column({ type: 'varchar', nullable: true })
  walletAddress?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  /** Soft delete: set when removed; records with this set are excluded from default queries. */
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;

  @ManyToOne(() => Split, split => split.id)
  @JoinColumn({ name: 'splitId' })
  split?: Split;
}