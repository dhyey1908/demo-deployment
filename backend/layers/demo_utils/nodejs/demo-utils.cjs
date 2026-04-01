const buildJobMetadata = (jobName) => ({
  jobName,
  generatedAt: new Date().toISOString()
});

module.exports = {
  buildJobMetadata
};
