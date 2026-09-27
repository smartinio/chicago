# Chicago Card Game - Acceptance Criteria

This document outlines the acceptance criteria for the Chicago card game implementation. It serves as the specification for the regression test suite in `tests/server/routers/_app.spec.ts`.

## Overview

Chicago is a Swedish card game combining poker hand evaluation with trick-taking. Players collect points through poker combinations and by winning the final trick. The first player to reach 52 points wins.

---

## 1. Game Setup

### 1.1 Game Creation

- [ ] A player can create a new game with a game name and player name
- [ ] The game creator becomes the owner and initial dealer
- [ ] An optional password can be set for the game
- [ ] The game starts in `phase: 'new'`
- [ ] Game name must be between configured min/max lengths
- [ ] Player name must be between configured min/max lengths

### 1.2 Joining a Game

- [ ] Players can join an existing game by providing the game ID and their name
- [ ] If the game has a password, the correct password must be provided
- [ ] Player names must be unique within a game
- [ ] A player cannot join the same game twice
- [ ] Minimum 2 players, maximum 4 players
- [ ] Each player receives a unique ID and secret for authentication

### 1.3 Leaving & Kicking

- [ ] A player can leave the game at any time
- [ ] The game owner can kick other players
- [ ] If the owner leaves, ownership transfers to the next player
- [ ] If the dealer leaves, dealer role transfers to the next player
- [ ] If all players leave, the game is destroyed

---

## 2. Round Structure

### 2.1 Starting a Round

- [ ] Only the dealer can start a new round
- [ ] Game must have at least 2 players to start
- [ ] Each player is dealt 5 cards from a shuffled 52-card deck
- [ ] The player after the dealer becomes the current player
- [ ] Round begins in `phase: 'throwing'` (if any player is eligible to throw)
- [ ] Round skips to `phase: 'asking_chicago'` or `phase: 'tricking'` if no one can throw

### 2.2 Round Phases

The round progresses through these phases:

1. **throwing** - Players exchange cards (up to 3 cycles)
2. **asking_one_open** - (optional) Players decides on revealed card (if requested)
3. **asking_four_of_a_kind** - Player with four of a kind chooses reward
4. **asking_chicago** - Eligible players may call Chicago
5. **tricking** - Players play 5 tricks
6. **over** - Round complete, scores tallied
7. **killed** - Round was aborted (allows restart)

---

## 3. Throwing Phase (Card Exchange)

### 3.1 Basic Throwing

- [ ] Players take turns in order, starting with the player after the dealer
- [ ] Each player may exchange 0-5 cards from their hand
- [ ] Discarded cards go to the bottom of the deck
- [ ] New cards are drawn from the top of the deck
- [ ] A player may choose to skip their throw (exchange 0 cards)

### 3.2 Throw Cycles

- [ ] There are up to 3 throw cycles per round (configurable via `rules.numberOfThrows`)
- [ ] After each throw cycle (except the final one), the best poker hand is evaluated
- [ ] All players with the best hand receive points (ties possible via high-card comparison)

### 3.3 Throw Score Threshold

- [ ] Players with score ≥ `rules.throwScoreThreshold` (default: 45) cannot throw
- [ ] These players are automatically skipped in the throwing order
- [ ] If all players are above threshold, throwing phase is skipped entirely

### 3.4 One Open Card (Custom Feature)

- [ ] During a throw, a player may request "one open"
- [ ] When `rules.oneOpenMode` is `'last'`, this is only allowed on the final throw cycle
- [ ] When `rules.oneOpenMode` is `'all'`, this is allowed on any throw cycle
- [ ] The top card of the deck is revealed (`round.openCard`)
- [ ] Round phase changes to `asking_one_open`
- [ ] The player must choose to accept or reject the revealed card:
  - **Accept**: The revealed card is added to their hand
  - **Reject**: The revealed card is returned to deck, player draws a hidden card instead
- [ ] After the decision, the throw cycle continues normally

---

## 4. Poker Hand Evaluation

### 4.1 Hand Rankings (Low to High)

| Hand                 | Points | Description                                           |
| -------------------- | ------ | ----------------------------------------------------- |
| Pair                 | 1      | Two cards of same value                               |
| Two Pair             | 2      | Two different pairs                                   |
| Three of a Kind      | 3      | Three cards of same value                             |
| Straight             | 4      | Five sequential cards (A-2-3-4-5 or 10-J-Q-K-A valid) |
| Flush                | 5      | Five cards of same suit                               |
| Full House           | 6      | Three of a kind + pair                                |
| Four of a Kind       | 7      | Four cards of same value (special rules apply)        |
| Straight Flush       | 8      | Straight + flush combined                             |
| Royal Straight Flush | 52     | 10-J-Q-K-A of same suit (instant game win)            |

