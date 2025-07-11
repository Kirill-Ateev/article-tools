import { gql } from 'graphql-request';

export const schema = `type Dao @entity {
  "unique identifier and primary key of the entity"
  id: ID!
  "timestamp of the block when the dao was summoned"
  createdAt: BigInt!
  "address that created the dao"
  createdBy: Bytes!
  "transaction hash of the dao contract deployment"
  txHash: Bytes!
  "contract address of the loot erc20 token"
  lootAddress: Bytes!
  "contract address of the shares erc20 token"
  sharesAddress: Bytes!
  "contract address of the gnosis safe treasury"
  safeAddress: Bytes!
  "indicates if loot transferability is on/off"
  lootPaused: Boolean!
  "indicates if shares transferability is on/off"
  sharesPaused: Boolean!
  "length in seconds of the current grace period"
  gracePeriod: BigInt!
  "length in seconds of the current voting period"
  votingPeriod: BigInt!
  "length in seconds of the current voting period and grace period"
  votingPlusGraceDuration: BigInt!
  "amount of network token required as tribute to submit a proposal"
  proposalOffering: BigInt!
  "minimum % of shares that must vote yes for it to pass"
  quorumPercent: BigInt!
  "amount of shares needed to automatically sponsor a proposal"
  sponsorThreshold: BigInt!
  "auto-fails a proposal if more than (1- minRetentionPercent) * total shares exit before processing"
  minRetentionPercent: BigInt!
  "name of the erc20 shares token"
  shareTokenName: String
  "symbol of the erc20 shares token"
  shareTokenSymbol: String
  "name of the erc20 loot token"
  lootTokenName: String
  "symbol of the erc20 loot token"
  lootTokenSymbol: String
  "total circulating shares tokens"
  totalShares: BigInt!
  "total circulating loot tokens"
  totalLoot: BigInt!
  "ID of the last sponsored proposal"
  latestSponsoredProposalId: BigInt!
  "count of proposal submitted"
  proposalCount: BigInt!
  "count of share or loot holding members"
  activeMemberCount: BigInt!
  "name of the DAO"
  name: String
  "was Dao summoned by an existing safe or did it create a new safe."
  existingSafe: Boolean!
  "was Dao summoned by an existing shares and loot token or did it create new ones."
  existingSharesAndLoot: Boolean!
  "Indicates if admin shamans can be added to the DAO"
  adminLocked: Boolean!
  "Indicates if governor shamans can be added to the DAO"
  governorLocked: Boolean!
  "Indicates if manager shamans can be added to the DAO"
  managerLocked: Boolean!
  "address delegated to manage the active status of non-ragequittable vaults"
  delegatedVaultManager: Bytes!
  "version of the baal contract and summoner"
  baalVersion: String!
  "Forwarder address"
  forwarder: Bytes!
  "summoning referrer identifier"
  referrer: String
  "proposals scoped to this dao"
  proposals: [Proposal!] @derivedFrom(field: "dao")
  "members scoped to this dao"
  members: [Member!]!
  "rage quits scoped to this dao"
  rageQuits: [RageQuit!] @derivedFrom(field: "dao")
  "shaman scoped to this dao"
  shaman: [Shaman!] @derivedFrom(field: "dao")
  records: [Record!] @derivedFrom(field: "dao")
  vaults: [Vault!]! @derivedFrom(field: "dao")
  eventTransactions: EventTransaction @derivedFrom(field: "dao")
}

type Proposal @entity {
  "unique identifier and primary key of the entity"
  id: ID!
  "block timestamp when the proposal was submitted"
  createdAt: BigInt!
  "address that triggered the proposal tx"
  createdBy: Bytes!
  "address that submitted the proposal to the dao"
  proposedBy: Bytes
  "member entity of proposer if applicable"
  proposerMembership: Member
  "related DAO entity"
  dao: Dao!
  "id of the proposal"
  proposalId: BigInt!
  "id of the previous proposal, set at sponsorship"
  prevProposalId: BigInt!
  "transaction hash of the proposal"
  txHash: Bytes!
  "hash of raw transaction data that will be executed if the proposal passes"
  proposalDataHash: Bytes!
  "raw transaction data that will be executed if the proposal passes"
  proposalData: Bytes!
  "duration of the voting period for this proposal in seconds"
  votingPeriod: BigInt!
  "unix timestamp of when the voting period starts"
  votingStarts: BigInt!
  "unix timestamp of when the voting period ends"
  votingEnds: BigInt!
  "duration in seconds of the grace period for this proposal in seconds"
  gracePeriod: BigInt!
  "duration in seconds of the grace and voting periods for this proposal in seconds"
  votingPlusGraceDuration: BigInt!
  "unix timestamp of when the grace period ends"
  graceEnds: BigInt!
  "unix timestamp after which proposal should be considered invalid and skipped"
  expiration: BigInt!
  "proposal expiration time or if there is no expiration this will be a huge number to aid in querying unexpired proposals"
  expirationQueryField: BigInt!
  "estimated gas needed to execute the proposal actions"
  actionGasEstimate: BigInt!
  "string with human readable description of the proposal"
  details: String!
  "indicates if the proposal was automatically sponsored"
  selfSponsor: Boolean!
  "indicates if the proposal is sponsored"
  sponsored: Boolean!
  "address that sponsored the proposal"
  sponsor: Bytes
  "member entity of the sponsor"
  sponsorMembership: Member
  "transaction hash of the proposal sponsor"
  sponsorTxHash: Bytes
  "unix timestamp of when the proposal was sponsored"
  sponsorTxAt: BigInt
  "indicates if the proposal is cancelled"
  cancelled: Boolean!
  "transaction hash of the cancelled proposal"
  cancelledTxHash: Bytes
  "unix timestamp of when the proposal was cancelled"
  cancelledTxAt: BigInt
  "the address that cancelled the proposal"
  cancelledBy: Bytes
  "indicates if the proposal is processed"
  processed: Boolean!
  "transaction hash of processing the proposal"
  processTxHash: Bytes
  "the unix timestamp of when the proposal was processed"
  processTxAt: BigInt
  "address that processed the proposal"
  processedBy: Bytes
  "indicates if the proposal is processed"
  actionFailed: Boolean!
  "indicates if the proposal passed"
  passed: Boolean!
  "amount of native token that was provided as tribute when the proposal was submitted"
  proposalOffering: BigInt!
  "number of current yes votes"
  yesVotes: BigInt!
  "number of current no votes"
  noVotes: BigInt!
  "amount of current shares that have voted yes"
  yesBalance: BigInt!
  "amount of current shares that have voted no"
  noBalance: BigInt!
  "is currently paasing quorum and has more yes votes than no votes"
  currentlyPassing: Boolean!
  "highest share+loot count during any individual yes vote"
  maxTotalSharesAndLootAtYesVote: BigInt!
  "highest share count during any individual yes vote"
  maxTotalSharesAtYesVote: BigInt!
  "Snapshot of the quorum precent for the DAO when the proposal was sponsored"
  quorumPercentAtSponsor: BigInt
  "the block number when the proposal was executed"
  blockNumberAtExecution: BigInt
  "The following tribute fields will only have values if the proposal was submitted through the trbute minion contract. token address in tribute proposals."
  tributeToken: Bytes
  "amount of tribute token offered"
  tributeOffered: BigInt
  "symbol of the tribute token"
  tributeTokenSymbol: String
  "decimal places of the tribute token"
  tributeTokenDecimals: BigInt
  "applicant submitting the tribute proposal"
  tributeEscrowRecipient: Bytes
  "proposal type derived from the details field"
  proposalType: String
  "proposal title derived from the details field"
  title: String
  "proposal description derived from the details field"
  description: String
  "proposal content URI derived from the details field"
  contentURI: String
  "proposal Content URI type (ipfs hash, url) derived from the details field"
  contentURIType: String
  "votes scoped to this proposal"
  votes: [Vote!] @derivedFrom(field: "proposal")
  record: Record
}

type Vote @entity {
  "unique identifier and primary key of the entity"
  id: ID!
  "transaction hash of the vote"
  txHash: Bytes!
  "block timestamp when the vote was submitted"
  createdAt: BigInt!
  "contract address of the DAO related to this vote"
  daoAddress: Bytes!
  "indicates yes vote/no vote"
  approved: Boolean!
  "shares balance of the voting member at the time of the vote"
  balance: BigInt!
  "related proposal"
  proposal: Proposal!
  "related/voting member"
  member: Member!
}

type Record @entity {
  id: ID!
  createdAt: BigInt!
  createdBy: Bytes!
  dao: Dao!
  tag: Bytes!
  table: String!
  contentType: String!
  content: String!
  queryType: String
  proposals: [Proposal!] @derivedFrom(field: "record")
  parentId: String
}

type Member @entity {
  "unique identifier and primary key of the entity"
  id: ID!
  "block timestamp when the member entity was created (when the address first recieved shares or loot)"
  createdAt: BigInt!
  "transaction where the member was created"
  txHash: Bytes!
  "related dao"
  dao: Dao!
  "address of the member"
  memberAddress: Bytes!
  "current shares held by the member"
  shares: BigInt!
  "current loot held by the member"
  loot: BigInt!
  "total shares, loot and delegate shares, if 0 the member is inactive"
  sharesLootDelegateShares: BigInt!
  "address the member is delegating to"
  delegatingTo: Bytes!
  "subgraph id of member the address is delegating to"
  delegatingToMember: Member
  "the transaction hash when the delegate was last updated"
  lastDelegateUpdateTxHash: Bytes
  "total amount of shares this address votes with (thier own plus delegated shares)"
  delegateShares: BigInt!
  "members this member is delegating too"
  delegateOf: [Member!] @derivedFrom(field: "delegatingToMember")
  "related votes"
  delegateOfCount: BigInt!
  votes: [Vote!] @derivedFrom(field: "member")
}

type RageQuit @entity {
  "unique identifier and primary key of the entity"
  id: ID!
  "block timestamp when the member rage quit"
  createdAt: BigInt!
  "the transaction where the RageQuit occurred"
  txHash: Bytes!
  "related DAO"
  dao: Dao!
  "related member"
  member: Member!
  "address the tokens where rage quit to"
  to: Bytes!
  "number of shares rage quit"
  shares: BigInt!
  "number of loot rage quit"
  loot: BigInt!
  "list of treasury token addresses requested in the rage quit"
  tokens: [Bytes!]!
}

type Shaman @entity {
  "unique identifier and primary key of the entity"
  id: ID!
  "block timestamp when the shaman was added"
  createdAt: BigInt!
  "related DAO"
  dao: Dao!
  "address of the shaman"
  shamanAddress: Bytes!
  "permission level of the shaman (0-7)"
  permissions: BigInt!
}

type EventTransaction @entity {
  "unique identifier and primary key of the entity"
  id: ID!
  "block timestamp of the transaction"
  createdAt: BigInt!
  "related DAO"
  dao: Dao
  daoAddress: Bytes
}

type TokenLookup @entity {
  "unique identifier and primary key of the entity (share or loot token address)"
  id: ID!
  "related DAO"
  dao: Bytes!
}

type Vault @entity {
  "unique identifier and primary key of the entity"
  id: ID!
  "block timestamp of the transaction"
  createdAt: BigInt!
  "related DAO"
  dao: Dao!
  "contract address of the gnosis safe treasury"
  safeAddress: Bytes!
  "indicates if the vault is active"
  active: Boolean!
  "indicates of the funds in the vault are ragequittable"
  ragequittable: Boolean!
  "name assigned when vault is set"
  name: String!
}`;

