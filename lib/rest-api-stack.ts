import * as apig from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
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


    
    //Functions 
    const getAlbumByNameFn = new lambdanode.NodejsFunction(
      this,
      "GetAlbumByNameFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/getAlbumByName.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: songsTable.tableName,
          REGION: 'eu-west-1',
        },
      }
      )
      
     

      const newAlbumFn = new lambdanode.NodejsFunction(this, "AddAlbumFn",{
        architecture : lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/addAlbum.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: songsTable.tableName,
          REGION: "eu-west-1",
        },
      });
      


      const getAlbumByNameURL = getAlbumByNameFn.addFunctionUrl({
        authType: lambda.FunctionUrlAuthType.NONE,
        cors: {
          allowedOrigins: ["*"],
        },
      });
      
        
        new custom.AwsCustomResource(this, "songsddbInitData", {
          onCreate: {
            service: "DynamoDB",
            action: "batchWriteItem",
            parameters: {
              RequestItems: {
                [songsTable.tableName]: generateBatch(songs),
              },
            },
            physicalResourceId: custom.PhysicalResourceId.of("songsddbInitData"), //.of(Date.now().toString()),
          },
          policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
            resources: [songsTable.tableArn],
          }),
        });

        //Permissions
        songsTable.grantReadData(getAlbumByNameFn)
        songsTable.grantReadWriteData(newAlbumFn)
       

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

    //Api Endpoints
    const songsEndpoint = api.root.addResource("songs");
    songsEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getAlbumByNameFn, { proxy: true})
    );
    songsEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(newAlbumFn, { proxy: true})
    )
  
}
}
    