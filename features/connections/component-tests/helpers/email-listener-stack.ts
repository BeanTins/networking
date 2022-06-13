import {Stack, StackProps, CfnOutput} from "aws-cdk-lib"
import { Construct } from "constructs"
import {SqsSubscription} from "aws-cdk-lib/aws-sns-subscriptions"
import {Queue} from "aws-cdk-lib/aws-sqs"
import {Topic} from "aws-cdk-lib/aws-sns"
import {AwsCustomResource, AwsCustomResourcePolicy} from "aws-cdk-lib/custom-resources"
import {PolicyStatement, Effect} from "aws-cdk-lib/aws-iam"

interface EmailListenerProps extends StackProps {
  deploymentName: string
}

export class EmailListenerStack extends Stack {
  public readonly Arn: string
  public readonly Name: string
  public readonly ConfigSetName: string
  
  constructor(scope: Construct, id: string, props: EmailListenerProps) {
    super(scope, id, props)

    this.ConfigSetName = props.deploymentName + "defaultConfigSet"

    const sesPolicy = this.buildAccessPolicy()

    const configSet = this.buildConfigurationSet(sesPolicy)

    const emailNotificationsTopic = new Topic(this, 'sesDefaultNotificationsTopic', {})

    this.buildEventDestination(emailNotificationsTopic, sesPolicy, configSet)

    const queue = this.buildQueue(props.deploymentName)

    emailNotificationsTopic.addSubscription(new SqsSubscription(queue))
  }

  private buildQueue(deploymentName: string) {
    const queueName = deploymentName + "EmailListenerQueueName"

    const queue = new Queue(this, "EmailListenerQueue")

    new CfnOutput(this, queueName, {
      value: queue.queueName,
      exportName: queueName,
      description: 'name of the queue used during testing for listening to sent emails'
    })

    const queueArn = deploymentName + "EmailListenerQueueArn"

    new CfnOutput(this, queueArn, {
      value: queue.queueArn,
      exportName: queueArn,
      description: 'ARN of the queue used during testing for listening to sent emails'
    })

    return queue
  }

  private buildEventDestination(sesNotificationsTopic: Topic, sesPolicy: PolicyStatement, configSet: AwsCustomResource) {
    
    const EventDestinationName = 'defaultNotifications';
    const ConfigurationSetName = this.ConfigSetName

    const snsDest = new AwsCustomResource(this, EventDestinationName, {
      onUpdate: {
        service: 'SESV2',
        action: 'createConfigurationSetEventDestination',
        parameters: {
          ConfigurationSetName,
          EventDestinationName,
          EventDestination: {
            SnsDestination: {
              TopicArn: sesNotificationsTopic.topicArn,
            },
            MatchingEventTypes: ["DELIVERY"],
            Enabled: true,
          },
        },
        physicalResourceId: {},
      },
      onDelete: {
        service: 'SESV2',
        action: 'deleteConfigurationSetEventDestination',
        parameters: {
          ConfigurationSetName,
          EventDestinationName,
        },
      },
      policy: AwsCustomResourcePolicy.fromStatements([sesPolicy]),
      logRetention: 7,
    })
    snsDest.node.addDependency(configSet)
  }

  private buildConfigurationSet(sesPolicy: PolicyStatement) {
    
    const ConfigurationSetName = this.ConfigSetName
    const configSet = new AwsCustomResource(this, ConfigurationSetName, {
      onUpdate: {
        service: 'SESV2',
        action: 'createConfigurationSet',
        parameters: {
          ConfigurationSetName,
          SendingOptions: { SendingEnabled: true },
        },
        physicalResourceId: {},
      },
      onDelete: {
        service: 'SESV2',
        action: 'deleteConfigurationSet',
        parameters: {
          ConfigurationSetName,
        },
      },
      policy: AwsCustomResourcePolicy.fromStatements([sesPolicy]),
      logRetention: 7,
    })
    return configSet
  }

  private buildAccessPolicy() {
    return new PolicyStatement({
      actions: [
        'ses:CreateConfigurationSet',
        'ses:DeleteConfigurationSet',
        'ses:CreateConfigurationSetEventDestination',
        'ses:DeleteConfigurationSetEventDestination',
        'ses:CreateEmailIdentity',
        'ses:DeleteEmailIdentity',
      ],
      resources: ['*'],
      effect: Effect.ALLOW,
    })
  }
}
