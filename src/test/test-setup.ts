import knex, { Knex } from 'knex';
import path from 'path';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from 'testcontainers';

export const TEST_TIMEOUTS = 60000;

export interface ContainerInstance {
  container: StartedPostgreSqlContainer;
  pg: Knex;
}

/**
 * This function starts a test container with a postgres database with latest migrations and initializes the postgres knex client.
 *
 * @returns ContainerInstance containing pg client and test container
 */
export async function startContainer(): Promise<ContainerInstance> {
  const container = await new PostgreSqlContainer('postgres:11.11-alpine')
    .withDatabase('postgres')
    .withPassword('secret')
    .withUser('postgres')
    .withTmpFs({ '/temp_pgdata': 'rw,noexec,nosuid' })
    .start();

  const pg = knex({
    client: 'pg',
    connection: {
      user: container.getUsername(),
      host: container.getHost(),
      database: container.getDatabase(),
      port: container.getPort(),
      password: container.getPassword(),
      ssl: false
    },
    pool: { min: 3, max: 10 },
    migrations: { directory: path.join(__dirname, '../database/migrations') },
    debug: false
  });

  // The uuid-ossp module provides functions to generate universally unique identifiers (UUIDs) using one of several standard algorithms. There are also functions to produce certain special UUID constants. This module is only necessary for special requirements beyond what is available in core PostgreSQL
  // https://www.postgresql.org/docs/current/uuid-ossp.html
  await pg.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await pg.migrate.latest();

  return { container, pg };
}

export async function stopContainer(instance: ContainerInstance): Promise<void> {
  await instance.container.stop();
  await instance.pg.destroy();
}
