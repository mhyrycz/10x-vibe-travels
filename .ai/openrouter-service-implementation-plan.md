# OpenRouter Service Implementation Plan

## 1. Service Description

The OpenRouter service is a TypeScript class-based wrapper around the OpenRouter.ai API that provides:

1. **Type-safe communication** with OpenRouter's chat completion endpoints
2. **Structured JSON responses** using OpenRouter's `response_format` with JSON Schema validation
3. **Flexible model configuration** supporting multiple LLM providers (OpenAI, Anthropic, Google, etc.)
4. **Robust error handling** with retry logic and timeout management
5. **Development mode support** with configurable mock responses
6. **Request/response logging** for debugging and monitoring

The service abstracts away the complexity of direct API calls and provides a clean, reusable interface for AI-powered features throughout the VibeTravels application.

**Key Design Principles:**
- Single Responsibility: Each method handles one specific aspect of API communication
- Dependency Injection: Configuration and dependencies passed via constructor
- Type Safety: Full TypeScript support with Zod schema validation
- Error Resilience: Comprehensive error handling with meaningful error messages

---

## 2. Constructor Description

### Constructor Signature

```typescript
constructor(config: OpenRouterConfig)
```

### Configuration Interface

```typescript
interface OpenRouterConfig {
  apiKey: string;                    // OpenRouter API key (from env)
  baseUrl?: string;                  // Optional custom base URL (default: https://openrouter.ai/api/v1)
  defaultTimeout?: number;           // Default request timeout in ms (default: 60000)
  defaultTemperature?: number;       // Default temperature 0-1 (default: 0.7)
  defaultMaxTokens?: number;         // Default max tokens (default: 4000)
  enableLogging?: boolean;           // Enable request/response logging (default: false)
  retryAttempts?: number;           // Number of retry attempts on failure (default: 2)
  retryDelay?: number;              // Delay between retries in ms (default: 1000)
}

// Hardcoded model - cheap and efficient for travel planning
const OPENROUTER_MODEL = "openai/gpt-4o-mini-2024-07-18";
```

### Constructor Implementation Details

The constructor should:

1. **Validate required configuration**
   - Throw error if `apiKey` is missing
   - Set default values for optional parameters

2. **Initialize internal state**
   - Store configuration in private readonly fields
   - Initialize request counter for logging
   - Set up default headers

3. **Validate base URL format**
   - Ensure URL ends without trailing slash
   - Validate protocol (https only in production)

### Example Constructor Usage

```typescript
// From environment variables
const openRouter = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  baseUrl: import.meta.env.OPENROUTER_BASE_URL,
  defaultTimeout: 60000,
  enableLogging: import.meta.env.DEV,
  retryAttempts: 2,
});
```

---

## 3. Public Methods and Fields

### 3.1 Primary Method: `chat()`

The main method for sending chat completion requests with structured responses.

```typescript
async chat<T>(options: ChatOptions<T>): Promise<ChatResponse<T>>
```

#### ChatOptions Interface

```typescript
interface ChatOptions<T> {
  // Required: Messages array
  messages: ChatMessage[];
  
  // Required: Response schema for structured output
  responseSchema: {
    name: string;           // Schema name (e.g., "travel_itinerary")
    description: string;    // Schema description
    schema: z.ZodType<T>;   // Zod schema for validation
  };
  
  // Optional: Override default temperature
  temperature?: number;
  
  // Optional: Override default max tokens
  maxTokens?: number;
  
  // Optional: Override default timeout
  timeout?: number;
  
  // Optional: Additional model parameters
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  
  // Optional: Stop sequences
  stop?: string[];
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatResponse<T> {
  data: T;                  // Parsed and validated response data
  model: string;            // Model used for completion
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;     // "stop" | "length" | "content_filter"
  requestId: string;        // Unique request identifier
}
```

#### Method Behavior

1. **Pre-request validation**
   - Validate messages array is not empty
   - Validate schema is provided
   - Check API key is configured

2. **Build request payload**
   - Convert Zod schema to JSON Schema format
   - Construct proper `response_format` object
   - Merge default and override parameters

3. **Execute request with timeout**
   - Use AbortController for timeout
   - Include retry logic for transient failures

4. **Parse and validate response**
   - Extract JSON from response
   - Validate against Zod schema
   - Return typed response object

5. **Handle errors**
   - Wrap errors with context
   - Log failures if logging enabled

