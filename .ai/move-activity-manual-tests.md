# Manual Test Plan: Move Activity Endpoint

**Endpoint**: `POST /api/plans/{planId}/activities/{activityId}/move`  
**Date Created**: 2025-12-19  
**Purpose**: Validate the Move Activity endpoint functionality, error handling, and edge cases

---

## Test Environment Setup

### Prerequisites

- Local Supabase instance running
- Test database with sample plans created
- API server running on `http://localhost:3000`
- REST client (Postman, Bruno, curl, or similar)

### Test Data Requirements

Create a test plan with the following structure:

- **2 days** (Day 1 and Day 2)
- **3 blocks per day** (morning, afternoon, evening)
- **2-3 activities per block** for comprehensive testing

---

## Test Cases

### Category 1: Happy Path - Cross-Block Moves

#### Test 1.1: Move Activity from One Block to Another (Different Days)

**Objective**: Verify activity can be moved between blocks on different days

**Pre-conditions**:

- Activity exists in Day 1, Morning block, position 1
- Target is Day 2, Afternoon block, position 2

**Steps**:

1. Note the current state of both blocks (activity counts and order_indexes)
2. Send POST request:
   ```json
   POST /api/plans/{planId}/activities/{activityId}/move
   {
     "target_block_id": "{day2_afternoon_block_id}",
     "target_order_index": 2
   }
   ```
3. Verify response status: `200 OK`
4. Verify response body contains updated activity with:
   - `block_id` = target block ID
   - `order_index` = 2
   - `updated_at` timestamp is recent

**Expected Results**:

- Source block: Activities after position 1 have `order_index` decremented by 1
- Target block: Activities at position ≥ 2 have `order_index` incremented by 1
- Moved activity is at position 2 in target block
- No gaps in order_index sequences in either block

**Pass Criteria**: ✅ Activity successfully moved, order maintained in both blocks

---

#### Test 1.2: Move Activity to Empty Block

**Objective**: Verify activity can be moved to a block with no existing activities

**Pre-conditions**:

- Activity exists in a block with multiple activities
- Target block has no activities

**Steps**:

1. Send POST request with `target_order_index: 1`
2. Verify response status: `200 OK`

**Expected Results**:

- Activity is now at position 1 in target block
- Source block activities are reordered correctly
- Target block now contains exactly 1 activity

**Pass Criteria**: ✅ Activity successfully moved to empty block

---

#### Test 1.3: Move Activity to Beginning of Block

**Objective**: Verify activity can be moved to position 1 in target block

**Pre-conditions**:

- Activity exists in any block
- Target block has activities at positions 1, 2, 3

**Steps**:

1. Send POST request with `target_order_index: 1`
2. Verify all existing activities in target block shift down

**Expected Results**:

- Moved activity is at position 1
- Previous position 1 activity is now at position 2
- Previous position 2 activity is now at position 3
- And so on...

**Pass Criteria**: ✅ Activity inserted at beginning, all others shifted

---

#### Test 1.4: Move Activity to End of Block

**Objective**: Verify activity can be moved to the last position in target block

**Pre-conditions**:

- Activity exists in any block
- Target block has 3 activities (positions 1, 2, 3)

**Steps**:

1. Send POST request with `target_order_index: 4`
2. Verify activity is placed at the end

**Expected Results**:

- Moved activity is at position 4
- Existing activities remain at positions 1, 2, 3

**Pass Criteria**: ✅ Activity appended to end of block

---

### Category 2: Happy Path - Same-Block Moves

#### Test 2.1: Move Activity Down Within Same Block

**Objective**: Verify activity can be moved to a higher position in the same block

**Pre-conditions**:

- Block has activities at positions: 1, 2, 3, 4
- Move activity from position 2 to position 4

**Steps**:

1. Note activity IDs at all positions
2. Send POST request with:
   ```json
   {
     "target_block_id": "{same_block_id}",
     "target_order_index": 4
   }
   ```
3. Verify response status: `200 OK`

**Expected Results**:

- Activity from position 2 is now at position 4
- Activities originally at positions 3 and 4 shifted up to positions 2 and 3
- Position sequence: [original-1, original-3, original-4, original-2]

**Pass Criteria**: ✅ Activity moved down, intervening activities shifted up

---

#### Test 2.2: Move Activity Up Within Same Block

**Objective**: Verify activity can be moved to a lower position in the same block

**Pre-conditions**:

- Block has activities at positions: 1, 2, 3, 4
- Move activity from position 4 to position 2

**Steps**:

1. Send POST request with `target_order_index: 2`
2. Verify activities shift correctly

**Expected Results**:

