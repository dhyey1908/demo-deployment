const { jsonResponse, getRequestMeta, parseBody } = require("./load-shared.cjs");

exports.handler = async (event) => {
  const { method, path, routeKey } = getRequestMeta(event);
  const requestBody = parseBody(event);

  return jsonResponse(200, {
    success: true,
    routeKey,
    message: "demo_reports_api is ready.",
    data: {
      method,
      path,
      requestBody,
      environment: {
        reportSource: process.env.REPORT_SOURCE || null,
        reportRegion: process.env.REPORT_REGION || null
      }
    }
  });
};