#### Example Usage

```typescript
import { z } from "zod";

// Define response schema
const itinerarySchema = z.object({
  days: z.array(z.object({
    day_index: z.number(),
    activities: z.object({
      morning: z.array(z.object({
        title: z.string(),
        duration_minutes: z.number(),
        transport_minutes: z.number().nullable(),
      })),
      afternoon: z.array(z.object({
        title: z.string(),
        duration_minutes: z.number(),
        transport_minutes: z.number().nullable(),
      })),
      evening: z.array(z.object({
        title: z.string(),
        duration_minutes: z.number(),
        transport_minutes: z.number().nullable(),
      })),
    }),
  })),
});

type Itinerary = z.infer<typeof itinerarySchema>;

// Make API call
const response = await openRouter.chat<Itinerary>({
  messages: [
    {
      role: "system",
      content: "You are an expert travel planner. Create detailed itineraries.",
    },
    {
      role: "user",
      content: "Create a 3-day itinerary for Paris focusing on art and culture.",
    },
  ],
  responseSchema: {
    name: "travel_itinerary",
    description: "A structured travel itinerary with daily activities",
    schema: itinerarySchema,
  },
  temperature: 0.7,
  maxTokens: 4000,
});

// response.data is fully typed as Itinerary
console.log(response.data.days[0].activities.morning);
```

### 3.2 Utility Method: `testConnection()`

Tests API connectivity and authentication.

```typescript
async testConnection(): Promise<{ success: boolean; latency: number }>
```

#### Example Usage

```typescript
try {
  const test = await openRouter.testConnection();
  console.log(`✅ Connected (${test.latency}ms)`);
} catch (error) {
  console.error("❌ Connection failed:", error);
}
```

---

## 4. Private Methods and Fields

### 4.1 Private Fields

```typescript
private readonly apiKey: string;
private readonly baseUrl: string;
private readonly defaultTimeout: number;
private readonly defaultTemperature: number;
private readonly defaultMaxTokens: number;
private readonly enableLogging: boolean;
private readonly retryAttempts: number;
private readonly retryDelay: number;
private requestCounter: number = 0;

// Hardcoded model for all requests
private readonly model: string = "openai/gpt-4o-mini-2024-07-18";
```

### 4.2 Private Method: `buildHeaders()`

Constructs HTTP headers for API requests.

```typescript
private buildHeaders(): HeadersInit
```

Returns:
```typescript
{
  "Authorization": `Bearer ${this.apiKey}`,
  "Content-Type": "application/json",
  "HTTP-Referer": "https://vibe-travels.com", // Optional
  "X-Title": "VibeTravels",                   // Optional
}
```

### 4.3 Private Method: `convertZodToJsonSchema()`

Converts Zod schema to JSON Schema format for OpenRouter.

```typescript
private convertZodToJsonSchema<T>(
  schema: z.ZodType<T>,
  name: string,
  description: string
): JsonSchemaObject
```

Implementation approach:
1. Use `zodToJsonSchema` library from `zod-to-json-schema` package
2. Add required metadata (name, description)
3. Set `additionalProperties: false` for strict validation
4. Return properly formatted schema

```typescript
interface JsonSchemaObject {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: boolean;
  $schema?: string;
}
```

### 4.4 Private Method: `buildRequestPayload()`

Constructs the complete request body for OpenRouter API.

```typescript
private buildRequestPayload<T>(options: ChatOptions<T>): OpenRouterRequestBody
```

Creates payload in format:

```typescript
{
  model: string;
  messages: Array<{ role: string; content: string }>;
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
```

**Critical: Response Format Structure**

The `response_format` must follow this exact pattern for structured outputs:

```typescript
{
  type: "json_schema",
  json_schema: {
    name: "schema_name",        // Schema identifier
    strict: true,               // Enforce strict schema adherence
    schema: {                   // The actual JSON Schema
      type: "object",
      properties: { /* ... */ },
      required: [ /* ... */ ],
      additionalProperties: false
    }
  }
}
```

### 4.5 Private Method: `executeWithRetry()`

Executes API request with automatic retry on transient failures.

```typescript
private async executeWithRetry<T>(
  requestFn: () => Promise<T>,
  attempt: number = 1
): Promise<T>
```

Retry logic:
1. Execute request function
2. On failure, check if error is retryable:
   - Network errors: YES
   - Timeout errors: YES
   - 429 Rate Limit: YES (with exponential backoff)
   - 500/502/503 Server errors: YES
   - 400/401/403 Client errors: NO (fail immediately)