- Activity from position 4 is now at position 2
- Activities originally at positions 2 and 3 shifted down to positions 3 and 4
- Position sequence: [original-1, original-4, original-2, original-3]

**Pass Criteria**: ✅ Activity moved up, intervening activities shifted down

---

#### Test 2.3: Move Activity to Same Position

**Objective**: Verify no-op when moving activity to its current position

**Pre-conditions**:

- Activity is at position 2 in a block

**Steps**:

1. Send POST request with `target_order_index: 2` (same position)
2. Verify response status: `200 OK`

**Expected Results**:

- Activity remains at position 2
- Only `updated_at` timestamp changes
- No other activities affected

**Pass Criteria**: ✅ Timestamp updated, no reordering occurred

---

### Category 3: Authorization & Security

#### Test 3.1: Move Activity in Plan Owned by Different User

**Objective**: Verify endpoint rejects requests from non-owners

**Pre-conditions**:

- Authenticated as User A
- Plan belongs to User B

**Steps**:

1. Send POST request to move activity in User B's plan
2. Verify response status: `403 Forbidden`

**Expected Results**:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You don't have permission to access this plan"
  }
}
```

**Pass Criteria**: ✅ Request rejected with 403 status

---

#### Test 3.2: Move Activity Without Authentication

**Objective**: Verify endpoint requires authentication

**Pre-conditions**:

- No authentication token provided (if auth is implemented)

**Steps**:

1. Send POST request without Authorization header
2. Verify response status: `401 Unauthorized`

**Expected Results**:

- Request rejected
- Error indicates authentication required

**Pass Criteria**: ✅ Unauthenticated request blocked

---

### Category 4: Validation Errors

#### Test 4.1: Invalid Plan ID Format

**Objective**: Verify UUID validation for plan ID

**Steps**:

1. Send POST request with `planId: "invalid-uuid"`
2. Verify response status: `400 Bad Request`

**Expected Results**:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid plan ID format"
  }
}
```

**Pass Criteria**: ✅ Invalid UUID rejected

---

#### Test 4.2: Invalid Activity ID Format

**Objective**: Verify UUID validation for activity ID

**Steps**:

1. Send POST request with `activityId: "not-a-uuid"`
2. Verify response status: `400 Bad Request`

**Expected Results**:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid activity ID format"
  }
}
```

**Pass Criteria**: ✅ Invalid UUID rejected

---

#### Test 4.3: Invalid Target Block ID Format

**Objective**: Verify UUID validation for target block ID

**Steps**:

1. Send POST request with:
   ```json
   {
     "target_block_id": "123",
     "target_order_index": 2
   }
   ```
2. Verify response status: `400 Bad Request`

**Expected Results**:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid move data",
    "details": {
      "fieldErrors": {
        "target_block_id": ["Invalid target block ID format"]
      }
    }
  }
}
```

**Pass Criteria**: ✅ Zod validation catches invalid UUID

---

#### Test 4.4: Order Index Below Minimum (< 1)

**Objective**: Verify order_index range validation

**Steps**:

1. Send POST request with `target_order_index: 0`
2. Verify response status: `400 Bad Request`

**Expected Results**:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid move data",
    "details": {
      "fieldErrors": {
        "target_order_index": ["Order index must be between 1 and 50"]
      }
    }
  }
}
```

**Pass Criteria**: ✅ Out-of-range value rejected

---

#### Test 4.5: Order Index Above Maximum (> 50)

**Objective**: Verify order_index upper bound validation

**Steps**:

1. Send POST request with `target_order_index: 51`
2. Verify response status: `400 Bad Request`

**Expected Results**:

- Same error as Test 4.4 with appropriate message

**Pass Criteria**: ✅ Out-of-range value rejected

---

#### Test 4.6: Missing Request Body

**Objective**: Verify required fields validation

**Steps**:

1. Send POST request with empty body: `{}`
2. Verify response status: `400 Bad Request`

**Expected Results**:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid move data",
    "details": {
      "fieldErrors": {
        "target_block_id": ["Required"],
        "target_order_index": ["Required"]
      }
    }
  }
}
```

**Pass Criteria**: ✅ Missing required fields rejected

---

#### Test 4.7: Invalid JSON in Request Body

**Objective**: Verify JSON parsing error handling

**Steps**:

1. Send POST request with malformed JSON: `{target_block_id: "no-quotes"}`
2. Verify response status: `400 Bad Request`

