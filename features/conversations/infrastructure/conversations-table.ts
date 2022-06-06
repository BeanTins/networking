import {Table, AttributeType, StreamViewType} from "aws-cdk-lib/aws-dynamodb"
import { StackProps, RemovalPolicy, CfnOutput } from "aws-cdk-lib"
import { Construct } from "constructs"
import {IPrincipal} from "aws-cdk-lib/aws-iam"
import {EnvvarsStack} from "../../../provisioning/envvars-stack"

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

    this.addEnvvar("ConversationsTable", this.conversations.tableName)
    
    new CfnOutput(this, "ConversationsTableArn" + props.stageName, {
      value: this.conversations.tableArn,
      exportName: "ConversationsTableArn" + props.stageName,
    })
  }

  get name(): string {
    return this.conversations.tableName
  }

  grantAccessTo(accessor: IPrincipal){
    this.conversations.grantReadWriteData(accessor)
  }
}