3. If retryable and attempts remaining, wait and retry
4. Use exponential backoff: `delay * (2 ^ attempt)`

### 4.6 Private Method: `executeRequest()`

Core method that executes the HTTP request with timeout.

```typescript
private async executeRequest(
  url: string,
  payload: OpenRouterRequestBody,
  timeout: number
): Promise<OpenRouterApiResponse>
```

Implementation:
1. Create AbortController for timeout
2. Set timeout with `setTimeout`
3. Execute fetch with signal
4. Clear timeout on completion
5. Parse and return JSON response
6. Handle abort errors separately

```typescript
interface OpenRouterApiResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

### 4.7 Private Method: `parseAndValidateResponse()`

Extracts JSON from response and validates against schema.

```typescript
private parseAndValidateResponse<T>(
  content: string,
  schema: z.ZodType<T>
): T
```

Steps:
1. Extract JSON from content (handle markdown code blocks)
2. Parse JSON string to object
3. Validate with Zod schema using `schema.parse()`
4. Return typed result
5. Throw validation error if schema doesn't match

### 4.8 Private Method: `logRequest()`

Logs request details if logging is enabled.

```typescript
private logRequest(
  requestId: string,
  model: string,
  messageCount: number,
  schemaName?: string
): void
```

### 4.9 Private Method: `logResponse()`

Logs response details if logging is enabled.

```typescript
private logResponse(
  requestId: string,
  success: boolean,
  tokens: number,
  duration: number,
  error?: Error
): void
```

### 4.10 Private Method: `generateRequestId()`

Generates unique request identifier for tracking.

```typescript
private generateRequestId(): string
```

Format: `or_${timestamp}_${counter}_${random}`

Example: `or_1704067200000_42_a3f8`

---

## 5. Error Handling

### 5.1 Custom Error Classes

Define specific error types for different failure scenarios:

```typescript
// Base error class
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

// Specific error types
export class OpenRouterAuthError extends OpenRouterError {
  constructor(message: string = "Invalid API key or authentication failed") {
    super(message, "AUTH_ERROR", 401);
    this.name = "OpenRouterAuthError";
  }
}

export class OpenRouterRateLimitError extends OpenRouterError {
  constructor(message: string = "Rate limit exceeded", public readonly retryAfter?: number) {
    super(message, "RATE_LIMIT", 429);
    this.name = "OpenRouterRateLimitError";
  }
}

export class OpenRouterTimeoutError extends OpenRouterError {
  constructor(message: string = "Request timeout", public readonly timeoutMs: number) {
    super(message, "TIMEOUT", undefined, { timeoutMs });
    this.name = "OpenRouterTimeoutError";
  }
}

export class OpenRouterValidationError extends OpenRouterError {
  constructor(message: string, public readonly zodError: z.ZodError) {
    super(message, "VALIDATION_ERROR", undefined, zodError.format());
    this.name = "OpenRouterValidationError";
  }
}

export class OpenRouterNetworkError extends OpenRouterError {
  constructor(message: string = "Network request failed") {
    super(message, "NETWORK_ERROR");
    this.name = "OpenRouterNetworkError";
  }
}

