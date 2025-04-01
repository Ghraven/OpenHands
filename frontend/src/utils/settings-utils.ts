import { UserSettings } from "#/api/settings-service/settings-service.types";

const extractBasicFormData = (formData: FormData) => {
  const provider = formData.get("llm-provider-input")?.toString();
  const model = formData.get("llm-model-input")?.toString();

  const LLM_MODEL = `${provider}/${model}`.toLowerCase();
  const LLM_API_KEY = formData.get("llm-api-key-input")?.toString();
  const AGENT = formData.get("agent")?.toString();
  const LANGUAGE = formData.get("language")?.toString();

  return {
    LLM_MODEL,
    LLM_API_KEY,
    AGENT,
    LANGUAGE,
  };
};

const extractAdvancedFormData = (formData: FormData) => {
  const keys = Array.from(formData.keys());
  const isUsingAdvancedOptions = keys.includes("use-advanced-options");

  let CUSTOM_LLM_MODEL: string | undefined;
  let LLM_BASE_URL: string | undefined;
  let CONFIRMATION_MODE = false;
  let SECURITY_ANALYZER: string | undefined;
  let ENABLE_DEFAULT_CONDENSER = true;

  if (isUsingAdvancedOptions) {
    CUSTOM_LLM_MODEL = formData.get("custom-model")?.toString();
    LLM_BASE_URL = formData.get("base-url")?.toString();
    CONFIRMATION_MODE = keys.includes("confirmation-mode");
    if (CONFIRMATION_MODE) {
      // only set securityAnalyzer if confirmationMode is enabled
      SECURITY_ANALYZER = formData.get("security-analyzer")?.toString();
    }
    ENABLE_DEFAULT_CONDENSER = keys.includes("enable-default-condenser");
  }

  return {
    CUSTOM_LLM_MODEL,
    LLM_BASE_URL,
    CONFIRMATION_MODE,
    SECURITY_ANALYZER,
    ENABLE_DEFAULT_CONDENSER,
  };
};

export const extractSettings = (formData: FormData): Partial<UserSettings> => {
  const { LLM_MODEL, LLM_API_KEY, AGENT, LANGUAGE } =
    extractBasicFormData(formData);

  const {
    CUSTOM_LLM_MODEL,
    LLM_BASE_URL,
    CONFIRMATION_MODE,
    SECURITY_ANALYZER,
    ENABLE_DEFAULT_CONDENSER,
  } = extractAdvancedFormData(formData);

  // Extract provider tokens
  const githubToken = formData.get("github-token")?.toString();
  const gitlabToken = formData.get("gitlab-token")?.toString();
  const providerTokens: Record<string, string> = {};

  if (githubToken) {
    providerTokens.github = githubToken;
  }
  if (gitlabToken) {
    providerTokens.gitlab = gitlabToken;
  }

  return {
    llm_model: CUSTOM_LLM_MODEL || LLM_MODEL,
    llm_api_key: LLM_API_KEY,
    agent: AGENT,
    language: LANGUAGE,
    llm_base_url: LLM_BASE_URL,
    confirmation_mode: CONFIRMATION_MODE,
    security_analyzer: SECURITY_ANALYZER,
    enable_default_condenser: ENABLE_DEFAULT_CONDENSER,
    provider_tokens: providerTokens,
  };
};
