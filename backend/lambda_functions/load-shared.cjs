const path = require("path");

const layerPath = "/opt/nodejs/demo-shared.cjs";
const localPaths = [
  path.join(__dirname, "demo-shared.cjs"),
  path.join(__dirname, "..", "layers", "demo_common", "nodejs", "demo-shared.cjs")
];

const loadShared = () => {
  try {
    return require(layerPath);
  } catch (error) {
    for (const localPath of localPaths) {
      try {
        return require(localPath);
      } catch (localError) {
        continue;
      }
    }

    throw error;
  }
};

module.exports = loadShared();
