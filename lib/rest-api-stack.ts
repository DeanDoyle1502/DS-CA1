import * as apig from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import { generateBatch } from "../shared/util";
import { songs } from "../seed/songs";

export class RestAPIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Table 
    const songsTable = new dynamodb.Table(this, "SongTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "album_name", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "song_title", type: dynamodb.AttributeType.STRING},
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Songs",
    });


    
    // Functions 
    // const getMovieByIdFn = new lambdanode.NodejsFunction(
    //   this,
    //   "GetMovieByIdFn",
    //   {
    //     architecture: lambda.Architecture.ARM_64,
    //     runtime: lambda.Runtime.NODEJS_18_X,
    //     entry: `${__dirname}/../lambdas/getMovieById.ts`,
    //     timeout: cdk.Duration.seconds(10),
    //     memorySize: 128,
    //     environment: {
    //       TABLE_NAME: moviesTable.tableName,
    //       REGION: 'eu-west-1',
    //     },
    //   }
    //   );
      
      // const getAllMoviesFn = new lambdanode.NodejsFunction(
      //   this,
      //   "GetAllMoviesFn",
      //   {
      //     architecture: lambda.Architecture.ARM_64,
      //     runtime: lambda.Runtime.NODEJS_18_X,
      //     entry: `${__dirname}/../lambdas/getAllMovies.ts`,
      //     timeout: cdk.Duration.seconds(10),
      //     memorySize: 128,
      //     environment: {
      //       TABLE_NAME: moviesTable.tableName,
      //       REGION: 'eu-west-1',
      //     },
      //   }
      //   );
        
        new custom.AwsCustomResource(this, "songsddbInitData", {
          onCreate: {
            service: "DynamoDB",
            action: "batchWriteItem",
            parameters: {
              RequestItems: {
                [songsTable.tableName]: generateBatch(songs),
              },
            },
            physicalResourceId: custom.PhysicalResourceId.of("moviesddbInitData"), //.of(Date.now().toString()),
          },
          policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
            resources: [songsTable.tableArn],
          }),
        });

        // REST API 
    const api = new apig.RestApi(this, "RestAPI", {
      description: "demo api",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    const songsEndpoint = api.root.addResource("songs");
    
    // moviesEndpoint.addMethod(
    //   "GET",
    //   new apig.LambdaIntegration(getAllMoviesFn, { proxy: true })
    // );

    // const movieEndpoint = moviesEndpoint.addResource("{movieId}");
    // movieEndpoint.addMethod(
    //   "GET",
    //   new apig.LambdaIntegration(getMovieByIdFn, { proxy: true })
    // );
        
        // // Permissions 
        // moviesTable.grantReadData(getMovieByIdFn)
        // moviesTable.grantReadData(getAllMoviesFn)
        
        
      }
    }
    