# **Header**

Header Title: Development Specification: Ride Price Trends Feature 

Version & Date: v1.0 – Oct 30, 2025 

Authors & Roles: Yena Wu – Product Manager (requirements)

# **Architecture Diagram**
```mermaid
graph TB
  %% ---- Visual Classes (colors) ----
  classDef module fill:#E0E0E0,stroke:#4A4A4A,color:#1C1C1C;
  classDef frontend fill:#FFE6E6,stroke:#C40C0C,color:#2D0000;
  classDef viewmodel fill:#FFFBD1,stroke:#A68C00,color:#3D3000;
  classDef clientService fill:#E0F7F4,stroke:#00796B,color:#00352F;
  classDef controller fill:#E6ECFF,stroke:#2030A0,color:#0D1540;
  classDef service fill:#D9F1FF,stroke:#0A589C,color:#033158;
  classDef repository fill:#FDE2C6,stroke:#A05E00,color:#3B1E00;
  classDef scheduler fill:#EDE0FF,stroke:#5C2E91,color:#241240;

  %% =========================
  %% Rider Fare Trend Experience Module
  %% =========================
  subgraph RiderFareTrendExperienceModule ["RiderFareTrendExperienceModule Rider Fare Trend Experience Module"]
    direction TB

    RiderFareTrendExperience0["RiderFareTrendExperience0 Experience Module Container<br/>Fields<br/>——————————————————<br/>- containedElements: string list<br/>Methods<br/>——————————————————<br/>- describeComposition(): void"]:::module

    RiderFareTrendExperience1["RiderFareTrendExperience1 Rider Fare Trend Page Component<br/>Fields<br/>——————————————————<br/>- trendData: FareTrendViewModel | null<br/>- pickupCoordinate: CoordinatePair<br/>- destinationCoordinate: CoordinatePair<br/>- selectedTimeWindow: TimeWindowSelection (default=Last30Days)<br/>- selectedTimezone: string<br/>- loadingIndicator: boolean<br/>- errorMessage: string | null<br/>Methods<br/>——————————————————<br/>- initializeView(): void<br/>- handleRouteSelection(): void<br/>- handleTimeWindowChange(): void<br/>- requestTrendData(): void<br/>- renderHeatMap(): void<br/>- renderInsightsPanel(): void"]:::frontend

    RiderFareTrendExperience2["RiderFareTrendExperience2 Rider Fare Trend View Model<br/>Fields<br/>——————————————————<br/>- dailyTimeBuckets: FareTrendBucketList (7x24)<br/>- cheapestBucket: FareTrendBucket | null<br/>- highestCostBucket: FareTrendBucket | null<br/>- averageFareAcrossAllBuckets: number<br/>- insufficientDataThreshold: number (k-anon)<br/>- timezoneLabel: string<br/>Methods<br/>——————————————————<br/>(no methods)"]:::viewmodel

    RiderFareTrendExperience4["RiderFareTrendExperience4 Rider Fare Trend Presenter<br/>Fields<br/>——————————————————<br/>- none: null<br/>Methods<br/>——————————————————<br/>- fromServiceResponse(): FareTrendViewModel<br/>- bucketByDayOfWeek(): FareTrendBucketList<br/>- identifyCheapestWindow(): FareTrendBucket | null<br/>- identifyCostliestWindow(): FareTrendBucket | null"]:::frontend

    RiderFareTrendExperience3["RiderFareTrendExperience3 Rider Fare Trend Client Service<br/>Fields<br/>——————————————————<br/>- serviceEndpointAddress: string (/v1/insights/route-prices)<br/>- credentialProvider: AuthenticationTokenProvider<br/>- networkClient: NetworkClient<br/>Methods<br/>——————————————————<br/>- fetchFareTrends(origin,dest,timezone,window='30d'): Promise&lt;FareTrendSummary&gt;<br/>- constructRequestAddress(): string<br/>- includeAuthorizationHeader(): Record&lt;string,string&gt;<br/>- handleErrorResponse(): never"]:::clientService
  end

  %% =========================
  %% Fare Trend Analytics Module
  %% =========================
  subgraph FareTrendAnalyticsModule ["FareTrendAnalyticsModule Fare Trend Analytics Module"]
    direction TB

    FareTrendAnalytics0["FareTrendAnalytics0 Analytics Module Container<br/>Fields<br/>——————————————————<br/>- containedElements: string list<br/>Methods<br/>——————————————————<br/>- describeComposition(): void"]:::module

    FareTrendAnalytics1["FareTrendAnalytics1 Fare Trend Controller<br/>Fields<br/>——————————————————<br/>- fareTrendService: FareTrendService<br/>- requestSchema: FareTrendRequestSchema<br/>Methods<br/>——————————————————<br/>- registerHypertextHandlers(): void<br/>- handleGetRouteTrends(): Promise&lt;void&gt;  /* GET /v1/insights/route-prices */<br/>- parseRouteCoordinates(): RouteSpecification<br/>- buildResponseModel(): FareTrendPresentation"]:::controller

    FareTrendAnalytics2["FareTrendAnalytics2 Fare Trend Service<br/>Fields<br/>——————————————————<br/>- trendRepository: FareTrendRepository  /* read model */<br/>- quoteHistoryRepository: QuoteHistoryRepository  /* raw quotes/trips */<br/>- trendCacheMap: Map&lt;RouteTimeKeyString,FareTrendSummary&gt; | CacheClient<br/>- bucketConfiguration: BucketConfiguration {dow:7,hour:24}<br/>- timezoneResolver: TimezoneResolver<br/>- routeKeyNormalizer: RouteKeyNormalizer<br/>- minSampleThreshold: number (k-anon)<br/>Methods<br/>——————————————————<br/>- getRouteTrends(route,timezone,window): Promise&lt;FareTrendSummary&gt;<br/>- computeAveragesForBuckets(records): FareTrendBucketList<br/>- bucketizeQuotes(records): Map&lt;RouteTimeKeyString,FareTrendBucket&gt;<br/>- invalidateCacheForRoute(routeKey): void<br/>- persistFreshAggregations(summary): Promise&lt;void&gt;"]:::service

    %% ---- Read model for fast lookups (30d rolling) ----
    FareTrendStatsRepo["FareTrendAnalytics6 Route Price Stats Repository (30d Read Model)<br/>Fields<br/>——————————————————<br/>- databaseClient: PrismaClient<br/>- tableName: RoutePriceStats_30d<br/>- primaryKey: (route_key, tz, product_type, dow, hour)<br/>Methods<br/>——————————————————<br/>- fetchStats(routeKey,tz): Promise&lt;FareTrendBucketList&gt;<br/>- upsertStats(buckets): Promise&lt;void&gt;<br/>- deleteExpired(): Promise&lt;number&gt;"]:::repository

    FareTrendAnalytics3["FareTrendAnalytics3 Fare Trend Repository (Deprecated direct agg store)<br/>Fields<br/>——————————————————<br/>- databaseClient: PrismaClient<br/>- tableName: string<br/>Methods<br/>——————————————————<br/>- fetchAggregatedTrends(): Promise&lt;FareTrendBucketList&gt;<br/>- saveAggregatedTrends(): Promise&lt;void&gt;<br/>- deleteExpiredAggregations(): Promise&lt;number&gt;"]:::repository

    FareTrendAnalytics4["FareTrendAnalytics4 Quote History Repository<br/>Fields<br/>——————————————————<br/>- databaseClient: PrismaClient<br/>- tableName: QuoteHistory<br/>Methods<br/>——————————————————<br/>- appendQuoteRecord(): Promise&lt;void&gt;<br/>- fetchQuotesForRoute(routeKey,lookbackDays): Promise&lt;QuoteHistoryRecord[]&gt;<br/>- purgeOlderThan(days): Promise&lt;number&gt;"]:::repository

    FareTrendAnalytics5["FareTrendAnalytics5 Fare Trend Aggregator (Scheduler/ETL)<br/>Fields<br/>——————————————————<br/>- scheduleIdentifier: SchedulerHandle | null<br/>- lookbackWindowDays: number (30)<br/>- aggregationIntervalMinutes: number (60)<br/>- statsRepository: Route Price Stats Repository<br/>- quoteHistoryRepository: QuoteHistoryRepository<br/>- timezoneResolver: TimezoneResolver<br/>- routeKeyNormalizer: RouteKeyNormalizer<br/>- outlierPolicy: Winsorize(1%,99%)<br/>Methods<br/>——————————————————<br/>- start(): void<br/>- stop(): void<br/>- runAggregationCycle(): Promise&lt;void&gt;<br/>- aggregateRoute(routeKey): Promise&lt;void&gt;<br/>- upsertDailyBuckets(buckets): Promise&lt;void&gt;"]:::scheduler
  end

  %% =========================
  %% Shared Utilities Module
  %% =========================
  subgraph SharedUtilitiesModule ["SharedUtilitiesModule Shared Utilities"]
    direction TB
    RouteKeyNormalizer["RouteKeyNormalizer Utility<br/>Fields<br/>——————————————————<br/>- h3Resolution: number | radiusMeters<br/>Methods<br/>——————————————————<br/>- composeRouteKey(origin,dest): RouteKeyString"]:::service

    TimezoneResolver["TimezoneResolver Utility<br/>Fields<br/>——————————————————<br/>- provider: TZDB | MapsTZ<br/>Methods<br/>——————————————————<br/>- resolve(origin,dest,override?): string"]:::service

    TrendCache["TrendCache Layer (Redis/CDN)<br/>Fields<br/>——————————————————<br/>- ttlMinutes: number (15)<br/>Methods<br/>——————————————————<br/>- get(key): FareTrendSummary | null<br/>- set(key,value): void<br/>- invalidate(prefix): void"]:::service
  end

  %% =========================
  %% Ride Quotation Module
  %% =========================
  subgraph RideQuotationModule ["RideQuotationModule Ride Quotation Module"]
    direction TB

    RideQuotation0["RideQuotation0 Quotation Module Container<br/>Fields<br/>——————————————————<br/>- containedElements: string list<br/>Methods<br/>——————————————————<br/>- describeComposition(): void"]:::module

    RideQuotation1["RideQuotation1 Quote Service<br/>Fields<br/>——————————————————<br/>- statelessMarker: string (&quot;no stored fields&quot;)<br/>Methods<br/>——————————————————<br/>- getQuote(): Promise&lt;FareQuote&gt;<br/>- recordQuoteForTrendAnalysis(fare,origin,dest,productType): Promise&lt;void&gt;<br/>- composeRouteKey(origin,dest): RouteKeyString"]:::service
  end

  %% =========================
  %% Containment Links (container boxes connect to classes they contain)
  %% =========================
  RiderFareTrendExperience0 --> RiderFareTrendExperience1
  RiderFareTrendExperience0 --> RiderFareTrendExperience2
  RiderFareTrendExperience0 --> RiderFareTrendExperience4
  RiderFareTrendExperience0 --> RiderFareTrendExperience3

  FareTrendAnalytics0 --> FareTrendAnalytics1
  FareTrendAnalytics0 --> FareTrendAnalytics2
  FareTrendAnalytics0 --> FareTrendStatsRepo
  FareTrendAnalytics0 --> FareTrendAnalytics3
  FareTrendAnalytics0 --> FareTrendAnalytics4
  FareTrendAnalytics0 --> FareTrendAnalytics5

  RideQuotation0 --> RideQuotation1

  SharedUtilitiesModule --> RouteKeyNormalizer
  SharedUtilitiesModule --> TimezoneResolver
  SharedUtilitiesModule --> TrendCache

  %% =========================
  %% Functional Relations
  %% =========================
  %% Frontend
  RiderFareTrendExperience1 --> RiderFareTrendExperience3
  RiderFareTrendExperience1 --> RiderFareTrendExperience4
  RiderFareTrendExperience4 --> RiderFareTrendExperience2

  %% API path
  RiderFareTrendExperience3 --> FareTrendAnalytics1

  %% Controller -> Service
  FareTrendAnalytics1 --> FareTrendAnalytics2

  %% Service -> Read model / cache / utils
  FareTrendAnalytics2 --> FareTrendStatsRepo
  FareTrendAnalytics2 -. tz .-> TrendCache
  FareTrendAnalytics2 -. tz .-> TimezoneResolver
  FareTrendAnalytics2 -. routeKey .-> RouteKeyNormalizer

  %% ETL scheduler
  FareTrendAnalytics5 --> FareTrendAnalytics4
  FareTrendAnalytics5 --> FareTrendStatsRepo
  FareTrendAnalytics5 -. tz .-> TimezoneResolver
  FareTrendAnalytics5 -. routeKey .-> RouteKeyNormalizer
  FareTrendAnalytics5 -.-> FareTrendAnalytics2

  %% Raw data producer
  RideQuotation1 --> FareTrendAnalytics4
  RideQuotation1 -. routeKey .-> RouteKeyNormalizer
```


## **Legend**

* **Module (gray): Logical container grouping related components.**

* **Frontend (red): Rider UI (page, presenter, client service).**

* **ViewModel (yellow): Data prepared for UI (7×24 buckets, cheapest window).**

* **Client Service (teal): Calls backend endpoint `/v1/insights/route-prices`.**

* **Controller (indigo): HTTP handler, validates inputs, shapes response.**

* **Service (blue): Domain logic (route key, timezone, bucketing, averages, cache).**

* **Repository (tan): Data access (raw quotes/trips; RoutePriceStats\_30d read model).**

* **Scheduler (violet): ETL/aggregation over last 30 days (hourly), writes stats.**

**Notational arrows**

* **Solid →: synchronous call or data flow**

* **Dashed `-.->`: dependency/utility (cache, tz, route key)**

* **Labels (e.g., `tz`, `routeKey`, `cache`) clarify the purpose of dashed dependencies.**

---

## **Module Locations Summary (how the user story is fulfilled)**

* **RideQuotationModule**

  * **`Quote Service.recordQuoteForTrendAnalysis` emits quote/trip facts with `route_key` (via RouteKeyNormalizer).**

  * **Source of truth for price samples used in trends.**

* **SharedUtilitiesModule**

  * **RouteKeyNormalizer: canonicalizes origin/destination into `route_key` so UI queries and ETL agree.**

  * **TimezoneResolver: ensures Day-of-Week and Hour buckets respect rider’s local timezone (origin or user setting).**

  * **TrendCache: short-TTL cache for heatmap results, keeping P95 latency low.**

* **FareTrendAnalyticsModule**

  * **Quote History Repository: stores raw quotes/trips (≥30 days).**

  * **Fare Trend Aggregator (Scheduler/ETL): hourly rollups over last 30 days, outlier handling (winsorize), writes to Route Price Stats Repository (RoutePriceStats\_30d) with keys `(route_key, tz, product_type, dow, hour)`.**

  * **Fare Trend Service: on request:**

    1. **normalizes `(origin,dest)` → `route_key`, resolves `tz`;**

    2. **checks TrendCache;**

    3. **fetches pre-aggregated 7×24 buckets from RoutePriceStats\_30d;**

    4. **enforces `minSampleThreshold` (k-anonymity);**

    5. **returns a compact summary to the controller.**

  * **Fare Trend Controller: exposes GET `/v1/insights/route-prices` used by the client.**

* **RiderFareTrendExperienceModule**

  * **Client Service calls the endpoint with O/D, timezone, and `window=30d`.**

  * **Presenter adapts to a 7×24 heatmap (avg per bucket, cheapest/costliest windows, counts).**

  * **View Model includes `timezoneLabel` and `insufficientDataThreshold` for UX clarity.**