export class OpenRouterApiError extends OpenRouterError {
  constructor(message: string, statusCode: number, details?: unknown) {
    super(message, "API_ERROR", statusCode, details);
    this.name = "OpenRouterApiError";
  }
}
```

### 5.2 Error Scenarios and Handling

#### Scenario 1: Missing API Key
**When:** Constructor called without API key
**Response:** Throw `OpenRouterError` immediately
```typescript
if (!config.apiKey) {
  throw new OpenRouterError(
    "OpenRouter API key is required",
    "CONFIG_ERROR"
  );
}
```

#### Scenario 2: Network Failure
**When:** Fetch fails due to network issues
**Response:** Retry up to configured attempts, then throw `OpenRouterNetworkError`
```typescript
catch (error) {
  if (error instanceof TypeError) { // Fetch network errors
    if (attempt < this.retryAttempts) {
      await this.delay(this.retryDelay * Math.pow(2, attempt));
      return this.executeWithRetry(requestFn, attempt + 1);
    }
    throw new OpenRouterNetworkError("Network request failed");
  }
}
```

#### Scenario 3: Request Timeout
**When:** Request exceeds configured timeout
**Response:** Abort request and throw `OpenRouterTimeoutError`
```typescript
if (error.name === "AbortError") {
  throw new OpenRouterTimeoutError(
    `Request timeout after ${timeout}ms`,
    timeout
  );
}
```

#### Scenario 4: Authentication Error (401)
**When:** API returns 401 status
**Response:** Throw `OpenRouterAuthError` (no retry)
```typescript
if (response.status === 401) {
  throw new OpenRouterAuthError(
    "Invalid API key or authentication failed"
  );
}
```

#### Scenario 5: Rate Limit (429)
**When:** API returns 429 status
**Response:** Retry with exponential backoff if attempts remain
```typescript
if (response.status === 429) {
  const retryAfter = parseInt(response.headers.get("Retry-After") || "5");
  
  if (attempt < this.retryAttempts) {
    await this.delay(retryAfter * 1000);
    return this.executeWithRetry(requestFn, attempt + 1);
  }
  
  throw new OpenRouterRateLimitError(
    "Rate limit exceeded",
    retryAfter
  );
}
```

#### Scenario 6: Server Error (500/502/503)
**When:** API returns 5xx status
**Response:** Retry with backoff if attempts remain
```typescript
if (response.status >= 500) {
  if (attempt < this.retryAttempts) {
    await this.delay(this.retryDelay * Math.pow(2, attempt));
    return this.executeWithRetry(requestFn, attempt + 1);
  }
  
  throw new OpenRouterApiError(
    `Server error: ${response.status} ${response.statusText}`,
    response.status
  );
}
```

#### Scenario 7: Invalid Response Format
**When:** API returns unexpected response structure
**Response:** Throw `OpenRouterApiError` with details
```typescript
if (!data.choices?.[0]?.message?.content) {
  throw new OpenRouterApiError(
    "Invalid response structure from OpenRouter API",
    200,
    { receivedKeys: Object.keys(data) }
  );
}
```

#### Scenario 8: Schema Validation Failure
**When:** Response JSON doesn't match Zod schema
**Response:** Throw `OpenRouterValidationError` with details
```typescript
try {
  return schema.parse(parsedData);
} catch (error) {
  if (error instanceof z.ZodError) {
    throw new OpenRouterValidationError(
      "Response data does not match expected schema",
      error
    );
  }
  throw error;
}
```

#### Scenario 9: JSON Parse Error
**When:** Response content is not valid JSON
**Response:** Throw `OpenRouterApiError` with content sample
```typescript
try {
  return JSON.parse(jsonString);
} catch (error) {
  throw new OpenRouterApiError(
    "Failed to parse JSON from API response",
    200,
    { contentSample: jsonString.substring(0, 200) }
  );
}
```

#### Scenario 10: Empty Response Content
**When:** API returns empty content
**Response:** Throw `OpenRouterApiError`
```typescript
if (!content || content.trim() === "") {
  throw new OpenRouterApiError(
    "Empty response content from API",
    200
  );
}
```

### 5.3 Error Recovery Strategies

1. **Automatic Retry**
   - Network errors: YES (up to 2 attempts)
   - Timeouts: YES (up to 2 attempts)
   - Rate limits: YES (with longer delays)
   - Server errors (5xx): YES (up to 2 attempts)
   - Client errors (4xx): NO (fail fast)

2. **Exponential Backoff**
   ```typescript
   delay = baseDelay * (2 ^ attemptNumber)
   ```
   - Attempt 1: 1 second
   - Attempt 2: 2 seconds
   - Attempt 3: 4 seconds

3. **Graceful Degradation**
   - Log all errors for debugging
   - Provide detailed error messages to caller
   - Include request context in errors
   - Allow caller to implement fallback logic

4. **Monitoring and Alerting**
   - Log all API errors
   - Track error rates
   - Monitor token usage
   - Alert on repeated failures

---

## 6. Security Considerations

### 6.1 API Key Management

**DO:**
1. ✅ Store API key in environment variables only
2. ✅ Never commit API keys to version control
3. ✅ Use different keys for dev/staging/production
4. ✅ Rotate keys regularly
5. ✅ Validate key format in constructor

**DON'T:**
1. ❌ Hard-code API keys in source code
2. ❌ Log API keys in console or logs
3. ❌ Send API keys to client-side code
4. ❌ Share API keys between environments

```typescript
// ✅ GOOD: Load from environment
const apiKey = import.meta.env.OPENROUTER_API_KEY;

