import EasyPostClient from "@easypost/api";

function getClient() {
  const apiKey = process.env.EASYPOST_API_KEY;
  if (!apiKey) {
    throw new Error("EASYPOST_API_KEY is not set");
  }
  return new EasyPostClient(apiKey);
}

export const easypost = {
  get client() {
    return getClient();
  },
};
