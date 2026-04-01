const { jsonResponse } = require("./load-shared.cjs");

exports.handler = async (event) => {
  return jsonResponse(200, {
    success: true,
    message: "demo_background_job executed",
    input: event || null
  });
};
