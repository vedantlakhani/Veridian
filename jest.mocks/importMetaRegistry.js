// Mock for expo/src/winter/ImportMetaRegistry
// Prevents "import outside test scope" error during Jest teardown
module.exports = {
  ImportMetaRegistry: {
    get url() {
      return null;
    },
  },
};
