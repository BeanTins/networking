import {Table, AttributeType, StreamViewType, ProjectionType} from "aws-cdk-lib/aws-dynamodb"
import { StackProps, RemovalPolicy, CfnOutput } from "aws-cdk-lib"
import { Construct } from "constructs"
import {IPrincipal} from "aws-cdk-lib/aws-iam"
import {EnvvarsStack} from "../../../infrastructure/envvars-stack"

interface ConnectionRequestTableProps extends StackProps {
  stageName: string;
}

export class ConnectionRequestTable extends EnvvarsStack {
  public readonly connectionRequests: Table
  constructor(scope: Construct, id: string, props: ConnectionRequestTableProps) {
    super(scope, id, props)
    this.connectionRequests = new Table(this, "Table", {
      partitionKey: { name: "invitationId", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
    })

    this.connectionRequests.addGlobalSecondaryIndex({
      indexName: "membersIndex",
      partitionKey: {name: "initiatingMemberId", type: AttributeType.STRING},
      sortKey: { name: "invitedMemberId", type: AttributeType.STRING},
      readCapacity: 1,
      writeCapacity: 1,
      projectionType: ProjectionType.ALL,
    })

    this.addEnvvar("Name", this.connectionRequests.tableName)
    this.addEnvvar("Arn", this.connectionRequests.tableArn)
  }

  get name(): string {
    return this.connectionRequests.tableName
  }

  grantAccessTo(accessor: IPrincipal){
    this.connectionRequests.grantReadWriteData(accessor)
  }
}

