import type { PricesFile } from "../contracts";
import raw from "./prices.json";

export const SAVED_PRICES = raw as unknown as PricesFile;
