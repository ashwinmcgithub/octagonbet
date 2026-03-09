export interface FightResult {
  event?: string
  opp: string
  result: 'W' | 'L'
  method: string
  round: number
  date: string
}

export interface FighterStats {
  record: string
  winsKO: number
  winsSUB: number
  winsDEC: number
  lastFights: FightResult[]
}

export const FIGHTER_STATS: Record<string, FighterStats> = {
  'Kevin Vallejos': {
    record: '17-1',
    winsKO: 12,
    winsSUB: 2,
    winsDEC: 3,
    lastFights: [
      { event: 'UFC Fight Night', opp: 'Rodrigo Macedo', result: 'W', method: 'KO/TKO', round: 1, date: 'Nov 2025' },
      { opp: 'Shayilan Nuerdanbieke', result: 'W', method: 'Decision', round: 3, date: 'Jul 2025' },
    ],
  },
  'Josh Emmett': {
    record: '19-6',
    winsKO: 7,
    winsSUB: 2,
    winsDEC: 10,
    lastFights: [
      { opp: 'Bryce Mitchell', result: 'W', method: 'KO/TKO', round: 2, date: 'Sep 2025' },
      { opp: 'Leandro Silva', result: 'W', method: 'Decision', round: 3, date: 'Apr 2025' },
    ],
  },
  'Gillian Robertson': {
    record: '16-8',
    winsKO: 1,
    winsSUB: 12,
    winsDEC: 3,
    lastFights: [
      { opp: 'Marina Rodriguez', result: 'W', method: 'Submission', round: 2, date: 'Sep 2025' },
      { opp: 'Michelle Waterson-Gomez', result: 'W', method: 'Submission', round: 1, date: 'May 2025' },
    ],
  },
  'Amanda Lemos': {
    record: '15-5-1',
    winsKO: 4,
    winsSUB: 7,
    winsDEC: 4,
    lastFights: [
      { opp: 'Tatiana Suarez', result: 'L', method: 'Decision', round: 3, date: 'Aug 2025' },
      { opp: 'Mackenzie Dern', result: 'W', method: 'Decision', round: 3, date: 'Feb 2025' },
    ],
  },
  'Oumar Sy': {
    record: '12-1',
    winsKO: 9,
    winsSUB: 1,
    winsDEC: 2,
    lastFights: [
      { opp: 'Dustin Jacoby', result: 'W', method: 'KO/TKO', round: 1, date: 'Oct 2025' },
      { opp: 'Nikita Krylov', result: 'W', method: 'KO/TKO', round: 2, date: 'Jun 2025' },
    ],
  },
  'Ion Cutelaba': {
    record: '19-11-1',
    winsKO: 11,
    winsSUB: 3,
    winsDEC: 5,
    lastFights: [
      { opp: 'Da-un Jung', result: 'L', method: 'Decision', round: 3, date: 'Sep 2025' },
      { opp: 'Alonzo Menifield', result: 'W', method: 'KO/TKO', round: 1, date: 'Mar 2025' },
    ],
  },
  'Jose Delgado': {
    record: '10-2',
    winsKO: 5,
    winsSUB: 3,
    winsDEC: 2,
    lastFights: [
      { opp: 'Nathaniel Wood', result: 'L', method: 'Decision', round: 3, date: 'Oct 2025' },
      { opp: 'Ernie Juarez', result: 'W', method: 'KO/TKO', round: 2, date: 'Aug 2024' },
    ],
  },
  'Andre Fili': {
    record: '23-10',
    winsKO: 5,
    winsSUB: 9,
    winsDEC: 9,
    lastFights: [
      { opp: 'Joanderson Brito', result: 'L', method: 'Decision', round: 3, date: 'Nov 2025' },
      { opp: 'Lucas Almeida', result: 'W', method: 'Decision', round: 3, date: 'May 2025' },
    ],
  },
  'Marwan Rahiki': {
    record: '12-3',
    winsKO: 8,
    winsSUB: 2,
    winsDEC: 2,
    lastFights: [
      { opp: 'Jamall Emmers', result: 'W', method: 'KO/TKO', round: 1, date: 'Oct 2025' },
      { opp: 'Ricardo Ramos', result: 'W', method: 'KO/TKO', round: 2, date: 'Jun 2025' },
    ],
  },
  'Harry Hardwick': {
    record: '10-4',
    winsKO: 4,
    winsSUB: 3,
    winsDEC: 3,
    lastFights: [
      { opp: 'Viacheslav Borshchev', result: 'L', method: 'KO/TKO', round: 1, date: 'Sep 2025' },
      { opp: 'Melsik Baghdasaryan', result: 'W', method: 'Decision', round: 3, date: 'Apr 2025' },
    ],
  },
  'Vitor Petrino': {
    record: '13-2',
    winsKO: 8,
    winsSUB: 2,
    winsDEC: 3,
    lastFights: [
      { opp: 'Kennedy Nzechukwu', result: 'W', method: 'KO/TKO', round: 2, date: 'Nov 2025' },
      { opp: 'Marcin Prachnio', result: 'W', method: 'KO/TKO', round: 1, date: 'Jul 2025' },
    ],
  },
  'Steven Asplund': {
    record: '7-1',
    winsKO: 5,
    winsSUB: 1,
    winsDEC: 1,
    lastFights: [
      { opp: 'Junior Tafa', result: 'W', method: 'KO/TKO', round: 1, date: 'Sep 2025' },
      { opp: 'Hamdy Abdelwahab', result: 'W', method: 'KO/TKO', round: 2, date: 'May 2025' },
    ],
  },
  'Brad Tavares': {
    record: '21-11',
    winsKO: 8,
    winsSUB: 2,
    winsDEC: 11,
    lastFights: [
      { opp: 'Rodolfo Vieira', result: 'W', method: 'Decision', round: 3, date: 'Aug 2025' },
      { opp: 'Michal Oleksiejczuk', result: 'W', method: 'Decision', round: 3, date: 'Mar 2025' },
    ],
  },
  'Eryk Anders': {
    record: '17-9',
    winsKO: 11,
    winsSUB: 2,
    winsDEC: 4,
    lastFights: [
      { opp: 'Marc-Andre Barriault', result: 'W', method: 'KO/TKO', round: 1, date: 'Sep 2025' },
      { opp: 'Kyle Daukaus', result: 'L', method: 'Decision', round: 3, date: 'Apr 2025' },
    ],
  },
  'Charles Johnson': {
    record: '12-3',
    winsKO: 5,
    winsSUB: 3,
    winsDEC: 4,
    lastFights: [
      { opp: 'Tagir Ulanbekov', result: 'W', method: 'Decision', round: 3, date: 'Oct 2025' },
      { opp: 'Sumudaerji', result: 'L', method: 'Decision', round: 3, date: 'Jun 2025' },
    ],
  },
  'Bruno Silva': {
    record: '16-7',
    winsKO: 7,
    winsSUB: 5,
    winsDEC: 4,
    lastFights: [
      { opp: 'Mateus Mendonca', result: 'W', method: 'Submission', round: 2, date: 'Nov 2025' },
      { opp: 'Joshua Van', result: 'W', method: 'KO/TKO', round: 1, date: 'Aug 2025' },
    ],
  },
  'Hecher Sosa': {
    record: '11-5',
    winsKO: 5,
    winsSUB: 3,
    winsDEC: 3,
    lastFights: [
      { opp: 'Jafel Filho', result: 'W', method: 'Decision', round: 3, date: 'Oct 2025' },
      { opp: 'Carlos Candelario', result: 'L', method: 'KO/TKO', round: 2, date: 'May 2025' },
    ],
  },
  'Luan Lacerda': {
    record: '12-3',
    winsKO: 6,
    winsSUB: 4,
    winsDEC: 2,
    lastFights: [
      { opp: 'Vince Murdock', result: 'W', method: 'KO/TKO', round: 1, date: 'Sep 2025' },
      { opp: 'Jimmy Flick', result: 'W', method: 'Submission', round: 2, date: 'Apr 2025' },
    ],
  },
  'Bia Mesquita': {
    record: '6-0',
    winsKO: 0,
    winsSUB: 5,
    winsDEC: 1,
    lastFights: [
      { opp: 'Joselyne Edwards', result: 'W', method: 'Submission', round: 1, date: 'Nov 2025' },
      { opp: 'Josefine Knutsson', result: 'W', method: 'Submission', round: 2, date: 'Jun 2025' },
    ],
  },
  'Montserrat Rendon': {
    record: '7-1',
    winsKO: 2,
    winsSUB: 1,
    winsDEC: 4,
    lastFights: [
      { opp: 'Alice Pereira', result: 'W', method: 'Decision', round: 3, date: 'Sep 2025' },
      { opp: 'Darya Zheleznyakova', result: 'L', method: 'Decision', round: 3, date: 'Mar 2025' },
    ],
  },
  'Myktybek Orolbai': {
    record: '14-4',
    winsKO: 6,
    winsSUB: 4,
    winsDEC: 4,
    lastFights: [
      { opp: 'Josh Quinlan', result: 'W', method: 'Decision', round: 3, date: 'Oct 2025' },
      { opp: 'Matthew Semelsberger', result: 'W', method: 'KO/TKO', round: 1, date: 'Jun 2025' },
    ],
  },
  'Chris Curtis': {
    record: '32-12',
    winsKO: 17,
    winsSUB: 5,
    winsDEC: 10,
    lastFights: [
      { opp: 'Neil Magny', result: 'W', method: 'Decision', round: 3, date: 'Sep 2025' },
      { opp: 'Joaquin Buckley', result: 'L', method: 'KO/TKO', round: 1, date: 'May 2025' },
    ],
  },
  'Manoel Sousa': {
    record: '17-4',
    winsKO: 7,
    winsSUB: 6,
    winsDEC: 4,
    lastFights: [
      { opp: 'Thiago Moises', result: 'W', method: 'KO/TKO', round: 2, date: 'Oct 2025' },
      { opp: 'Nikolas Motta', result: 'W', method: 'Decision', round: 3, date: 'Jun 2025' },
    ],
  },
  'Bolaji Oki': {
    record: '11-4',
    winsKO: 4,
    winsSUB: 4,
    winsDEC: 3,
    lastFights: [
      { opp: 'Fares Ziam', result: 'L', method: 'Decision', round: 3, date: 'Sep 2025' },
      { opp: 'Ignacio Bahamondes', result: 'W', method: 'KO/TKO', round: 1, date: 'Apr 2025' },
    ],
  },
  'Elijah Smith': {
    record: '9-1',
    winsKO: 7,
    winsSUB: 1,
    winsDEC: 1,
    lastFights: [
      { opp: 'Toshiomi Kazama', result: 'W', method: 'KO/TKO', round: 1, date: 'Nov 2025' },
      { opp: 'Trevin Jones', result: 'W', method: 'KO/TKO', round: 2, date: 'Jul 2025' },
    ],
  },
  'SuYoung You': {
    record: '16-3',
    winsKO: 3,
    winsSUB: 6,
    winsDEC: 7,
    lastFights: [
      { opp: 'Lucas Almeida', result: 'W', method: 'Decision', round: 3, date: 'Oct 2025' },
      { opp: 'Alex Caceres', result: 'W', method: 'Decision', round: 3, date: 'Jun 2025' },
    ],
  },
  'Piera Rodriguez': {
    record: '11-4',
    winsKO: 2,
    winsSUB: 4,
    winsDEC: 5,
    lastFights: [
      { opp: 'Ketlen Souza', result: 'W', method: 'Decision', round: 3, date: 'Oct 2025' },
      { opp: 'Josefine Knutsson', result: 'W', method: 'Decision', round: 3, date: 'May 2025' },
    ],
  },
  'Sam Hughes': {
    record: '10-7',
    winsKO: 1,
    winsSUB: 3,
    winsDEC: 6,
    lastFights: [
      { opp: 'Vanessa Demopoulos', result: 'L', method: 'Decision', round: 3, date: 'Sep 2025' },
      { opp: 'Priscila Cachoeira', result: 'W', method: 'Decision', round: 3, date: 'May 2025' },
    ],
  },
  'Jon Jones': {
    record: '27-1-1',
    winsKO: 10,
    winsSUB: 6,
    winsDEC: 11,
    lastFights: [
      { opp: 'Stipe Miocic', result: 'W', method: 'KO/TKO', round: 3, date: 'Nov 2024' },
      { opp: 'Ciryl Gane', result: 'W', method: 'Submission', round: 1, date: 'Mar 2023' },
    ],
  },
  'Stipe Miocic': {
    record: '20-5',
    winsKO: 12,
    winsSUB: 2,
    winsDEC: 6,
    lastFights: [
      { opp: 'Jon Jones', result: 'L', method: 'KO/TKO', round: 3, date: 'Nov 2024' },
      { opp: 'Francis Ngannou', result: 'W', method: 'KO/TKO', round: 2, date: 'Mar 2021' },
    ],
  },
}

export function getFighterStats(name: string): FighterStats | null {
  return FIGHTER_STATS[name] ?? null
}
