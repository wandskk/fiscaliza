import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../specs/', import.meta.url));
const format = (value) => (value / 100).toFixed(2).replace('.', ',');
const decimal = (value) => {
  if (!/^\d+(?:,\d{1,2})?$/.test(value)) throw new Error(`Tempo inválido: ${value}`);
  return Math.round(Number(value.replace(',', '.')) * 100);
};
const totals = { done: 0, count: 0, estimated: 0, actual: 0 };
console.log('| Spec | Tarefas feitas | Estimado (h) | Real (h) |');
console.log('| --- | ---: | ---: | ---: |');
for (const entry of readdirSync(root, { withFileTypes: true })
  .filter((item) => item.isDirectory())
  .sort((a, b) => a.name.localeCompare(b.name))) {
  const source = readFileSync(resolve(root, entry.name, 'tasks.md'), 'utf8');
  const tasks = source
    .split('\n')
    .map((line) => line.split('|').map((cell) => cell.trim()))
    .filter((cells) => /^T\d+(?:\.\d+)?$/.test(cells[1] ?? ''));
  const result = { done: 0, count: tasks.length, estimated: 0, actual: 0 };
  for (const cells of tasks) {
    if (cells.at(-2) !== '[x]') continue;
    result.done++;
    result.estimated += decimal(cells.at(-4));
    result.actual += decimal(cells.at(-3));
  }
  for (const key of Object.keys(totals)) totals[key] += result[key];
  console.log(
    `| [${entry.name}](specs/${entry.name}/tasks.md) | ${result.done}/${result.count} | ${format(result.estimated)} | ${format(result.actual)} |`,
  );
}
console.log(
  `| **Total** | **${totals.done}/${totals.count}** | **${format(totals.estimated)}** | **${format(totals.actual)}** |`,
);
