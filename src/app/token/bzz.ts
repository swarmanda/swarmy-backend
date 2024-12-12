export class BZZ {
  plur: bigint;

  constructor(plur: bigint | string | number) {
    this.plur = BigInt(plur);
  }

  toString(): string {
    return this.toBZZ(2).toString();
  }

  toBZZ(precision: number): number {
    const x = this.plur / 10n ** (16n - BigInt(precision));
    return Number(x) / 10 ** precision;
  }
}
