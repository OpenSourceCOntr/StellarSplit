import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class CurrencyRateCache {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  baseCurrency!: string;

  @Column()
  targetCurrency!: string;

  @Column('decimal', { precision: 18, scale: 8 })
  rate!: number;

  @Column()
  source!: string;

  @Column()
  fetchedAt!: Date;

  @Column()
  expiresAt!: Date;
}