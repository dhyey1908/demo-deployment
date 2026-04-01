const routeConfig = require("./route-config.json");

const handlers = {
  demo_auth_api: require("../lambda_functions/demo_auth_api.cjs").handler,
  demo_dashboard_api: require("../lambda_functions/demo_dashboard_api.cjs").handler,
  demo_employee_api: require("../lambda_functions/demo_employee_api.cjs").handler
};

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || "GET";
  const path = event.requestContext?.http?.path || event.path || "/";
  const routeKey = `${method} ${path}`;
  const lambdaName = routeConfig[routeKey];

  if (!lambdaName || !handlers[lambdaName]) {
    return json(404, {
      success: false,
      routeKey,
      message: "Route is not mapped in local route-config.json"
    });
  }

  return handlers[lambdaName](event);
};