# **Class Diagram**  
  ```Mermaid
classDiagram
  direction TB

  %% =======================
  %% Client / Presentation side
  %% =======================
  class RiderFareTrendPageComponent {
    <<frontend component>>
    +initializeView()
    +handleRouteSelection()
    +handleTimeWindowChange()
    +requestTrendData()
    +renderHeatMap()
    +renderInsightsPanel()
  }

  class RiderFareTrendPresenter {
    <<presenter>>
    +fromServiceResponse(summary: FareTrendSummary): FareTrendViewModel
    +identifyCheapest(buckets: FareTrendBucket[]): FareTrendBucket
    +identifyCostliest(buckets: FareTrendBucket[]): FareTrendBucket
  }

  class RiderFareTrendClientService {
    <<client service>>
    +fetchFareTrends(route: RouteSpecification, timezone: string, window: TimeWindowSelection): FareTrendSummary
  }

  class FareTrendViewModel {
    <<view model>>
    +dailyTimeBuckets: FareTrendBucket[]
    +cheapestBucket: FareTrendBucket
    +highestCostBucket: FareTrendBucket
    +averageFareAcrossAllBuckets: number
    +timezoneLabel: string
    +insufficientDataThreshold: number
  }

  %% =======================
  %% Web / Server side
  %% =======================
  class FareTrendController {
    <<controller>>
    +handleGetRouteTrends(req, res): FareTrendSummary
    +parseRouteCoordinates(req): RouteSpecification
  }

  class FareTrendService {
    <<service>>
    +getRouteTrends(route: RouteSpecification, timezone: string, window: TimeWindowSelection): FareTrendSummary
    +computeAverages(records: QuoteHistoryRecord[], timezone: string): FareTrendBucket[]
    +bucketize(records: QuoteHistoryRecord[], timezone: string): Map~string, FareTrendBucket~
    +invalidateCache(routeKey: string, timezone: string): void
  }

  %% New read model repository (30d materialized stats)
  class RoutePriceStatsRepository {
    <<repository (read model)>>
    +fetchStats(routeKey: string, timezone: string): FareTrendBucket[]
    +upsertStats(routeKey: string, timezone: string, buckets: FareTrendBucket[]): void
    +deleteExpired(expirationDate: Date): number
  }

  class QuoteHistoryRepository {
    <<repository (raw facts)>>
    +appendQuoteRecord(record: QuoteHistoryRecord): void
    +fetchQuotesForRoute(routeKey: string, start: Date, end: Date): QuoteHistoryRecord[]
    +purgeOlderThan(cutoff: Date): number
  }

  class FareTrendAggregator {
    <<scheduler / ETL>>
    +start(): void
    +stop(): void
    +runAggregationCycle(): void
    +aggregateRoute(routeKey: string): void
    +upsertDailyBuckets(routeKey: string, timezone: string, buckets: FareTrendBucket[]): void
    -lookbackWindowDays: number
    -aggregationIntervalMinutes: number
    -outlierPolicy: OutlierPolicy
  }

  %% Utilities introduced by the new architecture
  class RouteKeyNormalizer {
    <<utility>>
    +composeRouteKey(pickup: CoordinatePair, destination: CoordinatePair): string
  }

  class TimezoneResolver {
    <<utility>>
    +resolve(pickup: CoordinatePair, destination: CoordinatePair, override?: string): string
  }

  class TrendCache {
    <<cache>>
    +get(key: string): FareTrendSummary
    +set(key: string, value: FareTrendSummary, ttlMinutes: number): void
    +invalidate(prefix: string): void
  }

  class PricingService {
    <<shared service>>
    +estimate(pickup: CoordinatePair, destination: CoordinatePair): PriceEstimate
    +applyDiscount(baseAmount: number, percent: number): DiscountResult
  }

  class LocationService {
    <<shared service>>
    +eta(pickup: CoordinatePair, destination: CoordinatePair): number
  }

  class AuthenticationService {
    <<shared service>>
    +required(): void
    +optional(): void
    +requireRole(): void
    +verify(): JwtPayloadOrNull
  }

  %% =======================
  %% Data layer
  %% =======================
  class PrismaClient {
    <<data platform>>
    +query(sql: string): unknown
    +transaction(): unknown
  }

  class PostgresDatabase {
    <<database>>
    +executeStatement(sql: string): ResultSet
  }

  %% =======================
  %% Domain data classes
  %% =======================
  class RouteSpecification {
    <<data>>
    +pickup: CoordinatePair
    +destination: CoordinatePair
  }

  class TimeWindowSelection {
    <<data>>
    +windowDays: number  // default 30
  }

  class FareTrendSummary {
    <<data>>
    +routeKey: string
    +timezone: string
    +windowDays: number
    +generatedAt: Date
    +insufficientDataThreshold: number
    +buckets: FareTrendBucket[]
  }

  class FareTrendBucket {
    <<data>>
    +dayOfWeek: int    // 0..6
    +hour: int         // 0..23
    +averageFareCents: int
    +rideCount: int
    +p50Cents: int
    +p90Cents: int
  }

  class QuoteHistoryRecord {
    <<data>>
    +quoteId: string
    +routeKey: string
    +amountCents: int
    +currency: string
    +productType: string
    +startTime: Date
  }

  %% =======================
  %% Value types
  %% =======================
  class PriceEstimate {
    <<value>>
    +amount: number
    +surge: number
    +currency: string
  }

  class DiscountResult {
    <<value>>
    +discountedAmount: number
    +savings: number
  }

  class JwtPayloadOrNull {
    <<value>>
    +present: boolean
    +payload?: string
  }

  class OutlierPolicy {
    <<value>>
    +method: string  // e.g., "winsorize"
    +lower: float
    +upper: float
  }

  %% =======================
  %% Associations (usage/aggregation; NOT inheritance)
  %% =======================
  RiderFareTrendPageComponent --> RiderFareTrendClientService : requests
  RiderFareTrendPageComponent --> RiderFareTrendPresenter : uses
  RiderFareTrendPageComponent --> FareTrendViewModel : displays
  RiderFareTrendPresenter --> FareTrendSummary : transforms
  RiderFareTrendPresenter --> FareTrendViewModel : builds
  RiderFareTrendClientService --> TimezoneResolver : resolves tz (client-side optional)
  RiderFareTrendClientService --> FareTrendController : calls API

  FareTrendController --> AuthenticationService : auth
  FareTrendController --> FareTrendService : delegates
  FareTrendController --> RouteSpecification : parses

  FareTrendService --> RoutePriceStatsRepository : reads    %% read model
  FareTrendService --> QuoteHistoryRepository : reads (fallback/recompute)
  FareTrendService --> TrendCache : caches
  FareTrendService --> RouteKeyNormalizer : normalizes
  FareTrendService --> TimezoneResolver : tz bucketing
  FareTrendService --> PricingService : uses
  FareTrendService --> LocationService : uses
  FareTrendService --> FareTrendSummary : returns
  FareTrendService --> TimeWindowSelection : uses
  FareTrendService --> QuoteHistoryRecord : reads

  FareTrendAggregator --> RoutePriceStatsRepository : upserts
  FareTrendAggregator --> QuoteHistoryRepository : reads
  FareTrendAggregator --> QuoteHistoryRecord : aggregates
  FareTrendAggregator --> TimezoneResolver : tz bucketing
  FareTrendAggregator --> RouteKeyNormalizer : route key
  FareTrendAggregator --> OutlierPolicy : uses

  RoutePriceStatsRepository --> PrismaClient : uses
  QuoteHistoryRepository --> PrismaClient : uses
  PrismaClient --> PostgresDatabase : connects

  FareTrendSummary --> FareTrendBucket : aggregates

  RiderFareTrendClientService --> TimeWindowSelection : uses
```
     
     
4. **List of Classes**

   ## **1\) Rider Fare Trend Experience Module (Frontend)**

* **SA3.1.1 — RiderFareTrendPageComponent**  
   **Purpose:** Page-level UI container that orchestrates route selection, window selection (30d), and rendering of the 7×24 heatmap and insights.  
   **Implements:** FTI-30D-HEATMAP; OP-GET-ROUTE-TRENDS (client side invocation).

* **SA3.1.2 — RiderFareTrendPresenter**  
   **Purpose:** Adapts service summary into a view-friendly 7×24 model; computes cheapest/costliest buckets client-side for display.  
   **Implements:** FTI-30D-HEATMAP.

* **SA3.1.3 — RiderFareTrendClientService**  
   **Purpose:** Calls backend endpoint with route \+ **timezone** \+ **30-day window**; handles auth and error mapping.  
   **Implements:** FTI-30D-HEATMAP; OP-GET-ROUTE-TRENDS.

* **SA3.1.4 — FareTrendViewModel**  
   **Purpose:** View data for the heatmap (7×24 buckets), including timezone label and k-anonymity threshold for UX.  
   **Implements:** FTI-30D-HEATMAP; OP-PRIVACY-KANON.

  ---

  ## **2\) Fare Trend Analytics Module (Backend Web/API)**

* **SA3.2.1 — FareTrendController**  
   **Purpose:** HTTP boundary; validates inputs; parses route; forwards to service; returns `FareTrendSummary`.  
   **Implements:** OP-GET-ROUTE-TRENDS.

* **SA3.2.2 — FareTrendService**  
   **Purpose:** Core domain orchestration for trend reads: normalizes route, resolves timezone, uses cache, fetches pre-aggregated stats, enforces k-anonymity.  
   **Implements:** FTI-30D-HEATMAP; OP-GET-ROUTE-TRENDS; OP-CACHE-TRENDS; OP-NORMALIZE-ROUTE; OP-RESOLVE-TZ; OP-PRIVACY-KANON.

  ---

  ## **3\) Repositories (Data Access)**

* **SA3.3.1 — RoutePriceStatsRepository**  
   **Purpose:** Read-optimized, **30-day materialized** stats per `(routeKey, tz, dow, hour)`; primary read path for the API.  
   **Implements:** FTI-30D-HEATMAP; OP-GET-ROUTE-TRENDS; OP-AGG-ROLLUP-30D.

* **SA3.3.2 — QuoteHistoryRepository**  
   **Purpose:** Raw quote/trip facts store (append-only), queried by ETL and optionally for recompute.  
   **Implements:** OP-RECORD-QUOTE; OP-AGG-ROLLUP-30D.

* **SA3.3.3 — PrismaClient**  
   **Purpose:** Data platform adapter used by repositories for DB access.  
   **Implements:** (infrastructure support).

* **SA3.3.4 — PostgresDatabase**  
   **Purpose:** Physical database abstraction for executing SQL.  
   **Implements:** (infrastructure support).

  ---

  ## **4\) Scheduler / ETL**

* **SA3.4.1 — FareTrendAggregator**  
   **Purpose:** Periodic ETL that reads last 30–35 days of raw facts, resolves timezone, buckets by DOW×hour, applies outlier policy, and upserts to the read model.  
   **Implements:** FTI-30D-HEATMAP; OP-AGG-ROLLUP-30D; OP-NORMALIZE-ROUTE; OP-RESOLVE-TZ.

  ---

  ## **5\) Shared Utilities**

* **SA3.5.1 — RouteKeyNormalizer**  
   **Purpose:** Canonicalize `(pickup,destination)` to a stable `routeKey` (e.g., H3 bins \+ radius), used consistently by write and read paths.  
   **Implements:** OP-NORMALIZE-ROUTE.

* **SA3.5.2 — TimezoneResolver**  
   **Purpose:** Determine the timezone used for bucketing (origin/user preference), ensuring correct DOW/hour computation.  
   **Implements:** OP-RESOLVE-TZ.

* **SA3.5.3 — TrendCache**  
   **Purpose:** Short-TTL cache for `FareTrendSummary`, keyed by `(routeKey|tz|windowDays)` to reduce read latency.  
   **Implements:** OP-CACHE-TRENDS.

  ---

  ## **6\) Ride Quotation Module**

* **SA3.6.1 — PricingService**  
   **Purpose:** Compute live/estimated fare amounts and apply discounts; orthogonal to analytics but used upstream of fact capture.  
   **Implements:** (pricing features; supportive to OP-RECORD-QUOTE).

* **SA3.6.2 — LocationService**  
   **Purpose:** Travel/ETA estimates; supportive context for pricing (not directly used in aggregation math).  
   **Implements:** (support feature).

* **SA3.6.3 — AuthenticationService**  
   **Purpose:** Security boundary (JWT verification, role checks) for API routes.  
   **Implements:** OP-GET-ROUTE-TRENDS (security).

  ---

  ## **7\) Data Storage Classes (Structs)**

These are **data/DTO/value** objects only (no behavior beyond trivial helpers).

* **SA3.7.1 — RouteSpecification**  
   **Purpose:** Input DTO carrying pickup/destination for trend or pricing requests.  
   **Implements:** OP-GET-ROUTE-TRENDS (request parsing).

* **SA3.7.2 — TimeWindowSelection**  
   **Purpose:** Encodes the day-window for analysis (**default=30**).  
   **Implements:** OP-GET-ROUTE-TRENDS; OP-AGG-ROLLUP-30D.

* **SA3.7.3 — FareTrendSummary**  
   **Purpose:** Response DTO for the 7×24 heatmap including `routeKey`, `timezone`, `windowDays`, `generatedAt`, `buckets`, and k-anon threshold.  
   **Implements:** FTI-30D-HEATMAP; OP-GET-ROUTE-TRENDS; OP-PRIVACY-KANON.

* **SA3.7.4 — FareTrendBucket**  
   **Purpose:** A single (DOW, hour) cell with `averageFareCents`, `rideCount`, and optional distribution stats (`p50`, `p90`).  
   **Implements:** FTI-30D-HEATMAP.

* **SA3.7.5 — QuoteHistoryRecord**  
   **Purpose:** Raw fact of a produced/accepted quote or completed trip: `routeKey`, `amountCents`, `currency`, `productType`, `startTime`.  
   **Implements:** OP-RECORD-QUOTE; OP-AGG-ROLLUP-30D.

* **SA3.7.6 — PriceEstimate**  
   **Purpose:** Value object for live pricing results.  
   **Implements:** (pricing feature support).

* **SA3.7.7 — DiscountResult**  
   **Purpose:** Value object for discount application outcome.  
   **Implements:** (pricing feature support).

* **SA3.7.8 — JwtPayloadOrNull**  
   **Purpose:** Auth result container for controller gating.  
   **Implements:** OP-GET-ROUTE-TRENDS (security).

* **SA3.7.9 — OutlierPolicy**  
   **Purpose:** Config struct specifying outlier handling (e.g., winsorize lower/upper).  
   **Implements:** OP-AGG-ROLLUP-30D.

### **Legend for tags**

* **Feature tags**

  * **FTI-30D-HEATMAP** — Rider sees avg price by Day-of-Week × Hour for last 30 days.

* **Operation tags**

  * **OP-GET-ROUTE-TRENDS** — Public API to fetch 7×24 buckets.

  * **OP-AGG-ROLLUP-30D** — ETL aggregation over last 30 days, hourly.

  * **OP-RECORD-QUOTE** — Persist quotes/trips as raw facts for analytics.

  * **OP-CACHE-TRENDS** — Read-path caching of route-trend summaries.

  * **OP-NORMALIZE-ROUTE** — Canonicalize origin/destination into route key.

  * **OP-RESOLVE-TZ** — Determine timezone used for bucketization.

  * **OP-PRIVACY-KANON** — K-anonymity thresholding on buckets.

**5\. State diagram**

# **System State (Data Fields)**

These fields together constitute “the system state” across the read path (rider-facing query) and the ETL path (30-day rollup). They’re grouped by scope.

## **A. Request/Session (volatile, per call)**

* `pickup: CoordinatePair`

* `destination: CoordinatePair`

* `timezone: string` (explicit from client or resolved at server)

* `windowDays: number` (default 30\)

* `authToken: string | null`

* `jwt: JwtPayloadOrNull`

## **B. Derived (per call / per job)**

* `routeKey: string`

* `now: DateTime`

* `lookbackStart: DateTime = now - windowDays`

