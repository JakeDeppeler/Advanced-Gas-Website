/**
 * The heat pumps we quote, with their installed prices.
 *
 * The public comparator on /heat-pumps and the trade pricebook read this one
 * list, so the price a customer compares at home and the price a tech quotes
 * in their kitchen can't drift apart. Prices are installed, inc GST, and
 * assume the customer qualifies for the rebates — see HEAT_PUMP_PRICE_NOTE.
 */

export type HeatPumpUnit = {
  id: string;
  brand: string;
  model: string;
  style: "AIO" | "Split";
  tank: string;
  people: string;
  origin: string;
  ausMade: boolean;
  warrantyLabel: string;
  warrantyYears: number;
  refrigerant: string;
  wifi: string;
  photo: string;
  price: number;
  priceLabel: string;
};

export const HEAT_PUMP_UNITS: HeatPumpUnit[] = [
  {
    id: "reclaim-r290-200",
    brand: "Reclaim",
    model: "R290 all-in-one 200 L",
    style: "AIO",
    tank: "200 L",
    people: "1 to 2",
    origin: "Australian made",
    ausMade: true,
    warrantyLabel: "10 yr tank",
    warrantyYears: 10,
    refrigerant: "R290",
    wifi: "Built in",
    photo: "/thermann-heat-pump.webp",
    price: 2610,
    priceLabel: "$2,610",
  },
  {
    id: "reclaim-r290-300",
    brand: "Reclaim",
    model: "R290 all-in-one 300 L",
    style: "AIO",
    tank: "300 L",
    people: "3 to 4",
    origin: "Australian made",
    ausMade: true,
    warrantyLabel: "10 yr tank",
    warrantyYears: 10,
    refrigerant: "R290",
    wifi: "Built in",
    photo: "/thermann-heat-pump.webp",
    price: 2610,
    priceLabel: "$2,610",
  },
  {
    id: "reclaim-co2-315-gl",
    brand: "Reclaim",
    model: "CO₂ split 315 L glass-lined Wi-Fi",
    style: "Split",
    tank: "315 L",
    people: "4 to 5",
    origin: "Australian made",
    ausMade: true,
    warrantyLabel: "10 yr tank",
    warrantyYears: 10,
    refrigerant: "CO₂",
    wifi: "Built in",
    photo: "/reclaim-split-back.webp",
    price: 5340,
    priceLabel: "$5,340",
  },
  {
    id: "reclaim-co2-400-ss",
    brand: "Reclaim",
    model: "CO₂ split 400 L stainless Wi-Fi",
    style: "Split",
    tank: "400 L",
    people: "5+",
    origin: "Australian made",
    ausMade: true,
    warrantyLabel: "15 yr tank",
    warrantyYears: 15,
    refrigerant: "CO₂",
    wifi: "Built in",
    photo: "/reclaim-split-back.webp",
    price: 6745,
    priceLabel: "$6,745",
  },
  {
    id: "thermann-r290-285",
    brand: "Thermann",
    model: "R290 all-in-one 285 L",
    style: "AIO",
    tank: "285 L",
    people: "3 to 4",
    origin: "Australian made",
    ausMade: true,
    warrantyLabel: "5 yr tank",
    warrantyYears: 5,
    refrigerant: "R290",
    wifi: "Built in",
    photo: "/thermann-heat-pump.webp",
    price: 2610,
    priceLabel: "$2,610",
  },
  {
    id: "istore-275",
    brand: "iStore",
    model: "Air to Energy 275 L",
    style: "AIO",
    tank: "275 L",
    people: "3 to 5",
    origin: "Australian designed",
    ausMade: false,
    warrantyLabel: "6 yr tank",
    warrantyYears: 6,
    refrigerant: "R32",
    wifi: "Built in",
    photo: "/thermann-heat-pump.webp",
    price: 2910,
    priceLabel: "$2,910",
  },
  ];

export const HEAT_PUMP_PRICE_NOTE =
  "Prices assume Solar Homes rebate eligibility (owner-occupier, income under $150k, property under $3M, HW system 3+ years old). Real number confirmed at quote.";
