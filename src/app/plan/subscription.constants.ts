export const subscriptionConfig = {
  currency: 'EUR',
  storageCapacity: {
    pricePerGb: 0.2,
    defaultOption: 6,
    options: [
      { value: 3, label: '8 GB' },
      { value: 4, label: '16 GB' },
      { value: 5, label: '32 GB' },
      { value: 6, label: '64 GB' },
      { value: 7, label: '128 GB' },
      { value: 8, label: '256 GB' },
      { value: 9, label: '512 GB' },
      { value: 10, label: '1 TB' },
    ],
  },
  bandwidth: {
    pricePerGb: 0.1,
    defaultOption: 6,
    options: [
      { value: 3, label: '8 GB' },
      { value: 4, label: '16 GB' },
      { value: 5, label: '32 GB' },
      { value: 6, label: '64 GB' },
      { value: 7, label: '128 GB' },
      { value: 8, label: '256 GB' },
      { value: 9, label: '512 GB' },
      { value: 10, label: '1 TB' },
    ],
  },
};
