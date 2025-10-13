module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/server.ts',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 65,
      functions: 70,
      lines: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testTimeout: 10000,
  verbose: true,
};
