import { type DocumentId, technicalDocuments } from "@/features/catalog/documents";

/**
 * AL STORE × EVEREST story, 2018 to today. Wording lives in CompanyStory.milestones.
 *
 * AL STORE rows come from the owner (CONTENT_SOURCES.md §1). EVEREST rows are the
 * manufacturer's: the 2018 uPVC entry from https://everest.al/about-us/ (read 2026-10-25),
 * the rest from verified documents, whose year is read from the document register so the
 * two never disagree. Results stay attributed to the tested sample or node.
 */

type Actor = "alstore" | "everest";

type Milestone = {
  key: "distributor" | "upvc" | "tests" | "pvcTest" | "thermal" | "epd" | "asi" | "today";
  actor: Actor;
} & ({ year: string; documentId?: never } | { year?: never; documentId: DocumentId });

const milestones: readonly Milestone[] = [
  { key: "distributor", actor: "alstore", year: "2018" },
  { key: "upvc", actor: "everest", year: "2018" },
  { key: "tests", actor: "everest", documentId: "rp2147" },
  { key: "pvcTest", actor: "everest", documentId: "rp2176" },
  { key: "thermal", actor: "everest", documentId: "rp2790" },
  { key: "epd", actor: "everest", documentId: "epd26335" },
  { key: "asi", actor: "everest", documentId: "asi554" },
  { key: "today", actor: "alstore", year: "today" },
];

export type StoryMilestone = Omit<Milestone, "year"> & { year: string };

export function listStoryMilestones(): StoryMilestone[] {
  return milestones.map((milestone) => {
    if (!milestone.documentId) return milestone;

    const issuedOn = technicalDocuments.find(({ id }) => id === milestone.documentId)?.issuedOn;
    if (!issuedOn) {
      throw new Error(`Story milestone ${milestone.key} needs a dated document`);
    }
    return { ...milestone, year: issuedOn.slice(0, 4) };
  });
}
