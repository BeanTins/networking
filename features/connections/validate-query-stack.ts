
import { StackProps, Duration, CfnOutput } from "aws-cdk-lib"
import { Construct } from "constructs"
import { Function, Runtime, StartingPosition } from "aws-cdk-lib/aws-lambda"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources"
import * as path from "path"
import {Table} from "aws-cdk-lib/aws-dynamodb"
import { Queue } from "aws-cdk-lib/aws-sqs"
import { EnvvarsStack } from "../../infrastructure/envvars-stack"

interface ValidateQueryProps extends StackProps {
  connectionsTableName: string
  requestQueueArn: string
  responseQueueName: string
}

export class ValidateQuery extends EnvvarsStack {

  public readonly lambda: Function

  constructor(scope: Construct, id: string, props: ValidateQueryProps) {
    super(scope, id, props)

    const queue = Queue.fromQueueArn(this, "ValidateConnectionsRequestQueue", props.requestQueueArn)

    this.lambda = new NodejsFunction(this, "ValidateQueryHandlerFunction", {
      environment: {
        responseQueueName: props.responseQueueName,
        ConnectionsTable: props.connectionsTableName
      },
      memorySize: 1024,
      timeout: Duration.seconds(5),
      runtime: Runtime.NODEJS_16_X,
      handler: "lambdaHandler",
      entry: path.join(__dirname, "validate-query.ts"),
    })

    queue.grantSendMessages(this.lambda.grantPrincipal)

    const source = new SqsEventSource(queue, {
      batchSize: 1
    })
    this.lambda.addEventSource(source)
  }
} 

