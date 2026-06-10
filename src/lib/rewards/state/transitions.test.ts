import { describe, expect, it } from 'vitest';
import { canTransitionReward } from './transitions';

describe('canTransitionReward', () => {
  it('allows pending → confirmed and reversed', () => {
    expect(canTransitionReward('pending', 'confirmed')).toBe(true);
    expect(canTransitionReward('pending', 'reversed')).toBe(true);
    expect(canTransitionReward('pending', 'fulfilled')).toBe(false);
  });

  it('allows confirmed → fulfilled and reversed', () => {
    expect(canTransitionReward('confirmed', 'fulfilled')).toBe(true);
    expect(canTransitionReward('confirmed', 'reversed')).toBe(true);
  });

  it('forbids transitions from reversed', () => {
    expect(canTransitionReward('reversed', 'pending')).toBe(false);
  });
});
