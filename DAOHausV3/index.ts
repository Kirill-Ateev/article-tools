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
  `https://gateway.thegraph.com/api/${process.env.THE_GRAPH_API_KEY}/subgraphs/id/6x9FK3iuhVFaH9sZ39m8bKB5eckax8sjxooBPNKWWK8r`
);

// Добавить retry при errors
async function fetchData(
  query: string,
  variables: Record<string, any>,
  retries = 1000,
  delay = 1000
): Promise<any> {
  // console.log(query, variables);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await client.request(query, variables);
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, delay)); // Delay before retry
      } else {
        throw new Error(`Failed after ${retries} attempts: ${error.message}`);
      }
    }
  }
}

async function fetchAllEntities(query, entity: string, first = 100) {
  let skip = 0;
  let results = [];
  let hasMore = true;

  while (hasMore) {
    const data: any = await fetchData(query, { first, skip });
    console.log(entity, data[entity].length, first, skip);
    const entitiesData: never[] = data[entity];
    results.push(...entitiesData);
    if (data[entity].length < first) {
      hasMore = false;
      return results;
    } else {
      skip = skip + data[entity].length;
    }
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