### 4.2 Hand Scoring Timing

Points for best hand are awarded:

- [ ] After throw cycle 1 (if applicable)
- [ ] After throw cycle 2 (if applicable)
- [ ] After throw cycle 3 is skipped (no scoring between final throw and Chicago/tricking)
- [ ] After the round ends (final trick has been played)

### 4.3 Tie Breaking

- [ ] If multiple players have the same hand type, compare high cards
- [ ] Compare cards from highest to lowest until a winner is found
- [ ] If hands are completely equal, all tied players receive full points

### 4.4 Four of a Kind Special Rule

When a player has four of a kind:

- [ ] Round phase changes to `asking_four_of_a_kind`
- [ ] That player becomes the current player
- [ ] Player must choose one of:
  - **'points'**: Receive the configured points for four of a kind (default: 7)
  - **'reset_others'**: All other players' scores are reset to 0
- [ ] After the choice, the game continues from where it was interrupted

### 4.5 Royal Straight Flush

- [ ] Awards 52 points immediately
- [ ] **Should end the game immediately** (winner declared)

---

## 5. Chicago Declaration

### 5.1 Chicago Phase

After the throwing phase completes:

- [ ] If `rules.chicagoCanBeCalledBeforeFifteen` is `true`: all players are asked
- [ ] If `rules.chicagoCanBeCalledBeforeFifteen` is `false`: only players with ≥15 points are asked
- [ ] Players are asked in turn order, starting with player after dealer

### 5.2 Calling Chicago

