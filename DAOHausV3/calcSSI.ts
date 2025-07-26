import * as fs from 'fs';
import * as readline from 'readline';

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

/**
 * Предварительно вычисляет факториалы до n, чтобы избежать повторных расчетов.
 * @param n Максимальное число для расчета факториала.
 * @returns Массив BigInt, где i-й элемент - это i!.
 */
function precomputeFactorials(n: number): bigint[] {
  const factorials: bigint[] = new Array(n + 1);
  factorials[0] = 1n;
  for (let i = 1; i <= n; i++) {
    factorials[i] = factorials[i - 1] * BigInt(i);
  }
  return factorials;
}

/**
 * Выполняет деление двух BigInt с заданной точностью после запятой.
 * @param a Делимое.
 * @param b Делитель.
 * @param precision Количество знаков после запятой.
 * @returns Строковое представление результата.
 */
function bigIntDivision(a: bigint, b: bigint, precision: number = 20): string {
  const quotient = a / b;
  let remainder = a % b;

  if (remainder === 0n) {
    return quotient.toString();
  }

  let res = quotient.toString() + '.';
  for (let i = 0; i < precision && remainder !== 0n; i++) {
    remainder *= 10n;
    const digit = remainder / b;
    res += digit.toString();
    remainder = remainder % b;
  }
  return res;
}

/**
 * Безопасно парсит строку в научной нотации (например, "1e+21") в BigInt.
 * @param str Строка для конвертации.
 * @returns BigInt представление числа (дробная часть отбрасывается - float нет в EVM).
 */
