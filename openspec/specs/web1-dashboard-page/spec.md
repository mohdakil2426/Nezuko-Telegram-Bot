## ADDED Requirements

### Requirement: Dashboard Statistics Cards

The system SHALL display 4 stat cards at the top of the dashboard showing key metrics.

#### Scenario: Stat cards rendering

- **WHEN** dashboard page loads
- **THEN** 4 cards are displayed in a responsive grid:
  - Total Groups (with count and change indicator)
  - Active Channels (with count and change indicator)
  - Verifications Today (with count and change indicator)
  - Success Rate (with percentage and change indicator)

#### Scenario: Stat card structure

- **WHEN** a stat card is rendered
- **THEN** it contains:
  - Card title (muted text)
  - Primary value (large number)
  - Change indicator (up/down arrow with percentage)
  - Appropriate icon

### Requirement: Verification Trends Chart

The system SHALL display an interactive area chart showing verification trends over time.

#### Scenario: Chart rendering

- **WHEN** dashboard page loads
- **THEN** area chart is displayed below stat cards
- **AND** chart shows 30 days of verification data

#### Scenario: Chart interactivity

- **WHEN** user hovers over chart
- **THEN** tooltip displays date and values

#### Scenario: Time range filter

- **WHEN** chart is rendered
- **THEN** time range selector is available (7d, 30d, 90d)
- **AND** chart updates when range changes

### Requirement: Chart Data Series

The system SHALL display two data series in the verification chart.

#### Scenario: Data series display

- **WHEN** chart is rendered
- **THEN** it shows:
  - Verified users (primary color gradient fill)
  - Restricted users (secondary color)

### Requirement: Recent Activity Feed

The system SHALL display a list of recent system activity.

#### Scenario: Activity feed rendering

- **WHEN** dashboard page loads
- **THEN** activity feed table/list is displayed
- **AND** shows last 10 activities

#### Scenario: Activity item structure

- **WHEN** an activity item is rendered
- **THEN** it shows:
  - Activity type icon
  - Description text
  - Timestamp (relative, e.g., "2 minutes ago")

### Requirement: Dashboard Page Layout

The system SHALL organize dashboard content in a clear visual hierarchy.

#### Scenario: Layout structure

- **WHEN** dashboard page is rendered
- **THEN** content is organized as:
  1. Page header with title "Dashboard"
  2. Stat cards grid (2x2 on mobile, 4x1 on desktop)
  3. Verification trends chart (full width)
  4. Recent activity section

### Requirement: Loading States

The system SHALL display skeleton loaders while data is loading.

#### Scenario: Initial load skeletons

- **WHEN** dashboard is loading data
- **THEN** skeleton placeholders appear for:
  - Stat cards (4 skeleton cards)
  - Chart area (skeleton rectangle)
  - Activity list (skeleton rows)

### Requirement: Responsive Grid

The system SHALL use responsive grid layouts for different screen sizes.

#### Scenario: Mobile layout

- **WHEN** viewport is < 768px
- **THEN** stat cards display in 2-column grid

#### Scenario: Desktop layout

- **WHEN** viewport is >= 1024px
- **THEN** stat cards display in 4-column grid
