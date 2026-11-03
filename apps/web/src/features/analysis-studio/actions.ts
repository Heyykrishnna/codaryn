"use server";

import {
  analysisConfigurationSchema,
  configurationResponseSchema,
} from "@codaryn/contracts";

export type ConfigurationState = {
  message: string;
  status: "idle" | "success" | "error";
};

export async function validateConfiguration(
  _previous: ConfigurationState,
  form: FormData,
): Promise<ConfigurationState> {
  const configuration = analysisConfigurationSchema.safeParse({
    depth: form.get("depth"),
    includeTests: form.get("includeTests") === "on",
    excludeGenerated: form.get("excludeGenerated") === "on",
  });
  if (!configuration.success)
    return { status: "error", message: "Choose a valid analysis depth." };
  try {
    const response = await fetch(
      `${process.env.API_URL ?? "http://127.0.0.1:4000"}/api/v1/analysis-configurations/validate`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(configuration.data),
        cache: "no-store",
        signal: AbortSignal.timeout(2000),
      },
    );
    if (
      !response.ok ||
      !configurationResponseSchema.safeParse(await response.json()).success
    ) {
      return {
        status: "error",
        message: "The configuration could not be validated.",
      };
    }
    return {
      status: "success",
      message: "Configuration validated. Analysis is not available yet.",
    };
  } catch {
    return {
      status: "error",
      message: "The API is unavailable. Try again when it is running.",
    };
  }
}
