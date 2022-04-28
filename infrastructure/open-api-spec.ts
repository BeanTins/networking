import { Authorization } from "aws-cdk-lib/aws-events"

export enum HttpMethod{
   Post = "post"
 }

class EndpointDefinition{
  summary?: string
  description?: string
  requestBody?: RequestBodyDefinition
  responses?: NamedResponse
  [name: string]: any
}

interface InfoDefinition{
   title: string
   description: string
   version: string
}

type NamedResponseDescription = Record<string, string>
type NamedResponse = Record<string, NamedResponseDescription>
type NamedEndpoint = Record<HttpMethod, EndpointDefinition>
type NamedPath = Record<string, NamedEndpoint>

export class OpenAPISpec{
   openapi: string
   paths: NamedPath
   info: InfoDefinition
   [name: string]: any
}

class SchemaDefinition{
   type?: string
   properties?: NamedProperty
   required?: string[]
}


class ContentDefinition{
   schema?: SchemaDefinition
}

export enum ContentType{
   JSON = "application/json"
}

type NamedContentDefinition = Record<ContentType, ContentDefinition>

class RequestBodyDefinition {
   required?: boolean
   content?: NamedContentDefinition 
}

class StringPropertyDefinition {
   minLength?: number
   maxLength?: number
   type: string
}

class IntegerPropertyDefinition {
   type: string
}

export interface OpenAPIExtension{
   name: string
   content: any
}

export class Property{
   name: string
   required?: boolean
}

export class StringProperty extends Property{
   minLength?: number
   maxLength?: number
}


type NamedProperty = Record<string, StringPropertyDefinition|IntegerPropertyDefinition>

export class EndpointBuilder{

   private endpoint: EndpointDefinition

   constructor(){
      this.endpoint = new EndpointDefinition()
   }

   describedAs(summary: string, description: string)
   {
     this.endpoint.summary = summary
     this.endpoint.description = description
   }

   withExtension(extension: OpenAPIExtension)
   {
     this.endpoint[extension.name] = extension.content
   }

   withResponse(code: string, message: string)
   {
      if (this.endpoint.responses == undefined)
      {
         this.endpoint.responses = {}
      }

      this.endpoint.responses[code] = {}
      
      this.endpoint.responses[code].description = message
   }

   withRequestBodyStringProperty(param: StringProperty)
   {
      if (this.endpoint.requestBody == undefined)
      {
         this.endpoint.requestBody = {required: true}
      }

      if (this.endpoint.requestBody.content == undefined)
      {
         this.endpoint.requestBody.content = {
            [ContentType.JSON]: {
               schema: {type: "object"}
            }
         }
      }

      if (this.endpoint.requestBody.content[ContentType.JSON].schema!.properties == undefined)
      {
         this.endpoint.requestBody.content[ContentType.JSON].schema!.properties = {}
      }

      this.endpoint.requestBody.content[ContentType.JSON].schema!.properties![param.name] = {type: "string"}

      if (param.required)
      {
         if (this.endpoint.requestBody.content[ContentType.JSON].schema!.required == undefined)
         {
            this.endpoint.requestBody.content[ContentType.JSON].schema!.required = []
         }

         this.endpoint.requestBody.content[ContentType.JSON].schema!.required?.push(param.name)
      }

      if (param.minLength != undefined)
      {
         (this.endpoint.requestBody.content[ContentType.JSON].schema!.properties![param.name] as StringPropertyDefinition).minLength = param.minLength
      }

      if (param.maxLength != undefined)
      {
         (this.endpoint.requestBody.content[ContentType.JSON].schema!.properties![param.name] as StringPropertyDefinition).maxLength = param.maxLength
      }
      
   }

   build(): EndpointDefinition{

      return this.endpoint
   }
 }
 
export class OpenAPISpecBuilder{
   private spec: OpenAPISpec
   private endpoints: Map<[string, HttpMethod], EndpointBuilder>

   constructor(version: string)
   {
      this.spec = new OpenAPISpec()
      this.spec.openapi = version
      this.spec.paths = {}
      this.endpoints = new Map<[string, HttpMethod], EndpointBuilder>()
   }

   withEndpoint(path: string, method: HttpMethod){
     const endpoint = new EndpointBuilder()
     this.endpoints.set([path, method], endpoint)
   
     return endpoint
   }

   getEndpoints(): Map<[string, HttpMethod], EndpointBuilder>
   {
      return this.endpoints
   }

   describedAs(title: string, description: string, version: string){
     this.spec.info = {title: title, description: description, version: version}
   }

   withSecurityExtension(extension: OpenAPIExtension)
   {
     this.spec.components = {securitySchemes: {[extension.name]:extension.content}}
   }

   selectingSecurity(securityScheme: string, scopes = [])
   {
     this.spec.security = [{[securityScheme]: scopes}]
   }
   
   withExtension(extension: OpenAPIExtension)
   {
     this.spec[extension.name] = extension.content
   }

   build(): any
   {
//       components:
//   securitySchemes:
//     UserPool:
//       type: apiKey
//       name: Authorization
//       in: header
//       x-amazon-apigateway-authtype: cognito_user_pools
//       x-amazon-apigateway-authorizer:
//         type: cognito_user_pools
//         providerARNs:
//           - !GetAtt CognitoUserPool.Arn
      this.endpoints.forEach((endpoint: EndpointBuilder, pathAndMethod: [string, HttpMethod]) => {
        const path = pathAndMethod[0]
        const method = pathAndMethod[1]
        this.spec.paths[path] = {[method]: endpoint.build()}
      })

      //this.spec.security = [{CognitoUserPool: ["beantinsusers/member"]}]            

     // this.spec.security = [{"CognitoUserPool": []}] //"beantinsusers/member"]}] 

      
      //    {"CognitoUserPool": 
      //      {
      //         // type: "oauth2",
      //         // "x-amazon-apigateway-authorizer": {
      //         //    type: "jwt", 
      //         //    jwtConfiguration: {
      //         //       issuer: "https://cognito-idp.region.amazonaws.com/userPoolId", 
      //         //       audience: [
      //         //          "audience1", 
      //         //          "audience2"
      //         //       ]
      //         //    },
      //         //    identitySource: "$request.header.Authorization"
      //         // }
      //         type: "apiKey",
      //         name: "Authorization",
      //         in: "header",
      //         "x-amazon-apigateway-authtype": "cognito_user_pools",
      //         "x-amazon-apigateway-authorizer": {
      //            type: "cognito_user_pools",
      //            providerARNs: ["arn:aws:cognito-idp:us-east-1:451173013135:userpool/us-east-1_HqXE9cMpW"] 
      //         }

      //      }
      //   }
      //  }      

// "securitySchemes": {
//   "jwt-authorizer-oauth": {
//     "type": "oauth2",
//      "x-amazon-apigateway-authorizer": {
//        "type": "jwt",
//        "jwtConfiguration": {
//           "issuer": "https://cognito-idp.region.amazonaws.com/userPoolId",
//           "audience": [
//             "audience1",
//             "audience2"
//           ]
//         },
//         "identitySource": "$request.header.Authorization"
//     }
//   }
// }


     
     return this.spec
   }
}
