#!/usr/bin/env node

import { hideBin } from 'yargs/helpers';
import { run } from '../src/cli.js';

run(hideBin(process.argv));
