
import { loadFeatures, autoBindSteps } from "jest-cucumber";

import { requestConnectionSteps } from "./helpers/request-connection.steps";

const features = loadFeatures("**/*.feature");
autoBindSteps(features, [ requestConnectionSteps ]);

