const { jsonResponse, getRequestMeta } = require("./load-shared.cjs");

exports.handler = async (event) => {
  const { method, path, routeKey } = getRequestMeta(event);
  console.log("Received request:", { method, path, routeKey });

  if (method === "GET" && path === "/dashboard/get_summary") {
    return jsonResponse(200, {
      success: true,
      routeKey,
      data: {
        totalEmployees: 128,
        presentToday: 119,
        pendingApprovals: 7
      }
    });
  }

  if (method === "GET" && path === "/dashboard/get_today_attendance") {
    return jsonResponse(200, {
      success: true,
      routeKey,
      data: {
        date: "2026-04-01",
        checkedIn: 119,
        absent: 9
      }
    });
  }

  return jsonResponse(404, {
    success: false,
    routeKey,
    message: `No mock handler configured for ${method} ${path}`
  });
};
