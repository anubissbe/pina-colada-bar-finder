# Google Places API Research Findings

## Overview
The Google Places Library in Maps JavaScript API enables searching for places within defined areas. The Manus proxy provides full access to all Google Maps features including Places API without requiring API keys.

## Key Search Methods

### 1. Nearby Search
- Method: `PlacesService.nearbySearch(request, callback)`
- Best for: Finding places within a specific radius of a location
- Required parameters:
  - `location`: google.maps.LatLng object (user's coordinates)
  - `radius`: integer in meters (max 50,000m)
- Optional parameters:
  - `keyword`: Search term (e.g., "piña colada", "cocktail")
  - `type`: Place type (e.g., "bar")
  - `openNow`: boolean to filter open establishments
  - `rankBy`: PROMINENCE (default) or DISTANCE

### 2. Text Search
- Method: `PlacesService.textSearch(request, callback)`
- Best for: Searching based on text queries
- Required: `query` parameter (e.g., "bars with piña colada near me")
- Optional: location bias, radius, bounds

## Implementation Strategy for Piña Colada Bar Finder

1. **Get user location** via browser Geolocation API
2. **Use nearbySearch()** with:
   - `location`: user's coordinates
   - `radius`: 5000m (5km) initially
   - `type`: "bar"
   - `keyword`: "piña colada" OR "cocktail"
3. **Display results** on Google Map with markers
4. **Show details** on marker click using PlaceResult data

## Place Result Data
Each result includes:
- name
- formatted_address
- geometry.location (lat/lng)
- place_id
- rating
- opening_hours
- photos
- types

## Frontend Implementation
- Use MapView component from `client/src/components/Map.tsx`
- Initialize PlacesService in onMapReady callback
- All Google Maps JavaScript API features work through Manus proxy
