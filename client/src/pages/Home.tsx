import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { MapView } from "@/components/Map";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { MapPin, Heart, Search, Loader2, SlidersHorizontal, CheckCircle2, XCircle, AlertCircle, ShieldCheck } from "lucide-react";
import { useState, useCallback, useRef, useMemo } from "react";
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
  openNow?: boolean;
  verificationStats?: {
    verified: number;
    unverified: number;
    total: number;
  };
}

// Verification component for bar details
function VerificationSection({ placeId }: { placeId: string }) {
  const { isAuthenticated } = useAuth();
  const [userVote, setUserVote] = useState<boolean | null>(null);

  const { data: stats, refetch: refetchStats } = trpc.verifications.stats.useQuery(
    { placeId },
    { enabled: !!placeId }
  );

  const { data: userVerification } = trpc.verifications.userVerification.useQuery(
    { placeId },
    { enabled: isAuthenticated && !!placeId }
  );

  const verifyMutation = trpc.verifications.add.useMutation({
    onSuccess: () => {
      toast.success("Thank you for verifying!");
      refetchStats();
    },
    onError: (error) => {
      toast.error("Failed to submit verification: " + error.message);
    },
  });

  const handleVerify = useCallback(
    (hasPinaColada: boolean) => {
      if (!isAuthenticated) {
        toast.error("Please login to verify");
        return;
      }
      setUserVote(hasPinaColada);
      verifyMutation.mutate({ placeId, hasPinaColada });
    },
    [isAuthenticated, placeId, verifyMutation]
  );

  const verificationPercentage = stats && stats.total > 0
    ? Math.round((stats.verified / stats.total) * 100)
    : null;

  const currentUserVote = userVerification?.hasPinaColada === 1 ? true : userVerification?.hasPinaColada === 0 ? false : userVote;

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Serves Piña Coladas?</h3>
      </div>

      {stats && stats.total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Community Verification:</span>
            <span className="font-semibold text-foreground">
              {verificationPercentage}% Yes ({stats.verified}/{stats.total})
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${verificationPercentage}%` }}
            />
          </div>
        </div>
      )}

      {!stats || stats.total === 0 ? (
        <p className="text-sm text-muted-foreground">
          No verifications yet. Be the first to confirm!
        </p>
      ) : null}

      {isAuthenticated ? (
        <div className="flex gap-2">
          <Button
            onClick={() => handleVerify(true)}
            variant={currentUserVote === true ? "default" : "outline"}
            size="sm"
            className="flex-1 gap-2"
            disabled={verifyMutation.isPending}
          >
            <CheckCircle2 className="h-4 w-4" />
            Yes
          </Button>
          <Button
            onClick={() => handleVerify(false)}
            variant={currentUserVote === false ? "destructive" : "outline"}
            size="sm"
            className="flex-1 gap-2"
            disabled={verifyMutation.isPending}
          >
            <XCircle className="h-4 w-4" />
            No
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center">
          <a href={getLoginUrl()} className="text-primary hover:underline">
            Login
          </a>{" "}
          to verify if this bar serves piña coladas
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Help the community by confirming if this bar actually serves piña coladas
      </p>
    </div>
  );
}

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [bars, setBars] = useState<BarResult[]>([]);
  const [selectedBar, setSelectedBar] = useState<BarResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [maxDistance, setMaxDistance] = useState(5000); // in meters
  const [minRating, setMinRating] = useState(0);
  const [maxPriceLevel, setMaxPriceLevel] = useState(4);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [openNow, setOpenNow] = useState(false);
  
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

    // Use text search for better keyword matching
    const request: google.maps.places.TextSearchRequest = {
      location: new google.maps.LatLng(location.lat, location.lng),
      radius: maxDistance,
      query: "bar piña colada cocktail tropical drinks",
    };

    placesServiceRef.current.textSearch(request, (results, status) => {
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
          openNow: place.opening_hours?.open_now,
        }));

        // Fetch verification stats for all bars
        fetchVerificationStatsForBars(barResults);
        displayMarkersOnMap(barResults);
        toast.success(`Found ${barResults.length} bars nearby!`);
        setShowFilters(true);
      } else {
        toast.error("No bars found nearby. Try a different location.");
        setBars([]);
      }
      setSearching(false);
    });
  }, [maxDistance]);

  const utils = trpc.useUtils();

  const fetchVerificationStatsForBars = useCallback(async (barResults: BarResult[]) => {
    // Fetch verification stats for each bar
    const barsWithStats = await Promise.all(
      barResults.map(async (bar) => {
        try {
          const stats = await utils.verifications.stats.fetch({ placeId: bar.placeId });
          return { ...bar, verificationStats: stats };
        } catch (error) {
          return bar;
        }
      })
    );
    setBars(barsWithStats);
  }, [utils]);

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

  // Filtered bars based on user criteria
  const filteredBars = useMemo(() => {
    return bars.filter((bar) => {
      // Filter by rating
      if (bar.rating && bar.rating < minRating) return false;
      
      // Filter by price level
      if (bar.priceLevel !== undefined && bar.priceLevel > maxPriceLevel) return false;
      
      // Filter by verification status
      if (verifiedOnly) {
        const stats = bar.verificationStats;
        if (!stats || stats.total < 3) return false; // Minimum 3 votes required
        const percentage = (stats.verified / stats.total) * 100;
        if (percentage < 60) return false; // At least 60% positive votes
      }
      
      // Filter by open now status
      if (openNow && bar.openNow === false) return false;
      
      // Distance is already filtered by the API radius parameter
      return true;
    });
  }, [bars, minRating, maxPriceLevel, verifiedOnly, openNow]);

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
          <p className="text-muted-foreground mb-2">
            Discover bars serving delicious piña coladas in your area
          </p>
          <p className="text-xs text-muted-foreground mb-4 max-w-2xl mx-auto">
            <AlertCircle className="inline h-3 w-3 mr-1" />
            Results are based on Google Places data and may not guarantee piña colada availability. Help verify by voting on each bar!
          </p>
          
          <div className="flex gap-3 justify-center">
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
            
            {bars.length > 0 && (
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <SlidersHorizontal className="h-5 w-5" />
                Filters
              </Button>
            )}
          </div>
          
          {locationError && (
            <p className="text-destructive text-sm mt-2">{locationError}</p>
          )}
        </div>

        {/* Filters Section */}
        {showFilters && bars.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5" />
                Filter Results
              </CardTitle>
              <CardDescription>
                Showing {filteredBars.length} of {bars.length} bars
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Distance Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Max Distance: {(maxDistance / 1000).toFixed(1)} km
                  </Label>
                  <Slider
                    value={[maxDistance]}
                    onValueChange={(value) => setMaxDistance(value[0])}
                    min={1000}
                    max={10000}
                    step={500}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 km</span>
                    <span>10 km</span>
                  </div>
                  <Button
                    onClick={() => {
                      if (userLocation) {
                        searchNearbyBars(userLocation);
                      }
                    }}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    Apply Distance
                  </Button>
                </div>

                {/* Rating Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Minimum Rating: {minRating > 0 ? `${minRating}+ ⭐` : "Any"}
                  </Label>
                  <Slider
                    value={[minRating]}
                    onValueChange={(value) => setMinRating(value[0])}
                    min={0}
                    max={5}
                    step={0.5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Any</span>
                    <span>5 ⭐</span>
                  </div>
                </div>

                {/* Price Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Max Price: {maxPriceLevel > 0 ? "$".repeat(maxPriceLevel) : "Any"}
                  </Label>
                  <Select
                    value={maxPriceLevel.toString()}
                    onValueChange={(value) => setMaxPriceLevel(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">$ (Inexpensive)</SelectItem>
                      <SelectItem value="2">$$ (Moderate)</SelectItem>
                      <SelectItem value="3">$$$ (Expensive)</SelectItem>
                      <SelectItem value="4">$$$$ (Very Expensive)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filter Toggles */}
              <div className="mt-6 pt-6 border-t border-border space-y-4">
                {/* Verified Only Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <Label htmlFor="verified-only" className="text-sm font-medium cursor-pointer">
                        Verified Only
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Show only bars confirmed by community (3+ votes, 60%+ positive)
                    </p>
                  </div>
                  <Switch
                    id="verified-only"
                    checked={verifiedOnly}
                    onCheckedChange={setVerifiedOnly}
                  />
                </div>

                {/* Open Now Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🕒</span>
                      <Label htmlFor="open-now" className="text-sm font-medium cursor-pointer">
                        Open Now
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Show only bars currently open
                    </p>
                  </div>
                  <Switch
                    id="open-now"
                    checked={openNow}
                    onCheckedChange={setOpenNow}
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => {
                    setMaxDistance(5000);
                    setMinRating(0);
                    setMaxPriceLevel(4);
                    setVerifiedOnly(false);
                    setOpenNow(false);
                    if (userLocation) {
                      searchNearbyBars(userLocation);
                    }
                  }}
                  variant="ghost"
                  size="sm"
                >
                  Reset Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                  {selectedBar.openNow !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={`font-semibold ${
                        selectedBar.openNow ? "text-green-600" : "text-red-600"
                      }`}>
                        {selectedBar.openNow ? "🟢 Open Now" : "🔴 Closed"}
                      </span>
                    </div>
                  )}
                  
                  {/* Verification Section */}
                  <VerificationSection placeId={selectedBar.placeId} />
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setSelectedBar(null)}
                  >
                    Back to Results
                  </Button>
                </CardContent>
              </Card>
            ) : filteredBars.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Found {filteredBars.length} Bars</CardTitle>
                  <CardDescription>Click on a marker or bar to see details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {filteredBars.map((bar) => (
                      <div
                        key={bar.placeId}
                        className="p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedBar(bar)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">{bar.name}</h3>
                              {bar.verificationStats && bar.verificationStats.total >= 3 && 
                               (bar.verificationStats.verified / bar.verificationStats.total) >= 0.6 && (
                                <span title="Community Verified">
                                  <ShieldCheck className="h-4 w-4 text-green-600" />
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {bar.address}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              {bar.rating && (
                                <p className="text-sm">⭐ {bar.rating}/5</p>
                              )}
                              {bar.openNow !== undefined && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  bar.openNow 
                                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                                    : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                }`}>
                                  {bar.openNow ? "Open" : "Closed"}
                                </span>
                              )}
                            </div>
                            {bar.verificationStats && bar.verificationStats.total > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {Math.round((bar.verificationStats.verified / bar.verificationStats.total) * 100)}% verified ({bar.verificationStats.total} votes)
                              </p>
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
            ) : bars.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Bars Match Filters</CardTitle>
                  <CardDescription>
                    Try adjusting your filter criteria
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center py-8">
                  <SlidersHorizontal className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No bars match your current filters
                  </p>
                  <Button
                    onClick={() => {
                      setMaxDistance(5000);
                      setMinRating(0);
                      setMaxPriceLevel(4);
                    }}
                    variant="outline"
                  >
                    Reset Filters
                  </Button>
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
