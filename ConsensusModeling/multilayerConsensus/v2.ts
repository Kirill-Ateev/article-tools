/**
 * Advanced Multilayer Consensus Simulation
 *
 * Моделирование динамики коэффициента Накамото в условиях:
 * 1. Фиксированной эмиссии (Constant Supply).
 * 2. Влияния временного затухания силы голоса.
 * 3. Различных поведенческих сценариев агентов.
 */

import { writeFileSync } from 'fs';

// --- Глобальные константы ---
const TOTAL_SUPPLY = 10_000_000;

interface ScenarioConfig {
  name: string;
  epochs: number;
  churnRate: number; // Вероятность выхода (0.0 - 1.0)
  newEntrantRate: number; // % прироста новых агентов
  restakeStrategy: boolean; // True = агенты сбрасывают T, если это выгодно для V
  proposalProbability: number; // Вероятность одобрения предложения (вывод из казны)
  wealthDistribution: 'pareto' | 'equal';
}

interface Agent {
  id: number;
  balance: number; // P (Governance Tokens)
  stakedTime: number; // T (Epochs)
  votingPower: number; // V
}

interface EpochResult {
  scenario: string;
  epoch: number;
  nakamotoCoeff: number;
  nakamotoPercentage: number;
  treasuryBalance: number; // Исправлено имя свойства
  totalVotingPower: number;
  giniIndex: number;
  agentCount: number;
}

// --- Класс Симуляции ---

class ConsensusSimulation {
  private agents: Agent[] = [];
  private treasury: number = 0;
  private nextAgentId = 1;

  constructor(private config: ScenarioConfig) {
    this.initializeDAO();
  }

  // Инициализация с учетом инварианта Total Supply
  private initializeDAO() {
    this.agents = [];
    this.nextAgentId = 1;
    const initialAgentsCount = 500;

    let distributedAmount = 0;

    for (let i = 0; i < initialAgentsCount; i++) {
      let balance = 0;
      if (this.config.wealthDistribution === 'pareto') {
        // Закон Ципфа: P ~ 1/rank^0.8
        const rank = i + 1;
        balance = 5000 * (1 / Math.pow(rank, 0.8));
      } else {
        balance = 5000; // Равный старт
      }

      this.agents.push({
        id: this.nextAgentId++,
        balance: balance,
        stakedTime: 0,
        votingPower: 0, // Будет рассчитано ниже
      });
      distributedAmount += balance;
    }

    // Проверка на переполнение (маловероятно при таких параметрах, но математически нужно)
    if (distributedAmount > TOTAL_SUPPLY) {
      // Нормализация
      const scale = TOTAL_SUPPLY / distributedAmount;
      this.agents.forEach((a) => (a.balance *= scale));
      this.treasury = 0;
    } else {
      this.treasury = TOTAL_SUPPLY - distributedAmount;
    }

    this.updateVotingPowers();
  }

  // V = P * (1 / (log10(T + 1) + 1))
  private calculateOneVotingPower(balance: number, time: number): number {
    // Защита от NaN: time >= 0 всегда
    const decay = 1 / (Math.log10(time + 1) + 1);
    return balance * decay;
  }

  private updateVotingPowers() {
    this.agents.forEach((a) => {
      a.votingPower = this.calculateOneVotingPower(a.balance, a.stakedTime);
    });
  }

  // Распределение средств всем пропорционально P (Governance Tokens)
  private distributeToAll(amount: number) {
    if (amount <= 0.000001 || this.agents.length === 0) return;

    const totalBalance = this.agents.reduce((s, a) => s + a.balance, 0);
    if (totalBalance === 0) return;

    this.agents.forEach((a) => {
      const share = a.balance / totalBalance;
      a.balance += amount * share;
    });
  }

  public runEpoch(epochIndex: number): EpochResult {
    // 1. Старение стейка
    this.agents.forEach((a) => a.stakedTime++);

    // 2. Стратегия Рестейкинга (Game Theory)
    // Агент симулирует: если я выйду (потеряю 1%) и зайду (T=0), V станет больше?
    // V_old = P * decay(T)
    // V_new = (P * 0.99) * decay(0) = P * 0.99
    if (this.config.restakeStrategy) {
      let taxCollected = 0;
      this.agents.forEach((a) => {
        const currentV = this.calculateOneVotingPower(a.balance, a.stakedTime);
        const newBalance = a.balance * 0.99;
        const potentialV = this.calculateOneVotingPower(newBalance, 0);

        if (potentialV > currentV) {
          // Выгодно сбросить таймер
          taxCollected += a.balance - newBalance;
          a.balance = newBalance;
          a.stakedTime = 0;
        }
      });
      // Налог распределяется всем (включая тех, кто только что рестейкнул, пропорционально их новому балансу)
      this.distributeToAll(taxCollected);
    }

    // 3. Награды за предложения (Proposal Rewards) - Эмиссия из казны
    if (
      Math.random() < this.config.proposalProbability &&
      this.treasury > 1000
    ) {
      const grant = 2000; // Размер гранта
      if (this.treasury >= grant) {
        this.treasury -= grant;
        // Equal shares (по ТЗ) - мощный децентрализатор
        const share = grant / this.agents.length;
        this.agents.forEach((a) => (a.balance += share));
      }
    }

    // 4. Churn (Выход участников)
    const leavingIndices: number[] = [];
    let exitTaxToDistribute = 0;

    this.agents.forEach((a, idx) => {
      if (Math.random() < this.config.churnRate) {
        leavingIndices.push(idx);
        const tax = a.balance * 0.01;
        const returnToMarket = a.balance - tax;

        exitTaxToDistribute += tax;
        this.treasury += returnToMarket; // Возврат в ликвидность (казну)
      }
    });

    // Удаляем ушедших
    const leavingSet = new Set(leavingIndices.map((i) => this.agents[i].id));
    this.agents = this.agents.filter((a) => !leavingSet.has(a.id));

    // Распределение налога (1% от ушедших распределяется оставшимся)
    this.distributeToAll(exitTaxToDistribute);

    // 5. Новые участники (Покупка из Казны)
    const newCount = Math.floor(
      this.agents.length * this.config.newEntrantRate
    );
    // Не можем добавить больше, чем позволяет казна (ликвидность)
    for (let i = 0; i < newCount; i++) {
      const buyAmount = 1000 + Math.random() * 2000; // 1000-3000 токенов
      if (this.treasury >= buyAmount) {
        this.treasury -= buyAmount;
        this.agents.push({
          id: this.nextAgentId++,
          balance: buyAmount,
          stakedTime: 0,
          votingPower: 0, // Обновится в конце
        });
      }
    }

    // Пересчет всех сил
    this.updateVotingPowers();

    return this.calculateMetrics(epochIndex);
  }

