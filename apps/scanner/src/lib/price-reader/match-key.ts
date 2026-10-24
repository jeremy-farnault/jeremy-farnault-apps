// Words that tell editions and platforms apart but not products: "Horizon Forbidden West
// Complete Edition (PS5)" and "Horizon Forbidden West" should match.
const NOISE_WORDS = new Set([
  "ps4",
  "ps5",
  "pc",
  "xbox",
  "switch",
  "edition",
  "standard",
  "deluxe",
  "digital",
  "complete",
  "ultimate",
  "gold",
  "premium",
  "collectors",
  "collector's",
]);

/**
 * The match key for a web shop link: the product name lowercased, accents, trademark
 * signs, punctuation and edition or platform words removed. Used to suggest attaching a
 * new link to an item the user already tracks.
 */
export function nameMatchKey(name: string): string {
  return (
    name
      // Accents come off Latin letters only: Japanese voicing marks (ゾ = ソ + ゛) are combining
      // marks too, and dropping them would change the word. NFC puts those back together.
      .normalize("NFD")
      .replace(/(\p{Script=Latin})\p{M}+/gu, "$1")
      .normalize("NFC")
      .toLowerCase()
      .replace(/[™®©]/g, " ")
      .replace(/[^\p{L}\p{N}' ]+/gu, " ")
      .split(/\s+/)
      .filter((word) => word && !NOISE_WORDS.has(word))
      .join(" ")
      .replace(/'/g, "")
  );
}
