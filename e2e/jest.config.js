module.exports = {
  testTimeout: 120000,
  maxWorkers: 1,
  testMatch: ['**/?(*.)+(e2e).[jt]s'],
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'node',
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/init.js'],
};
