# MyPlansView Component - Unit Tests

## Overview

Comprehensive unit test suite for the `MyPlansView` component following Vitest best practices and project guidelines.

## Test Coverage

### 1. **Loading State** (2 tests)
- ✅ Displays loading skeleton while fetching data
- ✅ Shows header section during loading with plan count

### 2. **Error State** (4 tests)
- ✅ Displays error message when fetch fails
- ✅ Handles null error with generic fallback message
- ✅ Hides header section during error
- ✅ Prevents display of other states when error occurs

### 3. **Empty State (0 Plans)** (3 tests)
- ✅ Shows empty state with call-to-action when no plans exist
- ✅ Displays header with 0/10 count
- ✅ Ensures no other states are rendered

### 4. **Success State (Plans Exist)** (3 tests)
- ✅ Renders plan grid with correct number of plans
- ✅ Displays header with accurate plan count
- ✅ Hides loading, error, and empty states

### 5. **Plan Limit Business Rules** (2 tests)
- ✅ Correctly displays 10/10 when limit is reached
- ✅ Still shows plan grid at maximum capacity

### 6. **Edge Cases** (5 tests)
- ✅ Handles transition from loading to success
- ✅ Correctly renders single plan
- ✅ Doesn't show empty state while still loading
- ✅ Prioritizes error state over stale cached data
- ✅ Tests various state combinations

### 7. **Conditional Header Display** (4 tests)
- ✅ Shows header in loading, empty, and success states
- ✅ Hides header only in error state

## Key Testing Patterns Used

### 1. **vi.mock() Factory Pattern**
```typescript
vi.mock("./hooks/useMyPlans");
```
- Mocks placed at top level (before imports)
- Type-safe mocking with `vi.mocked()`
- Dynamic return values via `mockReturnValue()`

### 2. **Isolated Component Testing**
```typescript
vi.mock("./HeaderSection", () => ({
  HeaderSection: ({ planCount, planLimit }) => (
    <div data-testid="header-section">
      Header: {planCount}/{planLimit}
    </div>
  ),
}));
```
- All child components mocked to isolate `MyPlansView` logic
- Focus on conditional rendering logic only

### 3. **Arrange-Act-Assert Pattern**
```typescript
// Arrange
await mockUseMyPlans({ isLoading: true });

// Act
render(<MyPlansView />);

// Assert
expect(screen.getByTestId("loading-state")).toBeInTheDocument();
```

### 4. **Helper Functions**
```typescript
const mockUseMyPlans = (overrides: Partial<MyPlansViewModel> = {}) => {
  // Provides sensible defaults with override capability
};
```

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run specific test file
npm run test MyPlansView.test.tsx

# Run tests matching pattern
npm run test -- -t "Loading State"
```

## Test Configuration

### vitest.config.ts
- **Environment**: jsdom (for DOM testing)
- **Setup File**: `src/test/setup.ts` (global configuration)
- **Coverage**: v8 provider with HTML/JSON/text reporters
- **Aliases**: `@` resolves to `./src`

### Coverage Exclusions
- Test files (`*.test.tsx`, `*.test.ts`)
- Type files (`*.types.ts`, `types.ts`)
- UI library components (`src/components/ui/**`)

## Business Rules Validated

1. **Plan Limit**: Maximum 10 plans per user
2. **State Priority**: Error state takes precedence over all others
3. **Header Visibility**: Hidden only during error state
4. **Loading Behavior**: Shows skeleton while fetching
5. **Empty State**: Displays CTA when no plans exist
6. **Data Display**: Shows plan grid when data is available

## Dependencies

### Testing Libraries
- `vitest` - Fast unit test framework
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - Custom DOM matchers
- `@vitejs/plugin-react` - React plugin for Vitest
- `jsdom` - DOM implementation for Node.js

### UI Testing
- `@vitest/ui` - Visual test interface
- `@testing-library/user-event` - User interaction simulation

## Next Steps

To add more tests:

1. **Hook Testing**: Create `useMyPlans.test.ts` to test the custom hook in isolation
2. **PlanCard Testing**: Add `PlanCard.test.tsx` for individual card component
3. **Integration Tests**: Test interaction with real API (mocked fetch)
4. **Accessibility Tests**: Add ARIA and keyboard navigation tests

## Guidelines Followed

✅ **vi.mock() factory patterns** - All mocks at top level  
✅ **Type-safe mocks** - TypeScript types preserved  
✅ **Descriptive test names** - Clear "should..." format  
✅ **Arrange-Act-Assert** - Consistent test structure  
✅ **Helper functions** - Reusable mock setup  
✅ **jsdom environment** - DOM testing enabled  
✅ **Isolated testing** - Child components mocked  
✅ **Edge case coverage** - State transitions tested  

---

**Total Tests**: 23  
**Test File**: `src/components/my-plans/MyPlansView.test.tsx`  
**Component**: `src/components/my-plans/MyPlansView.tsx`
