import type { StaticImageData } from "next/image";
import asi554 from "@/assets/documents/asi554.jpg";
import epd26335 from "@/assets/documents/epd26335.jpg";
import epd26336 from "@/assets/documents/epd26336.jpg";
import ph2570 from "@/assets/documents/ph2570.jpg";
import rp2144 from "@/assets/documents/rp2144.jpg";
import rp2145 from "@/assets/documents/rp2145.jpg";
import rp2146 from "@/assets/documents/rp2146.jpg";
import rp2147 from "@/assets/documents/rp2147.jpg";
import rp2157 from "@/assets/documents/rp2157.jpg";
import rp2176 from "@/assets/documents/rp2176.jpg";
import rp2549 from "@/assets/documents/rp2549.jpg";
import rp2790 from "@/assets/documents/rp2790.jpg";
import type { DocumentId } from "./documents";

/**
 * First page of every registered document, rendered unaltered from the complete PDF
 * (CONTENT_SOURCES.md §5). A cover is a preview only: it always links to the full document,
 * never stands in for it. Adding a document to the register requires its cover here.
 */
export const documentCovers: Record<DocumentId, StaticImageData> = {
  rp2147,
  rp2146,
  rp2790,
  rp2157,
  rp2144,
  rp2145,
  epd26335,
  rp2176,
  rp2549,
  asi554,
  epd26336,
  ph2570,
};
