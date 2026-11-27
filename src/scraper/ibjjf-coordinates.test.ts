import { expect, test } from "bun:test"
import { hasCoordinates } from "../lib/geo"
import {
  coordinatesFromCity,
  IBJJF_CITY_COORDINATES,
} from "./ibjjf-coordinates"

test("all offline coordinates are valid", () => {
  for (const point of IBJJF_CITY_COORDINATES.values())
    expect(hasCoordinates(point)).toBe(true)
})
test("lookup handles normalized spelling and country namesakes", () => {
  expect(coordinatesFromCity("  SÃO JOSÉ ", "BR")?.lat).toBeCloseTo(-27.61, 1)
  expect(coordinatesFromCity("San Jose", "US")?.lat).toBeCloseTo(37.34, 1)
  expect(coordinatesFromCity("College Park", "US")?.lat).toBeCloseTo(33.65, 1)
  expect(coordinatesFromCity("London", "US")).toBeNull()
  expect(coordinatesFromCity("Unlisted city", "DE")).toBeNull()
  expect(coordinatesFromCity(null, "DE")).toBeNull()
})
