module.exports = {
  testTimeout: 60000,
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.interface.ts',
        '!src/**/*.dto.ts',
        '!src/**/*.entity.ts',
        '!src/**/*.module.ts',
        '!src/main.ts',
      ],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.int.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest',
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      setupFiles: ['<rootDir>/test/e2e/setup.ts'],
    },
  ],
};
