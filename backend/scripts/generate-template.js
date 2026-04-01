const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const swaggerPath = path.join(rootDir, "api_gateway", "api-gateway-export.json");
const outputPath = path.join(rootDir, "template.yaml");
const lambdaSourceDir = path.join(rootDir, "lambda_functions");
const generatedLambdaDir = path.join(rootDir, "generated_lambda_functions");
const sharedLoaderSourcePath = path.join(lambdaSourceDir, "load-shared.cjs");
const layerSharedSourcePath = path.join(rootDir, "layers", "demo_common", "nodejs", "demo-shared.cjs");

const swagger = JSON.parse(fs.readFileSync(swaggerPath, "utf8"));

const lambdaGroups = {};

for (const [routePath, methods] of Object.entries(swagger.paths || {})) {
  for (const [method, operation] of Object.entries(methods || {})) {
    const lambdaName = operation["x-lambda-name"];

    if (!lambdaName) {
      throw new Error(`Missing x-lambda-name for ${method.toUpperCase()} ${routePath}`);
    }

    if (!lambdaGroups[lambdaName]) {
      lambdaGroups[lambdaName] = [];
    }

    lambdaGroups[lambdaName].push({
      method: method.toUpperCase(),
      path: routePath
    });
  }
}

const toLogicalId = (name) =>
  name
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const ensureIsolatedLambdaSources = () => {
  fs.rmSync(generatedLambdaDir, { recursive: true, force: true });
  fs.mkdirSync(generatedLambdaDir, { recursive: true });

  for (const lambdaName of Object.keys(lambdaGroups)) {
    const sourceHandlerPath = path.join(lambdaSourceDir, `${lambdaName}.cjs`);

    if (!fs.existsSync(sourceHandlerPath)) {
      throw new Error(`Missing Lambda source file: ${path.relative(rootDir, sourceHandlerPath)}`);
    }

    const targetDir = path.join(generatedLambdaDir, lambdaName);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(sourceHandlerPath, path.join(targetDir, "index.cjs"));
    fs.copyFileSync(sharedLoaderSourcePath, path.join(targetDir, "load-shared.cjs"));
    fs.copyFileSync(layerSharedSourcePath, path.join(targetDir, "demo-shared.cjs"));
  }
};

ensureIsolatedLambdaSources();

const lines = [
  "AWSTemplateFormatVersion: '2010-09-09'",
  "Transform: AWS::Serverless-2016-10-31",
  "Description: Swagger-driven demo backend generated from api_gateway/api-gateway-export.json",
  "",
  "Globals:",
  "  Function:",
  "    Runtime: nodejs22.x",
  "    Timeout: 10",
  "    MemorySize: 128",
  "    Architectures:",
  "      - x86_64",
  "    Environment:",
  "      Variables:",
  "        STAGE_NAME: !Ref StageName",
  "",
  "Parameters:",
  "  StageName:",
  "    Type: String",
  "    Default: dev",
  "    AllowedValues:",
  "      - dev",
  "      - staging",
  "      - production",
  "  EnableLocalAdapter:",
  "    Type: String",
  "    Default: false",
  "    AllowedValues:",
  "      - true",
  "      - false",
  "",
  "Conditions:",
  "  CreateLocalAdapter: !Equals [!Ref EnableLocalAdapter, 'true']",
  "",
  "Resources:",
  "  DemoCommonLayer:",
  "    Type: AWS::Serverless::LayerVersion",
  "    Properties:",
  "      LayerName: !Sub demo-common-layer-${StageName}",
  "      Description: Shared utilities for demo Lambda functions",
  "      ContentUri: layers/demo_common/",
  "      CompatibleRuntimes:",
  "        - nodejs22.x",
  "      RetentionPolicy: Retain",
  "",
  "  DemoApi:",
  "    Type: AWS::Serverless::Api",
  "    Properties:",
  "      Name: !Sub serverless-demo-api-${StageName}",
  "      StageName: !Ref StageName",
  "      EndpointConfiguration: REGIONAL",
  "      TracingEnabled: true",
  ""
];

for (const [lambdaName, routes] of Object.entries(lambdaGroups)) {
  const logicalId = toLogicalId(lambdaName);

  lines.push(`  ${logicalId}:`);
  lines.push("    Type: AWS::Serverless::Function");
  lines.push("    Properties:");
  lines.push(`      FunctionName: !Sub ${lambdaName}-\${StageName}`);
  lines.push(`      CodeUri: generated_lambda_functions/${lambdaName}/`);
  lines.push("      Handler: index.handler");
  lines.push("      Layers:");
  lines.push("        - !Ref DemoCommonLayer");
  lines.push("      Events:");

  routes.forEach((route, index) => {
    lines.push(`        ApiEvent${index + 1}:`);
    lines.push("          Type: Api");
    lines.push("          Properties:");
    lines.push("            RestApiId: !Ref DemoApi");
    lines.push(`            Path: ${route.path}`);
    lines.push(`            Method: ${route.method}`);
  });

  lines.push("");
}

lines.push("  LocalApiAdapter:");
lines.push("    Type: AWS::Serverless::Function");
lines.push("    Condition: CreateLocalAdapter");
lines.push("    Properties:");
lines.push("      FunctionName: !Sub demo-local-adapter-${StageName}");
lines.push("      CodeUri: local/");
lines.push("      Handler: local_lambda_adapter.handler");
lines.push("      Events:");
lines.push("        CatchAllProxy:");
lines.push("          Type: Api");
lines.push("          Properties:");
lines.push("            RestApiId: !Ref DemoApi");
lines.push("            Path: /{proxy+}");
lines.push("            Method: ANY");
lines.push("");
lines.push("Outputs:");
lines.push("  ApiBaseUrl:");
lines.push("    Description: API Gateway base URL");
lines.push("    Value: !Sub https://${DemoApi}.execute-api.${AWS::Region}.amazonaws.com/${StageName}");

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`);

console.log(`Generated ${path.relative(rootDir, outputPath)} from ${path.relative(rootDir, swaggerPath)}`);
