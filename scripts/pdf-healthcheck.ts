import { getPdfRuntimeHealth } from "../lib/services/pdf-runtime-service";

const health = getPdfRuntimeHealth();

if (!health.ok) {
  console.error(`PDF runtime check failed: ${health.summary}`);
  process.exit(1);
}

console.log(`PDF runtime check passed: ${health.summary}`);
