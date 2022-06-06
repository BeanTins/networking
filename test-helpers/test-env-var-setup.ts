
import {readFileSync, readdirSync} from "fs"
import * as path from "path"

export class TestEnvVarSetup{
  static configureStageVariable(envVarBaseName: string) {
    const envVarName = envVarBaseName + TestEnvVarSetup.getStage()
  
    if (process.env[envVarName] == undefined) {
      process.env[envVarBaseName] = TestEnvVarSetup.resolveOutput(envVarName)
      console.log(process.env[envVarBaseName])
    }
    else {
      process.env[envVarBaseName] = process.env[envVarName]
    }
  }
  
  static configureVariable(envVarName: string)
  {
    if (process.env[envVarName] == undefined)
    {
      process.env[envVarName] = TestEnvVarSetup.resolveOutput(envVarName)
    }
  }

  static getStage()
  {
    let stage:string

    if (process.env.PipelineStage != undefined)
    {
        stage = process.env.PipelineStage 
    }
    else 
    {
        stage = "dev"
    }

    return stage
  }
  
  static resolveOutput(targetOutputName: string)
  {
    var output: string | undefined

    const outputFileList = readdirSync(path.join(__dirname, "../")).filter(fn => fn.endsWith("_outputs.json"))

    if (outputFileList.length > 0)
    {
        for (const outputFile of outputFileList)
        {
            const deployOutputs = JSON.parse(readFileSync(outputFile).toString())

            for (const stackName in deployOutputs)
            {
                for (const outputName in deployOutputs[stackName])
                {
                    if (targetOutputName == outputName)
                    {
                        output = deployOutputs[stackName][outputName]
                        break
                    }
                }
            }
        }
    }

    if (output == undefined)
    {
        throw Error(targetOutputName + " undefined")
    }

    return output
  }
}

