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
    [1, 1, 22, 414720000, '0.17'],
    [1, 128, 26, 414720000, '2.78'],
    [30, 1000, 28, 30 * 414720000, '333.97'],
    [90, 8_000_000, 41, 90 * 414720000, '8207810.32'],
  ])('should return the smallest possible depth', async (days, gbs, expectedDepth, expectedAmount, expectedPrice) => {
    const result = calculateDepthAndAmount(days, gbs);

    // console.log(`Using ${result.amount}`);
    // for (let i = 1; i < 9_000_000; i *= 2) {
    //   const result = calculateDepthAndAmount(30, i);
    //   const usd = Number(result.bzzPrice) * 0.3;
    //   const huf = usd * 365;
    //   console.log(
    //     `Using depth: ${result.depth} for storing \t GBs:${i.toFixed(0).padStart(7)} \t BZZ:${result.bzzPrice.padStart(9)}\t USD ${usd.toFixed(1).padStart(9)} \t HUF ${Math.ceil(huf).toFixed(0).padStart(9)}`,
    //   );
    // }

    expect(result.depth).toBe(expectedDepth);
    expect(result.amount).toBe(expectedAmount);
    expect(result.bzzPrice).toBe(expectedPrice);
  });
});
