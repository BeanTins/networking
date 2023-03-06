import { StageProps, Stage } from "aws-cdk-lib"
import { Construct } from "constructs"
import { NetworkingEventBus } from "../infrastructure/event-bus"
import { StackFactory } from "./stack-factory"
import { ConnectionInfrastructure } from "../features/connections/infrastructure/connection-infrastructure"

interface NetworkingStageProps extends StageProps{
  stageName: string
  userPoolId: string 
  userPoolArn: string 
  stackNamePrepend?: string
  membershipEventBusArn: string
  emailConfigurationSet?: string
  notificationEmailAddress: string
  eventListenerQueueArn?: string
}

export class NetworkingStage extends Stage implements Stage{
  private eventBus: NetworkingEventBus
  private stackFactory: StackFactory
  private connectionInfrastructure: ConnectionInfrastructure

  get envvars(): string[] {
    return this.stackFactory.envvars
  }

  constructor(scope: Construct, id: string, props: NetworkingStageProps) {
    
    super(scope, id, props)

    this.stackFactory = new StackFactory(props.stackNamePrepend, undefined, this)

    this.eventBus = this.stackFactory.create(NetworkingEventBus, { stageName: props.stageName })

    if (props.eventListenerQueueArn != undefined) {
      this.eventBus.listenOnQueueFor(props.eventListenerQueueArn)
    }

    this.connectionInfrastructure = new ConnectionInfrastructure(props.stackNamePrepend, this)

    this.connectionInfrastructure.build(props.membershipEventBusArn, 
      props.stageName, 
      this.eventBus, 
      props.userPoolArn,
      props.emailConfigurationSet!,
      props.notificationEmailAddress)
        
  }
}