// ❌ BAD: Hard-coded
const apiKey = "sk-or-v1-...";
```

### 6.2 Input Validation

1. **Validate messages array**
   ```typescript
   if (!options.messages || options.messages.length === 0) {
     throw new OpenRouterError("Messages array cannot be empty", "VALIDATION_ERROR");
   }
   ```

2. **Sanitize user input**
   ```typescript
   // Remove excessive whitespace
   const sanitized = content.trim().replace(/\s+/g, " ");
   
   // Check length limits
   if (sanitized.length > 100000) {
     throw new OpenRouterError("Message content too large", "VALIDATION_ERROR");
   }
   ```

3. **Validate schema**
   ```typescript
   if (!options.responseSchema?.schema) {
     throw new OpenRouterError("Response schema is required", "VALIDATION_ERROR");
   }
   ```

### 6.3 Data Privacy

1. **Sensitive Data Handling**
   - Never log full message content in production
   - Redact PII from logs
   - Use structured logging with field filtering

2. **Response Data**
   - Don't cache responses containing sensitive info
   - Clear sensitive data from memory after use
   - Follow GDPR/privacy regulations

### 6.4 Rate Limiting

1. **Client-Side Rate Limiting**
   ```typescript
   private requestTimestamps: number[] = [];
   
   private async checkRateLimit(): Promise<void> {
     const now = Date.now();
     const windowMs = 3600000; // 1 hour
     
     // Remove old timestamps
     this.requestTimestamps = this.requestTimestamps.filter(
       ts => now - ts < windowMs
     );
     
     // Check limit (10 requests per hour per user)
     if (this.requestTimestamps.length >= 10) {
       throw new OpenRouterRateLimitError("Client-side rate limit exceeded");
     }
     
     this.requestTimestamps.push(now);
   }
   ```

2. **Cost Controls**
   - Set `max_tokens` limit
   - Monitor token usage
   - Implement usage quotas per user
   - Alert on unusual usage patterns

### 6.5 Network Security

1. **HTTPS Only**
   ```typescript
   if (!this.baseUrl.startsWith("https://") && !import.meta.env.DEV) {
     throw new OpenRouterError(
       "OpenRouter base URL must use HTTPS in production",
       "CONFIG_ERROR"
     );
   }
   ```

2. **Request Headers**
   ```typescript
   // Add application identification
   headers["HTTP-Referer"] = "https://vibe-travels.com";
   headers["X-Title"] = "VibeTravels";
   ```

3. **Timeout Protection**
   - Always use timeouts to prevent hanging requests
   - Default: 60 seconds maximum

---

## 7. Step-by-Step Implementation Plan

### Phase 1: Core Infrastructure (Day 1-2)

#### Step 1: Create Type Definitions
**File:** `src/lib/services/openrouter.types.ts`

Create all TypeScript interfaces and types:
1. `OpenRouterConfig`
2. `ChatOptions<T>`
3. `ChatMessage`
4. `ChatResponse<T>`
5. `OpenRouterRequestBody`
6. `OpenRouterApiResponse`
7. `JsonSchemaObject`
8. Hardcoded constant: `OPENROUTER_MODEL`

**Acceptance Criteria:**
- All types properly exported
- Generic types correctly constrained
- JSDoc comments on all public interfaces

#### Step 2: Create Error Classes
**File:** `src/lib/services/openrouter.errors.ts`

Implement all custom error classes:
1. `OpenRouterError` (base)
2. `OpenRouterAuthError`
3. `OpenRouterRateLimitError`
4. `OpenRouterTimeoutError`
5. `OpenRouterValidationError`
6. `OpenRouterNetworkError`
7. `OpenRouterApiError`

**Acceptance Criteria:**
- All errors extend base `OpenRouterError`
- Proper error codes assigned
- Constructor parameters validated

#### Step 3: Implement Service Constructor
**File:** `src/lib/services/openrouter.service.ts`

1. Create class skeleton
2. Define private fields
3. Implement constructor with validation
4. Set default values
5. Add initialization logging

**Acceptance Criteria:**
- Constructor throws on missing API key
- Default values properly set
- URL format validated
- Can be instantiated successfully

#### Step 4: Add Private Helper Methods

Implement utility methods:
1. `generateRequestId()` - UUID generation
2. `buildHeaders()` - Header construction
3. `delay()` - Promise-based delay helper
4. `logRequest()` - Request logging
5. `logResponse()` - Response logging

**Acceptance Criteria:**
- All helpers are pure functions
- Proper TypeScript types
- Unit testable

### Phase 2: JSON Schema Conversion (Day 2-3)

#### Step 5: Install Dependencies

```bash
npm install zod-to-json-schema
npm install --save-dev @types/node
```

#### Step 6: Implement Schema Conversion
**Method:** `convertZodToJsonSchema()`

1. Import `zodToJsonSchema` from library
2. Convert Zod schema to JSON Schema
3. Add required metadata (name, description)
4. Set `strict: true` and `additionalProperties: false`
5. Validate output structure

**Acceptance Criteria:**
- Handles nested objects
- Handles arrays correctly
- Handles optional fields
- Handles unions and discriminated unions
- Returns valid JSON Schema v7

**Test with:**
```typescript
const testSchema = z.object({
  name: z.string(),
  age: z.number().optional(),
  tags: z.array(z.string()),
});

