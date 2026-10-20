import React from "react";
import { render } from "@testing-library/react-native";
import { ListingCard } from "../components/ListingCard";
import type { Listing } from "../types";

// expo-web-browser is a native module; stub it for the test environment.
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));

const listing: Listing = {
  id: "l1",
  vintedId: "v1",
  title: "North Face fleece jacket",
  price: 32,
  currency: "EUR",
  serviceFee: 2,
  shippingFee: 3,
  totalCost: 37,
  brand: "The North Face",
  size: "M",
  condition: "very_good",
  imageUrl: null,
  url: "https://www.vinted.com/items/v1",
  sellerName: "seller_1",
  sellerRating: 4.6,
  source: "mock",
  matchReason: "matches \"fleece\"",
  availability: "available",
  firstSeenAt: Date.now(),
};

describe("ListingCard", () => {
  it("renders the title, price and match reason", () => {
    const { getByText } = render(<ListingCard listing={listing} />);
    expect(getByText("North Face fleece jacket")).toBeTruthy();
    expect(getByText(/32/)).toBeTruthy();
    expect(getByText(/matches/)).toBeTruthy();
  });

  it("shows a mock badge for mock-source listings", () => {
    const { getByText } = render(<ListingCard listing={listing} />);
    expect(getByText("mock")).toBeTruthy();
  });

  it("shows an availability badge", () => {
    const { getByText } = render(<ListingCard listing={listing} />);
    expect(getByText("Available")).toBeTruthy();
  });
});
