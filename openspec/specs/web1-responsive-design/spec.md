## ADDED Requirements

### Requirement: Mobile-First Approach

The system SHALL use mobile-first CSS with progressive enhancement for larger screens.

#### Scenario: Base styles are mobile

- **WHEN** CSS is written
- **THEN** base styles target mobile viewport
- **AND** breakpoint modifiers add desktop styles (`sm:`, `md:`, `lg:`, `xl:`)

### Requirement: Responsive Breakpoints

The system SHALL use Tailwind v4 standard breakpoints consistently.

#### Scenario: Breakpoint definitions

- **WHEN** responsive styles are applied
- **THEN** breakpoints follow:
  - `sm`: 640px (large phones)
  - `md`: 768px (tablets)
  - `lg`: 1024px (laptops)
  - `xl`: 1280px (desktops)

### Requirement: Mobile Sidebar Navigation

The system SHALL use Sheet component for mobile navigation.

#### Scenario: Mobile nav trigger

- **WHEN** viewport is < 1024px
- **THEN** hamburger menu icon is visible in header
- **AND** clicking it opens Sheet with navigation

#### Scenario: Mobile nav content

- **WHEN** mobile Sheet is opened
- **THEN** it displays:
  - Logo and brand
  - All navigation items with icons and labels
  - Theme toggle
  - User profile section
  - Close button

#### Scenario: Desktop sidebar

- **WHEN** viewport is >= 1024px
- **THEN** sidebar is visible inline
- **AND** hamburger icon is hidden

### Requirement: Responsive Stat Cards Grid

The system SHALL display stat cards in responsive grid layout.

#### Scenario: Mobile stat cards

- **WHEN** viewport is < 640px
- **THEN** stat cards display in 1-column layout (stacked)

#### Scenario: Tablet stat cards

- **WHEN** viewport is 640px - 1023px
- **THEN** stat cards display in 2-column grid

#### Scenario: Desktop stat cards

- **WHEN** viewport is >= 1024px
- **THEN** stat cards display in 4-column grid

### Requirement: Responsive Charts

The system SHALL render charts with fluid width and appropriate height.

#### Scenario: Chart container

- **WHEN** chart is rendered
- **THEN** it uses ResponsiveContainer for fluid sizing
- **AND** maintains appropriate aspect ratio

#### Scenario: Mobile chart height

- **WHEN** viewport is < 768px
- **THEN** chart height is reduced (200px)
- **AND** chart remains readable

#### Scenario: Desktop chart height

- **WHEN** viewport is >= 768px
- **THEN** chart height is standard (300-400px)

### Requirement: Responsive Data Tables

The system SHALL adapt data tables for different screen sizes.

#### Scenario: Mobile table behavior

- **WHEN** viewport is < 768px
- **THEN** non-essential columns are hidden
- **AND** table has horizontal scroll enabled
- **AND** essential columns (name, status, actions) remain visible

#### Scenario: Mobile pagination

- **WHEN** viewport is < 768px
- **THEN** pagination shows compact controls
- **AND** page size selector is hidden
- **AND** "X of Y selected" text is hidden

#### Scenario: Desktop table behavior

- **WHEN** viewport is >= 1024px
- **THEN** all columns are visible
- **AND** full pagination controls are shown

### Requirement: Responsive Page Headers

The system SHALL adapt page headers for different screen sizes.

#### Scenario: Mobile page header

- **WHEN** viewport is < 768px
- **THEN** page title uses smaller font size
- **AND** description may be truncated or hidden
- **AND** action buttons stack vertically or use icon-only mode

#### Scenario: Desktop page header

- **WHEN** viewport is >= 768px
- **THEN** full title and description are visible
- **AND** action buttons display with full text

### Requirement: Touch-Friendly Targets

The system SHALL ensure all interactive elements are touch-friendly.

#### Scenario: Minimum touch target

- **WHEN** buttons, links, or controls are rendered
- **THEN** minimum touch target size is 44x44px
- **AND** spacing between targets prevents mis-taps

### Requirement: Responsive Forms

The system SHALL adapt form layouts for different screen sizes.

#### Scenario: Mobile form layout

- **WHEN** viewport is < 768px
- **THEN** form fields stack vertically (full width)
- **AND** labels are above inputs

#### Scenario: Desktop form layout

- **WHEN** viewport is >= 768px
- **THEN** form fields can be in grid layouts
- **AND** inline label + input patterns are used where appropriate

### Requirement: Responsive Card Layouts

The system SHALL adapt card grids for different screen sizes.

#### Scenario: Mobile card layout

- **WHEN** viewport is < 640px
- **THEN** cards display in single column
- **AND** full width with appropriate padding

#### Scenario: Tablet card layout

- **WHEN** viewport is 640px - 1023px
- **THEN** cards display in 2-column grid

#### Scenario: Desktop card layout

- **WHEN** viewport is >= 1024px
- **THEN** cards display in 2-3 column grid as appropriate

### Requirement: Responsive Typography

The system SHALL use fluid typography that adapts to screen size.

#### Scenario: Heading sizes

- **WHEN** headings are rendered
- **THEN** mobile uses smaller font sizes
- **AND** desktop uses larger font sizes
- **Example**: `text-xl md:text-2xl lg:text-3xl`

### Requirement: No Horizontal Overflow

The system SHALL prevent unwanted horizontal scrolling on pages.

#### Scenario: Page width containment

- **WHEN** any page is loaded on mobile
- **THEN** content fits within viewport width
- **AND** no horizontal scrollbar appears (except in designated scroll areas)

### Requirement: Responsive Sidebar Inset

The system SHALL adjust main content area based on sidebar state.

#### Scenario: Mobile content area

- **WHEN** viewport is < 1024px
- **THEN** main content takes full width
- **AND** no space reserved for sidebar

#### Scenario: Desktop content with collapsed sidebar

- **WHEN** sidebar is collapsed on desktop
- **THEN** main content expands to fill available space
- **AND** transition is smooth
