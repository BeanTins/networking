import {Table, AttributeType, StreamViewType, ProjectionType} from "aws-cdk-lib/aws-dynamodb"
import { StackProps, RemovalPolicy } from "aws-cdk-lib"
import { Construct } from "constructs"
import {IPrincipal} from "aws-cdk-lib/aws-iam"
import {EnvvarsStack} from "../../../infrastructure/envvars-stack"

interface RequestTableProps extends StackProps {
  stageName: string;
}

export class RequestTable extends EnvvarsStack {
  public readonly connectionRequests: Table
  constructor(scope: Construct, id: string, props: RequestTableProps) {
    super(scope, id, props)
    this.connectionRequests = new Table(this, "Table", {
      partitionKey: { name: "invitationId", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      readCapacity: 1,
      writeCapacity: 1,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
    })

    this.connectionRequests.addGlobalSecondaryIndex({
      indexName: "networkersIndex",
      partitionKey: {name: "initiatingNetworkerId", type: AttributeType.STRING},
      sortKey: { name: "invitedNetworkerId", type: AttributeType.STRING},
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

