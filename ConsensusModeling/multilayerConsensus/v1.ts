import * as fs from 'fs';

/**
 * Multilayer Consensus Model Simulation
 *
 * Цель: Анализ динамики коэффициента Накамото в системе с затухающей силой голоса
 * и механизмом перераспределения при выходе.
 */

// --- Конфигурация симуляции ---
const CONFIG = {
  INITIAL_AGENTS: 10000, // Начальное кол-во агентов
  EPOCHS: 1000, // Количество эпох для симуляции
  CHURN_RATE: 0.01, // Вероятность того, что агент решит выйти из DAO в данную эпоху (2%)
  NEW_AGENTS_PER_EPOCH: 5, // Кол-во новых агентов, приходящих в эпоху
  BASE_REWARD_APY: 0.05, // Базовая годовая доходность от принятых предложений (для симуляции роста P)
  EPOCHS_PER_YEAR: 365, // Допущение: 1 эпоха = 1 день
  PROPOSAL_SUCCESS_RATE: 0.8, // Вероятность успешного принятия предложений
};

// --- Типы данных ---

interface Agent {
  id: number;
  balance: number; // P: Governance Tokens
  stakedTime: number; // T: Time staked in epochs
  votingPower: number; // V: Calculated Voting Power
  isCore: boolean;
}

interface EpochStats {
  epoch: number;
  nakamotoCoefficient: number;
  totalTokens: number;
  totalVotingPower: number;
  agentCount: number;
  giniCoefficient: number; // Дополнительно: индекс Джини для оценки неравенства сил голоса
}

// --- Математическое ядро ---

class ConsensusModel {
  private agents: Agent[] = [];
  private nextAgentId = 1;
  private epoch = 0;

  constructor() {
    this.initializeAgents();
  }

  /**
   * Инициализация с распределением Парето (богатые и бедные).
   * В реальных DAO распределение токенов обычно следует Zipf law.
   */
  private initializeAgents() {
    for (let i = 0; i < CONFIG.INITIAL_AGENTS; i++) {
      // Используем степенное распределение для имитации неравенства
      // balance = 1000 * (1 / random^alpha)
      const random = Math.random();
      const balance = 1000 * Math.pow(1 / (random + 0.01), 1.5); // +0.01 чтобы избежать Infinity

      this.agents.push({
        id: this.nextAgentId++,
        balance: balance,
        stakedTime: 0,
        votingPower: 0, // Будет рассчитано
        isCore: false,
      });
    }
    this.recalculateVotingPower();
  }

  /**
   * Расчет силы голоса по формуле:
   * V = P * (1 / (log10(T + 1) + 1))
   */
  private calculateVotingPower(balance: number, time: number): number {
    const decayFactor = 1 / (Math.log10(time + 1) + 1);
    return balance * decayFactor;
  }

  private recalculateVotingPower() {
    this.agents.forEach((agent) => {
      agent.votingPower = this.calculateVotingPower(
        agent.balance,
        agent.stakedTime
      );
    });
  }

