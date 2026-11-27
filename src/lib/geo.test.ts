import { expect, test } from "bun:test"
import {
  HOME,
  distanceFromHome,
  formatDistance,
  hasCoordinates,
  haversineKm,
} from "./geo"

test("Brunswick to Hannover is about 57 km, symmetric and zero at home", () => {
  const hannover = { lat: 52.3759, lng: 9.732 }
  expect(haversineKm(HOME, hannover)).toBeCloseTo(55.3, 0)
  expect(haversineKm(HOME, hannover)).toBeGreaterThan(54)
  expect(haversineKm(HOME, hannover)).toBeLessThan(59)
  expect(haversineKm(HOME, hannover)).toBe(haversineKm(hannover, HOME))
  expect(distanceFromHome(HOME)).toBe(0)
})
test("missing and invalid coordinates are unknown; zero is valid", () => {
  for (const point of [
    {},
    { lat: null, lng: 10 },
    { lat: 52, lng: NaN },
    { lat: 91, lng: 0 },
    { lat: 0, lng: 181 },
  ]) {
    expect(distanceFromHome(point)).toBeNull()
  }
  expect(hasCoordinates({ lat: 0, lng: 0 })).toBe(true)
})
test("stable English formatting and near-home label", () => {
  expect(formatDistance(null)).toBe("—")
  expect(formatDistance(0)).toBe("<1 km")
  expect(formatDistance(0.99)).toBe("<1 km")
  expect(formatDistance(56.7)).toBe("57 km")
  expect(formatDistance(9870.2)).toBe("9,870 km")
})
test("antipodal points remain finite", () => {
  expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(
    20015,
    0
  )
})
