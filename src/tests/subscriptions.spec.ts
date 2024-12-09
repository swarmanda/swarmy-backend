import { calculateDepthAndAmount, getDepthForRequestedStorage } from '../app/plan/subscriptions';

describe('getDepthForRequestedStorage', () => {
  it.each([
    [1, 22],
    [20, 24],
    [64, 25],
    [2000, 29],
  ])('should return the smallest possible depth', async (gbs, expectedDepth) => {
    const depth = getDepthForRequestedStorage(gbs);
    expect(depth).toBe(expectedDepth);
  });

  it.each([
    [1, 1, 22, 414720000, 0.17],
    [1, 128, 26, 414720000, 2.78],
    [30, 1000, 28, 30 * 414720000, 333.97],
    [90, 8_000_000, 41, 90 * 414720000, 8207810.32],
  ])('should return the smallest possible depth', async (days, gbs, expectedDepth, expectedAmount, expectedPrice) => {
    const result = calculateDepthAndAmount(days, gbs);
    expect(result.depth).toBe(expectedDepth);
    expect(result.amount).toBe(expectedAmount);
    expect(result.bzzPrice).toBe(expectedPrice);
  });
});
