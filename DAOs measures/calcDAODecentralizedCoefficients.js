import fetch from 'node-fetch';
import { Web3 } from 'web3';

// Собираем on-chain данные DAO блокчейна Ethereum через субграфы Messari, используя сервис The Graph
// Используя библиотеку web3, собираем только адреса являющимися аккаунтами с внешним владением (EOA) или другими словами обычными адресами кошельков.
// Высчитываем коэфициенты Накамото и Джини, Herfindahl-Hirschman Index (HHI), Theil Index, Shannon entropy, Simpson's Diversity Index для держателей токенов и держателей токенов, учитывая делегатов

// Collect on-chain data of Ethereum blockchain DAOs via Messari subgraphs using The Graph service
// Using the web3 library, collect only addresses that are external owned accounts (EOA) or in other words, regular wallet addresses.
// Calculate Nakamoto and Gini coefficients, Herfindahl-Hirschman Index (HHI), Theil Index, Shannon entropy, Simpson's Diversity Index for token holders and token holders, taking into account delegates

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

// GraphQL Endpoint - replace with your subgraph URL (for example choose one from list above)
const GRAPHQL_ENDPOINT = `https://api.thegraph.com/subgraphs/name/messari/${daoList[choosedDaoIndex].name}-governance`;

const web3 = new Web3('https://eth.llamarpc.com');

const TOTAL_VOTING_POWER = daoList[choosedDaoIndex].maxSupply;

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

