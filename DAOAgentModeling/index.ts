import { exp, floor, log2, max, mean, pow, random } from 'mathjs';

// Константы моделирования
const COGNITIVE_LIMITS = {
  MAX_MEMORY_LENGTH: 7,
  DECISION_NOISE: 0.15,
  LEARNING_RATE: 0.25,
  EXPLORATION_RATE: 0.12,
  MIN_UTILITY_THRESHOLD: -0.3,
};

const DAO_CONFIG = {
  QUORUM_LEVEL: 0.6,
};

// Утилиты для работы с вероятностями
class ProbabilityUtils {
  static softmax(values, temperature = 1.0) {
    const exps = values.map((v) => exp(v / temperature));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map((exp) => exp / sum);
  }

  static sampleFromDistribution(probabilities) {
    const rand = random();
    let sum = 0;
    for (let i = 0; i < probabilities.length; i++) {
      sum += probabilities[i];
      if (rand < sum) return i;
    }
    return probabilities.length - 1;
  }

  static shannonEntropy(probabilities) {
    return probabilities.reduce(
      (acc, p) => (p > 0 ? acc - p * log2(p) : acc),
      0
    );
  }
}

// Класс для представления убеждений агента
class Beliefs {
  strategyEffectiveness: {
    [strategy: string]: { alpha: number; beta: number };
  };

  constructor() {
    this.strategyEffectiveness = {
      honest: { alpha: 1, beta: 1 }, // Uniform prior
      opportunistic: { alpha: 1, beta: 1 },
      contrarian: { alpha: 1, beta: 1 },
      abstainer: { alpha: 1, beta: 1 },
    };
  }

  // Упрощенное байесовское обновление
  update(strategy: string, outcome: any) {
    const effectiveness = this.strategyEffectiveness[strategy];
    if (outcome.utility > COGNITIVE_LIMITS.MIN_UTILITY_THRESHOLD) {
      effectiveness.alpha += 1;
    } else {
      effectiveness.beta += 1;
    }
  }

  // Ожидаемая эффективность стратегии
  getStrategyEffectiveness(strategy: string): number {
    const { alpha, beta } = this.strategyEffectiveness[strategy];
    return alpha / (alpha + beta);
  }

  // Неопределенность в оценке стратегии
  getStrategyUncertainty(strategy: string): number {
    const { alpha, beta } = this.strategyEffectiveness[strategy];
    const total = alpha + beta;
    return (alpha * beta) / (total * total * (total + 1));
  }
}

class BoundedRationalAgent {
  id: any;
  tokens: any;
  type: any;
  currentStrategy: any;
  beliefs: Beliefs;
  utility: number;
  votingHistory: any[];
  learningHistory: any[];
  collusionGroup: null;
  riskAversion: any;
  cognitiveLoad: any;
  socialInfluenceFactor: any;
  explorationRate: number;
  decisionNoise: number;
  participationCost: number;
  votingCost: number;
  constructor(id, tokens, initialStrategy, type) {
    this.id = id;
    this.tokens = tokens;
    this.type = type; // 'honest', 'opportunistic', 'contrarian', 'abstainer'
    this.currentStrategy = initialStrategy;
    this.beliefs = new Beliefs();
    this.utility = 0;
    this.votingHistory = [];
    this.learningHistory = [];
    this.collusionGroup = null;

    // Параметры ограниченной рациональности
    this.riskAversion = random(0.2, 0.8);
    this.cognitiveLoad = random(0.1, 0.6);
    this.socialInfluenceFactor = random(0.05, 0.4);
    this.explorationRate =
      COGNITIVE_LIMITS.EXPLORATION_RATE * (1 - this.cognitiveLoad);
    this.decisionNoise = COGNITIVE_LIMITS.DECISION_NOISE * this.cognitiveLoad;

    // Экономические параметры
    this.participationCost = 0.01 * tokens;
    this.votingCost = 0.005 * tokens;
  }