**Expected Results**:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid JSON in request body"
  }
}
```

**Pass Criteria**: ✅ Malformed JSON rejected

---

#### Test 4.8: Target Block Belongs to Different Plan

**Objective**: Verify target block must be in the same plan

**Pre-conditions**:

- Have two plans: Plan A and Plan B
- Activity exists in Plan A
- Target block belongs to Plan B

**Steps**:

1. Send POST request trying to move activity from Plan A to Plan B's block
2. Verify response status: `400 Bad Request`

**Expected Results**:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Target block does not belong to this plan"
  }
}
```

**Pass Criteria**: ✅ Cross-plan move prevented

---

### Category 5: Not Found Errors

#### Test 5.1: Non-existent Plan ID

**Objective**: Verify error when plan doesn't exist

**Steps**:

1. Send POST request with valid but non-existent plan UUID
2. Verify response status: `404 Not Found`

**Expected Results**:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Activity not found"
  }
}
```

**Pass Criteria**: ✅ Non-existent plan handled gracefully

---

#### Test 5.2: Non-existent Activity ID

**Objective**: Verify error when activity doesn't exist

**Steps**:

1. Send POST request with valid plan but non-existent activity UUID
2. Verify response status: `404 Not Found`

**Expected Results**:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Activity not found"
  }
}
```

**Pass Criteria**: ✅ Non-existent activity handled gracefully

---

#### Test 5.3: Non-existent Target Block ID

**Objective**: Verify error when target block doesn't exist

**Steps**:

1. Send POST request with valid but non-existent target block UUID
2. Verify response status: `404 Not Found`

