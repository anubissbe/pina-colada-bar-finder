import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapView } from "@/components/Map";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { MapPin, Heart, Search, Loader2 } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

interface BarResult {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  priceLevel?: number;
  photoUrl?: string;
}

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [bars, setBars] = useState<BarResult[]>([]);
  const [selectedBar, setSelectedBar] = useState<BarResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const { data: favorites, refetch: refetchFavorites } = trpc.favorites.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const addFavoriteMutation = trpc.favorites.add.useMutation({
    onSuccess: () => {
      toast.success("Bar added to favorites!");
      refetchFavorites();
    },
    onError: (error) => {
      toast.error("Failed to add favorite: " + error.message);
    },
  });

  const removeFavoriteMutation = trpc.favorites.remove.useMutation({
    onSuccess: () => {
      toast.success("Bar removed from favorites!");
      refetchFavorites();
    },
    onError: (error) => {
      toast.error("Failed to remove favorite: " + error.message);
    },
  });

  const isFavorite = useCallback(
    (placeId: string) => {
      return favorites?.some((fav) => fav.placeId === placeId) || false;
    },
    [favorites]
  );

  const handleAddFavorite = useCallback(
    (bar: BarResult) => {
      if (!isAuthenticated) {
        toast.error("Please login to save favorites");
        return;
      }
      addFavoriteMutation.mutate({
        placeId: bar.placeId,
        name: bar.name,
        address: bar.address,
        latitude: bar.latitude.toString(),
        longitude: bar.longitude.toString(),
        rating: bar.rating?.toString(),
        priceLevel: bar.priceLevel,
        photoUrl: bar.photoUrl,
      });
    },
    [isAuthenticated, addFavoriteMutation]
  );

  const handleRemoveFavorite = useCallback(
    (placeId: string) => {
      const favorite = favorites?.find((fav) => fav.placeId === placeId);
      if (favorite) {
        removeFavoriteMutation.mutate({ id: favorite.id });
      }
    },
    [favorites, removeFavoriteMutation]
  );

  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setSearching(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(location);
        
        if (mapRef.current) {
          mapRef.current.setCenter(location);
          mapRef.current.setZoom(14);
        }
        
        searchNearbyBars(location);
      },
      (error) => {
        let errorMessage = "Unable to get your location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        setLocationError(errorMessage);
        toast.error(errorMessage);
        setSearching(false);
      }
    );
  }, []);

  const searchNearbyBars = useCallback((location: { lat: number; lng: number }) => {
    if (!placesServiceRef.current) {
      toast.error("Map not ready. Please try again.");
      setSearching(false);
      return;
    }

    const request: google.maps.places.PlaceSearchRequest = {
      location: new google.maps.LatLng(location.lat, location.lng),
      radius: 5000, // 5km radius
      type: "bar",
      keyword: "cocktail piña colada",
    };

    placesServiceRef.current.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const barResults: BarResult[] = results.map((place) => ({
          placeId: place.place_id || "",
          name: place.name || "Unknown Bar",
          address: place.vicinity || "",
          latitude: place.geometry?.location?.lat() || 0,
          longitude: place.geometry?.location?.lng() || 0,
          rating: place.rating,
          priceLevel: place.price_level,
          photoUrl: place.photos?.[0]?.getUrl({ maxWidth: 400 }),
        }));

        setBars(barResults);
        displayMarkersOnMap(barResults);
        toast.success(`Found ${barResults.length} bars nearby!`);
      } else {
        toast.error("No bars found nearby. Try a different location.");
        setBars([]);
      }
      setSearching(false);
    });
  }, []);

  const displayMarkersOnMap = useCallback((barResults: BarResult[]) => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Create info window if not exists
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    // Add new markers
    barResults.forEach((bar) => {
      const marker = new google.maps.Marker({
        position: { lat: bar.latitude, lng: bar.longitude },
        map: mapRef.current,
        title: bar.name,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
        },
      });

      marker.addListener("click", () => {
        setSelectedBar(bar);
        
        const content = `
          <div style="max-width: 250px;">
            <h3 style="font-weight: bold; margin-bottom: 8px;">${bar.name}</h3>
            <p style="color: #666; font-size: 14px; margin-bottom: 4px;">${bar.address}</p>
            ${bar.rating ? `<p style="font-size: 14px;">⭐ ${bar.rating}/5</p>` : ""}
          </div>
        `;
        
        infoWindowRef.current?.setContent(content);
        infoWindowRef.current?.open(mapRef.current, marker);
      });

      markersRef.current.push(marker);
    });
  }, []);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    placesServiceRef.current = new google.maps.places.PlacesService(map);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-3xl">🍹</div>
            <h1 className="text-2xl font-bold text-foreground">Piña Colada Bar Finder</h1>
          </div>
          
          {authLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Welcome, {user?.name}</span>
            </div>
          ) : (
            <Button asChild variant="default">
              <a href={getLoginUrl()}>Login</a>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-6">
        {/* Hero Section */}
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Find the Best Piña Coladas Near You
          </h2>
          <p className="text-muted-foreground mb-4">
            Discover bars serving delicious piña coladas in your area
          </p>
          
          <Button
            onClick={getUserLocation}
            disabled={searching}
            size="lg"
            className="gap-2"
          >
            {searching ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                Find Bars Near Me
              </>
            )}
          </Button>
          
          {locationError && (
            <p className="text-destructive text-sm mt-2">{locationError}</p>
          )}
        </div>

        {/* Map and Results */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden h-[600px]">
              <MapView
                onMapReady={handleMapReady}
                initialCenter={{ lat: 40.7128, lng: -74.0060 }}
                initialZoom={12}
                className="w-full h-full"
              />
            </Card>
          </div>

          {/* Sidebar - Results or Selected Bar */}
          <div className="lg:col-span-1">
            {selectedBar ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <span>{selectedBar.name}</span>
                    {isAuthenticated && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (isFavorite(selectedBar.placeId)) {
                            handleRemoveFavorite(selectedBar.placeId);
                          } else {
                            handleAddFavorite(selectedBar);
                          }
                        }}
                      >
                        <Heart
                          className={`h-5 w-5 ${
                            isFavorite(selectedBar.placeId)
                              ? "fill-red-500 text-red-500"
                              : "text-muted-foreground"
                          }`}
                        />
                      </Button>
                    )}
                  </CardTitle>
                  <CardDescription>{selectedBar.address}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedBar.photoUrl && (
                    <img
                      src={selectedBar.photoUrl}
                      alt={selectedBar.name}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                  {selectedBar.rating && (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">⭐</span>
                      <span className="text-lg font-semibold">{selectedBar.rating}/5</span>
                    </div>
                  )}
                  {selectedBar.priceLevel !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-semibold">{"$".repeat(selectedBar.priceLevel)}</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setSelectedBar(null)}
                  >
                    Back to Results
                  </Button>
                </CardContent>
              </Card>
            ) : bars.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Found {bars.length} Bars</CardTitle>
                  <CardDescription>Click on a marker or bar to see details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {bars.map((bar) => (
                      <div
                        key={bar.placeId}
                        className="p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedBar(bar)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{bar.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {bar.address}
                            </p>
                            {bar.rating && (
                              <p className="text-sm mt-1">⭐ {bar.rating}/5</p>
                            )}
                          </div>
                          {isAuthenticated && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isFavorite(bar.placeId)) {
                                  handleRemoveFavorite(bar.placeId);
                                } else {
                                  handleAddFavorite(bar);
                                }
                              }}
                            >
                              <Heart
                                className={`h-4 w-4 ${
                                  isFavorite(bar.placeId)
                                    ? "fill-red-500 text-red-500"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Results Yet</CardTitle>
                  <CardDescription>
                    Click "Find Bars Near Me" to discover piña colada bars in your area
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center py-8">
                  <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Allow location access to find the best bars near you
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Favorites Section */}
        {isAuthenticated && favorites && favorites.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Your Favorite Bars</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((fav) => (
                <Card key={fav.id}>
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between">
                      <span className="line-clamp-1">{fav.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFavorite(fav.placeId)}
                      >
                        <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                      </Button>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">{fav.address}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {fav.photoUrl && (
                      <img
                        src={fav.photoUrl}
                        alt={fav.name}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                    )}
                    {fav.rating && (
                      <p className="text-sm">⭐ {fav.rating}/5</p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => {
                        const lat = parseFloat(fav.latitude);
                        const lng = parseFloat(fav.longitude);
                        if (mapRef.current) {
                          mapRef.current.setCenter({ lat, lng });
                          mapRef.current.setZoom(16);
                        }
                      }}
                    >
                      View on Map
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6 mt-auto">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Find the perfect piña colada 🍹 Powered by Google Maps</p>
        </div>
      </footer>
    </div>
  );
}
