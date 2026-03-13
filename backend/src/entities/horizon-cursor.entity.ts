import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('horizon_cursors')
export class HorizonCursor {
    @PrimaryColumn()
    accountId!: string;

    @Column()
    cursor!: string;
}
