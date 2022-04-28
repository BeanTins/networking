import {OpenAPISpecBuilder, OpenAPISpec, HttpMethod} from "../open-api-spec"

let spec: OpenAPISpec
let specBuilder: OpenAPISpecBuilder

beforeEach(() => {
  specBuilder = new OpenAPISpecBuilder("3.0.0")
})

test("version specified", async () => {

  spec = specBuilder.build()

  expect(spec["openapi"]).toBe("3.0.0")
})

test("endpoint created", async () => {
  specBuilder.withEndpoint("/member/signup", HttpMethod.Post)

  spec = specBuilder.build()

  expect(spec["paths"]["/member/signup"]["post"]).toBeDefined()
})

test("specification description specified", async () => {
  specBuilder.describedAs("member signup", "allows signup of a new member to the BeanTins service", "0.1.9")

  spec = specBuilder.build()

  expect(spec["info"]["title"]).toBe("member signup")
  expect(spec["info"]["description"]).toBe("allows signup of a new member to the BeanTins service")
  expect(spec["info"]["version"]).toBe("0.1.9")
})

test("endpoint description specified", async () => {
  let endpoint = specBuilder.withEndpoint("/member/signup", HttpMethod.Post)

  endpoint.describedAs("member signup", "allows signup of a new member to the BeanTins service")

  spec = specBuilder.build()

  expect(spec["paths"]["/member/signup"]["post"]["summary"]).toBe("member signup")
  expect(spec["paths"]["/member/signup"]["post"]["description"]).toBe("allows signup of a new member to the BeanTins service")
})

test("request body defaults to required", async () => {
  let endpoint = specBuilder.withEndpoint("/member/signup", HttpMethod.Post)

  endpoint.withRequestBodyStringProperty({name: "email"})

  spec = specBuilder.build()

  expect(spec["paths"]["/member/signup"]["post"]["requestBody"]!["required"]).toBe(true)
})

test("request body with string parameter type indicated", async () => {
  let endpoint = specBuilder.withEndpoint("/member/signup", HttpMethod.Post)

  endpoint.withRequestBodyStringProperty({name: "email"})

  spec = specBuilder.build()

  expect(spec["paths"]["/member/signup"]["post"]["requestBody"]!["content"]!["application/json"]["schema"]!["type"]).toBe("object")
  expect(spec["paths"]["/member/signup"]["post"]["requestBody"]!["content"]!["application/json"]["schema"]!["properties"]!["email"]["type"]).toBe("string")
})

test("request body with string parameter required", async () => {
  let endpoint = specBuilder.withEndpoint("/member/signup", HttpMethod.Post)

  endpoint.withRequestBodyStringProperty({name: "email", required: true})

  spec = specBuilder.build()

  expect(spec["paths"]["/member/signup"]["post"]["requestBody"]!["content"]!["application/json"]["schema"]!["required"]![0]).toBe("email")
})

test("request body with string parameter min length", () => {
  let endpoint = specBuilder.withEndpoint("/member/signup", HttpMethod.Post)

  endpoint.withRequestBodyStringProperty({name: "email", minLength: 5})

  spec = specBuilder.build()

  const emailProperty = spec["paths"]["/member/signup"]["post"]["requestBody"]!["content"]!["application/json"]["schema"]!["properties"]!["email"]

  expect("minLength" in emailProperty).toBe(true)
  
  if ("minLength" in emailProperty)
  {
    expect(emailProperty["minLength"]).toBe(5)  
  }
})

test("request body with string parameter max length", () => {
  let endpoint = specBuilder.withEndpoint("/member/signup", HttpMethod.Post)

  endpoint.withRequestBodyStringProperty({name: "email", maxLength: 5})

  spec = specBuilder.build()

  const emailProperty = spec["paths"]["/member/signup"]["post"]["requestBody"]!["content"]!["application/json"]["schema"]!["properties"]!["email"]

  expect("maxLength" in emailProperty).toBe(true)
  
  if ("maxLength" in emailProperty)
  {
    expect(emailProperty["maxLength"]).toBe(5)  
  }
})

test("request body with two string parameters", () => {
  let endpoint = specBuilder.withEndpoint("/member/signup", HttpMethod.Post)

  endpoint.withRequestBodyStringProperty({name: "email"})
  endpoint.withRequestBodyStringProperty({name: "nickname"})

  spec = specBuilder.build()

  expect(spec["paths"]["/member/signup"]["post"]["requestBody"]!["content"]!["application/json"]["schema"]!["properties"]!["email"]["type"]).toBe("string")  
  expect(spec["paths"]["/member/signup"]["post"]["requestBody"]!["content"]!["application/json"]["schema"]!["properties"]!["nickname"]["type"]).toBe("string")  
})

test("response", () => {
  let endpoint = specBuilder.withEndpoint("/member/signup", HttpMethod.Post)

  endpoint.withResponse("201", "member created")

  spec = specBuilder.build()

  expect(spec["paths"]["/member/signup"]["post"]["responses"]!["201"]!["description"]!).toBe("member created")  
})

