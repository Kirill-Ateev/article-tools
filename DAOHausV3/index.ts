import { configDotenv } from 'dotenv';
import { GraphQLClient, gql } from 'graphql-request';
import { MyDatabase } from './src/db/database';

configDotenv();

const client = new GraphQLClient(
  `https://gateway.thegraph.com/api/${process.env.THE_GRAPH_API_KEY}/subgraphs/id/HouDe2pTdyKM9CTG1aodnPPPhm7U148BCH7eJ4HHwpdQ`
);

async function fetchData(query: string) {
  return await client.request(query);
}

async function main() {
  const db = new MyDatabase();
  db.init();

  // Example query based on schema
  const systemStateQuery = gql`
    query {
      systemState(id: "current") {
        id
        registryContract
        contractCount
        gaugeCount
        gaugeTypeCount
        poolCount
        tokenCount
        totalPoolCount
        updated
        updatedAtBlock
        updatedAtTransaction
      }
    }
  `;

  const data = await fetchData(systemStateQuery);
  //   await saveSystemState(data.systemState, db);

  // Repeat for other entities...

  await db.close();
}

main().catch(console.error);
