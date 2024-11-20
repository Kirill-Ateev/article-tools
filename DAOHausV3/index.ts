import { configDotenv } from 'dotenv';
import { GraphQLClient } from 'graphql-request';
import {
  daoQuery,
  eventTransactionsQuery,
  membersQuery,
  proposalQuery,
  rageQuitsQuery,
  recordsQuery,
  shamansQuery,
  tokenLookupsQuery,
  vaultsQuery,
  votesQuery,
} from './src/constants/constants';
import { MyDatabase } from './src/db/database';

configDotenv();

const client = new GraphQLClient(
  `https://gateway.thegraph.com/api/${process.env.THE_GRAPH_API_KEY}/subgraphs/id/HouDe2pTdyKM9CTG1aodnPPPhm7U148BCH7eJ4HHwpdQ`
);

async function fetchData(query: string, variables: Record<string, any>) {
  return await client.request(query, variables);
}

async function fetchAllEntities(query, entity: string, first = 1000) {
  let skip = 0;
  let results = [];
  let hasMore = true;

  while (hasMore) {
    const data: any = await fetchData(query, { first, skip });
    const entitiesData: never[] = data[entity];
    results.push(...entitiesData);
    skip += data.length;
    hasMore = data.length === first;
  }

  return results;
}

async function main() {
  const db = new MyDatabase();
  await db.init();

  const daos = await fetchAllEntities(daoQuery, 'daos');
  const proposals = await fetchAllEntities(proposalQuery, 'proposals');
  const votes = await fetchAllEntities(votesQuery, 'votes');
  const rageQuits = await fetchAllEntities(rageQuitsQuery, 'rageQuits');
  const eventTransactions = await fetchAllEntities(
    eventTransactionsQuery,
    'eventTransactions'
  );
  const tokenLookups = await fetchAllEntities(
    tokenLookupsQuery,
    'tokenLookups'
  );
  const vaults = await fetchAllEntities(vaultsQuery, 'vaults');
  const shamans = await fetchAllEntities(shamansQuery, 'shamans');
  const members = await fetchAllEntities(membersQuery, 'members');
  const records = await fetchAllEntities(recordsQuery, 'records');

  for await (const dao of daos) {
    await db.addDao(dao);
  }

  for await (const proposal of proposals) {
    await db.addProposal(proposal);
  }

  for await (const vote of votes) {
    await db.addVote(vote);
  }

  for await (const rageQuit of rageQuits) {
    await db.addRageQuit(rageQuit);
  }

  for await (const eventTransaction of eventTransactions) {
    await db.addEventTransaction(eventTransaction);
  }

  for await (const tokenLookup of tokenLookups) {
    await db.addTokenLookup(tokenLookup);
  }

  for await (const vault of vaults) {
    await db.addVault(vault);
  }

  for await (const shaman of shamans) {
    await db.addShaman(shaman);
  }

  for await (const member of members) {
    await db.addMember(member);
  }

  for await (const record of records) {
    await db.addRecord(record);
  }

  console.log('Data stored! Then close DB connection');

  await db.close();
}

main().catch(console.error);
