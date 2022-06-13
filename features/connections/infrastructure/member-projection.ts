import {Table, AttributeType} from "aws-cdk-lib/aws-dynamodb"
import { StackProps, RemovalPolicy } from "aws-cdk-lib"
import { Construct } from "constructs"
import {IPrincipal} from "aws-cdk-lib/aws-iam"
import {EnvvarsStack} from "../../../infrastructure/envvars-stack" 

interface MemberProjectionProps extends StackProps {
  stageName: string;
}

export class MemberProjection extends EnvvarsStack {
  public readonly memberProjection: Table
  constructor(scope: Construct, id: string, props: MemberProjectionProps) {
    super(scope, id, props)
    this.memberProjection = new Table(this, "Table", {
      partitionKey: { name: "id", type: AttributeType.STRING },
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    this.addEnvvar("Name", this.memberProjection.tableName)

    this.addEnvvar("Arn", this.memberProjection.tableName)
  }

  get name(): string {
    return this.memberProjection.tableName
  }

  grantAccessTo(accessor: IPrincipal){
    this.memberProjection.grantReadWriteData(accessor)
  }
}

