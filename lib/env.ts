function readEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function getOptionalEnv(name: string) {
  return readEnv(name);
}

export function getRequiredEnv(name: string) {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getAppBaseUrl() {
  return getOptionalEnv("APP_BASE_URL") ?? getOptionalEnv("NEXTAUTH_URL");
}