export const daoQuery = gql`
  query ($first: Int!, $skip: Int!) {
    daos(first: $first, skip: $skip) {
      id
      createdAt
      createdBy
      txHash
      lootAddress
      sharesAddress
      safeAddress
      lootPaused
      sharesPaused
      gracePeriod
      votingPeriod
      votingPlusGraceDuration
      proposalOffering
      quorumPercent
      sponsorThreshold
      minRetentionPercent
      shareTokenName
      shareTokenSymbol
      lootTokenName
      lootTokenSymbol
      totalShares
      totalLoot
      latestSponsoredProposalId
      proposalCount
      activeMemberCount
      name
      existingSafe
      existingSharesAndLoot
      adminLocked
      governorLocked
      managerLocked
      delegatedVaultManager
      baalVersion
      forwarder
      referrer
    }
  }
`;

export const proposalQuery = gql`
  query ($first: Int!, $skip: Int!) {
    proposals(first: $first, skip: $skip) {
      id
      createdAt
      createdBy
      proposedBy
      proposerMembership {
        id
      }
      dao {
        id
      }
      proposalId
      prevProposalId
      txHash
      proposalDataHash
      proposalData
      votingPeriod
      votingStarts
      votingEnds
      gracePeriod
      votingPlusGraceDuration
      graceEnds
      expiration
      expirationQueryField
      actionGasEstimate
      details
      selfSponsor
      sponsored
      sponsor
      sponsorMembership {
        id
      }
      sponsorTxHash
      sponsorTxAt
      cancelled
      cancelledTxHash
      cancelledTxAt
      cancelledBy
      processed
      processTxHash
      processTxAt
      processedBy
      actionFailed
      passed
      proposalOffering
      yesVotes
      noVotes
      yesBalance
      noBalance
      currentlyPassing
      maxTotalSharesAndLootAtYesVote
      maxTotalSharesAtYesVote
      quorumPercentAtSponsor
      blockNumberAtExecution
      tributeToken
      tributeOffered
      tributeTokenSymbol
      tributeTokenDecimals
      tributeEscrowRecipient
      proposalType
      title
      description
      contentURI
      contentURIType
      record {
        id
      }
    }
  }
`;

