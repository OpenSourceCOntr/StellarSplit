import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUserProfilesTable1738300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_profiles',
        columns: [
          {
            name: 'wallet_address',
            type: 'varchar',
            length: '56',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'display_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'avatar_url',
            type: 'varchar',
            length: '2048',
            isNullable: true,
          },
          {
            name: 'preferred_currency',
            type: 'varchar',
            length: '10',
            default: "'USD'",
            isNullable: false,
          },
          {
            name: 'default_split_type',
            type: 'varchar',
            length: '20',
            default: "'equal'",
            isNullable: false,
          },
          {
            name: 'email_notifications',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'push_notifications',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'user_profiles',
      new TableIndex({
        name: 'idx_user_profiles_wallet_address',
        columnNames: ['wallet_address'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_profiles', true);
  }
}