  decideAction(proposal, socialContext) {
    if (random() < this.cognitiveLoad && proposal.complexity > 0.6) {
      return { vote: 'abstain', weight: 0 };
    }

    // Учет социального влияния
    let socialBias = 0;
    if (socialContext.influentialAgents[this.id]) {
      socialBias =
        this.socialInfluenceFactor *
        socialContext.influentialAgents[this.id].sentiment;
    }

    // Стратегическое поведение
    let action;
    switch (this.currentStrategy) {
      case 'honest':
        action = proposal.expectedUtility > 0 ? 'yes' : 'no';
        break;
      case 'opportunistic':
        const exploit = proposal.expectedUtility * this.tokens;
        const explore = random() > 0.5 ? 'yes' : 'no';
        action = exploit > this.votingCost ? 'yes' : explore;
        break;
      case 'contrarian':
        action = proposal.expectedUtility > 0 ? 'no' : 'yes';
        break;
      case 'abstainer':
        return { vote: 'abstain', weight: 0 };
      default:
        action = 'abstain';
    }

    // Применение шума и социального влияния
    if (random() < this.decisionNoise + socialBias) {
      const actions = ['yes', 'no', 'abstain'];
      action = actions[floor(random() * actions.length)];
    }

    // Оценка затрат
    const cost = action !== 'abstain' ? this.votingCost : 0;
    this.utility -= cost;

    return {
      vote: action,
      weight: this.tokens,
      strategy: this.currentStrategy,
    };
  }

  updateFromExperience(proposal, action, outcome) {
    // Байесовское обновление убеждений (упрощенное)
    this.beliefs.update(this.currentStrategy, outcome);

    // Обновление полезности с учетом результата
    const utilityImpact =
      outcome.passed && action === 'yes'
        ? outcome.utility
        : !outcome.passed && action === 'no'
        ? -outcome.utility
        : 0;

    this.utility += utilityImpact - this.participationCost;

    // Адаптация стратегии с учетом неопределенности
    const strategies = Object.keys(this.beliefs.strategyEffectiveness);
    const strategyUtilities = strategies.map((s) => {
      const effectiveness = this.beliefs.getStrategyEffectiveness(s);
      const uncertainty = this.beliefs.getStrategyUncertainty(s);

      // Учет неопределенности и риска
      return (
        effectiveness * (1 - this.riskAversion) -
        uncertainty * this.riskAversion
      );
    });

    // Исследование vs эксплуатация
    if (random() < this.explorationRate) {
      this.currentStrategy = strategies[floor(random() * strategies.length)];
    } else {
      const bestStrategyIndex = strategyUtilities.indexOf(
        max(...strategyUtilities)
      );
      this.currentStrategy = strategies[bestStrategyIndex];
    }
  }
}

class DAOSimulation {
  agents: any[];
  proposals: any[];
  metrics: {
    consensusTime: any[];
    participationRate: any[];
    costEfficiency: any[];
    resilience: { collusion: number; attacks: number; noise: number };
    diversity: { strategy: any[]; token: number[]; shannon: number[] };
    collusionGroups: Map<any, any>;
  };
  totalTokens: number;
  socialNetwork: { nodes: number[]; edges: any[]; influentialAgents: {} };
  constructor(params) {
    this.agents = [];
    this.proposals = [];
    this.metrics = {
      consensusTime: [],
      participationRate: [],
      costEfficiency: [],
      resilience: { collusion: 0, attacks: 0, noise: 0 },
      diversity: { strategy: [], token: [], shannon: [] },
      collusionGroups: new Map(),
    };
    this.totalTokens = params.totalTokens;
    this.initializeAgents(params);
    this.socialNetwork = this.generateSocialNetwork(params.numAgents);
  }

  initializeAgents(params) {
    // Распределение токенов по закону Парето
    const paretoDistribution = Array.from(
      { length: params.numAgents },
      (_, i) => floor(this.totalTokens * Number(pow(i + 1, -1.5)))
    );

    const totalDistributed = paretoDistribution.reduce((a, b) => a + b, 0);
    const scalingFactor = this.totalTokens / totalDistributed;

    for (let i = 0; i < params.numAgents; i++) {
      const tokens = floor(paretoDistribution[i] * scalingFactor);
      const type = this.assignAgentType(i, params.numAgents);
      let strategy;
      if (type === 'malicious') {
        strategy = random() > 0.5 ? 'contrarian' : 'opportunistic';
      } else if (type === 'abstainer') {
        strategy = 'abstainer';
      } else {
        strategy = 'honest';
      }

      const agent = new BoundedRationalAgent(i, tokens, strategy, type);
      this.agents.push(agent);
    }

    // Создание групп сговора
    this.formCollusionGroups(0.2); // 20% агентов в сговорах
  }

