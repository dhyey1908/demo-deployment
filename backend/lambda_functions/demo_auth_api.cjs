const { jsonResponse, getRequestMeta, parseBody } = require("./load-shared.cjs");

exports.handler = async (event) => {
  const { method, path, routeKey } = getRequestMeta(event);
  const requestBody = parseBody(event);

  if (method === "POST" && path === "/login") {
    return jsonResponse(200, {
      success: true,
      routeKey,
      message: "Mock login successful",
      data: {
        userId: "EMP001",
        token: "demo-session-token",
        requestBody
      }
    });
  }

  if (method === "POST" && path === "/logout") {
    return jsonResponse(200, {
      success: true,
      routeKey,
      message: "Mock logout successful",
      data: {
        requestBody
      }
    });
  }

  return jsonResponse(404, {
    success: false,
    routeKey,
    message: `No mock handler configured for ${method} ${path}`
  });
};
