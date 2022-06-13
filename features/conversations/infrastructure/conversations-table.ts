import {Table, AttributeType, StreamViewType} from "aws-cdk-lib/aws-dynamodb"
import { StackProps, RemovalPolicy } from "aws-cdk-lib"
import { Construct } from "constructs"
import {IPrincipal} from "aws-cdk-lib/aws-iam"
import {EnvvarsStack} from "../../../infrastructure/envvars-stack"

interface ConversationsRequestTableProps extends StackProps {
  stageName: string;
}

export class ConversationsTable extends EnvvarsStack {
  public readonly conversations: Table
  constructor(scope: Construct, id: string, props: ConversationsRequestTableProps) {
    super(scope, id, props)
    this.conversations = new Table(this, "Table", {
      partitionKey: { name: "id", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
    })

    this.addEnvvar("Name", this.conversations.tableName)
    this.addEnvvar("Arn", this.conversations.tableArn)
  }

  get name(): string {
    return this.conversations.tableName
  }

  grantAccessTo(accessor: IPrincipal){
    this.conversations.grantReadWriteData(accessor)
  }
}