const jsonSchema = service.convertZodToJsonSchema(
  testSchema,
  "test_schema",
  "A test schema"
);

console.log(JSON.stringify(jsonSchema, null, 2));
```

#### Step 7: Implement Request Payload Builder
**Method:** `buildRequestPayload()`

1. Merge default and override parameters
2. Convert Zod schema to JSON Schema
3. Build proper `response_format` structure
4. Validate required fields
5. Return complete payload object

**Acceptance Criteria:**
- Correct response_format structure
- All optional parameters handled
- Model defaults applied
- Type-safe return value

### Phase 3: HTTP Request Execution (Day 3-4)

#### Step 8: Implement Core Request Method
**Method:** `executeRequest()`

1. Create AbortController
2. Set timeout with setTimeout
3. Build fetch request
4. Execute with signal
5. Clear timeout on completion
6. Parse JSON response
7. Validate response structure

**Acceptance Criteria:**
- Timeout works correctly
- AbortController properly cleaned up
- HTTP errors caught
- Response parsed successfully

#### Step 9: Implement Retry Logic
**Method:** `executeWithRetry()`

1. Wrap request in try-catch
2. Classify errors as retryable/non-retryable
3. Implement exponential backoff
4. Respect retry limits
5. Log retry attempts

**Acceptance Criteria:**
- Retries on network errors
- Retries on timeouts
- Retries on 429/5xx
- No retry on 4xx (except 429)
- Exponential backoff working

#### Step 10: Implement Response Parsing
**Method:** `parseAndValidateResponse()`

1. Extract JSON from content (handle markdown)
2. Parse JSON string
3. Validate with Zod schema
4. Return typed result
5. Throw validation error on mismatch

**Acceptance Criteria:**
- Handles JSON in markdown code blocks
- Validates against schema
- Returns correctly typed data
- Throws OpenRouterValidationError on failure

### Phase 4: Public API Methods (Day 4-5)

#### Step 11: Implement Main Chat Method
**Method:** `chat<T>()`

1. Validate input options
2. Generate unique request ID
3. Log request (if enabled)
4. Build request payload
5. Execute with retry
6. Parse and validate response
7. Build ChatResponse object
8. Log response (if enabled)
9. Return typed result

**Acceptance Criteria:**
- Full type safety with generics
- Proper error handling
- Request/response logging
- Returns ChatResponse<T>

#### Step 12: Implement Connection Test
**Method:** `testConnection()`

1. Send minimal test request
2. Measure latency
3. Return success status
4. Handle errors gracefully

**Acceptance Criteria:**
- Quick connection validation
- Returns latency metrics
- Doesn't throw on failure

### Phase 5: Integration with Existing Code (Day 5-6)

#### Step 13: Refactor ai.service.ts

Decision: **Keep and refactor `ai.service.ts`**

Reasoning:
- Contains valuable mock generator
- Has domain-specific types (AIItineraryResponse)
- Provides development mode abstraction
- Current OpenRouter call needs improvement

Refactoring steps:
1. Keep `generateMockItinerary()` function
2. Keep type definitions (AIActivityResponse, etc.)
3. Replace `callOpenRouterAI()` implementation
4. Use new OpenRouterService class
5. Keep `generatePlanItinerary()` as high-level wrapper

**New structure:**
```typescript
// src/lib/services/ai.service.ts

import { OpenRouterService } from "./openrouter.service";
import { z } from "zod";

