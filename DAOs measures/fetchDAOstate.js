// Собираем on-chain данные состояния DAO

// Collect on-chain DAO state data

const daoList = [
  { name: 'uniswap', maxSupply: 1000000000 },
  { name: 'compound', maxSupply: 10000000 },
  { name: 'ens', maxSupply: 100000000 },
  { name: 'gitcoin', maxSupply: 100000000 },
  { name: 'dydx', maxSupply: 1000000000 },
  { name: 'angle', maxSupply: 1000000000 },
  { name: 'cryptex', maxSupply: 10000000 },
];
const choosedDaoIndex = 0;

// GraphQL Endpoint - replace with your subgraph URL
const GRAPHQL_ENDPOINT = `https://api.thegraph.com/subgraphs/name/messari/${daoList[choosedDaoIndex].name}-governance`;

// Function to perform a GraphQL query
async function graphqlQuery(query) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  return response.json();
}

// Function to count entities by paginating through them
async function countEntities(entityName, withNonZeroBalance) {
  let count = 0;
  let lastId = '';
  let hasMore = true;

  while (hasMore) {
    const query = `
        {
            ${entityName}(first: 1000, where: { id_gt: "${lastId}" ${
      withNonZeroBalance ? ', tokenBalance_not: 0' : ''
    } }) {
                id
            }
        }
        `;
    const result = await graphqlQuery(query);
    const entities = result.data[entityName];

    count += entities.length;
    if (entities.length < 1000) {
      hasMore = false;
    } else {
      lastId = entities[entities.length - 1].id;
    }
  }

  return count;
}

// Get counts for tokenHolders and output them
async function getCounts() {
  try {
    const allTokenHoldersCount = await countEntities('tokenHolders');
    const tokenHoldersWithBalancesCount = await countEntities(
      'tokenHolders',
      true
    );
    const transfersCount = await countEntities('transfers');
    const delegatesCount = await countEntities('delegates');
    const votesCount = await countEntities('votes');
    const proposalsCount = await countEntities('proposals');

    console.log(`All token Holders: ${allTokenHoldersCount}`);
    console.log(`Current Token Holders: ${tokenHoldersWithBalancesCount}`);
    console.log(`Token Transfers: ${transfersCount}`);
    console.log(`Votings: ${votesCount}`);
    console.log(`Delegates: ${delegatesCount}`);
    console.log(`Proposals: ${proposalsCount}`);
    // Output counts for other entities
  } catch (error) {
    console.error(error);
  }
}

getCounts();
