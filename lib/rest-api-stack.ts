import * as apig from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { generateBatch } from "../shared/util";
import { songs } from "../seed/songs";
import * as iam from 'aws-cdk-lib/aws-iam'

type AppApiProps = {
  userPoolId: string;
  userPoolClientId: string;
};


export class RestAPIStack extends Construct {
  constructor(scope: Construct, id: string, props: AppApiProps) {
    super(scope, id);

    const authorizerFn = new lambdanode.NodejsFunction(this, "AuthorizerFn", {
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/auth/authorizer.ts`,
      handler: "handler",
      environment: {
        USER_POOL_ID: props.userPoolId,
        CLIENT_ID: props.userPoolClientId,
        REGION: cdk.Aws.REGION,
      },
    });

    const requestAuthorizer = new apig.RequestAuthorizer(
      this,
      "RequestAuthorizer",
      {
        identitySources: [apig.IdentitySource.header("cookie")],
        handler: authorizerFn,
        resultsCacheTtl: cdk.Duration.minutes(0),
      }
    );

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

      const updateSongFn = new lambdanode.NodejsFunction(
        this,
        "UpdateSongFn",
        {
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_18_X,
          entry: `${__dirname}/../lambdas/updateSong.ts`, 
          timeout: cdk.Duration.seconds(10),
          memorySize: 128,
          environment: {
            TABLE_NAME: songsTable.tableName,
            REGION: 'eu-west-1',
          },
        }
      );
      const translateTextFn = new lambdanode.NodejsFunction(this, "TranslateTextFn", {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/translate.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
            TABLE_NAME: songsTable.tableName,
            REGION: 'eu-west-1',
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
        songsTable.grantReadWriteData(updateSongFn)
        songsTable.grantReadWriteData(translateTextFn)

        translateTextFn.addToRolePolicy(new iam.PolicyStatement({
          actions: ['translate:TranslateText'],
          resources: ['*'], 
        }));

        translateTextFn.role?.addManagedPolicy(
          iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
      );

        
       

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
      new apig.LambdaIntegration(newAlbumFn, { proxy: true}),{
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
      }
    );
    songsEndpoint.addMethod(
      "PUT",
      new apig.LambdaIntegration(updateSongFn, { proxy: true}),{
        authorizer: requestAuthorizer,
        authorizationType: apig.AuthorizationType.CUSTOM,
      }
    );

    const translateEndpoint = api.root.addResource("translate")
    translateEndpoint.addMethod(
      "POST", 
    new apig.LambdaIntegration(translateTextFn, {proxy: true})
    );
    translateEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(translateTextFn, {proxy: true})
    )
    
}
}
    