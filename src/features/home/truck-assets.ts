/**
 * Truck artwork for TruckScrollHero.
 *
 * Until a clean, owner-approved cut-out exists, `truckImage` is null and the
 * component draws a placeholder silhouette with the EVEREST name in plain text (no logo).
 * To switch: add the file under public/media/truck/ and fill in the object, e.g.
 *   { src: "/media/truck/everest-truck.webp", width: 2400, height: 760 }
 * width/height are the file's real pixel size (side view, transparent background).
 */
export type TruckImage = { src: string; width: number; height: number };

export const truckImage: TruckImage | null = null;
