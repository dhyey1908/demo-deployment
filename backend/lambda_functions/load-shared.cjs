const path = require("path");

const layerPath = "/opt/nodejs/demo-shared.cjs";
const localPath = path.join(__dirname, "..", "layers", "demo_common", "nodejs", "demo-shared.cjs");

const loadShared = () => {
  try {
    return require(layerPath);
  } catch (error) {
    return require(localPath);
  }
};

module.exports = loadShared();
