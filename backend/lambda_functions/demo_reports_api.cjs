const { jsonResponse, getRequestMeta, parseBody } = require("./load-shared.cjs");

exports.handler = async (event) => {
  const { method, path, routeKey } = getRequestMeta(event);
  const requestBody = parseBody(event);

  return jsonResponse(200, {
    success: true,
    routeKey,
    message: "demo_reports_api is ready. Add a route mapping in api-gateway-export.json to use it.",
    data: {
      method,
      path,
      requestBody
    }
  });
};
