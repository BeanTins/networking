
import { StackProps, Stack, Duration } from "aws-cdk-lib"
import { Construct } from "constructs"
import { Function, Runtime } from "aws-cdk-lib/aws-lambda"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import * as path from "path"
import {EventBus, Rule} from "aws-cdk-lib/aws-events"
import {LambdaFunction} from "aws-cdk-lib/aws-events-targets"

interface EventPublisherStackProps extends StackProps {
  memberProjectionName: string
  connectionRequestTableName: string
  networkingEventBusArn: string
}

export class UnspecifiedRequestHandlerStack extends Stack {

  public readonly lambda: Function

  constructor(scope: Construct, id: string, props: EventPublisherStackProps) {
    super(scope, id, props)

    this.lambda = new NodejsFunction(this, "UnspecifiedRequestHandlerFunction", {
      environment: {MemberProjection: props.memberProjectionName, ConnectionRequestTable: props.connectionRequestTableName},
      memorySize: 1024,
      timeout: Duration.seconds(5),
      runtime: Runtime.NODEJS_14_X,
      handler: "lambdaHandler",
      entry: path.join(__dirname, "unspecified-request-handler.ts"),
    })

    const networkingEventBus = EventBus.fromEventBusArn(this, "Networking-EventBus", props.networkingEventBusArn)

    const rule = new Rule(this, "UnspecifiedRequestHandlerLambdaRule", {
        eventBus: networkingEventBus,
        eventPattern: {detailType: ["UnspecifiedConnectionRequest"]},
        targets: [new LambdaFunction(this.lambda, {retryAttempts: 3})]
      })    
   }
} 

