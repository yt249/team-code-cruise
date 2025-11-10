---

## Ride Service Spec

### Functions

* `badRequest`
* `forbidden`
* `RideService.createRide`
* `RideService.getRide`
* `RideService.cancelRide`
* `RideService.updateRideStatus`
* `RideService.startRide`
* `RideService.completeRide`

### Test Cases

| Test                                         | Purpose                                                      | Inputs                                                                                                                         | Expected Behavior                                                                                |
| -------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| **badRequest_setsStatus400**                 | Confirm helper tags errors with HTTP 400                     | `badRequest('msg')`                                                                                                            | Throws `Error('msg')`; `(err as any).status === 400`                                             |
| **forbidden_setsStatus403**                  | Confirm helper tags errors with HTTP 403                     | `forbidden()`                                                                                                                  | Throws `Error('Forbidden')`; `(err as any).status === 403`                                       |
| **createRide_happyPath**                     | Ensure ride persists when quote matches and token reconciles | Quote exists with matching pickup/destination & token bound; call `createRide(session, rider, pickup, dest, quoteId, tokenId)` | Ride returned with `status === REQUESTED`, fare discounted if applicable, quote marked consumed  |
| **createRide_rejectsMismatchedRoute**        | Enforce route consistency                                    | Quote exists; call `createRide(...)` with destination moved outside epsilon tolerance                                          | Promise rejects with message `"Quote does not match requested route"`                            |
| **getRide_returnsForOwner**                  | Rider may fetch their own ride                               | Stored ride with matching `riderId`; call `getRide(id, riderId)`                                                               | Returns ride record                                                                              |
| **getRide_blocksForeignRider**               | Other riders cannot access ride                              | Same ride; call `getRide(id, otherRiderId)`                                                                                    | Rejects with status `403`                                                                        |
| **cancelRide_releasesDriver**                | Cancelling should free assigned driver                       | Ride with assigned driver; call `cancelRide(id, riderId)`                                                                      | Returns ride with `status === CANCELLED`; DriverRepository.setAvailability(driver, true) invoked |
| **updateRideStatus_setsRequestedStatus**     | Ensure status change flows through repository                | Mock `RideRepository.update`; call `updateRideStatus(id, RideStatus.IN_RIDE)`                                                  | Returns updated ride with new status                                                             |
| **startRide_requiresAssignedDriver**         | Only assigned driver may start ride                          | Ride with `driverId = driverA`; call `startRide(id, driverA)` then `startRide(id, driverB)`                                    | First call → status becomes `IN_RIDE` + `startedAt` set; second call rejects with status `403`   |
| **completeRide_marksCompleteAndFreesDriver** | Completing ride finishes trip & frees driver                 | Ride assigned to rider & driver; call `completeRide(id, riderId)`                                                              | Returns ride with `status === COMPLETED`, `completedAt` set; driver availability restored        |

---

## Discount Service Spec

### Functions

* `DiscountService.mintToken`
* `DiscountService.validateToken`
* `DiscountService.redeemToken`
* `DiscountService.fetch`
* `httpError`
* `generateUlid`
* `encodeTime`
* `encodeRandom`

### Test Cases

| Test                                   | Purpose                                                 | Inputs                                                                  | Expected Behavior                                                                                          |
| -------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **mintToken_generatesActiveToken**     | Mint within valid percent range                         | `mintToken(sessionId, riderId, 12)`                                     | Token persisted with `state === ACTIVE`, `expiresAt ≈ now + 15min`, and event `ads.token.minted` published |
| **mintToken_rejectsOutOfRangePercent** | Enforce percent bounds                                  | `mintToken(sessionId, riderId, 9)` or `mintToken(..., 16)`              | Rejects with `message: "Requested discount percent is out of allowed range"`, status `400`                 |
| **validateToken_bindQuoteOnFirstUse**  | First validation associates quote                       | Token has no `quoteId`; call `validateToken(id, riderId, { quoteId })`  | Repo update executed; returned token has `quoteId` set                                                     |
| **validateToken_rejectsWrongRider**    | Rider mismatch forbidden                                | Token belongs to someone else; call `validateToken(id, otherRider)`     | Rejects with message `"Discount token does not belong to rider"`, status `403`                             |
| **redeemToken_marksRedeemed**          | Successful redemption transitions state and emits event | Active token; call `redeemToken(id, rideId, ctx)`                       | Repo update: `state = REDEEMED`, `redeemedRideId = rideId`; event `ads.token.redeemed` published           |
| **redeemToken_rejectsExpired**         | Expired token cannot redeem                             | Token `expiresAt < now`                                                 | Repo marks token `EXPIRED`; rejects with `message: "Discount token expired"`, status `410`                 |
| **fetch_returnsTokenRecord**           | Fetch lookup                                            | Mock repo; call `fetch(id)`                                             | Returns the token record                                                                                   |
| **httpError_setsStatus**               | Helper assigns HTTP status                              | `httpError('Bad', 422)`                                                 | `err.message === 'Bad'` and `err.status === 422`                                                           |
| **generateUlid_returns26Uppercase**    | ULID output format correctness                          | Stub `Date.now` + `Math.random`; call `generateUlid()`                  | Returns Crockford Base32 ULID of length 26, uppercase, timestamp prefix matches encoded time               |
| **encodeTime_encodesBase32**           | Time encoding correctness                               | `encodeTime(1679000000000, 10)`                                         | Returns `'01GVP35NG0'`                                                                                     |
| **encodeRandom_usesMathRandom**        | Random output matches alphabet mapping                  | Stub `Math.random` to produce `[0, 0.5, 0.999]`; call `encodeRandom(3)` | Returns `'0GZ'` (indices 0 → '0', 16 → 'G', 31 → 'Z')                                                      |

---
