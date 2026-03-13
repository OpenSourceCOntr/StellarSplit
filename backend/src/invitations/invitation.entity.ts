import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Split } from '../entities/split.entity';

@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Unique token for the invite link (UUID). */
  @Column({ type: 'varchar', length: 36, unique: true, name: 'token' })
  token!: string;

  @Column({ type: 'uuid', name: 'split_id' })
  splitId!: string;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt!: Date;

  /** Set when the invite is used; null until then. */
  @Column({ type: 'timestamp', name: 'used_at', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Split, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'split_id' })
  split?: Split;
}
