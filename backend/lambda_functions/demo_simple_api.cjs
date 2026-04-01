exports.handler = async (event) => {
  try {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        success: true,
        message: "Simple GET API working 🚀",
        method: event.httpMethod,
        path: event.path,
        query: event.queryStringParameters || null
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Internal Server Error",
        error: error.message
      })
    };
  }
};