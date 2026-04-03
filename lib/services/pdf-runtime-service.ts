import { spawnSync } from "node:child_process";

export function getPdfRuntimeHealth() {
  const pythonResult = spawnSync("python3", ["--version"], {
    encoding: "utf8",
  });

  if (pythonResult.status !== 0) {
    return {
      ok: false,
      summary: "python3 is not available in PATH.",
    };
  }

  const reportlabResult = spawnSync(
    "python3",
    ["-c", "import reportlab; print(reportlab.Version)"],
    {
      encoding: "utf8",
    },
  );

  if (reportlabResult.status !== 0) {
    return {
      ok: false,
      summary: "python3 is available, but reportlab is not installed.",
    };
  }

  return {
    ok: true,
    summary: `python3 and reportlab are available (reportlab ${reportlabResult.stdout.trim()}).`,
  };
}

export function ensurePdfRuntimeAvailable() {
  const health = getPdfRuntimeHealth();

  if (!health.ok) {
    throw new Error(
      `${health.summary} Install Python 3 and reportlab before using build packet PDF export.`,
    );
  }

  return health;
}
