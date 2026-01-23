// utils/crystal_system.js

export function autoCrystalSystem(ext, glide, screw) {
  // ざっくり推定（強制しない）
  if (!ext) return null;

  const t = ext.best.type;

  if (t === "F" || t === "I") return "cubic";
  if (t === "C") return "orthorhombic";

  // glide/screw の証拠があれば monoclinic
  if (glide?.best || screw?.score) return "monoclinic";

  return "triclinic";
}

export function applyUserCrystalSystem(autoCS, userCS) {
  return userCS || autoCS;
}