* `bucketConfig = { dow: 7, hour: 24 }`

## **C. Persistent Stores**

* **QuoteHistory** (raw facts)

  * `quoteId: string`

  * `routeKey: string`

  * `amountCents: int`

  * `currency: string`

  * `productType: string`

  * `startTime: DateTime`

* **RoutePriceStats\_30d** (read model)

  * `routeKey: string`

  * `tz: string`

  * `productType: string`

  * `dow: 0..6`

  * `hour: 0..23`

  * `avgPriceCents: int`

  * `p50Cents: int`

  * `p90Cents: int`

  * `sampleCount: int`

  * `lastUpdatedAt: DateTime`

## **D. Cache / Config / Control**

* **TrendCache**

  * `key = hash(routeKey|tz|windowDays|productType)`

  * `value = FareTrendSummary`

  * `ttlMinutes: number`

* **OutlierPolicy**: `{ method: "winsorize", lower: float, upper: float }`

* **minSampleThreshold: number\`** (k-anonymity)

* **Scheduler state**

  * `lookbackWindowDays: number`

  * `aggregationIntervalMinutes: number`

  * `nextRunAt: DateTime`

  * `lastRunAt: DateTime | null`

## **E. Response (computed)**

* **FareTrendSummary**

  * `routeKey: string`

  * `timezone: string`

  * `windowDays: number`

  * `generatedAt: DateTime`

  * `insufficientDataThreshold: number`

  * `buckets: FareTrendBucket[]`

* **FareTrendBucket**

  * `dayOfWeek: 0..6`

  * `hour: 0..23`

  * `averageFareCents: int`

  * `rideCount: int`

  * `p50Cents: int`

  * `p90Cents: int`

---

# **Scenario A — Rider Query (Read Path)**

**Initial state:** `RQ0_UI_Idle`  
 **Goal:** return a 7×24 heatmap (last 30 days, tz-aware), using cache or read model.

### **States (unique names \+ actual system state)**

* **RQ0\_UI\_Idle** *(initial)*  
   UI loaded; `pickup,destination` unset; no network call yet.

* **RQ1\_UI\_RouteSelected**  
   UI holds `pickup,destination,timezone,windowDays`; `routeKey` not resolved yet.

* **RQ2\_API\_RequestDispatched**  
   HTTP request sent; server receives with `authToken`; awaiting controller.

* **RQ3\_API\_Authenticated**  
   `jwt.present = true`; request admitted to service.

* **RQ4\_SVC\_CacheCheck**  
   Cache probed with `key = (routeKey? unknown yet, tz, windowDays)`; service about to normalize/resolve.

* **RQ5\_SVC\_CacheHit**  
   `TrendCache.value != null` for derived `routeKey`; `summary` available.

* **RQ6\_SVC\_CacheMiss**  
   No cache entry; proceed to read model.

* **RQ7\_SVC\_StatsLoaded**  
   `statsRows > 0` from `RoutePriceStats_30d` for `(routeKey,tz)`.

* **RQ8\_SVC\_KAnonApplied**  
   All buckets tagged/filtered by `minSampleThreshold`; `summary` finalized.

* **RQ9\_UI\_Rendered**  
   Presenter has built `ViewModel`; heatmap displayed.

* **RQE\_Error**  
   Any failure (auth invalid, DB error, bad input).

### **Decision predicates used**

* **P1:** `jwt.present?`

* **P2:** `TrendCache.get(key) != null ?`

* **P3:** `statsRows > 0 ?`

* **P4:** `∀b ∈ buckets: b.rideCount >= minSampleThreshold ?` (else flag/omit low-n cells)

![][image3]

**Actual state annotations inside transitions**

* After `RouteKeyNormalizer.composeRouteKey`, `routeKey` is known.

* After `RoutePriceStatsRepository.fetchStats`, `statsRows` are loaded.

* After `TrendCache.set`, cache contains latest `summary`.

# **Scenario B — ETL Aggregation (30-Day Rollup)**

**Initial state:** `ETL0_Idle`  
 **Goal:** refresh `RoutePriceStats_30d` from `QuoteHistory`, apply outlier policy, and invalidate cache.

### **States (unique names \+ actual system state)**

* **ETL0\_Idle** *(initial)*  
   Scheduler waiting; `nextRunAt` in future.

* **ETL1\_TickScheduled**  
   Time reached; cycle starts with `now`, `lookbackStart = now − lookbackWindowDays`.

* **ETL2\_LoadQuotes**  
   For each `routeKey`, raw facts loaded for `[lookbackStart, now]`; `records.length >= 0`.

* **ETL3\_Aggregated**  
   Records bucketed (DOW×Hour) with `TimezoneResolver`; outliers handled via `OutlierPolicy`.

* **ETL4\_StatsUpserted**  
   Upserted into `RoutePriceStats_30d`; `lastUpdatedAt = now`.

* **ETL5\_CacheInvalidated**  
   `TrendCache.invalidate(prefix = routeKey|tz|windowDays)` executed.

* **ETL6\_Completed**  
   Cycle finished; `lastRunAt = now`.

* **ETLE\_Error**  
   Any failure (DB read/write, compute).

### **Decision predicates**

* **Q1:** `records.length > 0 ?`

* **Q2:** `upsert succeeded ?`

![][image4]

**Actual state annotations inside transitions**

* After `fetchQuotesForRoute`, `records` are materialized for the 30-day window.

* After `aggregateRoute`, computed buckets (avg/p50/p90/count) exist in memory.

* After `upsertStats`, read model reflects latest buckets.

* After `TrendCache.invalidate`, user-visible reads will bypass stale entries.

---

# **Legend (for both diagrams)**

* **Stereotypes (angled brackets)**

  * `<<UI>>` — frontend page/presenter states

  * `<<API>>` — controller/auth boundary

  * `<<Service>>` / `<<Service/ETL>>` — domain/service logic

  * `<<Repo(Raw)>>` — QuoteHistory (raw facts) access

  * `<<Repo(ReadModel)>>` — RoutePriceStats\_30d read-model access

  * `<<Cache>>` — TrendCache operations

  * `<<Scheduler>>` — periodic ETL driver

  * `<<Error>>` — terminal error state

  * `<<choice>>` — decision nodes evaluated by labeled predicates

* **Initial node:** `[ * ]`

* **Edges:** labeled with **fully scoped methods** (`Module.Component.Class.method`) used to transition.

* **Decision labels (below states):**

  * **P1, P2, P3, P4** — read-path predicates

  * **Q1, Q2** — ETL-path predicates  
     Each outgoing edge is labeled with the predicate outcome (`true/false`) that leads to the destination.

  **6\. Flow Chart**

# **🧭 Flow Chart Overview**

The flow charts capture the **end-to-end behavioral logic** of the system, illustrating how user and system actions transition through functional states defined in the earlier **State Diagram** section.

Each flow chart depicts one complete scenario:

1. **Scenario A (FC3.1)** — *Rider Fare Trend Query*  
    The rider requests average route fares by time/day for the past 30 days.

2. **Scenario B (FC3.2)** — *Fare Trend ETL Aggregation (30-Day Rollup)*  
    The backend scheduler aggregates quotes/trips into daily/hourly buckets.

These flow charts collectively represent the union of the system’s possible state transitions.

---

## **⚙️ Scenario A: Rider Fare Trend Query (Label: FC3.1)**

### **Scenario Description**

**User Story:**  
 *As a rider planning my regular trips, I want to see the average price for my route broken down by day of week and time of day for the past month so that I can identify when rides are typically cheaper and plan flexible trips accordingly.*

This scenario starts when the rider opens the “Fare Trend” page and selects a route.  
 The flow continues through client → backend → service → data → response → rendering.  
 It ends when the UI displays a heatmap of prices bucketed by day/time for the last 30 days.

---

### **🌐 Flow Chart — Rider Fare Trend Query**

![][image5]

### **Flow Explanation**

1. The rider opens the page and selects a route → `RiderFareTrendPageComponent.handleRouteSelection`.

2. The client service (`fetchFareTrends()`) sends the query to the backend controller.

3. `FareTrendController` authenticates via `AuthenticationService.verify()`.

4. `FareTrendService` checks the cache; if a cached result exists, it’s returned immediately.

5. If not cached, the service queries the **RoutePriceStatsRepository** for 30-day aggregated stats.

6. If data exists, it applies **k-anonymity** (filters low-sample buckets) and caches the summary.

7. The Presenter builds a **FareTrendViewModel** and the UI renders a 7×24 heatmap.

8. Errors at any point (invalid auth, missing stats) return error states in the UI.

---

### **📡 Sequence Diagram — Rider Fare Trend Query**

![][image6]

### **Explanation**

This sequence shows the end-to-end interaction between frontend and backend components.

* Cache hit path yields fast response (single network roundtrip).

* Cache miss triggers read-model access, local computation, and cache refresh.

* Presenter and ViewModel finalize the UI output.

---

## **🧮 Scenario B: Fare Trend ETL Aggregation (Label: FC3.2)**

### **Scenario Description**

**System Story:**  
 *As a backend scheduler, I aggregate all fare quotes from the last 30 days, group them by day of week and hour, apply outlier and k-anonymity filters, and update the RoutePriceStats repository so that riders can quickly retrieve historical averages.*

The scenario begins when the scheduler triggers its aggregation cycle and ends when it writes updated aggregates and invalidates outdated cache entries.

---

### **⚙️ Flow Chart — Fare Trend ETL Aggregation**

![][image7]

### **Flow Explanation**

1. Scheduler triggers the **FareTrendAggregator.runAggregationCycle()**.

2. Fetch all quote history records for each route within the last 30 days.

3. If records exist, normalize route keys and compute (DOW×hour) bucket aggregates using **TimezoneResolver**.

4. Upsert results into **RoutePriceStats\_30d**; if successful, invalidate related cache keys.

5. If upsert fails or no data is available, the process logs an error and exits.

---

### **🔁 Sequence Diagram — Fare Trend ETL Aggregation**

![][image8]

# **🗂️ Flow Chart Legend**

| Symbol | Meaning |
| ----- | ----- |
| **Rounded Rectangle** | Start / End (terminator) |
| **Rectangle** | Process or method execution |
| **Diamond** | Decision (predicate evaluation) |
| **Parallelogram** | Data access or repository operation |

**7\. Threat and Failures**

# **⚠️ Possible Threats and Failures**

This section enumerates all identifiable failure modes within the **Rider Fare Trend Experience Module** and **Fare Trend Analytics Backend**, including their causes, impacts, detection/diagnostic methods, and recovery procedures.

Each failure mode has:

* A **unique label (FMx.y)** for cross-referencing.

* A **description** of the failure condition.

* A **recovery procedure** to restore the system to a sane configuration.

* A **diagnostic procedure reference** (for test specification linkage).

* **Likelihood** and **Impact** ratings (High / Medium / Low) based on operational and business risk.

  ---

  ## **🧩 Legend**

| Field | Meaning |
| ----- | ----- |
| **Likelihood** | Estimated frequency of occurrence under normal operation. |
| **Impact** | Potential severity if the failure occurs (on user experience or business). |
| **Recovery Procedure** | The manual or automated process to restore system sanity. |
| **Diagnostics Ref.** | Cross-reference for detection and validation procedures in the test specification. |

  ---

  ## **1️⃣ Rider-Side Failures (Frontend / API Layer)**

  ### **FM1.1 — Authentication Failure**

**Description:**  
 User’s token expired or invalid when calling `/v1/insights/route-prices`. Request rejected by `AuthenticationService.verify()`.  
 **Impact:** Medium — user cannot see fare trends until re-authenticated.  
 **Likelihood:** Medium.  
 **Recovery Procedure:**

1. Force client re-login via `AuthenticationService.optional()` reissue flow.

2. Clear cached invalid token in `RiderFareTrendClientService`.

3. Retry the API request after new token retrieval.  
    **Diagnostics Ref.:** D-FM1.1 (verify `401 Unauthorized` logged by controller).

   ---

   ### **FM1.2 — Cache Desynchronization**

**Description:**  
 `TrendCache` holds stale or partially invalidated entries after ETL completes. Returned fare data is outdated.  
 **Impact:** High — incorrect trend data may mislead users.  
 **Likelihood:** Medium.  
 **Recovery Procedure:**

1. Force `TrendCache.invalidate(prefix=routeKey|tz|window)` after every successful `RoutePriceStatsRepository.upsertStats()`.

2. Add automated scheduled full cache flush every 6 hours.

3. Rehydrate cache from `RoutePriceStats_30d` on next read.  
    **Diagnostics Ref.:** D-FM1.2 (compare cache timestamp vs. DB `lastUpdatedAt` difference \> 6 hours).

   ---

   ### **FM1.3 — API Latency Spike / Timeout**

**Description:**  
 Excessive response latency (\>400ms) in `FareTrendService.getRouteTrends()` due to slow database or cache miss.  
 **Impact:** Medium — degraded UX, user perceives slowness.  
 **Likelihood:** Medium-High under peak load.  
 **Recovery Procedure:**

1. Introduce timeout guard in `RiderFareTrendClientService` with retry (max 2).

2. Optimize `RoutePriceStats_30d` indexes (`(routeKey,tz)`).

3. Enable async pre-warm caching on frequent routes.  
    **Diagnostics Ref.:** D-FM1.3 (alert if 95th percentile latency \> 400ms).

   ---

   ### **FM1.4 — Missing Route Stats**

**Description:**  
 `RoutePriceStatsRepository.fetchStats()` returns no rows for a valid route due to incomplete ETL coverage.  
 **Impact:** High — user sees blank heatmap.  
 **Likelihood:** Low-Medium.  
 **Recovery Procedure:**

1. Trigger incremental backfill via `FareTrendAggregator.aggregateRoute()` for that route.

2. Mark missing routes in ETL monitoring dashboard.

3. Retry API after successful aggregation.  
    **Diagnostics Ref.:** D-FM1.4 (monitor `statsRows == 0` metric).

   ---

   ### **FM1.5 — Timezone Mismatch / Incorrect Bucket Alignment**

**Description:**  
 `TimezoneResolver` misidentifies user’s timezone or uses wrong origin point, causing incorrect day/hour grouping.  
 **Impact:** Medium — heatmap visually inconsistent with user’s expectation.  
 **Likelihood:** Low.  
 **Recovery Procedure:**

1. Log all resolved timezones; manually verify anomalies.

2. Provide user-side override in query (`tz` param).

3. Correct resolver mapping (TZDB) and redeploy.  
    **Diagnostics Ref.:** D-FM1.5 (detect mismatched DOW distribution between user local vs. server computed).

   ---

   ### **FM1.6 — Frontend Data Rendering Failure**

**Description:**  
 `RiderFareTrendPresenter.fromServiceResponse()` or UI heatmap component fails due to malformed JSON (e.g., null bucket array).  
 **Impact:** Medium — UI broken for affected users.  
 **Likelihood:** Low.  
 **Recovery Procedure:**

1. Add JSON schema validation before rendering.

2. Display fallback message (“Data temporarily unavailable”).

3. Fix serialization in `FareTrendSummary`.  
    **Diagnostics Ref.:** D-FM1.6 (frontend error logs contain `TypeError: undefined buckets`).

   ---

---

   ## **2️⃣ Backend / Data Pipeline Failures**

   ### **FM2.1 — ETL Job Crash or Timeout**

**Description:**  
 `FareTrendAggregator.runAggregationCycle()` fails mid-run due to DB connectivity loss or memory exhaustion.  
 **Impact:** High — data freshness degraded; cache not invalidated.  
 **Likelihood:** Medium.  
 **Recovery Procedure:**

1. Detect failure via job heartbeat (scheduler monitor).

2. Retry aggregation job automatically after 10 minutes.

3. Resume from last successful `routeKey`.  
    **Diagnostics Ref.:** D-FM2.1 (job heartbeat alert if `lastRunAt` older than 2× interval).

   ---

   ### **FM2.2 — Outlier Policy Misconfiguration**

**Description:**  
 `OutlierPolicy` thresholds (e.g., Winsorize bounds) set incorrectly, resulting in distorted averages.  
 **Impact:** Medium-High — business metric corruption.  
 **Likelihood:** Low.  
 **Recovery Procedure:**

1. Roll back config to default bounds `{lower:0.01, upper:0.99}`.

2. Re-run ETL with corrected config.

3. Verify aggregated medians vs. raw sample medians.  
    **Diagnostics Ref.:** D-FM2.2 (cross-check aggregate mean vs. p50 variance threshold).

   ---

   ### **FM2.3 — Database Constraint Violation**

**Description:**  
 Primary key collision or schema mismatch during `RoutePriceStatsRepository.upsertStats()`.  
 **Impact:** High — ETL fails; stats unavailable.  
 **Likelihood:** Low.  
 **Recovery Procedure:**

1. Rollback transaction automatically.

2. Apply schema migration script.

3. Retry upsert.  
    **Diagnostics Ref.:** D-FM2.3 (log “unique constraint violation” errors in DB monitor).

   ---

   ### **FM2.4 — Data Skew or Overload**

**Description:**  
 Excessive quote volume for popular routes overwhelms `aggregateRoute()` memory capacity.  
 **Impact:** High — ETL stalls; partial updates.  
 **Likelihood:** Medium.  
 **Recovery Procedure:**

1. Partition ETL by route prefix (e.g., H3 region).

2. Apply streaming aggregation (batch window \= 5k rows).

3. Resume ETL cycle.  
    **Diagnostics Ref.:** D-FM2.4 (detect job duration \> 2× aggregationInterval).

   ---

   ### **FM2.5 — Cache Layer Outage**

**Description:**  
 Redis or CDN (TrendCache) unavailable; fallback to direct DB queries.  
 **Impact:** Medium — increased latency, higher DB load.  
 **Likelihood:** Medium-High.  
 **Recovery Procedure:**

1. Temporarily disable cache writes until service restored.

2. Scale DB read replicas to absorb load.

3. Reinstate cache and flush stale entries after recovery.  
    **Diagnostics Ref.:** D-FM2.5 (healthcheck: cache ping fails for \>5s).

   ---

   ### **FM2.6 — Quote History Loss or Corruption**

**Description:**  
 `QuoteHistoryRepository` entries truncated or corrupted due to failed write transactions.  
 **Impact:** High — historical data incomplete; analytics unreliable.  
 **Likelihood:** Low.  
 **Recovery Procedure:**

1. Restore `QuoteHistory` table from last daily backup.

2. Validate restored records using checksum and row counts.

3. Re-run ETL for affected window.  
    **Diagnostics Ref.:** D-FM2.6 (detect row count drop \>5% day-to-day).

   ---

---

   ## **3️⃣ Security & Privacy Threats**

   ### **FM3.1 — Unauthorized Data Access**

**Description:**  
 Missing or incorrect JWT verification allowing unauthorized users to access aggregated stats.  
 **Impact:** High (data leakage).  
 **Likelihood:** Low.  
 **Recovery Procedure:**

1. Revoke compromised tokens via Auth service.

2. Patch endpoint to enforce `AuthenticationService.required()`.

3. Audit access logs for abuse.  
    **Diagnostics Ref.:** D-FM3.1 (security audit detects unauthenticated requests served).

   ---

   ### **FM3.2 — Inference Risk from Small Samples**

**Description:**  
 Returned trend buckets with `rideCount < minSampleThreshold` expose potential individual behavior.  
 **Impact:** High — privacy violation.  
 **Likelihood:** Low.  
 **Recovery Procedure:**

1. Enforce strict K-anonymity filter (`n >= 5`).

2. Sanitize low-sample buckets (replace with “insufficient data”).

3. Re-publish sanitized summaries.  
    **Diagnostics Ref.:** D-FM3.2 (automated privacy checker flags low-count buckets).

   ---

   ### **FM3.3 — Injection / Input Validation Flaw**

**Description:**  
 Unescaped user inputs (coords, tz) lead to potential SQL injection or log poisoning.  
 **Impact:** High — security breach.  
 **Likelihood:** Medium-Low.  
 **Recovery Procedure:**

1. Enforce ORM parameterization (`PrismaClient.query()` sanitized).

2. Run code scan before release.

3. Patch vulnerable input fields.  
    **Diagnostics Ref.:** D-FM3.3 (static code analysis identifies unsafe query string interpolation).

   ---

---

   # **📊 Failure Likelihood and Impact Matrix**

| Label | Failure Name | Likelihood | Impact | Overall Risk Level |
| ----- | ----- | ----- | ----- | ----- |
| FM1.1 | Authentication Failure | Medium | Medium | **Moderate** |
| FM1.2 | Cache Desynchronization | Medium | High | **High** |
| FM1.3 | API Latency Spike | Medium-High | Medium | **High** |
| FM1.4 | Missing Route Stats | Low-Medium | High | **High** |
| FM1.5 | Timezone Mismatch | Low | Medium | **Low** |
| FM1.6 | UI Rendering Failure | Low | Medium | **Low** |
| FM2.1 | ETL Job Crash | Medium | High | **High** |
| FM2.2 | Outlier Policy Misconfig | Low | Medium-High | **Medium** |
| FM2.3 | DB Constraint Violation | Low | High | **Medium** |
| FM2.4 | Data Skew / Overload | Medium | High | **High** |
| FM2.5 | Cache Layer Outage | Medium-High | Medium | **High** |
| FM2.6 | Quote History Corruption | Low | High | **High** |
| FM3.1 | Unauthorized Data Access | Low | High | **High** |
| FM3.2 | Inference Risk (Privacy) | Low | High | **High** |
| FM3.3 | Injection / Validation Flaw | Medium-Low | High | **High** |

**8\. Technologies**

# 

**This system integrates a range of established open-source and commercial technologies to support frontend visualization, backend analytics, data persistence, scheduling, and infrastructure.**  
 **All listed technologies are *not written in-house* but are foundational to the system’s design, operation, and reliability.**

---

## **🧭 Legend**

| Field | Meaning |
| ----- | ----- |
| **Label** | **Unique identifier (T3.x) for traceability in architecture diagrams and specs.** |
| **Purpose / Use Case** | **Describes how the technology is used in this system.** |
| **Justification** | **Explains why the chosen technology was preferred over alternatives.** |
| **Version** | **Required or recommended version used in builds.** |
| **Source / Docs** | **Official homepage or documentation link (with author/organization).** |

---

## **1️⃣ Languages & Core Runtime**

| Label | Technology | Purpose / Use Case | Justification | Version | Source / Author / Docs |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **T3.1** | **TypeScript (Node.js)** | **Primary backend and frontend language. Implements services, repositories, and modules.** | **Static typing, modern async model, safer than vanilla JS, strong ecosystem.** | **Node.js v20.x, TypeScript 5.4.x** | **[https://www.typescriptlang.org/](https://www.typescriptlang.org/) — Microsoft** |
| **T3.2** | **React.js** | **Frontend rendering of rider heatmap and insights panel.** | **Declarative UI model, component reusability, compatible with TypeScript.** | **18.3.x** | **[https://react.dev/](https://react.dev/) — Meta** |
| **T3.3** | **Node.js Runtime** | **Executes backend API and scheduler services.** | **Event-driven non-blocking I/O ideal for concurrent service calls.** | **20.x LTS** | **[https://nodejs.org/](https://nodejs.org/) — OpenJS Foundation** |
| **T3.4** | **Go (Golang)** | **Used for background ETL / scheduler prototype.** | **Simple concurrency primitives, efficient for batch/parallel aggregation.** | **1.22.x** | **[https://go.dev/](https://go.dev/) — Google** |

---

## **2️⃣ Frameworks & Server Libraries**

| Label | Technology | Purpose / Use Case | Justification | Version | Source / Author / Docs |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **T3.5** | **Express.js** | **HTTP server for `FareTrendController` endpoints.** | **Lightweight, fast, broad community, integrates easily with middleware.** | **4.19.x** | **[https://expressjs.com/](https://expressjs.com/) — OpenJS Foundation** |
| **T3.6** | **Prisma ORM** | **Object-relational mapping for `PostgresDatabase` access.** | **Type-safe schema, automatic migrations, easy integration with TS.** | **5.10.x** | **[https://www.prisma.io/](https://www.prisma.io/) — Prisma Labs** |
| **T3.7** | **Jest** | **Unit & integration testing framework for backend.** | **Zero-config TS support, mocks, and coverage reporting.** | **29.x** | **[https://jestjs.io/](https://jestjs.io/) — Meta** |
| **T3.8** | **BullMQ (Redis-based)** | **Job queue for scheduling aggregation tasks.** | **Built on Redis Streams, easy retry/backoff logic.** | **4.x** | **[https://docs.bullmq.io/](https://docs.bullmq.io/) — Taskforce.sh** |
| **T3.9** | **Swagger / OpenAPI** | **API documentation and schema validation.** | **Generates API docs and clients automatically from schema.** | **3.1 spec** | **[https://swagger.io/specification/](https://swagger.io/specification/) — SmartBear Software** |

---

## **3️⃣ Data & Storage Technologies**

| Label | Technology | Purpose / Use Case | Justification | Version | Source / Author / Docs |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **T3.10** | **PostgreSQL** | **Primary transactional & analytical data store for `QuoteHistoryRepository` and `RoutePriceStats_30d`.** | **Reliable, ACID-compliant, supports window functions for percentile aggregation.** | **15.x** | **[https://www.postgresql.org/](https://www.postgresql.org/) — PostgreSQL Global Development Group** |
| **T3.11** | **Redis** | **In-memory cache for `TrendCache` and job coordination.** | **Sub-millisecond reads/writes, pub-sub and TTL features ideal for caching.** | **7.2.x** | **[https://redis.io/](https://redis.io/) — Redis Labs** |
| **T3.12** | **TimescaleDB** | **Optional extension for time-series storage of historical fares.** | **Built on PostgreSQL; optimized for time-based rollups.** | **2.14.x** | **[https://www.timescale.com/](https://www.timescale.com/) — Timescale, Inc.** |
| **T3.13** | **pg-Cron** | **Lightweight in-DB scheduler for periodic cleanup (purge old quotes).** | **Simple and reliable for recurring maintenance jobs.** | **1.5.x** | **[https://github.com/citusdata/pg\_cron](https://github.com/citusdata/pg_cron) — Citus / Microsoft** |

---

## **4️⃣ Frontend Visualization & Libraries**

| Label | Technology | Purpose / Use Case | Justification | Version | Source / Author / Docs |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **T3.14** | **Chart.js** | **Renders the fare heatmap visualization in the UI.** | **Easy integration with React, smooth animations, good time-series support.** | **4.4.x** | **[https://www.chartjs.org/](https://www.chartjs.org/) — Chart.js Team** |
| **T3.15** | **Axios** | **HTTP client used by `RiderFareTrendClientService`.** | **Simpler syntax and better interceptors than Fetch API.** | **1.7.x** | **[https://axios-http.com/](https://axios-http.com/) — Axios Maintainers** |
| **T3.16** | **Tailwind CSS** | **Utility-first CSS framework for Rider UI styling.** | **Enforces consistent design, minimal custom CSS, responsive layout.** | **3.4.x** | **[https://tailwindcss.com/](https://tailwindcss.com/) — Tailwind Labs** |

---

## **5️⃣ Security, Monitoring, and DevOps**

| Label | Technology | Purpose / Use Case | Justification | Version | Source / Author / Docs |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **T3.17** | **JSON Web Tokens (JWT)** | **Authentication/authorization for Rider API.** | **Compact token format, widely supported.** | **RFC 7519** | **[https://datatracker.ietf.org/doc/html/rfc7519](https://datatracker.ietf.org/doc/html/rfc7519) — IETF** |
| **T3.18** | **Docker** | **Containerization of backend services and scheduler.** | **Guarantees environment consistency across deployments.** | **25.x CE** | **[https://www.docker.com/](https://www.docker.com/) — Docker Inc.** |
| **T3.19** | **Prometheus \+ Grafana** | **Metrics collection and visualization (API latency, ETL duration).** | **Open-source, rich alerting rules, works with Node Exporter.** | **Prometheus 2.52.x, Grafana 11.x** | **[https://prometheus.io/](https://prometheus.io/), [https://grafana.com/](https://grafana.com/)** |
| **T3.20** | **Sentry** | **Error and exception tracking (frontend \+ backend).** | **Automatic stack traces, integrates with Node.js and React.** | **7.x SDK** | **[https://sentry.io/](https://sentry.io/) — Functional Software Inc.** |
| **T3.21** | **Git \+ GitHub Actions** | **Version control and CI/CD automation.** | **Popular, stable, easily integrated with tests and Docker builds.** | **Git 2.45.x, Actions Workflow v4** | **[https://github.com/features/actions](https://github.com/features/actions) — GitHub** |

---

## **6️⃣ Data Science & Statistical Tooling (for Aggregation)**

| Label | Technology | Purpose / Use Case | Justification | Version | Source / Author / Docs |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **T3.22** | **NumPy / Pandas (Python)** | **Used for validation of fare aggregates during testing.** | **Efficient statistical analysis and CSV validation.** | **NumPy 1.26.x, Pandas 2.2.x** | **[https://numpy.org/](https://numpy.org/), [https://pandas.pydata.org/](https://pandas.pydata.org/)** |
| **T3.23** | **Matplotlib** | **Diagnostic visualization for ETL validation.** | **Quick generation of histograms / percentile plots.** | **3.9.x** | **[https://matplotlib.org/](https://matplotlib.org/) — Matplotlib Dev Team** |

---

# **🧠 Summary of Key Technology Justifications**

| Category | Primary Technology | Justification |
| ----- | ----- | ----- |
| **Backend Runtime** | **Node.js \+ TypeScript** | **Non-blocking concurrency model ideal for lightweight analytics and fast APIs.** |
| **Data Storage** | **PostgreSQL \+ TimescaleDB** | **Mature relational core with optional time-series optimization for historical fare data.** |
| **ETL & Caching** | **Redis \+ BullMQ** | **Provides resilient job scheduling and microsecond-level caching.** |
| **Visualization** | **React \+ Chart.js** | **Interactive and efficient rendering of time-based fare trends.** |
| **Security** | **JWT \+ Sentry** | **Proven auth model with robust telemetry and incident tracking.** |
| **Observability** | **Prometheus \+ Grafana** | **Full-stack metrics, alerting, and visualization for reliability.** |
| **CI/CD** | **GitHub Actions** | **Seamless testing and container deployment pipeline.** |

**9\. APIS**

*Perfect 👍 — here’s the **APIs** section rewritten to include **descriptions**, **return types**, and **parameter types** for each method, while maintaining the proper hierarchy (Module → Class → Method).*  
 *All class/module labels match your **Architecture Diagram** and **Class Diagram**.*

---

# ***⚙️ APIs***

*This section defines the **application programming interfaces** (APIs) implemented by all classes and components in the Rider Fare Trend Experience System.*  
 *Each method is described with:*

* *Its **purpose and effect** in the system.*

* *Its **parameter types** (including optional parameters).*

* *Its **return type**.*

* *Access level (**Public / Private**).*

* *Notation for **overloads or overrides** (if applicable).*

---

## ***🟥 RiderFareTrendExperienceModule***

### ***SA3.1.1 — RiderFareTrendPageComponent***

| *Access* | *Method* | *Description* | *Parameters* | *Returns* |
| ----- | ----- | ----- | ----- | ----- |
| ***Public*** | *`initializeView(): void`* | *Initializes the page view, loads previous selections, and sets up event listeners.* | *(none)* | *`void`* |
| ***Public*** | *`handleRouteSelection(pickup: CoordinatePair, destination: CoordinatePair): void`* | *Captures the rider’s chosen pickup and destination coordinates.* | *`pickup: CoordinatePair`, `destination: CoordinatePair`* | *`void`* |
| ***Public*** | *`handleTimeWindowChange(window: TimeWindowSelection, timezone?: string): void`* | *Updates the selected time window (e.g., 30-day lookback).* | *`window: TimeWindowSelection`, `timezone?: string`* | *`void`* |
| ***Public*** | *`requestTrendData(route: RouteSpecification, timezone: string, window: TimeWindowSelection): Promise<FareTrendSummary>`* | *Calls the backend API to fetch fare trends for a given route, time window, and timezone.* | *`route: RouteSpecification`, `timezone: string`, `window: TimeWindowSelection`* | *`Promise<FareTrendSummary>`* |
| ***Public*** | *`renderHeatMap(viewModel: FareTrendViewModel): void`* | *Renders a 7×24 grid visualizing fare averages by day/hour.* | *`viewModel: FareTrendViewModel`* | *`void`* |
| ***Public*** | *`renderInsightsPanel(viewModel: FareTrendViewModel): void`* | *Displays insights such as cheapest/costliest time windows.* | *`viewModel: FareTrendViewModel`* | *`void`* |

---

### ***SA3.1.2 — RiderFareTrendPresenter***

| *Access* | *Method* | *Description* | *Parameters* | *Returns* |
| ----- | ----- | ----- | ----- | ----- |
| ***Public*** | *`fromServiceResponse(summary: FareTrendSummary): FareTrendViewModel`* | *Transforms backend data into a frontend-friendly view model.* | *`summary: FareTrendSummary`* | *`FareTrendViewModel`* |
| ***Public*** | *`identifyCheapest(buckets: FareTrendBucket[]): FareTrendBucket`* | *Finds the lowest average fare bucket.* | *`buckets: FareTrendBucket[]`* | *`FareTrendBucket`* |
| ***Public*** | *`identifyCostliest(buckets: FareTrendBucket[]): FareTrendBucket`* | *Finds the highest average fare bucket.* | *`buckets: FareTrendBucket[]`* | *`FareTrendBucket`* |

---

### ***SA3.1.3 — RiderFareTrendClientService***

| *Access* | *Method* | *Description* | *Parameters* | *Returns* |
| ----- | ----- | ----- | ----- | ----- |
| ***Public*** | *`fetchFareTrends(route: RouteSpecification, timezone: string, window: TimeWindowSelection): Promise<FareTrendSummary>`* | *Performs the network call to the backend `/v1/insights/route-prices` API.* | *`route: RouteSpecification`, `timezone: string`, `window: TimeWindowSelection`* | *`Promise<FareTrendSummary>`* |
| ***Private*** | *`constructRequestAddress(route: RouteSpecification, timezone: string, window: TimeWindowSelection): string`* | *Builds the REST endpoint URL with query parameters.* | *`route: RouteSpecification`, `timezone: string`, `window: TimeWindowSelection`* | *`string`* |
| ***Private*** | *`includeAuthorizationHeader(): Record<string, string>`* | *Generates HTTP headers with the JWT bearer token.* | *(none)* | *`Record<string, string>`* |
| ***Private*** | *`handleErrorResponse(status: number, body: unknown): never`* | *Throws structured error objects for failed network responses.* | *`status: number`, `body: unknown`* | *`never`* |

---

## ***🟦 FareTrendAnalyticsModule***

### ***SA3.2.1 — FareTrendController***

| *Access* | *Method* | *Description* | *Parameters* | *Returns* |
| ----- | ----- | ----- | ----- | ----- |
| ***Public*** | *`handleGetRouteTrends(req: HttpRequest, res: HttpResponse): Promise<void>`* | *Main API handler that processes route trend requests and writes a JSON response.* | *`req: HttpRequest`, `res: HttpResponse`* | *`Promise<void>`* |
| ***Private*** | *`parseRouteCoordinates(req: HttpRequest): RouteSpecification`* | *Extracts coordinates from request parameters and validates them.* | *`req: HttpRequest`* | *`RouteSpecification`* |
| ***Private*** | *`registerHypertextHandlers(router: Router): void`* | *Registers HTTP route paths and middleware for the controller.* | *`router: Router`* | *`void`* |
| ***Private*** | *`buildResponseModel(summary: FareTrendSummary): FareTrendSummary`* | *Prepares the final response object to send to the client.* | *`summary: FareTrendSummary`* | *`FareTrendSummary`* |

---

### ***SA3.2.2 — FareTrendService***

| *Access* | *Method* | *Description* | *Parameters* | *Returns* |
| ----- | ----- | ----- | ----- | ----- |
| ***Public*** | *`getRouteTrends(route: RouteSpecification, timezone: string, window: TimeWindowSelection): Promise<FareTrendSummary>`* | *Orchestrates data retrieval (cache → DB → computation) for route fare trends.* | *`route: RouteSpecification`, `timezone: string`, `window: TimeWindowSelection`* | *`Promise<FareTrendSummary>`* |
| ***Public*** | *`computeAverages(records: QuoteHistoryRecord[], timezone: string): FareTrendBucket[]`* | *Calculates average fare per day-of-week and hour-of-day.* | *`records: QuoteHistoryRecord[]`, `timezone: string`* | *`FareTrendBucket[]`* |
| ***Public*** | *`bucketize(records: QuoteHistoryRecord[], timezone: string): Map<string, FareTrendBucket>`* | *Groups historical quotes into time buckets (7×24 grid).* | *`records: QuoteHistoryRecord[]`, `timezone: string`* | *`Map<string, FareTrendBucket>`* |
| ***Public*** | *`invalidateCache(routeKey: string, timezone: string): void`* | *Removes cached summaries for a specific route/timezone.* | *`routeKey: string`, `timezone: string`* | *`void`* |

---

## ***🟧 Repository Layer***

### ***SA3.3.1 — RoutePriceStatsRepository***

| *Access* | *Method* | *Description* | *Parameters* | *Returns* |
| ----- | ----- | ----- | ----- | ----- |
| ***Public*** | *`fetchStats(routeKey: string, timezone: string): Promise<FareTrendBucket[]>`* | *Retrieves pre-aggregated trend buckets for a route.* | *`routeKey: string`, `timezone: string`* | *`Promise<FareTrendBucket[]>`* |
| ***Public*** | *`upsertStats(routeKey: string, timezone: string, buckets: FareTrendBucket[]): Promise<void>`* | *Inserts or updates existing aggregated stats.* | *`routeKey: string`, `timezone: string`, `buckets: FareTrendBucket[]`* | *`Promise<void>`* |
| ***Public*** | *`deleteExpired(expirationDate: Date): Promise<number>`* | *Deletes outdated trend records beyond retention policy.* | *`expirationDate: Date`* | *`Promise<number>`* |

---

### ***SA3.3.2 — QuoteHistoryRepository***

| *Access* | *Method* | *Description* | *Parameters* | *Returns* |
| ----- | ----- | ----- | ----- | ----- |
| ***Public*** | *`appendQuoteRecord(record: QuoteHistoryRecord): Promise<void>`* | *Appends a new quote entry for analytics.* | *`record: QuoteHistoryRecord`* | *`Promise<void>`* |
| ***Public*** | *`fetchQuotesForRoute(routeKey: string, start: Date, end: Date): Promise<QuoteHistoryRecord[]>`* | *Fetches raw quote history within the given date range.* | *`routeKey: string`, `start: Date`, `end: Date`* | *`Promise<QuoteHistoryRecord[]>`* |
| ***Public*** | *`purgeOlderThan(cutoff: Date): Promise<number>`* | *Removes stale quotes older than a cutoff date.* | *`cutoff: Date`* | *`Promise<number>`* |

---

## ***🟪 Scheduler / ETL***

### ***SA3.4.1 — FareTrendAggregator***

| *Access* | *Method* | *Description* | *Parameters* | *Returns* |
| ----- | ----- | ----- | ----- | ----- |
| ***Public*** | *`start(): void`* | *Initializes the ETL scheduler and begins periodic cycles.* | *(none)* | *`void`* |
| ***Public*** | *`stop(): void`* | *Stops any running aggregation loop.* | *(none)* | *`void`* |
| ***Public*** | *`runAggregationCycle(): Promise<void>`* | *Runs a full aggregation pass across all routes.* | *(none)* | *`Promise<void>`* |
| ***Public*** | *`aggregateRoute(routeKey: string, timezone: string): Promise<void>`* | *Aggregates a single route’s fare data.* | *`routeKey: string`, `timezone: string`* | *`Promise<void>`* |
| ***Public*** | *`upsertDailyBuckets(routeKey: string, timezone: string, buckets: FareTrendBucket[]): Promise<void>`* | *Writes computed aggregates back to DB.* | *`routeKey: string`, `timezone: string`, `buckets: FareTrendBucket[]`* | *`Promise<void>`* |

---

## ***🟩 SharedUtilitiesModule***

### ***SA3.5.1 — RouteKeyNormalizer***

| *Access* | *Method* | *Description* | *Parameters* | *Returns* |
| ----- | ----- | ----- | ----- | ----- |
| ***Public*** | *`composeRouteKey(pickup: CoordinatePair, destination: CoordinatePair): string`* | *Converts two coordinates into a canonical route identifier.* | *`pickup: CoordinatePair`, `destination: CoordinatePair`* | *`string`* |

---

### ***SA3.5.2 — TimezoneResolver***

| *Access* | *Method* | *Description* | *Parameters* | *Returns* |
| ----- | ----- | ----- | ----- | ----- |
| ***Public*** | *`resolve(pickup: CoordinatePair, destination: CoordinatePair, override?: string): string`* | *Determines applicable timezone from coordinates or explicit override.* | *`pickup: CoordinatePair`, `destination: CoordinatePair`, `override?: string`* | *`string`* |

---

### ***SA3.5.3 — TrendCache***

| *Access* | *Method* | *Description* | *Parameters* | *Returns* |
| ----- | ----- | ----- | ----- | ----- |
| ***Public*** | *\`get(key: string): Promise\<FareTrendSummary* | *null\>\`* | *Retrieves cached trend summary if present.* | *`key: string`* |
| ***Public*** | *`set(key: string, value: FareTrendSummary, ttlMinutes: number): Promise<void>`* | *Saves summary in cache with TTL.* | *`key: string`, `value: FareTrendSummary`, `ttlMinutes: number`* | *`Promise<void>`* |
| ***Public*** | *`invalidate(prefix: string): Promise<void>`* | *Deletes cache entries matching prefix.* | *`prefix: string`* | *`Promise<void>`* |

---

## ***🟨 RideQuotationModule***

### ***SA3.6.1 — PricingService***

| *Access* | *Method* | *Description* | *Parameters* | *Returns* |
| ----- | ----- | ----- | ----- | ----- |
| ***Public*** | *`estimate(pickup: CoordinatePair, destination: CoordinatePair): Promise<PriceEstimate>`* | *Estimates live ride fare for given route.* | *`pickup: CoordinatePair`, `destination: CoordinatePair`* | *`Promise<PriceEstimate>`* |
| ***Public*** | *`applyDiscount(baseAmount: number, percent: number): DiscountResult`* | *Applies a discount to a fare and computes savings.* | *`baseAmount: number`, `percent: number`* | *`DiscountResult`* |

---

### ***SA3.6.2 — LocationService***

| *Access* | *Method* | *Description* | *Parameters* | *Returns* |
| ----- | ----- | ----- | ----- | ----- |
| ***Public*** | *`eta(pickup: CoordinatePair, destination: CoordinatePair): Promise<number>`* | *Estimates ETA (in minutes) between coordinates.* | *`pickup: CoordinatePair`, `destination: CoordinatePair`* | *`Promise<number>`* |

---

### ***SA3.6.3 — AuthenticationService***

| *Access* | *Method* | *Description* | *Parameters* | *Returns* |
| ----- | ----- | ----- | ----- | ----- |
| ***Public*** | *`required(): Middleware`* | *Enforces mandatory authentication for protected routes.* | *(none)* | *`Middleware`* |
| ***Public*** | *`optional(): Middleware`* | *Allows optional authentication for open endpoints.* | *(none)* | *`Middleware`* |
| ***Public*** | *`requireRole(role: string): Middleware`* | *Restricts access to users with specific roles.* | *`role: string`* | *`Middleware`* |
| ***Public*** | *`verify(token?: string): Promise<JwtPayloadOrNull>`* | *Verifies JWT token and extracts payload if valid.* | *`token?: string`* | *`Promise<JwtPayloadOrNull>`* |

---

## ***🟫 Data Layer***

### ***SA3.3.3 — PrismaClient***

| *Access* | *Method* | *Description* | *Parameters* | *Returns* |
| ----- | ----- | ----- | ----- | ----- |
| ***Public*** | *`query<T = unknown>(sql: string, params?: unknown[]): Promise<T>`* | *Executes a raw SQL query with parameters.* | *`sql: string`, `params?: unknown[]`* | *`Promise<T>`* |
| ***Public*** | *`transaction<T>(fn: () => Promise<T>): Promise<T>`* | *Runs multiple queries atomically.* | *`fn: () => Promise<T>`* | *`Promise<T>`* |

---

### ***SA3.3.4 — PostgresDatabase***

| *Access* | *Method* | *Description* | *Parameters* | *Returns* |
| ----- | ----- | ----- | ----- | ----- |
| ***Public*** | *`executeStatement(sql: string, params?: unknown[]): Promise<ResultSet>`* | *Runs SQL statements against PostgreSQL.* | *`sql: string`, `params?: unknown[]`* | *`Promise<ResultSet>`* |

---

**10\. Public Interfaces**

Below is the **Public Interfaces** section for the *Rider Fare Trend Experience & Fare Trend Analytics System*.  
 It shows **only public methods**, grouped by **who uses them** (same component, other components in the same module, or cross-module).  
 It also enumerates **cross-component** and **cross-module** usage, and notes **how to call** exposed APIs from multiple interfaces.

Labels match the Architecture/Class specs (e.g., modules/components by name, classes by **SA3.x.y**).

---

# **Public Interfaces — Overview**

* Scope groupings per class:

  1. **Intra-Component** (called by code within the same component/class wrapper)

  2. **Intra-Module** (other components in the same module call it)

  3. **Cross-Module** (classes/components in other modules call it)

* Only **public** methods are listed here (no privates).

* Cross-usage matrices are provided at the end of each **Component** and **Module** section.

---

## **RiderFareTrendExperienceModule — Rider Fare Trend Experience Module**

### **SA3.1.1 — RiderFareTrendPageComponent (Component)**

**Intra-Component**

* `initializeView(): void` — Initialize view state and event wiring.

* `renderHeatMap(viewModel: FareTrendViewModel): void` — Render 7×24 heatmap.

* `renderInsightsPanel(viewModel: FareTrendViewModel): void` — Render insights sidebar.

**Intra-Module (used by other components in this module)**

* *(none — this component is the UI orchestrator and consumer rather than a callee)*

**Cross-Module**

* *(none — it calls across modules but exposes no cross-module API itself)*

**This component USES (from other components)**

* SA3.1.3 `RiderFareTrendClientService.fetchFareTrends(...)`

* SA3.1.2 `RiderFareTrendPresenter.fromServiceResponse(...)`

* SA3.1.2 `RiderFareTrendPresenter.identifyCheapest(...)`

* SA3.1.2 `RiderFareTrendPresenter.identifyCostliest(...)`

---

### **SA3.1.2 — RiderFareTrendPresenter (Presenter)**

**Intra-Component**

* *(none)*

**Intra-Module**

* `fromServiceResponse(summary: FareTrendSummary): FareTrendViewModel`

* `identifyCheapest(buckets: FareTrendBucket[]): FareTrendBucket`

* `identifyCostliest(buckets: FareTrendBucket[]): FareTrendBucket`

**Cross-Module**

* *(none — pure presentation logic)*

**This component USES (from other components)**

* *(none — it is a pure transformer used by the Page)*

---

### **SA3.1.3 — RiderFareTrendClientService (Client Service)**

**Intra-Component**

* *(none)*

**Intra-Module**

* *(none — generally called by the Page)*

**Cross-Module**

* `fetchFareTrends(route: RouteSpecification, timezone: string, window: TimeWindowSelection): Promise<FareTrendSummary>`  
   Externally invokes the FareTrendAnalyticsModule REST endpoint.

**This component USES (from other modules)**

* SA3.2.1 `FareTrendController.handleGetRouteTrends(...)` via **REST** (HTTP GET).

---

## **FareTrendAnalyticsModule — Fare Trend Analytics Module**

### **SA3.2.1 — FareTrendController (Controller)**

**Intra-Component**

* *(none)*

**Intra-Module**

* *(none — controller delegates to service)*

**Cross-Module**

* `handleGetRouteTrends(req: HttpRequest, res: HttpResponse): Promise<void>`  
   Public HTTP endpoint consumed by RiderFareTrendExperienceModule (client service).

**This component USES (from other components in same module)**

* SA3.2.2 `FareTrendService.getRouteTrends(...)`

**This component USES (from other modules)**

* SA3.6.3 `AuthenticationService.required()/optional()/verify(...)` (middleware/auth)

---

### **SA3.2.2 — FareTrendService (Service)**

**Intra-Component**

* *(none)*

**Intra-Module**

* `getRouteTrends(route: RouteSpecification, timezone: string, window: TimeWindowSelection): Promise<FareTrendSummary>`

* `computeAverages(records: QuoteHistoryRecord[], timezone: string): FareTrendBucket[]`

* `bucketize(records: QuoteHistoryRecord[], timezone: string): Map<string, FareTrendBucket>`

* `invalidateCache(routeKey: string, timezone: string): void`

**Cross-Module**

* *(service is consumed by the module’s controller; it, in turn, calls utilities across modules — see “USES”)*

**This component USES (from other components in same module)**

* SA3.3.1 `RoutePriceStatsRepository.fetchStats(...)`

**This component USES (from other modules)**

* SA3.5.3 `TrendCache.get/set/invalidate(...)` (SharedUtilitiesModule)

* SA3.5.1 `RouteKeyNormalizer.composeRouteKey(...)` (SharedUtilitiesModule)

* SA3.5.2 `TimezoneResolver.resolve(...)` (SharedUtilitiesModule)

* SA3.6.1 `PricingService.estimate(...)` (RideQuotationModule; optional/support)

* SA3.6.2 `LocationService.eta(...)` (RideQuotationModule; optional/support)

---

### **SA3.3.1 — RoutePriceStatsRepository (Repository — Read Model)**

**Intra-Component**

* *(none)*

**Intra-Module**

* `fetchStats(routeKey: string, timezone: string): Promise<FareTrendBucket[]>`

* `upsertStats(routeKey: string, timezone: string, buckets: FareTrendBucket[]): Promise<void>`

* `deleteExpired(expirationDate: Date): Promise<number>`

**Cross-Module**

* *(none — internal to analytics; called by Service/Aggregator)*

**This component USES (from other modules)**

* SA3.3.3 `PrismaClient.query/transaction(...)` (Data Layer)

---

### **SA3.3.2 — QuoteHistoryRepository (Repository — Raw Facts)**

**Intra-Component**

* *(none)*

**Intra-Module**

* `appendQuoteRecord(record: QuoteHistoryRecord): Promise<void>`

* `fetchQuotesForRoute(routeKey: string, start: Date, end: Date): Promise<QuoteHistoryRecord[]>`

* `purgeOlderThan(cutoff: Date): Promise<number>`

**Cross-Module**

* *(none — primarily ETL input; populated by RideQuotationModule producers upstream)*

**This component USES (from other modules)**

* SA3.3.3 `PrismaClient.query/transaction(...)` (Data Layer)

---

### **SA3.4.1 — FareTrendAggregator (Scheduler / ETL)**

**Intra-Component**

* *(none)*

**Intra-Module**

* `start(): void`

* `stop(): void`

* `runAggregationCycle(): Promise<void>`

* `aggregateRoute(routeKey: string, timezone: string): Promise<void>`

* `upsertDailyBuckets(routeKey: string, timezone: string, buckets: FareTrendBucket[]): Promise<void>`

**Cross-Module**

* *(none exposed; it calls SharedUtilities \+ Cache and writes repositories)*

**This component USES (from other components in same module)**

* SA3.3.2 `QuoteHistoryRepository.fetchQuotesForRoute(...)`

* SA3.3.1 `RoutePriceStatsRepository.upsertStats(...), deleteExpired(...)`

**This component USES (from other modules)**

* SA3.5.1 `RouteKeyNormalizer.composeRouteKey(...)`

* SA3.5.2 `TimezoneResolver.resolve(...)`

* SA3.5.3 `TrendCache.invalidate(...)`

---

## **SharedUtilitiesModule — Shared Utilities**

### **SA3.5.1 — RouteKeyNormalizer (Utility)**

**Intra-Component**

* *(none)*

**Intra-Module**

* *(none — used by analytics components)*

**Cross-Module**

* `composeRouteKey(pickup: CoordinatePair, destination: CoordinatePair): string`  
   Used by FareTrendService and FareTrendAggregator (Analytics) and by Quote writers (RideQuotation).

---

### **SA3.5.2 — TimezoneResolver (Utility)**

**Intra-Component**

* *(none)*

**Intra-Module**

* *(none)*

**Cross-Module**

* `resolve(pickup: CoordinatePair, destination: CoordinatePair, override?: string): string`  
   Used by FareTrendService and FareTrendAggregator (Analytics). Can also be called by UI client for preview.

---

### **SA3.5.3 — TrendCache (Cache)**

**Intra-Component**

* *(none)*

**Intra-Module**

* *(none)*

**Cross-Module**

* `get(key: string): Promise<FareTrendSummary | null>`

* `set(key: string, value: FareTrendSummary, ttlMinutes: number): Promise<void>`

* `invalidate(prefix: string): Promise<void>`  
   Used by FareTrendService (read path) and FareTrendAggregator (write/invalidations).

---

## **RideQuotationModule — Ride Quotation Module**

### **SA3.6.1 — PricingService (Shared Service)**

**Intra-Component**

* *(none)*

**Intra-Module**

* *(none)*

**Cross-Module**

* `estimate(pickup: CoordinatePair, destination: CoordinatePair): Promise<PriceEstimate>`  
   Referenced by FareTrendService for supportive context (optional).

---

### **SA3.6.2 — LocationService (Shared Service)**

**Intra-Component**

* *(none)*

**Intra-Module**

* *(none)*

**Cross-Module**

* `eta(pickup: CoordinatePair, destination: CoordinatePair): Promise<number>`  
   Optional helper used by FareTrendService.

---

### **SA3.6.3 — AuthenticationService (Shared Service)**

**Intra-Component**

* *(none)*

**Intra-Module**

* *(none — generally wired at the controller boundary)*

**Cross-Module**

* `required(): Middleware`

* `optional(): Middleware`

* `requireRole(role: string): Middleware`

* `verify(token?: string): Promise<JwtPayloadOrNull>`  
   Used by FareTrendController to guard `/v1/insights/route-prices`.

---

## **Data Layer — Platform**

### **SA3.3.3 — PrismaClient (Data Platform)**

**Intra-Component**

* *(none)*

**Intra-Module**

* *(none — accessed via repositories)*

**Cross-Module**

* `query<T = unknown>(sql: string, params?: unknown[]): Promise<T>`

* `transaction<T>(fn: () => Promise<T>): Promise<T>`  
   Consumed by repositories (RoutePriceStatsRepository, QuoteHistoryRepository).

---

### **SA3.3.4 — PostgresDatabase (Database Abstraction)**

**Intra-Component**

* *(none)*

**Intra-Module**

* *(none — wrapped by PrismaClient)*

**Cross-Module**

* `executeStatement(sql: string, params?: unknown[]): Promise<ResultSet>`  
   Used via PrismaClient internally (not typically called directly by higher layers).

---

# **Component-Level Cross-Usage Summary**

* **RiderFareTrendPageComponent (SA3.1.1)** uses:

  * SA3.1.3 `RiderFareTrendClientService.fetchFareTrends(...)`

  * SA3.1.2 `RiderFareTrendPresenter.fromServiceResponse(...)`

  * SA3.1.2 `RiderFareTrendPresenter.identifyCheapest(...)`

  * SA3.1.2 `RiderFareTrendPresenter.identifyCostliest(...)`

  * (Cross-module via REST) SA3.2.1 `FareTrendController.handleGetRouteTrends(...)`

* **RiderFareTrendClientService (SA3.1.3)** uses:

  * (Cross-module via REST) SA3.2.1 `FareTrendController.handleGetRouteTrends(...)`

* **FareTrendController (SA3.2.1)** uses:

  * SA3.2.2 `FareTrendService.getRouteTrends(...)`

  * SA3.6.3 `AuthenticationService.required/optional/verify(...)` (cross-module)

* **FareTrendService (SA3.2.2)** uses:

  * SA3.3.1 `RoutePriceStatsRepository.fetchStats(...)`

  * SA3.5.1 `RouteKeyNormalizer.composeRouteKey(...)` (cross-module)

  * SA3.5.2 `TimezoneResolver.resolve(...)` (cross-module)

  * SA3.5.3 `TrendCache.get/set/invalidate(...)` (cross-module)

  * SA3.6.1 `PricingService.estimate(...)` (cross-module, optional)

  * SA3.6.2 `LocationService.eta(...)` (cross-module, optional)

* **FareTrendAggregator (SA3.4.1)** uses:

  * SA3.3.2 `QuoteHistoryRepository.fetchQuotesForRoute(...)`

  * SA3.3.1 `RoutePriceStatsRepository.upsertStats(...), deleteExpired(...)`

  * SA3.5.1 `RouteKeyNormalizer.composeRouteKey(...)` (cross-module)

  * SA3.5.2 `TimezoneResolver.resolve(...)` (cross-module)

  * SA3.5.3 `TrendCache.invalidate(...)` (cross-module)

---

# **Module-Level Cross-Usage Summary**

* **RiderFareTrendExperienceModule** uses (from **FareTrendAnalyticsModule**):

  * SA3.2.1 `FareTrendController.handleGetRouteTrends(...)` (via **REST GET**)

* **FareTrendAnalyticsModule** uses (from **SharedUtilitiesModule**):

  * SA3.5.1 `RouteKeyNormalizer.composeRouteKey(...)`

  * SA3.5.2 `TimezoneResolver.resolve(...)`

  * SA3.5.3 `TrendCache.get/set/invalidate(...)`

* **FareTrendAnalyticsModule** uses (from **RideQuotationModule**):

  * SA3.6.3 `AuthenticationService.required/optional/verify(...)` (controller boundary)

  * SA3.6.1 `PricingService.estimate(...)` (optional)

  * SA3.6.2 `LocationService.eta(...)` (optional)

* **Repositories (inside FareTrendAnalyticsModule)** use (from **Data Layer**):

  * SA3.3.3 `PrismaClient.query/transaction(...)`

---

# **Multi-Interface Access (How to Call)**

## **REST (HTTP) — Cross-Module Public API**

**Endpoint:** `GET /v1/insights/route-prices`  
 **Caller:** SA3.1.3 RiderFareTrendClientService → SA3.2.1 FareTrendController

**Query Parameters (example):**

```
origin_lat=40.4418&origin_lng=-79.9416&dest_lat=40.4452&dest_lng=-79.9482
&tz=America/New_York&window=30d
```

**cURL example**

```shell
curl -H "Authorization: Bearer <JWT>" \
  "https://api.example.com/v1/insights/route-prices?origin_lat=40.4418&origin_lng=-79.9416&dest_lat=40.4452&dest_lng=-79.9482&tz=America/New_York&window=30d"
