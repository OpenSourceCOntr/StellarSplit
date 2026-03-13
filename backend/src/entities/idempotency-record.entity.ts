import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('idempotency_records')
export class IdempotencyRecord {
    @PrimaryColumn()
    key!: string;

    @Column('text')
    responseBody!: string;

    @Column()
    statusCode!: number;

    @Column('text')
    requestPayloadHash!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
