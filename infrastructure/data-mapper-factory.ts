
import { DataMapper } from "@aws/dynamodb-data-mapper";
import DynamoDB from "aws-sdk/clients/dynamodb"

export class DataMapperFactory
{
  static create() : DataMapper{

    const client = new DynamoDB({region: 'us-east-1'})
    return new DataMapper({client})
  }
}


