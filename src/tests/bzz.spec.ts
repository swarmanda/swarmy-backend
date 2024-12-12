import { BZZ } from '../app/token/bzz';

test('BZZ', () => {
  expect(new BZZ('35052991985903451').toBZZ(3)).toBe(3.505);
  expect(new BZZ('35052991985903451').toString()).toBe('3.5');
});
