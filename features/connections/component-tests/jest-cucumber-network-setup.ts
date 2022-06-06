
import { loadFeatures, autoBindSteps } from "jest-cucumber";

import { connectionSteps } from "./helpers/connection.steps";

let options:any = {}

if (process.env.filter != undefined)
{
    options = {tagFilter: process.env.filter}
}
const features = loadFeatures("**/connections/**/*.feature", options)
autoBindSteps(features, [ connectionSteps ]);

