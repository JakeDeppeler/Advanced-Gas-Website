/**
 * Toolbox talks: the topics to walk the crew through, and a record of each
 * talk as it was given (when, who was there, what was said, what was agreed).
 * Shared by the page and the server.
 */
export type Topic = { id: string; title: string; points: string[]; addedBy: string | null; at: string };
export type Talk = { id: string; topicId: string | null; title: string; on: string; by: string | null; who: string[]; notes: string; actions: string; at: string };
export type ToolboxState = { topics: Topic[]; talks: Talk[] };

/**
 * Starting topics for a gas and air-con crew, until the office writes its own.
 * Each is a few points to walk through, not a lecture: the talk is the crew
 * talking, and the record is what they said.
 */
export const SEED_TOPICS: Topic[] = [
  { id: "heights", title: "Working on roofs and ladders", points: ["Ladder footed and tied off, three points of contact", "Roof pitch, wet or dusty tiles: when we don't go up", "Edge protection or a harness on two-storey jobs", "Carrying gear up: rope it, don't climb with it"], addedBy: null, at: "2026-10-01T00:00:00.000Z" },
  { id: "gas-leak", title: "Smelling gas on a job", points: ["Isolate at the meter, no switches, no flames", "Get people out and ventilate", "Leak test before and after every gas connection", "Who to ring, and what goes in the job notes"], addedBy: null, at: "2026-10-01T00:00:00.000Z" },
  { id: "refrigerant", title: "Refrigerant handling", points: ["ARC licence: who can recover, charge and decant", "Recover, never vent", "Bottles upright, chained and in date in the van", "Gloves and glasses when breaking a line"], addedBy: null, at: "2026-10-01T00:00:00.000Z" },
  { id: "isolation", title: "Isolating power before work", points: ["Isolate, lock out, tag", "Test it's dead before touching", "What we wire and what the electrician wires", "Tell the customer before the power goes off"], addedBy: null, at: "2026-10-01T00:00:00.000Z" },
  { id: "lifting", title: "Lifting condensers and ducted units", points: ["Two people for anything over 20 kg", "Trolley or lifting straps, not backs", "Plan the path before you pick it up", "Brackets and pads: check before the unit goes on"], addedBy: null, at: "2026-10-01T00:00:00.000Z" },
  { id: "heat", title: "Heat stress in summer", points: ["Roof spaces over 40°C: work early, short stints", "Water on the van, drink before you're thirsty", "Signs in each other: dizzy, confused, stopped sweating", "It's fine to stop the job"], addedBy: null, at: "2026-10-01T00:00:00.000Z" },
  { id: "asbestos", title: "Asbestos in older homes", points: ["Pre-1990 homes: assume it until told otherwise", "Eaves, flues and old ducting are where we find it", "Don't drill, cut or break it: stop and ring the office", "Note it on the job for the next crew"], addedBy: null, at: "2026-10-01T00:00:00.000Z" },
];
