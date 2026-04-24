/**
 * Serving Type enum
 * Values must match the database enum type (string values)
 * For ounce conversion ratios, use SERVING_TYPE_OUNCES constant
 */
export enum ServingType {
  OUNCE = 'OUNCE',
  CUP = 'CUP',
  POUND = 'POUND',
  PINT = 'PINT',
  TABLESPOON = 'TABLESPOON',
  TEASPOON = 'TEASPOON',
  GRAM = 'GRAM',
  CUSTOM = 'CUSTOM',
}

/**
 * Ounce conversion ratios for each serving type
 * These values represent how many ounces are in each serving type
 * Used for serving size conversion calculations in FoodEaten entity
 */
export const SERVING_TYPE_OUNCES: Record<ServingType, number> = {
  [ServingType.OUNCE]: 1,
  [ServingType.CUP]: 8,
  [ServingType.POUND]: 16,
  [ServingType.PINT]: 16,
  [ServingType.TABLESPOON]: 0.5,
  [ServingType.TEASPOON]: 0.1667,
  [ServingType.GRAM]: 0.03527,
  [ServingType.CUSTOM]: 0,
};
