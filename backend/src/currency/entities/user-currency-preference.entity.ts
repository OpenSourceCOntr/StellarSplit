import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum PreferredAsset {
  XLM = 'XLM',
  USDC = 'USDC',
}

@Entity()
@Unique(['userId'])
export class UserCurrencyPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string; // wallet address

  @Column({ length: 3 })
  preferredCurrency!: string; // ISO 4217

  @Column({ type: 'enum', enum: PreferredAsset })
  preferredAsset!: PreferredAsset;

  @Column({ length: 2, nullable: true })
  detectedCountry!: string; // ISO 3166-1 alpha-2

  @Column({ length: 3, nullable: true })
  detectedCurrency!: string;

  @Column({ default: true })
  autoDetected!: boolean;

  @UpdateDateColumn()
  lastUpdated!: Date;
}