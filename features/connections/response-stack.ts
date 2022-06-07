
import { StackProps } from "aws-cdk-lib"
import { Construct } from "constructs"
import * as path from "path"
import { SpecBuilderFactory} from "./response"
import { CognitoAuthorizer} from "../../infrastructure/cognito-authorizer"
import { LambdaEndpoint } from "../../provisioning/lambda-endpoint"

interface ResponseStackProps extends StackProps {
  stageName: string
  memberProjectionName: string
  connectionRequestTableName: string
  connectionsTableName: string
  userPoolArn: string
  eventBusName: string
}

export class ResponseStack extends LambdaEndpoint {
  
  constructor(scope: Construct, id: string, props: ResponseStackProps) {

    const authorizerName = "CognitoAuthorizer"
    const authorizerSpec = new CognitoAuthorizer(authorizerName, props.userPoolArn)

    const specBuilder = SpecBuilderFactory.create()
    
    specBuilder.withSecurityExtension(authorizerSpec)
    specBuilder.selectingSecurity(authorizerName)
 
    super(scope, id, 
      {name: "ConnectionResponse",
       environment: 
       {MemberProjection: props.memberProjectionName, 
        ConnectionRequestTable: props.connectionRequestTableName,
        ConnectionsTable: props.connectionsTableName},
       stageName: props.stageName,
       entry: path.join(__dirname, "./response.ts"),
       openAPISpec: specBuilder})
    }
} 

