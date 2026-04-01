const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const swaggerPath = path.join(rootDir, "api_gateway", "api-gateway-export.json");
const outputPath = path.join(rootDir, "template.yaml");
const lambdaSourceDir = path.join(rootDir, "lambda_functions");
const generatedLambdaDir = path.join(rootDir, "generated_lambda_functions");
const layersDir = path.join(rootDir, "layers");
const sharedLoaderSourcePath = path.join(lambdaSourceDir, "load-shared.cjs");
const standaloneLambdasPath = path.join(lambdaSourceDir, "standalone-lambdas.json");

const swagger = JSON.parse(fs.readFileSync(swaggerPath, "utf8"));

const lambdaGroups = {};

const normalizeLayerNames = (layerValue) => {
  if (!layerValue) {
    return [];
  }

  if (Array.isArray(layerValue)) {
    return [...new Set(layerValue.filter(Boolean))];
  }

  return [layerValue];
};

const sameLayerNames = (left, right) =>
  left.length === right.length && left.every((layerName, index) => layerName === right[index]);

const normalizeEnvironmentVariables = (environmentVariables) => {
  if (!environmentVariables) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(environmentVariables).filter(([, value]) => value !== undefined && value !== null)
  );
};

const sameEnvironmentVariables = (left, right) => JSON.stringify(left) === JSON.stringify(right);

for (const [routePath, methods] of Object.entries(swagger.paths || {})) {
  for (const [method, operation] of Object.entries(methods || {})) {
    const lambdaName = operation["x-lambda-name"];

    if (!lambdaName) {
      throw new Error(`Missing x-lambda-name for ${method.toUpperCase()} ${routePath}`);
    }

    if (!lambdaGroups[lambdaName]) {
      lambdaGroups[lambdaName] = {
        routes: [],
        layerNames: [],
        environmentVariables: {}
      };
    }

    const layerNames = normalizeLayerNames(operation["x-layer-names"] || null);
    const environmentVariables = normalizeEnvironmentVariables(
      operation["x-environment"] || null
    );
    const lambdaConfig = lambdaGroups[lambdaName];

    if (
      lambdaConfig.layerNames.length > 0 &&
      layerNames.length > 0 &&
      !sameLayerNames(lambdaConfig.layerNames, layerNames)
    ) {
      throw new Error(`Conflicting layer configuration values for Lambda ${lambdaName}`);
    }

    if (layerNames.length > 0) {
      lambdaConfig.layerNames = layerNames;
    }

    if (
      Object.keys(lambdaConfig.environmentVariables).length > 0 &&
      Object.keys(environmentVariables).length > 0 &&
      !sameEnvironmentVariables(lambdaConfig.environmentVariables, environmentVariables)
    ) {
      throw new Error(`Conflicting environment configuration values for Lambda ${lambdaName}`);
    }

    if (Object.keys(environmentVariables).length > 0) {
      lambdaConfig.environmentVariables = environmentVariables;
    }

    lambdaConfig.routes.push({
      method: method.toUpperCase(),
      path: routePath
    });
  }
}

const standaloneLambdas = fs.existsSync(standaloneLambdasPath)
  ? JSON.parse(fs.readFileSync(standaloneLambdasPath, "utf8"))
  : [];

for (const standaloneLambda of standaloneLambdas) {
  const { name: lambdaName } = standaloneLambda;
  const layerNames = normalizeLayerNames(standaloneLambda.layerNames || null);

  if (!lambdaName) {
    throw new Error("Each standalone lambda must define a name.");
  }

  if (lambdaGroups[lambdaName]) {
    throw new Error(`Lambda ${lambdaName} is already defined in api-gateway-export.json.`);
  }

  lambdaGroups[lambdaName] = {
    routes: [],
    layerNames,
    environmentVariables: normalizeEnvironmentVariables(standaloneLambda.environmentVariables || null)
  };
}

