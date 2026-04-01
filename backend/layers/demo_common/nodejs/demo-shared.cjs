const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(body)
});

const getRequestMeta = (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || "GET";
  const path = event.requestContext?.http?.path || event.path || "/";
  const routeKey = event.routeKey || `${method} ${path}`;

  return {
    method,
    path,
    routeKey
  };
};

const parseBody = (event) => {
  if (!event.body) {
    return null;
  }

  if (typeof event.body === "object") {
    return event.body;
  }

  try {
    return JSON.parse(event.body);
  } catch (error) {
    return {
      rawBody: event.body
    };
  }
};

module.exports = {
  jsonResponse,
  getRequestMeta,
  parseBody
};
