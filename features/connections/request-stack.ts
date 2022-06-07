
import { StackProps } from "aws-cdk-lib"
import { Construct } from "constructs"
import * as path from "path"
import { SpecBuilderFactory} from "./request"
import { CognitoAuthorizer} from "../../infrastructure/cognito-authorizer"
import { LambdaEndpoint } from "../../provisioning/lambda-endpoint"


interface RequestStackProps extends StackProps {
  stageName: string
  memberProjectionName: string
  connectionRequestTableName: string
  userPoolArn: string
  eventBusName: string
}

export class RequestStack extends LambdaEndpoint {
  
  constructor(scope: Construct, id: string, props: RequestStackProps) {

    const authorizerName = "CognitoAuthorizer"
    const authorizerSpec = new CognitoAuthorizer(authorizerName, props.userPoolArn)
    const specBuilder = SpecBuilderFactory.create()

    specBuilder.withSecurityExtension(authorizerSpec)
    specBuilder.selectingSecurity(authorizerName)
 
    super(scope, id, 
      {name: "ConnectionRequest",
       environment: {MemberProjection: props.memberProjectionName, ConnectionRequestTable: props.connectionRequestTableName, EventBusName: props.eventBusName},
       stageName: props.stageName,
       entry: path.join(__dirname, "./request.ts"),
       openAPISpec: specBuilder})
    }
} 

