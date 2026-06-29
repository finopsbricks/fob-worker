import { runStation, getItem } from '../../utils/orchestrator.js';
import { loadStation, loadStationScenario, listStationScenarios } from '../../utils/station-files.js';

// yargs auto-fills these on every argv; everything else is a candidate override.
const YARGS_KEYS = new Set(['_', '$0', 'help', 'version', 'h', 'v']);
// Flags this command owns explicitly — not treated as overrides.
const COMMAND_KEYS = new Set(['id', 'item', 'scenario']);

/**
 * Build the merged step_overrides map from a scenario file + direct CLI flags.
 * Direct CLI flags win on conflict.
 *
 * @returns {{ overrides: Object<string, any>, from_scenario: string[], from_cli: string[] }}
 */
function buildStepOverrides(argv, station) {
  const overrides = {};
  const from_scenario = [];
  const from_cli = [];

  // 1. Scenario (if any) — applied first
  if (argv.scenario) {
    const short_code = station.short_code || station.id;
    const scenario = loadStationScenario(short_code, argv.scenario);
    if (scenario === null) {
      const available = listStationScenarios(short_code);
      const hint = available.length > 0
        ? `Available scenarios for ${short_code}: ${available.join(', ')}`
        : `No scenarios defined under .orchestrator/scenarios/stations/${short_code}/`;
      throw new Error(`Scenario not found: ${argv.scenario}\n${hint}`);
    }
    for (const [k, v] of Object.entries(scenario)) {
      overrides[k] = v;
      from_scenario.push(k);
    }
  }

  // 2. Direct CLI flags — anything left on argv that isn't a known/reserved key.
  // Skip kebab-case duplicates: yargs emits both `--foo-bar` and `fooBar`; the
  // underscore-form `--foo_bar` lands as a single key.
  for (const [k, v] of Object.entries(argv)) {
    if (YARGS_KEYS.has(k)) continue;
    if (COMMAND_KEYS.has(k)) continue;
    if (k.includes('-')) continue;
    overrides[k] = v;
    from_cli.push(k);
  }

  return { overrides, from_scenario, from_cli };
}

function formatOverridesLine(overrides, from_scenario, from_cli, scenarioName) {
  const parts = [];
  for (const [k, v] of Object.entries(overrides)) {
    const sources = [];
    if (from_scenario.includes(k)) sources.push(`scenario ${scenarioName}`);
    if (from_cli.includes(k)) sources.push('CLI');
    parts.push(`${k}=${JSON.stringify(v)} (${sources.join(' + ')})`);
  }
  return parts.join(', ');
}

export async function runStationHandler(argv) {
  const { id, item: itemId } = argv;

  // Resolve station from local definition (needed for short_code → scenario lookup)
  const station = loadStation(id);
  if (!station && argv.scenario) {
    console.error(`Error: --scenario requires a local station definition for ${id}.`);
    console.error(`Run "fob stations pull ${id}" first.`);
    process.exit(1);
  }

  let overridesResult;
  try {
    overridesResult = buildStepOverrides(argv, station || { short_code: id });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }

  const { overrides, from_scenario, from_cli } = overridesResult;
  const has_overrides = Object.keys(overrides).length > 0;

  if (has_overrides) {
    console.log(`Overrides:   ${formatOverridesLine(overrides, from_scenario, from_cli, argv.scenario)}`);
  }

  try {
    const response = await runStation(id, itemId, has_overrides ? overrides : undefined);
    const result = response.data;

    console.log(`Triggered:   ${id}`);
    if (itemId) {
      try {
        const itemResponse = await getItem(itemId);
        const item = itemResponse.data;
        console.log(`Item:        ${item.name || itemId} (${itemId})`);
      } catch {
        console.log(`Item:        ${itemId}`);
      }
    }
    console.log(`Work Record: ${result.work_record_id}`);
    console.log('');
    console.log(`Use \`fob work-records show ${result.work_record_id}\` to check status.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
