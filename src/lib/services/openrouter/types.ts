/**
 * OpenRouter Service Type Definitions
 *
 * Type-safe interfaces for OpenRouter.ai API integration
 */

import type { z } from "zod";

/**
 * Configuration options for OpenRouter service
 */
export interface OpenRouterConfig {
  /** OpenRouter API key (from environment variables) */
  apiKey: string;
  /** Optional custom base URL (default: https://openrouter.ai/api/v1) */
  baseUrl?: string;
  /** Default request timeout in milliseconds (default: 60000) */
  defaultTimeout?: number;
  /** Default temperature 0-1 (default: 0.7) */
  defaultTemperature?: number;
  /** Default max tokens (default: 4000) */
  defaultMaxTokens?: number;
  /** Enable request/response logging (default: false) */
  enableLogging?: boolean;
  /** Number of retry attempts on failure (default: 2) */
  retryAttempts?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
}

/**
 * Hardcoded model for all requests - cheap and efficient for travel planning
 */
export const OPENROUTER_MODEL = "openai/gpt-4o-mini-2024-07-18";

/**
 * Chat message with role and content
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Options for chat completion request with structured output
 */
export interface ChatOptions<T> {
  /** Array of chat messages */
  messages: ChatMessage[];

  /** Response schema for structured output validation */
  responseSchema: {
    /** Schema name (e.g., "travel_itinerary") */
    name: string;
    /** Schema description */
    description: string;
    /** Zod schema for validation */
    schema: z.ZodType<T>;
  };

  /** Optional: Override default temperature */
  temperature?: number;
  /** Optional: Override default max tokens */
  maxTokens?: number;
  /** Optional: Override default timeout */
  timeout?: number;
  /** Optional: Top P sampling parameter */
  topP?: number;
  /** Optional: Frequency penalty */
  frequencyPenalty?: number;
  /** Optional: Presence penalty */
  presencePenalty?: number;
  /** Optional: Stop sequences */
  stop?: string[];
}

/**
 * Structured chat response with validated data
 */
export interface ChatResponse<T> {
  /** Parsed and validated response data */
  data: T;
  /** Model used for completion */
  model: string;
  /** Token usage information */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Finish reason: "stop" | "length" | "content_filter" */
  finishReason: string;
  /** Unique request identifier */
  requestId: string;
}

/**
 * Request body structure for OpenRouter API
 */
export interface OpenRouterRequestBody {
  model: string;
  messages: { role: string; content: string }[];
  response_format: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: true;
      schema: JsonSchemaObject;
    };
  };
  temperature: number;
  max_tokens: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
}

/**
 * Response structure from OpenRouter API
 */
export interface OpenRouterApiResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * JSON Schema object structure for OpenRouter structured outputs
 */
export interface JsonSchemaObject {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: boolean;
  $schema?: string;
}