export const votesQuery = gql`
  query ($first: Int!, $skip: Int!) {
    votes(first: $first, skip: $skip) {
      id
      txHash
      createdAt
      daoAddress
      approved
      balance
      proposal {
        id
      }
      member {
        id
      }
    }
  }
`;

export const rageQuitsQuery = gql`
  query ($first: Int!, $skip: Int!) {
    rageQuits(first: $first, skip: $skip) {
      id
      createdAt
      txHash
      dao {
        id
      }
      member {
        id
      }
      to
      shares
      loot
      tokens
    }
  }
`;

export const shamansQuery = gql`
  query ($first: Int!, $skip: Int!) {
    shamans(first: $first, skip: $skip) {
      id
      createdAt
      dao {
        id
      }
      shamanAddress
      permissions
    }
  }
`;

export const eventTransactionsQuery = gql`
  query ($first: Int!, $skip: Int!) {
    eventTransactions(first: $first, skip: $skip) {
      id
      createdAt
      dao {
        id
      }
      daoAddress
    }
  }
`;
export const tokenLookupsQuery = gql`
  query ($first: Int!, $skip: Int!) {
    tokenLookups(first: $first, skip: $skip) {
      id
      dao
    }
  }
`;

export const vaultsQuery = gql`
  query ($first: Int!, $skip: Int!) {
    vaults(first: $first, skip: $skip) {
      id
      createdAt
      dao {
        id
      }
      safeAddress
      active
      ragequittable
      name
    }
  }
`;

export const membersQuery = gql`
  query ($first: Int!, $skip: Int!) {
    members(first: $first, skip: $skip) {
      id
      createdAt
      txHash
      dao {
        id
      }
      memberAddress
      shares
      loot
      sharesLootDelegateShares
      delegatingTo
      delegatingToMember {
        id
      }
      lastDelegateUpdateTxHash
      delegateShares
      delegateOfCount
    }
  }
`;

export const recordsQuery = gql`
  query ($first: Int!, $skip: Int!) {
    records(first: $first, skip: $skip) {
      id
      createdAt
      createdBy
      dao {
        id
      }
      tag
      table
      contentType
      content
      queryType
      parentId
    }
  }
`;
