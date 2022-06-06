
import type {Config} from "@jest/types";

// Sync object
const config: Config.InitialOptions = {
verbose: true,
displayName: "Contract Tests",
preset: "ts-jest",
testEnvironment: "node",
testMatch: ["**/contract-tests/*tests.ts"],
reporters: [
    'default',
    [ 'jest-junit', {
      outputDirectory: "./reports/contract-tests",
      outputName: "test-results.xml",
    } ]
  ]
}
export default config;

