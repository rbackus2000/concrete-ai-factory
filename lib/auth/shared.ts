export type AppRole = "ADMIN" | "USER";

export type AppSession = {
  id: string;
  username: string;
  displayName: string;
  role: AppRole;
};

type ConfiguredUser = {
  username: string;
  password: string;
  displayName: string;
  role: AppRole;
};

const ROLE_HEADER = "x-caf-user-role";
const USERNAME_HEADER = "x-caf-username";
const DISPLAY_NAME_HEADER = "x-caf-display-name";

function readConfiguredUsers(): ConfiguredUser[] {
  const raw = process.env.INTERNAL_AUTH_USERS_JSON;

  if (!raw) {
    throw new Error(
      "INTERNAL_AUTH_USERS_JSON is not configured. Add it to your environment before starting the app.",
    );
  }

  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("INTERNAL_AUTH_USERS_JSON must be a non-empty JSON array.");
  }

  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`INTERNAL_AUTH_USERS_JSON entry ${index} must be an object.`);
    }

    const record = entry as Record<string, unknown>;
    const username = typeof record["username"] === "string" ? record["username"] : "";
    const password = typeof record["password"] === "string" ? record["password"] : "";
    const displayName =
      typeof record["displayName"] === "string" ? record["displayName"] : username;
    const role = record["role"] === "ADMIN" ? "ADMIN" : "USER";

    if (!username || !password) {
      throw new Error(
        `INTERNAL_AUTH_USERS_JSON entry ${index} must include username and password strings.`,
      );
    }

    return {
      username,
      password,
      displayName,
      role,
    };
  });
}

export function getAuthHeaderNames() {
  return {
    role: ROLE_HEADER,
    username: USERNAME_HEADER,
    displayName: DISPLAY_NAME_HEADER,
  };
}

export function parseBasicAuthorization(authorizationHeader: string | null | undefined) {
  if (!authorizationHeader?.startsWith("Basic ")) {
    return null;
  }

  const encoded = authorizationHeader.slice("Basic ".length).trim();

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex === -1) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

export function authenticateRequest(authorizationHeader: string | null | undefined) {
  const credentials = parseBasicAuthorization(authorizationHeader);

  if (!credentials) {
    return null;
  }

  const user = readConfiguredUsers().find(
    (candidate) =>
      candidate.username === credentials.username && candidate.password === credentials.password,
  );

  if (!user) {
    return null;
  }

  return {
    id: user.username,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  } satisfies AppSession;
}

export function isAdminRoute(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
