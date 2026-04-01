const { jsonResponse, getRequestMeta, parseBody } = require("./load-shared.cjs");

exports.handler = async (event) => {
  const { method, path, routeKey } = getRequestMeta(event);
  const parsedBody = parseBody(event);

  if (method === "GET" && path === "/employee/list") {
    console.log("Received request for employee list");
    return jsonResponse(200, {
      success: true,
      routeKey,
      data: [
        {
          id: "EMP001",
          name: "Ava Patel",
          department: "Finance"
        },
        {
          id: "EMP002",
          name: "Rohan Shah",
          department: "Operations"
        }
      ]
    });
  }

  if (method === "POST" && path === "/employee/add") {
    return jsonResponse(201, {
      success: true,
      routeKey,
      message: "Mock employee added successfully",
      data: {
        id: "EMP999",
        ...parsedBody
      }
    });
  }

  return jsonResponse(404, {
    success: false,
    routeKey,
    message: `No mock handler configured for ${method} ${path}`
  });
};
