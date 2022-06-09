
import type {Config} from "@jest/types";

const config: Config.InitialOptions = {
displayName: "Component Tests",
preset: "ts-jest",
testMatch: [
"**/jest-cucumber-*setup.ts"
  ],
transform: {
"^.+\\.(ts|tsx)$": "ts-jest"
},
reporters: [
  'default',
  [ 'jest-junit', {
    outputDirectory: "./reports/component-tests",
    outputName: "test-results.xml",
  } ]
]
}

export default config;

