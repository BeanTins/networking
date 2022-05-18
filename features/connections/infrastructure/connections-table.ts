import {Table, AttributeType, StreamViewType} from "aws-cdk-lib/aws-dynamodb"
import { StackProps, RemovalPolicy, CfnOutput } from "aws-cdk-lib"
import { Construct } from "constructs"
import {IPrincipal} from "aws-cdk-lib/aws-iam"
import {EnvvarsStack} from "../../../provisioning/envvars-stack"

interface ConnectionRequestTableProps extends StackProps {
  stageName: string;
}

export class ConnectionsTable extends EnvvarsStack {
  public readonly connections: Table
  constructor(scope: Construct, id: string, props: ConnectionRequestTableProps) {
    super(scope, id, props)
    this.connections = new Table(this, "Table", {
      partitionKey: { name: "memberId", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
    })

    this.addEnvvar("ConnectionsTable", this.connections.tableName)
    
    new CfnOutput(this, "ConnectionsTableArn" + props.stageName, {
      value: this.connections.tableArn,
      exportName: "ConnectionsTableArn" + props.stageName,
    })
  }

  get name(): string {
    return this.connections.tableName
  }

  grantAccessTo(accessor: IPrincipal){
    this.connections.grantReadWriteData(accessor)
  }
}

