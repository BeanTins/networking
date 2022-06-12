import {CfnOutput, Stack, StackProps} from "aws-cdk-lib"
import {Construct} from "constructs"

export class EnvvarsStack extends Stack {
  private _envvars: string[]
  private prepend: string

  constructor(scope: Construct, id: string, props: StackProps)
  {
    super(scope, id, props)

    this._envvars = []
    this.prepend = this.stackName
  }
  get envvars() : string[] {
    return this._envvars
  }

  addEnvvar(key: string, value: string)
  {
    new CfnOutput(this, key, {value: value, exportName: this.stackName + key})
    this._envvars.push(this.stackName + key)
  }
}

