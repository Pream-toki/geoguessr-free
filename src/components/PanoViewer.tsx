import { useEffect, useRef, useState } from "react";
import { CameraControls, Viewer } from "mapillary-js";
import "mapillary-js/dist/mapillary.css";

interface Props {
  imageId: string | null;
  token: string;
}

type Status = "idle" | "loading" | "ready" | "error";

export default function PanoViewer({ imageId, token }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Create the viewer once per token; always navigate with moveTo().
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !token) return;

    const viewer = new Viewer({
      accessToken: token,
      container,
      cameraControls: CameraControls.Street,
      component: { cover: false, keyboard: false, sequence: false },
    });
    viewerRef.current = viewer;

    const onResize = () => viewer.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      viewer.remove();
      viewerRef.current = null;
      setStatus("idle");
    };
  }, [token]);

  // Navigate to the current round's image.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !imageId) return;
    let cancelled = false;
    setStatus("loading");
    setErrorMsg(null);
    viewer
      .moveTo(imageId)
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [imageId]);

  return (
    <div className="pano-wrap">
      <div ref={containerRef} className="pano-container" />
      {status === "loading" && (
        <div className="pano-status">
          <div className="spinner" />
          <p>Loading panorama…</p>
        </div>
      )}
      {status === "error" && (
        <div className="pano-status pano-error">
          <p>⚠️ Could not load this panorama.</p>
          {errorMsg && <p className="pano-error-detail">{errorMsg}</p>}
          <p className="pano-error-detail">Finish this round by placing any guess on the map.</p>
        </div>
      )}
      {!token && (
        <div className="pano-status pano-demo">
          <p>🧪 Demo mode — locations are simulated.</p>
          <p className="pano-error-detail">
            The full game loop works: guess on the map, see scores, finish the game. Add a free
            Mapillary token to .env (VITE_MAPILLARY_TOKEN) for real 360° panoramas.
          </p>
        </div>
      )}
    </div>
  );
}
