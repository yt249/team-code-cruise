# CodeCruise Project Postmortem

**Team Code Cruise** | Watson Chao, Yena Wu, Christy Tseng

---

## Problem Summary

CodeCruise is a full-stack ride-sharing application designed for budget-conscious riders who want affordable transportation without sacrificing convenience. The project implements two core user stories: a complete ride booking flow that allows users to enter pickup and destination locations, request rides, track their assigned driver, and complete payment; and an advertisement-based discount system where riders can watch 30-60 second ads before booking in exchange for 10-15% off their fare. This dual approach serves users who prioritize savings over speed while enabling a sustainable business model through ad monetization.

The application was built with a React frontend and Node.js/TypeScript backend, deployed entirely on AWS infrastructure. Our target users are everyday commuters and travelers who appreciate the option to trade a small amount of time for meaningful cost savings on their rides.

---

## Technical Accomplishments

The CodeCruise application delivers a comprehensive feature set that mirrors core functionality found in production ride-sharing services. User authentication is handled through JWT tokens with secure password hashing, enabling persistent sessions and protected API endpoints. The ride matching system uses the Haversine formula to calculate geographic distances between drivers and riders, automatically assigning the nearest available driver within a 15-kilometer radius. Our advertisement discount system enforces business rules including a three-hour cooldown between ad views and a maximum of three ads per user per day, preventing abuse while maintaining the incentive structure. Payment processing follows a two-step flow with intent creation and confirmation, and Google Maps integration provides accurate routing, distance calculations, and ETA estimates.

Our architecture separates concerns across clearly defined layers. The frontend uses React 19 with Vite for fast development builds, employing the Context API across three providers for authentication, booking, and advertisement state management. Ten distinct UI components handle everything from the landing page through trip completion. The backend follows a layered architecture pattern with controllers handling HTTP requests, services containing business logic, and repositories abstracting database access. This monolithic Express.js application was refactored into 15 independent AWS Lambda functions for production deployment, each handling specific API endpoints behind API Gateway. PostgreSQL with PostGIS extensions supports geospatial queries in production, while an in-memory database enables rapid local development without external dependencies.

Testing coverage meets professional standards with 50 backend unit tests achieving over 80% coverage on core services including RideService and DiscountService. The frontend includes 31 unit tests covering the API integration layer for rides and advertisements. Twenty-one integration tests run against the deployed production API to verify end-to-end functionality. Four GitHub Actions workflows automate our CI/CD pipeline: separate workflows for backend and frontend unit tests, integration tests against the cloud deployment, and automatic Lambda function deployment when backend code changes on the main branch.

The deployment stack leverages AWS services throughout. AWS Amplify hosts the frontend with automatic deployments triggered by commits to the main branch. The backend runs as serverless Lambda functions behind API Gateway, eliminating server management overhead. AWS RDS provides managed PostgreSQL hosting with automated backups. This serverless architecture scales automatically with demand while minimizing operational costs during low-usage periods.

---

## Team Workflow

Our three-person team adopted a mixed-roles approach where Watson, Yena, and Christy each contributed across frontend development, backend implementation, and AWS deployment rather than siloing into specialized areas. This cross-functional collaboration helped team members understand the full system while providing flexibility when workloads shifted between different project phases.

We did not utilize feature branches until Project 6, instead working primarily on the main branch during earlier development phases. While this simplified our workflow initially, it occasionally created merge conflicts and made it harder to isolate work-in-progress features. Regular team syncs kept everyone aligned on priorities and blockers. Looking back, we recognize that adopting a proper feature-branch workflow from the start would have improved our collaboration and code quality, and we plan to implement this practice in future projects.

---

## Bottlenecks & Failures

Several significant challenges emerged during development that caused delays and required course corrections. Figma's free version imposed token limits that produced poor-quality UI designs, forcing us to abandon that approach and pivot to LLM-generated CSS styling instead. While this ultimately produced a polished dark theme with yellow accents, it represented wasted early effort on the design tool.

The most time-consuming challenge was converting our monolithic Express backend into 15 separate Lambda functions for AWS deployment. This refactoring generated numerous path and import errors as code that worked together in one process needed careful separation. Debugging these issues consumed substantial development time and required multiple iterations to resolve all the dependency and configuration problems.

Environment variable confusion between Vite's development and production configurations caused a particularly frustrating bug where the deployed frontend continued calling localhost instead of the production API. Understanding the distinction between build-time and runtime environment variables in the Vite/Amplify ecosystem required investigation and multiple deployment attempts to resolve.

