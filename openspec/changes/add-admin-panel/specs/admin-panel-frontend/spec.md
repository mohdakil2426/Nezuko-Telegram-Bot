## ADDED Requirements

### Requirement: Dashboard Page
The system SHALL provide a dashboard home page with real-time statistics as defined in `docs/admin-panel/05a-PAGE-WIREFRAMES.md`.

#### Scenario: Dashboard load
- **WHEN** authenticated admin navigates to /
- **THEN** dashboard displays stat cards, activity feed, and quick actions

#### Scenario: Stats display
- **WHEN** dashboard loads
- **THEN** stat cards show: Protected Groups, Enforced Channels, Verifications Today, Success Rate

---

### Requirement: Groups Management UI
The system SHALL provide a groups management interface.

#### Scenario: Groups list page
- **WHEN** admin navigates to /groups
- **THEN** paginated table displays all protected groups with search and filters

#### Scenario: Group details page
- **WHEN** admin clicks on a group
- **THEN** detail page shows group info, linked channels, and verification stats

#### Scenario: Group settings edit
- **WHEN** admin edits group settings and saves
- **THEN** settings are updated via API
- **AND** success toast is shown

---

### Requirement: Channels Management UI
The system SHALL provide a channels management interface.

#### Scenario: Channels list page
- **WHEN** admin navigates to /channels
- **THEN** paginated table displays all enforced channels

#### Scenario: Add channel dialog
- **WHEN** admin clicks "Add Channel" button
- **THEN** dialog appears for entering channel ID or @username

---

### Requirement: Configuration UI
The system SHALL provide a configuration interface as defined in `docs/admin-panel/05a-PAGE-WIREFRAMES.md`.

#### Scenario: Configuration page tabs
- **WHEN** admin navigates to /config
- **THEN** tabbed interface shows: General, Messages, Webhook sections

#### Scenario: Message template editing
- **WHEN** admin edits welcome message template
- **THEN** template variables ({{username}}, {{group}}) are highlighted

---

### Requirement: Database Browser UI
The system SHALL provide a database inspection interface.

#### Scenario: Table browser
- **WHEN** admin navigates to /database
- **THEN** sidebar shows all database tables with row counts

#### Scenario: Table data view
- **WHEN** admin selects a table
- **THEN** paginated data grid shows table contents

---

### Requirement: Analytics Dashboard UI
The system SHALL provide analytics visualization as defined in `docs/admin-panel/05a-PAGE-WIREFRAMES.md`.

#### Scenario: Analytics page
- **WHEN** admin navigates to /analytics
- **THEN** charts display: user growth, verification trends, success rates

#### Scenario: Date range selection
- **WHEN** admin selects date range
- **THEN** charts update with filtered data

---

### Requirement: Settings Pages UI
The system SHALL provide admin settings management.

#### Scenario: Admin management (Owner only)
- **WHEN** owner navigates to /settings/admins
- **THEN** admin users table is displayed with role management

#### Scenario: Audit logs
- **WHEN** admin navigates to /settings/audit
- **THEN** filterable audit log table is displayed

---

### Requirement: Design System
The system SHALL use shadcn/ui components with consistent styling as defined in `docs/admin-panel/05-UI-WIREFRAMES.md`.

#### Scenario: Dark mode support
- **WHEN** user toggles theme
- **THEN** entire UI switches between light and dark mode
- **AND** preference is persisted

#### Scenario: Responsive layout
- **WHEN** user views on mobile device
- **THEN** sidebar collapses to hamburger menu
- **AND** content adapts to screen size

#### Scenario: Loading states
- **WHEN** data is being fetched
- **THEN** skeleton placeholders are shown

#### Scenario: Error states
- **WHEN** API request fails
- **THEN** error message with retry button is shown
