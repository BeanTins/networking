import {Table, AttributeType, StreamViewType} from "aws-cdk-lib/aws-dynamodb"
import { StackProps, RemovalPolicy } from "aws-cdk-lib"
import { Construct } from "constructs"
import {IPrincipal} from "aws-cdk-lib/aws-iam"
import {EnvvarsStack} from "../../../infrastructure/envvars-stack"

export class ConnectionsTable extends EnvvarsStack {
  public readonly connections: Table
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props)
    this.connections = new Table(this, "Table", {
      partitionKey: { name: "networkerId", type: AttributeType.STRING },
      readCapacity: 1,
      writeCapacity: 2,
      removalPolicy: RemovalPolicy.DESTROY,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
    })

    this.addEnvvar("Name", this.connections.tableName)
    this.addEnvvar("Arn", this.connections.tableArn)
  }

  get name(): string {
    return this.connections.tableName
  }

  grantAccessTo(accessor: IPrincipal){
    this.connections.grantReadWriteData(accessor)
  }
}

