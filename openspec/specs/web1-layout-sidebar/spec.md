## ADDED Requirements

### Requirement: Collapsible Sidebar Navigation

The system SHALL implement a sidebar using shadcn `sidebar-07` pattern that collapses to icon-only mode.

#### Scenario: Sidebar renders in expanded state

- **WHEN** the dashboard loads on desktop viewport (>1024px)
- **THEN** sidebar displays with full text labels
- **AND** navigation items show icon + text

#### Scenario: Sidebar collapses to icons

- **WHEN** user clicks the collapse trigger
- **THEN** sidebar collapses to icon-only mode
- **AND** text labels are hidden
- **AND** tooltips appear on hover

### Requirement: Mobile Sheet Navigation

The system SHALL provide a Sheet-based navigation drawer for mobile viewports.

#### Scenario: Mobile hamburger menu

- **WHEN** viewport is < 1024px
- **THEN** hamburger menu icon is visible in site header
- **AND** desktop sidebar is hidden

#### Scenario: Mobile sheet opens

- **WHEN** user clicks hamburger menu on mobile
- **THEN** Sheet slides in from left
- **AND** displays full navigation including:
  - Logo and brand
  - All navigation items
  - Theme toggle
  - User profile section

#### Scenario: Mobile sheet closes on navigation

- **WHEN** user clicks a navigation item in mobile sheet
- **THEN** sheet closes automatically
- **AND** user is navigated to selected route

#### Scenario: Mobile sheet backdrop

- **WHEN** mobile sheet is open
- **THEN** backdrop overlay is visible
- **AND** clicking backdrop closes sheet

### Requirement: Navigation Menu Items

The system SHALL display the following navigation items in order:

1. Dashboard (icon: LayoutDashboard)
2. Analytics (icon: BarChart3)
3. Groups (icon: Users)
4. Channels (icon: Radio)
5. Settings (icon: Settings)

#### Scenario: Navigation item rendering

- **WHEN** sidebar is rendered
- **THEN** all 5 navigation items are visible
- **AND** each item links to its corresponding route

### Requirement: Active Route Indication

The system SHALL highlight the currently active navigation item.

#### Scenario: Active state on Dashboard

- **WHEN** user is on `/dashboard` route
- **THEN** Dashboard nav item has active styling (background highlight)

#### Scenario: Active state on Groups

- **WHEN** user is on `/dashboard/groups` route
- **THEN** Groups nav item has active styling

### Requirement: User Profile Section

The system SHALL display a user profile section in the sidebar footer.

#### Scenario: User info display

- **WHEN** sidebar is rendered
- **THEN** footer shows:
  - User avatar (placeholder image)
  - User name ("Bot Owner")
  - User email ("owner@nezuko.bot")
  - Dropdown menu trigger

#### Scenario: User dropdown menu

- **WHEN** user clicks the profile dropdown trigger
- **THEN** menu appears with options:
  - Profile
  - Settings
  - Log out

### Requirement: Theme Toggle

The system SHALL include a theme toggle for dark/light mode.

#### Scenario: Theme toggle in sidebar

- **WHEN** sidebar is rendered
- **THEN** theme toggle button is visible (Sun/Moon icon)

#### Scenario: Theme switching

- **WHEN** user clicks theme toggle
- **THEN** theme switches between light and dark
- **AND** preference is persisted in localStorage

### Requirement: Site Header

The system SHALL display a site header within the sidebar inset area.

#### Scenario: Header content

- **WHEN** any dashboard page is loaded
- **THEN** header displays:
  - Sidebar toggle button (mobile)
  - Breadcrumb showing current location
  - Page title

### Requirement: SidebarProvider Wrapper

The system SHALL wrap the dashboard layout with SidebarProvider for state management.

#### Scenario: Provider configuration

- **WHEN** dashboard layout is rendered
- **THEN** SidebarProvider wraps all content
- **AND** sidebar state (open/collapsed) is managed centrally

### Requirement: Logo and Branding

The system SHALL display the Nezuko logo in the sidebar header.

#### Scenario: Logo display

- **WHEN** sidebar is rendered
- **THEN** header shows:
  - Nezuko icon/logo
  - "Nezuko" text (hidden when collapsed)
