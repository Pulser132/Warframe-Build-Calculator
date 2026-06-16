import { describe, it, expect } from 'vitest';
import { combineElements } from './elements';

describe('combineElements', () => {
  it('combines Toxin + Electricity into Corrosive (slice case)', () => {
    const out = combineElements([
      { type: 'toxin', amount: 31.5 },
      { type: 'electricity', amount: 31.5 },
    ]);
    expect(out).toEqual({ corrosive: 63 });
  });

  it('leaves a single element uncombined', () => {
    expect(combineElements([{ type: 'toxin', amount: 30 }])).toEqual({ toxin: 30 });
  });

  it('combines each documented pair', () => {
    expect(combineElements([{ type: 'heat', amount: 1 }, { type: 'cold', amount: 1 }])).toEqual({
      blast: 2,
    });
    expect(combineElements([{ type: 'cold', amount: 1 }, { type: 'toxin', amount: 1 }])).toEqual({
      viral: 2,
    });
    expect(
      combineElements([{ type: 'heat', amount: 1 }, { type: 'electricity', amount: 1 }]),
    ).toEqual({ radiation: 2 });
  });

  it('respects load order: first valid pair combines, extra stays single', () => {
    const out = combineElements([
      { type: 'toxin', amount: 10 },
      { type: 'electricity', amount: 10 },
      { type: 'cold', amount: 5 },
    ]);
    expect(out).toEqual({ corrosive: 20, cold: 5 });
  });

  it('drops zero-amount contributions', () => {
    expect(combineElements([{ type: 'toxin', amount: 0 }])).toEqual({});
  });
});