function parseExpToBigInt(str: string): bigint {
  // Проверяем, есть ли 'e' или 'E'
  const match = str.match(/^(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/);
  if (!match) return BigInt(str);

  const intPart = match[1];
  const fracPart = match[2] || '';
  const exp = parseInt(match[3], 10);

  // Считаем, сколько всего цифр после точки
  const fracLen = fracPart.length;
  let digits = intPart + fracPart;
  let zeros = exp - fracLen;

  if (zeros < 0) {
    // Например, 1.23e+1 = 12.3, нужно отбросить лишние знаки
    digits = digits.slice(0, zeros);
    zeros = 0;
  }

  return BigInt(digits + '0'.repeat(zeros));
}

/**
 * Перемешивает массив, используя алгоритм тасования Фишера-Йетса.
 * @param array Исходный массив.
 * @returns Новый массив с перемешанными элементами.
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// --- ОСНОВНЫЕ ФУНКЦИИ РАСЧЕТА ---

/**
 * Точный расчет индекса Шепли-Шубика.
 * @param members Массив участников с их весами.
 * @param threshold Пороговое значение кворума.
 * @returns Массив с рассчитанными индексами для каждого участника.
 */
function calculateExactShapleyShubik(
  members: { memberAddress: string; voting_weight: bigint }[],
  threshold: bigint
): { memberAddress: string; index: string }[] {
  const n = members.length;
  const factorial = precomputeFactorials(n);
  const results: { memberAddress: string; index: string }[] = [];

  for (let i = 0; i < n; i++) {
    const currentMember = members[i];
    const otherMembers = members.filter((_, idx) => idx !== i);
    const numOther = otherMembers.length;
    let numerator = 0n;

    // Перебор всех подмножеств
    const totalSubsets = 1 << numOther;
    for (let mask = 0; mask < totalSubsets; mask++) {
      let subsetWeight = 0n;
      let subsetSize = 0;

      // Анализ текущего подмножества
      for (let j = 0; j < numOther; j++) {
        if (mask & (1 << j)) {
          subsetWeight += otherMembers[j].voting_weight;
          subsetSize++;
        }
      }

      // Проверка ключевого участника
      if (
        subsetWeight < threshold &&
        subsetWeight + currentMember.voting_weight >= threshold
      ) {
        numerator += factorial[subsetSize] * factorial[numOther - subsetSize];
      }
    }

    // Расчет индекса
    const indexValue = bigIntDivision(numerator, factorial[n]);
    results.push({
      memberAddress: currentMember.memberAddress,
      index: indexValue,
    });
  }

  return results;
}

/**
 * Аппроксимированный расчет индекса Шепли-Шубика методом Монте-Карло.
 * @param members Массив участников.
 * @param threshold Пороговое значение кворума.
 * @param samples Количество симуляций (чем больше, тем точнее).
 * @returns Массив с приближенными индексами.
 */
function monteCarloShapley(
  members: { memberAddress: string; voting_weight: bigint }[],
  threshold: bigint,
  samples: number = 1_000_000
): { memberAddress: string; index: string }[] {
  const n = members.length;
  const counts = new Array(n).fill(0);
  // Создаем карту для быстрого поиска индекса O(1)
  const addressToIndexMap = new Map<string, number>();
  members.forEach((m, i) => addressToIndexMap.set(m.memberAddress, i));

  for (let s = 0; s < samples; s++) {
    const permutation = shuffle(members);
    let cumulativeWeight = 0n;

    for (let i = 0; i < n; i++) {
      const member = permutation[i];
      cumulativeWeight += member.voting_weight;
      if (cumulativeWeight >= threshold) {
        // Используем карту для O(1) поиска
        const originalIndex = addressToIndexMap.get(member.memberAddress)!;
        counts[originalIndex]++;
        break;
      }
    }
  }

  // Преобразуем счетчики в вероятности
  return counts.map((count, i) => ({
    memberAddress: members[i].memberAddress,
    index: (count / samples).toFixed(20), // Высокая точность
  }));
}

/**
 * Главная управляющая функция. Выбирает метод расчета и форматирует результат.
 * @param daoId Идентификатор ДАО.
 * @param quorumPercent Процент кворума.
 * @param totalShares Общее количество голосов в системе.
 * @param members Массив участников.
 * @param monteCarloThreshold Порог (число участников), после которого используется метод Монте-Карло. (Слишком высокое значение приводит к экспоненциально долгому вычислению соответственно)
 * @returns Массив с результатами для всех участников данного ДАО.
 */
function calculateShapleyShubikForDao(
  daoId: string,
  quorumPercent: bigint,
  totalShares: bigint,
  members: { memberAddress: string; voting_weight: bigint }[],
  monteCarloThreshold: number = 25
): { daoId: string; memberAddress: string; index: string }[] {
  // Рассчитываем порог кворума
  const threshold = (quorumPercent * totalShares + 99n) / 100n;
  const n = members.length;

  // Проверка на неактивных участников
  if (n === 0) {
    return members.map((m) => ({
      daoId,
      memberAddress: m.memberAddress,
      index: '0',
    }));
  }

  // Проверка достижимости кворума
  const totalWeight = members.reduce((sum, m) => sum + m.voting_weight, 0n);
  if (totalWeight < threshold) {
    return members.map((m) => ({
      daoId,
      memberAddress: m.memberAddress,
      index: '0',
    }));
  }

  // Выбор метода расчета
  let results: { memberAddress: string; index: string }[];

  if (n <= monteCarloThreshold) {
    // Точный метод для малых групп
    results = calculateExactShapleyShubik(members, threshold);
  } else {
    // Метод Монте-Карло для больших групп
    results = monteCarloShapley(members, threshold);
  }

  // Добавляем идентификатор DAO к результатам
  return results.map((res) => ({
    ...res,
    daoId,
  }));
}

// --- ОБРАБОТКА CSV И ЗАПУСК ---

// Запрос SQLite
// SELECT
//     d.id AS dao_id,
//     d.quorumPercent,
//     d.totalShares,
//     m.memberAddress,
//     m.delegateShares AS voting_weight
// FROM Dao d
// JOIN Member m ON d.id = m.dao
// -- Если нужны только участники с ненулевым весом: WHERE m.delegateShares > 0
// ORDER BY dao_id, voting_weight DESC;

/**
 * Читает CSV файл, группирует данные по ДАО и запускает расчеты.
 * @param filePath Путь к CSV файлу.
 */
async function processCsv(
  filePath: string
): Promise<{ [daoId: string]: { memberAddress: string; index: string }[] }> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const lines: string[] = [];
  for await (const line of rl) {
    lines.push(line);
  }

  // Парсинг заголовков
  const headers = lines[0]
    .split(',')
    .map((header) => header.replaceAll(`"`, '').trim());
  const rows: any[] = [];

  // Парсинг данных
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i]
      .split(',')
      .map((value) => value.replaceAll(`"`, '').trim());
    const row: any = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j];
    }
    rows.push(row);
  }

  // Группировка по DAO
  const grouped: {
    [key: string]: {
      quorumPercent: bigint;
      totalShares: bigint;
      members: { memberAddress: string; voting_weight: bigint }[];
    };
  } = {};

  console.log(rows);

  for (const row of rows) {
    const daoId = row.dao_id;
    if (!grouped[daoId]) {
      grouped[daoId] = {
        quorumPercent: parseExpToBigInt(row.quorumPercent),
        totalShares: parseExpToBigInt(row.totalShares),
        members: [],
      };
    }

    grouped[daoId].members.push({
      memberAddress: row.memberAddress,
      voting_weight: parseExpToBigInt(row.voting_weight),
    });
  }

  // Расчет индексов для каждого DAO
  const output: {
    [daoId: string]: { memberAddress: string; index: string }[];
  } = {};
  for (const [daoId, data] of Object.entries(grouped)) {
    output[daoId] = calculateShapleyShubikForDao(
      daoId,
      data.quorumPercent,
      data.totalShares,
      data.members
    );
  }

  return output;
}

// --- ТОЧКА ВХОДА ---

// IEFY для запуска всего процесса.
(async () => {
  try {
    const results = await processCsv('results/25.07.25/shapleyData.csv');

    // Сохранение результатов в файл
    fs.writeFileSync(
      'results/25.07.25/shapley_shubik_results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('Results saved to shapley_shubik_results.json');

    // Вывод результатов
    for (const [daoId, members] of Object.entries(results)) {
      console.log(`\nDAO: ${daoId}`);
      for (const member of members) {
        console.log(`  ${member.memberAddress}: ${member.index}`);
      }
    }
  } catch (error) {
    console.error('Error processing CSV:', error);
  }
})();
