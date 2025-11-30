# Project TODO

- [x] Research and integrate Google Places API for bar search
- [x] Create database schema for storing favorite bars
- [x] Implement backend procedures for searching bars
- [x] Implement backend procedures for managing favorites
- [x] Build frontend with browser geolocation detection
- [x] Integrate Google Maps component
- [x] Implement bar search functionality with piña colada filter
- [x] Display bars as markers on map
- [x] Show bar details on marker click
- [x] Add ability to save favorite bars
- [x] Test geolocation on different browsers
- [x] Test map functionality and marker interactions
- [x] Test bar search with real locations

## New Feature: Search Filters

- [x] Add filter UI components (price, rating, distance sliders/selects)
- [x] Implement client-side filtering logic for search results
- [x] Add filter state management
- [x] Update search to respect filter parameters
- [x] Test filter functionality with various combinations
- [x] Ensure filters persist during map interactions

## Search Accuracy Improvements

- [x] Enhance search keywords to target tropical/cocktail bars
- [x] Add user verification system (report if bar doesn't serve piña coladas)
- [x] Add disclaimer about search results
- [x] Implement user-contributed verification badges
- [x] Add ability for users to confirm/deny piña colada availability

## Verified Only Filter

- [x] Add toggle switch for "Verified Only" filter
- [x] Fetch verification stats for all bars in search results
- [x] Filter bars based on verification threshold (minimum votes and percentage)
- [x] Update UI to show filter status and count
- [x] Add visual indicators for verified bars in list view

## Open Now Filter

- [x] Add toggle switch for "Open Now" filter
- [x] Capture opening hours data from Google Places API
- [x] Filter bars based on current open status
- [x] Display open/closed status in bar details
- [x] Update filter UI to show open now status
