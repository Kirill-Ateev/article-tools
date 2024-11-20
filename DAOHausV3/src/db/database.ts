import { parse } from 'graphql';
import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { schema } from '../constants/constants.js';
import {
  generateTableSQLWithInlineFK,
  getSchemaDetails,
} from '../utils/transform.js';

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

    // Parse the GraphQL schema
    const parsedSchema = parse(schema);
    const { types, relationships } = getSchemaDetails(parsedSchema);
    const tableSQLsWithFK = generateTableSQLWithInlineFK(types, relationships);
    console.log(tableSQLsWithFK);

    // Execute table creation statements
    for (const sql of tableSQLsWithFK) {
      await this.db.run(sql);
    }
  }

  async addDao({
    id,
    createdAt,
    createdBy,
    txHash,
    lootAddress,
    sharesAddress,
    safeAddress,
    lootPaused,
    sharesPaused,
    gracePeriod,
    votingPeriod,
    votingPlusGraceDuration,
    proposalOffering,
    quorumPercent,
    sponsorThreshold,
    minRetentionPercent,
    shareTokenName,
    shareTokenSymbol,
    lootTokenName,
    lootTokenSymbol,
    totalShares,
    totalLoot,
    latestSponsoredProposalId,
    proposalCount,
    activeMemberCount,
    name,
    existingSafe,
    existingSharesAndLoot,
    adminLocked,
    governorLocked,
    managerLocked,
    delegatedVaultManager,
    baalVersion,
    forwarder,
    referrer,
  }) {
    await this.db.run(
      `INSERT INTO Dao( id,
  createdAt,
  createdBy,
  txHash,
  lootAddress,
  sharesAddress,
  safeAddress,
  lootPaused,
  sharesPaused,
  gracePeriod,
  votingPeriod,
  votingPlusGraceDuration,
  proposalOffering,
  quorumPercent,
  sponsorThreshold,
  minRetentionPercent,
  shareTokenName,
  shareTokenSymbol,
  lootTokenName,
  lootTokenSymbol,
  totalShares,
  totalLoot,
  latestSponsoredProposalId,
  proposalCount,
  activeMemberCount,
  name,
  existingSafe,
  existingSharesAndLoot,
  adminLocked,
  governorLocked,
  managerLocked,
  delegatedVaultManager,
  baalVersion,
  forwarder,
  referrer) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      createdAt,
      createdBy,
      txHash,
      lootAddress,
      sharesAddress,
      safeAddress,
      lootPaused,
      sharesPaused,
      gracePeriod,
      votingPeriod,
      votingPlusGraceDuration,
      proposalOffering,
      quorumPercent,
      sponsorThreshold,
      minRetentionPercent,
      shareTokenName,
      shareTokenSymbol,
      lootTokenName,
      lootTokenSymbol,
      totalShares,
      totalLoot,
      latestSponsoredProposalId,
      proposalCount,
      activeMemberCount,
      name,
      existingSafe,
      existingSharesAndLoot,
      adminLocked,
      governorLocked,
      managerLocked,
      delegatedVaultManager,
      baalVersion,
      forwarder,
      referrer
    );
  }

  // Method to add a Proposal entity
  async addProposal({
    id,
    createdAt,
    createdBy,
    proposedBy,
    proposerMembership,
    dao,
    proposalId,
    prevProposalId,
    txHash,
    proposalDataHash,
    proposalData,
    votingPeriod,
    votingStarts,
    votingEnds,
    gracePeriod,
    votingPlusGraceDuration,
    graceEnds,
    expiration,
    expirationQueryField,
    actionGasEstimate,
    details,
    selfSponsor,
    sponsored,
    sponsor,
    sponsorMembership,
    sponsorTxHash,
    sponsorTxAt,
    cancelled,
    cancelledTxHash,
    cancelledTxAt,
    cancelledBy,
    processed,
    processTxHash,
    processTxAt,
    processedBy,
    actionFailed,
    passed,
    proposalOffering,
    yesVotes,
    noVotes,
    yesBalance,
    noBalance,
    currentlyPassing,
    maxTotalSharesAndLootAtYesVote,
    maxTotalSharesAtYesVote,
    quorumPercentAtSponsor,
    blockNumberAtExecution,
    tributeToken,
    tributeOffered,
    tributeTokenSymbol,
    tributeTokenDecimals,
    tributeEscrowRecipient,
    proposalType,
    title,
    description,
    contentURI,
    contentURIType,
    record,
  }) {
    await this.db.run(
      `INSERT INTO Proposal(   id,
    createdAt,
    createdBy,
    proposedBy,
    proposerMembership,
    dao,
    proposalId,
    prevProposalId,
    txHash,
    proposalDataHash,
    proposalData,
    votingPeriod,
    votingStarts,
    votingEnds,
    gracePeriod,
    votingPlusGraceDuration,
    graceEnds,
    expiration,
    expirationQueryField,
    actionGasEstimate,
    details,
    selfSponsor,
    sponsored,
    sponsor,
    sponsorMembership,
    sponsorTxHash,
    sponsorTxAt,
    cancelled,
    cancelledTxHash,
    cancelledTxAt,
    cancelledBy,
    processed,
    processTxHash,
    processTxAt,
    processedBy,
    actionFailed,
    passed,
    proposalOffering,
    yesVotes,
    noVotes,
    yesBalance,
    noBalance,
    currentlyPassing,
    maxTotalSharesAndLootAtYesVote,
    maxTotalSharesAtYesVote,
    quorumPercentAtSponsor,
    blockNumberAtExecution,
    tributeToken,
    tributeOffered,
    tributeTokenSymbol,
    tributeTokenDecimals,
    tributeEscrowRecipient,
    proposalType,
    title,
    description,
    contentURI,
    contentURIType,
    record) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      createdAt,
      createdBy,
      proposedBy,
      proposerMembership?.id,
      dao?.id,
      proposalId,
      prevProposalId,
      txHash,
      proposalDataHash,
      proposalData,
      votingPeriod,
      votingStarts,
      votingEnds,
      gracePeriod,
      votingPlusGraceDuration,
      graceEnds,
      expiration,
      expirationQueryField,
      actionGasEstimate,
      details,
      selfSponsor,
      sponsored,
      sponsor,
      sponsorMembership?.id,
      sponsorTxHash,
      sponsorTxAt,
      cancelled,
      cancelledTxHash,
      cancelledTxAt,
      cancelledBy,
      processed,
      processTxHash,
      processTxAt,
      processedBy,
      actionFailed,
      passed,
      proposalOffering,
      yesVotes,
      noVotes,
      yesBalance,
      noBalance,
      currentlyPassing,
      maxTotalSharesAndLootAtYesVote,
      maxTotalSharesAtYesVote,
      quorumPercentAtSponsor,
      blockNumberAtExecution,
      tributeToken,
      tributeOffered,
      tributeTokenSymbol,
      tributeTokenDecimals,
      tributeEscrowRecipient,
      proposalType,
      title,
      description,
      contentURI,
      contentURIType,
      record?.id
    );
  }

  // Method to add a Vote entity
  async addVote({
    id,
    txHash,
    createdAt,
    daoAddress,
    approved,
    balance,
    proposal,
    member,
  }) {
    await this.db.run(
      `INSERT INTO Vote(id, txHash, createdAt, daoAddress, approved, balance, proposal, member) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      txHash,
      createdAt,
      daoAddress,
      approved,
      balance,
      proposal?.id,
      member?.id
    );
  }

  // Method to add a RageQuit entity
  async addRageQuit({
    id,
    createdAt,
    txHash,
    dao,
    member,
    to,
    shares,
    loot,
    tokens,
  }) {
    await this.db.run(
      `INSERT INTO RageQuit(id, createdAt, txHash, dao, member, to_, shares, loot, tokens) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      createdAt,
      txHash,
      dao?.id,
      member?.id,
      to,
      shares,
      loot,
      tokens
    );
  }

  // Method to add a Shaman entity
  async addShaman({ id, createdAt, dao, shamanAddress, permissions }) {
    await this.db.run(
      `INSERT INTO Shaman(id, createdAt, dao, shamanAddress, permissions) VALUES(?, ?, ?, ?, ?)`,
      id,
      createdAt,
      dao?.id,
      shamanAddress,
      permissions
    );
  }

  // Method to add an EventTransaction entity
  async addEventTransaction({ id, createdAt, dao, daoAddress }) {
    await this.db.run(
      `INSERT INTO EventTransaction(id, createdAt, dao, daoAddress) VALUES(?, ?, ?, ?)`,
      id,
      createdAt,
      dao?.id,
      daoAddress
    );
  }

  // Method to add a TokenLookup entity
  async addTokenLookup({ id, dao }) {
    await this.db.run(`INSERT INTO TokenLookup(id, dao) VALUES(?, ?)`, id, dao);
  }

  // Method to add a Vault entity
  async addVault({
    id,
    createdAt,
    dao,
    safeAddress,
    active,
    ragequittable,
    name,
  }) {
    await this.db.run(
      `INSERT INTO Vault(id, createdAt, dao, safeAddress, active, ragequittable, name) VALUES(?, ?, ?, ?, ?, ?, ?)`,
      id,
      createdAt,
      dao?.id,
      safeAddress,
      active,
      ragequittable,
      name
    );
  }

  async addMember({
    id,
    createdAt,
    txHash,
    dao,
    memberAddress,
    shares,
    loot,
    sharesLootDelegateShares,
    delegatingTo,
    delegatingToMember,
    lastDelegateUpdateTxHash,
    delegateShares,
    delegateOfCount,
  }) {
    await this.db.run(
      `INSERT INTO Member(id,
    createdAt,
    txHash,
    dao,
    memberAddress,
    shares,
    loot,
    sharesLootDelegateShares,
    delegatingTo,
    delegatingToMember,
    lastDelegateUpdateTxHash,
    delegateShares,
    delegateOfCount) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      createdAt,
      txHash,
      dao?.id,
      memberAddress,
      shares,
      loot,
      sharesLootDelegateShares,
      delegatingTo,
      delegatingToMember?.id,
      lastDelegateUpdateTxHash,
      delegateShares,
      delegateOfCount
    );
  }

  async addRecord({
    id,
    createdAt,
    createdBy,
    dao,
    tag,
    table,
    contentType,
    content,
    queryType,
    parentId,
  }) {
    await this.db.run(
      `INSERT INTO Record(id, createdAt, createdBy, dao, tag, table_, contentType, content, queryType, parentId) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      createdAt,
      createdBy,
      dao?.id,
      tag,
      table,
      contentType,
      content,
      queryType,
      parentId
    );
  }
}