const toLogicalId = (name) =>
  name
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const getAvailableLayers = () => {
  if (!fs.existsSync(layersDir)) {
    return [];
  }

  return fs
    .readdirSync(layersDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
};

const availableLayers = getAvailableLayers();

const getLayerResourceLogicalId = (layerName) => `${toLogicalId(layerName)}Layer`;

const getLayerResourceRef = (layerName) => {
  if (!availableLayers.includes(layerName)) {
    throw new Error(
      `Layer "${layerName}" does not exist. Create backend/layers/${layerName}/nodejs first.`
    );
  }

  return getLayerResourceLogicalId(layerName);
};

const ensureIsolatedLambdaSources = () => {
  fs.rmSync(generatedLambdaDir, { recursive: true, force: true });
  fs.mkdirSync(generatedLambdaDir, { recursive: true });

  for (const [lambdaName, lambdaConfig] of Object.entries(lambdaGroups)) {
    const sourceHandlerPath = path.join(lambdaSourceDir, `${lambdaName}.cjs`);

    if (!fs.existsSync(sourceHandlerPath)) {
      throw new Error(`Missing Lambda source file: ${path.relative(rootDir, sourceHandlerPath)}`);
    }

    const targetDir = path.join(generatedLambdaDir, lambdaName);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(sourceHandlerPath, path.join(targetDir, "index.cjs"));
    fs.copyFileSync(sharedLoaderSourcePath, path.join(targetDir, "load-shared.cjs"));

    for (const layerName of lambdaConfig.layerNames) {
      getLayerResourceRef(layerName);
    }
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
  "    Default: stag",
  "    AllowedValues:",
  "      - stag",
  "      - prod",
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
  "  DemoApi:",
  "    Type: AWS::Serverless::Api",
  "    Properties:",
  "      Name: !Sub serverless-demo-api-${StageName}",
  "      StageName: !Ref StageName",
  "      EndpointConfiguration: REGIONAL",
  "      TracingEnabled: true",
  ""
];

for (const layerName of availableLayers) {
  const logicalId = getLayerResourceLogicalId(layerName);

  lines.push(`  ${logicalId}:`);
  lines.push("    Type: AWS::Serverless::LayerVersion");
  lines.push("    Properties:");
  lines.push(`      LayerName: !Sub ${layerName}-\${StageName}`);
  lines.push(`      Description: Lambda layer for ${layerName}`);
  lines.push(`      ContentUri: layers/${layerName}/`);
  lines.push("      CompatibleRuntimes:");
  lines.push("        - nodejs22.x");
  lines.push("      RetentionPolicy: Retain");
  lines.push("");
}

for (const [lambdaName, lambdaConfig] of Object.entries(lambdaGroups)) {
  const logicalId = toLogicalId(lambdaName);
  const layerRefs = lambdaConfig.layerNames.map((layerName) => getLayerResourceRef(layerName));

  lines.push(`  ${logicalId}:`);
  lines.push("    Type: AWS::Serverless::Function");
  lines.push("    Properties:");
  lines.push(`      FunctionName: !Sub ${lambdaName}_\${StageName}`);
  lines.push(`      CodeUri: generated_lambda_functions/${lambdaName}/`);
  lines.push("      Handler: index.handler");
  if (Object.keys(lambdaConfig.environmentVariables).length > 0) {
    lines.push("      Environment:");
    lines.push("        Variables:");
    Object.entries(lambdaConfig.environmentVariables).forEach(([key, value]) => {
      lines.push(`          ${key}: ${JSON.stringify(String(value))}`);
    });
  }
  if (layerRefs.length > 0) {
    lines.push("      Layers:");
    layerRefs.forEach((layerRef) => {
      lines.push(`        - !Ref ${layerRef}`);
    });
  }
  if (lambdaConfig.routes.length > 0) {
    lines.push("      Events:");

    lambdaConfig.routes.forEach((route, index) => {
      lines.push(`        ApiEvent${index + 1}:`);
      lines.push("          Type: Api");
      lines.push("          Properties:");
      lines.push("            RestApiId: !Ref DemoApi");
      lines.push(`            Path: ${route.path}`);
      lines.push(`            Method: ${route.method}`);
    });
  }

  lines.push("");
}

lines.push("  LocalApiAdapter:");
lines.push("    Type: AWS::Serverless::Function");
lines.push("    Condition: CreateLocalAdapter");
lines.push("    Properties:");
lines.push("      FunctionName: !Sub demo_local_adapter_${StageName}");
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
