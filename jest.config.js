module.exports = {
  // Use jsdom as the test environment to simulate a browser environment
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  collectCoverageFrom: ["**/*.{ts,tsx}", "!**/*.d.ts", "!**/node_modules/**"],
  coverageDirectory: "coverage",
};