```

**TypeScript (frontend)**

```ts
const summary = await client.fetchFareTrends(
  { pickup: {lat:40.4418,lng:-79.9416}, destination: {lat:40.4452,lng:-79.9482} },
  "America/New_York",
  { windowDays: 30 }
);
```

## **Internal TS Interfaces (intra-module, cross-module)**

* **SharedUtilitiesModule** methods (SA3.5.1/3/2) are imported & called directly in TypeScript by Analytics components.

* **Repositories** (SA3.3.1/3.2) are injected (e.g., via constructor) into Service/Aggregator and called as async TypeScript functions.

**11\. Data Schemas**

This section documents all **database entities** that persist state in the *Rider Fare Trend Experience System*.  
 It explains how data is stored, what runtime classes manage it, how each field maps to database types, and how storage is estimated.  
 All schemas are stored in a **PostgreSQL** database accessed via **Prisma ORM**, and all runtime mappings are defined in corresponding **Repository classes** in the backend modules.

---

## **🧱 DS1.1 — QuoteHistoryRecord (Quote History Table)**

**Purpose:**  
 The `quote_history` table records every price quote generated for a given pickup–destination pair.  
 These raw quotes form the input dataset from which the system computes time-based fare averages and price patterns.  
 This table represents the *most granular level of data* in the analytics pipeline.

**Runtime Class:**  
 `QuoteHistoryRecord` — used by `QuoteHistoryRepository`, `FareTrendService`, and `FareTrendAggregator`.

**Table Name:** `quote_history`

| Column | DB Type | Description | Notes | Est. Bytes |
| ----- | ----- | ----- | ----- | ----- |
| `quote_id` | `UUID PRIMARY KEY` | Unique ID for each quote record. | Generated automatically by the backend. | 16 |
| `route_key` | `VARCHAR(64)` | Canonical identifier for a route (pickup → destination). | Derived using `RouteKeyNormalizer`. | 64 |
| `amount` | `NUMERIC(10,2)` | Fare amount at quote time. | Stored in base currency (USD). | 8 |
| `currency` | `CHAR(3)` | ISO currency code, e.g., “USD”. | Always uppercase. | 3 |
| `generated_at` | `TIMESTAMPTZ` | Quote creation timestamp. | Converted to UTC at ingestion. | 8 |
| `pickup_lat` | `FLOAT8` | Pickup latitude. | From user input. | 8 |
| `pickup_lng` | `FLOAT8` | Pickup longitude. | From user input. | 8 |
| `dest_lat` | `FLOAT8` | Destination latitude. | From user input. | 8 |
| `dest_lng` | `FLOAT8` | Destination longitude. | From user input. | 8 |
| `surge_multiplier` | `FLOAT4` | Surge pricing factor. | Nullable if no surge. | 4 |

**Explanation:**  
 Every row represents a single fare quotation event. The analytics scheduler (`FareTrendAggregator`) periodically reads these rows to compute hourly or daily averages by time bucket.

**Estimated Row Size:** \~135 bytes per record (\~150 bytes including metadata).

**Storage Function:** `~150 × Q bytes`, where Q \= number of quotes per month.

---

## **📊 DS1.2 — FareTrendBucket (Aggregated Fare Bucket Table)**

**Purpose:**  
 The `fare_trend_bucket` table stores **pre-aggregated fare averages** computed over time windows (by day of week and hour of day).  
 Each record corresponds to a single (route, timezone, weekday, hour) combination.

**Runtime Class:**  
 `FareTrendBucket` — used by `RoutePriceStatsRepository`, `FareTrendService`, and `FareTrendAggregator`.

**Table Name:** `fare_trend_bucket`

| Column | DB Type | Description | Notes | Est. Bytes |
| ----- | ----- | ----- | ----- | ----- |
| `id` | `SERIAL PRIMARY KEY` | Internal unique identifier. | — | 4 |
| `route_key` | `VARCHAR(64)` | Route ID linking to quote history. | FK to `quote_history.route_key`. | 64 |
| `timezone` | `VARCHAR(64)` | IANA timezone string. | For local time grouping. | 64 |
| `day_of_week` | `SMALLINT` | Day index (0–6). | Sunday=0 convention. | 2 |
| `hour_of_day` | `SMALLINT` | Hour index (0–23). | Start of bucket hour. | 2 |
| `average_fare` | `NUMERIC(10,2)` | Mean fare value for the bucket. | Pre-computed. | 8 |
| `ride_count` | `INTEGER` | Number of quotes contributing. | For weighting accuracy. | 4 |
| `stddev_fare` | `NUMERIC(10,2)` | Standard deviation of fares. | Useful for volatility visualization. | 8 |
| `last_updated` | `TIMESTAMPTZ` | Timestamp of last aggregation. | Maintained by aggregator. | 8 |

**Explanation:**  
 When the frontend rider views a fare trend heatmap, it visualizes these aggregated buckets rather than raw data.  
 The `FareTrendAggregator` updates this table every few hours using data from `quote_history`.

**Estimated Row Size:** \~164 bytes  
 **Storage Formula:** `164 × (routes × 7 × 24)` per full month (\~27 KB per route).

---

## **📈 DS1.3 — FareTrendSummary (Materialized Summary View)**

**Purpose:**  
 `fare_trend_summary` is a *derived or materialized view* that merges all `fare_trend_bucket` entries for a given route into a single JSON document.  
 This is the primary API output structure returned to frontend clients.

**Runtime Class:**  
 `FareTrendSummary` — constructed in `FareTrendService` and returned via `FareTrendController`.

**Database Representation:**  
 Materialized view or computed query.

| Field | Derived From | DB Type | Notes | Est. Bytes |
| ----- | ----- | ----- | ----- | ----- |
| `route_key` | `fare_trend_bucket.route_key` | `VARCHAR(64)` | Unique route key. | 64 |
| `timezone` | `fare_trend_bucket.timezone` | `VARCHAR(64)` | Source timezone. | 64 |
| `generated_at` | `NOW()` | `TIMESTAMPTZ` | Snapshot generation time. | 8 |
| `buckets` | Aggregated JSON array | `JSONB` | 7×24 array of `FareTrendBucket` objects. | \~2,000 |

**Explanation:**  
 This schema is not a base table—it’s a *computed view* that simplifies read access for clients.  
 When riders request their route trends, the API returns one JSON row per route using this view.

**Estimated Row Size:** \~2.1 KB per route summary.

---

## **🚗 DS1.4 — RouteSpecification (Ephemeral Data Type)**

**Purpose:**  
 `RouteSpecification` is not stored in the database; it’s a **transient structure** describing a single trip query (pickup \+ destination).  
 It is used by the `RouteKeyNormalizer` to generate `route_key` values used as primary keys in other tables.

**Runtime Class:**  
 `RouteSpecification` — held by frontend (`RiderFareTrendPageComponent`) and backend (`FareTrendController`).

**Persistence:**  
 Ephemeral (never persisted directly).

**Explanation:**  
 This structure helps ensure consistent route key composition across modules, maintaining data integrity without requiring duplicate tables.

---

## **💾 DS1.5 — RoutePriceStatsRepository Metadata Table**

**Purpose:**  
 The `route_stats_meta` table tracks metadata for each aggregated route, including when it was last updated and how many records it used.  
 This helps the scheduler (`FareTrendAggregator`) avoid redundant computations.

**Runtime Class:**  
 Internal to `RoutePriceStatsRepository`.

**Table Name:** `route_stats_meta`

| Column | DB Type | Description | Est. Bytes |
| ----- | ----- | ----- | ----- |
| `route_key` | `VARCHAR(64)` | Unique route identifier. | 64 |
| `last_aggregated_at` | `TIMESTAMPTZ` | When aggregation last occurred. | 8 |
| `record_count` | `INTEGER` | Number of source records used. | 4 |

**Explanation:**  
 This lightweight table provides caching and health-tracking data for aggregation cycles.

**Estimated Row Size:** \~80 bytes.

---

## **⚡ DS1.6 — TrendCache (Fallback Persistent Cache)**

**Purpose:**  
 While cache normally resides in **Redis**, the system provides a fallback table `trend_cache` for environments without in-memory storage.  
 This table stores cached summaries and expiry info.

**Runtime Class:**  
 `TrendCache` — used by `FareTrendService` and `FareTrendAggregator`.

**Table Name:** `trend_cache`

| Column | DB Type | Description | Est. Bytes |
| ----- | ----- | ----- | ----- |
| `cache_key` | `VARCHAR(128) PRIMARY KEY` | Key combining route and timezone. | 128 |
| `value` | `JSONB` | Serialized `FareTrendSummary` payload. | \~2,000 |
| `ttl_minutes` | `INTEGER` | Time-to-live for cache entry. | 4 |
| `last_refreshed` | `TIMESTAMPTZ` | Timestamp of cache update. | 8 |

**Explanation:**  
 This allows the analytics module to respond quickly to repeat route requests without recomputation.  
 Cached entries are automatically invalidated by the aggregator after a configurable interval.

**Estimated Row Size:** \~2.1 KB per record.

---

## **🧮 DS1.7 — OutlierPolicy (Optional Configuration Table)**

**Purpose:**  
 The `outlier_policy` table stores per-route JSON policies that describe how to filter abnormal fare data before averaging.  
 It’s optional but useful for improving trend accuracy.

**Runtime Class:**  
 `OutlierPolicy` — referenced by `FareTrendService`.

| Column | DB Type | Description | Notes | Est. Bytes |
| ----- | ----- | ----- | ----- | ----- |
| `id` | `SERIAL PRIMARY KEY` | Unique row ID. | — | 4 |
| `route_key` | `VARCHAR(64)` | Route associated with this policy. | FK to `fare_trend_bucket`. | 64 |
| `policy_json` | `JSONB` | Encoded filter rules (e.g., z-score threshold). | — | 1,024 |
| `last_updated` | `TIMESTAMPTZ` | Policy modification timestamp. | — | 8 |

**Explanation:**  
 Helps analysts fine-tune which quotes are ignored when computing trends (e.g., eliminating surge outliers).

**Estimated Row Size:** \~1.1 KB per route.

---

## **👤 DS1.8 — Users / Authentication Data**

**Purpose:**  
 The `users` table stores credentials and metadata for authenticated riders and admin users.  
 It is part of the shared authentication layer used across modules.

**Runtime Class:**  
 `JwtPayloadOrNull` — returned by `AuthenticationService`.

**Table Name:** `users`

| Column | DB Type | Description | Est. Bytes |
| ----- | ----- | ----- | ----- |
| `user_id` | `UUID PRIMARY KEY` | Unique user identifier. | 16 |
| `email` | `VARCHAR(128)` | User email address. | 128 |
| `role` | `VARCHAR(32)` | Role name (e.g., “rider”, “admin”). | 32 |
| `hashed_token` | `VARCHAR(256)` | Hash of JWT token for auth. | 256 |
| `last_login` | `TIMESTAMPTZ` | Last login timestamp. | 8 |

**Explanation:**  
 Although authentication is managed by the shared `RideQuotationModule`, its user data is accessible system-wide for analytics security enforcement.

**Estimated Row Size:** \~440 bytes per user.

---

# **🧠 Type Mapping Notes**

| Application Type | Database Type | Reason / Mapping Explanation |
| ----- | ----- | ----- |
| `CoordinatePair` | `FLOAT8 lat`, `FLOAT8 lng` | 64-bit float provides \~15 cm geo precision. |
| `RouteKeyString` | `VARCHAR(64)` | Normalized concatenation of coordinates. |
| `FareTrendBucket[]` | `JSONB` | Serialized array of 7×24 buckets for fast retrieval. |
| `NUMERIC(10,2)` | Fixed-precision decimal type avoids rounding errors in prices. |  |
| `TIMESTAMPTZ` | Timestamp with timezone ensures accurate day-of-week calculation globally. |  |
| `UUID` | Compact unique identifier for distributed insert safety. |  |

**Explanation:**  
 The schema prioritizes **accuracy** (NUMERIC for money, TIMESTAMPTZ for time zones) and **performance** (indexes on `route_key`, `day_of_week`, and `hour_of_day` for fast aggregation).

---

# **📏 Storage Requirement Summary**

| Data Type Label | Approx. Rows | Est. Row Size | Monthly Storage | Description |
| ----- | ----- | ----- | ----- | ----- |
| DS1.1 — `quote_history` | 1,000,000 | 150 B | 150 MB | Raw quote events. |
| DS1.2 — `fare_trend_bucket` | 50,000 | 164 B | 8 MB | Aggregated hourly/daily averages. |
| DS1.3 — `fare_trend_summary` | 10,000 | 2 KB | 20 MB | Materialized summaries for UI queries. |
| DS1.5 — `route_stats_meta` | 10,000 | 80 B | 0.8 MB | Aggregation tracking. |
| DS1.6 — `trend_cache` | 10,000 | 2.1 KB | 21 MB | Redis fallback cache. |
| DS1.7 — `outlier_policy` | 10,000 | 1.1 KB | 11 MB | Configurable filters. |
| DS1.8 — `users` | 5,000 | 440 B | 2.2 MB | Authentication metadata. |

**Explanation:**  
 These estimates assume a medium-scale deployment with around 10,000 active routes and 1M quotes per month.  
 The total projected footprint remains modest (\~220 MB/month), making it suitable for scalable cloud deployment.

---

# **🧾 Overall Summary**

* **Data Flow:**  
   `quote_history` (raw input) → `fare_trend_bucket` (aggregates) → `fare_trend_summary` (view) → served to frontend.

* **Persistence Architecture:**  
   All persistent entities are mapped through **Repository classes** (`QuoteHistoryRepository`, `RoutePriceStatsRepository`) using **Prisma ORM** to **PostgreSQL**.

* **Normalization Philosophy:**  
   Route keys and time buckets are normalized to enable efficient caching and precise trend aggregation.

* **Reliability Measures:**  
   Each table includes `last_updated` or timestamp columns for synchronization between scheduler and API services.

**12\. Risks to Completion**

# **⚠️ Risks to Completion**

This section evaluates technical and organizational risks associated with implementing and sustaining the *Rider Fare Trend Experience & Analytics System*.  
 Each risk entry discusses:

* **Learning / Design Complexity** — how difficult it is for a developer to understand or design.

* **Implementation Difficulty** — how complex it is to code or integrate.

* **Verification Difficulty** — how hard it is to test and prove correctness.

* **Maintenance & Upgrades** — how prone the component is to drift or obsolescence over time.

Risks are organized **top-down by module**, then **component**, **class**, and **method**, with supporting **data schema** and **technology** considerations.

---

## **🟥 RiderFareTrendExperienceModule (Frontend)**

### **Overall Module Risk**

This module involves **asynchronous API interaction**, **data visualization**, and **error-state handling** — moderately complex for a frontend system.  
 The main risk lies in ensuring **consistency between backend responses** and **UI rendering**, especially for time-bucketed data (7×24 arrays).

**Key Risks**

* Misalignment of time zones between client and server when visualizing trends.

* Potential performance bottlenecks when rendering heatmaps for large datasets.

* Edge-case rendering when certain hours/days lack data (null buckets).

---

### **SA3.1.1 — RiderFareTrendPageComponent**

**Learning Curve:** Moderate — typical React/TypeScript frontend component, but requires familiarity with asynchronous data fetching and conditional rendering.  
 **Implementation Difficulty:** Medium — integrating multiple states (`loading`, `error`, `display`) with real-time user input can be error-prone.  
 **Verification:** Unit tests for UI transitions and snapshot tests for charts required.  
 **Maintenance Risk:** High if UI design evolves; frequent refactoring needed when API contracts change.

**Methods:**

* `initializeView()`: Easy to implement, low risk.

* `handleRouteSelection()`: Moderate; depends on correct event binding and coordinate validation.

* `requestTrendData()`: High risk; must handle async API failures gracefully.

* `renderHeatMap()`: High visual testing cost — UI rendering validation is non-trivial.

* `renderInsightsPanel()`: Low risk, but correctness depends on accurate ViewModel transformation.

---

### **SA3.1.2 — RiderFareTrendPresenter**

**Learning Curve:** Low — pure data transformation.  
 **Implementation Difficulty:** Low — mostly functional mapping.  
 **Verification:** Simple unit testing (expected → actual).  
 **Maintenance:** Stable, but might require changes if backend bucket schema changes.

---

### **SA3.1.3 — RiderFareTrendClientService**

**Learning Curve:** Medium — requires understanding both HTTP and auth token management.  
 **Implementation Difficulty:** Moderate — must handle error cases, network failures, and JWT headers.  
 **Verification:** Moderate; needs integration tests using mock backends.  
 **Maintenance:** API endpoint changes could break existing logic (moderate risk).

---

## **🟦 FareTrendAnalyticsModule (Backend API / Analytics Engine)**

### **Overall Module Risk**

This module is the **heart of the analytics system**, dealing with **data retrieval**, **aggregation**, and **API exposure**.  
 Most complexity arises from concurrency, cache invalidation, and database aggregation correctness.

**Key Risks**

* Schema evolution risk when analytics logic changes.

* Aggregation drift if scheduler and repositories fall out of sync.

* Increased CPU load when backfilling historical data.

---

### **SA3.2.1 — FareTrendController**

**Learning Curve:** Low — standard Express/NestJS controller patterns.  
 **Implementation Difficulty:** Moderate — requires validation, auth middleware, and async coordination.  
 **Verification:** Straightforward with HTTP test harnesses.  
 **Maintenance:** Moderate; any route contract change affects the frontend directly.

**Methods:**

* `handleGetRouteTrends()`: Medium risk — must validate inputs and catch backend errors.

* `parseRouteCoordinates()`: Low risk — deterministic, but must handle malformed input.

* `buildResponseModel()`: Low risk — purely structural, easy to test.

---

### **SA3.2.2 — FareTrendService**

**Learning Curve:** High — requires understanding of both domain analytics and caching layers.  
 **Implementation Difficulty:** High — responsible for coordinating multiple repositories and caches.  
 **Verification:** Complex — must validate correctness of aggregated results.  
 **Maintenance:** High; small schema or cache changes can ripple across layers.

**Risks by Method:**

* `getRouteTrends()`: High — critical path combining cache, DB, and service logic.

* `computeAverages()`: Medium — numeric accuracy risk if improper rounding.

* `bucketize()`: Medium — must correctly handle daylight saving and timezone edge cases.

* `invalidateCache()`: Low — operational risk if incorrectly scoped invalidation.

---

### **SA3.3.1 — RoutePriceStatsRepository**

**Learning Curve:** Low — straightforward database access layer.  
 **Implementation Difficulty:** Medium — must ensure transactional consistency during upserts.  
 **Verification:** Easy with integration tests.  
 **Maintenance:** Low; schema changes rare.

---

### **SA3.3.2 — QuoteHistoryRepository**

**Learning Curve:** Low — basic CRUD repository.  
 **Implementation Difficulty:** Low — simple SQL operations.  
 **Verification:** Simple insert/fetch/delete testing.  
 **Maintenance:** Low risk, stable schema.

---

### **SA3.4.1 — FareTrendAggregator (Scheduler / ETL)**

**Learning Curve:** High — requires background job scheduling and parallel task management knowledge.  
 **Implementation Difficulty:** High — must coordinate data freshness, avoid overlaps, and handle large datasets efficiently.  
 **Verification:** Hard — must simulate concurrent writes and verify aggregate integrity.  
 **Maintenance:** Moderate — risk increases if schedule intervals or aggregation logic evolve.

**Specific Risk:**  
 Backfilling missed aggregations can double-count or omit certain data without careful time-window control.

---

## **🟩 SharedUtilitiesModule (Cross-Cutting Utilities)**

### **SA3.5.1 — RouteKeyNormalizer**

**Learning Curve:** Low — simple string generation.  
 **Implementation Difficulty:** Low.  
 **Verification:** Easy with deterministic test vectors.  
 **Maintenance:** Low, but must remain consistent across modules.

---

### **SA3.5.2 — TimezoneResolver**

**Learning Curve:** Medium — requires understanding of IANA timezones.  
 **Implementation Difficulty:** Medium — needs to handle edge cases (DST transitions).  
 **Verification:** Moderate; unit tests needed with diverse geographic examples.  
 **Maintenance:** Medium; periodic timezone database updates may be required.

---

### **SA3.5.3 — TrendCache**

**Learning Curve:** Medium — knowledge of Redis/TTL semantics needed.  
 **Implementation Difficulty:** Medium — cross-process cache invalidation is tricky.  
 **Verification:** Moderate — must test both hit/miss and expiry behavior.  
 **Maintenance:** Medium — caching strategy tuning may evolve with scale.

---

## **🟨 RideQuotationModule (Upstream / Shared Services)**

### **SA3.6.1 — PricingService**

**Learning Curve:** Medium — requires integration with existing pricing engine logic.  
 **Implementation Difficulty:** Medium — numeric consistency with external systems must be ensured.  
 **Verification:** Moderate — requires differential tests against known fare results.  
 **Maintenance:** Medium; pricing rules change over time.

---

### **SA3.6.2 — LocationService**

**Learning Curve:** Low — simple distance and ETA calculations.  
 **Implementation Difficulty:** Low.  
 **Verification:** Easy; deterministic test data.  
 **Maintenance:** Low; changes only if routing API changes.

---

### **SA3.6.3 — AuthenticationService**

**Learning Curve:** Medium — must understand JWTs and middleware pipelines.  
 **Implementation Difficulty:** Medium — integrating with Express or NestJS contexts can be finicky.  
 **Verification:** Moderate; needs end-to-end token validation tests.  
 **Maintenance:** High if security policies evolve or token expiry rules change.

---

## **🟫 Data Layer (Postgres / Prisma)**

### **SA3.3.3 — PrismaClient**

**Learning Curve:** Medium — ORM requires understanding Prisma schema DSL.  
 **Implementation Difficulty:** Low — well-documented, stable API.  
 **Verification:** Easy — integration tests validate migrations.  
 **Maintenance:** Medium — schema migrations require diligence to avoid data loss.

---

### **SA3.3.4 — PostgresDatabase**

**Learning Curve:** Low for SQL, but high for optimization.  
 **Implementation Difficulty:** Medium — complex queries may need tuning.  
 **Verification:** Medium; index coverage and query plans must be reviewed.  
 **Maintenance:** Medium — ongoing tuning as data volume grows.

---

## **🗄️ Data Schemas Risks Summary**

| Schema | Main Risk | Reason |
| ----- | ----- | ----- |
| **DS1.1 — quote\_history** | Medium | Large volume; write-heavy load may cause index bloat. |
| **DS1.2 — fare\_trend\_bucket** | Low | Small, predictable; risk only from schema drift. |
| **DS1.3 — fare\_trend\_summary** | Medium | Materialized view refresh complexity. |
| **DS1.5 — route\_stats\_meta** | Low | Minimal maintenance risk. |
| **DS1.6 — trend\_cache** | Medium | Redis eviction or inconsistency between cache and DB. |
| **DS1.7 — outlier\_policy** | Low | Optional; rarely modified. |
| **DS1.8 — users** | High | Sensitive PII and authentication tokens—security compliance required. |

---

## **🧰 Technologies Risks**

| Tech Label | Technology | Risk Level | Explanation |
| ----- | ----- | ----- | ----- |
| **T1** | **TypeScript (Frontend \+ Backend)** | Low | Mature and familiar, but strict typing enforcement may slow onboarding. |
| **T2** | **React (UI Rendering)** | Medium | Steep learning curve for state and hook management. |
| **T3** | **Node.js / Express (Backend Runtime)** | Low | Mature, but async error propagation must be handled carefully. |
| **T4** | **PostgreSQL 15** | Medium | Requires tuning for analytics queries; schema migrations can cause downtime. |
| **T5** | **Prisma ORM** | Low | Easy to use; risk lies in keeping schema.prisma in sync with DB. |
| **T6** | **Redis (Cache)** | Medium | Requires operational monitoring; data loss on restart if not persisted. |
| **T7** | **JWT Auth / Passport.js** | Medium | Security and token expiration edge cases. |
| **T8** | **Docker / Kubernetes** | High | Complex deployment; networking and resource scaling require DevOps skill. |
| **T9** | **Mermaid / Diagrams** | Low | Visualization only; negligible implementation risk. |

---

## **🔧 Cross-Cutting Risks and Recommendations**

1. **Time Synchronization Risk:**  
    Since pricing analytics depend on local time grouping, mismatched client/server timezones could corrupt aggregation.  
    → *Mitigation:* Always normalize timestamps to UTC and store timezone explicitly.

2. **Cache Consistency Risk:**  
    Cache entries in Redis may become stale after DB updates.  
    → *Mitigation:* Add invalidation hooks to `FareTrendAggregator`.

3. **Data Volume Growth:**  
    High-frequency quote ingestion can cause large table growth.  
    → *Mitigation:* Implement rolling purges (`purgeOlderThan`) and partitioning.

4. **Testing Complexity:**  
    Integration testing across async front/back pipelines is non-trivial.  
    → *Mitigation:* Use end-to-end test harnesses and synthetic data generators.

5. **Skill Gap Risk:**  
    Developers unfamiliar with TypeScript \+ Prisma \+ Redis triad may initially struggle.  
    → *Mitigation:* Provide onboarding workshops and shared dev environment templates.

---

## **✅ Summary**

Overall project completion risk is **Moderate (3/5)**:

* **Frontend:** Manageable complexity with well-defined components.

* **Backend:** Heavier analytical and scheduling logic introduces concurrency and verification risks.

* **Database:** Schema and migration management need discipline but are low risk once stabilized.

* **Operations:** Deployment and caching carry the highest ongoing maintenance risk.

In summary: most risks stem not from language difficulty, but from *integration correctness*, *data freshness*, and *long-term schema evolution*.  
 Once early prototypes stabilize, the overall technical debt curve is expected to flatten quickly with proper test coverage and CI/CD automation.

**Excellent — here’s a full Security and Privacy section for your *Rider Fare Trend Experience & Analytics System* design document, written in clear, formal English prose and consistent with your prior architecture, class, and data schema specifications.**  
 **It follows the exact structure required by your assignment rubric.**

---

# **🔐 Security and Privacy**

**This section describes the security responsibilities, data access controls, auditing procedures, and privacy policies of the *Rider Fare Trend Experience System*.**  
 **It ensures that both internal and customer-facing data practices align with ethical and legal standards, including proper handling of Personally Identifiable Information (PII) such as user email addresses, authentication tokens, and location coordinates.**

---

## **🧩 1\. Security Responsibilities by Storage Unit**

**Each unit of long-term storage in the system (database tables, cache layers, and backups) has explicitly assigned security ownership.**  
 **The following individuals or roles are responsible for maintaining, auditing, and protecting each storage resource.**

| Storage Unit / Database | Responsible Person / Role | Security Responsibility |
| ----- | ----- | ----- |
| **PostgreSQL (Primary Database)** | **Database Administrator (DBA): *Yueyan Wu (INI MSIN)*** | **Ensures encryption at rest, manages database credentials, controls schema-level access.** |
| **Redis Cache (TrendCache)** | **Backend Engineer (Analytics Lead): *\[Name Placeholder – System Engineer\]*** | **Configures access control lists (ACLs), monitors key expiration, and secures Redis instances from public exposure.** |
| **Prisma ORM Layer** | **Full-Stack Developer: *Rider Analytics Team Member*** | **Implements secure connection strings using environment variables and role-based secrets.** |
| **User Authentication Store (`users` table)** | **Security Engineer (Identity Management): *\[Name Placeholder\]*** | **Maintains password-hash algorithms, token validity, and periodic security audits.** |
| **Quote History and Fare Trend Data (`quote_history`, `fare_trend_bucket`)** | **Data Engineer (Analytics): *\[Name Placeholder\]*** | **Ensures anonymization of personally identifiable route data and compliance with GDPR data minimization principles.** |
| **Application Logs and API Access Logs** | **Site Reliability Engineer (SRE): *\[Name Placeholder\]*** | **Enforces log rotation, sensitive field redaction, and secure centralized log storage.** |

**Explanation:**  
 **Each data domain has a designated steward. Their combined responsibility is to guarantee that no sensitive information (user identity, route data, or JWT tokens) is exposed through unencrypted connections or insecure storage.**

---

## **🧑‍💼 2\. Security Officer for Audit Oversight**

**The overall Security Officer responsible for verifying compliance with organizational security standards is:**

**Security and Compliance Officer: *Dr. Mei-Ling Zhang (Chief Security Officer, INI Systems Group)***  
 **Responsibilities:**

* **Conduct quarterly audits of database access logs and authentication tokens.**

* **Approve access change requests and revoke credentials as needed.**

* **Oversee compliance with institutional data protection policies and applicable privacy laws (FERPA, GDPR-equivalent).**

**All individuals with database or API-level access are subject to this officer’s audit authority.**

---

## **📜 3\. Customer-Visible Privacy Policy**

### **3.1 Policy Statement**

**“We collect location and fare estimation data to improve rider experience and provide historical fare insights. We do not share your personal identity, contact information, or detailed trip history with any third parties. All data is anonymized and stored securely.”**

### **3.2 Display and Acceptance**

* **The privacy policy is shown on first login and whenever a user updates their application.**

* **Users must accept the privacy policy via a consent checkbox before the first API request that includes their location data.**

* **A link to the full policy is available in the footer of the mobile and web application (“Privacy & Data Use”).**

**Explanation:**  
 **The policy clearly informs users how their route and pricing data are used. Consent is explicit, and users can withdraw consent at any time by disabling data collection in settings.**

---

## **🛡️ 4\. Access Control and Authorization Policies**

### **4.1 Policy for Access to PII**

**Access to PII (e.g., email, user ID, JWT tokens) follows a strict Role-Based Access Control (RBAC) model.**

| Role | PII Access Level | Duration | Approval Required |
| ----- | ----- | ----- | ----- |
| **Security Officer** | **Full** | **Continuous** | **Institutional mandate** |
| **Backend Engineer (Auth Module)** | **Partial (hashed tokens only)** | **Temporary (while debugging auth)** | **Yes** |
| **Database Administrator (DBA)** | **Limited (masked email only)** | **Continuous** | **Yes** |
| **Frontend Developer** | **None** | **N/A** | **Not permitted** |
| **Analytics Engineer** | **None** | **N/A** | **Data anonymized before use** |

**Explanation:**  
 **Each role is restricted to the minimum level of access required for their work.**  
 **Temporary access (for debugging or incident response) must be approved by the Security Officer and logged in the access audit table.**

---

## **🧾 5\. Auditing Procedures and Data Structures**

**The system maintains an audit log for all operations involving PII access, both routine and exceptional.**

### **5.1 Routine Audit Logging**

* **Every access to the `users` table, `quote_history`, or JWT verification endpoint is logged with:**

  * **Timestamp (`TIMESTAMPTZ`)**

  * **Actor (user ID or service name)**

  * **Access type (`READ`, `WRITE`, `DELETE`)**

  * **IP address and request origin**

  * **Access justification or session context**

### **5.2 Non-Routine Access Logging**

* **Manual or emergency database access (via SQL console or admin interface) triggers:**

  * **Mandatory justification comment**

  * **Email alert to the Security Officer**

  * **Immutable log entry in `audit_access_log` table**

### **5.3 Data Structures**

**Audit Table: `audit_access_log`**

| Column | Type | Description |
| ----- | ----- | ----- |
| **`audit_id`** | **`UUID`** | **Unique audit event identifier** |
| **`actor_id`** | **`UUID`** | **ID of the accessing user or system** |
| **`resource`** | **`VARCHAR(128)`** | **Table or endpoint accessed** |
| **`operation`** | **`VARCHAR(16)`** | **e.g., READ, UPDATE** |
| **`timestamp`** | **`TIMESTAMPTZ`** | **Time of access** |
| **`reason`** | **`TEXT`** | **Access justification** |
| **`status`** | **`VARCHAR(16)`** | **SUCCESS, DENIED, ERROR** |

**Explanation:**  
 **This audit table provides traceability for all sensitive access.**  
 **Only the Security Officer and DBA may view full audit logs, and logs are retained for 24 months under institutional data retention policy.**

---

## **🧒 6\. Handling of Minors’ Data**

### **6.1 Policy on Collecting PII from Minors**

* **The system does not solicit or knowingly store PII from users under the age of 18\.**

* **Registration requires email verification with an age confirmation step (“I am at least 18 years old”).**

### **6.2 Guardian Consent**

* **If future product features ever require minor accounts (e.g., for family rides), the system will require guardian verification and digital consent before data collection.**

### **6.3 Policy for Preventing Access by Individuals with Abuse Records**

* **Background checks are required for all personnel with administrative access to user or route data.**

* **Employment and access are denied to anyone convicted or suspected of child abuse, in compliance with U.S. state and federal law.**

* **Annual re-verification of clearance is conducted by the Human Resources department.**

**Explanation:**  
 **These policies align with CMU’s institutional ethical standards for data handling and with standard global privacy frameworks such as COPPA and GDPR Article 8\.**

---

## **🔒 7\. Data Protection and Encryption**

* **At Rest: All PostgreSQL tables containing PII (`users`, `quote_history`) use AES-256 encryption.**

* **In Transit: HTTPS/TLS 1.3 is enforced for all API communications.**

* **In Application: JWT tokens are signed with RS256 and stored in memory only during session lifetime.**

* **In Logs: Sensitive fields (tokens, coordinates) are redacted before persistence.**

**Explanation:**  
 **This layered encryption ensures that even if a single system is compromised, decrypted PII remains inaccessible without multiple layers of key authorization.**

---

## **🧭 8\. Verification and Compliance**

* **Quarterly Security Review: Conducted by Security Officer.**

* **Penetration Testing: Performed biannually to detect vulnerabilities in API endpoints.**

* **Code Review: All pull requests that touch authentication or data schemas require dual review by a senior engineer.**

* **Backup Policy: Encrypted daily backups of PostgreSQL are kept in secure cloud storage with limited access (Security Officer \+ DBA).**

**Explanation:**  
 **These ongoing verification activities ensure that both privacy and security practices are not static, but continuously monitored and improved as the system evolves.**

---

## **✅ Summary**

* **Security Ownership: Clearly assigned for each storage unit (DBA, Security Officer, Backend Engineer, etc.).**

* **Privacy Policy: Transparent, customer-facing, and consent-based.**

* **Access Control: Role-based and auditable.**

* **Auditing: Comprehensive logging with retention and review procedures.**

* **Minor Protection: No minor data collected; strict personnel background requirements.**

* **Compliance: Encryption, access control, and institutional audits maintain long-term data safety.**  


[image1]: <data:image/png;base64,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>

[image2]: <data:image/png;base64,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>

[image3]: <data:image/png;base64,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>

[image4]: <data:image/png;base64,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>

[image5]: <data:image/png;base64,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>

[image6]: <data:image/png;base64,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>

[image7]: <data:image/png;base64,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>

[image8]: <data:image/png;base64,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>
