/**
 * Vitest Global Setup
 *
 * Configures test environment with necessary polyfills and matchers
 */

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// ResizeObserver polyfill for Radix UI components
global.ResizeObserver = class ResizeObserver {
  observe() {
    // No-op polyfill
  }
  unobserve() {
    // No-op polyfill
  }
  disconnect() {
    // No-op polyfill
  }
};

// Cleanup after each test case (e.g., clearing jsdom)
afterEach(() => {
  cleanup();
});
