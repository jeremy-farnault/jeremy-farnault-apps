"use client";

import type { Npc } from "@/config/npcs";
import { fetchRoute } from "@/lib/directions";
import { distanceMeters } from "@/lib/geo";
import { buildPursuitLeg, detectsPlayer, isAtPoi, isInZone, npcZone } from "@/lib/pursuit";
import { savePursuitSnapshot } from "@/lib/pursuit-persist";
import type { CharacterPosition } from "@/lib/travel";
import { interpolateLegs, totalDurationSeconds } from "@/lib/travel";
import { type PursuitStatus, usePursuitStore } from "@/stores/pursuit-store";
import { committedEndpoint, useTravelStore } from "@/stores/travel-store";
import { useEffect, useRef } from "react";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const ARRIVE_EPSILON_M = 5;
const CATCH_EPSILON_M = 25; // NPC is close enough to the player to catch / confront

function endpointKey(p: CharacterPosition): string {
  return `${p.longitude.toFixed(6)},${p.latitude.toFixed(6)}`;
}

// Drives NPC pursuit while the app is foregrounded: a single RAF loop that, per
// visible NPC, runs the idle → pursuing → returning state machine, interpolates
// the live position into the pursuit store, and re-fetches routes only on
// detection, committed-endpoint change, and give-up. Mounted once in GameMap.
export function useNpcPursuit(visibleNpcs: Npc[], onCatch?: (npcId: string) => void) {
  const npcsRef = useRef(visibleNpcs);
  useEffect(() => {
    npcsRef.current = visibleNpcs;
  }, [visibleNpcs]);

  const onCatchRef = useRef(onCatch);
  useEffect(() => {
    onCatchRef.current = onCatch;
  }, [onCatch]);

  // Snapshot durable pursuit state when the app is backgrounded/closed, so an
  // in-flight chase survives to be reconciled on resume. Not written per frame.
  useEffect(() => {
    const save = () => {
      const { byId, cooldownUntil } = usePursuitStore.getState();
      savePursuitSnapshot({ byId, cooldownUntil });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", save);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", save);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    // Transient per-NPC bookkeeping (not rendered): in-flight fetch guard and
    // the endpoint key the current route was fetched for.
    const book = new Map<string, { fetching: boolean; targetKey: string }>();
    const setPursuit = usePursuitStore.getState().set;
    const clearPursuit = usePursuitStore.getState().clear;

    async function requestRoute(
      npc: Npc,
      from: CharacterPosition,
      to: CharacterPosition,
      status: PursuitStatus
    ) {
      book.set(npc.id, { fetching: true, targetKey: endpointKey(to) });
      const result = await fetchRoute(from, to, TOKEN);
      const leg = buildPursuitLeg(result, from, to, npc.movementSpeed);
      setPursuit(npc.id, {
        status,
        livePosition: from,
        route: { legs: [leg], resumedAt: Date.now() },
        target: to,
      });
      const bk = book.get(npc.id);
      if (bk) bk.fetching = false;
    }

    const tick = () => {
      const now = Date.now();
      const player = useTravelStore.getState().position;
      const endpoint = committedEndpoint();
      const { byId, cooldownUntil } = usePursuitStore.getState();
      const visible = npcsRef.current;
      const visibleIds = new Set(visible.map((n) => n.id));

      for (const npc of visible) {
        const post: CharacterPosition = { longitude: npc.longitude, latitude: npc.latitude };
        const rec = byId[npc.id];
        const status: PursuitStatus = rec?.status ?? "idle";
        const bk = book.get(npc.id) ?? { fetching: false, targetKey: "" };
        const canDetect = (cooldownUntil[npc.id] ?? 0) <= now;

        // Current interpolated position along the active route (if any).
        let pos: CharacterPosition = rec?.livePosition ?? post;
        if (rec?.route) {
          pos = interpolateLegs(rec.route.legs, (Date.now() - rec.route.resumedAt) / 1000);
        }

        if (status === "idle") {
          if (!bk.fetching && canDetect && detectsPlayer(npc, player)) {
            void requestRoute(npc, post, endpoint, "pursuing");
          }
          continue;
        }

        if (status === "pursuing") {
          const zone = npcZone(npc);
          const inZone = zone ? isInZone(player, zone) : false;
          if (!inZone) {
            if (!bk.fetching) void requestRoute(npc, pos, post, "returning");
            continue;
          }
          // Caught up to the player.
          if (distanceMeters(pos, player) <= CATCH_EPSILON_M) {
            const safe = isAtPoi(player);
            setPursuit(npc.id, {
              status: safe ? "waiting" : "caught",
              livePosition: pos,
              route: null,
              target: null,
            });
            if (!safe) onCatchRef.current?.(npc.id);
            continue;
          }
          if (!bk.fetching && bk.targetKey !== endpointKey(endpoint)) {
            void requestRoute(npc, pos, endpoint, "pursuing");
            continue;
          }
          setPursuit(npc.id, {
            status: "pursuing",
            livePosition: pos,
            route: rec?.route ?? null,
            target: rec?.target ?? endpoint,
          });
          continue;
        }

        if (status === "waiting") {
          const zone = npcZone(npc);
          const inZone = zone ? isInZone(player, zone) : false;
          if (!inZone) {
            // Player fled the whole zone — give up.
            if (!bk.fetching) void requestRoute(npc, pos, post, "returning");
            continue;
          }
          // Still parked outside the POI; pounce the moment the player leaves it.
          const safe = isAtPoi(player);
          setPursuit(npc.id, {
            status: safe ? "waiting" : "caught",
            livePosition: pos,
            route: null,
            target: null,
          });
          if (!safe) onCatchRef.current?.(npc.id);
          continue;
        }

        if (status === "caught") {
          // Reached the player in the open; GameMap starts the forced confront
          // and flips this to "confronting". Hold position meanwhile.
          setPursuit(npc.id, { status: "caught", livePosition: pos, route: null, target: null });
          continue;
        }

        if (status === "confronting") {
          // Fight in progress (owned by GameMap); hold position, don't overwrite.
          continue;
        }

        // returning
        if (!bk.fetching && canDetect && detectsPlayer(npc, player)) {
          void requestRoute(npc, pos, endpoint, "pursuing");
          continue;
        }
        if (distanceMeters(pos, post) <= ARRIVE_EPSILON_M) {
          clearPursuit(npc.id);
          continue;
        }
        if (!rec?.route) {
          // Set to "returning" with no route (e.g. by GameMap after a confront) —
          // fetch the walk-back route to post.
          if (!bk.fetching) void requestRoute(npc, pos, post, "returning");
          continue;
        }
        const routeDone =
          (Date.now() - rec.route.resumedAt) / 1000 >= totalDurationSeconds(rec.route.legs);
        if (routeDone) {
          clearPursuit(npc.id);
        } else {
          setPursuit(npc.id, {
            status: "returning",
            livePosition: pos,
            route: rec.route,
            target: post,
          });
        }
      }

      // Drop pursuit state for NPCs no longer pursuable (e.g. zone captured).
      for (const id of Object.keys(byId)) {
        if (!visibleIds.has(id)) {
          clearPursuit(id);
          book.delete(id);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}
