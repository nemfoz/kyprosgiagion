// Greek → Latin letters (close to ELOT 743), for addresses (slugs) and English fallbacks of place names.
const PAIRS: [RegExp, string][] = [
  [/αι/g, "ai"], [/ει/g, "ei"], [/οι/g, "oi"], [/ου/g, "ou"], [/αυ(?=[θκξπσςτφχψ]|$)/g, "af"], [/αυ/g, "av"],
  [/ευ(?=[θκξπσςτφχψ]|$)/g, "ef"], [/ευ/g, "ev"], [/μπ/g, "b"], [/ντ/g, "d"], [/γκ/g, "g"], [/γγ/g, "ng"], [/τσ/g, "ts"], [/τζ/g, "tz"],
]
const LETTERS: Record<string, string> = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o",
  π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o",
}

export function greekToLatin(text: string) {
  return String(text || "").split(/(\s+)/).map((word) => {
    let w = word.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    for (const [re, to] of PAIRS) w = w.replace(re, to)
    w = [...w].map((c) => LETTERS[c] ?? c).join("")
    // Keep the original's capital letter.
    return /^\p{Lu}/u.test(word) ? w.charAt(0).toUpperCase() + w.slice(1) : w
  }).join("")
}