**Expected Results**:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Target block not found"
  }
}
```

**Pass Criteria**: ✅ Non-existent target block handled gracefully

---

### Category 6: Edge Cases & Stress Tests

#### Test 6.1: Move Only Activity in Block

**Objective**: Verify moving the only activity from a block

**Pre-conditions**:

- Block has only 1 activity

**Steps**:

1. Move that activity to a different block
2. Verify source block becomes empty
3. Verify target block order is correct

**Expected Results**:

- Source block has 0 activities
- Target block includes the moved activity
- No orphaned activities

**Pass Criteria**: ✅ Single activity moved successfully, source block empty

---

#### Test 6.2: Move to Block at Maximum Capacity

**Objective**: Verify behavior when target block has many activities

**Pre-conditions**:

- Target block has activities at positions 1-10 (or create a realistic scenario)

**Steps**:

1. Move activity to position 5 in the full block
2. Verify all activities shift correctly

**Expected Results**:

- Activity inserted at position 5
- All activities from position 5-10 shifted to 6-11
- No position collisions

**Pass Criteria**: ✅ Activity inserted correctly in full block

---

#### Test 6.3: Rapid Sequential Moves (Concurrency Simulation)

**Objective**: Verify transaction handling prevents data corruption

**Steps**:

1. Manually send 3-5 move requests in rapid succession
2. Wait for all to complete
3. Verify final state has no gaps or duplicates in order_index

**Expected Results**:

- All moves process successfully
- No duplicate order_index values in any block
- No gaps in order_index sequences
- Row-level locking prevents race conditions

**Pass Criteria**: ✅ No data corruption under rapid requests

---

#### Test 6.4: Move Activity Multiple Times in Sequence

**Objective**: Verify multiple moves work correctly

**Steps**:

1. Move activity from Block A position 1 to Block B position 2
2. Wait for completion
3. Move same activity from Block B position 2 to Block C position 3
4. Verify final state is correct

**Expected Results**:

- Activity ends at Block C position 3
- Block A and Block B have correct order sequences
- `updated_at` timestamp reflects latest move

**Pass Criteria**: ✅ Sequential moves work correctly

---

### Category 7: Data Integrity Checks

#### Test 7.1: Verify No Order Index Gaps After Move

**Objective**: Ensure no gaps in order_index sequences

**Steps**:

1. Perform any move operation
2. Query source block activities: `SELECT order_index FROM plan_activities WHERE block_id = ? ORDER BY order_index`
3. Query target block activities similarly
4. Verify sequences are: 1, 2, 3, 4... (no gaps like 1, 2, 4, 5)

**Expected Results**:

- Both blocks have continuous order_index sequences
- No missing positions

**Pass Criteria**: ✅ No gaps in any block

---

#### Test 7.2: Verify No Duplicate Order Indexes

**Objective**: Ensure unique constraint maintained

**Steps**:

1. After any move, query database:
   ```sql
   SELECT block_id, order_index, COUNT(*)
   FROM plan_activities
   GROUP BY block_id, order_index
   HAVING COUNT(*) > 1
   ```
2. Verify query returns 0 rows

**Expected Results**:

- No duplicate (block_id, order_index) pairs exist

**Pass Criteria**: ✅ Unique constraint maintained

---

#### Test 7.3: Verify Updated Timestamps

**Objective**: Ensure `updated_at` reflects the move operation

**Pre-conditions**:

- Note current `updated_at` timestamp of activity

**Steps**:

1. Wait 1 second
2. Move the activity
3. Compare new `updated_at` with old timestamp

**Expected Results**:

- `updated_at` is more recent than before the move
- Timestamp is in correct format (ISO 8601)

**Pass Criteria**: ✅ Timestamp updated correctly

---

#### Test 7.4: Verify Event Logging

**Objective**: Ensure `plan_edited` event is logged

**Steps**:

1. Note current count of events for the plan:
   ```sql
   SELECT COUNT(*) FROM events WHERE plan_id = ? AND event_type = 'plan_edited'
   ```
2. Perform move operation
3. Re-query event count

**Expected Results**:

- Event count increased by 1
- Event has correct `user_id`, `plan_id`, and `event_type`

**Pass Criteria**: ✅ Event logged successfully

---

## Test Execution Summary Template

| Test ID | Test Name                         | Status | Notes |
| ------- | --------------------------------- | ------ | ----- |
| 1.1     | Cross-block move (different days) | ⬜     |       |
| 1.2     | Move to empty block               | ⬜     |       |
| 1.3     | Move to beginning of block        | ⬜     |       |
| 1.4     | Move to end of block              | ⬜     |       |
| 2.1     | Move down within block            | ⬜     |       |
| 2.2     | Move up within block              | ⬜     |       |
| 2.3     | Move to same position             | ⬜     |       |
| 3.1     | Unauthorized user                 | ⬜     |       |
| 3.2     | No authentication                 | ⬜     |       |
| 4.1     | Invalid plan ID                   | ⬜     |       |
| 4.2     | Invalid activity ID               | ⬜     |       |
| 4.3     | Invalid target block ID           | ⬜     |       |
| 4.4     | Order index < 1                   | ⬜     |       |
| 4.5     | Order index > 50                  | ⬜     |       |
| 4.6     | Missing request body              | ⬜     |       |
| 4.7     | Invalid JSON                      | ⬜     |       |
| 4.8     | Cross-plan move attempt           | ⬜     |       |
| 5.1     | Non-existent plan                 | ⬜     |       |
| 5.2     | Non-existent activity             | ⬜     |       |
| 5.3     | Non-existent target block         | ⬜     |       |
| 6.1     | Move only activity                | ⬜     |       |
| 6.2     | Move to full block                | ⬜     |       |
| 6.3     | Rapid sequential moves            | ⬜     |       |
| 6.4     | Multiple moves in sequence        | ⬜     |       |
| 7.1     | No order gaps                     | ⬜     |       |
| 7.2     | No duplicate indexes              | ⬜     |       |
| 7.3     | Updated timestamps                | ⬜     |       |
| 7.4     | Event logging                     | ⬜     |       |

---

## Sample cURL Commands

### Successful Move (Cross-block)

```bash
curl -X POST http://localhost:3000/api/plans/bca7c588-717f-4245-b31b-9a36cf56cedc/activities/a206d869-bfe4-4d03-b53e-ab7080fb35b0/move \
  -H "Content-Type: application/json" \
  -d '{
    "target_block_id": "1e686e7d-5625-464b-b364-1840db6c7be8",
    "target_order_index": 2
  }'
```

### Invalid Order Index

```bash
curl -X POST http://localhost:3000/api/plans/{planId}/activities/{activityId}/move \
  -H "Content-Type: application/json" \
  -d '{
    "target_block_id": "{blockId}",
    "target_order_index": 0
  }'
```

### Invalid UUID

```bash
curl -X POST http://localhost:3000/api/plans/invalid-uuid/activities/{activityId}/move \
  -H "Content-Type: application/json" \
  -d '{
    "target_block_id": "{blockId}",
    "target_order_index": 2
  }'
```

---

## Notes for Testers

1. **Reset Test Data**: Between major test runs, consider resetting the database to ensure clean state
2. **Document Edge Cases**: If you discover any unexpected behavior, document it thoroughly
3. **Performance**: Note if any operation takes longer than 200ms
4. **Error Messages**: Verify error messages are user-friendly and don't expose internal details
5. **Database State**: Periodically verify database integrity using queries in Test 7.1 and 7.2

---

## Sign-off

**Tested By**: ******\_\_\_******  
**Date**: ******\_\_\_******  
**Environment**: ******\_\_\_******  
**Overall Result**: ⬜ Pass | ⬜ Fail | ⬜ Partial  
**Comments**: ******\_\_\_******
