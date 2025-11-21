// Adapter to convert API Gateway events to Express-like format
// and use existing services

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

export interface LambdaRequest {
  body: any
  headers: Record<string, string>
  queryStringParameters: Record<string, string | undefined> | null
  pathParameters: Record<string, string | undefined> | null
  user?: { sub: string; role: string }
}

export interface LambdaResponse {
  statusCode: number
  headers?: Record<string, string>
  body: string
}

export class ApiGatewayAdapter {
  static parseRequest(event: APIGatewayProxyEvent): LambdaRequest {
    let body = {}
    if (event.body) {
      try {
        body = JSON.parse(event.body)
      } catch (e) {
        body = event.body
      }
    }

    return {
      body,
      headers: event.headers as Record<string, string>,
      queryStringParameters: event.queryStringParameters,
      pathParameters: event.pathParameters,
    }
  }

  static createResponse(
    statusCode: number,
    data: any,
    additionalHeaders: Record<string, string> = {}
  ): APIGatewayProxyResult {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        ...additionalHeaders,
      },
      body: JSON.stringify(data),
    }
  }

  static successResponse(data: any): APIGatewayProxyResult {
    return this.createResponse(200, data)
  }

  static errorResponse(statusCode: number, message: string): APIGatewayProxyResult {
    return this.createResponse(statusCode, { error: message })
  }
}
