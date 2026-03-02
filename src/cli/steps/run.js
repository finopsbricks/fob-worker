import path from 'path';
import { loadConfig, ensureTempDir } from '../../utils/config.js';
import { initTemplates, resolveConfig } from '@fob/lib-worker';
import { loadSteps, getHandler } from '../../utils/steps-loader.js';
import { saveStepOutput, loadAllStepOutputs } from '../../utils/output.js';
import { loadProcess, getStepConfigFromProcess, findProcessesWithStep, listScenarios, loadScenario } from '../../utils/process-files.js';
import { interactivePicker } from '../../utils/picker.js';

export async function runStepHandler(argv) {
  const { slug, process: processId, scenario: scenarioName, empty: useEmpty } = argv;

  const config = loadConfig();
  ensureTempDir(config.tempDir);

  // Initialize templates relative to the worker's src directory
  const workerSrcDir = path.dirname(config.stepsPath);
  const workerEntryUrl = 'file://' + path.resolve(workerSrcDir, 'index.js');
  initTemplates(workerEntryUrl);

  const steps = await loadSteps(config.stepsPath);
  const handler = getHandler(steps, slug);

  if (!handler) {
    console.error(`Unknown step: ${slug}`);
    console.error('Run "fob steps list" to see available steps');
    process.exit(1);
  }

  // Load all step outputs from temp directory
  const step_outputs = loadAllStepOutputs(config.tempDir);

  // Determine config source
  let stepConfig = {};
  let configSource = null;

  if (useEmpty) {
    // Explicit empty config
    stepConfig = {};
    configSource = 'empty (--empty flag)';
  } else if (processId) {
    // Explicit process
    const proc = loadProcess(processId);
    if (!proc) {
      console.error(`Process not found locally: ${processId}`);
      console.error(`Run "fob processes pull ${processId}" first`);
      process.exit(1);
    }

    const procStepConfig = getStepConfigFromProcess(proc, slug);
    if (procStepConfig === null) {
      console.error(`Step "${slug}" not found in process "${processId}"`);
      console.error(`Available steps: ${proc.steps?.map(s => s.slug).join(', ') || '(none)'}`);
      process.exit(1);
    }

    stepConfig = resolveConfig(procStepConfig, step_outputs);
    configSource = `process: ${proc.name} (${processId})`;
  } else if (scenarioName) {
    // Explicit scenario
    const scenarioConfig = loadScenario(slug, scenarioName);
    if (!scenarioConfig) {
      console.error(`Scenario not found: ${scenarioName}`);
      console.error(`Available scenarios: ${listScenarios(slug).join(', ') || '(none)'}`);
      process.exit(1);
    }

    stepConfig = resolveConfig(scenarioConfig, step_outputs);
    configSource = `scenario: ${scenarioName}`;
  } else {
    // Interactive: build options and let user pick
    const pickerOptions = [];

    // Add processes that contain this step
    const processesWithStep = findProcessesWithStep(slug);
    for (const proc of processesWithStep) {
      pickerOptions.push({
        label: `Process: ${proc.name} (${proc.id})`,
        value: proc.id,
        type: 'process',
      });
    }

    // Add scenarios for this step
    const scenarios = listScenarios(slug);
    for (const scenario of scenarios) {
      pickerOptions.push({
        label: `Scenario: ${scenario}`,
        value: scenario,
        type: 'scenario',
      });
    }

    // Always add empty config option
    pickerOptions.push({
      label: 'No config (empty)',
      value: 'empty',
      type: 'empty',
    });

    // Show picker if multiple options, otherwise use the only one
    const selected = await interactivePicker(`Select config for ${slug}:`, pickerOptions);

    if (!selected) {
      console.log('Cancelled');
      process.exit(0);
    }

    // Load the selected config
    if (selected.type === 'process') {
      const proc = loadProcess(selected.value);
      const procStepConfig = getStepConfigFromProcess(proc, slug);
      stepConfig = resolveConfig(procStepConfig || {}, step_outputs);
      configSource = `process: ${proc.name} (${selected.value})`;
    } else if (selected.type === 'scenario') {
      const scenarioConfig = loadScenario(slug, selected.value);
      stepConfig = resolveConfig(scenarioConfig, step_outputs);
      configSource = `scenario: ${selected.value}`;
    } else {
      stepConfig = {};
      configSource = 'empty';
    }
  }

  // Display run info
  console.log(`Step: ${slug}`);
  console.log(`Config: ${configSource}`);
  console.log(`Steps: ${path.relative(process.cwd(), config.stepsPath)}`);
  console.log(`Temp: ${path.relative(process.cwd(), config.tempDir)}`);

  const step_output_slugs = Object.keys(step_outputs);
  if (step_output_slugs.length > 0) {
    console.log(`\n   Loaded step_outputs: ${step_output_slugs.join(', ')}`);
  } else {
    console.log(`\n   No previous step outputs found in temp/`);
  }

  // Construct task matching orchestrator structure
  const task = {
    step_queue_id: `local-${Date.now()}`,
    step: {
      slug: slug,
      config: stepConfig,
    },
    work_record: {
      id: `local-wr-${Date.now()}`,
      item_snapshot: null,
      step_outputs: step_outputs,
    },
    org_id: process.env.STEP_PREFIX || 'local',
  };

  console.log('\n' + '-'.repeat(60));
  console.log('Running step...');
  console.log('-'.repeat(60));

  const output = await handler(task);

  console.log('\n' + '-'.repeat(60));
  console.log('Output:');
  console.log('-'.repeat(60));
  console.log(JSON.stringify(output, null, 2));

  const savedPath = saveStepOutput(config.tempDir, slug, output);
  console.log(`\n   Output saved: ${path.relative(process.cwd(), savedPath)}`);

  console.log('Step completed successfully');
}