  /**
   * Выбор Core Members.
   * 1. Сортировка по силе голоса.
   * 2. Разделение на квартили.
   * 3. Случайный выбор представителей из каждого квартиля (всего 20% от популяции).
   */
  private selectCoreMembers() {
    // Сброс текущих ролей
    this.agents.forEach((a) => (a.isCore = false));

    // Сортировка по V
    const sortedByPower = [...this.agents].sort(
      (a, b) => b.votingPower - a.votingPower
    );
    const total = sortedByPower.length;

    if (total < 4) return; // Слишком мало участников для квартилей

    const quartileSize = Math.floor(total / 4);
    const targetCoreCount = Math.floor(total * 0.2);
    const perQuartileTarget = Math.floor(targetCoreCount / 4);

    const quartiles = [
      sortedByPower.slice(0, quartileSize),
      sortedByPower.slice(quartileSize, quartileSize * 2),
      sortedByPower.slice(quartileSize * 2, quartileSize * 3),
      sortedByPower.slice(quartileSize * 3),
    ];

    // Выбор случайных участников из каждого квартиля
    quartiles.forEach((quartile) => {
      // Перемешиваем квартиль
      const shuffled = quartile.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, perQuartileTarget);
      selected.forEach((agent) => {
        // Находим оригинального агента и ставим флаг
        const original = this.agents.find((a) => a.id === agent.id);
        if (original) original.isCore = true;
      });
    });
  }

  /**
   * Вычисление коэффициента Накамото.
   * Минимальное число агентов, контролирующих > 50% общей силы голоса.
   */
  private calculateNakamoto(): number {
    const sortedVotes = this.agents
      .map((a) => a.votingPower)
      .sort((a, b) => b - a);
    const totalVotingPower = sortedVotes.reduce((sum, v) => sum + v, 0);

    let accumulatedPower = 0;
    let count = 0;

    for (const v of sortedVotes) {
      accumulatedPower += v;
      count++;
      if (accumulatedPower > totalVotingPower * 0.5) {
        return count;
      }
    }
    return count;
  }

  /**
   * Вычисление коэффициента Джини для силы голоса (мера неравенства).
   * 0 - полное равенство, 1 - полное неравенство.
   */
  private calculateGini(): number {
    const values = this.agents.map((a) => a.votingPower).sort((a, b) => a - b);
    const n = values.length;
    if (n === 0) return 0;

    let numerator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i + 1) * values[i];
    }

    const denominator = n * values.reduce((a, b) => a + b, 0);
    if (denominator === 0) return 0;

    return (2 * numerator) / denominator - (n + 1) / n;
  }

  /**
   * Главный цикл эпохи
   */
  public runEpoch(): EpochStats {
    this.epoch++;

    // 1. Увеличение времени стейкинга (T)
    this.agents.forEach((a) => a.stakedTime++);

    // 2. Экономика предложений (Proposal Rewards)
    // Мы предполагаем, что успешные предложения увеличивают баланс участников (rewards).
    // Для упрощения: распределяем награды пропорционально стейку (или равными долями, как в ТЗ, но это размоет китов).
    // В ТЗ: "Awards can be made in equal shares". Это очень сильно децентрализует систему. Реализуем "Equal shares".
    if (Math.random() < CONFIG.PROPOSAL_SUCCESS_RATE) {
      const rewardPool = 10000; // Условный пул наград за эпоху
      const rewardPerAgent = rewardPool / this.agents.length;
      this.agents.forEach((a) => {
        a.balance += rewardPerAgent;
      });
    }

    // 3. Churn (Выход участников) и Перераспределение (Redistribution)
    // Находим тех, кто выходит
    const leavingAgentsIndices: number[] = [];
    const potFromLeavers = this.agents.reduce((pot, agent, index) => {
      if (Math.random() < CONFIG.CHURN_RATE) {
        leavingAgentsIndices.push(index);
        const penalty = agent.balance * 0.01; // 1% leaves
        return pot + penalty;
      }
      return pot;
    }, 0);

    // Удаляем вышедших (фильтрация)
    // Важно: удаляем в обратном порядке или создаем новый массив, чтобы индексы не поехали,
    // но проще через filter.
    const leaversSet = new Set(
      leavingAgentsIndices.map((i) => this.agents[i].id)
    );
    this.agents = this.agents.filter((a) => !leaversSet.has(a.id));

    // Распределяем Pot между оставшимися ПРОПОРЦИОНАЛЬНО их балансу (P)
    // ТЗ: "divide it among all current participants in proportion to the governance tokens"
    const totalRemainingBalance = this.agents.reduce(
      (sum, a) => sum + a.balance,
      0
    );
    if (totalRemainingBalance > 0 && potFromLeavers > 0) {
      this.agents.forEach((agent) => {
        const share = agent.balance / totalRemainingBalance;
        agent.balance += potFromLeavers * share;
      });
    }

    // 4. Новые участники (New Entrants)
    // Они заходят с T=0, что дает им высокий множитель Voting Power.
    for (let i = 0; i < CONFIG.NEW_AGENTS_PER_EPOCH; i++) {
      this.agents.push({
        id: this.nextAgentId++,
        balance: 1000 + Math.random() * 500, // Случайный начальный баланс
        stakedTime: 0,
        votingPower: 0,
        isCore: false,
      });
    }

    // 5. Пересчет Voting Power и выбор Core
    this.recalculateVotingPower();
    this.selectCoreMembers();

    // 6. Сбор статистики
    return {
      epoch: this.epoch,
      nakamotoCoefficient: this.calculateNakamoto(),
      totalTokens: this.agents.reduce((s, a) => s + a.balance, 0),
      totalVotingPower: this.agents.reduce((s, a) => s + a.votingPower, 0),
      agentCount: this.agents.length,
      giniCoefficient: this.calculateGini(),
    };
  }
}

// --- Запуск и Экспорт ---

const simulation = new ConsensusModel();
const results: EpochStats[] = [];

console.log(`Starting simulation for ${CONFIG.EPOCHS} epochs...`);

for (let i = 0; i < CONFIG.EPOCHS; i++) {
  results.push(simulation.runEpoch());
}

// Генерация CSV
const csvHeader =
  'Epoch,NakamotoCoefficient,GiniIndex,TotalTokens,TotalVotingPower,AgentCount\n';
const csvRows = results
  .map(
    (r) =>
      `${r.epoch},${r.nakamotoCoefficient},${r.giniCoefficient.toFixed(
        4
      )},${r.totalTokens.toFixed(2)},${r.totalVotingPower.toFixed(2)},${
        r.agentCount
      }`
  )
  .join('\n');

const csvContent = csvHeader + csvRows;

// В реальной среде Node.js раскомментируйте следующую строку для записи файла:
fs.writeFileSync('consensus_simulation.csv', csvContent);

console.log(
  'Simulation complete. Here is a preview of the data (Last 5 epochs):'
);
console.log(csvHeader.trim());
console.log(
  results
    .slice(-5)
    .map(
      (r) =>
        `${r.epoch},${r.nakamotoCoefficient},${r.giniCoefficient.toFixed(
          4
        )},${r.totalTokens.toFixed(2)},${r.totalVotingPower.toFixed(2)},${
          r.agentCount
        }`
    )
    .join('\n')
);

console.log('\n--- CSV Output Start ---');
console.log(csvContent);
console.log('--- CSV Output End ---');