// Function to check if an address is an EOA with retry logic
async function isEOA(address) {
  let success = false;
  let attempts = 0;

  while (!success) {
    try {
      const code = await web3.eth.getCode(address);
      if (code === '0x') {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      attempts++;
      console.log(`Retrying isEOA for address ${address}, attempt ${attempts}`);
    }
  }
}

async function filterEOAs(entities) {
  const filtered = [];
  for (const entity of entities) {
    if (entity.isEOA) {
      console.log('Adress already checked: ', entity);
      filtered.push(entity);
    } else if (await isEOA(entity.id)) {
      filtered.push(entity);
    }
  }
  return filtered;
}

// Function to calculate the Gini Coefficient using TOTAL_VOTING_POWER
function calculateGiniCoefficient(entities) {
  if (entities.length === 0) {
    return 0;
  }

  // Sort the entities by voting power in ascending order
  entities.sort((a, b) => a.votingPower - b.votingPower);

  // Cumulative sum of the entities' voting power and sum of their relative positions
  let cumulativeSum = 0;
  let relativePositionSum = 0;

  entities.forEach((entity, index) => {
    cumulativeSum += entity.votingPower;
    relativePositionSum += cumulativeSum;
  });

  // Gini Coefficient formula adjusted for TOTAL_VOTING_POWER
  return (
    (TOTAL_VOTING_POWER * entities.length - 2 * relativePositionSum) /
    (entities.length * TOTAL_VOTING_POWER)
  );
}

// Function to calculate the Herfindahl-Hirschman Index (HHI)
function calculateHHI(entities) {
  if (entities.length === 0 || TOTAL_VOTING_POWER === 0) {
    return 0;
  }

  let hhi = 0;
  for (let entity of entities) {
    let share = entity.votingPower / TOTAL_VOTING_POWER;
    hhi += share * share;
  }

  return hhi * 10000; // HHI is often expressed in terms of points (the scale is multiplied by 10,000)
}

// Function to calculate the Theil Index
function calculateTheilIndex(entities) {
  if (entities.length === 0 || TOTAL_VOTING_POWER === 0) {
    return 0;
  }

  let theilIndex = 0;
  for (let entity of entities) {
    let share = entity.votingPower / TOTAL_VOTING_POWER;
    if (share > 0) {
      // Avoid division by zero or log of zero
      theilIndex += share * Math.log(share);
    }
  }

  return -theilIndex; // Theil index is the negative sum of these values
}

// Fetch entities with their voting power
async function fetchVotingEntities(entityName, votingPowerField) {
  let entities = [];
  let lastId = '';
  let hasMore = true;

  while (hasMore) {
    const query = `
        {
          ${entityName}(first: 1000, where: { id_gt: "${lastId}" }, orderBy: ${votingPowerField}, orderDirection: desc) {
            id
            ${votingPowerField}
          }
        }
      `;
    const result = await graphqlQuery(query);
    const fetchedEntities = result.data[entityName];

    for (const e of fetchedEntities) {
      const isEOAStatus = await isEOA(e.id);
      console.log(isEOAStatus);
      entities.push({
        id: e.id,
        votingPower: parseFloat(e[votingPowerField]),
        isEOA: isEOAStatus, // EOA flag
      });
    }

    if (fetchedEntities.length < 1000) {
      hasMore = false;
    } else {
      console.log(fetchedEntities.length);
      lastId = fetchedEntities[fetchedEntities.length - 1].id;
    }
  }

  return entities;
}

// Function to calculate Shannon entropy
function calculateEntropy(entities) {
  if (entities.length === 0 || TOTAL_VOTING_POWER === 0) {
    return 0;
  }

  let entropy = 0;
  for (let entity of entities) {
    let share = entity.votingPower / TOTAL_VOTING_POWER;
    if (share > 0) {
      // Avoid log of zero
      entropy += -share * Math.log2(share);
    }
  }

  return entropy;
}

// Function to calculate Simpson's Diversity Index
function calculateSimpsonsDiversityIndex(entities) {
  if (entities.length === 0 || TOTAL_VOTING_POWER === 0) {
    return 0;
  }

  let sumOfSquares = 0;
  for (let entity of entities) {
    let proportion = entity.votingPower / TOTAL_VOTING_POWER;
    sumOfSquares += proportion * proportion;
  }

  return 1 - sumOfSquares;
}

// Fetch delegates and their represented tokenHolders' balances
async function fetchDelegatesVotingStrength() {
  let delegates = [];
  let lastId = '';
  let hasMore = true;

  while (hasMore) {
    const query = `
        {
          delegates(first: 1000, where: { id_gt: "${lastId}" }) {
            id,
            tokenHoldersRepresented {
              id,
              tokenBalance
            }
          }
        }
      `;
    const result = await graphqlQuery(query);
    const fetchedDelegates = result.data.delegates;

    for (const delegate of fetchedDelegates) {
      const votingStrength = delegate.tokenHoldersRepresented.reduce(
        (acc, th) => acc + parseFloat(th.tokenBalance),
        0
      );
      delegates.push({ id: delegate.id, votingStrength });
    }

    if (fetchedDelegates.length < 1000) {
      hasMore = false;
    } else {
      lastId = fetchedDelegates[fetchedDelegates.length - 1].id;
    }
  }

  return delegates;
}

// Calculate Nakamoto Coefficient
function calculateNakamotoCoefficient(entities) {
  let totalVotingPower = TOTAL_VOTING_POWER;

  console.log('total?', totalVotingPower, GRAPHQL_ENDPOINT);
  let cumulativeVotingPower = 0;
  let nakamotoCoefficient = 0;

  for (let entity of entities) {
    cumulativeVotingPower += entity.votingPower;
    nakamotoCoefficient++;
    if (cumulativeVotingPower > totalVotingPower * 0.5) {
      break;
    }
  }

  return nakamotoCoefficient;
}

// Main function to get data and calculate coefficients
async function calculateCoefficients() {
  try {
    const tokenHolders = await fetchVotingEntities(
      'tokenHolders',
      'tokenBalance'
    );
    const delegates = await fetchDelegatesVotingStrength();

    // Convert token holders list to a map for easy access
    const tokenHoldersMap = new Map(tokenHolders.map((th) => [th.id, th]));

    // Iterate over delegates and add their voting strength to the tokenHoldersMap
    for (const delegate of delegates) {
      if (tokenHoldersMap.has(delegate.id)) {
        // If delegate is also a token holder, add the voting strength
        tokenHoldersMap.get(delegate.id).votingPower += delegate.votingStrength;
      } else {
        // If delegate is not in the token holders list, add them separately
        tokenHoldersMap.set(delegate.id, {
          id: delegate.id,
          votingPower: delegate.votingStrength,
        });
      }
    }

    // Convert the map back to an array
    const mergedEntities = Array.from(tokenHoldersMap.values()).sort(
      (a, b) => b.votingPower - a.votingPower
    );

    // console.log('mergedEntities', mergedEntities);

    const EOAtokenHolders = await filterEOAs(tokenHolders);
    const EOAmergedEntities = await filterEOAs(mergedEntities);

    const nakamotoCoefficientTokenHolders =
      calculateNakamotoCoefficient(EOAtokenHolders);
    const nakamotoCoefficientWithDelegates =
      calculateNakamotoCoefficient(EOAmergedEntities);

    console.log(
      'Nakamoto Coefficient for Token Holders: ',
      nakamotoCoefficientTokenHolders
    );
    console.log(
      'Nakamoto Coefficient with Delegates: ',
      nakamotoCoefficientWithDelegates
    );

    const tokenHoldersGiniCoefficient =
      calculateGiniCoefficient(EOAtokenHolders);
    const withDelegatesGiniCoefficient =
      calculateGiniCoefficient(EOAmergedEntities);

    console.log(
      'Gini Coefficient of token holders: ',
      tokenHoldersGiniCoefficient
    );
    console.log(
      'Gini Coefficient of token holders with delegates: ',
      withDelegatesGiniCoefficient
    );

    const tokenHoldersHHI = calculateHHI(EOAtokenHolders);
    const withDelegatesHHI = calculateHHI(EOAmergedEntities);

    console.log(
      'Herfindahl-Hirschman Index (HHI) of token holders: ',
      tokenHoldersHHI
    );
    console.log(
      'Herfindahl-Hirschman Index (HHI) of token holders with delegates: ',
      withDelegatesHHI
    );

    const tokenHoldersTheilIndex = calculateTheilIndex(EOAtokenHolders);
    const withDelegatesTheilIndex = calculateTheilIndex(EOAmergedEntities);

    console.log('Theil Index of token holders: ', tokenHoldersTheilIndex);
    console.log(
      'Theil Index of token holders with delegates: ',
      withDelegatesTheilIndex
    );

    const TokenHoldersEntropy = calculateEntropy(EOAtokenHolders);
    const withDelegatesEntropy = calculateEntropy(EOAmergedEntities);

    console.log('Shannon entropy of token holders: ', TokenHoldersEntropy);
    console.log(
      'Shannon entropy of token holders with delegates: ',
      withDelegatesEntropy
    );

    const TokenHoldersSimpsonsDiversityIndex =
      calculateSimpsonsDiversityIndex(EOAtokenHolders);
    const withDelegatesDiversityIndex =
      calculateSimpsonsDiversityIndex(EOAmergedEntities);

    console.log(
      "Simpson's Diversity Index of token holders: ",
      TokenHoldersSimpsonsDiversityIndex
    );
    console.log(
      "Simpson's Diversity Index of token holders with delegates: ",
      withDelegatesDiversityIndex
    );
  } catch (error) {
    console.error(error);
  }
}

calculateCoefficients();
