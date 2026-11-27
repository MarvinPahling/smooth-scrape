import { describe, expect, test } from "bun:test"
import { cityKey, normalizeCity } from "./normalize"

describe("normalizeCity", () => {
  test("empty values give null", () => {
    expect(normalizeCity(null)).toBeNull()
    expect(normalizeCity(undefined)).toBeNull()
    expect(normalizeCity("")).toBeNull()
    expect(normalizeCity("   ")).toBeNull()
    expect(normalizeCity(" , ")).toBeNull()
  })

  test("trims and collapses whitespace", () => {
    expect(normalizeCity("Hennef ")).toBe("Hennef")
    expect(normalizeCity("  Rio  de\tJaneiro ")).toBe("Rio de Janeiro")
  })

  test("drops a leading postal code", () => {
    expect(normalizeCity("63743 Aschaffenburg")).toBe("Aschaffenburg")
    expect(normalizeCity("17033 Neubrandenburg")).toBe("Neubrandenburg")
  })

  test("drops trailing punctuation", () => {
    expect(normalizeCity("Round Rock,")).toBe("Round Rock")
  })

  test("fixes known misspellings and variants", () => {
    expect(normalizeCity("Balneário Camburiú")).toBe("Balneário Camboriú")
    expect(normalizeCity("Curitba")).toBe("Curitiba")
    expect(normalizeCity("Me. de Deus")).toBe("Madre de Deus")
    expect(normalizeCity("Boston Summer")).toBe("Boston")
    expect(normalizeCity("Ft. Lauderdale")).toBe("Fort Lauderdale")
    expect(normalizeCity("San jose")).toBe("San Jose")
    expect(normalizeCity("Petit-lancy")).toBe("Petit-Lancy")
  })

  test("uses English exonyms", () => {
    expect(normalizeCity("Köln")).toBe("Cologne")
    expect(normalizeCity("Cologne")).toBe("Cologne")
    expect(normalizeCity("Nuremberg ")).toBe("Nuremberg")
    expect(normalizeCity("Genève")).toBe("Geneva")
    expect(normalizeCity("Lisboa")).toBe("Lisbon")
    expect(normalizeCity("Torino")).toBe("Turin")
  })

  test("keeps accents of names it does not override", () => {
    expect(normalizeCity("Böblingen")).toBe("Böblingen")
    expect(normalizeCity("São José ")).toBe("São José")
    // Decomposed "ü" (NFD) becomes the composed form.
    expect(normalizeCity("Lüneburg")).toBe("Lüneburg")
  })
})

test("cityKey ignores case, accents and spacing", () => {
  expect(cityKey(" Genève ")).toBe("geneve")
  expect(cityKey("SÃO  JOSÉ")).toBe("sao jose")
})
