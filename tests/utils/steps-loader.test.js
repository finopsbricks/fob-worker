import { describe, it, expect } from '@jest/globals';

import { findPreviousStep, getHandler } from '../../src/utils/steps-loader.js';

// ============================================================================
// findPreviousStep
// ============================================================================

describe('findPreviousStep()', () => {
  const steps = {
    'acme/step_one': {},
    'acme/step_two': {},
    'acme/step_three': {},
    'other/step_a': {},
  };

  it('should return null when the slug is the first entry', () => {
    // Act
    const result = findPreviousStep(steps, 'acme/step_one');

    // Assert
    expect(result).toBeNull();
  });

  it('should return the immediately preceding step with the same org prefix', () => {
    // Act
    const result = findPreviousStep(steps, 'acme/step_three');

    // Assert
    expect(result).toBe('acme/step_two');
  });

  it('should return null when no prior step shares the org prefix', () => {
    // Act — other/step_a comes after all acme/* steps, but has no preceding other/* step
    const result = findPreviousStep(steps, 'other/step_a');

    // Assert
    expect(result).toBeNull();
  });

  it('should return null when the slug is not in the registry', () => {
    // Act
    const result = findPreviousStep(steps, 'acme/unknown');

    // Assert
    expect(result).toBeNull();
  });
});

// ============================================================================
// getHandler
// ============================================================================

describe('getHandler()', () => {
  it('should return null when the slug is not in the registry', () => {
    // Arrange
    const steps = {};

    // Act
    const result = getHandler(steps, 'org/missing');

    // Assert
    expect(result).toBeNull();
  });

  it('should throw when the step is a plain function (not a StepDefinition)', () => {
    // Arrange
    const steps = {
      'org/plain_fn': async () => ({}),
    };

    // Act & Assert
    expect(() => getHandler(steps, 'org/plain_fn')).toThrow(
      /must be a StepDefinition/
    );
  });
});
