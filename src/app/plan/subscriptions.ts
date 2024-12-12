import { BZZ } from '../token/bzz';

export const subscriptionConfig = {
  currency: 'EUR',
  storageCapacity: {
    pricePerGb: 0.35,
    defaultOption: 4,
    options: [
      // { size: 1, exp: 0, label: '1 GB' },
      // { size: 2, exp: 1, label: '2 GB' },
      { size: 4, exp: 2, label: '4 GB' },
      { size: 8, exp: 3, label: '8 GB' },
      { size: 16, exp: 4, label: '16 GB' },
      { size: 32, exp: 5, label: '32 GB' },
      { size: 64, exp: 6, label: '64 GB' },
      // { size: 128, exp: 7, label: '128 GB' },
      // { size: 256, exp: 8, label: '256 GB' },
      // { size: 512, exp: 9, label: '512 GB' },
      // { size: 1024, exp: 10, label: '1 TB' },
    ],
  },
  bandwidth: {
    pricePerGb: 0.05,
    defaultOption: 5,
    options: [
      // { size: 1, exp: 0, label: '1 GB' },
      // { size: 2, exp: 1, label: '2 GB' },
      { size: 4, exp: 2, label: '4 GB' },
      { size: 8, exp: 3, label: '8 GB' },
      { size: 16, exp: 4, label: '16 GB' },
      { size: 32, exp: 5, label: '32 GB' },
      { size: 64, exp: 6, label: '64 GB' },
      { size: 128, exp: 7, label: '128 GB' },
      { size: 256, exp: 8, label: '256 GB' },
      { size: 512, exp: 9, label: '512 GB' },
      { size: 1024, exp: 10, label: '1 TB' },
      { size: 2048, exp: 11, label: '2 TB' },
      { size: 4096, exp: 12, label: '4 TB' },
    ],
  },
};

export function getDepthForRequestedStorage(requestedGbs: number) {
  const storage = gbToDepthMapping.sort((a, b) => a.depth - b.depth).find((mapping) => mapping.gbs >= requestedGbs);
  if (!storage) {
    throw new Error(`Requested storage ${requestedGbs} is too high`);
  }
  return storage.depth;
}

export function calculateDepthAndAmount(days: number, gbs: number) {
  const oneDay = 24000 * 24 * 60 * 12;
  const amount = days * oneDay;
  const depth = getDepthForRequestedStorage(gbs);
  const bzzPrice = new BZZ(2n ** BigInt(depth) * BigInt(amount)).toBZZ(2);

  return { amount, depth, bzzPrice };
}

/**
 * How many gbs can a depth effectively store.
 */
const gbToDepthMapping = [
  { depth: 17, gbs: 0 }, //0.00 B,	 	0.00%	512 MB // for test
  { depth: 18, gbs: 0 }, //0.00 B,	 	0.00% 1GB
  { depth: 19, gbs: 0 }, //0.00 B,	 	0.00% 2GB
  { depth: 20, gbs: 0 }, //0.00 B,	 	0.00%		4.29 GB
  { depth: 21, gbs: 0 }, //0.00 B,	 	0.00%		8.59 GB
  { depth: 22, gbs: 4 }, //4.93 GB,	 	28.67%		17.18 GB
  { depth: 23, gbs: 17 }, //17.03 GB,	 	49.56%		34.36 GB
  { depth: 24, gbs: 44 }, //44.21 GB,	 	64.33%		68.72 GB
  { depth: 25, gbs: 102 }, //102.78 GB, 	74.78%		137.44 GB
  { depth: 26, gbs: 225 }, //225.86 GB, 	82.17%		274.88 GB
  { depth: 27, gbs: 480 }, //480.43 GB, 	87.39%		549.76 GB
  { depth: 28, gbs: 1000 }, //1.00 TB,	 	91.08%		1.10 TB
  { depth: 29, gbs: 2060 }, //2.06 TB,	 	93.69%		2.20 TB
  { depth: 30, gbs: 4200 }, //4.20 TB,	 	95.54%		4.40 TB
  { depth: 31, gbs: 8520 }, //8.52 TB,	 	96.85%		8.80 TB
  { depth: 32, gbs: 17200 }, //17.20 TB,	 	97.77%		17.59 TB
  { depth: 33, gbs: 34630 }, //34.63 TB,	 	98.42%		35.18 TB
  { depth: 34, gbs: 69580 }, //69.58 TB,	 	98.89%		70.37 TB
  { depth: 35, gbs: 139_630 }, //139.63 TB, 	99.21%		140.74 TB
  { depth: 36, gbs: 279_910 }, //279.91 TB, 	99.44%		281.47 TB
  { depth: 37, gbs: 560_730 }, //560.73 TB, 	99.61%		562.95 TB
  { depth: 38, gbs: 1_120_000 }, //1.12 PB,	 	99.72%		1.13 PB
  { depth: 39, gbs: 2_250_000 }, //2.25 PB,	 	99.80%		2.25 PB
  { depth: 40, gbs: 4_500_000 }, //4.50 PB,	 	99.86%		4.50 PB
  { depth: 41, gbs: 9_000_000 }, //9.00 PB,	 	99.90%		9.01 PB
];