- [ ] A player may declare "Chicago" (betting they'll win all 5 tricks)
- [ ] Only one player can call Chicago per round
- [ ] Once called, the round immediately proceeds to tricking phase
- [ ] The Chicago caller leads the first trick

### 5.3 Chicago Resolution

**If Chicago was called:**

- [ ] If the caller wins all 5 tricks: +15 points, player marked as `takenChicago: true`
- [ ] If any other player wins any trick: -15 points, round ends immediately
- [ ] No points are awarded for best hand after tricks (Chicago supersedes)
- [ ] No points for last trick (Chicago supersedes)

**If Chicago was not called:**

- [ ] Normal trick scoring applies

---

## 6. Trick-Taking Phase

### 6.1 Playing Tricks

- [ ] 5 tricks are played, each player plays one card per trick
- [ ] Player after the dealer leads the first trick (unless Chicago was called)
- [ ] Winner of each trick leads the next trick

### 6.2 Following Suit

- [ ] Players must follow the led suit if they have cards in that suit
- [ ] If a player cannot follow suit, they may play any card (discard)
- [ ] There is no trump suit in Chicago

### 6.3 Winning a Trick

- [ ] Highest card of the led suit wins the trick
- [ ] Cards of other suits have no value (cannot win)

### 6.4 Last Trick Scoring

- [ ] The winner of the 5th (final) trick receives points:
  - `rules.pointsForWin` (default: 5) normally
  - `rules.pointsForWinWithTwo` (default: 10) if won with a 2

### 6.5 Post-Trick Hand Scoring

- [ ] After the final trick, best poker hand is evaluated again
- [ ] Points awarded per the hand evaluation rules (including Four of a Kind special)

---

## 7. Round End & Game Progression

### 7.1 Round Completion

- [ ] Round phase becomes `'over'`
- [ ] Dealer role rotates clockwise to the next player
- [ ] The player after the new dealer will act first in the next round
- [ ] Best hand points are awarded (unless Chicago was called)

### 7.2 Game Victory

- [ ] Victory is checked only at round end (not immediately when points are gained)
- [ ] This allows players to catch up during the round via poker hands or trick wins
- [ ] To win, a player must meet **both** conditions:
  1. Have ≥52 points at round end
  2. Have successfully taken Chicago at least once (`takenChicago: true`)
- [ ] A player with ≥52 points but no Chicago cannot win yet
- [ ] Game ends when a player meets both victory conditions
- [ ] That player is declared the winner
- [ ] Game phase becomes `'over'`
- [ ] A new game can be started (resets all scores)
- [ ] ⚠️ _Not yet implemented: `finishGame` exists but is never called_

### 7.3 Killed Round

- [ ] A round is "killed" when a player is kicked or leaves mid-round
- [ ] Killed rounds can be restarted by the dealer
- [ ] No points are awarded for killed rounds

---

## 8. Configurable Rules

The following rules can be configured per game:

| Rule                              | Default     | Description                                        |
| --------------------------------- | ----------- | -------------------------------------------------- |
| `throwScoreThreshold`             | 45          | Players at or above this score cannot throw        |
| `pointsForWin`                    | 5           | Points for winning the last trick                  |
| `pointsForWinWithTwo`             | 10          | Points for winning last trick with a 2             |
| `numberOfThrows`                  | 3           | Number of throw cycles per round                   |
| `chicagoRequiresBestHand`         | true        | Chicago caller must have best hand (not enforced?) |
| `chicagoCanBeCalledBeforeFifteen` | true        | Allow Chicago calls regardless of score            |
| `oneOpenMode`                     | 'last'      | When one-open is allowed ('all' or 'last')         |
| `handPoints.*`                    | (see above) | Points for each hand type                          |

---

## 9. Error Conditions

### 9.1 Game Errors

- [ ] `GAME_NOT_FOUND` - Game ID does not exist
- [ ] `TOO_FEW_PLAYERS` - Attempting to start with <2 players
- [ ] `TOO_MANY_PLAYERS` - Attempting to join when game has 4 players

### 9.2 Player Errors

- [ ] `PLAYER_NOT_FOUND` - Player ID does not exist in game
- [ ] `PLAYER_ALREADY_JOINED` - Player already in this game
- [ ] `NAME_ALREADY_TAKEN` - Another player has this name
- [ ] `FORBIDDEN` - Player is not authorized for this action

### 9.3 Phase Errors

- [ ] `INVALID_PHASE` - Action not allowed in current game/round phase

### 9.4 Card Errors

- [ ] `CARD_NOT_IN_HAND` - Player doesn't have the specified card

---

## 10. Real-Time Updates

### 10.1 Subscriptions

- [ ] Players can subscribe to game snapshots
- [ ] Snapshots are sent whenever game state changes
- [ ] Snapshots are player-specific (hide other players' cards)

### 10.2 Keep-Alive

- [ ] Players should send periodic keep-alive signals
- [ ] Inactive players may be considered disconnected

---

## 11. Test Scenarios

### Happy Path - Complete Game

1. Player 1 creates game
2. Players 2-4 join
3. Player 1 (dealer) starts round
4. All players throw cards (3 cycles), best hands scored after cycles 1 & 2
5. A player calls Chicago and wins all 5 tricks (+15 points, marked as taken Chicago)
6. Dealer rotates, new round starts
7. Continue playing rounds (some with Chicago, some without)
8. Game ends when a player has ≥52 points AND has taken Chicago at least once

### Chicago Success Path

1. Setup game with 4 players, start round
2. Complete throwing phase
3. Player with ≥15 points calls Chicago
4. That player wins all 5 tricks
5. Player receives +15 points
6. Round ends (no hand scoring)

### Chicago Failure Path

1. Setup game with 4 players, start round
2. Complete throwing phase
3. Player calls Chicago
4. Another player wins a trick
5. Chicago caller receives -15 points
6. Round ends immediately

### Four of a Kind - Take Points

1. Player gets four of a kind during throwing
2. Player chooses 'points'
3. Player receives 7 points
4. Game continues normally

### Four of a Kind - Reset Others

1. Player gets four of a kind during throwing
2. Player chooses 'reset_others'
3. All other players' scores become 0
4. Game continues normally

### One Open Card

1. Player requests one open during final throw
2. Card is revealed
3. Player accepts → card added to hand
4. OR Player rejects → draws hidden card instead
5. Throw cycle continues

### Edge Cases

- All players above throw threshold (skip to Chicago/tricking)
- Tie for best hand (multiple players receive points)
- Royal Straight Flush (should end game immediately)
- Last trick won with a 2 (bonus points)
- Player leaves mid-game (roles transfer)

---

## Notes for Test Implementation

- Mock `dealCards` to control card distribution
- Use deterministic card fixtures for reproducible tests
- Test each phase transition explicitly
- Verify error conditions return correct error codes
- Test configurable rules with different values
- Verify snapshot subscriptions receive correct data
