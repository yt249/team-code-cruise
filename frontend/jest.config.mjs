export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  transform: {
    '^.+\.[jt]sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'ecmascript', jsx: true },
          transform: { react: { runtime: 'automatic' } },
          target: 'es2022'
        },
        module: { type: 'commonjs' }
      }
    ]
  },
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy'
  },
  clearMocks: true
}