  assignAgentType(index, totalAgents) {
    // Первые 10% - потенциально злоумышленники
    if (index < totalAgents * 0.1) return 'malicious';
    // Следующие 20% - абсентеисты
    if (index < totalAgents * 0.3) return 'abstainer';
    // Остальные - честные
    return 'honest';
  }

  formCollusionGroups(fraction) {
    const groupSize = 5;
    const numGroups = floor((this.agents.length * fraction) / groupSize);

    for (let i = 0; i < numGroups; i++) {
      const group = new Set();
      const groupId = `collusion-${i}`;

      for (let j = 0; j < groupSize; j++) {
        const agentIndex = floor(random() * this.agents.length);
        const agent = this.agents[agentIndex];

        if (!agent.collusionGroup) {
          agent.collusionGroup = groupId;
          group.add(agentIndex);
        }
      }

      this.metrics.collusionGroups.set(groupId, group);
    }
  }

  generateSocialNetwork(numAgents) {
    const network: any = {
      nodes: Array.from({ length: numAgents }, (_, i) => i),
      edges: [],
      influentialAgents: {},
    };

    // Создание случайных связей (малый мир)
    for (let i = 0; i < numAgents; i++) {
      for (let j = i + 1; j < numAgents; j++) {
        if (random() < 0.05) {
          network.edges.push({
            source: i,
            target: j,
            weight: random(0.1, 0.9),
          });
        }
      }
    }

    // Выявление влиятельных агентов (top 10% по токенам)
    const sortedAgents = [...this.agents].sort((a, b) => b.tokens - a.tokens);
    const topInfluencers = sortedAgents.slice(0, floor(numAgents * 0.1));

    topInfluencers.forEach((agent) => {
      network.influentialAgents[agent.id] = {
        sentiment: random(-0.5, 0.5),
        influence: agent.tokens / this.totalTokens,
      };
    });

    return network;
  }

  runVotingRound(proposal) {
    const votes = { yes: 0, no: 0, abstain: 0 };
    const voteDetails: any[] = [];
    const agentDecisions: string[] = []; // Храним решения агентов
    let roundStart = Date.now();

    // Сбор голосов с учетом социального контекста
    this.agents.forEach((agent) => {
      const socialContext = {
        network: this.socialNetwork,
        influentialAgents: this.socialNetwork.influentialAgents,
      };

      const decision = agent.decideAction(proposal, socialContext);
      votes[decision.vote] += decision.weight;
      agentDecisions.push(decision.vote); // Сохраняем решение
      voteDetails.push({
        agentId: agent.id,
        vote: decision.vote,
        strategy: decision.strategy,
        tokens: agent.tokens,
      });
    });

    // Определение результата с кворумом (30%)
    const totalVoted = votes.yes + votes.no;
    const quorum = this.totalTokens * DAO_CONFIG.QUORUM_LEVEL;
    const passed = totalVoted >= quorum ? votes.yes > votes.no : false;

    // Расчет полезности результата
    const outcomeUtility = passed
      ? proposal.expectedUtility * this.totalTokens * 0.01 // 1% от общего капитала
      : -proposal.expectedUtility * this.totalTokens * 0.005;

    const outcome: any = {
      passed,
      participation: totalVoted / this.totalTokens,
      utility: outcomeUtility,
      voteDistribution: { ...votes },
      details: voteDetails,
      consensusTime: Date.now() - roundStart,
    };

    // Обновление агентов с их ЛИЧНЫМИ решениями
    this.agents.forEach((agent, idx) => {
      agent.updateFromExperience(proposal, agentDecisions[idx], outcome);
    });

    this.updateMetrics(outcome, proposal);
    return outcome;
  }

