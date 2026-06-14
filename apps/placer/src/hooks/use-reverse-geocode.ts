import { useEffect, useState } from "react";

export function useReverseGeocode(
  lat: number | null | undefined,
  lng: number | null | undefined
): { address: string | null; loading: boolean } {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat == null || lng == null) {
      setAddress(null);
      setLoading(false);
      return;
    }
    setAddress(null);
    setLoading(true);
    const controller = new AbortController();
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: { display_name?: string }) => {
        if (data.display_name) setAddress(data.display_name);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
    return () => controller.abort();
  }, [lat, lng]);

  return { address, loading };
}
