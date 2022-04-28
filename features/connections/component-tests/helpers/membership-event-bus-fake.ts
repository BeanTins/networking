import {Stack, StackProps, CfnOutput, Duration} from "aws-cdk-lib"
import { Construct } from "constructs"
import {EventBus, Rule } from "aws-cdk-lib/aws-events"
import {SqsQueue} from "aws-cdk-lib/aws-events-targets"
import {Queue} from "aws-cdk-lib/aws-sqs"

interface EventBusProps extends StackProps {
  stageName: string
}

export class MembershipEventBusFake extends Stack {
  public readonly Arn: string
  public readonly Name: string
  private eventBus: EventBus
  constructor(scope: Construct, id: string, props: EventBusProps) {
    super(scope, id, props)

    this.eventBus = new EventBus(this, "Membership"  + props.stageName + "_EventBusFake")

    new CfnOutput(this, "MembershipEventBusFakeArn" + props.stageName, {
      value: this.eventBus.eventBusArn,
      exportName: "MembershipEventBusFakeArn" + props.stageName
    })

    this.Arn = this.eventBus.eventBusArn
    this.Name = this.eventBus.eventBusName
  }

  listenOnQueueFor(queueArn: string){

    const queue = Queue.fromQueueArn(this, "listenerQueue", queueArn)

    const rule = new Rule(this, "ListenerQueueRule", {
      eventBus: this.eventBus,
      eventPattern: {detailType: ["MemberActivatedEvent"]}
    })

    const dlq = new Queue(this, "DeadLetterQueue")

    rule.addTarget(new SqsQueue(queue, 
      {maxEventAge: Duration.minutes(10), 
       retryAttempts: 2, 
       deadLetterQueue: dlq}))
  }
}