  private calculateMetrics(epoch: number): EpochResult {
    // Сортировка по убыванию V
    const sorted = [...this.agents].sort(
      (a, b) => b.votingPower - a.votingPower
    );
    const totalVP = sorted.reduce((s, a) => s + a.votingPower, 0);

    // Расчет Накамото
    let nakamoto = 0;
    let accumulatedVP = 0;
    const threshold = totalVP * 0.5;

    if (sorted.length > 0 && totalVP > 0) {
      for (const a of sorted) {
        accumulatedVP += a.votingPower;
        nakamoto++;
        if (accumulatedVP > threshold) break;
      }
    } else {
      // Если агентов нет или сила 0 (крайний случай)
      nakamoto = 0;
    }

    // Джини (неравенство)
    let giniNumerator = 0;
    const n = sorted.length;
    // Для джини нужна сортировка по возрастанию
    const sortedAsc = [...sorted].reverse();
    sortedAsc.forEach((a, i) => {
      giniNumerator += (i + 1) * a.votingPower;
    });

    // Формула Джини
    const gini =
      n > 0 && totalVP > 0
        ? (2 * giniNumerator) / (n * totalVP) - (n + 1) / n
        : 0;

    return {
      scenario: this.config.name,
      epoch: epoch,
      nakamotoCoeff: nakamoto,
      nakamotoPercentage: n > 0 ? (nakamoto / n) * 100 : 0,
      treasuryBalance: this.treasury,
      totalVotingPower: totalVP,
      giniIndex: gini,
      agentCount: n,
    };
  }
}

// --- Запуск сценариев ---

const scenarios: ScenarioConfig[] = [
  {
    name: '1.Whales_Hold',
    epochs: 200,
    churnRate: 0.005, // Малый отток
    newEntrantRate: 0.005, // Малый приток
    restakeStrategy: false, // Пассивные киты
    proposalProbability: 0.1, // Мало размытия казны
    wealthDistribution: 'pareto',
  },
  {
    name: '2.High_Activity_Equal_Rewards',
    epochs: 200,
    churnRate: 0.02,
    newEntrantRate: 0.03, // Рост популяции
    restakeStrategy: false,
    proposalProbability: 0.6, // Частое распределение равных наград (Equal Shares)
    wealthDistribution: 'pareto',
  },
  {
    name: '3.Strategic_Restakers',
    epochs: 200,
    churnRate: 0.01,
    newEntrantRate: 0.01,
    restakeStrategy: true, // Агенты сбрасывают T, чтобы максимизировать V
    proposalProbability: 0.2,
    wealthDistribution: 'pareto',
  },
  {
    name: '4.Equal_Start_Socialism',
    epochs: 200,
    churnRate: 0.02,
    newEntrantRate: 0.02,
    restakeStrategy: false,
    proposalProbability: 0.4,
    wealthDistribution: 'equal', // Все начинают равными
  },
];

console.log('Starting Simulation...');
let allResults: EpochResult[] = [];

scenarios.forEach((conf) => {
  console.log(`Running Scenario: ${conf.name}`);
  const sim = new ConsensusSimulation(conf);
  for (let i = 0; i < conf.epochs; i++) {
    allResults.push(sim.runEpoch(i));
  }
});

// --- Генерация CSV ---

const csvHeader =
  'Scenario,Epoch,NakamotoCoeff,NakamotoPerc,TotalVotingPower,Treasury,GiniIndex,AgentCount';
const csvRows = allResults
  .map(
    (r) =>
      `${r.scenario},${r.epoch},${
        r.nakamotoCoeff
      },${r.nakamotoPercentage.toFixed(2)},${r.totalVotingPower.toFixed(
        2
      )},${r.treasuryBalance.toFixed(2)},${r.giniIndex.toFixed(4)},${
        r.agentCount
      }`
  )
  .join('\n');

const finalCsv = csvHeader + '\n' + csvRows;

// Запись файла (Исправлено: добавлена запись)
try {
  writeFileSync('consensus_simulation.csv', finalCsv);
  console.log("Successfully wrote to 'consensus_simulation.csv'");
} catch (err) {
  console.error('Error writing file:', err);
}

// Превью для проверки
console.log('\n--- Preview Data (Last entry of each scenario) ---');
scenarios.forEach((s) => {
  const last = allResults.filter((r) => r.scenario === s.name).pop();
  if (last) {
    console.log(
      `${s.name}: Epoch ${last.epoch}, Nak=${
        last.nakamotoCoeff
      }, VP=${last.totalVotingPower.toFixed(
        0
      )}, Trs=${last.treasuryBalance.toFixed(0)}`
    );
  }
});
