module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleNameMapper: {
  '^@splitwise/shared-types$':
    '<rootDir>/../../packages/shared-types/src/index.jest.ts',
  '^@splitwise/shared-types/api$':
    '<rootDir>/../../packages/shared-types/src/api.ts',
  '^@splitwise/shared-types/domain$':
    '<rootDir>/../../packages/shared-types/src/domain.ts',
  },
};