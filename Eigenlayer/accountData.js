import fs from 'fs';
import fetch from 'node-fetch';

// Собираем on-chain данные аккаунтов EigenLayer
// Получаем accountData.json

// GraphQL Endpoint - replace with your subgraph URL
const GRAPHQL_ENDPOINT = `https://api.thegraph.com/subgraphs/name/messari/eigenlayer-ethereum`;

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

// Function to retrieve all account data
async function getAccountsData() {
  let lastId = '';
  let hasMore = true;
  let accounts = [];

  while (hasMore) {
    const query = `
        {
            accounts(first: 1000, where: { id_gt: "${lastId}" }) {
                id
                pools {
                  id
                  name
                  type
                  active
                  createdTimestamp
                  createdBlockNumber
                  totalValueLockedUSD
                  cumulativeSupplySideRevenueUSD
                  cumulativeProtocolSideRevenueUSD
                  cumulativeTotalRevenueUSD
                  inputTokenBalancesUSD
                  outputTokenSupply
                  outputTokenPriceUSD
                  rewardTokenEmissionsUSD
                }
                poolBalances
                poolBalancesUSD
                deposits {
                  id
                  hash
                  logIndex
                  to
                  from
                  depositor
                  pool {
                    id
                    name
                  }
                  token {
                    id
                    name
                    symbol
                    decimals
                    lastPriceUSD
                  }
                  shares
                  amount
                  amountUSD
                  blockNumber
                  timestamp
                }
                withdrawsQueued {
                  id
                  hash
                  logIndex
                  to
                  from
                  depositor
                  withdrawer
                  delegatedTo
                  withdrawalRoot
                  nonce
                  pool {
                    id
                    name
                  }
                  token {
                    id
                    name
                    symbol
                    decimals
                    lastPriceUSD
                  }
                  shares
                  amount
                  amountUSD
                  hashCompleted
                  completed
                  blockNumber
                  blockNumberCompleted
                  timestamp
                }
                withdrawsCompleted {
                  id
                  hash
                  logIndex
                  to
                  from
                  depositor
                  withdrawer
                  delegatedTo
                  withdrawalRoot
                  nonce
                  pool {
                    id
                    name
                  }
                  token {
                    id
                    name
                    symbol
                    decimals
                    lastPriceUSD
                  }
                  shares
                  amount
                  amountUSD
                  hashCompleted
                  completed
                  blockNumber
                  blockNumberCompleted
                  timestamp
                }
                _hasWithdrawnFromPool
            }
        }
        `;
    const result = await graphqlQuery(query);
    const fetchedAccounts = result.data.accounts;

    accounts = accounts.concat(fetchedAccounts);
    if (fetchedAccounts.length < 1000) {
      hasMore = false;
    } else {
      lastId = fetchedAccounts[fetchedAccounts.length - 1].id;
    }
  }

  return accounts;
}

// Write data to JSON file
async function writeAccountsToFile() {
  try {
    const accounts = await getAccountsData();
    fs.writeFileSync(
      'accountsData.json',
      JSON.stringify(accounts, null, 2),
      'utf-8'
    );
    console.log('Accounts data has been written to accountsData.json');
  } catch (error) {
    console.error('Failed to write accounts data to file:', error);
  }
}

// Execute the function
writeAccountsToFile();
