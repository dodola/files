// Global DOM type augmentations for APIs that exist at runtime
// but are missing or incomplete in the bundled TypeScript lib declarations.

interface FontFaceSet {
  // The add() method is part of the FontFaceSet API (CSS Font Loading Level 3)
  // but may be missing from some TypeScript DOM lib versions.
  add(font: FontFace): FontFaceSet;
}
