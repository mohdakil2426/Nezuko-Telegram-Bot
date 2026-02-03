## ADDED Requirements

### Requirement: Channels Data Table

The system SHALL display enforced channels in a TanStack React Table with full functionality.

#### Scenario: Table rendering

- **WHEN** channels page loads
- **THEN** data table displays with columns:
  - Checkbox (row selection)
  - Channel Name (sortable)
  - Username (@handle)
  - Subscribers (sortable, right-aligned, formatted number)
  - Linked Groups (count)
  - Status (badge: Active/Inactive)
  - Actions (dropdown menu)

### Requirement: Table Sorting

The system SHALL support column sorting for channels.

#### Scenario: Sort by channel name

- **WHEN** user clicks "Channel Name" column header
- **THEN** rows sort alphabetically by name
- **AND** sort indicator shows direction (asc/desc)

#### Scenario: Sort by subscribers

- **WHEN** user clicks "Subscribers" column header
- **THEN** rows sort numerically by subscriber count

### Requirement: Table Search Filter

The system SHALL support searching/filtering channels by name or username.

#### Scenario: Search filter

- **WHEN** user types in search input
- **THEN** table filters to show only matching channels
- **AND** filter matches both title and @username
- **AND** filter is case-insensitive

### Requirement: Table Pagination

The system SHALL paginate channels list with configurable page size.

#### Scenario: Pagination controls

- **WHEN** channels table is rendered
- **THEN** pagination shows:
  - Current page / total pages
  - Previous/Next buttons
  - Rows per page selector (10, 20, 50)

#### Scenario: Mobile pagination

- **WHEN** viewport is < 768px
- **THEN** pagination shows simplified controls (Prev/Next only)

### Requirement: Row Selection

The system SHALL support single and multi-row selection.

#### Scenario: Select single row

- **WHEN** user clicks row checkbox
- **THEN** row is selected with visual indication

#### Scenario: Select all rows

- **WHEN** user clicks header checkbox
- **THEN** all visible rows are selected

### Requirement: Row Actions Dropdown

The system SHALL provide actions for each channel row.

#### Scenario: Actions menu

- **WHEN** user clicks actions button (three dots)
- **THEN** dropdown menu appears with:
  - View Details
  - Edit Settings
  - Open in Telegram
  - Separator
  - Remove (destructive style)

### Requirement: Status Badge Display

The system SHALL display channel status as a styled badge.

#### Scenario: Active status

- **WHEN** channel is actively enforced
- **THEN** status badge shows "Active" with green styling

#### Scenario: Inactive status

- **WHEN** channel is not actively enforced
- **THEN** status badge shows "Inactive" with muted styling

### Requirement: Column Visibility Toggle

The system SHALL allow hiding/showing columns.

#### Scenario: Column visibility menu

- **WHEN** user clicks "Columns" dropdown
- **THEN** checkbox list of columns appears
- **AND** user can toggle column visibility

### Requirement: Responsive Column Display

The system SHALL hide non-essential columns on smaller viewports.

#### Scenario: Mobile column visibility

- **WHEN** viewport is < 768px
- **THEN** Username and Linked Groups columns are hidden by default
- **AND** horizontal scroll is available for full table

#### Scenario: Tablet column visibility

- **WHEN** viewport is 768px - 1023px
- **THEN** Linked Groups column is hidden by default

### Requirement: Page Header

The system SHALL display a page header with title and actions.

#### Scenario: Header content

- **WHEN** channels page is rendered
- **THEN** header shows:
  - Title: "Enforced Channels"
  - Description: Brief explanation
  - Add Channel button (placeholder)

### Requirement: Empty State

The system SHALL display an empty state when no channels exist.

#### Scenario: No channels

- **WHEN** channels list is empty
- **THEN** table shows centered empty state message
- **AND** suggests adding a channel

### Requirement: Loading State

The system SHALL display skeleton loader while channels load.

#### Scenario: Table loading

- **WHEN** channels data is loading
- **THEN** skeleton rows are displayed
- **AND** skeleton has same column structure as real table

### Requirement: Channel Interface Type

The system SHALL use a typed Channel interface matching API response.

#### Scenario: Channel type definition

- **WHEN** channel data is used
- **THEN** it conforms to Channel interface:
  ```typescript
  interface Channel {
    id: number;
    channelId: number; // Telegram channel ID
    title: string;
    username: string | null; // @username
    inviteLink: string | null;
    subscriberCount: number;
    linkedGroupsCount: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string | null;
  }
  ```
