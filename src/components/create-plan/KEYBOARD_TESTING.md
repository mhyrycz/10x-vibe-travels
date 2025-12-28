# Keyboard Navigation Testing Guide

## Manual Testing Checklist

### 1. Tab Order Test
- [ ] Press Tab repeatedly from page load
- [ ] Verify order: Breadcrumb links → Form fields → Action buttons
- [ ] No keyboard traps (can tab through entire form)
- [ ] Focus indicators are visible (blue outline)

### 2. Form Field Navigation
- [ ] **Destination input**: Tab to focus, type text, see validation
- [ ] **Start Date**: Tab to focus, Enter to open calendar
  - Use arrow keys to navigate dates
  - Enter to select, Escape to close
- [ ] **End Date**: Same as start date
- [ ] **Number of Travelers**: Tab to focus, type number, up/down arrows to increment
- [ ] **Trip Type select**: Tab to focus, Enter/Space to open, arrows to navigate, Enter to select
- [ ] **Comfort select**: Same as trip type
- [ ] **Budget select**: Same as trip type
- [ ] **Transport checkboxes**: Tab to each, Space to toggle
- [ ] **Travel Note textarea**: Tab to focus, type freely

### 3. Action Buttons
- [ ] Tab to "Cancel" button, Enter to activate
- [ ] Tab to "Create Plan" button, Enter to submit form

### 4. Form Validation
- [ ] Submit form with errors (e.g., empty destination)
- [ ] Verify screen reader announces error count
- [ ] Tab through form to see error messages under fields

### 5. Loading States
- [ ] Submit valid form
- [ ] Verify loading overlay is announced by screen reader
- [ ] Verify keyboard focus is trapped in modal (can't tab outside)

### 6. Alert Banner
- [ ] If plan limit reached, verify alert is focusable
- [ ] Tab to "Go to My Plans" link, Enter to activate

## Screen Reader Testing

### macOS (VoiceOver)
1. Enable: `Cmd+F5` or System Settings → Accessibility → VoiceOver
2. Navigate: `Ctrl+Option+Right Arrow` (next), `Ctrl+Option+Left Arrow` (previous)
3. Interact: `Ctrl+Option+Space`

**Test Points:**
- [ ] Form label announces when field focused
- [ ] Error messages announced when validation fails
- [ ] Loading overlay message announced
- [ ] Plan limit alert announced

### Windows (NVDA)
1. Download NVDA (free)
2. Navigate: `Down Arrow` (next), `Up Arrow` (previous)
3. Interact: `Enter`

### Browser DevTools

**Chrome/Edge:**
1. Open DevTools (F12)
2. Elements tab → Right-click element → "Inspect Accessibility Properties"
3. Lighthouse tab → Run "Accessibility" audit

**Firefox:**
1. Open DevTools (F12)
2. Accessibility tab → Enable accessibility features
3. View focus order and ARIA attributes

## Common Issues to Check

### Focus Indicators
```css
/* Should see blue outline on focus */
*:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}
```

### Skip Links (if needed)
- Tab on page load should show "Skip to main content" link
- Press Enter to jump to form

### Keyboard Traps
- Ensure modals can be closed with Escape
- Ensure dropdowns can be closed with Escape
- Ensure no element traps focus

### ARIA Attributes
Check in DevTools that elements have:
- `role` attributes (dialog, alert, button)
- `aria-label` or `aria-labelledby` for context
- `aria-describedby` for descriptions
- `aria-live` for dynamic content
- `aria-invalid` for error states

## Testing with Real Users

If possible, test with:
- Someone who primarily uses keyboard navigation
- Someone who uses a screen reader daily
- Someone with motor disabilities

## Automated Testing Tools

### axe DevTools (Browser Extension)
1. Install axe DevTools for Chrome/Firefox
2. Open extension
3. Click "Scan All of My Page"
4. Review and fix issues

### Pa11y (CLI)
```bash
npm install -g pa11y
pa11y http://localhost:4321/plans/new
```

### Playwright/Cypress Tests
```typescript
// Example keyboard navigation test
test('form is keyboard accessible', async ({ page }) => {
  await page.goto('/plans/new');
  
  // Tab through form
  await page.keyboard.press('Tab'); // Focus destination
  await page.keyboard.type('Paris, France');
  
  await page.keyboard.press('Tab'); // Focus start date
  await page.keyboard.press('Enter'); // Open calendar
  // ... continue testing
});
```

## Expected Tab Order

1. Breadcrumb: Home link
2. Breadcrumb: My Plans link
3. Destination input
4. Start date button
5. End date button
6. Number of travelers input
7. Trip type select
8. Comfort level select
9. Budget select
10. Transport: Car checkbox
11. Transport: Walking checkbox
12. Transport: Public transport checkbox
13. Travel note textarea
14. Cancel button
15. Create Plan button

## Accessibility Scoring Goals

- **Lighthouse Accessibility**: 95+ / 100
- **axe violations**: 0
- **WCAG 2.1 Level AA**: Full compliance
