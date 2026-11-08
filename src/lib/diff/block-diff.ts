import type { NoteBlock } from "@/lib/supabase/types";

export type DiffType = "unchanged" | "added" | "removed" | "modified";

export interface BlockDiffItem {
  type: DiffType;
  baseBlock?: NoteBlock;
  proposedBlock?: NoteBlock;
}

/**
 * Computes a block-level diff between two arrays of NoteBlocks.
 */
export function computeBlockDiff(
  baseBlocks: NoteBlock[],
  proposedBlocks: NoteBlock[]
): BlockDiffItem[] {
  const diffs: BlockDiffItem[] = [];

  const baseMap = new Map<string, { block: NoteBlock; index: number }>();
  baseBlocks.forEach((block, index) => {
    baseMap.set(block.id, { block, index });
  });

  const matchedBaseIds = new Set<string>();

  proposedBlocks.forEach((propBlock) => {
    const match = baseMap.get(propBlock.id);

    if (!match) {
      // Completely new block added
      diffs.push({
        type: "added",
        proposedBlock: propBlock,
      });
    } else {
      matchedBaseIds.add(propBlock.id);
      const isContentSame = match.block.content === propBlock.content;
      const isTypeSame = match.block.type === propBlock.type;

      if (isContentSame && isTypeSame) {
        diffs.push({
          type: "unchanged",
          baseBlock: match.block,
          proposedBlock: propBlock,
        });
      } else {
        diffs.push({
          type: "modified",
          baseBlock: match.block,
          proposedBlock: propBlock,
        });
      }
    }
  });

  // Check for blocks present in base but removed in proposed
  baseBlocks.forEach((baseBlock) => {
    if (!matchedBaseIds.has(baseBlock.id)) {
      diffs.push({
        type: "removed",
        baseBlock,
      });
    }
  });

  return diffs;
}

