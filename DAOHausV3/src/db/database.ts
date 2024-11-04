import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';

const seconds = (s: number) => s * 1000;

const DATABASE_RETRY_TIMEOUT = seconds(1);
const DATABASE_RETRY_ATTEMPTS = 10;
export const DATABASE_DEFAULT_RETRY_OPTIONS = {
  attempts: DATABASE_RETRY_ATTEMPTS,
  attemptInterval: DATABASE_RETRY_TIMEOUT,
};

export class MyDatabase {
  protected db: Database;

  constructor() {}

  async close() {
    try {
      await this.db.close();
    } catch (e) {
      console.warn('Failed to close db.', e);
    }
  }

  async init() {
    this.db = await open({
      filename: './data.db',
      driver: sqlite3.Database,
    });
    // ПРОВЕРИТЬ ПРАВИЛЬНОСТЬ СУЩНОСТЕЙ, ВСЕ ЛИ АТРИБУТЫ НА МЕСТЕ И СООТВЕТСТВУЮТ ЛИ СХЕМЕ

    await this.db.run(`
              CREATE TABLE IF NOT EXISTS daos(
      id TEXT PRIMARY KEY,
      created_at INTEGER,
      created_by TEXT,
      tx_hash TEXT,
      loot_address TEXT,
      shares_address TEXT,
      safe_address TEXT,
      loot_paused BOOLEAN,
      shares_paused BOOLEAN,
      grace_period INTEGER,
      voting_period INTEGER,
      voting_plus_grace_duration INTEGER,
      proposal_offering TEXT,
      quorum_percent INTEGER,
      sponsor_threshold INTEGER,
      min_retention_percent INTEGER,
      share_token_name TEXT,
      share_token_symbol TEXT,
      loot_token_name TEXT,
      loot_token_symbol TEXT,
      total_shares TEXT,
      total_loot TEXT,
      latest_sponsored_proposal_id INTEGER,
      proposal_count INTEGER,
      active_member_count INTEGER,
      name TEXT,
      existing_safe BOOLEAN,
      existing_shares_and_loot BOOLEAN,
      admin_locked BOOLEAN,
      governor_locked BOOLEAN,
      manager_locked BOOLEAN,
      delegated_vault_manager TEXT,
      baal_version TEXT,
      forwarder TEXT,
      referrer TEXT
              )
          `);

    // Proposals table
    await this.db.run(`
    CREATE TABLE IF NOT EXISTS proposals(
      id TEXT PRIMARY KEY,
      dao_id TEXT,
      proposal_id INTEGER,
      created_at INTEGER,
      created_by TEXT,
      tx_hash TEXT,
      submitted_at INTEGER,
      sponsored_at INTEGER,
      processed_at INTEGER,
      cancelled_at INTEGER,
      execution_payload_text TEXT,
      execution_payload_data TEXT,
      sponsor TEXT,
      sponsor_shares_at_yes INTEGER,
      sponsor_loot_at_yes INTEGER,
      current_shares_at_yes INTEGER,
      current_loot_at_yes INTEGER,
      expiration INTEGER,
      details TEXT,
      yes_votes INTEGER,
      no_votes INTEGER,
      processed BOOLEAN,
      passed BOOLEAN,
      cancelled BOOLEAN,
      FOREIGN KEY(dao_id) REFERENCES daos(id)
    )
  `);

    // Votes table
    await this.db.run(`
        CREATE TABLE IF NOT EXISTS votes(
          id TEXT PRIMARY KEY,
          tx_hash TEXT,
          created_at INTEGER,
          dao_address TEXT,
          approved BOOLEAN,
          balance: INTEGER,
          proposal_id: TEXT,
          member_id: TEXT,
          FOREIGN KEY(proposal_id) REFERENCES proposals(id)
          FOREIGN KEY(member_id) REFERENCES members(id)
        )
      `);

    // Members table
    await this.db.run(`
    CREATE TABLE IF NOT EXISTS members(
      id TEXT PRIMARY KEY,
      dao_id TEXT,
      member_address TEXT,
      shares INTEGER,
      loot INTEGER,
      exists BOOLEAN,
      delegated_shares INTEGER,
      delegating_to TEXT,
      FOREIGN KEY(dao_id) REFERENCES daos(id)
    )
  `);

    // RageQuits table
    await this.db.run(`
    CREATE TABLE IF NOT EXISTS rage_quits(
      id TEXT PRIMARY KEY,
      dao_id TEXT,
      member_address TEXT,
      shares INTEGER,
      loot INTEGER,
      token_address TEXT,
      token_amount TEXT,
      created_at INTEGER,
      tx_hash TEXT,
      FOREIGN KEY(dao_id) REFERENCES daos(id)
    )
  `);

    // Shamans table
    await this.db.run(`
    CREATE TABLE IF NOT EXISTS shamans(
      id TEXT PRIMARY KEY,
      dao_id TEXT,
      shaman_address TEXT,
      permissions INTEGER,
      created_at INTEGER,
      FOREIGN KEY(dao_id) REFERENCES daos(id)
    )
  `);

    // Records table
    await this.db.run(`
    CREATE TABLE IF NOT EXISTS records(
      id TEXT PRIMARY KEY,
      dao_id TEXT,
      event_type TEXT,
      created_at INTEGER,
      tx_hash TEXT,
      FOREIGN KEY(dao_id) REFERENCES daos(id)
    )
  `);

    // Vaults table
    await this.db.run(`
    CREATE TABLE IF NOT EXISTS vaults(
      id TEXT PRIMARY KEY,
      created_at INTEGER,
      dao_id TEXT,
      vault_address TEXT,
      active BOOLEAN,
      ragequittable BOOLEAN,
      name TEXT,
      token_address TEXT,
      tx_hash TEXT,
      FOREIGN KEY(dao_id) REFERENCES daos(id)
    )
  `);
  }

  async addTask(
    walletAddress: string,
    contractAddress: string,
    createdAt: number,
    loanAsset: bigint,
    collateralAsset: bigint,
    liquidationAmount: bigint,
    minCollateralAmount: bigint,
    pricesCell: string,
    queryID: bigint
  ) {
    await this.db.run(
      `
            INSERT INTO liquidation_tasks(wallet_address, contract_address, created_at, updated_at, loan_asset, 
                collateral_asset, liquidation_amount, min_collateral_amount, prices_cell, query_id
                ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      walletAddress,
      contractAddress,
      createdAt,
      createdAt,
      loanAsset.toString(),
      collateralAsset.toString(),
      liquidationAmount.toString(),
      minCollateralAmount.toString(),
      pricesCell,
      queryID.toString()
    );
  }

  async addSwapTask(
    createdAt: number,
    tokenOffer: bigint,
    tokenAsk: bigint,
    swapAmount: bigint
  ) {
    await this.db.run(
      `
            INSERT INTO swap_tasks(created_at, updated_at, token_offer, token_ask, swap_amount) 
            VALUES(?, ?, ?, ?, ?)
        `,
      createdAt,
      createdAt,
      tokenOffer.toString(),
      tokenAsk.toString(),
      swapAmount.toString()
    );
  }
}