  updateMetrics(outcome, proposal) {
    // Метрики издержек
    this.metrics.consensusTime.push(outcome.consensusTime);
    this.metrics.participationRate.push(outcome.participation);

    const costEfficiency =
      outcome.utility /
      (outcome.voteDistribution.yes + outcome.voteDistribution.no);
    this.metrics.costEfficiency.push(costEfficiency);

    // Метрики устойчивости
    if (proposal.isMalicious) {
      this.metrics.resilience.attacks += outcome.passed ? 0 : 1;
    }

    // Анализ сговора
    let collusionDetected = false;
    this.metrics.collusionGroups.forEach((group, groupId) => {
      let groupVotes = { yes: 0, no: 0 };
      group.forEach((agentId) => {
        const vote = outcome.details.find((d) => d.agentId === agentId)?.vote;
        if (vote === 'yes' || vote === 'no') groupVotes[vote]++;
      });

      if (groupVotes.yes > 0 && groupVotes.yes / group.size > 0.8) {
        collusionDetected = true;
        this.metrics.resilience.collusion += outcome.passed ? 1 : 0;
      }
    });

    // Метрики разнообразия
    const strategyDistribution = this.agents.reduce((acc, agent) => {
      acc[agent.currentStrategy] = (acc[agent.currentStrategy] || 0) + 1;
      return acc;
    }, {});

    this.metrics.diversity.strategy.push(strategyDistribution);

    // Индекс Шеннона для распределения голосов
    const totalVotes =
      outcome.voteDistribution.yes +
      outcome.voteDistribution.no +
      outcome.voteDistribution.abstain;

    const voteProbs = [
      outcome.voteDistribution.yes / totalVotes,
      outcome.voteDistribution.no / totalVotes,
      outcome.voteDistribution.abstain / totalVotes,
    ];

    // Gini коэффициент для токенов для каждого раунда
    const tokenValues = this.agents.map((a) => a.tokens).sort((a, b) => a - b);
    const n = tokenValues.length;
    const gini =
      tokenValues.reduce((acc, x, i) => acc + (2 * i - n + 1) * x, 0) /
      (n * tokenValues.reduce((a, b) => a + b, 0));

    // Shanon энтропия голосования для каждого раунда
    const voteShannon = ProbabilityUtils.shannonEntropy(voteProbs);
    outcome.voteShannon = voteShannon; // Добавляем в outcome

    // Сохраняем в метриках
    this.metrics.diversity.shannon.push(voteShannon);
    this.metrics.diversity.token.push(gini);
  }

  simulate(numProposals, scenarios) {
    const results: any[] = [];

    for (let i = 0; i < numProposals; i++) {
      const scenario = scenarios[i % scenarios.length];

      // Генерация предложения с случайными параметрами
      const proposal = {
        id: i,
        expectedUtility: random(-1, 1),
        complexity: random(0.3, 0.9),
        quality: ['Poor', 'Average', 'Good'][floor(random(0, 2.99))],
        isMalicious: i % 10 === 0,
        ...scenario,
      };

      this.proposals.push(proposal);
      const outcome = this.runVotingRound(proposal);

      // Монте-Карло анализ стабильности
      const stabilityResults: number[] = [];
      const numSamples = 500;

      // Проводим множество симуляций для анализа стабильности
      for (let j = 0; j < numSamples; j++) {
        const noiseFactor = random(0.8, 1.2);
        const noisyOutcome = {
          ...outcome,
          utility: outcome.utility * noiseFactor,
        };
        stabilityResults.push(noisyOutcome.passed === outcome.passed ? 1 : 0);
      }

      // Вычисляем среднее значение стабильности
      const stability = mean(stabilityResults);

      results.push({
        proposal,
        outcome,
        stability,
      });
    }

    return this.calculateFinalMetrics(results);
  }

  calculateFinalMetrics(results) {
    // Анализ снижения издержек
    const avgConsensusTime = mean(this.metrics.consensusTime);
    const avgParticipation = mean(this.metrics.participationRate);
    const avgCostEfficiency = mean(this.metrics.costEfficiency);

    // Анализ устойчивости
    const resilienceRate =
      (this.metrics.resilience.attacks + this.metrics.resilience.collusion) /
      (results.filter((r) => r.proposal.isMalicious).length +
        this.metrics.collusionGroups.size);

    // Анализ разнообразия
    const strategyDiversity = ProbabilityUtils.shannonEntropy(
      Object.values(this.metrics.diversity.strategy.slice(-1)[0])
    );

    return {
      costReduction: {
        avgConsensusTime,
        avgParticipation,
        avgCostEfficiency,
        trend: this.calculateTrend(this.metrics.costEfficiency),
      },
      resilience: {
        rate: resilienceRate,
        collusionResistance:
          1 -
          this.metrics.resilience.collusion / this.metrics.collusionGroups.size,
        attackResistance:
          this.metrics.resilience.attacks /
          results.filter((r) => r.proposal.isMalicious).length,
        noiseStability: mean(results.map((r) => r.stability)),
      },
      diversity: {
        tokenGini: mean(this.metrics.diversity.token),
        strategyShannon: strategyDiversity,
        voteShannon: mean(results.map((r) => r.outcome.voteShannon)),
        meanShanon: mean(this.metrics.diversity.shannon),
      },
      agentEvolution: this.agents.map((a) => ({
        id: a.id,
        finalStrategy: a.currentStrategy,
        utility: a.utility,
        explorationRate: a.explorationRate,
      })),
    };
  }

