// src/index.ts
import * as fs from 'fs';
import * as path from 'path';
import { buildAgents } from './scenario';
import { runScenario } from './simulate';
import { ScenarioParams } from './types';

function writeJSON(filePath: string, obj: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf-8');
}

function writeCSV(filePath: string, rows: any[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')].concat(
    rows.map((r) => headers.map((h) => r[h]).join(','))
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

function scenarioSet(): ScenarioParams[] {
  const base = {
    seed: 42,
    rounds: 40000,
    numEntities: 150,
    sybilsPerEntity: 1,
    totalStake: 1_000_000,
    initialDistribution: 'lognormal' as const,
    lognormal: { mu: 0, sigma: 1.2 },
    reliabilityModel: 'constant' as const,
    reliability: { p: 0.985 },
    nakamotoThreshold: 0.5,
  };

  return [
    {
      ...base,
      name: 'Weighted_67_equal_R200 (decentralizing)',
      consensus: {
        quorumThreshold: 0.67,
        selectionPolicy: 'weighted',
        perRoundReward: 200,
        rewardPolicy: 'perSignerEqual',
      },
    },
    {
      ...base,
      name: 'Weighted_67_propStake_R200 (centralizing)',
      consensus: {
        quorumThreshold: 0.67,
        selectionPolicy: 'weighted',
        perRoundReward: 200,
        rewardPolicy: 'perStakeInSigner',
      },
    },
    {
      ...base,
      name: 'Weighted_51_propStake_R200 (centralizing)',
      consensus: {
        quorumThreshold: 0.51,
        selectionPolicy: 'weighted',
        perRoundReward: 200,
        rewardPolicy: 'perStakeInSigner',
      },
    },
    {
      ...base,
      name: 'Greedy_51_propStake_R200 (strong centralizing)',
      consensus: {
        quorumThreshold: 0.51,
        selectionPolicy: 'greedy',
        perRoundReward: 200,
        rewardPolicy: 'perStakeInSigner',
      },
    },
    {
      ...base,
      name: 'Uniform_51_equal_R200 (mild decentralizing)',
      consensus: {
        quorumThreshold: 0.51,
        selectionPolicy: 'uniform',
        perRoundReward: 200,
        rewardPolicy: 'perSignerEqual',
      },
    },
  ];
}

// безопасная вставка JSON в <script> без fetch
function jsonForScriptTag(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/<\/script/gi, '<\\/script');
}

function plotHTMLInline(allResults: unknown): string {
  const json = jsonForScriptTag(allResults);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Nakamoto over time</title>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<style>
  body{font-family:system-ui, sans-serif;margin:20px}
  .hint{color:#555;margin-bottom:10px}
</style>
</head>
<body>
<h2>Nakamoto index by scenario</h2>
<div class="hint">Жирная линия — фракционный (плавный) индекс Накамото. Бледная пунктирная — исходный целочисленный индекс (ступенька).</div>
<div id="chart" style="width:100%;height:640px"></div>

<script id="results" type="application/json">${json}</script>
<script>
  const raw = document.getElementById('results').textContent;
  const data = JSON.parse(raw);

  // рисуем по два трейса на сценарий: smooth (fractional) + step (int)
  const traces = [];
  for (const s of data) {
    const x = s.rounds.map(r => r.round);
    const yFrac = s.rounds.map(r => r.nakamotoFrac);
    const yInt  = s.rounds.map(r => r.nakamoto);

    traces.push({
      name: s.scenario.name,
      x, y: yFrac,
      mode: 'lines',
      line: { width: 2 },
      hovertemplate: '%{y:.2f}<extra>' + s.scenario.name + '</extra>',
      legendgroup: s.scenario.name
    });

    traces.push({
      name: s.scenario.name + ' (int)',
      x, y: yInt,
      mode: 'lines',
      line: { width: 1, dash: 'dot', shape: 'hv' },
      opacity: 0.35,
      hovertemplate: '%{y:d}<extra>' + s.scenario.name + ' (int)</extra>',
      showlegend: false,
      legendgroup: s.scenario.name
    });
  }

  Plotly.newPlot('chart', traces, {
    xaxis: { title: 'Round' },
    yaxis: { title: 'Nakamoto (entities)' },
    legend: { orientation: 'h' },
    title: 'Nakamoto index dynamics (fractional vs integer)'
  }, {responsive: true});
</script>
</body>
</html>`;
}

function main() {
  const scenarios = scenarioSet();
  const allResults: any[] = [];
  const csvRows: any[] = [];

  for (const sc of scenarios) {
    const { agents, rng } = buildAgents(sc);
    const res = runScenario(sc, agents, rng);
    allResults.push(res);

    for (const r of res.rounds) {
      csvRows.push({
        scenario: sc.name,
        round: r.round,
        finalized: r.finalized ? 1 : 0,
        nakamoto: r.nakamoto,
        nakamotoFrac: r.nakamotoFrac,
        nakamotoEma: r.nakamotoEma,
        top1EntityShare: r.top1EntityShare,
        gini: r.gini,
      });
    }

    console.log(
      `\${sc.name}: N_int(final)=\${res.summary.finalNakamoto}, N_frac(final)=\${res.summary.finalNakamotoFrac.toFixed(2)}, slope(frac)=\${res.summary.slopeNakamotoFrac.toFixed(4)}, success=\${(100*res.summary.successRate).toFixed(1)}%\``
    );
  }

  writeJSON('out/results.json', allResults);
  writeCSV('out/results.csv', csvRows);

  const html = plotHTMLInline(allResults);
  fs.writeFileSync('out/plot.html', html, 'utf-8');

  console.log(
    'Results saved to out/results.json, out/results.csv, out/plot.html'
  );
}

main();
