
import { StackProps } from "aws-cdk-lib"
import { Construct } from "constructs"
import * as path from "path"
import { SpecBuilderFactory} from "./response"
import { CognitoAuthorizer} from "../../infrastructure/cognito-authorizer"
import { LambdaEndpoint } from "../../provisioning/lambda-endpoint"

interface ResponseStackProps extends StackProps {
  stageName: string
  networkerProjectionName: string
  connectionRequestTableName: string
  connectionsTableName: string
  userPoolArn: string
  eventBusName: string
}

export class ResponseCommand extends LambdaEndpoint {
  
  constructor(scope: Construct, id: string, props: ResponseStackProps) {

    const authorizerName = "CognitoAuthorizer"
    const authorizerSpec = new CognitoAuthorizer(authorizerName, props.userPoolArn)

    const specBuilder = SpecBuilderFactory.create()
    
    specBuilder.withSecurityExtension(authorizerSpec)
    specBuilder.selectingSecurity(authorizerName)
 
    super(scope, id, 
      {name: "ConnectionResponse",
       environment: 
       {NetworkerProjection: props.networkerProjectionName, 
        ConnectionRequestTable: props.connectionRequestTableName,
        ConnectionsTable: props.connectionsTableName},
       stageName: props.stageName,
       entry: path.join(__dirname, "./response.ts"),
       openAPISpec: specBuilder,
      stackName: props.stackName})
    }
} 

