import { Environment } from "../config/environment";

// AppConfig interface
export interface AppConfig {
  BACKEND_SERVER_ENDPOINT: string;
  AMPLITUDE_EXPERIMENT_KEY: string;
  SEGMENT_WRITE_KEY: string;
  environment: Environment;
  DATADOG_APPLICATION_ID: string;
  DATADOG_CLIENT_TOKEN: string;
  BIFROST_API_URL?: string;
  CRUCIBLE_REGISTRY_API_URL?: string;
}

// Extend the Window interface
declare global {
  interface Window {
    APP_CONFIG?: AppConfig;
  }
}

// This empty export makes this file a module
export {};
