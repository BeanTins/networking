import {CfnOutput, Stack, StackProps} from "aws-cdk-lib"
import {Construct} from "constructs"

export class EnvvarsStack extends Stack {
  private _envvars: Record<string, CfnOutput> = {}

  constructor(scope: Construct, id: string, props: StackProps)
  {
    super(scope, id, props)
  }
  get envvars() : Record<string, CfnOutput> {
    return this._envvars
  }

  addEnvvar(key: string, value: string)
  {
    this._envvars[key] = new CfnOutput(this, key, {value: value})
  }
}