Our mid-project migration from Vitest to Jest unified our testing framework but required significant configuration rework across both frontend and backend, including handling JSX transformation requirements. AWS deployment debugging overall consumed more time than anticipated, with issues spanning Lambda function paths, API Gateway integration setup, and CORS configuration.

---

## LLM Usage Analysis

Large language models proved highly effective for specific categories of tasks throughout our development process across multiple project phases.

**P4 Backend Development:** The LLM excelled at generating the complete backend architecture from scratch. Starting from user story requirements, it produced the layered architecture with controllers, services, and repositories. The RideService, QuoteService, MatchingService, and PaymentService were all generated with minimal bugs. The P4 chat log shows approximately 3,800 backend-related prompts, though many were simple file operations. Key accomplishments included implementing the Haversine distance algorithm for driver matching, JWT authentication flow, and the advertisement discount system with eligibility rules. The integration between frontend Context providers and backend APIs required approximately 30-40 iterations to get data transformations correct (coordinate formats, currency conversions, status mappings).

**P4 Frontend Styling:** The dark theme transformation demonstrated LLM efficiency at scale. Approximately 20 prompt iterations updated all 9 CSS files to implement a cohesive dark theme with yellow accents, Space Grotesk font, and glow effects. The LLM also integrated Google Maps JavaScript API with Places Autocomplete and Directions API, requiring 10-15 iterations to handle asynchronous loading and callback initialization properly.

**P6 Lambda Refactoring:** Converting the monolithic Express backend into 15 separate Lambda functions proved the most challenging LLM task. Initial attempts generated handlers with incorrect require paths that assumed the original project structure. Each handler needed its own copy of shared utilities (db.js, auth.js, response.js), and the LLM initially missed this requirement. The refactoring consumed approximately 40-50 prompt iterations across multiple sessions, with many debugging cycles to resolve module resolution errors. The deployment scripts for AWS CLI commands worked well on first attempts, but integrating Lambda with API Gateway required additional iterations for CORS headers and integration response mapping.

**P6 Testing:** Unit test generation became fast and accurate once we provided clear specifications. Jest migration required 15-20 iterations to configure SWC for TypeScript/JSX transformation without Babel. Test specification validation needed 3-4 iterations after discovering the LLM initially generated incorrect expected values for utility functions like encodeTime and encodeRandom.

**Overall Effectiveness Assessment:**
- Very effective: Backend API logic, CSS styling, unit test generation, AWS CLI commands, documentation generation
- Moderately effective: Frontend-backend integration, API Gateway setup
- Less effective: Complex multi-file refactoring (Lambda split), UI design generation (Figma limitations)

When LLM outputs were incorrect or confusing, we developed strategies for improvement. Test specifications initially contained wrong expected values; explicit correction prompts with actual function behavior fixed these issues. Lambda refactoring used incorrect require paths initially; we debugged locally, identified the correct directory structure, and re-prompted with explicit path requirements. Environment variable handling for Vite/Amplify initially missed the distinction between build-time and runtime variables, requiring us to research the tooling and provide context in follow-up prompts. For the ad video player integration, the LLM suggested multiple approaches before we settled on using HTML5 video with timeUpdate events for progress tracking.

---

## Lessons Learned

Reflecting on our development process, several practices would change if starting again. We would abandon the approach of generating comprehensive development specifications upfront, instead focusing directly on gathering requirements from user stories and building incrementally. Starting with feature branches from day one would improve code isolation and review practices. Designing the Lambda architecture before building a monolithic backend would have saved the painful refactoring effort. Using production environment configuration consistently from the start would have prevented deployment surprises.

Best practices we plan to adopt in future software projects include consistent feature branch development with code reviews, sprint planning with clear task breakdowns and priorities, early and frequent deployment testing rather than waiting until the end, and selecting a unified testing framework from project inception rather than migrating mid-development.

---

## Future Work

Several features would enhance CodeCruise if development continued. Price trend predictions using machine learning could help riders identify optimal booking times for lower fares. A shared ride option would allow multiple riders heading in similar directions to split costs. A companion driver-side application would complete the platform by letting drivers accept rides, navigate to pickups, and manage their availability. Native mobile applications built with React Native would improve the user experience beyond web browsers. Real-time driver tracking using WebSocket connections would provide live location updates rather than polling-based refreshes, creating a more responsive and engaging experience for riders awaiting their pickup.
