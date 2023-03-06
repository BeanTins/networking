import {Table, AttributeType} from "aws-cdk-lib/aws-dynamodb"
import { StackProps, RemovalPolicy } from "aws-cdk-lib"
import { Construct } from "constructs"
import {IPrincipal} from "aws-cdk-lib/aws-iam"
import {EnvvarsStack} from "../../../infrastructure/envvars-stack" 

interface NetworkerProjectionProps extends StackProps {
  stageName: string;
}

export class NetworkerProjection extends EnvvarsStack {
  public readonly networkerProjection: Table
  constructor(scope: Construct, id: string, props: NetworkerProjectionProps) {
    super(scope, id, props)
    this.networkerProjection = new Table(this, "Table", {
      partitionKey: { name: "id", type: AttributeType.STRING },
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    this.addEnvvar("Name", this.networkerProjection.tableName)

    this.addEnvvar("Arn", this.networkerProjection.tableArn)
  }

  get name(): string {
    return this.networkerProjection.tableName
  }

  grantAccessTo(accessor: IPrincipal){
    this.networkerProjection.grantReadWriteData(accessor)
  }
}

