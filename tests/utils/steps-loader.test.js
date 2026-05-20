import { describe, it, expect } from '@jest/globals';

import { findPreviousStep, getHandler } from '../../src/utils/steps-loader.js';

// ============================================================================
// findPreviousStep
// ============================================================================

describe('findPreviousStep()', () => {
  const steps = {
    'step_one': {},
    'step_two': {},
    'step_three': {},
    'other_step': {},
  };

  it('should return null when the slug is the first entry', () => {
    const result = findPreviousStep(steps, 'step_one');
    expect(result).toBeNull();
  });

  it('should return the immediately preceding step', () => {
    const result = findPreviousStep(steps, 'step_three');
    expect(result).toBe('step_two');
  });

  it('should return the previous step regardless of naming', () => {
    const result = findPreviousStep(steps, 'other_step');
    expect(result).toBe('step_three');
  });

  it('should return null when the slug is not in the registry', () => {
    const result = findPreviousStep(steps, 'unknown');
    expect(result).toBeNull();
  });
});

// ============================================================================
// getHandler
// ============================================================================

describe('getHandler()', () => {
  it('should return null when the slug is not in the registry', () => {
    const steps = {};
    const result = getHandler(steps, 'missing');
    expect(result).toBeNull();
  });

  it('should throw when the step is a plain function (not a StepDefinition)', () => {
    const steps = {
      'plain_fn': async () => ({}),
    };
    expect(() => getHandler(steps, 'plain_fn')).toThrow(
      /must be a StepDefinition/
    );
  });
});
