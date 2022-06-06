
import { StackProps } from "aws-cdk-lib"
import { Construct } from "constructs"
import * as path from "path"
import { specBuilder} from "./start"
import { CognitoAuthorizer} from "../../infrastructure/cognito-authorizer"
import { LambdaEndpoint } from "../../provisioning/lambda-endpoint"


interface StartStackProps extends StackProps {
  stageName: string
  connectionsTableName: string
  conversationsTableName: string
  userPoolArn: string
}

export class StartStack extends LambdaEndpoint {
  
  constructor(scope: Construct, id: string, props: StartStackProps) {

    const authorizerName = "CognitoAuthorizer"
    const authorizerSpec = new CognitoAuthorizer(authorizerName, props.userPoolArn)

    specBuilder.withSecurityExtension(authorizerSpec)
    specBuilder.selectingSecurity(authorizerName)
 
    super(scope, id, 
      {name: "ConversationStart",
       environment: {ConnectionsTable: props.connectionsTableName, ConversationsTable: props.conversationsTableName},
       stageName: props.stageName,
       entry: path.join(__dirname, "./start.ts"),
       openAPISpec: specBuilder})
    }
} 

