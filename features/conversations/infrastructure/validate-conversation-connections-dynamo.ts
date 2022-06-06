import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb"
import { ValidateConversationConnections } from "../domain/validate-conversation-connections"
import logger from "../../../infrastructure/lambda-logger"

export class ValidateConversationConnectionsDynamo implements ValidateConversationConnections {
    private dynamoDB: DynamoDBDocumentClient
    private tableName: string
  
    constructor(region: string)
    {
      const client = new DynamoDBClient({region: region});
      this.dynamoDB = DynamoDBDocumentClient.from(client);
      
      this.tableName = process.env.ConnectionsTable!
    }

    async isInstigatorConnectedWithEveryone(instigatorMemberId: string, otherPartipantIds: Set<string>): Promise<boolean>
    {
      console.log("isInstigatorConnectedWithEveryone")
      let connectedToAll: boolean = false

      var connectedToMembersObject: any = {}
      var index = 0;
      console.log("starting..")
      otherPartipantIds.forEach(function(value) {
          index++;
          var titleKey = ":connectedToMemberId"+index
          connectedToMembersObject[titleKey.toString()] = value
      })
      console.log("started")

      var params = {
        KeyConditionExpression: "#memberId = :memberId",
        FilterExpression: "#connectedToMemberId IN ("+Object.keys(connectedToMembersObject).toString()+ ")",
        ExpressionAttributeValues: {...connectedToMembersObject,":memberId": instigatorMemberId},
        ExpressionAttributeNames: { "#connectedToMemberId": "connectedToMemberId" , "#memberId": "memberId"},
        TableName: this.tableName 
      }
      console.log(params)
      logger.verbose(JSON.stringify(params))
      try{
          let result = await this.dynamoDB.send(new QueryCommand(params))
          logger.verbose("wait for member presence scan result - " + JSON.stringify(result))
          if((result.Count != null) && result.Count == otherPartipantIds.size)
          {
            connectedToAll = true
          }
        }
      catch(err){
        logger.error("connection table query failed with " + JSON.stringify(err))
      }
   
      return connectedToAll
    }
}  

