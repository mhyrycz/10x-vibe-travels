/**
 * OpenRouter Service - TypeScript wrapper for OpenRouter.ai API
 *
 * Provides type-safe communication with OpenRouter's chat completion endpoints
 * with structured JSON responses using Zod schema validation.
 */

import type {
  OpenRouterConfig,
  ChatOptions,
  ChatResponse,
  OpenRouterRequestBody,
  OpenRouterApiResponse,
  JsonSchemaObject,
} from "./types";
import { OPENROUTER_MODEL } from "./types";
import {
  OpenRouterError,
  OpenRouterAuthError,
  OpenRouterRateLimitError,
  OpenRouterTimeoutError,
  OpenRouterNetworkError,
  OpenRouterApiError,
  OpenRouterValidationError,
} from "./errors";
import type { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * OpenRouter Service Class
 *
 * Handles all communication with OpenRouter.ai API including:
 * - Type-safe request/response handling
 * - Automatic retry logic with exponential backoff
 * - Schema validation using Zod
 * - Request timeout management
 * - Comprehensive error handling
 */
export class OpenRouterService {
  // Configuration fields
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultTimeout: number;
  private readonly defaultTemperature: number;
  private readonly defaultMaxTokens: number;
  private readonly enableLogging: boolean;
  private readonly retryAttempts: number;
  private readonly retryDelay: number;

  // Internal state
  private requestCounter = 0;

  // Hardcoded model for all requests
  private readonly model: string = OPENROUTER_MODEL;

  /**
   * Creates a new OpenRouter service instance
   *
   * @param config - Service configuration
   * @throws {OpenRouterError} If API key is missing
   */
  constructor(config: OpenRouterConfig) {
    // Validate required configuration
    if (!config.apiKey) {
      throw new OpenRouterError("OpenRouter API key is required", "CONFIG_ERROR");
    }

    // Initialize configuration with defaults
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || "https://openrouter.ai/api/v1").replace(/\/$/, ""); // Remove trailing slash
    this.defaultTimeout = config.defaultTimeout ?? 60000; // 60 seconds
    this.defaultTemperature = config.defaultTemperature ?? 0.7;
    this.defaultMaxTokens = config.defaultMaxTokens ?? 4000;
    this.enableLogging = config.enableLogging ?? false;
    this.retryAttempts = config.retryAttempts ?? 2;
    this.retryDelay = config.retryDelay ?? 1000; // 1 second

    const devEnv = import.meta.env.DEV || process.env.DEV;

    // Validate base URL protocol in production
    if (!this.baseUrl.startsWith("https://") && !devEnv) {
      throw new OpenRouterError("OpenRouter base URL must use HTTPS in production", "CONFIG_ERROR");
    }

    if (this.enableLogging) {
      console.log("✅ OpenRouter service initialized", {
        baseUrl: this.baseUrl,
        model: this.model,
        timeout: this.defaultTimeout,
        retryAttempts: this.retryAttempts,
      });
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Generates unique request identifier for tracking
   * Format: or_${timestamp}_${counter}_${random}
   */
  private generateRequestId(): string {
    const timestamp = Date.now();
    const counter = ++this.requestCounter;
    const random = Math.random().toString(36).substring(2, 6);
    return `or_${timestamp}_${counter}_${random}`;
  }

  /**
   * Constructs HTTP headers for API requests
   */
  private buildHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://vibe-travels.com",
      "X-Title": "VibeTravels",
    };
  }

  /**
   * Promise-based delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Logs request details if logging is enabled
   */
  private logRequest(requestId: string, model: string, messageCount: number, schemaName?: string): void {
    if (!this.enableLogging) return;

    console.log(`📤 OpenRouter Request [${requestId}]`, {
      model,
      messages: messageCount,
      schema: schemaName,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs response details if logging is enabled
   */
  private logResponse(requestId: string, success: boolean, tokens: number, duration: number, error?: Error): void {
    if (!this.enableLogging) return;

    if (success) {
      console.log(`📥 OpenRouter Response [${requestId}]`, {
        success: true,
        tokens,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error(`❌ OpenRouter Error [${requestId}]`, {
        success: false,
        error: error?.message,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ============================================================================
  // Private Schema Conversion Methods
  // ============================================================================

  /**
   * Converts Zod schema to JSON Schema format for OpenRouter structured outputs
   *
   * @param schema - Zod schema to convert
   * @param name - Schema name/identifier
   * @returns JSON Schema object with metadata
   */
  private convertZodToJsonSchema<T>(schema: z.ZodType<T>, name: string): JsonSchemaObject {
    // Convert using zod-to-json-schema library
    const jsonSchema = zodToJsonSchema(schema, {
      name,
      $refStrategy: "none", // Inline all references for OpenRouter compatibility
    }) as JsonSchemaObject & { definitions?: Record<string, JsonSchemaObject>; $ref?: string };

    // Extract the actual schema from definitions if it exists
    // zodToJsonSchema creates a $ref wrapper when using the name option
    let schemaObject: JsonSchemaObject;

    if (jsonSchema.$ref && jsonSchema.definitions?.[name]) {
      // Use the actual schema from definitions, not the wrapper
      schemaObject = jsonSchema.definitions[name] as JsonSchemaObject;
    } else {
      schemaObject = jsonSchema as JsonSchemaObject;
    }

    // Ensure type is "object" for OpenAI compatibility
    if (!schemaObject.type) {
      schemaObject.type = "object";
    }

    // Add/override critical properties
    if (schemaObject.type === "object") {
      schemaObject.additionalProperties = false; // Strict schema adherence
    }

    return schemaObject;
  }

  /**
   * Builds complete request payload for OpenRouter API
   *
   * @param options - Chat options with messages and schema
   * @returns Complete request body ready for API call
   */
  private buildRequestPayload<T>(options: ChatOptions<T>): OpenRouterRequestBody {
    // Convert Zod schema to JSON Schema
    const jsonSchema = this.convertZodToJsonSchema(options.responseSchema.schema, options.responseSchema.name);

    // Build request payload with defaults and overrides
    const payload: OpenRouterRequestBody = {
      model: this.model,
      messages: options.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      response_format: {
        type: "json_schema",
        json_schema: {
          name: options.responseSchema.name,
          strict: true,
          schema: jsonSchema,
        },
      },
      temperature: options.temperature ?? this.defaultTemperature,
      max_tokens: options.maxTokens ?? this.defaultMaxTokens,
    };

    // Add optional parameters if provided
    if (options.topP !== undefined) {
      payload.top_p = options.topP;
    }
    if (options.frequencyPenalty !== undefined) {
      payload.frequency_penalty = options.frequencyPenalty;
    }
    if (options.presencePenalty !== undefined) {
      payload.presence_penalty = options.presencePenalty;
    }
    if (options.stop !== undefined) {
      payload.stop = options.stop;
    }

    return payload;
  }

  // ============================================================================
  // Private HTTP Request Methods
  // ============================================================================

  /**
   * Executes HTTP request with timeout management
   *
   * @param url - API endpoint URL
   * @param payload - Request body
   * @param timeout - Timeout in milliseconds
   * @returns API response
   * @throws {OpenRouterTimeoutError} If request exceeds timeout
   * @throws {OpenRouterApiError} If API returns error response
   */
  private async executeRequest(
    url: string,
    payload: OpenRouterRequestBody,
    timeout: number
  ): Promise<OpenRouterApiResponse> {
    // Create AbortController for timeout management
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      // Clear timeout on successful completion
      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");

        // Specific error handling by status code
        if (response.status === 401) {
          throw new OpenRouterAuthError("Invalid API key or authentication failed");
        }

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get("Retry-After") || "5");
          throw new OpenRouterRateLimitError("Rate limit exceeded", retryAfter);
        }

        throw new OpenRouterApiError(
          `OpenRouter API error: ${response.status} ${response.statusText}`,
          response.status,
          { errorText }
        );
      }

      // Parse and return JSON response
      const data = (await response.json()) as OpenRouterApiResponse;

      // Validate response structure
      if (!data.choices?.[0]?.message?.content) {
        throw new OpenRouterApiError("Invalid response structure from OpenRouter API", 200, {
          receivedKeys: Object.keys(data),
        });
      }

      return data;
    } catch (error) {
      // Clear timeout in error case
      clearTimeout(timeoutId);

      // Handle abort error (timeout)
      if (error instanceof Error && error.name === "AbortError") {
        throw new OpenRouterTimeoutError(`Request timeout after ${timeout}ms`, timeout);
      }

      // Re-throw known errors
      if (error instanceof OpenRouterError) {
        throw error;
      }

      // Handle fetch network errors
      if (error instanceof TypeError) {
        throw new OpenRouterNetworkError("Network request failed");
      }

      // Unknown error
      throw error;
    }
  }

  /**
   * Executes request with automatic retry logic for transient failures
   *
   * @param requestFn - Function that executes the request
   * @param attempt - Current attempt number (starts at 1)
   * @returns Result from successful request
   * @throws Error if all retry attempts fail
   */
  private async executeWithRetry<T>(requestFn: () => Promise<T>, attempt = 1): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      // Check if we have retry attempts remaining
      const canRetry = attempt < this.retryAttempts;

      if (!canRetry) {
        throw error;
      }

      // Determine if error is retryable
      let shouldRetry = false;
      let retryDelay = this.retryDelay * Math.pow(2, attempt); // Exponential backoff

      if (error instanceof OpenRouterTimeoutError) {
        // Retry on timeout
        shouldRetry = true;
      } else if (error instanceof OpenRouterNetworkError) {
        // Retry on network errors
        shouldRetry = true;
      } else if (error instanceof OpenRouterRateLimitError) {
        // Retry on rate limit with longer delay
        shouldRetry = true;
        retryDelay = (error.retryAfter || 5) * 1000;
      } else if (error instanceof OpenRouterApiError) {
        // Retry on server errors (5xx)
        if (error.statusCode && error.statusCode >= 500) {
          shouldRetry = true;
        }
        // Don't retry on client errors (4xx except 429 which is handled above)
      }

      if (shouldRetry) {
        if (this.enableLogging) {
          console.log(`🔄 Retrying request (attempt ${attempt + 1}/${this.retryAttempts}) after ${retryDelay}ms`);
        }

        await this.delay(retryDelay);
        return this.executeWithRetry(requestFn, attempt + 1);
      }

      // Not retryable, throw original error
      throw error;
    }
  }

  /**
   * Parses and validates response content against Zod schema
   *
   * @param content - Response content string (may contain JSON in markdown)
   * @param schema - Zod schema for validation
   * @returns Validated and typed data
   * @throws {OpenRouterApiError} If JSON parsing fails
   * @throws {OpenRouterValidationError} If schema validation fails
   */
  private parseAndValidateResponse<T>(content: string, schema: z.ZodType<T>): T {
    // Check for empty content
    if (!content || content.trim() === "") {
      throw new OpenRouterApiError("Empty response content from API", 200);
    }

    // Extract JSON from content (handle markdown code blocks)
    // First try to extract from markdown code blocks
    const markdownMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const jsonMatch = markdownMatch ? markdownMatch[1] : content.match(/\{[\s\S]*\}/)?.[0];

    if (!jsonMatch) {
      throw new OpenRouterApiError("Could not extract JSON from API response", 200, {
        contentSample: content.substring(0, 500),
      });
    }

    // Check if JSON appears complete (basic check for closing brace)
    const openBraces = (jsonMatch.match(/\{/g) || []).length;
    const closeBraces = (jsonMatch.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      throw new OpenRouterApiError("Incomplete JSON in API response (mismatched braces)", 200, {
        contentSample: jsonMatch.substring(0, 500),
        openBraces,
        closeBraces,
        hint: "Response may have been truncated. Consider increasing maxTokens.",
      });
    }

    // Parse JSON string
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(jsonMatch);
    } catch (error) {
      throw new OpenRouterApiError("Failed to parse JSON from API response", 200, {
        contentSample: jsonMatch.substring(0, 500),
        parseError: error instanceof Error ? error.message : "Unknown parse error",
      });
    }

    // Validate against Zod schema
    try {
      return schema.parse(parsedData);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        throw new OpenRouterValidationError("Response data does not match expected schema", error as z.ZodError);
      }
      throw error;
    }
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Sends chat completion request with structured output validation
   *
   * @param options - Chat options including messages and response schema
   * @returns Validated chat response with typed data
   * @throws {OpenRouterError} If API key is not configured
   * @throws {OpenRouterValidationError} If response doesn't match schema
   * @throws {OpenRouterTimeoutError} If request times out
   * @throws {OpenRouterApiError} If API returns error
   */
  async chat<T>(options: ChatOptions<T>): Promise<ChatResponse<T>> {
    // Validate input
    if (!options.messages || options.messages.length === 0) {
      throw new OpenRouterError("Messages array cannot be empty", "VALIDATION_ERROR");
    }

    if (!options.responseSchema?.schema) {
      throw new OpenRouterError("Response schema is required", "VALIDATION_ERROR");
    }

    // Generate request ID for tracking
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // Log request
    this.logRequest(requestId, this.model, options.messages.length, options.responseSchema.name);

    try {
      // Build request payload
      const payload = this.buildRequestPayload(options);
      const timeout = options.timeout ?? this.defaultTimeout;
      const url = `${this.baseUrl}/chat/completions`;

      // Execute request with retry logic
      const apiResponse = await this.executeWithRetry(() => this.executeRequest(url, payload, timeout));

      // Extract and validate response content
      const content = apiResponse.choices[0].message.content;
      const finishReason = apiResponse.choices[0].finish_reason;

      // Check if response was truncated due to token limit
      if (finishReason === "length") {
        console.warn(`⚠️ Response truncated due to token limit. Consider increasing maxTokens.`);
        console.log(`📊 Token usage: ${apiResponse.usage.completion_tokens} completion tokens`);
      }

      // Debug: Log content length and check if it's truncated
      console.log(`📊 Response content length: ${content.length} chars, finish_reason: ${finishReason}`);
      if (content.length > 500) {
        console.log(`📝 Content preview (first 300 chars): ${content.substring(0, 300)}`);
        console.log(`📝 Content preview (last 300 chars): ${content.substring(content.length - 300)}`);
      }

      const data = this.parseAndValidateResponse(content, options.responseSchema.schema);

      // Build typed response
      const response: ChatResponse<T> = {
        data,
        model: apiResponse.model,
        usage: {
          promptTokens: apiResponse.usage.prompt_tokens,
          completionTokens: apiResponse.usage.completion_tokens,
          totalTokens: apiResponse.usage.total_tokens,
        },
        finishReason: finishReason,
        requestId,
      };

      // Log success
      const duration = Date.now() - startTime;
      this.logResponse(requestId, true, response.usage.totalTokens, duration);

      return response;
    } catch (error) {
      // Log error
      const duration = Date.now() - startTime;
      this.logResponse(requestId, false, 0, duration, error as Error);
      throw error;
    }
  }

  /**
   * Tests API connectivity and authentication
   *
   * @returns Connection status with latency metrics
   */
  async testConnection(): Promise<{ success: boolean; latency: number }> {
    const startTime = Date.now();

    try {
      // Send minimal test request
      const payload: OpenRouterRequestBody = {
        model: this.model,
        messages: [
          {
            role: "user",
            content: "Test connection",
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "test_response",
            strict: true,
            schema: {
              type: "object",
              properties: {
                status: { type: "string" },
              },
              required: ["status"],
              additionalProperties: false,
            },
          },
        },
        temperature: 0.1,
        max_tokens: 50,
      };

      const url = `${this.baseUrl}/chat/completions`;
      await this.executeRequest(url, payload, 30000); // 30 second timeout

      const latency = Date.now() - startTime;
      return { success: true, latency };
    } catch (error) {
      const latency = Date.now() - startTime;

      if (this.enableLogging) {
        console.error("Connection test failed:", error);
      }

      return { success: false, latency };
    }
  }
}
