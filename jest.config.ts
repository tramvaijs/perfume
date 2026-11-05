export default {
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: false,
      },
    ],
  },
  testRegex: '(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$',
  testPathIgnorePatterns: [
    '_mock.ts',
    'stepsTestConstants.ts',
    '/node_modules/',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  globals: {
    window: true,
  },
  coveragePathIgnorePatterns: ['/node_modules/', '/test/']
};
