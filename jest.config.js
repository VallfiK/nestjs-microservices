module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
  coveragePathIgnorePatterns: ['node_modules/', 'dist/'],
  moduleNameMapper: {
    '^@nestjs-microservices/shared$': '<rootDir>/libs/shared/src/index.ts',
  },
  roots: ['<rootDir>/apps/', '<rootDir>/libs/'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};