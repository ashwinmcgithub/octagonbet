export type Difficulty = 'easy' | 'medium' | 'hard'

export interface WordPair {
  id: string
  category: string
  difficulty: Difficulty
  civilianWord: string
  imposterWord: string
  sharedAttribute: string
}

export const WORD_PAIRS: WordPair[] = [
  { id: 'tech-faceid', category: 'Tech', difficulty: 'hard', civilianWord: 'FaceID', imposterWord: 'Two-Factor Auth', sharedAttribute: 'Account security' },
  { id: 'gym-deadlift', category: 'Gym', difficulty: 'medium', civilianWord: 'Deadlift', imposterWord: 'Bench Press', sharedAttribute: 'Barbell strength lift' },
  { id: 'brands-pepsi', category: 'Brands', difficulty: 'easy', civilianWord: 'Pepsi', imposterWord: 'Red Bull', sharedAttribute: 'Popular canned drink' },
  { id: 'food-cappuccino', category: 'Food', difficulty: 'medium', civilianWord: 'Cappuccino', imposterWord: 'Matcha Latte', sharedAttribute: 'Cafe drink' },
  { id: 'sports-sprint', category: 'Sports', difficulty: 'medium', civilianWord: 'Sprint', imposterWord: 'Long Jump', sharedAttribute: 'Track & field event' },
  { id: 'animals-alligator', category: 'Animals', difficulty: 'medium', civilianWord: 'Alligator', imposterWord: 'Komodo Dragon', sharedAttribute: 'Large reptile' },
  { id: 'space-meteor', category: 'Space', difficulty: 'medium', civilianWord: 'Meteor', imposterWord: 'Comet', sharedAttribute: 'Visible space object' },
  { id: 'music-guitar', category: 'Music', difficulty: 'medium', civilianWord: 'Guitar', imposterWord: 'Piano', sharedAttribute: 'Instrument in modern music' },
  { id: 'movies-marvel', category: 'Movies', difficulty: 'easy', civilianWord: 'Marvel', imposterWord: 'Star Wars', sharedAttribute: 'Major film franchise' },
  { id: 'finance-debit', category: 'Finance', difficulty: 'medium', civilianWord: 'Debit Card', imposterWord: 'Mobile Wallet', sharedAttribute: 'Everyday payments' },
  { id: 'food-espresso', category: 'Food', difficulty: 'hard', civilianWord: 'Espresso', imposterWord: 'Cold Brew', sharedAttribute: 'Coffee drink' },
  { id: 'sports-rugby', category: 'Sports', difficulty: 'medium', civilianWord: 'Rugby', imposterWord: 'Basketball', sharedAttribute: 'Team sport' },
  { id: 'tech-ram', category: 'Tech', difficulty: 'hard', civilianWord: 'RAM', imposterWord: 'GPU', sharedAttribute: 'Computer hardware' },
  { id: 'food-butter', category: 'Food', difficulty: 'easy', civilianWord: 'Butter', imposterWord: 'Olive Oil', sharedAttribute: 'Common cooking fat' },
]

export function pickWordPair(difficulty: Difficulty): WordPair {
  const pool = WORD_PAIRS.filter(p => p.difficulty === difficulty)
  const source = pool.length > 0 ? pool : WORD_PAIRS
  return source[Math.floor(Math.random() * source.length)]
}