// Keep existing types
export interface AIActivityResponse { /* ... */ }
export interface AIBlockResponse { /* ... */ }
export interface AIDayResponse { /* ... */ }
export interface AIItineraryResponse { /* ... */ }

// Keep mock generator
export function generateMockItinerary(params: CreatePlanDto): AIItineraryResponse {
  // Existing implementation
}

// New: Define Zod schema for validation
const itinerarySchema = z.object({
  days: z.array(z.object({
    day_index: z.number(),
    activities: z.object({
      morning: z.array(z.object({
        title: z.string(),
        duration_minutes: z.number(),
        transport_minutes: z.number().nullable(),
      })),
      afternoon: z.array(z.object({
        title: z.string(),
        duration_minutes: z.number(),
        transport_minutes: z.number().nullable(),
      })),
      evening: z.array(z.object({
        title: z.string(),
        duration_minutes: z.number(),
        transport_minutes: z.number().nullable(),
      })),
    }),
  })),
});

// Refactored: Use OpenRouterService
async function callOpenRouterAI(
  params: CreatePlanDto,
  userAge?: number,
  userCountry?: string
): Promise<AIItineraryResponse> {
  const openRouter = new OpenRouterService({
    apiKey: import.meta.env.OPENROUTER_API_KEY,
    baseUrl: import.meta.env.OPENROUTER_BASE_URL,
    defaultTimeout: 60000,
    enableLogging: import.meta.env.DEV,
  });

  // Build messages
  const systemMessage = {
    role: "system" as const,
    content: "You are an expert travel planning assistant. Create detailed, realistic travel itineraries based on user preferences.",
  };

  const userMessage = {
    role: "user" as const,
    content: buildPrompt(params, userAge, userCountry),
  };

  // Call API with structured response
  const response = await openRouter.chat({
    messages: [systemMessage, userMessage],
    responseSchema: {
      name: "travel_itinerary",
      description: "A structured travel itinerary with daily activities organized by time blocks",
      schema: itinerarySchema,
    },
    temperature: 0.7,
    maxTokens: 4000,
  });

  return response.data;
}

// Helper: Build prompt (extract from old implementation)
function buildPrompt(
  params: CreatePlanDto,
  userAge?: number,
  userCountry?: string
): string {
  // Existing prompt building logic
}

// Keep existing main function
export async function generatePlanItinerary(
  supabase: SupabaseClient<Database>,
  userId: string,
  params: CreatePlanDto
): Promise<AIItineraryResponse> {
  // Existing implementation - no changes needed
}
```

**Acceptance Criteria:**
- Mock generator still works
- Development mode still functional
- Production mode uses new service
- All types preserved
- Proper error handling
- Tests pass

#### Step 14: Update Environment Variables

Add to `.env.example`:
```
# OpenRouter API Configuration
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
USE_MOCK_AI=true
```

Update `.env` with actual keys (don't commit)

#### Step 15: Update Documentation

Update files:
1. `README.md` - Add OpenRouter setup instructions
2. `tech-stack.md` - Document OpenRouter integration
3. `copilot-instructions.md` - Add service usage guidelines

---

## Summary

This implementation plan provides a focused guide for building an MVP OpenRouter service for the VibeTravels application. The service will:

- ✅ Provide type-safe API communication with OpenRouter
- ✅ Support structured JSON responses with Zod validation
- ✅ Handle errors gracefully with retry logic and exponential backoff
- ✅ Include request/response logging for debugging
- ✅ Follow security best practices (API key management, input validation, HTTPS)
- ✅ Integrate seamlessly with existing `ai.service.ts`
- ✅ Support both development (mock) and production (API) modes
- ✅ Use hardcoded cost-efficient model (gpt-4o-mini) for all requests

**Implementation Timeline:** 15 steps across 5 phases (approximately 6 days)

**Core Phases:**
1. **Phase 1:** Core Infrastructure (types, errors, constructor, helpers)
2. **Phase 2:** JSON Schema Conversion (Zod to JSON Schema)
3. **Phase 3:** HTTP Request Execution (request handling, retry logic, parsing)
4. **Phase 4:** Public API Methods (chat method, connection test)
5. **Phase 5:** Integration (refactor ai.service.ts, environment setup, documentation)

The refactored `ai.service.ts` will maintain backward compatibility (mock generator and types preserved) while leveraging the new robust OpenRouter client for production API calls.
