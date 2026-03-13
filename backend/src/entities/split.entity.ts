import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from "typeorm";
import { Item } from "./item.entity";
import { Participant } from "./participant.entity";
import { ManyToOne, JoinColumn } from "typeorm";
import { ExpenseCategory } from "../compliance/entities/expense-category.entity";

@Entity("splits")
export class Split {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  totalAmount!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  amountPaid!: number;

  @Column({ type: "varchar", default: "active" })
  status!: "active" | "completed" | "partial";

  /**
   * Whether the split is frozen due to an active dispute
   * When frozen: no new payments, withdrawals, or distributions allowed
   */
  @Column({ type: "boolean", default: false })
  isFrozen!: boolean;

  @Column({ type: "text", nullable: true })
  description?: string;

  /**
   * Preferred currency for settlement (e.g., 'XLM', 'USDC:GA5Z...', 'EURC:GA5Z...')
   * Defaults to 'XLM' if not specified
   */
  @Column({ type: "varchar", length: 100, nullable: true, default: "XLM" })
  preferredCurrency?: string;

  /**
   * Creator's Stellar wallet address for receiving payments
   */
  @Column({ type: "varchar", length: 56, nullable: true })
  creatorWalletAddress?: string;

  @Column({ type: "timestamp", nullable: true })
  dueDate?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  /** Soft delete: set when removed; records with this set are excluded from default queries. */
  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt!: Date | null;

  @OneToMany(() => Item, (item) => item.split)
  items?: Item[];

  @OneToMany(() => Participant, (participant) => participant.split)
  participants!: Participant[];

  @Column({ type: "uuid", nullable: true })
  categoryId?: string;

  @ManyToOne(() => ExpenseCategory, (category) => category.splits)
  @JoinColumn({ name: "categoryId" })
  category?: ExpenseCategory;
}
