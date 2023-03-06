
import { StackProps, Stack, Duration } from "aws-cdk-lib"
import { Construct } from "constructs"
import { Function, Runtime, StartingPosition } from "aws-cdk-lib/aws-lambda"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources"
import * as path from "path"
import {Table} from "aws-cdk-lib/aws-dynamodb"
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam"

interface InvitationPolicyStackProps extends StackProps {
  connectionRequestTable: Table
  eventBusName: string
  networkerProjectionName: string
  emailConfigurationSet?: string 
  notificationEmailAddress: string
}

export class InvitationPolicyStack extends Stack {

  public readonly lambda: Function

  constructor(scope: Construct, id: string, props: InvitationPolicyStackProps) {
    super(scope, id, props)

    let environment: any = {
      EventBusName: props.eventBusName, 
      NetworkerProjection: props.networkerProjectionName,
      NotificationEmailAddress: props.notificationEmailAddress
    }

    if (props.emailConfigurationSet != undefined)
    {
      environment["emailConfigurationSet"] = props.emailConfigurationSet
    }

    this.lambda = new NodejsFunction(this, "InvitationPolicyFunction", {
      environment: environment,
      memorySize: 1024,
      timeout: Duration.seconds(5),
      runtime: Runtime.NODEJS_16_X,
      handler: "lambdaHandler",
      entry: path.join(__dirname, "invitation-policy.ts"),
    })

    this.lambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'ses:SendEmail',
          'ses:SendRawEmail',
          'ses:SendTemplatedEmail',
        ],
        resources: ["*"],
      }),
    )
    
    const source = new DynamoEventSource(props.connectionRequestTable, {
      startingPosition: StartingPosition.LATEST,
      batchSize: 1
    })
    this.lambda.addEventSource(source)
  }
} 