  calculateTrend(data, windowSize = 5) {
    if (data.length < windowSize) return 0;
    const slopes: number[] = [];
    for (let i = windowSize; i < data.length; i++) {
      const window = data.slice(i - windowSize, i);
      const x = window.map((_, j) => j);
      const y = window;
      const slope = this.linearRegressionSlope(x, y);
      slopes.push(slope);
    }
    return mean(slopes);
  }

  linearRegressionSlope(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
    const sumXSq = x.reduce((acc, val) => acc + val * val, 0);
    return (n * sumXY - sumX * sumY) / (n * sumXSq - sumX * sumX);
  }
}

// Пример использования
const runFullSimulation = () => {
  const params = {
    numAgents: 150,
    totalTokens: 1_000_000,
    simulationRounds: 1000,
  };

  const scenarios = [
    { complexity: 0.2, expectedUtility: random(0.7, 1.0) }, // Простое полезное
    { complexity: 0.6, expectedUtility: random(-0.2, 0.5) }, // Среднее
    { complexity: 0.8, expectedUtility: random(-1.0, 0.2) }, // Сложное
    { complexity: 0.9, expectedUtility: random(-1.0, -0.5), isMalicious: true }, // Атака
  ];

  const simulation = new DAOSimulation(params);
  const results = simulation.simulate(params.simulationRounds, scenarios);

  console.log('\n=== Результаты симуляции DAO ===');
  console.log('\nПараметры:');
  console.log(`- Количество агентов: ${params.numAgents}`);
  console.log(`- Количество токенов управления: ${params.totalTokens}`);
  console.log(`- Количество симуляций: ${params.simulationRounds}`);
  console.log('\nСнижение издержек:');
  console.log(
    `- Среднее время консенсуса: ${results.costReduction.avgConsensusTime.toFixed(
      2
    )} мс`
  );
  console.log(
    `- Уровень участия: ${(
      results.costReduction.avgParticipation * 100
    ).toFixed(1)}%`
  );
  console.log(
    `- Эффективность затрат: ${results.costReduction.avgCostEfficiency.toFixed(
      4
    )}`
  );
  console.log(
    `- Тренд эффективности: ${results.costReduction.trend.toFixed(4)}`
  );

  console.log('\nУстойчивость:');
  console.log(
    `- Общий уровень устойчивости: ${(results.resilience.rate * 100).toFixed(
      1
    )}%`
  );
  console.log(
    `- Устойчивость к сговорам: ${(
      results.resilience.collusionResistance * 100
    ).toFixed(1)}%`
  );
  console.log(
    `- Устойчивость к атакам: ${(
      results.resilience.attackResistance * 100
    ).toFixed(1)}%`
  );
  console.log(
    `- Стабильность к шуму: ${(results.resilience.noiseStability * 100).toFixed(
      1
    )}%`
  );

  console.log('\nРазнообразие:');
  console.log(
    `- Коэффициент Джини (токены, средняя): ${results.diversity.tokenGini.toFixed(
      3
    )}`
  );
  console.log(
    `- Энтропия Шеннона (стратегии, средняя): ${results.diversity.strategyShannon.toFixed(
      3
    )}`
  );
  console.log(
    `- Энтропия Шеннона (голоса): ${results.diversity.voteShannon.toFixed(3)}`
  );

  // Анализ эволюции агентов
  const strategyDistribution = results.agentEvolution.reduce((acc, agent) => {
    acc[agent.finalStrategy] = (acc[agent.finalStrategy] || 0) + 1;
    return acc;
  }, {});

  console.log('\nЭволюция стратегий агентов:');
  Object.entries(strategyDistribution).forEach(([strategy, count]) => {
    console.log(`- ${strategy}: ${count} агентов`);
  });
};

runFullSimulation();
