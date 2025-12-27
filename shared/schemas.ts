import { CARDS_BY_ID, CARD_IDS, CARDS } from 'game/constants'
import { z } from 'zod'

export const schemas = {
  suit: () => z.enum(['clubs', 'spades', 'hearts', 'diamonds']),
  card: () =>
    z
      .object({ id: z.string() })
      .transform((card) => {
        const parsed = CARDS_BY_ID[card.id as typeof CARD_IDS[number]]
        if (!parsed) {
          return z.NEVER
        }
        return parsed
      }),
}
