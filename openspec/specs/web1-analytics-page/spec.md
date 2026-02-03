## ADDED Requirements

### Requirement: Analytics Page Tabs

The system SHALL organize analytics into tabs for different metric categories.

#### Scenario: Tab navigation

- **WHEN** analytics page loads
- **THEN** tabs are displayed:
  - Overview (default active)
  - Verifications
  - Users

#### Scenario: Tab switching

- **WHEN** user clicks a tab
- **THEN** corresponding content panel is shown
- **AND** tab has active styling

### Requirement: Overview Tab Metrics Cards

The system SHALL display key metrics on the Overview tab.

#### Scenario: Metrics cards

- **WHEN** Overview tab is active
- **THEN** cards display:
  - Total Verifications (with trend)
  - Success Rate (percentage)
  - Avg Response Time (ms)
  - Active Groups (count)

### Requirement: Verification Trends Chart

The system SHALL display verification trends as an area chart.

#### Scenario: Verification chart

- **WHEN** Verifications tab is active
- **THEN** area chart shows:
  - Successful verifications (line)
  - Failed verifications (line)
  - Stacked area fill

### Requirement: Time Period Selector

The system SHALL allow filtering analytics by time period.

#### Scenario: Period selection

- **WHEN** analytics page is rendered
- **THEN** time period selector shows options:
  - Last 7 days
  - Last 30 days
  - Last 90 days

#### Scenario: Period change

- **WHEN** user selects a different period
- **THEN** all charts and metrics update accordingly

### Requirement: Success Rate Radial Chart

The system SHALL display success rate as a radial/gauge chart.

#### Scenario: Radial chart

- **WHEN** Overview tab is active
- **THEN** radial chart shows:
  - Success percentage in center
  - Visual arc representing success vs failure

### Requirement: User Growth Chart

The system SHALL display user growth over time.

#### Scenario: User growth chart

- **WHEN** Users tab is active
- **THEN** line chart shows:
  - New users per day
  - Cumulative total users

### Requirement: Chart Cards Container

The system SHALL wrap charts in Card components for consistent styling.

#### Scenario: Chart card structure

- **WHEN** a chart is rendered
- **THEN** it is wrapped in Card with:
  - CardHeader with title
  - CardDescription (optional)
  - CardContent with chart

### Requirement: Analytics Page Layout

The system SHALL organize content in clear sections.

#### Scenario: Layout structure

- **WHEN** analytics page is rendered
- **THEN** layout shows:
  1. Page header with title "Analytics"
  2. Time period selector (right-aligned)
  3. Tabs navigation
  4. Tab content area with charts/metrics

### Requirement: Chart Tooltips

The system SHALL display tooltips on chart hover.

#### Scenario: Tooltip display

- **WHEN** user hovers over chart data point
- **THEN** tooltip shows:
  - Date/time
  - Value(s) for that point
  - Formatted numbers

### Requirement: Loading States

The system SHALL display skeletons while analytics load.

#### Scenario: Analytics loading

- **WHEN** analytics data is loading
- **THEN** skeleton placeholders appear for:
  - Metric cards
  - Chart areas

### Requirement: Responsive Chart Layout

The system SHALL arrange charts responsively.

#### Scenario: Desktop layout

- **WHEN** viewport >= 1024px
- **THEN** charts display in 2-column grid where appropriate

#### Scenario: Mobile layout

- **WHEN** viewport < 768px
- **THEN** charts stack vertically (full width)
