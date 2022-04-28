
import {readFileSync, readdirSync} from "fs"
import * as path from "path"

export function resolveOutput(targetOutputName: string)
{
    var output: string | undefined

    const outputFileList = readdirSync(path.join(__dirname, "../../../..")).filter(fn => fn.endsWith("_outputs.json"))

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

